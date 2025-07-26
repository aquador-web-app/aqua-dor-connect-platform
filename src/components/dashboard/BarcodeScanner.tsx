import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan, Camera, User, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  full_name: string;
  barcode: string;
  email: string;
}

interface BarcodeResult {
  student: Student | null;
  success: boolean;
  message: string;
}

export function BarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [recentScans, setRecentScans] = useState<BarcodeResult[]>([]);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const processBarcode = async (barcode: string) => {
    try {
      // Find student by barcode
      const { data: student, error } = await supabase
        .from("profiles")
        .select("id, full_name, barcode, email")
        .eq("barcode", barcode.trim())
        .single();

      if (error || !student) {
        const result: BarcodeResult = {
          student: null,
          success: false,
          message: "Étudiant non trouvé"
        };
        setRecentScans(prev => [result, ...prev.slice(0, 4)]);
        toast({
          title: "Échec du scan",
          description: "Code-barres non reconnu",
          variant: "destructive"
        });
        return;
      }

      // Record attendance
      const { error: attendanceError } = await supabase
        .from("attendance")
        .insert({
          student_id: student.id,
          status: "present",
          notes: "Marqué présent par scan de code-barres"
        });

      if (attendanceError) throw attendanceError;

      const result: BarcodeResult = {
        student,
        success: true,
        message: "Présence enregistrée"
      };

      setRecentScans(prev => [result, ...prev.slice(0, 4)]);
      toast({
        title: "Scan réussi",
        description: `${student.full_name} marqué présent`
      });

    } catch (error) {
      console.error("Error processing barcode:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement",
        variant: "destructive"
      });
    }
  };

  const handleManualScan = async () => {
    if (!manualCode.trim()) return;
    await processBarcode(manualCode);
    setManualCode("");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
        setScanning(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Erreur caméra",
        description: "Impossible d'accéder à la caméra",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
    setScanning(false);
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
          <CardTitle className="flex items-center space-x-2">
            <Scan className="h-5 w-5 text-secondary" />
            <span>Scanner Code-barres</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Saisie manuelle</label>
            <div className="flex space-x-2">
              <Input
                placeholder="Entrez le code-barres..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
              />
              <Button onClick={handleManualScan} disabled={!manualCode.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Camera controls */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Scanner avec caméra</label>
            <div className="flex space-x-2">
              {!useCamera ? (
                <Button onClick={startCamera} variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Démarrer caméra
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Arrêter caméra
                </Button>
              )}
            </div>
          </div>

          {/* Camera preview */}
          {useCamera && (
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-secondary bg-secondary/20 w-48 h-32 rounded-lg flex items-center justify-center">
                  <Scan className="h-12 w-12 text-secondary animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scans récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    scan.success 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    scan.success ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    {scan.success ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {scan.student ? scan.student.full_name : "Inconnu"}
                    </p>
                    <p className="text-sm text-muted-foreground">{scan.message}</p>
                  </div>
                  {scan.student && (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}