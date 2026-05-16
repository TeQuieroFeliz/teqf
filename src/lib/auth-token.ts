import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SiteTokenPayload extends JWTPayload {
  role: 'visitor';
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function signToken(): Promise<string> {
  return new SignJWT({ role: 'visitor' } satisfies Omit<SiteTokenPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify<SiteTokenPayload>(token, secret());
    return true;
  } catch {
    return false;
  }
}
