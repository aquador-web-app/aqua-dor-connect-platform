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
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    entryType: 'class' as 'class' | 'event',
    classMode: 'existing' as 'existing' | 'new',
    class_id: '',
    newClass: { name: '', level: 'beginner', price: 0, duration_minutes: 60, capacity: 10 },
    instructor_id: '',
    time: '09:00',
    duration_minutes: 60,
    max_participants: 10,
    notes: ''
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
      const [{ data: classesData, error: classesError }, { data: instructorsData, error: instructorsError }] = await Promise.all([
        supabase.from('classes').select('*').eq('is_active', true),
        supabase.from('instructors').select('id, profiles!inner(full_name)').eq('is_active', true)
      ]);
      if (classesError) throw classesError;
      if (instructorsError) throw instructorsError;
      setClasses(classesData || []);
      setInstructors(instructorsData || []);
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
    setForm((f) => ({ ...f, time: '09:00', duration_minutes: 60 }));
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
            instructor_id: form.instructor_id || null,
            is_active: true
          })
          .select('id')
          .single();
        if (classErr) throw classErr;
        classId = createdClass!.id;
      }

      const [h, m] = form.time.split(':');
      const start = new Date(selectedDate);
      start.setHours(parseInt(h), parseInt(m), 0, 0);

      const { error: insertErr } = await supabase.from('class_sessions').insert({
        class_id: classId,
        instructor_id: form.instructor_id || null,
        session_date: start.toISOString(),
        max_participants: form.max_participants,
        notes: form.notes,
        status: 'scheduled',
        duration_minutes: form.duration_minutes,
        type: form.entryType
      });
      if (insertErr) throw insertErr;

      toast({ title: 'Enregistré', description: 'Session/Événement créé avec succès.' });
      setModalOpen(false);
      await fetchSessionsForDate(selectedDate);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erreur', description: e.message || "Impossible d\u2019enregistrer", variant: 'destructive' });
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
            <UICalendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); openCreateForDate(d); }}
              className="rounded-md border"
              modifiers={{ hasItems: dayHasItems }}
              modifiersStyles={{ hasItems: { backgroundColor: 'hsl(var(--primary) / 0.2)' } }}
            />
            <Button className="w-full mt-4" onClick={() => openCreateForDate(selectedDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle session/événement
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agenda du {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 rounded-lg border flex items-center justify-between">
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Programmer un cours / événement</DialogTitle>
            <DialogDescription>
              Choisissez un type, un cours et l\u2019horaire pour cette date.
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

            <div className="space-y-2">
              <Label>Instructeur</Label>
              <Select value={form.instructor_id} onValueChange={(v) => setForm((f)=>({ ...f, instructor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un instructeur" /></SelectTrigger>
                <SelectContent>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.profiles.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Heure de début</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f)=>({ ...f, time: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Durée (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm((f)=>({ ...f, duration_minutes: Number(e.target.value) }))} />
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

            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
