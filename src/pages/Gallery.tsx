import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Play, Image as ImageIcon, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  is_featured: boolean;
}

const Gallery = () => {
  const { t } = useLanguage();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems((data || []).map(item => ({
        ...item,
        media_type: item.media_type as 'image' | 'video'
      })));
    } catch (error) {
      console.error('Error fetching gallery items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = galleryItems.filter(item => 
    filter === 'all' || item.media_type === filter
  );

  // Sample data for demonstration when database is empty
  const sampleItems: GalleryItem[] = [
    {
      id: 'sample-1',
      title: 'Cours de natation débutant',
      description: 'Nos élèves apprennent les bases dans un environnement sécurisé',
      media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
      is_featured: true
    },
    {
      id: 'sample-2',
      title: 'Compétition inter-écoles',
      description: 'Nos nageurs en action lors du championnat régional',
      media_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=300',
      is_featured: false
    },
    {
      id: 'sample-3',
      title: 'Entraînement avancé',
      description: 'Techniques de perfectionnement avec nos instructeurs experts',
      media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
      is_featured: false
    },
    {
      id: 'sample-4',
      title: 'Cours aquagym',
      description: 'Fitness aquatique pour tous les niveaux',
      media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
      is_featured: false
    },
    {
      id: 'sample-5',
      title: 'Sauvetage aquatique',
      description: 'Formation aux techniques de sauvetage',
      media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
      is_featured: false
    },
    {
      id: 'sample-6',
      title: 'Cérémonie de remise des diplômes',
      description: 'Nos élèves célèbrent leurs accomplissements',
      media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      media_type: 'image',
      thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
      is_featured: false
    }
  ];

  const displayItems = filteredItems.length > 0 ? filteredItems : sampleItems;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-subtle">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {t('gallery.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('gallery.subtitle')}
          </p>
          
          {/* Filter Buttons */}
          <div className="flex justify-center space-x-4 mb-8">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="px-6"
            >
              {t('gallery.filters.all')}
            </Button>
            <Button
              variant={filter === 'image' ? 'default' : 'outline'}
              onClick={() => setFilter('image')}
              className="px-6"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('gallery.filters.photos')}
            </Button>
            <Button
              variant={filter === 'video' ? 'default' : 'outline'}
              onClick={() => setFilter('video')}
              className="px-6"
            >
              <Play className="h-4 w-4 mr-2" />
              {t('gallery.filters.videos')}
            </Button>
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              {t('gallery.emptyState')}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item) => (
              <Dialog key={item.id}>
                <DialogTrigger asChild>
                  <Card className="group cursor-pointer hover:shadow-elegant transition-all duration-300 overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {item.media_type === 'video' ? (
                            <Play className="h-12 w-12 text-white" />
                          ) : (
                            <Eye className="h-12 w-12 text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* Type Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge variant={item.media_type === 'video' ? 'default' : 'secondary'}>
                          {item.media_type === 'video' ? (
                            <Play className="h-3 w-3 mr-1" />
                          ) : (
                            <ImageIcon className="h-3 w-3 mr-1" />
                          )}
                          {item.media_type === 'video' ? t('gallery.types.video') : t('gallery.types.photo')}
                        </Badge>
                      </div>
                      
                      {/* Featured Badge */}
                      {item.is_featured && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="destructive">{t('gallery.featured')}</Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl">
                  <div className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      {item.media_type === 'video' ? (
                        <video
                          src={item.media_url}
                          controls
                          className="w-full h-full object-cover"
                        >
                          {t('gallery.videoNotSupported')}
                        </video>
                      ) : (
                        <img
                          src={item.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Gallery;