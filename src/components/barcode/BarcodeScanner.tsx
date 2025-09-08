import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, Scan, User, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudentInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
  qr_code: string;
  barcode: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  entry_time?: string;
  exit_time?: string;
  status: string;
  present: boolean;
}

export const BarcodeScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder à la caméra",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const lookupStudent = async (code: string) => {
    try {
      setLoading(true);
      
      // Search by QR code or barcode
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, qr_code, barcode')
        .or(`qr_code.eq.${code},barcode.eq.${code}`)
        .single();

      if (error || !data) {
        // Also check children table
        const { data: childData, error: childError } = await supabase
          .from('children')
          .select('id, first_name, last_name, qr_code')
          .eq('qr_code', code)
          .single();

        if (childError || !childData) {
          throw new Error('Code non trouvé');
        }

        setStudentInfo({
          id: childData.id,
          full_name: `${childData.first_name} ${childData.last_name}`,
          qr_code: childData.qr_code,
          barcode: ''
        });
      } else {
        setStudentInfo(data);
      }

      // Check existing attendance for today
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', data?.id || '')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1);

      setAttendanceRecord(attendance?.[0] || null);
    } catch (error) {
      console.error('Error looking up student:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la recherche",
        variant: "destructive"
      });
      setStudentInfo(null);
      setAttendanceRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (type: 'entry' | 'exit') => {
    if (!studentInfo) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const now = new Date().toISOString();
      
      if (attendanceRecord && type === 'exit') {
        // Update existing record with exit time
        const { error } = await supabase
          .from('attendance')
          .update({
            exit_time: now,
            status: 'completed',
            marked_by: user.id,
            marked_by_role: 'co_admin'
          })
          .eq('id', attendanceRecord.id);

        if (error) throw error;
        
        toast({
          title: "Sortie enregistrée",
          description: `Sortie de ${studentInfo.full_name} enregistrée avec succès`
        });
      } else {
        // Create new attendance record for entry
        const { error } = await supabase
          .from('attendance')
          .insert({
            student_id: studentInfo.id,
            entry_time: now,
            present: true,
            status: 'present',
            marked_by: user.id,
            marked_by_role: 'co_admin',
            qr_scanned: true
          });

        if (error) throw error;
        
        toast({
          title: "Entrée enregistrée",
          description: `Entrée de ${studentInfo.full_name} enregistrée avec succès`
        });
      }

      // Refresh attendance record
      await lookupStudent(studentInfo.qr_code || studentInfo.barcode);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement de la présence",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = () => {
    if (manualCode.trim()) {
      lookupStudent(manualCode.trim());
    }
  };

  const resetScan = () => {
    setStudentInfo(null);
    setAttendanceRecord(null);
    setManualCode('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scanner de Présence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          <div className="flex gap-2">
            <Button
              onClick={isScanning ? stopCamera : startCamera}
              variant={isScanning ? "destructive" : "default"}
            >
              {isScanning ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Arrêter la caméra
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Démarrer la caméra
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={resetScan}>
              Réinitialiser
            </Button>
          </div>

          {/* Camera View */}
          {isScanning && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-lg bg-black"
              />
              <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
            </div>
          )}

          {/* Manual Code Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-code">Code manuel</Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                placeholder="Saisir le code QR ou code-barres"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
              />
              <Button onClick={handleManualLookup} disabled={!manualCode.trim() || loading}>
                Rechercher
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Information */}
      {studentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations de l'étudiant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {studentInfo.avatar_url && (
                <img
                  src={studentInfo.avatar_url}
                  alt={studentInfo.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold">{studentInfo.full_name}</h3>
                <p className="text-muted-foreground">
                  Code: {studentInfo.qr_code || studentInfo.barcode}
                </p>
              </div>
            </div>

            {/* Attendance Status */}
            {attendanceRecord ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Présent aujourd'hui</span>
                </div>
                
                {attendanceRecord.entry_time && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Clock className="h-4 w-4" />
                    Entrée: {new Date(attendanceRecord.entry_time).toLocaleTimeString('fr-FR')}
                  </div>
                )}
                
                {attendanceRecord.exit_time && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Clock className="h-4 w-4" />
                    Sortie: {new Date(attendanceRecord.exit_time).toLocaleTimeString('fr-FR')}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800">Aucune présence enregistrée aujourd'hui</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!attendanceRecord && (
                <Button
                  onClick={() => markAttendance('entry')}
                  disabled={loading}
                  className="flex-1"
                >
                  Marquer l'entrée
                </Button>
              )}
              
              {attendanceRecord && !attendanceRecord.exit_time && (
                <Button
                  onClick={() => markAttendance('exit')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Marquer la sortie
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};