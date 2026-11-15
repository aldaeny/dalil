import { NextRequest, NextResponse } from 'next/server';
import { createPlace, listPlaces } from '@/lib/db';
import { CATEGORY_MAP } from '@/lib/categories';
import type { CategorySlug, CitySlug, FuelType, SortOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = (sp.get('category') || 'all') as CategorySlug | 'all';
    const city = (sp.get('city') || 'all') as CitySlug | 'all';
    const district = sp.get('district') || 'all';
    const q = sp.get('q') || '';
    const openNow = sp.get('openNow') === 'true';
    const hours24 = sp.get('hours24') === 'true';
    const favoritesOnly = sp.get('favoritesOnly') === 'true';
    const fuelType = (sp.get('fuelType') || 'all') as FuelType | 'all';
    const sort = (sp.get('sort') || 'featured') as SortOption;
    const amenitiesParam = sp.get('amenities') || '';
    const amenities = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : [];
    const visitorId = sp.get('visitorId') || req.headers.get('x-visitor-id') || undefined;

    const latRaw = sp.get('lat');
    const lngRaw = sp.get('lng');
    const userLat = latRaw ? Number(latRaw) : undefined;
    const userLng = lngRaw ? Number(lngRaw) : undefined;

    const data = listPlaces({
      category,
      city,
      district,
      q,
      openNow,
      hours24,
      favoritesOnly,
      fuelType,
      amenities,
      sort,
      visitorId,
      userLat: Number.isFinite(userLat) ? userLat : undefined,
      userLng: Number.isFinite(userLng) ? userLng : undefined,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/places failed:', err);
    return NextResponse.json({ error: 'Failed to load places' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const category = body.category as CategorySlug;
    if (!category || !CATEGORY_MAP[category]) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 });
    }
    if (!body.nameAr || typeof body.nameAr !== 'string' || !body.nameAr.trim()) {
      return NextResponse.json({ error: 'Arabic name is required' }, { status: 400 });
    }
    if (!body.districtAr || !body.addressAr) {
      return NextResponse.json({ error: 'District and address are required' }, { status: 400 });
    }

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Valid map coordinates are required' }, { status: 400 });
    }

    const created = createPlace({
      category,
      city: (body.city || 'baghdad') as CitySlug,
      districtAr: String(body.districtAr),
      districtEn: String(body.districtEn || body.districtAr),
      nameAr: String(body.nameAr),
      nameEn: body.nameEn ? String(body.nameEn) : undefined,
      descriptionAr: String(body.descriptionAr || body.nameAr),
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : undefined,
      addressAr: String(body.addressAr),
      addressEn: body.addressEn ? String(body.addressEn) : undefined,
      lat,
      lng,
      phone: body.phone ? String(body.phone) : '',
      priceLevel: ([1, 2, 3].includes(Number(body.priceLevel)) ? Number(body.priceLevel) : 2) as 1 | 2 | 3,
      is24Hours: Boolean(body.is24Hours),
      openTime: String(body.openTime || '09:00'),
      closeTime: String(body.closeTime || '23:00'),
      imageUrl: String(body.imageUrl || CATEGORY_MAP[category].defaultImage),
      amenities: Array.isArray(body.amenities) ? body.amenities.map(String) : [],
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    });

    return NextResponse.json({ place: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/places failed:', err);
    return NextResponse.json({ error: 'Failed to create place' }, { status: 500 });
  }
}
