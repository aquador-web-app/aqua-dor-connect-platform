import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSecurityUtils } from "@/hooks/useSecurityUtils";
import { UserPlus, Send, Mail } from "lucide-react";

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface InviteForm {
  fullName: string;
  email: string;
  role: string;
  phone: string;
  notes: string;
  sendEmail: boolean;
}

const initialForm: InviteForm = {
  fullName: "",
  email: "",
  role: "student",
  phone: "",
  notes: "",
  sendEmail: true
};

export function UserInviteModal({ isOpen, onClose, onSuccess }: UserInviteModalProps) {
  const [form, setForm] = useState<InviteForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { generateSecurePassword } = useSecurityUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.fullName || !form.email || !form.role) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate a secure temporary password
      const tempPassword = generateSecurePassword(12);
      
      // Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: form.fullName,
          phone: form.phone,
          invited_by: 'admin',
          temp_password: true
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: form.email,
            full_name: form.fullName,
            phone: form.phone
          });

        if (profileError) throw profileError;

        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: form.role as 'admin' | 'co_admin' | 'instructor' | 'student' | 'parent'
          });

        if (roleError) throw roleError;

        // If instructor role, create instructor record
        if (form.role === 'instructor') {
          const { error: instructorError } = await supabase
            .from('instructors')
            .insert({
              profile_id: authData.user.id,
              bio: form.notes,
              is_active: true
            });

          if (instructorError) throw instructorError;
        }

        // Send invitation email if requested
        if (form.sendEmail) {
          const { error: emailError } = await supabase
            .from('notification_queue')
            .insert({
              user_id: authData.user.id,
              email: form.email,
              notification_type: 'user_invitation',
              data: {
                full_name: form.fullName,
                role: form.role,
                temp_password: tempPassword,
                login_url: `${window.location.origin}/auth`
              }
            });

          if (emailError) {
            console.warn('Error queuing invitation email:', emailError);
            // Don't fail the entire process for email issues
          }
        }

        toast({
          title: "Utilisateur invité avec succès",
          description: `${form.fullName} a été ajouté avec le rôle ${form.role}${form.sendEmail ? ' et recevra un email d\'invitation' : ''}`,
        });

        // Reset form and close modal
        setForm(initialForm);
        onClose();
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Erreur lors de l'invitation",
        description: error.message || "Une erreur s'est produite lors de l'invitation de l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Inviter un Utilisateur</span>
          </DialogTitle>
          <DialogDescription>
            Créer un compte et inviter un nouvel utilisateur à rejoindre la plateforme
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Nom et prénom"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="adresse@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+509 XXXX-XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle *</Label>
            <Select value={form.role} onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Étudiant</SelectItem>
                <SelectItem value="instructor">Instructeur</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="co_admin">Co-Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sendEmail"
              checked={form.sendEmail}
              onChange={(e) => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="sendEmail" className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4" />
              <span>Envoyer un email d'invitation</span>
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Invitation...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Inviter
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}