import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Euro, Users, MapPin, Phone } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSubmit: (reservationData: ReservationData) => void;
}

export interface ReservationData {
  type: 'pool_rental' | 'private_lesson' | 'event_booking';
  date: Date;
  startTime: string;
  duration: number;
  participants: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes?: string;
  price: number;
}

const RESERVATION_TYPES = {
  pool_rental: {
    name: "Location de piscine",
    description: "Location privée de la piscine pour votre groupe",
    basePrice: 80,
    pricePerHour: 25,
    maxParticipants: 20,
    minDuration: 2,
    maxDuration: 4,
    availableHours: ["10:00", "14:00", "16:00", "18:00", "20:00"]
  },
  private_lesson: {
    name: "Cours privé",
    description: "Cours de natation personnalisé avec un instructeur",
    basePrice: 45,
    pricePerHour: 35,
    maxParticipants: 4,
    minDuration: 1,
    maxDuration: 2,
    availableHours: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
  },
  event_booking: {
    name: "Événement spécial",
    description: "Anniversaire, fête ou événement spécial",
    basePrice: 120,
    pricePerHour: 40,
    maxParticipants: 30,
    minDuration: 3,
    maxDuration: 6,
    availableHours: ["14:00", "16:00", "18:00"]
  }
};

export function ReservationForm({ isOpen, onClose, selectedDate, onSubmit }: ReservationFormProps) {
  const [formData, setFormData] = useState<Partial<ReservationData>>({
    type: 'pool_rental',
    date: selectedDate,
    startTime: '',
    duration: 2,
    participants: 1,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    price: 0
  });

  const selectedType = formData.type ? RESERVATION_TYPES[formData.type] : RESERVATION_TYPES.pool_rental;

  const calculatePrice = () => {
    if (!formData.duration) return selectedType.basePrice;
    const additionalHours = Math.max(0, formData.duration - selectedType.minDuration);
    return selectedType.basePrice + (additionalHours * selectedType.pricePerHour);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.startTime || !formData.contactName || !formData.contactPhone) {
      return;
    }

    const price = calculatePrice();
    
    onSubmit({
      ...formData,
      date: selectedDate,
      price
    } as ReservationData);
    
    onClose();
  };

  const handleTypeChange = (type: string) => {
    const newType = type as 'pool_rental' | 'private_lesson' | 'event_booking';
    const typeConfig = RESERVATION_TYPES[newType];
    
    setFormData({
      ...formData,
      type: newType,
      duration: typeConfig.minDuration,
      participants: 1,
      startTime: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Nouvelle réservation - {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reservation Type Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Type de réservation</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={handleTypeChange}
              className="space-y-3"
            >
              {Object.entries(RESERVATION_TYPES).map(([key, config]) => (
                <Card key={key} className={`cursor-pointer transition-all ${formData.type === key ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={key} id={key} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={key} className="font-medium cursor-pointer">
                            {config.name}
                          </Label>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            À partir de {config.basePrice}€
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Max {config.maxParticipants} pers.
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {config.minDuration}-{config.maxDuration}h
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début</Label>
              <Select value={formData.startTime} onValueChange={(value) => setFormData({...formData, startTime: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'heure" />
                </SelectTrigger>
                <SelectContent>
                  {selectedType.availableHours.map((hour) => (
                    <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée (heures)</Label>
              <Select 
                value={formData.duration?.toString()} 
                onValueChange={(value) => setFormData({...formData, duration: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: selectedType.maxDuration - selectedType.minDuration + 1 }, (_, i) => {
                    const duration = selectedType.minDuration + i;
                    return (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} heure{duration > 1 ? 's' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label htmlFor="participants">Nombre de participants</Label>
            <Input
              id="participants"
              type="number"
              min={1}
              max={selectedType.maxParticipants}
              value={formData.participants}
              onChange={(e) => setFormData({...formData, participants: parseInt(e.target.value)})}
            />
            <p className="text-xs text-muted-foreground">
              Maximum {selectedType.maxParticipants} participants pour ce type de réservation
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Informations de contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nom complet *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Téléphone *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes supplémentaires</Label>
            <Textarea
              id="notes"
              placeholder="Informations spéciales, besoins particuliers..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          {/* Price Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Récapitulatif des prix
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Prix de base ({selectedType.minDuration}h)</span>
                  <span>{selectedType.basePrice}€</span>
                </div>
                {formData.duration && formData.duration > selectedType.minDuration && (
                  <div className="flex justify-between">
                    <span>Heures supplémentaires ({formData.duration - selectedType.minDuration}h)</span>
                    <span>{(formData.duration - selectedType.minDuration) * selectedType.pricePerHour}€</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span className="text-primary">{calculatePrice()}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.contactName || !formData.contactPhone || !formData.startTime}
            >
              Confirmer la réservation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}