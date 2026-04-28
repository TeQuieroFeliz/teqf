import { seedSuperAdmin } from '@/actions/admin/seed-superadmin';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await seedSuperAdmin();
  return NextResponse.json(result);
}
