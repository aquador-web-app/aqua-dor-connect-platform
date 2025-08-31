import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Search, UserCheck, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface StudentInfo {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  phone?: string;
  avatar_url?: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  status: string;
  marked_at: string;
  notes?: string;
  student_profile: {
    full_name: string;
  };
}

export function EnhancedBarcodeScanner() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Only co-admins can use barcode scanning
  const canScan = hasRole('admin') || hasRole('co_admin');

  useEffect(() => {
    if (canScan) {
      fetchRecentAttendance();
    }
  }, [canScan]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    await processBarcode(barcodeInput.trim());
  };

  const processBarcode = async (barcode: string) => {
    if (!canScan) {
      toast({
        title: "Accès refusé",
        description: "Seuls les co-administrateurs peuvent scanner les codes-barres",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Find student by barcode
      const { data: student, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, barcode, phone, avatar_url')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) throw error;

      if (!student) {
        toast({
          title: "Code-barre non trouvé",
          description: "Aucun étudiant trouvé avec ce code-barre",
          variant: "destructive"
        });
        setStudentInfo(null);
        return;
      }

      setStudentInfo(student);

      // Mark attendance
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          student_id: student.id,
          status: 'present',
          marked_by: profile?.id,
          marked_by_role: 'co_admin',
          marked_at: new Date().toISOString(),
          notes: `Scanné par ${profile?.full_name || 'Co-Admin'}`
        });

      if (attendanceError) throw attendanceError;

      toast({
        title: "Présence enregistrée",
        description: `${student.full_name} marqué(e) comme présent(e)`,
        variant: "default"
      });

      // Fetch recent attendance
      await fetchRecentAttendance();
      
      // Clear the input
      setBarcodeInput("");
      
      // Auto-clear student info after 3 seconds
      setTimeout(() => {
        setStudentInfo(null);
      }, 3000);

    } catch (error: any) {
      console.error('Error processing barcode:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter le code-barre",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          student_profile:profiles!attendance_student_id_fkey(full_name)
        `)
        .order('marked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const startBarcodeScanning = () => {
    setScanning(true);
    toast({
      title: "Scanner activé",
      description: "Scannez le code-barre ou tapez-le manuellement",
    });
  };

  if (!canScan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scanner de Code-barre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Seuls les co-administrateurs ont accès au scanner de code-barre pour marquer les présences.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barcode Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scanner de Code-barre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={startBarcodeScanning}
              disabled={scanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <QrCode className="h-4 w-4" />
              {scanning ? 'Scanner actif' : 'Activer scanner'}
            </Button>
          </div>

          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div>
              <Label htmlFor="barcode">Code-barre de l'étudiant</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scannez ou tapez le code-barre..."
                  className="font-mono"
                  autoFocus
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Student Info Display */}
          {studentInfo && (
            <Card className="bg-green-50 border-green-200 animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-green-800">
                      {studentInfo.full_name}
                    </div>
                    <div className="text-sm text-green-600">
                      {studentInfo.email}
                    </div>
                    <div className="text-xs text-green-500 font-mono">
                      Code: {studentInfo.barcode}
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">
                    Présent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Présences récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune présence enregistrée récemment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {record.student_profile?.full_name || 'Nom non disponible'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.marked_at), 'dd/MM/yyyy à HH:mm')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {record.status === 'present' ? 'Présent' : record.status}
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