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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          action_text: string
          completed_at: string | null
          completion_evidence: string | null
          created_at: string
          due_at: string | null
          gap_id: string | null
          id: string
          organization_id: string
          owner_label: string | null
          owner_user_id: string | null
          status: string
        }
        Insert: {
          action_text: string
          completed_at?: string | null
          completion_evidence?: string | null
          created_at?: string
          due_at?: string | null
          gap_id?: string | null
          id?: string
          organization_id: string
          owner_label?: string | null
          owner_user_id?: string | null
          status?: string
        }
        Update: {
          action_text?: string
          completed_at?: string | null
          completion_evidence?: string | null
          created_at?: string
          due_at?: string | null
          gap_id?: string | null
          id?: string
          organization_id?: string
          owner_label?: string | null
          owner_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          cost_minor_units: number | null
          created_at: string
          created_by: string | null
          id: string
          input_tokens: number | null
          model: string
          organization_id: string
          output_tokens: number | null
          project_id: string | null
          prompt_version: string | null
          provider: string
          response_id: string | null
          status: string
          task_type: string
        }
        Insert: {
          cost_minor_units?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          organization_id: string
          output_tokens?: number | null
          project_id?: string | null
          prompt_version?: string | null
          provider: string
          response_id?: string | null
          status: string
          task_type: string
        }
        Update: {
          cost_minor_units?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string
          output_tokens?: number | null
          project_id?: string | null
          prompt_version?: string | null
          provider?: string
          response_id?: string | null
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          new_value: Json | null
          object_id: string
          object_type: string
          organization_id: string
          previous_value: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_value?: Json | null
          object_id: string
          object_type: string
          organization_id: string
          previous_value?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_value?: Json | null
          object_id?: string
          object_type?: string
          organization_id?: string
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string | null
          contract_value: number | null
          counterparty: string | null
          created_at: string
          currency: string | null
          id: string
          organization_id: string
          project_id: string
          title: string
        }
        Insert: {
          contract_number?: string | null
          contract_value?: number | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          organization_id: string
          project_id: string
          title: string
        }
        Update: {
          contract_number?: string | null
          contract_value?: number | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_hash: string | null
          contract_id: string | null
          created_at: string
          document_type: string | null
          file_name: string
          id: string
          organization_id: string
          project_id: string | null
          storage_path: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          document_type?: string | null
          file_name: string
          id?: string
          organization_id: string
          project_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          document_type?: string | null
          file_name?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_evidence: {
        Row: {
          document_id: string
          evidence_kind: string
          gap_id: string
          locator: string
          note: string | null
        }
        Insert: {
          document_id: string
          evidence_kind?: string
          gap_id: string
          locator?: string
          note?: string | null
        }
        Update: {
          document_id?: string
          evidence_kind?: string
          gap_id?: string
          locator?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gap_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_evidence_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "gaps"
            referencedColumns: ["id"]
          },
        ]
      }
      gaps: {
        Row: {
          action: string
          ai_run_id: string | null
          confidence: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          gap: string
          id: string
          impact: string
          organization_id: string
          owner_label: string | null
          owner_user_id: string | null
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["gap_severity"]
          source_kind: string
          status: Database["public"]["Enums"]["gap_status"]
          updated_at: string
          what_is: string
          what_ought_to_be: string
          why: string
        }
        Insert: {
          action: string
          ai_run_id?: string | null
          confidence?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          gap: string
          id?: string
          impact: string
          organization_id: string
          owner_label?: string | null
          owner_user_id?: string | null
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["gap_severity"]
          source_kind?: string
          status?: Database["public"]["Enums"]["gap_status"]
          updated_at?: string
          what_is: string
          what_ought_to_be: string
          why: string
        }
        Update: {
          action?: string
          ai_run_id?: string | null
          confidence?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          gap?: string
          id?: string
          impact?: string
          organization_id?: string
          owner_label?: string | null
          owner_user_id?: string | null
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["gap_severity"]
          source_kind?: string
          status?: Database["public"]["Enums"]["gap_status"]
          updated_at?: string
          what_is?: string
          what_ought_to_be?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "gaps_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gaps_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gaps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          id: string
          market: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          market?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          market?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          created_at: string
          id: string
          market: string
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          market?: string
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          market?: string
          name?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gap_severity: "Critical" | "High" | "Medium" | "Low" | "Informational"
      gap_status:
        | "Detected"
        | "Under Review"
        | "Confirmed"
        | "Action Required"
        | "In Progress"
        | "Resolved"
        | "Closed"
      member_role:
        | "owner"
        | "admin"
        | "contract_manager"
        | "contributor"
        | "reviewer"
        | "executive_viewer"
        | "external_viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      gap_severity: ["Critical", "High", "Medium", "Low", "Informational"],
      gap_status: [
        "Detected",
        "Under Review",
        "Confirmed",
        "Action Required",
        "In Progress",
        "Resolved",
        "Closed",
      ],
      member_role: [
        "owner",
        "admin",
        "contract_manager",
        "contributor",
        "reviewer",
        "executive_viewer",
        "external_viewer",
      ],
    },
  },
} as const
