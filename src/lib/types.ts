export type Language = 'ar' | 'en';

export type CategorySlug =
  | 'restaurants'
  | 'cafes'
  | 'gas_stations'
  | 'entertainment'
  | 'markets'
  | 'malls';

export type CitySlug = 'baghdad' | 'erbil' | 'basra' | 'najaf' | 'karbala';

export type FuelType = 'regular' | 'improved' | 'super' | 'lpg' | 'diesel';

export type QueueStatus = 'quiet' | 'moderate' | 'busy';

export type SortOption = 'featured' | 'rating' | 'nearest' | 'reviews' | 'price_asc';

export type ViewMode = 'grid' | 'split' | 'map';

export interface PlaceMetadata {
  // Restaurants & Cafes
  cuisineAr?: string;
  cuisineEn?: string;
  specialtyAr?: string;
  specialtyEn?: string;
  // Gas Stations
  fuelTypes?: FuelType[];
  queueStatus?: QueueStatus;
  carWash?: boolean;
  airAndOil?: boolean;
  miniMarket?: boolean;
  lastQueueUpdate?: string;
  // Malls & Markets
  floors?: number;
  storesCount?: number;
  marketTypeAr?: string;
  marketTypeEn?: string;
  // Entertainment
  ticketInfoAr?: string;
  ticketInfoEn?: string;
  ageGroupAr?: string;
  ageGroupEn?: string;
  indoor?: boolean;
}

export interface Place {
  id: string;
  slug: string;
  category: CategorySlug;
  city: CitySlug;
  districtAr: string;
  districtEn: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  addressAr: string;
  addressEn: string;
  lat: number;
  lng: number;
  phone: string;
  priceLevel: 1 | 2 | 3;
  is24Hours: boolean;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  imageUrl: string;
  amenities: string[];
  metadata: PlaceMetadata;
  verified: boolean;
  featured: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt: string;
  // Computed fields returned by API / helpers
  isOpenNow?: boolean;
  distanceKm?: number;
  isFavorite?: boolean;
}

export interface Review {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  visitType: 'family' | 'friends' | 'solo' | 'quick_stop';
  createdAt: string;
}

export interface FuelReport {
  id: string;
  placeId: string;
  queueStatus: QueueStatus;
  fuelAvailable: FuelType[];
  note: string;
  reporterName: string;
  createdAt: string;
}

export interface PlaceDetailResponse {
  place: Place;
  reviews: Review[];
  fuelReports: FuelReport[];
  nearby: Place[];
}

export interface PlacesListResponse {
  places: Place[];
  countsByCategory: Record<CategorySlug | 'all', number>;
  total: number;
}
