import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CompleteProfile() {
  const { user, profile, refetch, redirectToRoleBasedPortal, userRole } = useAuth() as any;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: (profile as any)?.address || "",
    date_of_birth: profile?.date_of_birth || "",
    emergency_contact: profile?.emergency_contact || "",
    medical_notes: profile?.medical_notes || "",
  });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: (profile as any)?.address || "",
      date_of_birth: profile?.date_of_birth || "",
      emergency_contact: profile?.emergency_contact || "",
      medical_notes: profile?.medical_notes || "",
    });
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(form)
        .eq("user_id", user.id);
      if (error) throw error;
      await refetch();
      toast({ title: "Profil complété", description: "Vos informations ont été sauvegardées." });
      const path = redirectToRoleBasedPortal(userRole || "student");
      window.location.replace(path);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container max-w-2xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Compléter votre profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom complet</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input type="date" value={form.date_of_birth || ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Contact d'urgence</Label>
              <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <div>
              <Label>Notes médicales</Label>
              <Input value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} />
            </div>
            <Button onClick={save} disabled={loading} className="w-full">{loading ? "Sauvegarde..." : "Sauvegarder et continuer"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
