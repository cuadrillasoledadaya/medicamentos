// Hand-written Database types matching supabase/migrations/0001_initial_schema.sql
// Kept in sync with the migration; regenerated when schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      pacientes: {
        Row: {
          id: string;
          cuidador_id: string;
          name: string;
          dob: string | null;
          photo_url: string | null;
          timezone_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cuidador_id: string;
          name: string;
          dob?: string | null;
          photo_url?: string | null;
          timezone_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cuidador_id?: string;
          name?: string;
          dob?: string | null;
          photo_url?: string | null;
          timezone_id?: string;
          created_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          paciente_id: string;
          user_id: string;
          role: Database['public']['Enums']['family_role'];
          status: Database['public']['Enums']['family_membership_state'];
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          user_id: string;
          role: Database['public']['Enums']['family_role'];
          status?: Database['public']['Enums']['family_membership_state'];
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['family_role'];
          status?: Database['public']['Enums']['family_membership_state'];
          created_at?: string;
        };
      };
      temporadas: {
        Row: {
          id: string;
          paciente_id: string;
          name: string;
          start_date: string;
          end_date: string;
          closed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          name: string;
          start_date: string;
          end_date: string;
          closed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          closed_at?: string | null;
          created_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          paciente_id: string;
          temporada_id: string | null;
          is_permanent: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          temporada_id?: string | null;
          is_permanent?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          temporada_id?: string | null;
          is_permanent?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      medications: {
        Row: {
          id: string;
          paciente_id: string;
          name: string;
          dose_value: number;
          dose_unit: string;
          dose_unit_other: string | null;
          route: string;
          frequency_hint: string | null;
          notes: string | null;
          photo_url: string | null;
          stock_estimate: number;
          low_stock_threshold: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          name: string;
          dose_value: number;
          dose_unit: string;
          dose_unit_other?: string | null;
          route: string;
          frequency_hint?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          stock_estimate?: number;
          low_stock_threshold?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          name?: string;
          dose_value?: number;
          dose_unit?: string;
          dose_unit_other?: string | null;
          route?: string;
          frequency_hint?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          stock_estimate?: number;
          low_stock_threshold?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          medication_id: string;
          time_of_day: string;
          weekday_mask: number;
          timezone_id: string;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          time_of_day: string;
          weekday_mask: number;
          timezone_id?: string;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          time_of_day?: string;
          weekday_mask?: number;
          timezone_id?: string;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tomas: {
        Row: {
          id: string;
          schedule_id: string;
          paciente_id: string;
          scheduled_at: string;
          status: Database['public']['Enums']['intake_status'];
          taken_at: string | null;
          snoozed_until: string | null;
          skip_reason: string | null;
          registered_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          paciente_id: string;
          scheduled_at: string;
          status?: Database['public']['Enums']['intake_status'];
          taken_at?: string | null;
          snoozed_until?: string | null;
          skip_reason?: string | null;
          registered_by: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          paciente_id?: string;
          scheduled_at?: string;
          status?: Database['public']['Enums']['intake_status'];
          taken_at?: string | null;
          snoozed_until?: string | null;
          skip_reason?: string | null;
          registered_by?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tomas_archive: {
        Row: {
          id: string;
          schedule_id: string;
          paciente_id: string;
          scheduled_at: string;
          status: string;
          taken_at: string | null;
          snoozed_until: string | null;
          skip_reason: string | null;
          registered_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string;
        };
        Insert: {
          id: string;
          schedule_id: string;
          paciente_id: string;
          scheduled_at: string;
          status: string;
          taken_at?: string | null;
          snoozed_until?: string | null;
          skip_reason?: string | null;
          registered_by: string;
          notes?: string | null;
          created_at: string;
          updated_at: string;
          archived_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          paciente_id?: string;
          scheduled_at?: string;
          status?: string;
          taken_at?: string | null;
          snoozed_until?: string | null;
          skip_reason?: string | null;
          registered_by?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string;
        };
      };
      vacations: {
        Row: {
          id: string;
          paciente_id: string;
          medication_id: string | null;
          starts_at: string;
          ends_at: string;
          reason: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          medication_id?: string | null;
          starts_at: string;
          ends_at: string;
          reason?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          medication_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          reason?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      retention_policies: {
        Row: {
          id: string;
          paciente_id: string | null;
          retention_days: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id?: string | null;
          retention_days?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string | null;
          retention_days?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_settings: {
        Row: {
          id: string;
          paciente_id: string;
          medication_id: string | null;
          channel: Database['public']['Enums']['notification_channel'];
          enabled: boolean;
          require_interaction: boolean;
          vibrate: boolean;
          renotify: boolean;
          badge: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          medication_id?: string | null;
          channel: Database['public']['Enums']['notification_channel'];
          enabled?: boolean;
          require_interaction?: boolean;
          vibrate?: boolean;
          renotify?: boolean;
          badge?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          medication_id?: string | null;
          channel?: Database['public']['Enums']['notification_channel'];
          enabled?: boolean;
          require_interaction?: boolean;
          vibrate?: boolean;
          renotify?: boolean;
          badge?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      interactions: {
        Row: {
          id: string;
          drug_a: string;
          drug_b: string;
          severity: Database['public']['Enums']['interaction_severity'];
          description: string;
          source_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          drug_a: string;
          drug_b: string;
          severity: Database['public']['Enums']['interaction_severity'];
          description: string;
          source_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          drug_a?: string;
          drug_b?: string;
          severity?: Database['public']['Enums']['interaction_severity'];
          description?: string;
          source_notes?: string | null;
          created_at?: string;
        };
      };
      stock_adjustments: {
        Row: {
          id: string;
          medication_id: string;
          previous_estimate: number;
          new_estimate: number;
          reason: string;
          adjusted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          previous_estimate: number;
          new_estimate: number;
          reason: string;
          adjusted_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          previous_estimate?: number;
          new_estimate?: number;
          reason?: string;
          adjusted_by?: string;
          created_at?: string;
        };
      };
      adherence_daily: {
        Row: {
          id: string;
          paciente_id: string;
          date: string;
          taken_on_time: number;
          taken_late: number;
          missed: number;
          skipped: number;
          rollup_computed_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          date: string;
          taken_on_time?: number;
          taken_late?: number;
          missed?: number;
          skipped?: number;
          rollup_computed_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          date?: string;
          taken_on_time?: number;
          taken_late?: number;
          missed?: number;
          skipped?: number;
          rollup_computed_at?: string;
        };
      };
      temporada_reopen_audit: {
        Row: {
          id: string;
          temporada_id: string;
          user_id: string;
          reason: string;
          modified_at: string;
          modified_fields: Json;
        };
        Insert: {
          id?: string;
          temporada_id: string;
          user_id: string;
          reason: string;
          modified_at?: string;
          modified_fields?: Json;
        };
        Update: {
          id?: string;
          temporada_id?: string;
          user_id?: string;
          reason?: string;
          modified_at?: string;
          modified_fields?: Json;
        };
      };
      patient_trip_adjustments: {
        Row: {
          id: string;
          paciente_id: string;
          starts_at: string;
          ends_at: string;
          shift_hours: number;
          reason: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          starts_at: string;
          ends_at: string;
          shift_hours: number;
          reason?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          starts_at?: string;
          ends_at?: string;
          shift_hours?: number;
          reason?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          device_name: string | null;
          is_active: boolean;
          created_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          device_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          device_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_seen_at?: string | null;
        };
      };
      notification_deliveries: {
        Row: {
          id: string;
          toma_id: string;
          subscription_id: string;
          channel: string;
          sent_at: string;
          status: string;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          toma_id: string;
          subscription_id: string;
          channel: string;
          sent_at?: string;
          status: string;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          toma_id?: string;
          subscription_id?: string;
          channel?: string;
          sent_at?: string;
          status?: string;
          error_message?: string | null;
        };
      };
      dose_units: {
        Row: {
          value: string;
          sort_order: number;
        };
        Insert: {
          value: string;
          sort_order: number;
        };
        Update: {
          value?: string;
          sort_order?: number;
        };
      };
    };
    Views: {
      v_adherence_28d: {
        Row: {
          date: string;
          paciente_id: string;
          on_time: number | null;
          late: number | null;
          missed: number | null;
          skipped: number | null;
          adherence_pct: number | null;
        };
      };
      tomas_due: {
        Row: {
          id: string;
          paciente_id: string;
          schedule_id: string;
          scheduled_at: string;
          status: string;
        };
      };
      tomas_due_for_push: {
        Row: {
          toma_id: string;
          paciente_id: string;
          scheduled_at: string;
          medication_name: string;
          dose_value: number;
          dose_unit: string;
          paciente_name: string;
        };
      };
    };
    Functions: {
      is_active_family_member: {
        Args: { p_paciente: string };
        Returns: boolean;
      };
      is_cuidador_principal: {
        Args: { p_paciente: string };
        Returns: boolean;
      };
      paciente_of_medication: {
        Args: { p_medication: string };
        Returns: string;
      };
    };
    Enums: {
      intake_status: 'pending' | 'taken_on_time' | 'taken_late' | 'skipped' | 'missed';
      interaction_severity: 'info' | 'caution' | 'warning' | 'severe';
      family_role: 'owner_paciente' | 'cuidador_principal' | 'cuidador_secundario' | 'medico';
      family_membership_state: 'pending' | 'active' | 'revoked';
      notification_channel: 'in_app' | 'email' | 'sms' | 'web_push';
    };
  };
};

// Convenience type aliases for common rows
export type Paciente = Database['public']['Tables']['pacientes']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Temporada = Database['public']['Tables']['temporadas']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Medication = Database['public']['Tables']['medications']['Row'];
export type Schedule = Database['public']['Tables']['schedules']['Row'];
export type Toma = Database['public']['Tables']['tomas']['Row'];
export type Vacation = Database['public']['Tables']['vacations']['Row'];
export type RetentionPolicy = Database['public']['Tables']['retention_policies']['Row'];
export type NotificationSetting = Database['public']['Tables']['notification_settings']['Row'];
export type Interaction = Database['public']['Tables']['interactions']['Row'];
export type TemporadaReopenAudit = Database['public']['Tables']['temporada_reopen_audit']['Row'];
export type PatientTripAdjustment = Database['public']['Tables']['patient_trip_adjustments']['Row'];
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];
export type NotificationDelivery = Database['public']['Tables']['notification_deliveries']['Row'];
