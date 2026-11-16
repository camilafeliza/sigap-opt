// RBAC User & Auth Types (GEMINI.md SSOT)
export type UserRole = 'petani' | 'superadmin';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  username: string;
  password_hash?: string;
  password?: string;
}
