import type { CategorySlug } from './types';

export interface CategoryConfig {
  slug: CategorySlug;
  nameAr: string;
  nameEn: string;
  shortDescAr: string;
  shortDescEn: string;
  defaultImage: string;
  colorHex: string;
  badgeBgClass: string;
  badgeTextClass: string;
  pinBgClass: string;
  ringClass: string;
  suggestedAmenities: string[];
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'restaurants',
    nameAr: 'المطاعم',
    nameEn: 'Restaurants',
    shortDescAr: 'مسكوف، مشويات، مأكولات عراقية وعالمية',
    shortDescEn: 'Masgouf, grills, Iraqi & international dining',
    defaultImage: '/images/cat-restaurants.jpg',
    colorHex: '#E05D38',
    badgeBgClass: 'bg-orange-500/12 dark:bg-orange-400/15',
    badgeTextClass: 'text-orange-700 dark:text-orange-300',
    pinBgClass: 'bg-orange-600',
    ringClass: 'ring-orange-500/30',
    suggestedAmenities: ['family_section', 'outdoor_seating', 'delivery', 'parking', 'cards', 'reservations'],
  },
  {
    slug: 'cafes',
    nameAr: 'الكافيهات',
    nameEn: 'Cafes',
    shortDescAr: 'قهوة مختصة، مقاهي تراثية، جلسات عمل',
    shortDescEn: 'Specialty coffee, heritage tea houses & workspaces',
    defaultImage: '/images/cat-cafes.jpg',
    colorHex: '#B45309',
    badgeBgClass: 'bg-amber-500/14 dark:bg-amber-400/15',
    badgeTextClass: 'text-amber-800 dark:text-amber-300',
    pinBgClass: 'bg-amber-600',
    ringClass: 'ring-amber-500/30',
    suggestedAmenities: ['wifi', 'work_friendly', 'outdoor_seating', 'late_night', 'cards', 'parking'],
  },
  {
    slug: 'gas_stations',
    nameAr: 'محطات الوقود',
    nameEn: 'Gas Stations',
    shortDescAr: 'بنزين محسن وسوبر، غاز، غسيل، خدمة 24 ساعة',
    shortDescEn: 'Fuel grades, LPG, car wash & 24/7 service',
    defaultImage: '/images/cat-gas-stations.jpg',
    colorHex: '#059669',
    badgeBgClass: 'bg-emerald-500/12 dark:bg-emerald-400/15',
    badgeTextClass: 'text-emerald-700 dark:text-emerald-300',
    pinBgClass: 'bg-emerald-600',
    ringClass: 'ring-emerald-500/30',
    suggestedAmenities: ['open_24h', 'car_wash', 'mini_market', 'air_oil', 'ev_charging', 'prayer_room'],
  },
  {
    slug: 'entertainment',
    nameAr: 'الأماكن الترفيهية',
    nameEn: 'Entertainment',
    shortDescAr: 'متنزهات، كورنيش، مدن ألعاب، بولينغ وسينما',
    shortDescEn: 'Parks, corniche, amusement, bowling & cinema',
    defaultImage: '/images/cat-entertainment.jpg',
    colorHex: '#7C3AED',
    badgeBgClass: 'bg-violet-500/12 dark:bg-violet-400/15',
    badgeTextClass: 'text-violet-700 dark:text-violet-300',
    pinBgClass: 'bg-violet-600',
    ringClass: 'ring-violet-500/30',
    suggestedAmenities: ['family_section', 'kids_zone', 'parking', 'outdoor_seating', 'food_court', 'cards'],
  },
  {
    slug: 'markets',
    nameAr: 'الأسواق',
    nameEn: 'Markets',
    shortDescAr: 'أسواق شعبية وتراثية، سوبرماركت، مراكز جملة',
    shortDescEn: 'Traditional souqs, bazaars & supermarkets',
    defaultImage: '/images/cat-markets.jpg',
    colorHex: '#CA8A04',
    badgeBgClass: 'bg-yellow-500/14 dark:bg-yellow-400/15',
    badgeTextClass: 'text-yellow-800 dark:text-yellow-300',
    pinBgClass: 'bg-yellow-600',
    ringClass: 'ring-yellow-500/30',
    suggestedAmenities: ['fresh_produce', 'heritage', 'wholesale', 'delivery', 'parking', 'ac'],
  },
  {
    slug: 'malls',
    nameAr: 'المولات',
    nameEn: 'Malls',
    shortDescAr: 'مجمعات تسوق كبرى، ماركات، مطاعم وسينما',
    shortDescEn: 'Major shopping centers, brands, dining & cinema',
    defaultImage: '/images/cat-malls.jpg',
    colorHex: '#0F766E',
    badgeBgClass: 'bg-teal-500/12 dark:bg-teal-400/15',
    badgeTextClass: 'text-teal-700 dark:text-teal-300',
    pinBgClass: 'bg-teal-600',
    ringClass: 'ring-teal-500/30',
    suggestedAmenities: ['parking', 'ac', 'cinema', 'kids_zone', 'food_court', 'cards', 'family_section', 'prayer_room'],
  },
];

export const CATEGORY_MAP: Record<CategorySlug, CategoryConfig> = CATEGORIES.reduce(
  (acc, item) => {
    acc[item.slug] = item;
    return acc;
  },
  {} as Record<CategorySlug, CategoryConfig>
);

export const PLACE_IMAGE_OPTIONS: { url: string; labelAr: string; labelEn: string; category: CategorySlug }[] = [
  { url: '/images/cat-restaurants.jpg', labelAr: 'مطعم ومأكولات عراقية', labelEn: 'Iraqi Dining & Masgouf', category: 'restaurants' },
  { url: '/images/place-grill-burger.jpg', labelAr: 'مشويات وبرغر عصري', labelEn: 'Modern Grill & Burgers', category: 'restaurants' },
  { url: '/images/cat-cafes.jpg', labelAr: 'كافيه مختص حديث', labelEn: 'Specialty Coffee Bar', category: 'cafes' },
  { url: '/images/place-traditional-tea.jpg', labelAr: 'مقهى تراثي وثقافي', labelEn: 'Heritage Tea & Book Cafe', category: 'cafes' },
  { url: '/images/cat-gas-stations.jpg', labelAr: 'محطة وقود نموذجية', labelEn: 'Modern Fuel Station', category: 'gas_stations' },
  { url: '/images/cat-entertainment.jpg', labelAr: 'كورنيش ومدينة ترفيه', labelEn: 'Riverfront & Amusement', category: 'entertainment' },
  { url: '/images/place-cinema-arcade.jpg', labelAr: 'صالة بولينغ وألعاب', labelEn: 'Bowling & Arcade Lounge', category: 'entertainment' },
  { url: '/images/cat-markets.jpg', labelAr: 'سوق شعبي وتراثي', labelEn: 'Traditional Souq & Bazaar', category: 'markets' },
  { url: '/images/cat-malls.jpg', labelAr: 'مول ومركز تسوق', labelEn: 'Modern Shopping Mall', category: 'malls' },
];
