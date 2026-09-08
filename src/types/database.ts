// ==============================================================================
// Maison MIPA Memories - Database Schema Types for Supabase
// ==============================================================================

export type DatabaseRole = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type DatabaseStaffRole = 'PHOTOGRAPHER' | 'MAKEUP' | 'EDITOR' | 'RECEPTIONIST' | 'MANAGER' | 'ADMIN';
export type DatabaseProfileStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';

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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
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
