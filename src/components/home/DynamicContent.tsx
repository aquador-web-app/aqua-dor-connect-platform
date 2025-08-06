import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Star, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface ContentItem {
  id: string;
  type: string;
  title: string;
  content: string;
  media_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface UpcomingClass {
  id: string;
  session_date: string;
  classes: {
    name: string;
    level: string;
    duration_minutes: number;
    price: number;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
  booking_count: number;
  max_participants: number;
}

export function DynamicContent() {
  const [announcements, setAnnouncements] = useState<ContentItem[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDynamicContent();
  }, []);

  const fetchDynamicContent = async () => {
    try {
      // Fetch announcements and featured content
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('is_active', true)
        .in('type', ['announcement', 'banner', 'featured'])
        .order('display_order', { ascending: true })
        .limit(3);

      if (contentError) throw contentError;
      setAnnouncements(contentData || []);

      // Fetch upcoming classes
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: classesData, error: classesError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          classes!inner (
            name,
            level,
            duration_minutes,
            price
          ),
          instructors!inner (
            profiles!inner (
              full_name
            )
          )
        `)
        .gte('session_date', now.toISOString())
        .lte('session_date', nextWeek.toISOString())
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .limit(4);

      if (classesError) throw classesError;

      // Get booking counts for each session
      if (classesData && classesData.length > 0) {
        const sessionIds = classesData.map(s => s.id);
        const { data: bookingCounts } = await supabase
          .from('bookings')
          .select('class_session_id')
          .in('class_session_id', sessionIds)
          .eq('status', 'confirmed');

        const bookingCountMap: {[key: string]: number} = {};
        bookingCounts?.forEach(booking => {
          bookingCountMap[booking.class_session_id] = (bookingCountMap[booking.class_session_id] || 0) + 1;
        });

        const classesWithCounts = classesData.map(session => ({
          ...session,
          booking_count: bookingCountMap[session.id] || 0
        }));

        setUpcomingClasses(classesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching dynamic content:', error);
      // Use fallback content if needed
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-700';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-700';
      case 'advanced': return 'bg-red-500/20 text-red-700';
      case 'competition': return 'bg-purple-500/20 text-purple-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Actualités & Prochains Cours
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Restez informé des dernières actualités et découvrez nos prochaines sessions de cours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Announcements & Featured Content */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold mb-4">Actualités</h3>
            
            {announcements.length > 0 ? (
              announcements.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow duration-300">
                  {item.media_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={item.media_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={item.type === 'announcement' ? 'default' : 'secondary'}>
                        {item.type === 'announcement' ? 'Annonce' : 'À la Une'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <h4 className="text-lg font-semibold mb-2">Aucune actualité récente</h4>
                  <p className="text-muted-foreground">
                    Consultez régulièrement cette section pour rester informé de nos actualités.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upcoming Classes */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Prochains Cours</h3>
              <Button variant="outline" asChild>
                <Link to="/auth">
                  Voir Planning Complet
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            {upcomingClasses.length > 0 ? (
              <div className="space-y-4">
                {upcomingClasses.map((classSession) => (
                  <Card key={classSession.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{classSession.classes.name}</h4>
                            <Badge 
                              variant="secondary" 
                              className={getLevelColor(classSession.classes.level)}
                            >
                              {classSession.classes.level}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(classSession.session_date)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime(classSession.session_date)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-muted-foreground">
                              Instructeur: {classSession.instructors?.profiles?.full_name}
                            </span>
                            <span className="font-medium text-primary">
                              ${classSession.classes.price} USD
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Places: </span>
                            <span className={`font-medium ${
                              classSession.booking_count >= classSession.max_participants 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {classSession.max_participants - classSession.booking_count} / {classSession.max_participants}
                            </span>
                          </div>
                          <Button size="sm" asChild>
                            <Link to="/auth">
                              Réserver
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Aucun cours programmé</h4>
                  <p className="text-muted-foreground">
                    De nouveaux cours seront bientôt disponibles. Restez connecté !
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}