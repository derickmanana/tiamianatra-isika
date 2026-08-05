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
      access_code_uses: {
        Row: {
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          module_id: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          module_id: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          module_id?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          total_uses_count: number
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          total_uses_count?: number
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          total_uses_count?: number
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      affiliate_uses: {
        Row: {
          code_id: string
          created_at: string
          id: string
          payment_id: string | null
          used_by: string
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          payment_id?: string | null
          used_by: string
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_uses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_settings: {
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
      certificates: {
        Row: {
          created_at: string
          formation_id: string
          id: string
          issued_at: string
          pdf_url: string | null
          signature_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          formation_id: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          signature_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          formation_id?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          signature_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_blocks: {
        Row: {
          created_at: string
          display_order: number
          folder_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          folder_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          folder_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_blocks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "course_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      course_durations: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration_weeks: number | null
          id: string
          is_active: boolean
          name: string
          price_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_weeks?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_weeks?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      course_folders: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          formation_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          formation_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          formation_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_folders_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          block_id: string
          created_at: string
          description: string | null
          display_order: number
          external_url: string | null
          files: Json
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          external_url?: string | null
          files?: Json
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          external_url?: string | null
          files?: Json
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "course_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_enrollments: {
        Row: {
          created_at: string
          duration_id: string | null
          formation_id: string
          id: string
          school_id: string | null
          status: string
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_id?: string | null
          formation_id: string
          id?: string
          school_id?: string | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_id?: string | null
          formation_id?: string
          id?: string
          school_id?: string | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_enrollments_duration_id_fkey"
            columns: ["duration_id"]
            isOneToOne: false
            referencedRelation: "course_durations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_enrollments_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          category: string | null
          certificate_type: string | null
          certificate_types: string[]
          cover_type: string
          cover_url: string | null
          created_at: string
          description: string | null
          display_order: number
          duration_id: string | null
          duration_text: string | null
          id: string
          is_active: boolean
          learning_track_id: string | null
          level: string | null
          owner_partner_id: string | null
          price: number | null
          school_id: string | null
          specialization: string | null
          status: string
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          certificate_type?: string | null
          certificate_types?: string[]
          cover_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_id?: string | null
          duration_text?: string | null
          id?: string
          is_active?: boolean
          learning_track_id?: string | null
          level?: string | null
          owner_partner_id?: string | null
          price?: number | null
          school_id?: string | null
          specialization?: string | null
          status?: string
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          certificate_type?: string | null
          certificate_types?: string[]
          cover_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_id?: string | null
          duration_text?: string | null
          id?: string
          is_active?: boolean
          learning_track_id?: string | null
          level?: string | null
          owner_partner_id?: string | null
          price?: number | null
          school_id?: string | null
          specialization?: string | null
          status?: string
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formations_duration_id_fkey"
            columns: ["duration_id"]
            isOneToOne: false
            referencedRelation: "course_durations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_learning_track_id_fkey"
            columns: ["learning_track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_owner_partner_id_fkey"
            columns: ["owner_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          display_order: number
          id: string
          is_active: boolean
          media_url: string | null
          title: string | null
          type: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          title?: string | null
          type: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          contract_type: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          partner_id: string
          requires_cv: boolean
          requires_portfolio: boolean
          salary_range: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contract_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          partner_id: string
          requires_cv?: boolean
          requires_portfolio?: boolean
          salary_range?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          contract_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          partner_id?: string
          requires_cv?: boolean
          requires_portfolio?: boolean
          salary_range?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_tracks: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          price_multiplier: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          price_multiplier?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          price_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_broadcast: boolean
          is_read: boolean
          recipient_id: string | null
          sender_id: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          formation_id: string
          id: string
          is_available: boolean
          is_free_intro: boolean
          price_ariary: number
          title: string
          unavailable_message: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          formation_id: string
          id?: string
          is_available?: boolean
          is_free_intro?: boolean
          price_ariary?: number
          title: string
          unavailable_message?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          formation_id?: string
          id?: string
          is_available?: boolean
          is_free_intro?: boolean
          price_ariary?: number
          title?: string
          unavailable_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          bio: string | null
          commission_rate: number
          company: string | null
          created_at: string
          display_name: string
          id: string
          logo_url: string | null
          partner_type: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          commission_rate?: number
          company?: string | null
          created_at?: string
          display_name: string
          id?: string
          logo_url?: string | null
          partner_type: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          commission_rate?: number
          company?: string | null
          created_at?: string
          display_name?: string
          id?: string
          logo_url?: string | null
          partner_type?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder: string
          account_number: string
          id: string
          is_active: boolean
          method: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          id?: string
          is_active?: boolean
          method: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          id?: string
          is_active?: boolean
          method?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_comment: string | null
          amount_ariary: number
          amount_usdt: number | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method_type"]
          module_id: string
          proof_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          amount_ariary: number
          amount_usdt?: number | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method_type"]
          module_id: string
          proof_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          amount_ariary?: number
          amount_usdt?: number | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method_type"]
          module_id?: string
          proof_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          module_id: string
          youtube_playlist_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          module_id: string
          youtube_playlist_id: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          module_id?: string
          youtube_playlist_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliate_bonus_percent: number
          avatar_url: string | null
          created_at: string
          email: string
          free_modules_credit: number
          full_name: string | null
          id: string
          is_blocked: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          affiliate_bonus_percent?: number
          avatar_url?: string | null
          created_at?: string
          email: string
          free_modules_credit?: number
          full_name?: string | null
          id: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_bonus_percent?: number
          avatar_url?: string | null
          created_at?: string
          email?: string
          free_modules_credit?: number
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_partner_id: string | null
          phone: string | null
          social_links: Json
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_partner_id?: string | null
          phone?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_partner_id?: string | null
          phone?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_owner_partner_id_fkey"
            columns: ["owner_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      unlocked_modules: {
        Row: {
          id: string
          module_id: string
          payment_id: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          module_id: string
          payment_id?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          module_id?: string
          payment_id?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlocked_modules_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_discounts: {
        Row: {
          created_at: string
          id: string
          percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          module_id: string
          playlist_id: string | null
          position: number
          thumbnail_url: string | null
          title: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id: string
          playlist_id?: string | null
          position?: number
          thumbnail_url?: string | null
          title: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id?: string
          playlist_id?: string | null
          position?: number
          thumbnail_url?: string | null
          title?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_lesson_file: { Args: { _object_name: string }; Returns: boolean }
      get_user_badge: { Args: { _user_id: string }; Returns: string }
      has_formation_content_access: {
        Args: { _formation_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      module_preview_stats: {
        Args: { _formation_id: string }
        Returns: {
          module_id: string
          total_seconds: number
          videos_count: number
        }[]
      }
      owns_formation: { Args: { _formation_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client" | "formateur" | "recruteur"
      notification_type:
        | "payment_validated"
        | "payment_rejected"
        | "new_module"
        | "new_video"
        | "new_message"
        | "new_announcement"
        | "account_blocked"
        | "account_unblocked"
        | "general"
      payment_method_type: "mvola" | "orange_money" | "binance"
      payment_status: "pending" | "validated" | "rejected"
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
      app_role: ["admin", "client", "formateur", "recruteur"],
      notification_type: [
        "payment_validated",
        "payment_rejected",
        "new_module",
        "new_video",
        "new_message",
        "new_announcement",
        "account_blocked",
        "account_unblocked",
        "general",
      ],
      payment_method_type: ["mvola", "orange_money", "binance"],
      payment_status: ["pending", "validated", "rejected"],
    },
  },
} as const
