import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Edit, Eye, EyeOff, Image, Video, BookOpen, FileCheck } from "lucide-react";
import { BulletinManager } from "./BulletinManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  content: string | null;
  type: string;
  media_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  author_id: string | null;
}

const contentTypes = [
  { value: "banner", label: "Bannière" },
  { value: "announcement", label: "Annonce" },
  { value: "news", label: "Actualité" },
  { value: "gallery", label: "Galerie" },
  { value: "page", label: "Page" }
];

export function ContentManager() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "announcement",
    media_url: "",
    is_active: true,
    display_order: 0
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error("Error fetching contents:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le contenu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingContent) {
        // Update existing content
        const { error } = await supabase
          .from("content")
          .update({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            media_url: formData.media_url || null,
            is_active: formData.is_active,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingContent.id);

        if (error) throw error;

        toast({
          title: "Contenu mis à jour",
          description: "Le contenu a été modifié avec succès"
        });
      } else {
        // Create new content
        const { error } = await supabase
          .from("content")
          .insert({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            media_url: formData.media_url || null,
            is_active: formData.is_active,
            display_order: formData.display_order
          });

        if (error) throw error;

        toast({
          title: "Contenu créé",
          description: "Le nouveau contenu a été ajouté avec succès"
        });
      }

      setShowDialog(false);
      setEditingContent(null);
      resetForm();
      fetchContents();
    } catch (error) {
      console.error("Error saving content:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le contenu",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (content: Content) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content || "",
      type: content.type,
      media_url: content.media_url || "",
      is_active: content.is_active,
      display_order: content.display_order
    });
    setShowDialog(true);
  };

  const handleToggleActive = async (content: Content) => {
    try {
      const { error } = await supabase
        .from("content")
        .update({ is_active: !content.is_active })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: content.is_active ? "Contenu désactivé" : "Contenu activé",
        description: `Le contenu "${content.title}" a été ${content.is_active ? 'masqué' : 'publié'}`
      });

      fetchContents();
    } catch (error) {
      console.error("Error toggling content:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "announcement",
      media_url: "",
      is_active: true,
      display_order: 0
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${formData.type}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("content").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setFormData({ ...formData, media_url: publicUrl });

      toast({
        title: "Fichier téléversé",
        description: "Le média a été ajouté et l'URL a été remplie.",
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Échec du téléversement",
        description: "Vérifiez vos permissions et réessayez.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "gallery": return <Image className="h-4 w-4" />;
      case "banner": return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return contentTypes.find(ct => ct.value === type)?.label || type;
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
      <div>
        <h2 className="text-2xl font-bold">Gestion de Contenu</h2>
        <p className="text-muted-foreground">Gérez le contenu du site et les bulletins étudiants</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Contenu Site</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
          <TabsTrigger value="technical">Fiches Techniques</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-6">
          <div className="flex justify-between items-center">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingContent(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contenu
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? "Modifier le contenu" : "Nouveau contenu"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Titre du contenu"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Contenu du message..."
                  rows={6}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="media_url">URL média (optionnel)</Label>
                  <Input
                    id="media_url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({...formData, media_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <Label>Téléverser un fichier (image/vidéo)</Label>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground mt-1">Téléversement en cours...</p>
                  )}
                </div>

                {formData.media_url && (
                  <div className="mt-2">
                    {/\.(mp4|webm|ogg)$/i.test(formData.media_url) ? (
                      <video
                        src={formData.media_url}
                        className="w-full rounded-md"
                        controls
                      />
                    ) : (
                      <img
                        src={formData.media_url}
                        alt={`Prévisualisation ${formData.title || 'média'}`}
                        className="w-full rounded-md"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_order">Ordre d'affichage</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label>Publié</Label>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editingContent ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contents.map((content) => (
          <Card key={content.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(content.type)}
                    <CardTitle className="text-lg">{content.title}</CardTitle>
                  </div>
                  <Badge variant="outline">{getTypeLabel(content.type)}</Badge>
                  <Badge variant={content.is_active ? "default" : "secondary"}>
                    {content.is_active ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(content)}
                  >
                    {content.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(content)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {content.content && (
                  <p className="text-muted-foreground line-clamp-3">{content.content}</p>
                )}
                {content.media_url && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Média:</span>
                    <a 
                      href={content.media_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      {content.media_url}
                    </a>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ordre: {content.display_order}</span>
                  <span>
                    Modifié le {new Date(content.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contents.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier contenu pour commencer
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un contenu
            </Button>
          </CardContent>
        </Card>
      )}
        </TabsContent>
        
        <TabsContent value="bulletins">
          <BulletinManager />
        </TabsContent>
        
        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Fiches Techniques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                La gestion des fiches techniques sera implémentée prochainement.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}