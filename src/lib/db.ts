import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_FUEL_REPORTS, SEED_PLACES, SEED_REVIEWS } from './seed-data';
import type {
  CategorySlug,
  CitySlug,
  FuelReport,
  FuelType,
  Place,
  PlaceMetadata,
  QueueStatus,
  Review,
  SortOption,
} from './types';
import { haversineDistanceKm, isPlaceOpenNow } from './utils';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dalil.db');

declare global {
  var __dalilDb: DatabaseSync | undefined;
  var __dalilDbInitialized: boolean | undefined;
}

function getDb(): DatabaseSync {
  if (!globalThis.__dalilDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    globalThis.__dalilDb = db;
  }

  if (!globalThis.__dalilDbInitialized) {
    initializeAndSeed(globalThis.__dalilDb);
    globalThis.__dalilDbInitialized = true;
  }

  return globalThis.__dalilDb;
}

function initializeAndSeed(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      district_ar TEXT NOT NULL,
      district_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      description_en TEXT NOT NULL,
      address_ar TEXT NOT NULL,
      address_en TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      price_level INTEGER NOT NULL DEFAULT 2,
      is_24_hours INTEGER NOT NULL DEFAULT 0,
      open_time TEXT NOT NULL DEFAULT '09:00',
      close_time TEXT NOT NULL DEFAULT '23:00',
      image_url TEXT NOT NULL,
      amenities_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      verified INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      rating_avg REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
    CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);
    CREATE INDEX IF NOT EXISTS idx_places_featured ON places(featured);

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      visit_type TEXT NOT NULL DEFAULT 'family',
      created_at TEXT NOT NULL,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);

    CREATE TABLE IF NOT EXISTS favorites (
      visitor_id TEXT NOT NULL,
      place_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (visitor_id, place_id),
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fuel_reports (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL,
      queue_status TEXT NOT NULL,
      fuel_available_json TEXT NOT NULL DEFAULT '[]',
      note TEXT NOT NULL DEFAULT '',
      reporter_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fuel_reports_place_id ON fuel_reports(place_id);
  `);

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM places').get() as { cnt: number };
  if (countRow.cnt === 0) {
    const nowIso = new Date().toISOString();

    const insertPlace = db.prepare(`
      INSERT INTO places (
        id, slug, category, city, district_ar, district_en,
        name_ar, name_en, description_ar, description_en,
        address_ar, address_en, lat, lng, phone, price_level,
        is_24_hours, open_time, close_time, image_url,
        amenities_json, metadata_json, verified, featured,
        rating_avg, review_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReview = db.prepare(`
      INSERT INTO reviews (id, place_id, author_name, rating, comment, visit_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFuelReport = db.prepare(`
      INSERT INTO fuel_reports (id, place_id, queue_status, fuel_available_json, note, reporter_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN;');
    try {
      for (let i = 0; i < SEED_PLACES.length; i++) {
        const p = SEED_PLACES[i];
        const reviewsForPlace = SEED_REVIEWS.filter((r) => r.placeId === p.id);
        const reviewCount = reviewsForPlace.length;
        const ratingAvg =
          reviewCount > 0
            ? Math.round((reviewsForPlace.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
            : 0;

        insertPlace.run(
          p.id,
          p.slug,
          p.category,
          p.city,
          p.districtAr,
          p.districtEn,
          p.nameAr,
          p.nameEn,
          p.descriptionAr,
          p.descriptionEn,
          p.addressAr,
          p.addressEn,
          p.lat,
          p.lng,
          p.phone,
          p.priceLevel,
          p.is24Hours ? 1 : 0,
          p.openTime,
          p.closeTime,
          p.imageUrl,
          JSON.stringify(p.amenities),
          JSON.stringify(p.metadata),
          p.verified ? 1 : 0,
          p.featured ? 1 : 0,
          ratingAvg,
          reviewCount,
          new Date(Date.now() - i * 3600_000).toISOString()
        );
      }

      for (let i = 0; i < SEED_REVIEWS.length; i++) {
        const r = SEED_REVIEWS[i];
        insertReview.run(
          r.id,
          r.placeId,
          r.authorName,
          r.rating,
          r.comment,
          r.visitType,
          new Date(Date.now() - (i + 1) * 7200_000).toISOString()
        );
      }

      for (let i = 0; i < SEED_FUEL_REPORTS.length; i++) {
        const f = SEED_FUEL_REPORTS[i];
        insertFuelReport.run(
          f.id,
          f.placeId,
          f.queueStatus,
          JSON.stringify(f.fuelAvailable),
          f.note,
          f.reporterName,
          new Date(Date.now() - (i + 1) * 900_000).toISOString()
        );
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
    void nowIso;
  }
}

interface PlaceRow {
  id: string;
  slug: string;
  category: string;
  city: string;
  district_ar: string;
  district_en: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  address_ar: string;
  address_en: string;
  lat: number;
  lng: number;
  phone: string;
  price_level: number;
  is_24_hours: number;
  open_time: string;
  close_time: string;
  image_url: string;
  amenities_json: string;
  metadata_json: string;
  verified: number;
  featured: number;
  rating_avg: number;
  review_count: number;
  created_at: string;
}

function mapPlaceRow(row: PlaceRow): Place {
  let amenities: string[] = [];
  let metadata: PlaceMetadata = {};
  try {
    amenities = JSON.parse(row.amenities_json || '[]');
  } catch {
    amenities = [];
  }
  try {
    metadata = JSON.parse(row.metadata_json || '{}');
  } catch {
    metadata = {};
  }

  const place: Place = {
    id: row.id,
    slug: row.slug,
    category: row.category as CategorySlug,
    city: row.city as CitySlug,
    districtAr: row.district_ar,
    districtEn: row.district_en,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    addressAr: row.address_ar,
    addressEn: row.address_en,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    priceLevel: (row.price_level as 1 | 2 | 3) || 2,
    is24Hours: Boolean(row.is_24_hours),
    openTime: row.open_time,
    closeTime: row.close_time,
    imageUrl: row.image_url,
    amenities,
    metadata,
    verified: Boolean(row.verified),
    featured: Boolean(row.featured),
    ratingAvg: Number(row.rating_avg || 0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at,
  };

  place.isOpenNow = isPlaceOpenNow(place);
  return place;
}

export interface ListPlacesOptions {
  category?: CategorySlug | 'all';
  city?: CitySlug | 'all';
  district?: string;
  q?: string;
  openNow?: boolean;
  amenities?: string[];
  fuelType?: FuelType | 'all';
  hours24?: boolean;
  favoritesOnly?: boolean;
  visitorId?: string;
  sort?: SortOption;
  userLat?: number;
  userLng?: number;
}

export function listPlaces(options: ListPlacesOptions = {}) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM places').all() as unknown as PlaceRow[];
  const favSet = new Set<string>();

  if (options.visitorId) {
    const favRows = db
      .prepare('SELECT place_id FROM favorites WHERE visitor_id = ?')
      .all(options.visitorId) as unknown as { place_id: string }[];
    for (const f of favRows) favSet.add(f.place_id);
  }

  const allPlaces = rows.map((row) => {
    const place = mapPlaceRow(row);
    place.isFavorite = favSet.has(place.id);
    if (typeof options.userLat === 'number' && typeof options.userLng === 'number') {
      place.distanceKm = haversineDistanceKm(options.userLat, options.userLng, place.lat, place.lng);
    }
    return place;
  });

  // Base city/search/favorites filtering BEFORE category counts so counts reflect city/search context accurately
  const qNorm = (options.q || '').trim().toLowerCase();

  const matchesContext = (p: Place): boolean => {
    if (options.city && options.city !== 'all' && p.city !== options.city) return false;
    if (options.district && options.district !== 'all') {
      if (p.districtAr !== options.district && p.districtEn !== options.district) return false;
    }
    if (options.favoritesOnly && !p.isFavorite) return false;
    if (options.openNow && !p.isOpenNow) return false;
    if (options.hours24 && !p.is24Hours) return false;
    if (options.amenities && options.amenities.length > 0) {
      for (const am of options.amenities) {
        if (!p.amenities.includes(am)) return false;
      }
    }
    if (options.fuelType && options.fuelType !== 'all') {
      const fuels = p.metadata.fuelTypes || [];
      if (!fuels.includes(options.fuelType)) return false;
    }
    if (qNorm) {
      const haystack = [
        p.nameAr,
        p.nameEn,
        p.descriptionAr,
        p.descriptionEn,
        p.districtAr,
        p.districtEn,
        p.addressAr,
        p.addressEn,
        p.metadata.cuisineAr || '',
        p.metadata.cuisineEn || '',
        p.metadata.specialtyAr || '',
        p.metadata.specialtyEn || '',
        p.metadata.marketTypeAr || '',
        p.metadata.marketTypeEn || '',
        p.is24Hours ? '24 ساعة 24h' : '',
        ...(p.metadata.fuelTypes || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(qNorm)) return false;
    }
    return true;
  };

  const contextFiltered = allPlaces.filter(matchesContext);

  const countsByCategory: Record<CategorySlug | 'all', number> = {
    all: contextFiltered.length,
    restaurants: 0,
    cafes: 0,
    gas_stations: 0,
    entertainment: 0,
    markets: 0,
    malls: 0,
  };

  for (const p of contextFiltered) {
    countsByCategory[p.category] = (countsByCategory[p.category] || 0) + 1;
  }

  let result = contextFiltered;
  if (options.category && options.category !== 'all') {
    result = contextFiltered.filter((p) => p.category === options.category);
  }

  const sortBy = options.sort || 'featured';
  result = [...result].sort((a, b) => {
    if (sortBy === 'nearest') {
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    }
    if (sortBy === 'rating') {
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      return b.reviewCount - a.reviewCount;
    }
    if (sortBy === 'reviews') {
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return b.ratingAvg - a.ratingAvg;
    }
    if (sortBy === 'price_asc') {
      if (a.priceLevel !== b.priceLevel) return a.priceLevel - b.priceLevel;
      return b.ratingAvg - a.ratingAvg;
    }
    // featured default: open first -> featured -> higher rating -> reviews
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (Boolean(a.isOpenNow) !== Boolean(b.isOpenNow)) return a.isOpenNow ? -1 : 1;
    if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
    return b.reviewCount - a.reviewCount;
  });

  return {
    places: result,
    countsByCategory,
    total: result.length,
  };
}

export function getPlaceDetail(idOrSlug: string, visitorId?: string, userLat?: number, userLng?: number) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM places WHERE id = ? OR slug = ? LIMIT 1')
    .get(idOrSlug, idOrSlug) as unknown as PlaceRow | undefined;

  if (!row) return null;

  const place = mapPlaceRow(row);
  if (typeof userLat === 'number' && typeof userLng === 'number') {
    place.distanceKm = haversineDistanceKm(userLat, userLng, place.lat, place.lng);
  }

  if (visitorId) {
    const fav = db
      .prepare('SELECT 1 FROM favorites WHERE visitor_id = ? AND place_id = ?')
      .get(visitorId, place.id);
    place.isFavorite = Boolean(fav);
  }

  const reviewRows = db
    .prepare('SELECT * FROM reviews WHERE place_id = ? ORDER BY created_at DESC')
    .all(place.id) as unknown as {
    id: string;
    place_id: string;
    author_name: string;
    rating: number;
    comment: string;
    visit_type: string;
    created_at: string;
  }[];

  const reviews: Review[] = reviewRows.map((r) => ({
    id: r.id,
    placeId: r.place_id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    visitType: r.visit_type as Review['visitType'],
    createdAt: r.created_at,
  }));

  const fuelReportRows = db
    .prepare('SELECT * FROM fuel_reports WHERE place_id = ? ORDER BY created_at DESC LIMIT 8')
    .all(place.id) as unknown as {
    id: string;
    place_id: string;
    queue_status: string;
    fuel_available_json: string;
    note: string;
    reporter_name: string;
    created_at: string;
  }[];

  const fuelReports: FuelReport[] = fuelReportRows.map((f) => ({
    id: f.id,
    placeId: f.place_id,
    queueStatus: f.queue_status as QueueStatus,
    fuelAvailable: JSON.parse(f.fuel_available_json || '[]'),
    note: f.note,
    reporterName: f.reporter_name,
    createdAt: f.created_at,
  }));

  const nearbyRows = db
    .prepare('SELECT * FROM places WHERE city = ? AND id != ? LIMIT 12')
    .all(place.city, place.id) as unknown as PlaceRow[];

  const nearby = nearbyRows
    .map((nr) => {
      const np = mapPlaceRow(nr);
      np.distanceKm = haversineDistanceKm(place.lat, place.lng, np.lat, np.lng);
      return np;
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, 4);

  return { place, reviews, fuelReports, nearby };
}

export interface CreatePlaceInput {
  category: CategorySlug;
  city: CitySlug;
  districtAr: string;
  districtEn: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr: string;
  descriptionEn?: string;
  addressAr: string;
  addressEn?: string;
  lat: number;
  lng: number;
  phone?: string;
  priceLevel: 1 | 2 | 3;
  is24Hours: boolean;
  openTime: string;
  closeTime: string;
  imageUrl: string;
  amenities: string[];
  metadata: PlaceMetadata;
}

export function createPlace(input: CreatePlaceInput): Place {
  const db = getDb();
  const id = `place-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const baseSlug = (input.nameEn || input.nameAr)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = `${baseSlug || 'dalil-place'}-${id.slice(-5)}`;
  const nowIso = new Date().toISOString();

  const nameEn = input.nameEn?.trim() || input.nameAr.trim();
  const descriptionEn = input.descriptionEn?.trim() || input.descriptionAr.trim();
  const addressEn = input.addressEn?.trim() || input.addressAr.trim();

  db.prepare(`
    INSERT INTO places (
      id, slug, category, city, district_ar, district_en,
      name_ar, name_en, description_ar, description_en,
      address_ar, address_en, lat, lng, phone, price_level,
      is_24_hours, open_time, close_time, image_url,
      amenities_json, metadata_json, verified, featured,
      rating_avg, review_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    input.category,
    input.city,
    input.districtAr.trim(),
    input.districtEn.trim(),
    input.nameAr.trim(),
    nameEn,
    input.descriptionAr.trim(),
    descriptionEn,
    input.addressAr.trim(),
    addressEn,
    input.lat,
    input.lng,
    (input.phone || '').trim(),
    input.priceLevel,
    input.is24Hours ? 1 : 0,
    input.is24Hours ? '00:00' : input.openTime,
    input.is24Hours ? '23:59' : input.closeTime,
    input.imageUrl,
    JSON.stringify(input.amenities),
    JSON.stringify(input.metadata || {}),
    0, // user-submitted starts unverified badge
    0,
    0,
    0,
    nowIso
  );

  const row = db.prepare('SELECT * FROM places WHERE id = ?').get(id) as unknown as PlaceRow;
  return mapPlaceRow(row);
}

export function addReview(
  placeId: string,
  input: { authorName: string; rating: number; comment: string; visitType: Review['visitType'] }
): { review: Review; ratingAvg: number; reviewCount: number } {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM places WHERE id = ?').get(placeId);
  if (!existing) {
    throw new Error('Place not found');
  }

  const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  db.exec('BEGIN;');
  try {
    db.prepare(`
      INSERT INTO reviews (id, place_id, author_name, rating, comment, visit_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, placeId, input.authorName.trim(), rating, input.comment.trim(), input.visitType || 'family', nowIso);

    const stats = db
      .prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE place_id = ?')
      .get(placeId) as unknown as { avg_rating: number; cnt: number };

    const ratingAvg = Math.round((stats.avg_rating || 0) * 10) / 10;
    const reviewCount = stats.cnt || 0;

    db.prepare('UPDATE places SET rating_avg = ?, review_count = ? WHERE id = ?').run(ratingAvg, reviewCount, placeId);

    db.exec('COMMIT;');
    return {
      review: {
        id,
        placeId,
        authorName: input.authorName.trim(),
        rating,
        comment: input.comment.trim(),
        visitType: input.visitType || 'family',
        createdAt: nowIso,
      },
      ratingAvg,
      reviewCount,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function addFuelReport(
  placeId: string,
  input: { queueStatus: QueueStatus; fuelAvailable: FuelType[]; note?: string; reporterName?: string }
): { report: FuelReport; updatedPlace: Place } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId) as unknown as PlaceRow | undefined;
  if (!row) throw new Error('Place not found');

  const id = `fr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const reporterName = (input.reporterName || '').trim() || 'مستخدم دليل';
  const note = (input.note || '').trim();

  let currentMeta: PlaceMetadata = {};
  try {
    currentMeta = JSON.parse(row.metadata_json || '{}');
  } catch {
    currentMeta = {};
  }

  const nextMeta: PlaceMetadata = {
    ...currentMeta,
    queueStatus: input.queueStatus,
    fuelTypes: input.fuelAvailable.length > 0 ? input.fuelAvailable : currentMeta.fuelTypes,
    lastQueueUpdate: 'الآن',
  };

  db.exec('BEGIN;');
  try {
    db.prepare(`
      INSERT INTO fuel_reports (id, place_id, queue_status, fuel_available_json, note, reporter_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, placeId, input.queueStatus, JSON.stringify(input.fuelAvailable), note, reporterName, nowIso);

    db.prepare('UPDATE places SET metadata_json = ? WHERE id = ?').run(JSON.stringify(nextMeta), placeId);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const updatedRow = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId) as unknown as PlaceRow;
  return {
    report: {
      id,
      placeId,
      queueStatus: input.queueStatus,
      fuelAvailable: input.fuelAvailable,
      note,
      reporterName,
      createdAt: nowIso,
    },
    updatedPlace: mapPlaceRow(updatedRow),
  };
}

export function toggleFavorite(visitorId: string, placeId: string): { isFavorite: boolean; favorites: string[] } {
  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM favorites WHERE visitor_id = ? AND place_id = ?')
    .get(visitorId, placeId);

  if (exists) {
    db.prepare('DELETE FROM favorites WHERE visitor_id = ? AND place_id = ?').run(visitorId, placeId);
  } else {
    db.prepare('INSERT OR IGNORE INTO favorites (visitor_id, place_id, created_at) VALUES (?, ?, ?)').run(
      visitorId,
      placeId,
      new Date().toISOString()
    );
  }

  const favRows = db
    .prepare('SELECT place_id FROM favorites WHERE visitor_id = ?')
    .all(visitorId) as unknown as { place_id: string }[];

  return {
    isFavorite: !exists,
    favorites: favRows.map((r) => r.place_id),
  };
}

export function getFavorites(visitorId: string): string[] {
  const db = getDb();
  const favRows = db
    .prepare('SELECT place_id FROM favorites WHERE visitor_id = ?')
    .all(visitorId) as unknown as { place_id: string }[];
  return favRows.map((r) => r.place_id);
}

export function getHealthStats() {
  const db = getDb();
  const placesCount = (db.prepare('SELECT COUNT(*) as cnt FROM places').get() as { cnt: number }).cnt;
  const reviewsCount = (db.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number }).cnt;
  return { status: 'ok', placesCount, reviewsCount, dbPath: DB_PATH };
}
