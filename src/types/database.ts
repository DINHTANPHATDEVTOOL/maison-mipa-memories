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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          payment_type?: 'DEPOSIT' | 'FULL_PAYMENT' | 'ADDON' | 'REMAINING';
          method?: 'BANK_TRANSFER' | 'VIETQR' | 'MOMO' | 'CASH' | 'CARD';
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          payment_type?: 'DEPOSIT' | 'FULL_PAYMENT' | 'ADDON' | 'REMAINING';
          method?: 'BANK_TRANSFER' | 'VIETQR' | 'MOMO' | 'CASH' | 'CARD';
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_role: {
        Args: Record<PropertyKey, never>;
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

export type PaymentStatus = PaymentRow['status'];
export type PaymentMethod = PaymentRow['method'];
export type PaymentType = PaymentRow['payment_type'];
export type OtpPurpose = OtpChallengeRow['purpose'];

