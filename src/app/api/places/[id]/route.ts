import { NextRequest, NextResponse } from 'next/server';
import { getPlaceDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sp = req.nextUrl.searchParams;
    const visitorId = sp.get('visitorId') || req.headers.get('x-visitor-id') || undefined;
    const latRaw = sp.get('lat');
    const lngRaw = sp.get('lng');
    const userLat = latRaw ? Number(latRaw) : undefined;
    const userLng = lngRaw ? Number(lngRaw) : undefined;

    const detail = getPlaceDetail(
      id,
      visitorId,
      Number.isFinite(userLat) ? userLat : undefined,
      Number.isFinite(userLng) ? userLng : undefined
    );

    if (!detail) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error('GET /api/places/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to load place details' }, { status: 500 });
  }
}
