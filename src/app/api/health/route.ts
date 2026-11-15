import { NextResponse } from 'next/server';
import { getHealthStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = getHealthStats();
    return NextResponse.json(health);
  } catch (err) {
    console.error('Health check failed:', err);
    return NextResponse.json({ status: 'error', message: 'Database unavailable' }, { status: 500 });
  }
}
