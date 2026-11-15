import { NextRequest, NextResponse } from 'next/server';
import { addFuelReport } from '@/lib/db';
import type { FuelType, QueueStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const queueStatus = body.queueStatus as QueueStatus;
    if (!['quiet', 'moderate', 'busy'].includes(queueStatus)) {
      return NextResponse.json({ error: 'Invalid queue status' }, { status: 400 });
    }

    const fuelAvailable = Array.isArray(body.fuelAvailable)
      ? (body.fuelAvailable.filter((f: string) =>
          ['regular', 'improved', 'super', 'lpg', 'diesel'].includes(f)
        ) as FuelType[])
      : [];

    const result = addFuelReport(id, {
      queueStatus,
      fuelAvailable,
      note: body.note ? String(body.note) : '',
      reporterName: body.reporterName ? String(body.reporterName) : '',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Place not found') {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    console.error('POST /api/places/[id]/fuel-report failed:', err);
    return NextResponse.json({ error: 'Failed to update station status' }, { status: 500 });
  }
}
