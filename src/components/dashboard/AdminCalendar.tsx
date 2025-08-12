import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface DBClass {
  id: string;
  name: string;
  level: string;
  duration_minutes: number;
  capacity: number;
  instructor_id: string | null;
}

interface Instructor {
  id: string;
  profiles: { full_name: string };
}

interface Session {
  id: string;
  class_id: string;
  instructor_id: string;
  session_date: string;
  max_participants: number;
  status: string;
  notes: string | null;
  type?: string | null;
  duration_minutes?: number | null;
  classes: { name: string; level: string; duration_minutes: number };
}

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<DBClass[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [form, setForm] = useState({
    entryType: 'class' as 'class' | 'event',
    classMode: 'existing' as 'existing' | 'new',
    class_id: '',
    newClass: { name: '', level: 'beginner', price: 0, duration_minutes: 60, capacity: 10 },
    
    time: '09:00',
    endTime: '10:00',
    duration_minutes: 60,
    max_participants: 10,
    notes: '',

    // Recurrence
    repeatPattern: 'none' as 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
    repeatCount: 1,
    customIntervalDays: 1,
  });

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (selectedDate) fetchSessionsForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-calendar-class-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, (payload) => {
        if (!selectedDate) return;
        const changedAt = (payload.new as any)?.session_date || (payload.old as any)?.session_date;
        if (changedAt && isSameDay(new Date(changedAt), selectedDate)) {
          fetchSessionsForDate(selectedDate);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true);
      if (classesError) throw classesError;
      setClasses(classesData || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Impossible de charger les données", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionsForDate = async (date: Date) => {
    try {
      setLoading(true);
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`*, classes!inner(name, level, duration_minutes)`) 
        .gte('session_date', start.toISOString())
        .lte('session_date', end.toISOString())
        .order('session_date');
      if (error) throw error;
      setSessions((data as any) || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Impossible de charger les sessions", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateForDate = (date?: Date) => {
    if (!date) return;
    setSelectedDate(date);
    setEditingSession(null);
    setForm((f) => ({ ...f, time: '09:00', duration_minutes: 60, endTime: '10:00', classMode: 'existing', class_id: '', notes: '', repeatPattern: 'none', repeatCount: 1, customIntervalDays: 1 }));
    setModalOpen(true);
  };

  const openEdit = (s: Session) => {
    const d = new Date(s.session_date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    setEditingSession(s);
    setForm((f) => ({
      ...f,
      entryType: (s.type as 'class' | 'event') || 'class',
      classMode: 'existing',
      class_id: s.class_id,
      time,
      duration_minutes: s.duration_minutes || s.classes?.duration_minutes || 60,
      endTime: time, // will be recalculated by duration input
      max_participants: s.max_participants,
      notes: s.notes || '',
      repeatPattern: 'none',
      repeatCount: 1,
      customIntervalDays: 1,
    }));
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!selectedDate) return;
      if (form.classMode === 'existing' && !form.class_id) {
        toast({ title: 'Champs requis', description: 'Veuillez choisir un cours', variant: 'destructive' });
        return;
      }
      if (form.classMode === 'new' && !form.newClass.name) {
        toast({ title: 'Champs requis', description: 'Veuillez saisir le nom du cours', variant: 'destructive' });
        return;
      }

      setLoading(true);

      let classId = form.class_id;
      if (form.classMode === 'new') {
        const { data: createdClass, error: classErr } = await supabase
          .from('classes')
          .insert({
            name: form.newClass.name,
            level: form.newClass.level,
            price: form.newClass.price,
            duration_minutes: form.newClass.duration_minutes,
            capacity: form.newClass.capacity,
            instructor_id: null,
            is_active: true
          })
          .select('id')
          .single();
        if (classErr) throw classErr;
        classId = createdClass!.id;
      }

      const [h, m] = form.time.split(':');
      const base = new Date(selectedDate);
      base.setHours(parseInt(h), parseInt(m), 0, 0);

      if (editingSession) {
        // Update existing session
        const { error: updateErr } = await supabase
          .from('class_sessions')
          .update({
            class_id: classId,
            session_date: base.toISOString(),
            max_participants: form.max_participants,
            notes: form.notes,
            status: 'scheduled',
            duration_minutes: form.duration_minutes,
            type: form.entryType
          })
          .eq('id', editingSession.id);
        if (updateErr) throw updateErr;
        toast({ title: 'Mis à jour', description: 'Session/Événement mis à jour avec succès.' });
      } else {
        // Create new (with optional recurrence)
        const toInsert: any[] = [];
        const addDays = (d: Date, days: number) => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
        const addMonthly = (d: Date) => { const nd = new Date(d); nd.setMonth(nd.getMonth() + 1); return nd; };
        const occurrences = Math.max(1, form.repeatCount || 1);
        let current = new Date(base);
        for (let i = 0; i < occurrences; i++) {
          toInsert.push({
            class_id: classId,
            instructor_id: null,
            session_date: current.toISOString(),
            max_participants: form.max_participants,
            notes: form.notes,
            status: 'scheduled',
            duration_minutes: form.duration_minutes,
            type: form.entryType
          });
          // Next occurrence
          switch (form.repeatPattern) {
            case 'daily':
              current = addDays(current, 1);
              break;
            case 'weekly':
              current = addDays(current, 7);
              break;
            case 'biweekly':
              current = addDays(current, 14);
              break;
            case 'monthly':
              current = addMonthly(current);
              break;
            case 'custom':
              current = addDays(current, Math.max(1, form.customIntervalDays || 1));
              break;
            default:
              // none
              break;
          }
          if (form.repeatPattern === 'none') break;
        }
        const { error: insertErr } = await supabase.from('class_sessions').insert(toInsert);
        if (insertErr) throw insertErr;
        toast({ title: 'Enregistré', description: 'Session/Événement créé avec succès.' });
      }

      setModalOpen(false);
      setEditingSession(null);
      await fetchSessionsForDate(selectedDate);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erreur', description: e.message || "Impossible d’enregistrer", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const dayHasItems = (date: Date) => sessions.some(s => isSameDay(new Date(s.session_date), date));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Calendrier (Admin)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <UICalendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <UICalendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); }}
              className="rounded-md border p-3 pointer-events-auto"
              modifiers={{ hasItems: dayHasItems }}
              modifiersStyles={{ hasItems: { backgroundColor: 'hsl(var(--primary) / 0.2)' } }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto font-semibold">
                  Agenda du {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <UICalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => openCreateForDate(selectedDate!)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle session/événement
              </Button>
            </div>
            {sessions.map((s) => (
              <div key={s.id} className="p-4 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEdit(s)} role="button" aria-label={`Modifier ${s.classes?.name} à ${format(parseISO(s.session_date), 'HH:mm')}`}>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Badge variant="secondary">{(s.type || 'class') === 'event' ? 'Événement' : 'Cours'}</Badge>
                    <span>{s.classes?.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {format(parseISO(s.session_date), 'HH:mm')}</span>
                    <Badge variant="outline">{s.classes?.level}</Badge>
                  </div>
                </div>
                <div className="text-xs opacity-70">
                  Durée: {s.duration_minutes || s.classes?.duration_minutes || 60} min
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-muted-foreground">Aucun élément pour cette date.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingSession(null); }}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Modifier une session / un événement' : 'Programmer un cours / événement'}</DialogTitle>
            <DialogDescription>
              {editingSession ? 'Mettez à jour les détails puis enregistrez.' : 'Choisissez un type, un cours et l’horaire pour cette date.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.entryType} onValueChange={(v: any) => setForm((f) => ({ ...f, entryType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Cours</SelectItem>
                    <SelectItem value="event">Événement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cours</Label>
                <Select value={form.classMode} onValueChange={(v: any) => setForm((f) => ({ ...f, classMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Existant</SelectItem>
                    <SelectItem value="new">Nouveau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.classMode === 'existing' ? (
              <div className="space-y-2">
                <Label>Sélectionner un cours</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm((f) => ({ ...f, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un cours" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nom du cours</Label>
                  <Input value={form.newClass.name} onChange={(e) => setForm((f)=>({ ...f, newClass: { ...f.newClass, name: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Niveau</Label>
                  <Input value={form.newClass.level} onChange={(e) => setForm((f)=>({ ...f, newClass: { ...f.newClass, level: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Prix</Label>
                  <Input type="number" value={form.newClass.price} onChange={(e) => setForm((f)=>({ ...f, newClass: { ...f.newClass, price: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Durée (min)</Label>
                  <Input type="number" value={form.newClass.duration_minutes} onChange={(e) => setForm((f)=>({ ...f, newClass: { ...f.newClass, duration_minutes: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Capacité</Label>
                  <Input type="number" value={form.newClass.capacity} onChange={(e) => setForm((f)=>({ ...f, newClass: { ...f.newClass, capacity: Number(e.target.value) } }))} />
                </div>
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Heure de début</Label>
                <Input type="time" value={form.time} onChange={(e) => {
                  const newTime = e.target.value;
                  const [h, m] = newTime.split(':').map(Number);
                  const startMin = h * 60 + m;
                  const endTotal = startMin + form.duration_minutes;
                  const endH = Math.floor(endTotal / 60) % 24;
                  const endM = endTotal % 60;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const newEnd = `${pad(endH)}:${pad(endM)}`;
                  setForm((f)=>({ ...f, time: newTime, endTime: newEnd }));
                }} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Durée (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => {
                  const dur = Number(e.target.value);
                  const [h, m] = form.time.split(':').map(Number);
                  const startMin = h * 60 + m;
                  const endTotal = startMin + (isNaN(dur) ? 0 : dur);
                  const endH = Math.floor(endTotal / 60) % 24;
                  const endM = endTotal % 60;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const newEnd = `${pad(endH)}:${pad(endM)}`;
                  setForm((f)=>({ ...f, duration_minutes: dur, endTime: newEnd }));
                }} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Heure de fin</Label>
                <Input type="time" value={form.endTime} onChange={(e) => {
                  const newEnd = e.target.value;
                  const [sh, sm] = form.time.split(':').map(Number);
                  const [eh, em] = newEnd.split(':').map(Number);
                  const startMin = sh * 60 + sm;
                  const endMin = eh * 60 + em;
                  const diff = endMin - startMin;
                  if (diff <= 0) {
                    toast({ title: 'Heure invalide', description: "L'heure de fin doit être après l'heure de début", variant: 'destructive' });
                    return;
                  }
                  setForm((f)=>({ ...f, endTime: newEnd, duration_minutes: diff }));
                }} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Participants max</Label>
                <Input type="number" value={form.max_participants} onChange={(e) => setForm((f)=>({ ...f, max_participants: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f)=>({ ...f, notes: e.target.value }))} />
            </div>

            {!editingSession && (
              <div className="space-y-4">
                <h4 className="font-semibold">Récurrence</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Répéter</Label>
                    <Select value={form.repeatPattern} onValueChange={(v: any) => setForm((f)=>({ ...f, repeatPattern: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="daily">Quotidien</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="biweekly">Bihebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Occurrences</Label>
                    <Input type="number" min={1} max={20} value={form.repeatCount} onChange={(e) => setForm((f)=>({ ...f, repeatCount: Number(e.target.value) }))} />
                  </div>
                  {form.repeatPattern === 'custom' && (
                    <div className="space-y-2">
                      <Label>Intervalle (jours)</Label>
                      <Input type="number" min={1} value={form.customIntervalDays} onChange={(e) => setForm((f)=>({ ...f, customIntervalDays: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
