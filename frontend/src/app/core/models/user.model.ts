export type UserRole =
  | 'platform_admin'
  | 'distributor_admin'
  | 'superviseur'
  | 'prevendeur'
  // Legacy/old role names for backward compatibility
  | 'admin'
  | 'prevender';

export interface User {
  id: number;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  distributor_id?: number | null;
  employe_code?: string | null;
  nom_distributeur?: string | null;
  created_at: string;
}

export interface UserCreate {
  phone: string;
  full_name: string;
  password: string;
  role: UserRole;
  distributor_id?: number | null;
  employe_code?: string | null;
  nom_distributeur?: string | null;
}

export interface UserUpdate {
  full_name?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
  distributor_id?: number | null;
  employe_code?: string | null;
  nom_distributeur?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
