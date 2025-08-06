import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Users, Search, Filter, Edit, UserPlus, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserInviteModal } from "@/components/dashboard/UserInviteModal";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  role: string;
  is_active: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = profiles?.map(profile => {
        const userRole = userRoles?.find(role => role.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'student',
          is_active: true // Default to active, you can add a field for this later
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Check if current user is admin
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userRole?.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can update user roles');
      }

      // Log the security event
      await supabase.rpc('log_security_event', {
        p_action: 'role_change',
        p_resource_type: 'user_roles',
        p_resource_id: userId,
        p_old_values: { user_id: userId },
        p_new_values: { user_id: userId, role: newRole }
      });

      // First delete existing role, then insert new one to avoid duplicate constraint
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any });

      if (insertError) throw insertError;

      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'co_admin': return 'secondary';
      case 'instructor': return 'default';
      case 'parent': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="h-10 flex-1 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-48 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="bg-muted rounded-lg h-96 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
          <p className="text-muted-foreground">Gérer tous les comptes utilisateurs</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nouvel Utilisateur
        </Button>
        
        <UserInviteModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={fetchUsers}
        />
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="co_admin">Co-Administrateur</SelectItem>
            <SelectItem value="instructor">Instructeur</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="student">Étudiant</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Utilisateurs ({filteredUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Aucun utilisateur n'est encore enregistré dans le système"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {(user.full_name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">
                            {user.full_name || 'Nom non défini'}
                          </div>
                          {user.phone && (
                            <div className="text-sm text-muted-foreground">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role === 'co_admin' ? 'Co-Admin' : 
                           user.role === 'instructor' ? 'Instructeur' :
                           user.role === 'parent' ? 'Parent' :
                           user.role === 'admin' ? 'Admin' : 'Étudiant'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(checked) => {
                              // Update user status
                              console.log('Toggle status for user:', user.id, checked);
                            }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => updateUserRole(user.user_id, newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="co_admin">Co-Admin</SelectItem>
                              <SelectItem value="instructor">Instructeur</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="student">Étudiant</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}