// ==============================================================================
// Maison MIPA Memories - Database Schema Types for Supabase
// ==============================================================================

export type DatabaseRole = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type DatabaseStaffRole = 'PHOTOGRAPHER' | 'MAKEUP' | 'EDITOR' | 'RECEPTIONIST' | 'MANAGER' | 'ADMIN';
export type DatabaseProfileStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';

export type DatabaseBookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'DEPOSIT_PAID'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'SHOOTING'
  | 'SHOOT_COMPLETED'
  | 'EDITING'
  | 'READY_FOR_REVIEW'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type DatabasePaymentStatus = 'UNPAID' | 'DEPOSIT_PAID' | 'FULLY_PAID' | 'REFUNDED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: DatabaseRole;
          staff_role: DatabaseStaffRole | null;
          avatar_url: string | null;
          status: DatabaseProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          phone?: string | null;
          role?: DatabaseRole;
          staff_role?: DatabaseStaffRole | null;
          avatar_url?: string | null;
          status?: DatabaseProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: DatabaseRole;
          staff_role?: DatabaseStaffRole | null;
          avatar_url?: string | null;
          status?: DatabaseProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          image: string | null;
          badge: string | null;
          active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          image?: string | null;
          badge?: string | null;
          active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          image?: string | null;
          badge?: string | null;
          active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          service_id: string;
          slug: string;
          name: string;
          description: string | null;
          price: number;
          deposit_amount: number;
          duration_minutes: number;
          concepts_count: number;
          edited_photos_count: number;
          features: unknown;
          recommended: boolean;
          popular_tag: string | null;
          active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          slug: string;
          name: string;
          description?: string | null;
          price: number;
          deposit_amount: number;
          duration_minutes: number;
          concepts_count?: number;
          edited_photos_count?: number;
          features?: unknown;
          recommended?: boolean;
          popular_tag?: string | null;
          active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          price?: number;
          deposit_amount?: number;
          duration_minutes?: number;
          concepts_count?: number;
          edited_photos_count?: number;
          features?: unknown;
          recommended?: boolean;
          popular_tag?: string | null;
          active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'packages_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          }
        ];
      };
      addons: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          category: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          price: number;
          duration_minutes?: number;
          category: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          category?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      studio_rooms: {
        Row: {
          id: string;
          slug: string;
          code: string;
          name: string;
          description: string | null;
          image: string | null;
          capacity: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          code: string;
          name: string;
          description?: string | null;
          image?: string | null;
          capacity?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          code?: string;
          name?: string;
          description?: string | null;
          image?: string | null;
          capacity?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          staff_role: DatabaseStaffRole;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          skills: unknown;
          rating: number;
          total_sessions: number;
          active: boolean;
          shift_schedule: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          staff_role: DatabaseStaffRole;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          skills?: unknown;
          rating?: number;
          total_sessions?: number;
          active?: boolean;
          shift_schedule?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_role?: DatabaseStaffRole;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          skills?: unknown;
          rating?: number;
          total_sessions?: number;
          active?: boolean;
          shift_schedule?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_id_fkey';
            columns: ['id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      promotions: {
        Row: {
          id: string;
          code: string;
          discount_percent: number;
          discount_amount: number;
          min_order: number;
          max_discount: number | null;
          start_at: string | null;
          end_at: string | null;
          usage_limit: number;
          usage_count: number;
          applicable_service_id: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_percent?: number;
          discount_amount?: number;
          min_order?: number;
          max_discount?: number | null;
          start_at?: string | null;
          end_at?: string | null;
          usage_limit?: number;
          usage_count?: number;
          applicable_service_id?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_percent?: number;
          discount_amount?: number;
          min_order?: number;
          max_discount?: number | null;
          start_at?: string | null;
          end_at?: string | null;
          usage_limit?: number;
          usage_count?: number;
          applicable_service_id?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'promotions_applicable_service_id_fkey';
            columns: ['applicable_service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          booking_code: string;
          customer_id: string;
          service_id: string;
          package_id: string;
          studio_room_id: string;
          start_at: string;
          end_at: string;
          booking_status: DatabaseBookingStatus;
          payment_status: DatabasePaymentStatus;
          subtotal: number;
          addon_total: number;
          discount_total: number;
          total_amount: number;
          deposit_amount: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          occasion: string | null;
          customer_note: string | null;
          staff_note: string | null;
          concept_id?: string | null;
          drive_folder_url?: string | null;
          drive_delivery_ready_at?: string | null;
          customer_schedule_confirmed_at?: string | null;
          customer_shoot_ack_at?: string | null;
          cancel_requested_at?: string | null;
          reschedule_requested_at?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_code: string;
          customer_id: string;
          service_id: string;
          package_id: string;
          studio_room_id: string;
          start_at: string;
          end_at: string;
          booking_status?: DatabaseBookingStatus;
          payment_status?: DatabasePaymentStatus;
          subtotal: number;
          addon_total?: number;
          discount_total?: number;
          total_amount: number;
          deposit_amount: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          occasion?: string | null;
          customer_note?: string | null;
          staff_note?: string | null;
          concept_id?: string | null;
          drive_folder_url?: string | null;
          drive_delivery_ready_at?: string | null;
          customer_schedule_confirmed_at?: string | null;
          customer_shoot_ack_at?: string | null;
          cancel_requested_at?: string | null;
          reschedule_requested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_code?: string;
          customer_id?: string;
          service_id?: string;
          package_id?: string;
          studio_room_id?: string;
          start_at?: string;
          end_at?: string;
          booking_status?: DatabaseBookingStatus;
          payment_status?: DatabasePaymentStatus;
          subtotal?: number;
          addon_total?: number;
          discount_total?: number;
          total_amount?: number;
          deposit_amount?: number;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string;
          occasion?: string | null;
          customer_note?: string | null;
          staff_note?: string | null;
          concept_id?: string | null;
          drive_folder_url?: string | null;
          drive_delivery_ready_at?: string | null;
          customer_schedule_confirmed_at?: string | null;
          customer_shoot_ack_at?: string | null;
          cancel_requested_at?: string | null;
          reschedule_requested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_package_id_fkey';
            columns: ['package_id'];
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_studio_room_id_fkey';
            columns: ['studio_room_id'];
            referencedRelation: 'studio_rooms';
            referencedColumns: ['id'];
          }
        ];
      };
      booking_addons: {
        Row: {
          id: string;
          booking_id: string;
          addon_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          addon_id: string;
          quantity?: number;
          unit_price: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          addon_id?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_addons_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_addons_addon_id_fkey';
            columns: ['addon_id'];
            referencedRelation: 'addons';
            referencedColumns: ['id'];
          }
        ];
      };
      booking_assignments: {
        Row: {
          id: string;
          booking_id: string;
          employee_id: string;
          assignment_role: DatabaseStaffRole;
          start_at: string;
          end_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          employee_id: string;
          assignment_role: DatabaseStaffRole;
          start_at: string;
          end_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          employee_id?: string;
          assignment_role?: DatabaseStaffRole;
          start_at?: string;
          end_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_assignments_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_assignments_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_data: unknown;
          new_data: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_data?: unknown;
          new_data?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          old_data?: unknown;
          new_data?: unknown;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey';
            columns: ['actor_user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      otp_challenges: {
        Row: {
          id: string;
          phone: string;
          phone_hash: string;
          purpose: 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE' | 'SENSITIVE_ACTION';
          otp_hash: string;
          expires_at: string;
          attempts: number;
          max_attempts: number;
          resend_after: string;
          consumed_at: string | null;
          ip_fingerprint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          phone_hash: string;
          purpose: 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE' | 'SENSITIVE_ACTION';
          otp_hash: string;
          expires_at?: string;
          attempts?: number;
          max_attempts?: number;
          resend_after?: string;
          consumed_at?: string | null;
          ip_fingerprint?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          phone_hash?: string;
          purpose?: 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE' | 'SENSITIVE_ACTION';
          otp_hash?: string;
          expires_at?: string;
          attempts?: number;
          max_attempts?: number;
          resend_after?: string;
          consumed_at?: string | null;
          ip_fingerprint?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          payment_type: 'DEPOSIT' | 'FULL_PAYMENT' | 'ADDON' | 'REMAINING';
          method: 'BANK_TRANSFER' | 'VIETQR' | 'MOMO' | 'CASH' | 'CARD';
          payment_method?: string | null;
          status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
          amount: number;
          currency: string;
          provider: string;
          provider_reference: string | null;
          idempotency_key: string | null;
          transfer_reference: string;
          transfer_submitted_at: string | null;
          paid_at: string | null;
          failed_at: string | null;
          expired_at: string | null;
          refunded_at: string | null;
          metadata: unknown;
          qr_code_url?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          payment_type?: 'DEPOSIT' | 'FULL_PAYMENT' | 'ADDON' | 'REMAINING';
          method?: 'BANK_TRANSFER' | 'VIETQR' | 'MOMO' | 'CASH' | 'CARD';
          payment_method?: string | null;
          status?: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
          amount: number;
          currency?: string;
          provider?: string;
          provider_reference?: string | null;
          idempotency_key?: string | null;
          transfer_reference: string;
          transfer_submitted_at?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          expired_at?: string | null;
          refunded_at?: string | null;
          metadata?: unknown;
          qr_code_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          payment_type?: 'DEPOSIT' | 'FULL_PAYMENT' | 'ADDON' | 'REMAINING';
          method?: 'BANK_TRANSFER' | 'VIETQR' | 'MOMO' | 'CASH' | 'CARD';
          payment_method?: string | null;
          status?: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
          amount?: number;
          currency?: string;
          provider?: string;
          provider_reference?: string | null;
          idempotency_key?: string | null;
          transfer_reference?: string;
          transfer_submitted_at?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          expired_at?: string | null;
          refunded_at?: string | null;
          metadata?: unknown;
          qr_code_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      payment_settings: {
        Row: {
          id: string;
          bank_code: string;
          bank_bin: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          branch: string | null;
          qr_template: string;
          active: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bank_code: string;
          bank_bin: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          branch?: string | null;
          qr_template?: string;
          active?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          bank_code?: string;
          bank_bin?: string;
          bank_name?: string;
          account_number?: string;
          account_name?: string;
          branch?: string | null;
          qr_template?: string;
          active?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          id: string;
          event_type: string;
          recipient_user_id: string | null;
          recipient_email: string;
          entity_type: string;
          entity_id: string;
          template_key: string;
          payload: Record<string, unknown>;
          status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
          attempts: number;
          max_attempts: number;
          next_attempt_at: string;
          provider_message_id: string | null;
          last_error: string | null;
          idempotency_key: string;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          event_type: string;
          recipient_user_id?: string | null;
          recipient_email: string;
          entity_type: string;
          entity_id: string;
          template_key: string;
          payload: Record<string, unknown>;
          status?: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          provider_message_id?: string | null;
          last_error?: string | null;
          idempotency_key: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          event_type?: string;
          recipient_user_id?: string | null;
          recipient_email?: string;
          entity_type?: string;
          entity_id?: string;
          template_key?: string;
          payload?: Record<string, unknown>;
          status?: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          provider_message_id?: string | null;
          last_error?: string | null;
          idempotency_key?: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      staff_tasks: {
        Row: {
          id: string;
          booking_id: string;
          employee_id: string;
          task_type: string;
          title: string;
          status: 'TODO' | 'IN_PROGRESS' | 'DONE';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          employee_id: string;
          task_type: string;
          title: string;
          status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          employee_id?: string;
          task_type?: string;
          title?: string;
          status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_tasks_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      concepts: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          cover_photo_id: string | null;
          service_id: string | null;
          active: boolean;
          bookable: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          cover_photo_id?: string | null;
          service_id?: string | null;
          active?: boolean;
          bookable?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          cover_photo_id?: string | null;
          service_id?: string | null;
          active?: boolean;
          bookable?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'concepts_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          }
        ];
      };
      portfolio_collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          concept_id: string | null;
          service_id: string | null;
          status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          featured: boolean;
          cover_photo_id: string | null;
          created_by: string | null;
          published_by: string | null;
          published_at: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          concept_id?: string | null;
          service_id?: string | null;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          featured?: boolean;
          cover_photo_id?: string | null;
          created_by?: string | null;
          published_by?: string | null;
          published_at?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          concept_id?: string | null;
          service_id?: string | null;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          featured?: boolean;
          cover_photo_id?: string | null;
          created_by?: string | null;
          published_by?: string | null;
          published_at?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_collections_concept_id_fkey';
            columns: ['concept_id'];
            referencedRelation: 'concepts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portfolio_collections_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          }
        ];
      };
      portfolio_photos: {
        Row: {
          id: string;
          collection_id: string;
          web_asset_key: string | null;
          url: string;
          filename: string;
          width: number;
          height: number;
          focal_x: number;
          focal_y: number;
          alt_text: string;
          caption: string | null;
          sort_order: number;
          featured: boolean;
          variants: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          web_asset_key?: string | null;
          url: string;
          filename: string;
          width?: number;
          height?: number;
          focal_x?: number;
          focal_y?: number;
          alt_text?: string;
          caption?: string | null;
          sort_order?: number;
          featured?: boolean;
          variants?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          web_asset_key?: string | null;
          url?: string;
          filename?: string;
          width?: number;
          height?: number;
          focal_x?: number;
          focal_y?: number;
          alt_text?: string;
          caption?: string | null;
          sort_order?: number;
          featured?: boolean;
          variants?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_photos_collection_id_fkey';
            columns: ['collection_id'];
            referencedRelation: 'portfolio_collections';
            referencedColumns: ['id'];
          }
        ];
      };
      booking_concepts: {
        Row: {
          booking_id: string;
          concept_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          booking_id: string;
          concept_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          booking_id?: string;
          concept_id?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_concepts_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_concepts_concept_id_fkey';
            columns: ['concept_id'];
            referencedRelation: 'concepts';
            referencedColumns: ['id'];
          }
        ];
      };
      root_owner_config: {
        Row: {
          id: boolean;
          owner_user_id: string;
          assigned_by: string | null;
          assigned_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          owner_user_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          owner_user_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_deliveries: {
        Row: {
          id: string;
          booking_id: string;
          provider: string;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          status: string;
          customer_permission_id: string | null;
          share_email: string | null;
          created_by: string | null;
          ready_by: string | null;
          revoked_by: string | null;
          created_at: string;
          updated_at: string;
          ready_at: string | null;
          revoked_at: string | null;
          last_reconciled_at: string | null;
          last_error: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          provider?: string;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          status?: string;
          customer_permission_id?: string | null;
          share_email?: string | null;
          created_by?: string | null;
          ready_by?: string | null;
          revoked_by?: string | null;
          created_at?: string;
          updated_at?: string;
          ready_at?: string | null;
          revoked_at?: string | null;
          last_reconciled_at?: string | null;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          provider?: string;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          status?: string;
          customer_permission_id?: string | null;
          share_email?: string | null;
          created_by?: string | null;
          ready_by?: string | null;
          revoked_by?: string | null;
          created_at?: string;
          updated_at?: string;
          ready_at?: string | null;
          revoked_at?: string | null;
          last_reconciled_at?: string | null;
          last_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_deliveries_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      google_drive_oauth_states: {
        Row: {
          state: string;
          created_by: string | null;
          redirect_uri: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          state: string;
          created_by?: string | null;
          redirect_uri: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          state?: string;
          created_by?: string | null;
          redirect_uri?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      google_drive_integrations: {
        Row: {
          id: string;
          account_email: string | null;
          root_folder_id: string | null;
          refresh_token: string;
          is_active: boolean;
          connected_by: string | null;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_email?: string | null;
          root_folder_id?: string | null;
          refresh_token: string;
          is_active?: boolean;
          connected_by?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_email?: string | null;
          root_folder_id?: string | null;
          refresh_token?: string;
          is_active?: boolean;
          connected_by?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_root_owner: {
        Args: {
          p_user_id?: string | null;
        };
        Returns: boolean;
      };
      get_auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_booking_delivery_secure: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      enqueue_drive_delivery_email: {
        Args: {
          p_booking_id: string;
          p_actor_id?: string | null;
        };
        Returns: string;
      };
      create_booking: {
        Args: {
          p_service_id: string;
          p_package_id: string;
          p_studio_room_id: string;
          p_start_at: string;
          p_addon_ids?: string[];
          p_voucher_code?: string | null;
          p_customer_name?: string | null;
          p_customer_phone?: string | null;
          p_customer_email?: string | null;
          p_occasion?: string | null;
          p_customer_note?: string | null;
          p_concept_ids?: string[];
        };
        Returns: unknown;
      };
      publish_portfolio_collection: {
        Args: {
          p_collection_id: string;
          p_publish: boolean;
        };
        Returns: unknown;
      };
      update_booking_status: {
        Args: {
          p_booking_id: string;
          p_new_status: string;
          p_staff_note?: string | null;
        };
        Returns: unknown;
      };
      assign_booking_staff: {
        Args: {
          p_booking_id: string;
          p_employee_id: string;
          p_assignment_role: string;
          p_start_at?: string | null;
          p_end_at?: string | null;
        };
        Returns: unknown;
      };
      create_deposit_payment: {
        Args: {
          p_booking_id: string;
          p_method?: string;
        };
        Returns: unknown;
      };
      get_studio_booked_slots: {
        Args: {
          p_studio_room_id: string;
          p_date: string;
        };
        Returns: {
          start_at: string;
          end_at: string;
        }[];
      };
      mark_transfer_submitted: {
        Args: {
          p_payment_id: string;
        };
        Returns: unknown;
      };
      confirm_manual_payment: {
        Args: {
          p_payment_id: string;
          p_note?: string | null;
        };
        Returns: unknown;
      };
      admin_save_payment_settings: {
        Args: {
          p_bank_code: string;
          p_bank_bin: string;
          p_bank_name: string;
          p_account_number: string;
          p_account_name: string;
          p_branch?: string | null;
          p_qr_template?: string;
        };
        Returns: unknown;
      };
      admin_update_user_role_and_status: {
        Args: {
          p_user_id: string;
          p_new_role: string;
          p_new_staff_role?: string | null;
          p_new_status?: string;
        };
        Returns: unknown;
      };
      admin_update_user_role: {
        Args: {
          p_target_user_id: string;
          p_new_role: string;
          p_new_staff_role?: string | null;
        };
        Returns: unknown;
      };
      admin_update_user_status: {
        Args: {
          p_target_user_id: string;
          p_new_status: string;
        };
        Returns: unknown;
      };
      acknowledge_customer_schedule: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      acknowledge_customer_shoot: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      request_booking_reschedule: {
        Args: {
          p_booking_id: string;
          p_new_date: string;
          p_new_slot: string;
          p_reason?: string | null;
        };
        Returns: unknown;
      };
      request_booking_cancel: {
        Args: {
          p_booking_id: string;
          p_reason?: string | null;
        };
        Returns: unknown;
      };
      update_staff_task_status: {
        Args: {
          p_task_id: string;
          p_new_status: string;
          p_notes?: string | null;
        };
        Returns: unknown;
      };
    };
    Enums: {
      user_role: DatabaseRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type ServiceRow = Database['public']['Tables']['services']['Row'];
export type PackageRow = Database['public']['Tables']['packages']['Row'];
export type AddonRow = Database['public']['Tables']['addons']['Row'];
export type StudioRoomRow = Database['public']['Tables']['studio_rooms']['Row'];
export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type PromotionRow = Database['public']['Tables']['promotions']['Row'];
export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type BookingAddonRow = Database['public']['Tables']['booking_addons']['Row'];
export type BookingAssignmentRow = Database['public']['Tables']['booking_assignments']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type OtpChallengeRow = Database['public']['Tables']['otp_challenges']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type PaymentSettingsRow = Database['public']['Tables']['payment_settings']['Row'];
export type NotificationOutboxRow = Database['public']['Tables']['notification_outbox']['Row'];
export type StaffTaskRow = Database['public']['Tables']['staff_tasks']['Row'];

export type ConceptRow = Database['public']['Tables']['concepts']['Row'];
export type ConceptInsert = Database['public']['Tables']['concepts']['Insert'];
export type ConceptUpdate = Database['public']['Tables']['concepts']['Update'];

export type PortfolioCollectionRow = Database['public']['Tables']['portfolio_collections']['Row'];
export type PortfolioCollectionInsert = Database['public']['Tables']['portfolio_collections']['Insert'];
export type PortfolioCollectionUpdate = Database['public']['Tables']['portfolio_collections']['Update'];

export type PortfolioPhotoRow = Database['public']['Tables']['portfolio_photos']['Row'];
export type PortfolioPhotoInsert = Database['public']['Tables']['portfolio_photos']['Insert'];
export type PortfolioPhotoUpdate = Database['public']['Tables']['portfolio_photos']['Update'];

export type BookingConceptRow = Database['public']['Tables']['booking_concepts']['Row'];
export type RootOwnerConfigRow = Database['public']['Tables']['root_owner_config']['Row'];

export type PaymentStatus = PaymentRow['status'];
export type PaymentMethod = PaymentRow['method'];
export type PaymentType = PaymentRow['payment_type'];
export type OtpPurpose = OtpChallengeRow['purpose'];

