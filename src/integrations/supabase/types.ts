export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_lock: {
        Row: {
          admin_email: string | null
          admin_user_id: string | null
          claimed_at: string | null
          id: number
          updated_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_user_id?: string | null
          claimed_at?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_user_id?: string | null
          claimed_at?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          section: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          section: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          section?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          accent_color: string
          active: boolean
          body: string | null
          created_at: string
          cta_href: string | null
          cta_label: string | null
          id: string
          placement: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          active?: boolean
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          placement: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          active?: boolean
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          placement?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      perfumes: {
        Row: {
          base_notes: string[]
          best_season: string | null
          category_id: string | null
          created_at: string
          description: string | null
          family: string | null
          featured: boolean
          heart_notes: string[]
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          occasion: string | null
          price_pkr: number
          rating_compliment: number
          rating_longevity: number
          rating_projection: number
          rating_sillage: number
          rating_uniqueness: number
          rating_versatility: number
          slug: string
          sort_order: number
          spotlight_eligible: boolean
          tag_family: string | null
          tag_gender: string | null
          tag_intensity: string | null
          tag_mood: string | null
          tag_occasion: string | null
          tag_season: string | null
          tagline: string | null
          top_notes: string[]
          updated_at: string
        }
        Insert: {
          base_notes?: string[]
          best_season?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          family?: string | null
          featured?: boolean
          heart_notes?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          occasion?: string | null
          price_pkr?: number
          rating_compliment?: number
          rating_longevity?: number
          rating_projection?: number
          rating_sillage?: number
          rating_uniqueness?: number
          rating_versatility?: number
          slug: string
          sort_order?: number
          spotlight_eligible?: boolean
          tag_family?: string | null
          tag_gender?: string | null
          tag_intensity?: string | null
          tag_mood?: string | null
          tag_occasion?: string | null
          tag_season?: string | null
          tagline?: string | null
          top_notes?: string[]
          updated_at?: string
        }
        Update: {
          base_notes?: string[]
          best_season?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          family?: string | null
          featured?: boolean
          heart_notes?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          occasion?: string | null
          price_pkr?: number
          rating_compliment?: number
          rating_longevity?: number
          rating_projection?: number
          rating_sillage?: number
          rating_uniqueness?: number
          rating_versatility?: number
          slug?: string
          sort_order?: number
          spotlight_eligible?: boolean
          tag_family?: string | null
          tag_gender?: string | null
          tag_intensity?: string | null
          tag_mood?: string | null
          tag_occasion?: string | null
          tag_season?: string | null
          tagline?: string | null
          top_notes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfumes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved: boolean
          body: string
          created_at: string
          id: string
          name: string
          rating: number
          updated_at: string
        }
        Insert: {
          approved?: boolean
          body: string
          created_at?: string
          id?: string
          name: string
          rating: number
          updated_at?: string
        }
        Update: {
          approved?: boolean
          body?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          community_link: string | null
          id: number
          instagram_handle: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          community_link?: string | null
          id?: number
          instagram_handle?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          community_link?: string | null
          id?: number
          instagram_handle?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      spotlight: {
        Row: {
          description_override: string | null
          id: number
          perfume_id: string | null
          updated_at: string
        }
        Insert: {
          description_override?: string | null
          id?: number
          perfume_id?: string | null
          updated_at?: string
        }
        Update: {
          description_override?: string | null
          id?: number
          perfume_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin_lock: { Args: never; Returns: boolean }
      is_current_admin: { Args: never; Returns: boolean }
      release_admin_lock: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
