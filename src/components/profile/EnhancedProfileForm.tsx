import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Plus, Trash2, User, Users, GraduationCap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Child {
  id?: string;
  name: string;
  age: number | string;
  swimming_level: string;
}

interface EnhancedProfileFormProps {
  onComplete?: () => void;
}

export const EnhancedProfileForm = ({ onComplete }: EnhancedProfileFormProps) => {
  const { user, profile, refetch, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [newChild, setNewChild] = useState<Child>({ name: "", age: "", swimming_level: "beginner" });
  
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    date_of_birth: profile?.date_of_birth || "",
    emergency_contact: profile?.emergency_contact || "",
    medical_notes: profile?.medical_notes || "",
    avatar_url: profile?.avatar_url || "",
    // Instructor-specific fields
    bio: "",
    specializations: [] as string[],
    certifications: [] as string[],
    experience_years: 0,
    hourly_rate: 0,
    availability: {},
  });

  const [newSpecialization, setNewSpecialization] = useState("");
  const [newCertification, setNewCertification] = useState("");

  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        date_of_birth: profile.date_of_birth || "",
        emergency_contact: profile.emergency_contact || "",
        medical_notes: profile.medical_notes || "",
        avatar_url: profile.avatar_url || "",
      }));
      
      if (userRole === 'parent') {
        fetchChildren();
      }
      
      if (userRole === 'instructor') {
        fetchInstructorData();
      }
    }
  }, [profile, userRole]);

  const fetchChildren = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", profile.id);
      
      if (error) throw error;
        const mappedChildren: Child[] = (data || []).map((child: any) => ({
          id: child.id,
          name: `${child.first_name} ${child.last_name}`,
          age: child.date_of_birth ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear() : 0,
          swimming_level: child.swimming_level || 'débutant',
          first_name: child.first_name,
          last_name: child.last_name,
          date_of_birth: child.date_of_birth,
          sex: child.sex,
          health_notes: child.health_notes
        }));
        setChildren(mappedChildren);
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

  const fetchInstructorData = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .eq("profile_id", profile.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setForm(prev => ({
          ...prev,
          bio: data.bio || "",
          specializations: data.specializations || [],
          certifications: data.certifications || [],
          experience_years: data.experience_years || 0,
          hourly_rate: data.hourly_rate || 0,
          availability: (data.availability as Record<string, any>) || {},
        }));
      }
    } catch (error) {
      console.error("Error fetching instructor data:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast({ title: "Avatar uploaded successfully!" });
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    }
  };

  const addChild = () => {
    if (!newChild.name || !newChild.age) {
      toast({ title: "Please fill all child details", variant: "destructive" });
      return;
    }
    setChildren([...children, { ...newChild, age: Number(newChild.age) }]);
    setNewChild({ name: "", age: "", swimming_level: "beginner" });
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const addSpecialization = () => {
    if (newSpecialization && !form.specializations.includes(newSpecialization)) {
      setForm(prev => ({ 
        ...prev, 
        specializations: [...prev.specializations, newSpecialization] 
      }));
      setNewSpecialization("");
    }
  };

  const addCertification = () => {
    if (newCertification && !form.certifications.includes(newCertification)) {
      setForm(prev => ({ 
        ...prev, 
        certifications: [...prev.certifications, newCertification] 
      }));
      setNewCertification("");
    }
  };

  const removeSpecialization = (spec: string) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const removeCertification = (cert: string) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  };

  const save = async () => {
    if (!user || !profile) return;

    const missing: string[] = [];
    if (!form.full_name) missing.push("Full Name");
    if (!form.phone) missing.push("Phone");
    if (!form.date_of_birth) missing.push("Date of Birth");
    
    if (missing.length > 0) {
      toast({ 
        title: "Required fields missing", 
        description: `Please complete: ${missing.join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          address: form.address,
          date_of_birth: form.date_of_birth,
          emergency_contact: form.emergency_contact,
          medical_notes: form.medical_notes,
          avatar_url: form.avatar_url,
        })
        .eq("user_id", user.id);
      
      if (profileError) throw profileError;

      // Handle role-specific data
      if (userRole === 'parent' && children.length > 0) {
        // Delete existing children
        await supabase
          .from("children")
          .delete()
          .eq("parent_id", profile.id);

        // Insert new children
        const childrenData = children.map(child => ({
          parent_id: profile.id,
          first_name: child.name.split(' ')[0] || child.name,
          last_name: child.name.split(' ').slice(1).join(' ') || '',
          date_of_birth: new Date(new Date().getFullYear() - Number(child.age), 0, 1).toISOString().split('T')[0],
          sex: 'Non spécifié',
          health_notes: ''
        }));

        const { error: childrenError } = await supabase
          .from("children")
          .insert(childrenData);

        if (childrenError) throw childrenError;
      }

      if (userRole === 'instructor') {
        const instructorData = {
          profile_id: profile.id,
          bio: form.bio,
          specializations: form.specializations,
          certifications: form.certifications,
          experience_years: form.experience_years,
          hourly_rate: form.hourly_rate,
          availability: form.availability,
        };

        const { error: instructorError } = await supabase
          .from("instructors")
          .upsert(instructorData, { onConflict: 'profile_id' });

        if (instructorError) throw instructorError;
      }

      await refetch();
      toast({ title: "Profile updated successfully!" });
      onComplete?.();
    } catch (error: any) {
      toast({ 
        title: "Error updating profile", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin': return <Shield className="h-5 w-5" />;
      case 'instructor': return <GraduationCap className="h-5 w-5" />;
      case 'parent': return <Users className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getRoleTitle = () => {
    switch (userRole) {
      case 'admin': return 'Admin Profile';
      case 'instructor': return 'Instructor Profile';
      case 'parent': return 'Parent Profile';
      default: return 'Student Profile';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getRoleIcon()}
            {getRoleTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.avatar_url} />
              <AvatarFallback className="text-lg">
                {form.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-2" />Upload Photo</span>
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </Label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
              />
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input 
                type="date" 
                value={form.date_of_birth || ""} 
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} 
              />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input 
                value={form.emergency_contact} 
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} 
              />
            </div>
            <div>
              <Label>Medical Notes</Label>
              <Input 
                value={form.medical_notes} 
                onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} 
              />
            </div>
          </div>

          {/* Parent-specific: Children Management */}
          {userRole === 'parent' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Children</h3>
              
              {/* Existing Children */}
              {children.map((child, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded">
                  <span className="flex-1">{child.name} (Age: {child.age}, Level: {child.swimming_level})</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeChild(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add New Child */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Child's name"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Age"
                  value={newChild.age}
                  onChange={(e) => setNewChild({ ...newChild, age: e.target.value })}
                />
                <Select
                  value={newChild.swimming_level}
                  onValueChange={(value) => setNewChild({ ...newChild, swimming_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addChild}>
                  <Plus className="h-4 w-4 mr-2" />Add
                </Button>
              </div>
            </div>
          )}

          {/* Instructor-specific fields */}
          {userRole === 'instructor' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell us about your experience and teaching philosophy..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Experience (Years)</Label>
                  <Input
                    type="number"
                    value={form.experience_years}
                    onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Specializations */}
              <div>
                <Label>Specializations</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.specializations.map((spec) => (
                    <Badge key={spec} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialization(spec)}>
                      {spec} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add specialization"
                    value={newSpecialization}
                    onChange={(e) => setNewSpecialization(e.target.value)}
                  />
                  <Button onClick={addSpecialization}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <Label>Certifications</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.certifications.map((cert) => (
                    <Badge key={cert} variant="outline" className="cursor-pointer" onClick={() => removeCertification(cert)}>
                      {cert} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add certification"
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                  />
                  <Button onClick={addCertification}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
