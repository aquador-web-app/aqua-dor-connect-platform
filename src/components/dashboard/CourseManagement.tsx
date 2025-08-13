
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Edit, Trash, Eye, EyeOff, Clock, Users, DollarSign, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { EnhancedCourseCreator } from "./EnhancedCourseCreator";
import { CourseAssignmentModal } from "./CourseAssignmentModal";
import { format, parseISO } from "date-fns";
interface Course {
  id: string;
  name: string;
  description: string;
  level: string;
  price: number;
  capacity: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  instructor_id?: string;
  instructors?: {
    profiles: {
      full_name: string;
    };
  };
}

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assignmentCourse, setAssignmentCourse] = useState<Course | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [nextSessions, setNextSessions] = useState<Record<string, { date: string } | null>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, { sessions: any[]; students: any[] }>>({});
  const [schedule, setSchedule] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    sessionTime: "09:00",
    sessionDays: [] as string[],
  });

  useEffect(() => {
    fetchCourses();
    
    // Listen for course creation events
    const handleCourseCreated = () => {
      fetchCourses();
    };
    
    window.addEventListener('courseCreated', handleCourseCreated);
    
    // Set up real-time subscription
    const channel = supabase
      .channel('courses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        () => {
          fetchCourses();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('courseCreated', handleCourseCreated);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          instructors (
            profiles (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setCourses(list);
      const ids = list.map((c: any) => c.id);
      await fetchMetaForCourses(ids);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: t('common.error'),
        description: "Impossible de charger les cours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !currentStatus })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: `Cours ${!currentStatus ? 'activé' : 'désactivé'} avec succès`,
      });

      fetchCourses();
    } catch (error) {
      console.error('Error toggling course status:', error);
      toast({
        title: t('common.error'),
        description: "Erreur lors de la modification du statut",
        variant: "destructive",
      });
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: "Cours supprimé avec succès",
      });

      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: t('common.error'),
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const updateCourse = async () => {
    if (!editingCourse) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: editingCourse.name,
          description: editingCourse.description,
          level: editingCourse.level,
          price: editingCourse.price,
          capacity: editingCourse.capacity,
          duration_minutes: editingCourse.duration_minutes
        })
        .eq('id', editingCourse.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: "Cours mis à jour avec succès",
      });

      setIsEditDialogOpen(false);
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: t('common.error'),
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const fetchMetaForCourses = async (ids: string[]) => {
    if (!ids || ids.length === 0) {
      setEnrollmentCounts({});
      setNextSessions({});
      return;
    }
    try {
      const [{ data: enrollRows, error: enrollErr }, { data: sessRows, error: sessErr }] = await Promise.all([
        supabase.from('enrollments').select('class_id, status').in('class_id', ids),
        supabase
          .from('class_sessions')
          .select('class_id, session_date')
          .gte('session_date', new Date().toISOString())
          .in('class_id', ids)
          .order('session_date', { ascending: true })
      ]);
      if (enrollErr) throw enrollErr;
      if (sessErr) throw sessErr;
      const counts: Record<string, number> = {};
      (enrollRows || []).forEach((r: any) => {
        if (r.status === 'active') counts[r.class_id] = (counts[r.class_id] || 0) + 1;
      });
      setEnrollmentCounts(counts);
      const next: Record<string, { date: string } | null> = {};
      (sessRows || []).forEach((s: any) => {
        if (!next[s.class_id]) next[s.class_id] = { date: s.session_date };
      });
      setNextSessions(next);
    } catch (e) {
      console.error('Error fetching course meta', e);
    }
  };

  const loadDetails = async (courseId: string) => {
    try {
      const [{ data: sess }, { data: enrs }] = await Promise.all([
        supabase.from('class_sessions').select('id, session_date, status').eq('class_id', courseId).order('session_date', { ascending: true }),
        supabase
          .from('enrollments')
          .select('profiles!inner(id, full_name, email)')
          .eq('class_id', courseId)
          .eq('status', 'active')
      ]);
      setDetails((prev) => ({
        ...prev,
        [courseId]: {
          sessions: sess || [],
          students: (enrs || []).map((e: any) => e.profiles),
        },
      }));
    } catch (e) {
      console.error('Error loading details', e);
    }
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.courseManagement')}</h2>
          <p className="text-muted-foreground">Créez et gérez les cours de natation</p>
        </div>
        <div className="flex space-x-2">
          <EnhancedCourseCreator />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{t('admin.courseList')}</span>
            <Badge variant="secondary">{courses.length} cours</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('course.title')}</TableHead>
                <TableHead>{t('course.capacity')}</TableHead>
                <TableHead>Places dispo</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>{t('course.price')}</TableHead>
                <TableHead>{t('course.status')}</TableHead>
                <TableHead>{t('course.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
                const enrolled = enrollmentCounts[course.id] || 0;
                const seatsLeft = Math.max(course.capacity - enrolled, 0);
                const next = nextSessions[course.id]?.date;
                const dateStr = next ? format(parseISO(next), 'dd/MM/yyyy') : '—';
                const timeStr = next ? format(parseISO(next), 'HH:mm') : '—';
                const expanded = expandedRows.has(course.id);
                return (
                  <>
                    <TableRow key={course.id}>
                      <TableCell>
                        <button
                          className="font-medium inline-flex items-center gap-2 hover:underline"
                          onClick={() => {
                            const s = new Set(expandedRows);
                            if (s.has(course.id)) {
                              s.delete(course.id);
                            } else {
                              s.add(course.id);
                              if (!details[course.id]) loadDetails(course.id);
                            }
                            setExpandedRows(s);
                          }}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          {course.name}
                        </button>
                        {course.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {course.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{course.capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={seatsLeft > 0 ? 'secondary' : 'destructive'}>
                          {seatsLeft}
                        </Badge>
                      </TableCell>
                      <TableCell>{dateStr}</TableCell>
                      <TableCell>{timeStr}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{Number(course.price).toFixed(2)} USD</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.is_active ? 'default' : 'secondary'}>
                          {course.is_active ? t('course.active') : t('course.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAssignmentCourse(course);
                              setIsAssignmentModalOpen(true);
                            }}
                            title="Gérer les inscriptions"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCourse(course);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCourseStatus(course.id, course.is_active)}
                          >
                            {course.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCourse(course.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-md">
                            <div>
                              <h4 className="font-semibold mb-2">Sessions programmées</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(details[course.id]?.sessions || []).map((s: any) => (
                                  <div key={s.id} className="text-sm flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>{format(parseISO(s.session_date), 'dd/MM/yyyy HH:mm')}</span>
                                    <Badge variant="outline">{s.status}</Badge>
                                  </div>
                                ))}
                                {(!details[course.id]?.sessions || details[course.id]?.sessions.length === 0) && (
                                  <div className="text-sm text-muted-foreground">Aucune session</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Étudiants inscrits</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(details[course.id]?.students || []).map((st: any) => (
                                  <div key={st.id} className="text-sm flex items-center justify-between p-2 border rounded">
                                    <span>{st.full_name || st.email}</span>
                                  </div>
                                ))}
                                {(!details[course.id]?.students || details[course.id]?.students.length === 0) && (
                                  <div className="text-sm text-muted-foreground">Aucun étudiant</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}

            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} {editingCourse?.name}</DialogTitle>
            <DialogDescription>
              Modifiez les détails du cours
            </DialogDescription>
          </DialogHeader>
          {editingCourse && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="editName">{t('course.title')}</Label>
                <Input
                  id="editName"
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">{t('course.description')}</Label>
                <Textarea
                  id="editDescription"
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editLevel">{t('course.level')}</Label>
                  <Select
                    value={editingCourse.level}
                    onValueChange={(value) => setEditingCourse({ ...editingCourse, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">{t('course.beginner')}</SelectItem>
                      <SelectItem value="intermediate">{t('course.intermediate')}</SelectItem>
                      <SelectItem value="advanced">{t('course.advanced')}</SelectItem>
                      <SelectItem value="lifesaving">{t('course.lifesaving')}</SelectItem>
                      <SelectItem value="competition">{t('course.competition')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPrice">{t('course.price')} (USD)</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    value={editingCourse.price}
                    onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDuration">{t('course.duration')} (min)</Label>
                  <Input
                    id="editDuration"
                    type="number"
                    value={editingCourse.duration_minutes}
                    onChange={(e) => setEditingCourse({ ...editingCourse, duration_minutes: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCapacity">{t('course.capacity')}</Label>
                <Input
                  id="editCapacity"
                  type="number"
                  value={editingCourse.capacity}
                  onChange={(e) => setEditingCourse({ ...editingCourse, capacity: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Planification des Sessions (optionnel)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {schedule.startDate ? format(schedule.startDate, 'PPP') : 'Sélectionner...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={schedule.startDate}
                          onSelect={(date) => setSchedule({ ...schedule, startDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {schedule.endDate ? format(schedule.endDate, 'PPP') : 'Sélectionner...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={schedule.endDate}
                          onSelect={(date) => setSchedule({ ...schedule, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Heure des sessions</Label>
                    <Input
                      type="time"
                      value={schedule.sessionTime}
                      onChange={(e) => setSchedule({ ...schedule, sessionTime: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Jours de la semaine</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant={schedule.sessionDays.includes(d) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setSchedule((prev) => ({
                              ...prev,
                              sessionDays: prev.sessionDays.includes(d)
                                ? prev.sessionDays.filter((x) => x !== d)
                                : [...prev.sessionDays, d],
                            }))
                          }
                          className="justify-start"
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={async () => {
                  await updateCourse();
                  // If scheduling info provided, create sessions
                  if (schedule.startDate && schedule.endDate && schedule.sessionDays.length > 0 && editingCourse) {
                    const sessions: any[] = [];
                    const cur = new Date(schedule.startDate);
                    const end = new Date(schedule.endDate);
                    while (cur <= end) {
                      const dayName = cur.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
                      if (schedule.sessionDays.includes(dayName)) {
                        const dt = new Date(cur);
                        const [h, m] = schedule.sessionTime.split(':');
                        dt.setHours(parseInt(h), parseInt(m), 0, 0);
                        sessions.push({
                          class_id: editingCourse.id,
                          session_date: dt.toISOString(),
                          max_participants: editingCourse.capacity,
                          status: 'scheduled',
                        });
                      }
                      cur.setDate(cur.getDate() + 1);
                    }
                    if (sessions.length > 0) {
                      const { error } = await supabase.from('class_sessions').insert(sessions);
                      if (error) console.error(error);
                    }
                    setSchedule({ startDate: undefined, endDate: undefined, sessionTime: '09:00', sessionDays: [] });
                    await fetchMetaForCourses([editingCourse.id]);
                    await loadDetails(editingCourse.id);
                   }
                }}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Course Assignment Modal */}
      <CourseAssignmentModal
        course={assignmentCourse}
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setAssignmentCourse(null);
        }}
        onSuccess={fetchCourses}
      />
    </div>
  );
}
