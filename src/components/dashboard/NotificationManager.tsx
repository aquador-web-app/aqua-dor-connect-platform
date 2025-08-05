import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Calendar, Users, Mail, Edit, Trash, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NotificationData {
  id: string;
  user_id: string;
  email: string;
  notification_type: string;
  status: string;
  data: any;
  scheduled_for: string;
  sent_at: string;
  created_at: string;
  attempts: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("send");
  const { toast } = useToast();

  // Form state for sending notifications
  const [formData, setFormData] = useState({
    subject: "",
    content: "",
    recipient_type: "all",
    scheduled_for: "",
    notification_type: "announcement"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);

      // For now, we'll create some default templates
      const defaultTemplates = [
        {
          id: "welcome",
          name: "Bienvenue",
          subject: "Bienvenue chez A'qua D'or",
          content: "Nous sommes ravis de vous accueillir dans notre école de natation !",
          type: "welcome"
        },
        {
          id: "reminder",
          name: "Rappel de cours",
          subject: "Rappel - Votre cours de natation demain",
          content: "N'oubliez pas votre cours de natation prévu demain à {time}.",
          type: "reminder"
        },
        {
          id: "cancellation",
          name: "Annulation",
          subject: "Annulation de cours",
          content: "Votre cours du {date} a été annulé. Nous vous recontacterons pour reprogrammer.",
          type: "cancellation"
        }
      ];
      setTemplates(defaultTemplates);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    try {
      if (!formData.subject || !formData.content) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir le sujet et le contenu",
          variant: "destructive",
        });
        return;
      }

      // Get recipients based on type
      let recipients = [];
      
      if (formData.recipient_type === "all") {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, email, full_name');
        recipients = data || [];
      } else {
        const { data } = await supabase
          .from('profiles')
          .select(`
            user_id, email, full_name,
            user_roles!inner(role)
          `)
          .eq('user_roles.role', formData.recipient_type as any);
        recipients = data || [];
      }

      // Schedule notifications for each recipient
      const scheduledFor = formData.scheduled_for 
        ? new Date(formData.scheduled_for).toISOString()
        : new Date().toISOString();

      const notifications = recipients.map(recipient => ({
        user_id: recipient.user_id,
        email: recipient.email,
        notification_type: formData.notification_type,
        data: {
          subject: formData.subject,
          content: formData.content,
          recipient_name: recipient.full_name
        },
        scheduled_for: scheduledFor,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('notification_queue')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Notification planifiée pour ${recipients.length} destinataires`,
      });

      setIsCreateDialogOpen(false);
      setFormData({
        subject: "",
        content: "",
        recipient_type: "all",
        scheduled_for: "",
        notification_type: "announcement"
      });

      fetchData();

    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
      notification_type: template.type
    }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Envoyé';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      default: return status;
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
          <h2 className="text-2xl font-bold">Gestionnaire de Notifications</h2>
          <p className="text-muted-foreground">Envoyer des annonces et gérer les communications</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="send">Envoyer</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Nouvelle Notification</span>
              </CardTitle>
              <CardDescription>
                Créer et envoyer une notification à vos utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_type">Destinataires</Label>
                  <Select 
                    value={formData.recipient_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner les destinataires" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les utilisateurs</SelectItem>
                      <SelectItem value="student">Étudiants</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                      <SelectItem value="instructor">Instructeurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notification_type">Type</Label>
                  <Select 
                    value={formData.notification_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, notification_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type de notification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Annonce</SelectItem>
                      <SelectItem value="reminder">Rappel</SelectItem>
                      <SelectItem value="update">Mise à jour</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  placeholder="Sujet de la notification..."
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  placeholder="Contenu de la notification..."
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="scheduled_for">Programmer pour (optionnel)</Label>
                <Input
                  id="scheduled_for"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                />
              </div>

              <Button onClick={sendNotification} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {formData.scheduled_for ? 'Programmer l\'envoi' : 'Envoyer maintenant'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Historique des Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Tentatives</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        {format(new Date(notification.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.notification_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{notification.email}</TableCell>
                      <TableCell>
                        {notification.data?.subject || 'Sans sujet'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(notification.status)}>
                          {getStatusText(notification.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{notification.attempts}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Modèles d'Email</span>
              </CardTitle>
              <CardDescription>
                Modèles prédéfinis pour les communications courantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.content.substring(0, 100)}...
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => useTemplate(template)}
                        className="w-full"
                      >
                        Utiliser ce modèle
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}