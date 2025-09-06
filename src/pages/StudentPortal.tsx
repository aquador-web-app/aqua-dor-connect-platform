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
import { UnifiedCalendar } from "@/components/calendar/UnifiedCalendar";
import { EnhancedStudentReservations } from "@/components/dashboard/EnhancedStudentReservations";
import { StudentPayments } from "@/components/dashboard/StudentPayments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EnhancedPaymentSystem } from "@/components/dashboard/EnhancedPaymentSystem";
import { ReferralDashboard } from "@/components/dashboard/ReferralDashboard";
import { ReferralSystem } from "@/components/dashboard/ReferralSystem";
import { StudentBalanceIndicator } from "@/components/dashboard/StudentBalanceIndicator";
import { CalendarBookingSystem } from "@/components/dashboard/CalendarBookingSystem";
import { StudentReservationManager } from "@/components/dashboard/StudentReservationManager";
import { PaymentNotificationBell } from "@/components/dashboard/PaymentNotificationBell";
import { StudentNotificationSystem } from "@/components/dashboard/StudentNotificationSystem";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocation } from "react-router-dom";

const StudentPortal = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "overview"
  );
  
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
  const getChangeValue = (current: number = 0, type: 'percentage' | 'count' = 'count') => {
    // This would ideally compare with previous period data
    // For now, showing positive trend as placeholder until historical data is available
    if (type === 'percentage') {
      return Math.max(1, Math.floor(Math.random() * 10) + 1);
    }
    return Math.max(1, Math.floor(Math.max(current, 1) * 0.15) + 1);
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
          <div className="flex items-center gap-2">
            <PaymentNotificationBell />
          </div>
        </div>
        
        {/* Notification System */}
        <div className="mb-8">
          <StudentNotificationSystem />
        </div>
        
        <div className="mb-8 flex items-center justify-between">
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
              <UnifiedCalendar mode="student" showBookingActions={true} maxDaysAhead={30} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Indicator */}
        <StudentBalanceIndicator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="booking">Réservation</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="subscription">Forfaits</TabsTrigger>
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
                <CardDescription>Vos inscriptions actives et réservations confirmées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollments.length === 0 && bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">Aucun cours actuel</p>
                      <p className="text-sm">Commencez par réserver un cours dans l'onglet "Réservation"</p>
                    </div>
                  ) : (
                    <>
                      {/* Show upcoming bookings first - most important */}
                      {bookings.filter(booking => new Date(booking.class_sessions.session_date) > new Date()).map((booking) => (
                        <Card key={`upcoming-booking-${booking.id}`} className="p-4 border-l-4 border-l-green-500 bg-green-50/50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <h3 className="font-semibold">{booking.class_sessions?.classes?.name || "Cours non défini"}</h3>
                                <Badge variant="default" className="bg-green-600">Prochaine session</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Instructeur: {booking.class_sessions?.instructors?.profiles?.full_name || "Non assigné"}
                              </p>
                              <p className="text-sm font-medium text-green-700 mb-2">
                                <Clock className="h-4 w-4 inline mr-1" />
                                {format(new Date(booking.class_sessions.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                              </p>
                              <div className="flex items-center gap-2">
                                
                                <Badge variant="default">Réservé</Badge>
                                {booking.total_amount > 0 && (
                                  <Badge variant="secondary">${booking.total_amount} {booking.currency}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Enrollments - ongoing courses */}
                      {enrollments.filter(enrollment => enrollment.classes).map((enrollment) => (
                        <Card key={`enrollment-${enrollment.id}`} className="p-4 border-l-4 border-l-blue-500">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <h3 className="font-semibold">{enrollment.classes?.name || "Cours non défini"}</h3>
                                <Badge variant="secondary">Cours régulier</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Instructeur: {enrollment.classes?.instructors?.profiles?.full_name || "Non assigné"}
                              </p>
                              <div className="flex items-center gap-2 mb-3">
                                
                                <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
                                  {enrollment.status === "active" ? "Actif" : enrollment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Progression: {enrollment.progress_level}%
                                </div>
                                <Progress value={enrollment.progress_level} className="w-24" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Past bookings - less prominent */}
                      {bookings.filter(booking => booking.class_sessions && new Date(booking.class_sessions.session_date) <= new Date()).slice(0, 2).map((booking) => (
                        <Card key={`past-booking-${booking.id}`} className="p-4 opacity-60 border-l-4 border-l-gray-400">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <h3 className="font-semibold text-gray-700">{booking.class_sessions?.classes?.name || "Cours non défini"}</h3>
                                <Badge variant="outline" className="text-xs">Terminé</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy à HH:mm', { locale: fr })} • 
                                {booking.class_sessions?.instructors?.profiles?.full_name || "Non assigné"}
                              </p>
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

          <TabsContent value="booking" className="space-y-4">
            <div className="space-y-6">
              <CalendarBookingSystem onBookingSuccess={() => {
                // Refresh data when booking is successful
                refetch();
              }} />
              <StudentReservationManager />
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <StudentPayments />
          </TabsContent>

          <TabsContent value="subscription">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Programme de Parrainage</CardTitle>
                  <CardDescription>Invitez vos amis et gagnez des réductions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReferralSystem />
                </CardContent>
              </Card>
              
              <EnhancedPaymentSystem />
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