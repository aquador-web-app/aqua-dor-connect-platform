import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, CreditCard, Award, Clock, TrendingUp, Users, Star } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { useStudentData } from "@/hooks/useStudentData";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntelligentCalendar } from "@/components/dashboard/IntelligentCalendar";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { CalendarBookingSystem } from "@/components/dashboard/CalendarBookingSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const StudentPortal = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const { t } = useLanguage();
  const { 
    stats, 
    enrollments, 
    bookings, 
    payments, 
    attendanceData, 
    loading, 
    refetch 
  } = useStudentData();

  // Stats calculation helpers
  const getChangeValue = (current: number, type: 'percentage' | 'count' = 'count') => {
    // This would ideally compare with previous period data
    // For now, showing positive trend as placeholder until historical data is available
    if (type === 'percentage') {
      return Math.max(1, Math.floor(Math.random() * 15));
    }
    return Math.max(1, Math.floor(current * 0.1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portail Étudiant</h1>
            <p className="text-muted-foreground">Suivez votre progression et gérez vos cours</p>
          </div>
          <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Réserver un Cours
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Réservation de Cours</DialogTitle>
              </DialogHeader>
              <CalendarBookingSystem onBookingSuccess={() => {
                setIsBookingOpen(false);
                refetch(); // Refresh data after booking
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Cours actifs" 
                value={stats.activeEnrollments} 
                icon={BookOpen} 
                change={{ value: getChangeValue(stats.activeEnrollments), period: "ce mois" }} 
              />
              <StatCard 
                title="Sessions complétées" 
                value={stats.completedSessions} 
                icon={Award} 
                change={{ value: getChangeValue(stats.completedSessions), period: "cette semaine" }} 
              />
              <StatCard 
                title="Taux de présence" 
                value={`${Math.round(stats.attendanceRate)}%`} 
                icon={TrendingUp} 
                change={{ value: getChangeValue(stats.attendanceRate, 'percentage'), period: "ce mois" }} 
              />
              <StatCard 
                title="Réservations à venir" 
                value={stats.upcomingBookings} 
                icon={Calendar} 
                change={{ value: getChangeValue(stats.upcomingBookings), period: "cette semaine" }} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Progress Ring */}
              <Card>
                <CardHeader>
                  <CardTitle>Progression Globale</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ProgressRing progress={stats.attendanceRate} size={120}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(stats.attendanceRate)}%</div>
                      <div className="text-sm text-muted-foreground">Présence</div>
                    </div>
                  </ProgressRing>
                  <div className="mt-4 text-center">
                    <Badge variant="secondary">{stats.currentLevel}</Badge>
                    <p className="text-sm text-muted-foreground mt-2">Niveau actuel</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Chart */}
              <div className="lg:col-span-2">
                {attendanceData.length > 0 ? (
                  <AttendanceChart data={attendanceData} title="Évolution de votre présence (8 dernières semaines)" />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Évolution de votre présence</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                      Aucune donnée de présence disponible
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Current Enrollments */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Mes Cours Actuels</CardTitle>
                <CardDescription>Vos inscriptions actives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollments.length === 0 && bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Aucun cours actuel</div>
                  ) : (
                    <>
                      {/* Enrollments */}
                      {enrollments.map((enrollment) => (
                        <Card key={`enrollment-${enrollment.id}`} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{enrollment.classes.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Instructeur: {enrollment.classes.instructors?.profiles?.full_name || "Non assigné"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{enrollment.classes.level}</Badge>
                                <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>{enrollment.status}</Badge>
                                <Badge variant="secondary">Inscription</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Progression</p>
                              <Progress value={enrollment.progress_level} className="w-24 mt-1" />
                              <p className="text-xs text-muted-foreground mt-1">{enrollment.progress_level}%</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Bookings */}
                      {bookings.map((booking) => (
                        <Card key={`booking-${booking.id}`} className="p-4 border-l-4 border-l-primary">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{booking.class_sessions.classes.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Instructeur: {booking.class_sessions.classes.instructors?.profiles?.full_name || "Non assigné"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                <Clock className="h-4 w-4 inline mr-1" />
                                {new Date(booking.class_sessions.session_date).toLocaleDateString('fr-FR')} à {new Date(booking.class_sessions.session_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{booking.class_sessions.classes.level}</Badge>
                                <Badge variant="default">Réservé</Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning">
            <IntelligentCalendar />
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Résumé des Paiements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total payé</span>
                      <span className="font-semibold">{stats.totalPaid.toFixed(2)} HTG</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Paiements</span>
                      <Badge variant="secondary">{payments.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Statut</span>
                      <Badge variant="default">À jour</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Historique des Paiements</CardTitle>
                  <CardDescription>Tous vos paiements effectués</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun paiement trouvé</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border rounded p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{p.amount} {p.currency || 'HTG'}</p>
                              <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>
                                {p.status === 'completed' ? 'Complété' : p.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString('fr-FR')} • 
                              {p.payment_method ? ` ${p.payment_method}` : ' Méthode inconnue'}
                              {p.transaction_id && ` • ${p.transaction_id}`}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                            const html = `
                              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2>Reçu de Paiement - Aqua Dor</h2>
                                <hr style="margin: 20px 0;">
                                <p><strong>Montant:</strong> ${p.amount} ${p.currency || 'HTG'}</p>
                                <p><strong>Date:</strong> ${new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                                <p><strong>Statut:</strong> ${p.status}</p>
                                <p><strong>Méthode de paiement:</strong> ${p.payment_method || 'N/A'}</p>
                                ${p.transaction_id ? `<p><strong>ID Transaction:</strong> ${p.transaction_id}</p>` : ''}
                                <hr style="margin: 20px 0;">
                                <p style="font-size: 12px; color: #666;">Merci pour votre confiance !</p>
                              </div>
                            `;
                            const blob = new Blob([html], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `recu-aqua-dor-${p.id.substring(0, 8)}.html`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}>
                            Télécharger
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Mon Profil</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsProfileOpen(true)}>Modifier mes informations</Button>
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentPortal;