export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          candidate_id: string | null;
          created_at: string | null;
          id: string;
          message: string | null;
          role_id: string | null;
          status: string | null;
        };
        Insert: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          message?: string | null;
          role_id?: string | null;
          status?: string | null;
        };
        Update: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          message?: string | null;
          role_id?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "project_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      connections: {
        Row: {
          created_at: string | null;
          id: string;
          receiver_id: string;
          requester_id: string;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          receiver_id: string;
          requester_id: string;
          status?: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          receiver_id?: string;
          requester_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connections_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connections_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scenes: {
        Row: {
          id: string;
          tournage_id: string;
          shoot_day_id: string | null;
          scene_number: string;
          slugline: string | null;
          int_ext: "INT" | "EXT" | "INT/EXT" | null;
          day_night: "DAY" | "NIGHT" | "DAWN" | "DUSK" | null;
          description: string | null;
          script_pages: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tournage_id: string;
          shoot_day_id?: string | null;
          scene_number: string;
          slugline?: string | null;
          int_ext?: "INT" | "EXT" | "INT/EXT" | null;
          day_night?: "DAY" | "NIGHT" | "DAWN" | "DUSK" | null;
          description?: string | null;
          script_pages?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tournage_id?: string;
          shoot_day_id?: string | null;
          scene_number?: string;
          slugline?: string | null;
          int_ext?: "INT" | "EXT" | "INT/EXT" | null;
          day_night?: "DAY" | "NIGHT" | "DAWN" | "DUSK" | null;
          description?: string | null;
          script_pages?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_tournage_id_fkey";
            columns: ["tournage_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenes_shoot_day_id_fkey";
            columns: ["shoot_day_id"];
            isOneToOne: false;
            referencedRelation: "shoot_days";
            referencedColumns: ["id"];
          },
        ];
      };
      shoot_days: {
        Row: {
          id: string;
          tournage_id: string;
          date: string;
          call_time: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tournage_id: string;
          date: string;
          call_time?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tournage_id?: string;
          date?: string;
          call_time?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shoot_days_tournage_id_fkey";
            columns: ["tournage_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          content: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          project_id: string | null;
          user_id: string;
          visibility: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          project_id?: string | null;
          user_id: string;
          visibility?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          project_id?: string | null;
          user_id?: string;
          visibility?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          book_urls: string[] | null;
          cv_url: string | null;
          email: string | null;
          email_public: string | null;
          equipment: string | null;
          eye_color: string | null;
          full_name: string | null;
          hair_color: string | null;
          height: number | null;
          id: string;
          pays: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          showreel_url: string | null;
          skills: string[] | null;
          software: string | null;
          specialties: string | null;
          updated_at: string | null;
          username: string | null;
          ville: string | null;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          book_urls?: string[] | null;
          cv_url?: string | null;
          email?: string | null;
          email_public?: string | null;
          equipment?: string | null;
          eye_color?: string | null;
          full_name?: string | null;
          hair_color?: string | null;
          height?: number | null;
          id: string;
          pays?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          showreel_url?: string | null;
          skills?: string[] | null;
          software?: string | null;
          specialties?: string | null;
          updated_at?: string | null;
          username?: string | null;
          ville?: string | null;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          book_urls?: string[] | null;
          cv_url?: string | null;
          email?: string | null;
          email_public?: string | null;
          equipment?: string | null;
          eye_color?: string | null;
          full_name?: string | null;
          hair_color?: string | null;
          height?: number | null;
          id?: string;
          pays?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          showreel_url?: string | null;
          skills?: string[] | null;
          software?: string | null;
          specialties?: string | null;
          updated_at?: string | null;
          username?: string | null;
          ville?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      project_files: {
        Row: {
          category: string;
          created_at: string;
          file_path: string;
          file_type: string | null;
          id: string;
          name: string;
          project_id: string;
          size: number | null;
          uploader_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          file_path: string;
          file_type?: string | null;
          id?: string;
          name: string;
          project_id: string;
          size?: number | null;
          uploader_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          file_path?: string;
          file_type?: string | null;
          id?: string;
          name?: string;
          project_id?: string;
          size?: number | null;
          uploader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_files_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_events: {
        Row: {
          created_at: string;
          description: string | null;
          end_time: string | null;
          event_type: string | null;
          id: string;
          location: string | null;
          start_time: string;
          target_categories: string[] | null;
          target_role_id: string | null;
          target_role_ids: string[] | null;
          title: string;
          tournage_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          event_type?: string | null;
          id?: string;
          location?: string | null;
          start_time: string;
          target_categories?: string[] | null;
          target_role_id?: string | null;
          target_role_ids?: string[] | null;
          title: string;
          tournage_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          event_type?: string | null;
          id?: string;
          location?: string | null;
          start_time?: string;
          target_categories?: string[] | null;
          target_role_id?: string | null;
          target_role_ids?: string[] | null;
          title?: string;
          tournage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_events_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "project_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_events_tournage_id_fkey";
            columns: ["tournage_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
        ];
      };
      project_inventory: {
        Row: {
          assigned_to: string | null;
          created_at: string | null;
          id: string;
          item_name: string;
          project_id: string | null;
          quantity: number | null;
          status: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string | null;
          id?: string;
          item_name: string;
          project_id?: string | null;
          quantity?: number | null;
          status?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string | null;
          id?: string;
          item_name?: string;
          project_id?: string | null;
          quantity?: number | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_inventory_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_inventory_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
        ];
      };
      project_budget: {
        Row: {
          actual_cost: number | null;
          category: string | null;
          created_at: string | null;
          estimated_cost: number | null;
          id: string;
          item_name: string;
          project_id: string | null;
        };
        Insert: {
          actual_cost?: number | null;
          category?: string | null;
          created_at?: string | null;
          estimated_cost?: number | null;
          id?: string;
          item_name: string;
          project_id?: string | null;
        };
        Update: {
          actual_cost?: number | null;
          category?: string | null;
          created_at?: string | null;
          estimated_cost?: number | null;
          id?: string;
          item_name?: string;
          project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_budget_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
        ];
      };
      project_likes: {
        Row: {
          created_at: string | null;
          project_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          project_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_likes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_messages: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          id: string;
          project_id: string;
          sender_id: string;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string;
          id?: string;
          project_id: string;
          sender_id: string;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_roles: {
        Row: {
          age_max: number | null;
          age_min: number | null;
          assigned_profile_id: string | null;
          category: Database["public"]["Enums"]["user_role"];
          created_at: string;
          description: string | null;
          equipment: string | null;
          experience_level: string | null;
          gender: string | null;
          id: string;
          is_category_admin: boolean | null;
          quantity_filled: number | null;
          software: string | null;
          specialties: string | null;
          status: string | null;
          title: string;
          tournage_id: string;
        };
        Insert: {
          age_max?: number | null;
          age_min?: number | null;
          assigned_profile_id?: string | null;
          category: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          description?: string | null;
          equipment?: string | null;
          experience_level?: string | null;
          gender?: string | null;
          id?: string;
          is_category_admin?: boolean | null;
          quantity_filled?: number | null;
          software?: string | null;
          specialties?: string | null;
          status?: string | null;
          title: string;
          tournage_id: string;
        };
        Update: {
          age_max?: number | null;
          age_min?: number | null;
          assigned_profile_id?: string | null;
          category?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          description?: string | null;
          equipment?: string | null;
          experience_level?: string | null;
          gender?: string | null;
          id?: string;
          is_category_admin?: boolean | null;
          quantity_filled?: number | null;
          software?: string | null;
          specialties?: string | null;
          status?: string | null;
          title?: string;
          tournage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_roles_assigned_profile_id_fkey";
            columns: ["assigned_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_roles_tournage_id_fkey";
            columns: ["tournage_id"];
            isOneToOne: false;
            referencedRelation: "tournages";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profile_settings: {
        Row: {
          created_at: string;
          hidden_project_ids: string[] | null;
          id: string;
          is_contact_visible: boolean | null;
        };
        Insert: {
          created_at?: string;
          hidden_project_ids?: string[] | null;
          id: string;
          is_contact_visible?: boolean | null;
        };
        Update: {
          created_at?: string;
          hidden_project_ids?: string[] | null;
          id?: string;
          is_contact_visible?: boolean | null;
        };
        Relationships: [];
      };
      tournages: {
        Row: {
          address: string | null;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          image_url: string | null;
          is_paid: boolean | null;
          is_public: boolean | null;
          latitude: number | null;
          longitude: number | null;
          owner_id: string;
          pays: string | null;
          start_date: string | null;
          title: string;
          type: Database["public"]["Enums"]["project_type"] | null;
          ville: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          is_paid?: boolean | null;
          is_public?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          owner_id: string;
          pays?: string | null;
          start_date?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["project_type"] | null;
          ville?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          is_paid?: boolean | null;
          is_public?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          owner_id?: string;
          pays?: string | null;
          start_date?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["project_type"] | null;
          ville?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      project_type:
        | "long_metrage"
        | "court_metrage"
        | "publicite"
        | "clip"
        | "documentaire"
        | "serie"
        | "etudiant";
      user_role:
        | "acteur"
        | "realisateur"
        | "agent"
        | "technicien"
        | "production"
        | "image"
        | "son"
        | "hmc"
        | "deco"
        | "post_prod";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      project_type: [
        "long_metrage",
        "court_metrage",
        "publicite",
        "clip",
        "documentaire",
        "serie",
        "etudiant",
      ],
      user_role: [
        "acteur",
        "realisateur",
        "agent",
        "technicien",
        "production",
        "image",
        "son",
        "hmc",
        "deco",
        "post_prod",
      ],
    },
  },
} as const;
