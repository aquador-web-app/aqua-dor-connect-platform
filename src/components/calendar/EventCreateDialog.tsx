import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  Repeat, 
  Bell,
  MapPin,
  Users,
  Type,
  FileText
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AlertReminder {
  id: string;
  type: 'minutes' | 'hours' | 'days' | 'weeks';
  value: number;
  method: 'notification' | 'email' | 'both';
}

interface RecurrenceRule {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  monthlyPattern?: 'date' | 'weekday'; // by date (15th) or by pattern (3rd Tuesday)
  endType: 'never' | 'count' | 'date';
  endCount?: number;
  endDate?: Date;
  customDays?: number[];
}

interface EventFormData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  type: 'class' | 'event' | 'reservation';
  level?: string;
  maxParticipants?: number;
  color: string;
  alerts: AlertReminder[];
  recurrence: RecurrenceRule;
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (eventData: EventFormData) => Promise<void>;
  selectedDate?: Date;
  isEditing?: boolean;
  existingEvent?: Partial<EventFormData>;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const ALERT_PRESETS = [
  { label: 'À l\'heure', type: 'minutes' as const, value: 0 },
  { label: '5 minutes avant', type: 'minutes' as const, value: 5 },
  { label: '15 minutes avant', type: 'minutes' as const, value: 15 },
  { label: '30 minutes avant', type: 'minutes' as const, value: 30 },
  { label: '1 heure avant', type: 'hours' as const, value: 1 },
  { label: '2 heures avant', type: 'hours' as const, value: 2 },
  { label: '1 jour avant', type: 'days' as const, value: 1 },
  { label: '1 semaine avant', type: 'weeks' as const, value: 1 },
];

