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
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: number;
          reason: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: never;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: never;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          autocert_accepted_at: string;
          autocert_version: string;
          cancelled_at: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          price_cents: number;
          sport_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          autocert_accepted_at: string;
          autocert_version: string;
          cancelled_at?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          price_cents: number;
          sport_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_id: string;
        };
        Update: {
          autocert_accepted_at?: string;
          autocert_version?: string;
          cancelled_at?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          price_cents?: number;
          sport_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      opening_intervals: {
        Row: {
          closes: string;
          id: number;
          opens: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          closes: string;
          id?: never;
          opens: string;
          weekday: number;
        };
        Update: {
          closes?: string;
          id?: never;
          opens?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      price_rules: {
        Row: {
          from_time: string;
          id: number;
          price_cents: number;
          sport_id: string;
          to_time: string;
          weekdays: number[];
        };
        ComputedFields: never;
        Insert: {
          from_time: string;
          id?: never;
          price_cents: number;
          sport_id: string;
          to_time: string;
          weekdays: number[];
        };
        Update: {
          from_time?: string;
          id?: never;
          price_cents?: number;
          sport_id?: string;
          to_time?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "price_rules_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          birth_date: string;
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          tax_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          birth_date: string;
          created_at?: string;
          first_name: string;
          id: string;
          last_name: string;
          tax_code: string;
          updated_at?: string;
        };
        Update: {
          birth_date?: string;
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          tax_code?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sports: {
        Row: {
          active: boolean;
          id: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      blocked_periods: {
        Args: { p_from: string; p_to: string };
        Returns: {
          ends_at: string;
          starts_at: string;
        }[];
      };
      is_superadmin: { Args: Record<PropertyKey, never>; Returns: boolean };
      occupied_slots: {
        Args: { p_from: string; p_to: string };
        Returns: {
          first_name: string;
          sport_id: string;
          starts_at: string;
        }[];
      };
    };
    Enums: {
      booking_status: "active" | "cancelled_by_user" | "cancelled_by_admin";
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: ["active", "cancelled_by_user", "cancelled_by_admin"],
    },
  },
} as const;
