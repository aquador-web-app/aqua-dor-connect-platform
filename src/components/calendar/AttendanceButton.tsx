import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PublicCalendarSession } from "@/hooks/usePublicCalendar";

interface AttendanceButtonProps {
  session: PublicCalendarSession;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
}

export function AttendanceButton({ session, variant = "outline", size = "sm" }: AttendanceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);
  
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();

  const handleOpenDialog = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      // Initialize attendance for current user if they're a student
      const initialAttendance: Record<string, boolean> = {};
      if (userRole === 'student') {
        // Check if user is enrolled in this session
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', profile.id)
          .eq('class_id', session.class_id)
          .eq('status', 'active')
          .single();
          
        if (enrollment) {
          // Check existing attendance
          const { data: existingAttendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', profile.id)
            .eq('class_session_id', session.id)
            .single();
            
          initialAttendance[profile.id] = existingAttendance?.status === 'present';
        }
      }
      
      // If user is a parent, fetch their children
      if (userRole === 'parent') {
        const { data: childrenData } = await supabase
          .from('children')
          .select('id, first_name, last_name')
          .eq('parent_id', profile.id);
          
        if (childrenData) {
          const childList = childrenData.map(child => ({
            id: child.id,
            name: `${child.first_name} ${child.last_name}`
          }));
            
          setChildren(childList);
          
          // Check existing attendance for children
          for (const child of childList) {
            const { data: existingAttendance } = await supabase
              .from('attendance')
              .select('status')
              .eq('student_id', child.id)
              .eq('class_session_id', session.id)
              .single();
              
            initialAttendance[child.id] = existingAttendance?.status === 'present';
          }
        }
      }
      
      setAttendance(initialAttendance);
      setIsOpen(true);
    } catch (error) {
      console.error('Error loading attendance dialog:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de présence",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const attendanceRecords = [];
      
      // Mark attendance for current user if they're a student
      if (userRole === 'student' && profile.id in attendance) {
        attendanceRecords.push({
          student_id: profile.id,
          class_session_id: session.id,
          status: attendance[profile.id] ? 'present' : 'absent',
          marked_by: user?.id,
          marked_at: new Date().toISOString(),
          notes: notes || null
        });
      }
      
      // Mark attendance for children if user is a parent
      if (userRole === 'parent') {
        for (const child of children) {
          if (child.id in attendance) {
            attendanceRecords.push({
              student_id: child.id,
              class_session_id: session.id,
              status: attendance[child.id] ? 'present' : 'absent',
              marked_by: user?.id,
              marked_at: new Date().toISOString(),
              notes: notes || null
            });
          }
        }
      }
      
      // Upsert attendance records
      for (const record of attendanceRecords) {
        const { error } = await supabase
          .from('attendance')
          .upsert(record, {
            onConflict: 'student_id,class_session_id'
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Présence Enregistrée",
        description: `Présence marquée pour ${attendanceRecords.length} personne(s)`,
      });
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'attendance_marked', sessionId: session.id } 
      }));
      
      setIsOpen(false);
      setNotes("");
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la présence",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasAttendancePermission = userRole === 'student' || userRole === 'parent';
  
  if (!hasAttendancePermission) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={loading}
        className="flex items-center gap-1"
      >
        <UserCheck className="h-3 w-3" />
        Présence
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Marquer la Présence
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">{session.class_name}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(session.session_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} à {new Date(session.session_date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="space-y-3">
              {userRole === 'student' && profile.id in attendance && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="self-attendance">Ma présence</Label>
                  <Switch
                    id="self-attendance"
                    checked={attendance[profile.id]}
                    onCheckedChange={(checked) => 
                      setAttendance(prev => ({ ...prev, [profile.id]: checked }))
                    }
                  />
                </div>
              )}
              
              {children.map((child) => (
                <div key={child.id} className="flex items-center justify-between">
                  <Label htmlFor={`child-${child.id}`}>{child.name}</Label>
                  <Switch
                    id={`child-${child.id}`}
                    checked={attendance[child.id] || false}
                    onCheckedChange={(checked) => 
                      setAttendance(prev => ({ ...prev, [child.id]: checked }))
                    }
                  />
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Notes sur la présence..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleMarkAttendance} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}