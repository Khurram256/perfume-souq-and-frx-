export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_user_id: string;
          created_at: string;
          details: Json;
          id: string;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_user_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_user_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
        };
        Relationships: [];
      };
      admin_lock: {
        Row: {
          admin_email: string | null;
          admin_user_id: string | null;
          claimed_at: string | null;
          id: number;
          updated_at: string;
        };
        Insert: {
          admin_email?: string | null;
          admin_user_id?: string | null;
          claimed_at?: string | null;
          id?: number;
          updated_at?: string;
        };
        Update: {
          admin_email?: string | null;
          admin_user_id?: string | null;
          claimed_at?: string | null;
          id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          email: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          bundle_id: string | null;
          created_at: string;
          event_type: string;
          id: number;
          metadata: Json;
          perfume_id: string | null;
          promotion_id: string | null;
          session_id: string;
          source_path: string | null;
          variant_id: string | null;
        };
        Insert: {
          bundle_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: number;
          metadata?: Json;
          perfume_id?: string | null;
          promotion_id?: string | null;
          session_id: string;
          source_path?: string | null;
          variant_id?: string | null;
        };
        Update: {
          bundle_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: number;
          metadata?: Json;
          perfume_id?: string | null;
          promotion_id?: string | null;
          session_id?: string;
          source_path?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_perfume_id_fkey";
            columns: ["perfume_id"];
            isOneToOne: false;
            referencedRelation: "perfumes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      back_in_stock_requests: {
        Row: {
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          perfume_id: string;
          status: string;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          perfume_id: string;
          status?: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          perfume_id?: string;
          status?: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "back_in_stock_requests_perfume_id_fkey";
            columns: ["perfume_id"];
            isOneToOne: false;
            referencedRelation: "perfumes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "back_in_stock_requests_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          created_at: string;
          hero_image_url: string | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          meta_description: string | null;
          meta_title: string | null;
          name: string;
          origin_country: string | null;
          slug: string;
          sort_order: number;
          story: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          hero_image_url?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          name: string;
          origin_country?: string | null;
          slug: string;
          sort_order?: number;
          story?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hero_image_url?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          name?: string;
          origin_country?: string | null;
          slug?: string;
          sort_order?: number;
          story?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bundles: {
        Row: {
          active: boolean;
          bundle_price_pkr: number;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          name: string;
          starts_at: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          bundle_price_pkr: number;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          starts_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          bundle_price_pkr?: number;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          starts_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bundle_items: {
        Row: {
          bundle_id: string;
          id: string;
          quantity: number;
          variant_id: string;
        };
        Insert: {
          bundle_id: string;
          id?: string;
          quantity?: number;
          variant_id: string;
        };
        Update: {
          bundle_id?: string;
          id?: string;
          quantity?: number;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          active: boolean;
          alt_text: string | null;
          caption: string | null;
          created_at: string;
          id: string;
          kind: string;
          link_url: string | null;
          section: string;
          sort_order: number;
          updated_at: string;
          url: string;
        };
        Insert: {
          active?: boolean;
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          link_url?: string | null;
          section: string;
          sort_order?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          active?: boolean;
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link_url?: string | null;
          section?: string;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          accent_color: string;
          active: boolean;
          body: string | null;
          created_at: string;
          cta_href: string | null;
          cta_label: string | null;
          id: string;
          placement: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          active?: boolean;
          body?: string | null;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          id?: string;
          placement: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          active?: boolean;
          body?: string | null;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          id?: string;
          placement?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      advertisements: {
        Row: {
          active: boolean;
          body: string | null;
          created_at: string;
          cta_href: string | null;
          cta_label: string | null;
          ends_at: string | null;
          id: string;
          media_type: string;
          media_url: string | null;
          placement: string;
          sort_order: number;
          starts_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          body?: string | null;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          id?: string;
          media_type?: string;
          media_url?: string | null;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          body?: string | null;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          id?: string;
          media_type?: string;
          media_url?: string | null;
          placement?: string;
          sort_order?: number;
          starts_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_intents: {
        Row: {
          created_at: string;
          customer_name: string | null;
          customer_phone: string;
          delivery_address: string | null;
          discount_pkr: number;
          id: string;
          items: Json;
          location_link: string | null;
          note: string | null;
          offer_ids: string[];
          order_ref: string;
          session_id: string | null;
          status: string;
          subtotal_pkr: number;
          total_pkr: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_name?: string | null;
          customer_phone: string;
          delivery_address?: string | null;
          discount_pkr?: number;
          id?: string;
          items?: Json;
          location_link?: string | null;
          note?: string | null;
          offer_ids?: string[];
          order_ref: string;
          session_id?: string | null;
          status?: string;
          subtotal_pkr?: number;
          total_pkr?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_name?: string | null;
          customer_phone?: string;
          delivery_address?: string | null;
          discount_pkr?: number;
          id?: string;
          items?: Json;
          location_link?: string | null;
          note?: string | null;
          offer_ids?: string[];
          order_ref?: string;
          session_id?: string | null;
          status?: string;
          subtotal_pkr?: number;
          total_pkr?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      perfumes: {
        Row: {
          archived: boolean;
          archived_at: string | null;
          base_notes: string[];
          best_season: string | null;
          brand_id: string | null;
          category_id: string | null;
          concentration: string | null;
          created_at: string;
          description: string | null;
          family: string | null;
          featured: boolean;
          gender: string | null;
          heart_notes: string[];
          id: string;
          image_url: string | null;
          image_status: string;
          image_storage_path: string | null;
          in_stock: boolean;
          main_accords: string[];
          meta_description: string | null;
          meta_title: string | null;
          name: string;
          needs_confirmation: boolean;
          new_arrival: boolean;
          occasion: string | null;
          og_image_url: string | null;
          price_pkr: number;
          rating_compliment: number;
          rating_freshness: number;
          rating_longevity: number;
          rating_projection: number;
          rating_sillage: number;
          rating_sweetness: number;
          rating_uniqueness: number;
          rating_versatility: number;
          rating_warmth: number;
          sale_price_pkr: number | null;
          sku: string | null;
          slug: string;
          sort_order: number;
          source_notes: string | null;
          spotlight_eligible: boolean;
          status: string;
          stock_quantity: number | null;
          tag_family: string | null;
          tag_gender: string | null;
          tag_intensity: string | null;
          tag_mood: string | null;
          tag_occasion: string | null;
          tag_season: string | null;
          tagline: string | null;
          top_notes: string[];
          updated_at: string;
        };
        Insert: {
          archived?: boolean;
          archived_at?: string | null;
          base_notes?: string[];
          best_season?: string | null;
          brand_id?: string | null;
          category_id?: string | null;
          concentration?: string | null;
          created_at?: string;
          description?: string | null;
          family?: string | null;
          featured?: boolean;
          gender?: string | null;
          heart_notes?: string[];
          id?: string;
          image_url?: string | null;
          image_status?: string;
          image_storage_path?: string | null;
          in_stock?: boolean;
          main_accords?: string[];
          meta_description?: string | null;
          meta_title?: string | null;
          name: string;
          needs_confirmation?: boolean;
          new_arrival?: boolean;
          occasion?: string | null;
          og_image_url?: string | null;
          price_pkr?: number;
          rating_compliment?: number;
          rating_freshness?: number;
          rating_longevity?: number;
          rating_projection?: number;
          rating_sillage?: number;
          rating_sweetness?: number;
          rating_uniqueness?: number;
          rating_versatility?: number;
          rating_warmth?: number;
          sale_price_pkr?: number | null;
          sku?: string | null;
          slug: string;
          sort_order?: number;
          source_notes?: string | null;
          spotlight_eligible?: boolean;
          status?: string;
          stock_quantity?: number | null;
          tag_family?: string | null;
          tag_gender?: string | null;
          tag_intensity?: string | null;
          tag_mood?: string | null;
          tag_occasion?: string | null;
          tag_season?: string | null;
          tagline?: string | null;
          top_notes?: string[];
          updated_at?: string;
        };
        Update: {
          archived?: boolean;
          archived_at?: string | null;
          base_notes?: string[];
          best_season?: string | null;
          brand_id?: string | null;
          category_id?: string | null;
          concentration?: string | null;
          created_at?: string;
          description?: string | null;
          family?: string | null;
          featured?: boolean;
          gender?: string | null;
          heart_notes?: string[];
          id?: string;
          image_url?: string | null;
          image_status?: string;
          image_storage_path?: string | null;
          in_stock?: boolean;
          main_accords?: string[];
          meta_description?: string | null;
          meta_title?: string | null;
          name?: string;
          needs_confirmation?: boolean;
          new_arrival?: boolean;
          occasion?: string | null;
          og_image_url?: string | null;
          price_pkr?: number;
          rating_compliment?: number;
          rating_freshness?: number;
          rating_longevity?: number;
          rating_projection?: number;
          rating_sillage?: number;
          rating_sweetness?: number;
          rating_uniqueness?: number;
          rating_versatility?: number;
          rating_warmth?: number;
          sale_price_pkr?: number | null;
          sku?: string | null;
          slug?: string;
          sort_order?: number;
          source_notes?: string | null;
          spotlight_eligible?: boolean;
          status?: string;
          stock_quantity?: number | null;
          tag_family?: string | null;
          tag_gender?: string | null;
          tag_intensity?: string | null;
          tag_mood?: string | null;
          tag_occasion?: string | null;
          tag_season?: string | null;
          tagline?: string | null;
          top_notes?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "perfumes_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "perfumes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          in_stock: boolean;
          is_default: boolean;
          perfume_id: string;
          price_pkr: number;
          size_label: string;
          sku: string | null;
          sort_order: number;
          stock_quantity: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          in_stock?: boolean;
          is_default?: boolean;
          perfume_id: string;
          price_pkr: number;
          size_label: string;
          sku?: string | null;
          sort_order?: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          in_stock?: boolean;
          is_default?: boolean;
          perfume_id?: string;
          price_pkr?: number;
          size_label?: string;
          sku?: string | null;
          sort_order?: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_perfume_id_fkey";
            columns: ["perfume_id"];
            isOneToOne: false;
            referencedRelation: "perfumes";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          active: boolean;
          badge_text: string | null;
          created_at: string;
          customer_description: string | null;
          discount_type: string;
          discount_value: number;
          ends_at: string | null;
          id: string;
          internal_description: string | null;
          name: string;
          priority: number;
          stackable: boolean;
          starts_at: string | null;
          terms: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          badge_text?: string | null;
          created_at?: string;
          customer_description?: string | null;
          discount_type: string;
          discount_value?: number;
          ends_at?: string | null;
          id?: string;
          internal_description?: string | null;
          name: string;
          priority?: number;
          stackable?: boolean;
          starts_at?: string | null;
          terms?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          badge_text?: string | null;
          created_at?: string;
          customer_description?: string | null;
          discount_type?: string;
          discount_value?: number;
          ends_at?: string | null;
          id?: string;
          internal_description?: string | null;
          name?: string;
          priority?: number;
          stackable?: boolean;
          starts_at?: string | null;
          terms?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      promotion_targets: {
        Row: {
          id: string;
          promotion_id: string;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_targets_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          approved: boolean;
          body: string;
          created_at: string;
          id: string;
          name: string;
          rating: number;
          updated_at: string;
        };
        Insert: {
          approved?: boolean;
          body: string;
          created_at?: string;
          id?: string;
          name: string;
          rating: number;
          updated_at?: string;
        };
        Update: {
          approved?: boolean;
          body?: string;
          created_at?: string;
          id?: string;
          name?: string;
          rating?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          community_link: string | null;
          id: number;
          instagram_handle: string;
          updated_at: string;
          whatsapp_number: string;
        };
        Insert: {
          community_link?: string | null;
          id?: number;
          instagram_handle?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Update: {
          community_link?: string | null;
          id?: number;
          instagram_handle?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      spotlight: {
        Row: {
          description_override: string | null;
          id: number;
          perfume_id: string | null;
          updated_at: string;
        };
        Insert: {
          description_override?: string | null;
          id?: number;
          perfume_id?: string | null;
          updated_at?: string;
        };
        Update: {
          description_override?: string | null;
          id?: number;
          perfume_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spotlight_perfume_id_fkey";
            columns: ["perfume_id"];
            isOneToOne: false;
            referencedRelation: "perfumes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_admin_lock: { Args: never; Returns: boolean };
      get_current_admin_role: { Args: never; Returns: string };
      is_current_admin: { Args: never; Returns: boolean };
      release_admin_lock: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
