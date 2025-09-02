import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentMethodSelectorProps {
  classSession: {
    id: string;
    session_date: string;
    classes: {
      name: string;
      level: string;
      price: number;
      description?: string;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    };
  };
  onConfirmReservation: (paymentMethod: string, notes?: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function PaymentMethodSelector({ 
  classSession, 
  onConfirmReservation, 
  onCancel, 
  loading 
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");

  const paymentMethods = [
    {
      id: "cash",
      name: "Espèces",
      icon: Banknote,
      description: "Paiement en espèces au centre",
      available: true,
      badge: "Physique"
    },
    {
      id: "moncash",
      name: "MonCash",
      icon: CreditCard,
      description: "Paiement mobile MonCash",
      available: true,
      badge: "Digital"
    },
    {
      id: "check",
      name: "Chèque",
      icon: CheckCircle,
      description: "Paiement par chèque au centre",
      available: true,
      badge: "Physique"
    },
    {
      id: "card",
      name: "Carte Bancaire",
      icon: CreditCard,
      description: "Paiement par carte (bientôt disponible)",
      available: false,
      badge: "Bientôt"
    }
  ];

  const handleConfirm = async () => {
    await onConfirmReservation(selectedMethod, notes);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Class Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Détails de la Réservation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{classSession.classes.name}</h3>
            <Badge variant="outline">{classSession.classes.level}</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <div className="font-medium">
                {format(new Date(classSession.session_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Heure:</span>
              <div className="font-medium">
                {format(new Date(classSession.session_date), 'HH:mm')}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Instructeur:</span>
              <div className="font-medium">
                {classSession.instructors?.profiles?.full_name || 'Non assigné'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Prix:</span>
              <div className="font-semibold text-primary text-lg">
                ${classSession.classes.price}
              </div>
            </div>
          </div>
          
          {classSession.classes.description && (
            <p className="text-sm text-muted-foreground border-t pt-3">
              {classSession.classes.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
            <div className="grid gap-4">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <div key={method.id} className="relative">
                    <Label
                      htmlFor={method.id}
                      className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedMethod === method.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border'
                      } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <RadioGroupItem 
                        id={method.id} 
                        value={method.id} 
                        disabled={!method.available}
                      />
                      <IconComponent 
                        className={`h-6 w-6 ${
                          method.available ? 'text-primary' : 'text-muted-foreground'
                        }`} 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.name}</span>
                          <Badge 
                            variant={method.available ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {method.badge}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                      {!method.available && (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          {/* Payment Instructions */}
          {selectedMethod === 'cash' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800">Instructions - Paiement Espèces</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Votre réservation sera confirmée. Veuillez effectuer le paiement en espèces 
                lors de votre arrivée au centre aquatique.
              </p>
            </div>
          )}

          {selectedMethod === 'check' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800">Instructions - Paiement par Chèque</h4>
              <p className="text-sm text-blue-700 mt-1">
                Votre réservation sera confirmée. Veuillez apporter votre chèque 
                lors de votre arrivée au centre aquatique.
              </p>
            </div>
          )}

          {selectedMethod === 'moncash' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">Instructions - MonCash</h4>
              <p className="text-sm text-green-700 mt-1">
                Après confirmation, vous recevrez les instructions MonCash par email. 
                Le paiement doit être effectué dans les 24h.
              </p>
            </div>
          )}

          {/* Notes Section */}
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des notes pour votre réservation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={loading || !paymentMethods.find(m => m.id === selectedMethod)?.available}
          className="min-w-[150px]"
        >
          {loading ? 'Confirmation...' : 'Confirmer la Réservation'}
        </Button>
      </div>
    </div>
  );
}