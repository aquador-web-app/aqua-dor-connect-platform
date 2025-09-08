import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  Upload,
  Eye,
  Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

interface DocumentAcceptance {
  id: string;
  user_id: string;
  document_id: string;
  signature_data: any;
  ip_address: unknown;
  accepted_at: string;
  profiles: any;
  documents: any;
}

export const DocumentManagement = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [acceptances, setAcceptances] = useState<DocumentAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    url: '',
    is_mandatory: true
  });

  useEffect(() => {
    fetchDocuments();
    fetchAcceptances();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents.",
        variant: "destructive"
      });
    }
  };

  const fetchAcceptances = async () => {
    try {
      const { data, error } = await supabase
        .from('student_doc_acceptances')
        .select(`
          *,
          profiles(full_name, email),
          documents(name, type)
        `)
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      setAcceptances(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur", 
        description: "Impossible de charger les acceptations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDoc) {
        const { error } = await supabase
          .from('documents')
          .update(formData)
          .eq('id', editingDoc.id);

        if (error) throw error;
        toast({ title: "Document mis à jour avec succès!" });
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Document créé avec succès!" });
      }

      setDialogOpen(false);
      setEditingDoc(null);
      setFormData({ name: '', type: '', url: '', is_mandatory: true });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Document supprimé avec succès!" });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      name: doc.name,
      type: doc.type,
      url: doc.url,
      is_mandatory: doc.is_mandatory
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Documents</h2>
          <p className="text-muted-foreground">Gérez les documents obligatoires et optionnels</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDoc(null);
              setFormData({ name: '', type: '', url: '', is_mandatory: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? 'Modifier' : 'Créer'} un Document
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du document</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="ex: termes_service, politique_confidentialite"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL du document</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_mandatory: checked }))}
                />
                <Label htmlFor="mandatory">Document obligatoire</Label>
              </div>
              <Button type="submit" disabled={loading}>
                {editingDoc ? 'Mettre à jour' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="acceptances">Acceptations ({acceptances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={doc.is_mandatory ? "default" : "secondary"}>
                            {doc.is_mandatory ? "Obligatoire" : "Optionnel"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="acceptances" className="space-y-4">
          <div className="grid gap-4">
            {acceptances.map((acceptance) => (
              <Card key={acceptance.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Users className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">{acceptance.profiles?.full_name || 'Utilisateur inconnu'}</h3>
                        <p className="text-sm text-muted-foreground">{acceptance.profiles?.email || 'Email inconnu'}</p>
                        <p className="text-sm font-medium text-green-600">{acceptance.documents?.name || 'Document inconnu'}</p>
                        <p className="text-xs text-muted-foreground">
                          Accepté le {new Date(acceptance.accepted_at).toLocaleDateString('fr-FR')} depuis {String(acceptance.ip_address || 'IP inconnue')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Accepté</Badge>
                      {acceptance.signature_data && (
                        <Badge variant="secondary">Signé</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};