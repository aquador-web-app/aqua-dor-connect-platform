import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scan, User, CheckCircle, XCircle, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  avatar_url: string | null;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  marked_at: string;
  present: boolean;
  profiles: StudentProfile;
}

export function EnhancedBarcodeScanner() {
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedStudent, setScannedStudent] = useState<StudentProfile | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecentAttendance();
  }, []);

  const fetchRecentAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          marked_at,
          present,
          profiles:student_id (
            id,
            full_name,
            email,
            barcode,
            avatar_url
          )
        `)
        .order('marked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const searchStudentByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          barcode,
          avatar_url
        `)
        .eq('barcode', barcode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data as StudentProfile;
    } catch (error) {
      console.error('Error searching student:', error);
      return null;
    }
  };

  const markAttendance = async (studentId: string, present: boolean = true) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          marked_by: user?.id,
          marked_by_role: hasAnyRole(['admin', 'co_admin']) ? 'admin' : 'instructor',
          present,
          status: present ? 'present' : 'absent',
          marked_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Présence enregistrée",
        description: `${scannedStudent?.full_name} a été marqué(e) comme ${present ? 'présent(e)' : 'absent(e)'}`,
      });

      // Refresh recent attendance
      fetchRecentAttendance();
      
      // Clear scanned student after a short delay
      setTimeout(() => {
        setScannedStudent(null);
        setBarcodeInput("");
      }, 2000);

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la présence",
        variant: "destructive"
      });
    }
  };

  const handleBarcodeInput = async (barcode: string) => {
    setBarcodeInput(barcode);
    
    if (barcode.length >= 6) { // Minimum barcode length
      setLoading(true);
      
      const student = await searchStudentByBarcode(barcode);
      
      if (student) {
        setScannedStudent(student);
        toast({
          title: "Étudiant trouvé",
          description: `${student.full_name} identifié`,
        });
      } else {
        toast({
          title: "Code invalide",
          description: "Aucun étudiant trouvé avec ce code-barres",
          variant: "destructive"
        });
        setBarcodeInput("");
      }
      
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Scanner de Présence</h2>
        <p className="text-muted-foreground">
          Scannez ou saisissez le code-barres de l'étudiant pour marquer sa présence
        </p>
      </div>

      {/* Barcode Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scanner / Saisir le Code
          </CardTitle>
          <CardDescription>
            Scannez avec un lecteur de code-barres ou saisissez manuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Code-barres (ex: AQ12345678)"
                value={barcodeInput}
                onChange={(e) => handleBarcodeInput(e.target.value.toUpperCase())}
                className="font-mono text-lg"
                autoFocus
              />
              <Button 
                variant="outline" 
                onClick={() => handleBarcodeInput(barcodeInput)}
                disabled={loading || !barcodeInput.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {loading && (
              <div className="text-center text-muted-foreground">
                Recherche en cours...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scanned Student */}
      {scannedStudent && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              Étudiant Identifié
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={scannedStudent.avatar_url || ""} />
                <AvatarFallback className="text-lg font-bold">
                  {getInitials(scannedStudent.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{scannedStudent.full_name}</h3>
                <p className="text-muted-foreground">{scannedStudent.email}</p>
                <Badge variant="secondary" className="mt-1">
                  {scannedStudent.barcode}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => markAttendance(scannedStudent.id, true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer Présent
              </Button>
              <Button 
                variant="outline" 
                onClick={() => markAttendance(scannedStudent.id, false)}
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Marquer Absent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Présences Récentes</CardTitle>
          <CardDescription>Les 10 dernières présences enregistrées</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune présence enregistrée aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.profiles.avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(record.profiles.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-medium">{record.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.marked_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  
                  <Badge 
                    variant={record.present ? "default" : "secondary"}
                    className={record.present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                  >
                    {record.present ? "Présent" : "Absent"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}