export function EventCreateDialog({
  open,
  onOpenChange,
  onSave,
  selectedDate,
  isEditing = false,
  existingEvent
}: EventCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: selectedDate || new Date(),
    endDate: selectedDate || new Date(),
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    location: '',
    type: 'event',
    level: '',
    maxParticipants: undefined,
    color: DEFAULT_COLORS[0],
    alerts: [],
    recurrence: {
      frequency: 'none',
      interval: 1,
      endType: 'never'
    }
  });

  useEffect(() => {
    if (open) {
      if (isEditing && existingEvent) {
        setFormData(prev => ({ ...prev, ...existingEvent }));
      } else if (selectedDate) {
        setFormData(prev => ({
          ...prev,
          startDate: selectedDate,
          endDate: selectedDate
        }));
      }
    }
  }, [open, selectedDate, isEditing, existingEvent]);

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addAlert = () => {
    const newAlert: AlertReminder = {
      id: crypto.randomUUID(),
      type: 'minutes',
      value: 15,
      method: 'notification'
    };
    updateFormData({
      alerts: [...formData.alerts, newAlert]
    });
  };

  const updateAlert = (id: string, updates: Partial<AlertReminder>) => {
    updateFormData({
      alerts: formData.alerts.map(alert => 
        alert.id === id ? { ...alert, ...updates } : alert
      )
    });
  };

  const removeAlert = (id: string) => {
    updateFormData({
      alerts: formData.alerts.filter(alert => alert.id !== id)
    });
  };

  const addAlertPreset = (preset: typeof ALERT_PRESETS[0]) => {
    const exists = formData.alerts.some(alert => 
      alert.type === preset.type && alert.value === preset.value
    );
    
    if (!exists) {
      const newAlert: AlertReminder = {
        id: crypto.randomUUID(),
        type: preset.type,
        value: preset.value,
        method: 'notification'
      };
      updateFormData({
        alerts: [...formData.alerts, newAlert]
      });
    }
  };

  const updateRecurrence = (updates: Partial<RecurrenceRule>) => {
    updateFormData({
      recurrence: { ...formData.recurrence, ...updates }
    });
  };

  const toggleDayOfWeek = (day: number) => {
    const currentDays = formData.recurrence.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    updateRecurrence({ daysOfWeek: newDays });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        isAllDay: false,
        location: '',
        type: 'event',
        level: '',
        maxParticipants: undefined,
        color: DEFAULT_COLORS[0],
        alerts: [],
        recurrence: {
          frequency: 'none',
          interval: 1,
          endType: 'never'
        }
      });
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="flex items-center space-x-2">
            <Type className="h-4 w-4" />
            <span>Titre *</span>
          </Label>
          <Input
            id="title"
            placeholder="Titre de l'événement"
            value={formData.title}
            onChange={(e) => updateFormData({ title: e.target.value })}
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Description</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Description de l'événement (optionnel)"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type d'événement</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: any) => updateFormData({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">Cours</SelectItem>
                <SelectItem value="event">Événement</SelectItem>
                <SelectItem value="reservation">Réservation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'class' && (
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select 
                value={formData.level || ''} 
                onValueChange={(value) => updateFormData({ level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Lieu</span>
          </Label>
          <Input
            id="location"
            placeholder="Lieu de l'événement"
            value={formData.location}
            onChange={(e) => updateFormData({ location: e.target.value })}
          />
        </div>

        {(formData.type === 'class' || formData.type === 'event') && (
          <div className="space-y-2">
            <Label htmlFor="maxParticipants" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Nombre max de participants</span>
            </Label>
            <Input
              id="maxParticipants"
              type="number"
              min="1"
              max="100"
              value={formData.maxParticipants || ''}
              onChange={(e) => updateFormData({ 
                maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
              })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Couleur</Label>
          <div className="flex space-x-2">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  formData.color === color ? "border-foreground scale-110" : "border-muted"
                )}
                style={{ backgroundColor: color }}
                onClick={() => updateFormData({ color })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDateTimeTab = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="allDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => updateFormData({ isAllDay: checked })}
        />
        <Label htmlFor="allDay">Événement toute la journée</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.startDate, 'PPP', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate}
                onSelect={(date) => date && updateFormData({ startDate: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date de fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.endDate, 'PPP', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.endDate}
                onSelect={(date) => date && updateFormData({ endDate: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!formData.isAllDay && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Heure de début</span>
            </Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => updateFormData({ startTime: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Heure de fin</span>
            </Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => updateFormData({ endTime: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Rappels et notifications</span>
          </Label>
          <Button size="sm" onClick={addAlert}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Rappels prédéfinis</Label>
          <div className="flex flex-wrap gap-2">
            {ALERT_PRESETS.map((preset, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => addAlertPreset(preset)}
              >
                {preset.label}
              </Badge>
            ))}
          </div>
        </div>

        {formData.alerts.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Rappels configurés</Label>
            {formData.alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <Input
                        type="number"
                        min="0"
                        value={alert.value}
                        onChange={(e) => updateAlert(alert.id, { value: parseInt(e.target.value) || 0 })}
                      />
                      
                      <Select
                        value={alert.type}
                        onValueChange={(value: any) => updateAlert(alert.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Heures</SelectItem>
                          <SelectItem value="days">Jours</SelectItem>
                          <SelectItem value="weeks">Semaines</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={alert.method}
                        onValueChange={(value: any) => updateAlert(alert.id, { method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="both">Les deux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecurrenceTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="flex items-center space-x-2">
          <Repeat className="h-4 w-4" />
          <span>Récurrence et répétition</span>
        </Label>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select
              value={formData.recurrence.frequency}
              onValueChange={(value: any) => updateRecurrence({ frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune répétition</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="yearly">Annuel</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.recurrence.frequency !== 'none' && (
            <>
              <div className="space-y-2">
                <Label>Intervalle</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Tous les</span>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.recurrence.interval}
                    onChange={(e) => updateRecurrence({ interval: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <span className="text-sm">
                    {formData.recurrence.frequency === 'daily' && 'jour(s)'}
                    {formData.recurrence.frequency === 'weekly' && 'semaine(s)'}
                    {formData.recurrence.frequency === 'monthly' && 'mois'}
                    {formData.recurrence.frequency === 'yearly' && 'année(s)'}
                    {formData.recurrence.frequency === 'custom' && 'jour(s)'}
                  </span>
                </div>
              </div>

              {(formData.recurrence.frequency === 'weekly' || formData.recurrence.frequency === 'custom') && (
                <div className="space-y-2">
                  <Label>Jours de la semaine</Label>
                  <div className="flex space-x-1">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => {
                      const dayNumber = index === 6 ? 0 : index + 1; // Convert to Sunday=0 format
                      const isSelected = formData.recurrence.daysOfWeek?.includes(dayNumber) || false;
                      
                      return (
                        <Button
                          key={index}
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className="w-10 h-10 p-0"
                          onClick={() => toggleDayOfWeek(dayNumber)}
                        >
                          {day}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.recurrence.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Répétition mensuelle</Label>
                  <Select
                    value={formData.recurrence.monthlyPattern || 'date'}
                    onValueChange={(value: any) => updateRecurrence({ monthlyPattern: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">
                        Le {format(formData.startDate, 'd')} de chaque mois
                      </SelectItem>
                      <SelectItem value="weekday">
                        Le {format(formData.startDate, 'E', { locale: fr })} de chaque mois
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Fin de récurrence</Label>
                <Select
                  value={formData.recurrence.endType}
                  onValueChange={(value: any) => updateRecurrence({ endType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Jamais</SelectItem>
                    <SelectItem value="count">Après X occurrences</SelectItem>
                    <SelectItem value="date">À une date précise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence.endType === 'count' && (
                <div className="space-y-2">
                  <Label>Nombre d'occurrences</Label>
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.recurrence.endCount || 10}
                    onChange={(e) => updateRecurrence({ endCount: parseInt(e.target.value) || 10 })}
                  />
                </div>
              )}

              {formData.recurrence.endType === 'date' && (
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurrence.endDate ? 
                          format(formData.recurrence.endDate, 'PPP', { locale: fr }) : 
                          'Sélectionner une date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.recurrence.endDate}
                        onSelect={(date) => updateRecurrence({ endDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="datetime">Date & Heure</TabsTrigger>
            <TabsTrigger value="alerts">Rappels</TabsTrigger>
            <TabsTrigger value="recurrence">Récurrence</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            {renderDetailsTab()}
          </TabsContent>

          <TabsContent value="datetime" className="mt-6">
            {renderDateTimeTab()}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            {renderAlertsTab()}
          </TabsContent>

          <TabsContent value="recurrence" className="mt-6">
            {renderRecurrenceTab()}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim()}
          >
            {loading ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Créer')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}