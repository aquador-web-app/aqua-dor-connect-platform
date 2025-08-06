
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash, Eye, EyeOff, Clock, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { CourseCreator } from "./CourseCreator";

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
  const { toast } = useToast();
  const { t } = useLanguage();

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
      setCourses(data || []);
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

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'competition': return 'bg-red-100 text-red-800';
      case 'lifesaving': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <CourseCreator />
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
                <TableHead>{t('course.level')}</TableHead>
                <TableHead>{t('course.price')}</TableHead>
                <TableHead>{t('course.duration')}</TableHead>
                <TableHead>{t('course.capacity')}</TableHead>
                <TableHead>{t('course.status')}</TableHead>
                <TableHead>{t('course.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{course.name}</div>
                      {course.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {course.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getLevelBadgeColor(course.level)}>
                      {t(`course.${course.level}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${course.price} USD</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{course.duration_minutes} min</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{course.capacity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.is_active ? "default" : "secondary"}>
                      {course.is_active ? t('course.active') : t('course.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                  onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">{t('course.description')}</Label>
                <Textarea
                  id="editDescription"
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editLevel">{t('course.level')}</Label>
                  <Select 
                    value={editingCourse.level} 
                    onValueChange={(value) => setEditingCourse({...editingCourse, level: value})}
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
                    onChange={(e) => setEditingCourse({...editingCourse, price: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editDuration">{t('course.duration')} (min)</Label>
                  <Input
                    id="editDuration"
                    type="number"
                    value={editingCourse.duration_minutes}
                    onChange={(e) => setEditingCourse({...editingCourse, duration_minutes: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCapacity">{t('course.capacity')}</Label>
                <Input
                  id="editCapacity"
                  type="number"
                  value={editingCourse.capacity}
                  onChange={(e) => setEditingCourse({...editingCourse, capacity: Number(e.target.value)})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={updateCourse}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
