import type { CitySlug } from './types';

export interface DistrictPreset {
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export interface CityConfig {
  slug: CitySlug;
  nameAr: string;
  nameEn: string;
  center: { lat: number; lng: number };
  districts: DistrictPreset[];
}

export const CITIES: CityConfig[] = [
  {
    slug: 'baghdad',
    nameAr: 'بغداد',
    nameEn: 'Baghdad',
    center: { lat: 33.3152, lng: 44.3661 },
    districts: [
      { nameAr: 'المنصور', nameEn: 'Al-Mansour', lat: 33.3168, lng: 44.3422 },
      { nameAr: 'الكرادة', nameEn: 'Karrada', lat: 33.3018, lng: 44.4178 },
      { nameAr: 'الجادرية', nameEn: 'Jadriya', lat: 33.2775, lng: 44.3845 },
      { nameAr: 'زيونة', nameEn: 'Zayouna', lat: 33.3292, lng: 44.4552 },
      { nameAr: 'الحارثية', nameEn: 'Al-Harithiya', lat: 33.3065, lng: 44.3552 },
      { nameAr: 'شارع فلسطين', nameEn: 'Palestine Street', lat: 33.3465, lng: 44.4165 },
      { nameAr: 'المتنبي والشورجة', nameEn: 'Mutanabbi & Shorja', lat: 33.3418, lng: 44.3872 },
      { nameAr: 'الأعظمية', nameEn: 'Adhamiyah', lat: 33.3728, lng: 44.3612 },
      { nameAr: 'الكاظمية', nameEn: 'Kadhimiya', lat: 33.3792, lng: 44.3375 },
      { nameAr: 'القادسية', nameEn: 'Al-Qadisiyah', lat: 33.2905, lng: 44.3545 },
      { nameAr: 'أبو نؤاس', nameEn: 'Abu Nuwas', lat: 33.3165, lng: 44.4055 },
      { nameAr: 'طريق المطار', nameEn: 'Airport Road', lat: 33.2845, lng: 44.2745 },
      { nameAr: 'الزوراء', nameEn: 'Al-Zawraa', lat: 33.3145, lng: 44.3745 },
      { nameAr: 'الفحامة', nameEn: 'Al-Fahama', lat: 33.4285, lng: 44.3445 },
    ],
  },
  {
    slug: 'erbil',
    nameAr: 'أربيل',
    nameEn: 'Erbil',
    center: { lat: 36.1911, lng: 44.0092 },
    districts: [
      { nameAr: 'القلعة والمركز', nameEn: 'Citadel & Center', lat: 36.1914, lng: 44.0092 },
      { nameAr: 'عينكاوا', nameEn: 'Ankawa', lat: 36.2245, lng: 43.9942 },
      { nameAr: 'شارع 100', nameEn: '100m Road', lat: 36.1852, lng: 43.9845 },
      { nameAr: 'إمباير', nameEn: 'Empire World', lat: 36.1995, lng: 43.9725 },
    ],
  },
  {
    slug: 'basra',
    nameAr: 'البصرة',
    nameEn: 'Basra',
    center: { lat: 30.5085, lng: 47.7835 },
    districts: [
      { nameAr: 'العشار', nameEn: 'Ashar', lat: 30.5145, lng: 47.8285 },
      { nameAr: 'الجزائر', nameEn: 'Al-Jazair', lat: 30.5032, lng: 47.8125 },
      { nameAr: 'البراضعية', nameEn: 'Al-Bradhiya', lat: 30.4912, lng: 47.8345 },
      { nameAr: 'شط العرب', nameEn: 'Shatt Al-Arab', lat: 30.5255, lng: 47.8425 },
    ],
  },
  {
    slug: 'najaf',
    nameAr: 'النجف',
    nameEn: 'Najaf',
    center: { lat: 32.0005, lng: 44.3365 },
    districts: [
      { nameAr: 'حي الأمير', nameEn: 'Hay Al-Amir', lat: 32.0125, lng: 44.3492 },
      { nameAr: 'شارع الروان', nameEn: 'Al-Rawan St', lat: 32.0035, lng: 44.3395 },
      { nameAr: 'الكوفة', nameEn: 'Kufa', lat: 32.0285, lng: 44.3985 },
    ],
  },
  {
    slug: 'karbala',
    nameAr: 'كربلاء',
    nameEn: 'Karbala',
    center: { lat: 32.616, lng: 44.0249 },
    districts: [
      { nameAr: 'حي الحسين', nameEn: 'Hay Al-Hussein', lat: 32.6125, lng: 44.0185 },
      { nameAr: 'حي الموظفين', nameEn: 'Hay Al-Muwazafin', lat: 32.6052, lng: 44.0062 },
    ],
  },
];

export const CITY_MAP: Record<CitySlug, CityConfig> = CITIES.reduce(
  (acc, city) => {
    acc[city.slug] = city;
    return acc;
  },
  {} as Record<CitySlug, CityConfig>
);
