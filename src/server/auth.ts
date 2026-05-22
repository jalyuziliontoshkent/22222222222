import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { queryOne } from "@/server/db";
import type { User, UserRole } from "@/types/app";

const JWT_ALGORITHM = "HS256";

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function getJwtSecret() {
  return process.env.JWT_SECRET || "change-me";
}

export function createAccessToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: "7d",
    },
  );
}

export function decodeAccessToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as {
    sub: string;
    email: string;
    role: UserRole;
    type: string;
  };
}

export function normalizeUser(row: any): User {
  return {
    ...row,
    id: String(row.id),
    credit_limit: Number(row.credit_limit || 0),
    debt: Number(row.debt || 0),
  };
}

export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Not authenticated");
  }

  try {
    const payload = decodeAccessToken(authHeader.slice(7));
    const row = await queryOne("SELECT * FROM users WHERE id = $1", [Number(payload.sub)]);
    if (!row) {
      throw new Error("User not found");
    }
    const user = normalizeUser(row);
    delete (user as any).password_hash;
    return user;
  } catch {
    throw new Error("Invalid token");
  }
}

export async function requireRole(request: Request, role?: UserRole) {
  const user = await getUserFromRequest(request);
  if (role && user.role !== role) {
    throw new Error("Forbidden");
  }
  return user;
}
