export type UserRole = "Admin" | "Member";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: UserRole;
}
