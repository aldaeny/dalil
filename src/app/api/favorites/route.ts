import { NextRequest, NextResponse } from 'next/server';
import { getFavorites, toggleFavorite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.nextUrl.searchParams.get('visitorId') || req.headers.get('x-visitor-id');
    if (!visitorId) {
      return NextResponse.json({ favorites: [] });
    }
    return NextResponse.json({ favorites: getFavorites(visitorId) });
  } catch (err) {
    console.error('GET /api/favorites failed:', err);
    return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = String(body.visitorId || req.headers.get('x-visitor-id') || '').trim();
    const placeId = String(body.placeId || '').trim();

    if (!visitorId || !placeId) {
      return NextResponse.json({ error: 'visitorId and placeId are required' }, { status: 400 });
    }

    const result = toggleFavorite(visitorId, placeId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/favorites failed:', err);
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 });
  }
}
