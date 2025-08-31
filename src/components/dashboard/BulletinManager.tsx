import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Eye, Send, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Bulletin {
  id: string;
  student_id: string;
  instructor_id: string;
  period: string;
  swimming_level: string;
  technical_skills: any;
  behavior_notes: string;
  progress_notes: string;
  recommendations: string;
  status: 'draft' | 'submitted' | 'approved' | 'sent';
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  student_profile: {
    full_name: string;
  };
  instructor_profile: {
    profiles: {
      full_name: string;
    };
  };
}

interface Student {
  id: string;
  full_name: string;
}

export function BulletinManager() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    period: "",
    swimming_level: "",
    technical_skills: {},
    behavior_notes: "",
    progress_notes: "",
    recommendations: ""
  });

  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchBulletins();
    fetchStudents();
  }, []);

  const fetchBulletins = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bulletins')
        .select(`
          *,
          student_profile:profiles!bulletins_student_id_fkey(full_name),
          instructor_profile:instructors!bulletins_instructor_id_fkey(profiles!instructors_profile_id_fkey(full_name))
        `)
        .order('created_at', { ascending: false });

      // If not admin, filter to instructor's own bulletins
      if (!isAdmin) {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('profile_id', profile?.id)
          .single();

        if (instructorData) {
          query = query.eq('instructor_id', instructorData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setBulletins((data || []) as Bulletin[]);
    } catch (error) {
      console.error('Error fetching bulletins:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bulletins",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Get students based on role
      let data, error;
      
      if (isAdmin) {
        const result = await supabase
          .from('profiles')
          .select('id, full_name')
          .not('full_name', 'is', null);
        data = result.data;
        error = result.error;
      } else {
        // For instructors, use secure function to get only their assigned students
        const result = await supabase.rpc('get_public_children_for_instructor');
        data = result.data;
        error = result.error;
      }
      if (error) throw error;
      
      const studentData = data?.map(student => ({
        id: student.id,
        full_name: student.full_name || student.first_name || 'Nom non défini'
      })) || [];
      
      setStudents(studentData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!profile) return;

      // Get instructor ID
      const { data: instructorData } = await supabase
        .from('instructors')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!instructorData) {
        // Create instructor profile if it doesn't exist
        const { data: newInstructor, error: createError } = await supabase
          .from('instructors')
          .insert({
            profile_id: profile.id,
            bio: 'Instructeur nouvellement assigné',
            is_active: true,
            experience_years: 0
          })
          .select()
          .single();

        if (createError) {
          toast({
            title: "Erreur",
            description: "Impossible de créer le profil instructeur",
            variant: "destructive"
          });
          return;
        }
        
        // Use the newly created instructor
        const instructorId = newInstructor.id;
      } else {
        const instructorId = instructorData.id;
      }

      if (selectedBulletin) {
        // Update existing bulletin
        const { error } = await supabase
          .from('bulletins')
          .update({
            period: formData.period,
            swimming_level: formData.swimming_level,
            technical_skills: formData.technical_skills,
            behavior_notes: formData.behavior_notes,
            progress_notes: formData.progress_notes,
            recommendations: formData.recommendations
          })
          .eq('id', selectedBulletin.id);

        if (error) throw error;
        toast({
          title: "Bulletin mis à jour",
          description: "Le bulletin a été modifié avec succès"
        });
      } else {
        // Create new bulletin
        const { error } = await supabase
          .from('bulletins')
          .insert({
            student_id: formData.student_id,
            instructor_id: instructorData.id,
            period: formData.period,
            swimming_level: formData.swimming_level,
            technical_skills: formData.technical_skills,
            behavior_notes: formData.behavior_notes,
            progress_notes: formData.progress_notes,
            recommendations: formData.recommendations
          });

        if (error) throw error;
        toast({
          title: "Bulletin créé",
          description: "Le nouveau bulletin a été créé avec succès"
        });
      }

      setShowDialog(false);
      resetForm();
      fetchBulletins();
    } catch (error) {
      console.error('Error saving bulletin:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le bulletin",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (bulletin: Bulletin) => {
    try {
      const { error } = await supabase
        .from('bulletins')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', bulletin.id);

      if (error) throw error;
      
      toast({
        title: "Bulletin soumis",
        description: "Le bulletin a été soumis pour approbation"
      });
      
      fetchBulletins();
    } catch (error) {
      console.error('Error submitting bulletin:', error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre le bulletin",
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (bulletin: Bulletin) => {
    try {
      const { error } = await supabase
        .from('bulletins')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id
        })
        .eq('id', bulletin.id);

      if (error) throw error;
      
      toast({
        title: "Bulletin approuvé",
        description: "Le bulletin a été approuvé et sera envoyé à l'étudiant"
      });
      
      fetchBulletins();
    } catch (error) {
      console.error('Error approving bulletin:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le bulletin",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      period: "",
      swimming_level: "",
      technical_skills: {},
      behavior_notes: "",
      progress_notes: "",
      recommendations: ""
    });
    setSelectedBulletin(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'submitted':
        return <Badge variant="outline">Soumis</Badge>;
      case 'approved':
        return <Badge variant="default">Approuvé</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-green-500">Envoyé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Bulletins</h2>
          <p className="text-muted-foreground">
            Créez et gérez les bulletins de progression des étudiants
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau bulletin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedBulletin ? "Modifier le bulletin" : "Nouveau bulletin"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student">Étudiant</Label>
                  <Select 
                    value={formData.student_id} 
                    onValueChange={(value) => setFormData({...formData, student_id: value})}
                    disabled={!!selectedBulletin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un étudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Période</Label>
                  <Input
                    id="period"
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                    placeholder="Ex: Décembre 2024"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="swimming_level">Niveau de natation</Label>
                <Select 
                  value={formData.swimming_level} 
                  onValueChange={(value) => setFormData({...formData, swimming_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Débutant">Débutant</SelectItem>
                    <SelectItem value="Intermédiaire">Intermédiaire</SelectItem>
                    <SelectItem value="Avancé">Avancé</SelectItem>
                    <SelectItem value="Expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="behavior_notes">Notes de comportement</Label>
                <Textarea
                  id="behavior_notes"
                  value={formData.behavior_notes}
                  onChange={(e) => setFormData({...formData, behavior_notes: e.target.value})}
                  placeholder="Comportement en cours, respect des consignes..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="progress_notes">Notes de progression</Label>
                <Textarea
                  id="progress_notes"
                  value={formData.progress_notes}
                  onChange={(e) => setFormData({...formData, progress_notes: e.target.value})}
                  placeholder="Améliorations techniques, objectifs atteints..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommandations</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
                  placeholder="Conseils pour la suite, exercices à pratiquer..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                {selectedBulletin ? "Mettre à jour" : "Créer le bulletin"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulletins</CardTitle>
          <CardDescription>
            Liste de tous les bulletins créés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulletins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun bulletin trouvé
                  </TableCell>
                </TableRow>
              ) : (
                bulletins.map((bulletin) => (
                  <TableRow key={bulletin.id}>
                    <TableCell>
                      <div className="font-medium">
                         {bulletin.student_profile?.full_name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{bulletin.period}</TableCell>
                    <TableCell>{bulletin.swimming_level}</TableCell>
                    <TableCell>{getStatusBadge(bulletin.status)}</TableCell>
                    <TableCell>
                      {format(new Date(bulletin.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedBulletin(bulletin);
                            setFormData({
                              student_id: bulletin.student_id,
                              period: bulletin.period,
                              swimming_level: bulletin.swimming_level || "",
                              technical_skills: bulletin.technical_skills || {},
                              behavior_notes: bulletin.behavior_notes || "",
                              progress_notes: bulletin.progress_notes || "",
                              recommendations: bulletin.recommendations || ""
                            });
                            setShowDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {bulletin.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSubmit(bulletin)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {bulletin.status === 'submitted' && isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleApprove(bulletin)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}