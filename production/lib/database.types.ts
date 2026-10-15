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
      ai_citations: {
        Row: {
          ai_output_id: string
          citation_label: string | null
          created_at: string
          evidence_id: string
          id: string
          organization_id: string
        }
        Insert: {
          ai_output_id: string
          citation_label?: string | null
          created_at?: string
          evidence_id: string
          id?: string
          organization_id: string
        }
        Update: {
          ai_output_id?: string
          citation_label?: string | null
          created_at?: string
          evidence_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_citations_ai_output_id_fkey"
            columns: ["ai_output_id"]
            isOneToOne: false
            referencedRelation: "ai_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_citations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_citations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_outputs: {
        Row: {
          ai_run_id: string
          created_at: string
          id: string
          organization_id: string
          output_json: Json
          output_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_outcome: string | null
          schema_version: string
        }
        Insert: {
          ai_run_id: string
          created_at?: string
          id?: string
          organization_id: string
          output_json: Json
          output_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_outcome?: string | null
          schema_version: string
        }
        Update: {
          ai_run_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          output_json?: Json
          output_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_outcome?: string | null
          schema_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_outputs_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_outputs_organization_id_fkey"
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
      ai_settings: {
        Row: {
          alert_percent: number
          external_actions_require_approval: boolean
          fast_model: string
          financial_actions_require_approval: boolean
          main_model: string
          monthly_cap_usd: number | null
          organization_id: string
          processing_region: string
          prompt_log_retention_days: number
          provider: string
          reasoning_model: string
          redact_personal_data: boolean
          require_source_citations: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alert_percent?: number
          external_actions_require_approval?: boolean
          fast_model?: string
          financial_actions_require_approval?: boolean
          main_model?: string
          monthly_cap_usd?: number | null
          organization_id: string
          processing_region?: string
          prompt_log_retention_days?: number
          provider?: string
          reasoning_model?: string
          redact_personal_data?: boolean
          require_source_citations?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alert_percent?: number
          external_actions_require_approval?: boolean
          fast_model?: string
          financial_actions_require_approval?: boolean
          main_model?: string
          monthly_cap_usd?: number | null
          organization_id?: string
          processing_region?: string
          prompt_log_retention_days?: number
          provider?: string
          reasoning_model?: string
          redact_personal_data?: boolean
          require_source_citations?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
      billing_accounts: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          organization_id: string
          plan_code: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          organization_id: string
          plan_code?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          organization_id?: string
          plan_code?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plan_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          organization_id: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          organization_id?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          organization_id?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          project_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          project_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clauses: {
        Row: {
          ai_run_id: string | null
          clause_number: string | null
          clause_text: string
          confidence: string | null
          contract_id: string
          created_at: string
          document_version_id: string
          heading: string | null
          id: string
          organization_id: string
          page_end: number | null
          page_start: number | null
          project_id: string
          source_locator: string
        }
        Insert: {
          ai_run_id?: string | null
          clause_number?: string | null
          clause_text: string
          confidence?: string | null
          contract_id: string
          created_at?: string
          document_version_id: string
          heading?: string | null
          id?: string
          organization_id: string
          page_end?: number | null
          page_start?: number | null
          project_id: string
          source_locator: string
        }
        Update: {
          ai_run_id?: string | null
          clause_number?: string | null
          clause_text?: string
          confidence?: string | null
          contract_id?: string
          created_at?: string
          document_version_id?: string
          heading?: string | null
          id?: string
          organization_id?: string
          page_end?: number | null
          page_start?: number | null
          project_id?: string
          source_locator?: string
        }
        Relationships: [
          {
            foreignKeyName: "clauses_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_team_members: {
        Row: {
          assigned_by: string | null
          contract_id: string
          created_at: string
          organization_id: string
          team_role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          contract_id: string
          created_at?: string
          organization_id: string
          team_role?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          contract_id?: string
          created_at?: string
          organization_id?: string
          team_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_team_members_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          commencement_date: string | null
          completion_date: string | null
          consultant: string | null
          contract_number: string | null
          contract_type: string | null
          contract_value: number | null
          contractor: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          effective_date: string | null
          employer: string | null
          governing_law: string | null
          id: string
          organization_id: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          commencement_date?: string | null
          completion_date?: string | null
          consultant?: string | null
          contract_number?: string | null
          contract_type?: string | null
          contract_value?: number | null
          contractor?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          effective_date?: string | null
          employer?: string | null
          governing_law?: string | null
          id?: string
          organization_id: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          commencement_date?: string | null
          completion_date?: string | null
          consultant?: string | null
          contract_number?: string | null
          contract_type?: string | null
          contract_value?: number | null
          contractor?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          effective_date?: string | null
          employer?: string | null
          governing_law?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
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
      definitions: {
        Row: {
          ai_run_id: string | null
          confidence: string | null
          contract_id: string
          created_at: string
          definition_text: string
          document_version_id: string
          id: string
          organization_id: string
          project_id: string
          source_locator: string
          term: string
        }
        Insert: {
          ai_run_id?: string | null
          confidence?: string | null
          contract_id: string
          created_at?: string
          definition_text: string
          document_version_id: string
          id?: string
          organization_id: string
          project_id: string
          source_locator: string
          term: string
        }
        Update: {
          ai_run_id?: string | null
          confidence?: string | null
          contract_id?: string
          created_at?: string
          definition_text?: string
          document_version_id?: string
          id?: string
          organization_id?: string
          project_id?: string
          source_locator?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "definitions_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definitions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definitions_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_assignments: {
        Row: {
          assignee_label: string | null
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          document_id: string
          due_at: string | null
          id: string
          instruction: string
          organization_id: string
          priority: string
          status: string
        }
        Insert: {
          assignee_label?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          document_id: string
          due_at?: string | null
          id?: string
          instruction: string
          organization_id: string
          priority?: string
          status?: string
        }
        Update: {
          assignee_label?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          due_at?: string | null
          id?: string
          instruction?: string
          organization_id?: string
          priority?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          byte_size: number | null
          content_hash: string | null
          created_at: string
          created_by: string | null
          document_id: string
          extracted_at: string | null
          file_name: string
          id: string
          is_current: boolean
          mime_type: string | null
          organization_id: string
          processing_error: string | null
          processing_status: Database["public"]["Enums"]["document_processing_status"]
          storage_path: string
          version_no: number
        }
        Insert: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          extracted_at?: string | null
          file_name: string
          id?: string
          is_current?: boolean
          mime_type?: string | null
          organization_id: string
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
          storage_path: string
          version_no: number
        }
        Update: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          extracted_at?: string | null
          file_name?: string
          id?: string
          is_current?: boolean
          mime_type?: string | null
          organization_id?: string
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
          storage_path?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_hash: string | null
          contract_id: string | null
          created_at: string
          current_version_id: string | null
          document_type: string | null
          file_name: string
          id: string
          organization_id: string
          processing_status: Database["public"]["Enums"]["document_processing_status"]
          project_id: string | null
          storage_path: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          current_version_id?: string | null
          document_type?: string | null
          file_name: string
          id?: string
          organization_id: string
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
          project_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          current_version_id?: string | null
          document_type?: string | null
          file_name?: string
          id?: string
          organization_id?: string
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
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
            foreignKeyName: "documents_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
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
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          organization_id: string | null
          payload: Json
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          template: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json
          recipient: string
          sent_at?: string | null
          status?: string
          subject: string
          template: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          clause_id: string | null
          content_hash: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          document_id: string
          document_version_id: string
          evidence_kind: string
          excerpt: string | null
          id: string
          obligation_id: string | null
          organization_id: string
          project_id: string | null
          source_locator: string
          source_type: string
        }
        Insert: {
          clause_id?: string | null
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          document_version_id: string
          evidence_kind?: string
          excerpt?: string | null
          id?: string
          obligation_id?: string | null
          organization_id: string
          project_id?: string | null
          source_locator: string
          source_type?: string
        }
        Update: {
          clause_id?: string | null
          content_hash?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          document_version_id?: string
          evidence_kind?: string
          excerpt?: string | null
          id?: string
          obligation_id?: string | null
          organization_id?: string
          project_id?: string | null
          source_locator?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_project_id_fkey"
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
          evidence_id: string | null
          evidence_kind: string
          gap_id: string
          locator: string
          note: string | null
        }
        Insert: {
          document_id: string
          evidence_id?: string | null
          evidence_kind?: string
          gap_id: string
          locator?: string
          note?: string | null
        }
        Update: {
          document_id?: string
          evidence_id?: string | null
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
            foreignKeyName: "gap_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
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
      gap_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event: string
          gap_id: string
          id: number
          organization_id: string
          snapshot: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event: string
          gap_id: string
          id?: never
          organization_id: string
          snapshot: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event?: string
          gap_id?: string
          id?: never
          organization_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gap_history_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      messages: {
        Row: {
          body: string
          channel_id: string
          contract_id: string | null
          created_at: string
          deleted_at: string | null
          document_id: string | null
          edited_at: string | null
          id: string
          message_type: string
          organization_id: string
          project_id: string | null
          recipient_user_id: string | null
          sender_user_id: string
          work_item_id: string | null
        }
        Insert: {
          body: string
          channel_id: string
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_id?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          organization_id: string
          project_id?: string | null
          recipient_user_id?: string | null
          sender_user_id: string
          work_item_id?: string | null
        }
        Update: {
          body?: string
          channel_id?: string
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_id?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          organization_id?: string
          project_id?: string | null
          recipient_user_id?: string | null
          sender_user_id?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          organization_id: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          organization_id: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          organization_id?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          ai_run_id: string | null
          beneficiary_party: string | null
          clause_id: string | null
          confidence: string | null
          consequence: string | null
          contract_id: string
          created_at: string
          document_version_id: string
          id: string
          obligation_text: string
          obligation_type: string | null
          organization_id: string
          project_id: string
          responsible_party: string | null
          source_locator: string
          status: string
          timing_requirement: string | null
          trigger_condition: string | null
        }
        Insert: {
          ai_run_id?: string | null
          beneficiary_party?: string | null
          clause_id?: string | null
          confidence?: string | null
          consequence?: string | null
          contract_id: string
          created_at?: string
          document_version_id: string
          id?: string
          obligation_text: string
          obligation_type?: string | null
          organization_id: string
          project_id: string
          responsible_party?: string | null
          source_locator: string
          status?: string
          timing_requirement?: string | null
          trigger_condition?: string | null
        }
        Update: {
          ai_run_id?: string | null
          beneficiary_party?: string | null
          clause_id?: string | null
          confidence?: string | null
          consequence?: string | null
          contract_id?: string
          created_at?: string
          document_version_id?: string
          id?: string
          obligation_text?: string
          obligation_type?: string | null
          organization_id?: string
          project_id?: string
          responsible_party?: string | null
          source_locator?: string
          status?: string
          timing_requirement?: string | null
          trigger_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligations_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_project_id_fkey"
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
          display_name: string | null
          email: string | null
          job_title: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          job_title?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          job_title?: string | null
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
      plan_catalog: {
        Row: {
          ai_runs_monthly_limit: number | null
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          is_public: boolean
          monthly_amount_minor: number | null
          name: string
          projects_limit: number | null
          seats_limit: number | null
          sort_order: number
          storage_gb_limit: number | null
        }
        Insert: {
          ai_runs_monthly_limit?: number | null
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          is_public?: boolean
          monthly_amount_minor?: number | null
          name: string
          projects_limit?: number | null
          seats_limit?: number | null
          sort_order?: number
          storage_gb_limit?: number | null
        }
        Update: {
          ai_runs_monthly_limit?: number | null
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          is_public?: boolean
          monthly_amount_minor?: number | null
          name?: string
          projects_limit?: number | null
          seats_limit?: number | null
          sort_order?: number
          storage_gb_limit?: number | null
        }
        Relationships: []
      }
      project_team_members: {
        Row: {
          assigned_by: string | null
          created_at: string
          organization_id: string
          project_id: string
          team_role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          organization_id: string
          project_id: string
          team_role?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          organization_id?: string
          project_id?: string
          team_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          market: string
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          market?: string
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
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
      report_snapshots: {
        Row: {
          contract_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string | null
          report_type: string
          snapshot: Json
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          report_type: string
          snapshot: Json
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          report_type?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          job_title: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          job_title?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          job_title?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_user_id: string | null
          id: string
          note: string | null
          organization_id: string
          to_user_id: string | null
          work_item_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_user_id?: string | null
          id?: string
          note?: string | null
          organization_id: string
          to_user_id?: string | null
          work_item_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_user_id?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          to_user_id?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_events_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          accepted_at: string | null
          assigned_by: string
          assigned_to: string | null
          completed_at: string | null
          contract_id: string | null
          created_at: string
          details: string | null
          document_id: string | null
          due_at: string | null
          forwarded_at: string | null
          id: string
          last_overdue_alert_at: string | null
          organization_id: string
          overdue_alert_count: number
          parent_work_item_id: string | null
          priority: string
          project_id: string | null
          source_message_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_by: string
          assigned_to?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          details?: string | null
          document_id?: string | null
          due_at?: string | null
          forwarded_at?: string | null
          id?: string
          last_overdue_alert_at?: string | null
          organization_id: string
          overdue_alert_count?: number
          parent_work_item_id?: string | null
          priority?: string
          project_id?: string | null
          source_message_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string
          assigned_to?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          details?: string | null
          document_id?: string | null
          due_at?: string | null
          forwarded_at?: string | null
          id?: string
          last_overdue_alert_at?: string | null
          organization_id?: string
          overdue_alert_count?: number
          parent_work_item_id?: string | null
          priority?: string
          project_id?: string | null
          source_message_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_work_item_id_fkey"
            columns: ["parent_work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: { Args: { p_token: string }; Returns: Json }
      bootstrap_workspace: {
        Args: {
          p_currency: string
          p_market: string
          p_organization_name: string
          p_project_code: string
          p_project_name: string
        }
        Returns: Json
      }
      bootstrap_workspace_v2: {
        Args: {
          p_currency: string
          p_display_name: string
          p_job_title: string
          p_market: string
          p_organization_name: string
          p_project_code: string
          p_project_name: string
        }
        Returns: Json
      }
      bootstrap_workspace_v3: {
        Args: {
          p_contract_number: string
          p_contract_title: string
          p_currency: string
          p_display_name: string
          p_job_title: string
          p_market: string
          p_organization_name: string
          p_project_code: string
          p_project_name: string
        }
        Returns: Json
      }
    }
    Enums: {
      document_processing_status:
        | "queued"
        | "uploading"
        | "validating"
        | "processing"
        | "needs review"
        | "ready"
        | "partial failure"
        | "failed"
      gap_severity: "Critical" | "High" | "Medium" | "Low" | "Informational"
      gap_status:
        | "Detected"
        | "Under Review"
        | "Confirmed"
        | "Action Required"
        | "In Progress"
        | "Resolved"
        | "Closed"
        | "Disputed"
        | "Deferred"
        | "Rejected"
        | "Monitoring"
        | "Not Applicable"
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
      document_processing_status: [
        "queued",
        "uploading",
        "validating",
        "processing",
        "needs review",
        "ready",
        "partial failure",
        "failed",
      ],
      gap_severity: ["Critical", "High", "Medium", "Low", "Informational"],
      gap_status: [
        "Detected",
        "Under Review",
        "Confirmed",
        "Action Required",
        "In Progress",
        "Resolved",
        "Closed",
        "Disputed",
        "Deferred",
        "Rejected",
        "Monitoring",
        "Not Applicable",
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
