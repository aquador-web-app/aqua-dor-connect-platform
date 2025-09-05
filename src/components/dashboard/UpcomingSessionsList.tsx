import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Info, Pencil, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SessionItem {
  id: string;
  session_date: string;
  type: string;
  status: string | null;
  max_participants: number | null;
  duration_minutes: number | null;
  class: { id: string; name: string | null } | null;
  instructor: { id: string; profile: { full_name: string | null } | null } | null;
}

interface UpcomingSessionsListProps {
  mode?: 'public' | 'admin';
  daysAhead?: number; // default 14
  title?: string;
}

export function UpcomingSessionsList({ mode = 'public', daysAhead = 14, title }: UpcomingSessionsListProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SessionItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCapacity, setEditCapacity] = useState<number | ''>('');
  const { toast } = useToast();

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + daysAhead);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [daysAhead]);

  useEffect(() => {
    fetchSessions();
    const channel = supabase
      .channel('class_sessions-upcoming')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, () => fetchSessions())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  async function fetchSessions(retryCount = 0) {
    try {
      setLoading(true);
      // Primary fetch: sessions in range [now, daysAhead] with timeout
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          type,
          status,
          max_participants,
          duration_minutes,
          classes:class_id ( id, name )
        `)
        .gte('session_date', range.from)
        .lte('session_date', range.to)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000));

      if (error && !error.message.includes('aborted')) throw error;

      let rows = data || [];

      // Fallback: if none in range, fetch next 8 upcoming scheduled sessions
      if (rows.length === 0) {
        try {
          const { data: fallback, error: fallbackError } = await supabase
            .from('class_sessions')
            .select(`
              id,
              session_date,
              type,
              status,
              max_participants,
              duration_minutes,
              classes:class_id ( id, name )
            `)
            .gte('session_date', range.from)
            .eq('status', 'scheduled')
            .order('session_date', { ascending: true })
            .limit(8)
            .abortSignal(AbortSignal.timeout(10000));
          if (fallbackError && !fallbackError.message.includes('aborted')) throw fallbackError;
          rows = fallback || [];
        } catch (fallbackError) {
          console.warn('Fallback query also failed:', fallbackError);
          rows = [];
        }
      }

      const mapped: SessionItem[] = rows.map((row: any) => ({
        id: row.id,
        session_date: row.session_date,
        type: row.type,
        status: row.status,
        max_participants: row.max_participants,
        duration_minutes: row.duration_minutes,
        class: row.classes ? { id: row.classes.id, name: row.classes.name } : null,
        instructor: row.instructors ? { id: row.instructors.id, profile: row.instructors.profiles ? { full_name: row.instructors.profiles.full_name } : null } : null,
      }));

      setSessions(mapped);
    } catch (e) {
      console.error('Failed to fetch upcoming sessions', e);
      
      // Retry logic for network failures
      if (retryCount < 2 && (e instanceof TypeError || e?.message?.includes('fetch'))) {
        console.log(`Retrying sessions fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchSessions(retryCount + 1), 1500 * (retryCount + 1));
        return;
      }
      
      // Set empty sessions as fallback
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(s: SessionItem) {
    setEditing(s);
    const dt = new Date(s.session_date);
    const yyyy = dt.toISOString().slice(0, 10);
    const hhmm = dt.toTimeString().slice(0, 5);
    setEditDate(yyyy);
    setEditTime(hhmm);
    setEditCapacity(s.max_participants || 10);
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editing) return;
    try {
      const newIso = new Date(`${editDate}T${editTime}:00`).toISOString();
      const { error } = await supabase
        .from('class_sessions')
        .update({ session_date: newIso, max_participants: typeof editCapacity === 'number' ? editCapacity : 10 })
        .eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Session mise à jour' });
      setEditOpen(false);
      setEditing(null);
      await fetchSessions();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  async function cancelSession(id: string) {
    try {
      const { error } = await supabase
        .from('class_sessions')
        .update({ status: 'canceled' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Session annulée' });
      await fetchSessions();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  const Title = title || (mode === 'admin' ? 'Prochaines sessions (14 jours)' : 'À venir (14 jours)');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{Title}</CardTitle>
        <CardDescription>Mis à jour en temps réel</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-muted-foreground text-sm">Aucune session planifiée.</div>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const dt = new Date(s.session_date);
              const dateStr = dt.toLocaleDateString();
              const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const titleText = s.class?.name || 'Session';
              const typeLabel = s.type === 'event' ? 'Événement' : 'Cours';
              return (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{titleText}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeStr}</span>
                      <span className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> {typeLabel}</span>
                    </div>
                  </div>
                  {mode === 'admin' ? (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => cancelSession(s.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                      Détails
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'admin' ? 'Modifier la session' : 'Détails de la session'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <Label>Heure</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
              {mode === 'admin' && (
                <div>
                  <Label>Capacité</Label>
                  <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
              {mode === 'admin' ? (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Fermer</Button>
                  <Button onClick={submitEdit}>Enregistrer</Button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Fermer</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
