import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, Users, CreditCard } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  price: number;
  currency: string;
  features: any;
  is_active: boolean;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface StudentSubscription {
  id: string;
  student_id: string;
  subscription_plan_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  profiles: Student;
  subscription_plans: SubscriptionPlan;
}

export function SubscriptionPlansManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSubscriptions, setStudentSubscriptions] = useState<StudentSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    duration_months: '',
    price: '',
    currency: 'USD',
    is_active: true
  });
  const [assignFormData, setAssignFormData] = useState({
    student_id: '',
    subscription_plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    fetchPlans();
    fetchStudents();
    fetchStudentSubscriptions();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les plans d'abonnement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchStudentSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select(`
          *,
          profiles!student_subscriptions_student_id_fkey(id, full_name, email),
          subscription_plans(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudentSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching student subscriptions:', error);
    }
  };

  const resetPlanForm = () => {
    setPlanFormData({
      name: '',
      description: '',
      duration_months: '',
      price: '',
      currency: 'USD',
      is_active: true
    });
    setEditingPlan(null);
  };

  const openEditPlanDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      description: plan.description || '',
      duration_months: plan.duration_months.toString(),
      price: plan.price.toString(),
      currency: plan.currency,
      is_active: plan.is_active
    });
    setPlanDialogOpen(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSubmitting(true);
    try {
      const planData = {
        name: planFormData.name,
        description: planFormData.description || null,
        duration_months: parseInt(planFormData.duration_months),
        price: parseFloat(planFormData.price),
        currency: planFormData.currency,
        is_active: planFormData.is_active,
        features: []
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        toast({
          title: "Plan modifié",
          description: "Le plan d'abonnement a été modifié avec succès",
        });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);

        if (error) throw error;

        toast({
          title: "Plan créé",
          description: "Le plan d'abonnement a été créé avec succès",
        });
      }

      setPlanDialogOpen(false);
      resetPlanForm();
      await fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le plan d'abonnement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: assignFormData.student_id,
          subscription_plan_id: assignFormData.subscription_plan_id,
          assigned_by: profile.id,
          start_date: assignFormData.start_date,
          end_date: assignFormData.end_date || null
        });

      if (error) throw error;

      toast({
        title: "Plan assigné",
        description: "Le plan d'abonnement a été assigné à l'étudiant",
      });

      setAssignDialogOpen(false);
      setAssignFormData({
        student_id: '',
        subscription_plan_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
      await fetchStudentSubscriptions();
    } catch (error) {
      console.error('Error assigning plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le plan d'abonnement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan d\'abonnement ?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Plan supprimé",
        description: "Le plan d'abonnement a été supprimé avec succès",
      });

      await fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le plan d'abonnement",
        variant: "destructive",
      });
    }
  };

  const toggleSubscriptionStatus = async (subscriptionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('student_subscriptions')
        .update({ is_active: !currentStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Statut modifié",
        description: `Abonnement ${!currentStatus ? 'activé' : 'désactivé'}`,
      });

      await fetchStudentSubscriptions();
    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de l'abonnement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Gestion des Plans d'Abonnement
          </h2>
          <p className="text-muted-foreground">
            Créez et gérez les plans d'abonnement pour vos étudiants
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Assigner un Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assigner un plan à un étudiant</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student">Étudiant *</Label>
                  <Select 
                    value={assignFormData.student_id} 
                    onValueChange={(value) => setAssignFormData(prev => ({...prev, student_id: value}))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un étudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plan">Plan d'abonnement *</Label>
                  <Select 
                    value={assignFormData.subscription_plan_id} 
                    onValueChange={(value) => setAssignFormData(prev => ({...prev, subscription_plan_id: value}))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.filter(plan => plan.is_active).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ${plan.price} ({plan.duration_months} mois)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Date de début *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={assignFormData.start_date}
                      onChange={(e) => setAssignFormData(prev => ({...prev, start_date: e.target.value}))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">Date de fin (optionnel)</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={assignFormData.end_date}
                      onChange={(e) => setAssignFormData(prev => ({...prev, end_date: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setAssignDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Attribution..." : "Assigner"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={planDialogOpen} onOpenChange={(open) => {
            setPlanDialogOpen(open);
            if (!open) resetPlanForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? "Modifier le plan" : "Nouveau plan d'abonnement"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du plan *</Label>
                  <Input
                    id="name"
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData(prev => ({...prev, name: e.target.value}))}
                    placeholder="ex: Plan Premium"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData(prev => ({...prev, description: e.target.value}))}
                    rows={2}
                    placeholder="Description du plan..."
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Durée (mois) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={planFormData.duration_months}
                    onChange={(e) => setPlanFormData(prev => ({...prev, duration_months: e.target.value}))}
                    placeholder="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Prix *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={planFormData.price}
                    onChange={(e) => setPlanFormData(prev => ({...prev, price: e.target.value}))}
                    placeholder="60.00"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={planFormData.is_active}
                    onCheckedChange={(checked) => setPlanFormData(prev => ({...prev, is_active: checked}))}
                  />
                  <Label htmlFor="is_active">Plan actif</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setPlanDialogOpen(false);
                      resetPlanForm();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sauvegarde..." : editingPlan ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plans d'Abonnement ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{plan.name}</div>
                      {plan.description && (
                        <div className="text-sm text-muted-foreground">
                          {plan.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{plan.duration_months} mois</TableCell>
                  <TableCell>${plan.price}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditPlanDialog(plan)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {plans.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun plan d'abonnement trouvé. Créez votre premier plan pour commencer.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements Étudiants ({studentSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{subscription.profiles.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.profiles.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{subscription.subscription_plans.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${subscription.subscription_plans.price} - {subscription.subscription_plans.duration_months} mois
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Début: {new Date(subscription.start_date).toLocaleDateString()}</div>
                      {subscription.end_date && (
                        <div>Fin: {new Date(subscription.end_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.is_active ? "default" : "secondary"}>
                      {subscription.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSubscriptionStatus(subscription.id, subscription.is_active)}
                    >
                      {subscription.is_active ? "Désactiver" : "Activer"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {studentSubscriptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun abonnement étudiant trouvé. Assignez des plans aux étudiants pour commencer.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}