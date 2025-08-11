export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          class_session_id: string | null
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          class_session_id?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          class_session_id?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          class_session_id: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_date?: string
          class_session_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_date?: string
          class_session_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number | null
          created_at: string
          id: string
          name: string
          parent_id: string
          swimming_level: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          id?: string
          name: string
          parent_id: string
          swimming_level?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string
          swimming_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_children_parent_profile"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          instructor_id: string
          max_participants: number
          notes: string | null
          session_date: string
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instructor_id: string
          max_participants?: number
          notes?: string | null
          session_date: string
          status?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instructor_id?: string
          max_participants?: number
          notes?: string | null
          session_date?: string
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          instructor_id: string | null
          is_active: boolean | null
          level: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          level: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          level?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          media_url: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          media_url?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          media_url?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          template_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          template_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          enrollment_date: string
          id: string
          notes: string | null
          payment_status: string | null
          progress_level: number | null
          status: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          enrollment_date?: string
          id?: string
          notes?: string | null
          payment_status?: string | null
          progress_level?: number | null
          status?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          enrollment_date?: string
          id?: string
          notes?: string | null
          payment_status?: string | null
          progress_level?: number | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          media_type: string
          media_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      instructors: {
        Row: {
          availability: Json | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          profile_id: string
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          profile_id: string
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          profile_id?: string
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string
          data: Json
          email: string
          id: string
          notification_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          data?: Json
          email: string
          id?: string
          notification_type: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          data?: Json
          email?: string
          id?: string
          notification_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parent_child_relationships: {
        Row: {
          child_id: string | null
          created_at: string
          id: string
          parent_id: string | null
          relationship_type: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          relationship_type?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_relationships_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          enrollment_id: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          barcode: string | null
          barcode_generated_at: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_contact: string | null
          full_name: string | null
          id: string
          medical_notes: string | null
          phone: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          barcode?: string | null
          barcode_generated_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          medical_notes?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          barcode?: string | null
          barcode_generated_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          medical_notes?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          purpose: string | null
          reservation_date: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          purpose?: string | null
          reservation_date: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          purpose?: string | null
          reservation_date?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          class_session_id: string | null
          comment: string | null
          created_at: string
          id: string
          instructor_id: string | null
          rating: number
          student_id: string | null
          updated_at: string
        }
        Insert: {
          class_session_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          rating: number
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          class_session_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          rating?: number
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_barcode: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_secure_password: {
        Args: { length?: number }
        Returns: string
      }
      get_public_instructors: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          bio: string
          specializations: string[]
          certifications: string[]
          experience_years: number
          avatar_url: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid?: string }
        Returns: string
      }
      has_role: {
        Args: { user_uuid: string; role_name: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action: string
          p_resource_type: string
          p_resource_id?: string
          p_old_values?: Json
          p_new_values?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "co_admin" | "instructor" | "student" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "co_admin", "instructor", "student", "parent"],
    },
  },
} as const
