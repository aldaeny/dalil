import { NextRequest, NextResponse } from 'next/server';
import { addReview } from '@/lib/db';
import type { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const authorName = String(body.authorName || '').trim();
    const comment = String(body.comment || '').trim();
    const rating = Number(body.rating);
    const visitType = (body.visitType || 'family') as Review['visitType'];

    if (!authorName || !comment) {
      return NextResponse.json({ error: 'Name and comment are required' }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const result = addReview(id, { authorName, rating, comment, visitType });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Place not found') {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    console.error('POST /api/places/[id]/reviews failed:', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
