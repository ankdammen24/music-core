export type UserRole = 'listener' | 'artist' | 'admin';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface SafeUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}
