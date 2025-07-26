import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, CreditCard, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Child {
  id: string;
  full_name: string;
  email: string;
  date_of_birth: string | null;
  barcode: string;
  medical_notes: string | null;
  emergency_contact: string | null;
  relationship_type: string;
}

interface ChildProgress {
  child_id: string;
  total_sessions: number;
  attendance_rate: number;
  current_level: string;
  next_payment_due: string | null;
}

export function ParentChildManager() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childProgress, setChildProgress] = useState<Record<string, ChildProgress>>({});
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChild, setNewChild] = useState({
    email: "",
    full_name: "",
    date_of_birth: "",
    medical_notes: "",
    emergency_contact: "",
    relationship_type: "child"
  });
  const { profile, isParent, hasAnyRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile && (isParent() || hasAnyRole(['admin', 'co_admin']))) {
      fetchChildren();
    }
  }, [profile]);

  const fetchChildren = async () => {
    try {
      if (!profile) return;

      let query = supabase
        .from("parent_child_relationships")
        .select(`
          relationship_type,
          child:profiles!parent_child_relationships_child_id_fkey(
            id,
            full_name,
            email,
            date_of_birth,
            barcode,
            medical_notes,
            emergency_contact
          )
        `);

      // If user is a parent, only show their children
      if (isParent()) {
        query = query.eq("parent_id", profile.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const formattedChildren = data?.map((item: any) => ({
        id: item.child.id,
        full_name: item.child.full_name,
        email: item.child.email,
        date_of_birth: item.child.date_of_birth,
        barcode: item.child.barcode,
        medical_notes: item.child.medical_notes,
        emergency_contact: item.child.emergency_contact,
        relationship_type: item.relationship_type
      })) || [];

      setChildren(formattedChildren);

      // Fetch progress for each child
      const progressPromises = formattedChildren.map(fetchChildProgress);
      const progressResults = await Promise.all(progressPromises);
      
      const progressMap = progressResults.reduce((acc, progress) => {
        if (progress) {
          acc[progress.child_id] = progress;
        }
        return acc;
      }, {} as Record<string, ChildProgress>);

      setChildProgress(progressMap);

    } catch (error) {
      console.error("Error fetching children:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les enfants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChildProgress = async (child: Child): Promise<ChildProgress | null> => {
    try {
      // Get attendance data
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", child.id);

      // Get enrollments
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("progress_level, class:classes(name)")
        .eq("student_id", child.id)
        .order("enrollment_date", { ascending: false })
        .limit(1);

      // Get upcoming payments
      const { data: paymentData } = await supabase
        .from("payments")
        .select("created_at")
        .eq("user_id", child.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      const totalSessions = attendanceData?.length || 0;
      const presentSessions = attendanceData?.filter(a => a.status === 'present').length || 0;
      const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

      return {
        child_id: child.id,
        total_sessions: totalSessions,
        attendance_rate: Math.round(attendanceRate),
        current_level: enrollmentData?.[0]?.class?.name || "Aucun cours",
        next_payment_due: paymentData?.[0]?.created_at || null
      };
    } catch (error) {
      console.error("Error fetching child progress:", error);
      return null;
    }
  };

  const handleAddChild = async () => {
    try {
      if (!profile) return;

      // Create user account for child
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newChild.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: true
      });

      if (authError) throw authError;

      // Insert into user_roles as student
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: 'student'
        });

      if (roleError) throw roleError;

      // Create parent-child relationship
      const { error: relationshipError } = await supabase
        .from("parent_child_relationships")
        .insert({
          parent_id: profile.id,
          child_id: authData.user.id,
          relationship_type: newChild.relationship_type
        });

      if (relationshipError) throw relationshipError;

      toast({
        title: "Enfant ajouté",
        description: "L'enfant a été ajouté avec succès à votre compte"
      });

      setShowAddChild(false);
      setNewChild({
        email: "",
        full_name: "",
        date_of_birth: "",
        medical_notes: "",
        emergency_contact: "",
        relationship_type: "child"
      });

      fetchChildren();

    } catch (error) {
      console.error("Error adding child:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'enfant",
        variant: "destructive"
      });
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
        <h2 className="text-2xl font-bold">Gestion Famille</h2>
        {isParent() && (
          <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un enfant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un enfant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={newChild.full_name}
                    onChange={(e) => setNewChild({...newChild, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newChild.email}
                    onChange={(e) => setNewChild({...newChild, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date de naissance</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newChild.date_of_birth}
                    onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact">Contact d'urgence</Label>
                  <Input
                    id="emergency_contact"
                    value={newChild.emergency_contact}
                    onChange={(e) => setNewChild({...newChild, emergency_contact: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="medical_notes">Notes médicales</Label>
                  <Input
                    id="medical_notes"
                    value={newChild.medical_notes}
                    onChange={(e) => setNewChild({...newChild, medical_notes: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="relationship_type">Type de relation</Label>
                  <Select 
                    value={newChild.relationship_type} 
                    onValueChange={(value) => setNewChild({...newChild, relationship_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Enfant</SelectItem>
                      <SelectItem value="ward">Pupille</SelectItem>
                      <SelectItem value="stepchild">Beau-fils/Belle-fille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddChild} className="w-full">
                  Ajouter l'enfant
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map((child) => {
          const progress = childProgress[child.id];
          return (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-secondary" />
                  <span>{child.full_name}</span>
                  <Badge variant="outline">{child.relationship_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{child.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Code-barres</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {child.barcode}
                    </code>
                  </div>
                  {child.date_of_birth && (
                    <div>
                      <p className="text-muted-foreground">Date de naissance</p>
                      <p className="font-medium">
                        {new Date(child.date_of_birth).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  {progress && (
                    <div>
                      <p className="text-muted-foreground">Cours actuel</p>
                      <p className="font-medium">{progress.current_level}</p>
                    </div>
                  )}
                </div>

                {progress && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold text-primary">{progress.total_sessions}</p>
                      <p className="text-sm text-muted-foreground">Sessions</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-secondary" />
                      </div>
                      <p className="text-2xl font-bold text-secondary">{progress.attendance_rate}%</p>
                      <p className="text-sm text-muted-foreground">Présence</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <CreditCard className="h-4 w-4 text-accent" />
                      </div>
                      <p className="text-2xl font-bold text-accent">
                        {progress.next_payment_due ? "Dû" : "OK"}
                      </p>
                      <p className="text-sm text-muted-foreground">Paiement</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {children.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun enfant enregistré</h3>
            <p className="text-muted-foreground mb-4">
              {isParent() 
                ? "Ajoutez vos enfants pour gérer leurs activités"
                : "Aucune relation parent-enfant trouvée"
              }
            </p>
            {isParent() && (
              <Button onClick={() => setShowAddChild(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un enfant
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}