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
      cards: {
        Row: {
          back: Json
          concept_tag: string | null
          created_at: string
          deck_id: string
          embedding: string | null
          format: string
          front: Json
          fsrs_state: Json | null
          id: string
          source_chunk_id: string | null
          suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          back: Json
          concept_tag?: string | null
          created_at?: string
          deck_id: string
          embedding?: string | null
          format?: string
          front: Json
          fsrs_state?: Json | null
          id?: string
          source_chunk_id?: string | null
          suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: Json
          concept_tag?: string | null
          created_at?: string
          deck_id?: string
          embedding?: string | null
          format?: string
          front?: Json
          fsrs_state?: Json | null
          id?: string
          source_chunk_id?: string | null
          suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          card_count: number
          created_at: string
          id: string
          source_pdf_hash: string | null
          source_pdf_path: string | null
          status: string
          subject_family: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_count?: number
          created_at?: string
          id?: string
          source_pdf_hash?: string | null
          source_pdf_path?: string | null
          status?: string
          subject_family?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_count?: number
          created_at?: string
          id?: string
          source_pdf_hash?: string | null
          source_pdf_path?: string | null
          status?: string
          subject_family?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          deck_id: string
          error: string | null
          finished_at: string | null
          id: string
          progress_pct: number
          stage: string
          started_at: string
        }
        Insert: {
          deck_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress_pct?: number
          stage?: string
          started_at?: string
        }
        Update: {
          deck_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress_pct?: number
          stage?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      interference_pairs: {
        Row: {
          card_a: string
          card_b: string
          discriminative_prompt: string | null
          similarity: number | null
        }
        Insert: {
          card_a: string
          card_b: string
          discriminative_prompt?: string | null
          similarity?: number | null
        }
        Update: {
          card_a?: string
          card_b?: string
          discriminative_prompt?: string | null
          similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interference_pairs_card_a_fkey"
            columns: ["card_a"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interference_pairs_card_b_fkey"
            columns: ["card_b"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_calls: {
        Row: {
          created_at: string
          id: string
          input_tokens: number
          latency_ms: number | null
          model: string
          output_tokens: number
          stage: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          model: string
          output_tokens?: number
          stage: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          model?: string
          output_tokens?: number
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          daily_goal_cards: number
          display_name: string | null
          fsrs_weights: Json | null
          level: string | null
          onboarded_at: string | null
          subject_family: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal_cards?: number
          display_name?: string | null
          fsrs_weights?: Json | null
          level?: string | null
          onboarded_at?: string | null
          subject_family?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal_cards?: number
          display_name?: string | null
          fsrs_weights?: Json | null
          level?: string | null
          onboarded_at?: string | null
          subject_family?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          card_id: string
          elapsed_ms: number | null
          fsrs_state_after: Json | null
          fsrs_state_before: Json | null
          id: string
          rated_at: string
          rating: number
          scheduled_days_before: number | null
          user_id: string
        }
        Insert: {
          card_id: string
          elapsed_ms?: number | null
          fsrs_state_after?: Json | null
          fsrs_state_before?: Json | null
          id?: string
          rated_at?: string
          rating: number
          scheduled_days_before?: number | null
          user_id: string
        }
        Update: {
          card_id?: string
          elapsed_ms?: number | null
          fsrs_state_after?: Json | null
          fsrs_state_before?: Json | null
          id?: string
          rated_at?: string
          rating?: number
          scheduled_days_before?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          break_prompted_at: string | null
          cards_reviewed: number
          ended_at: string | null
          id: string
          mean_accuracy: number | null
          mean_response_ms: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          break_prompted_at?: string | null
          cards_reviewed?: number
          ended_at?: string | null
          id?: string
          mean_accuracy?: number | null
          mean_response_ms?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          break_prompted_at?: string | null
          cards_reviewed?: number
          ended_at?: string | null
          id?: string
          mean_accuracy?: number | null
          mean_response_ms?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
