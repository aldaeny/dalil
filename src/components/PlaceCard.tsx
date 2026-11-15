'use client';

import {
  BadgeCheck,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Star,
} from 'lucide-react';
import { CATEGORY_MAP } from '@/lib/categories';
import { CITY_MAP } from '@/lib/cities';
import { AMENITY_LABELS, FUEL_LABELS, QUEUE_LABELS, t } from '@/lib/i18n';
import type { Language, Place } from '@/lib/types';
import {
  formatDistance,
  formatHoursLabel,
  formatPriceLevel,
  getGoogleMapsUrl,
} from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';

interface PlaceCardProps {
  place: Place;
  lang: Language;
  isSelected?: boolean;
  onSelect?: (place: Place) => void;
  onOpenDetail: (place: Place) => void;
  onToggleFavorite: (placeId: string) => void;
  compact?: boolean;
}

export function PlaceCard({
  place,
  lang,
  isSelected = false,
  onSelect,
  onOpenDetail,
  onToggleFavorite,
  compact = false,
}: PlaceCardProps) {
  const dict = t(lang);
  const cat = CATEGORY_MAP[place.category];
  const city = CITY_MAP[place.city];
  const name = lang === 'ar' ? place.nameAr : place.nameEn;
  const description = lang === 'ar' ? place.descriptionAr : place.descriptionEn;
  const district = lang === 'ar' ? place.districtAr : place.districtEn;
  const cityName = city ? (lang === 'ar' ? city.nameAr : city.nameEn) : place.city;

  return (
    <article
      onClick={() => onSelect?.(place)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 dark:bg-[#131C26] ${
        isSelected
          ? 'border-teal-600 ring-2 ring-teal-500/25 shadow-lg dark:border-teal-400'
          : 'border-stone-200/90 shadow-xs hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-md dark:border-slate-800 dark:hover:border-teal-500/40'
      }`}
    >
      {/* Card Cover */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail(place);
        }}
        className={`relative w-full cursor-pointer overflow-hidden bg-stone-100 dark:bg-slate-800 ${
          compact ? 'h-36' : 'aspect-[16/10]'
        }`}
      >
        <img
          src={place.imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top badges row */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full bg-white/94 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur dark:bg-slate-900/90 ${cat.badgeTextClass}`}
          >
            <CategoryIcon category={place.category} className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? cat.nameAr : cat.nameEn}</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(place.id);
            }}
            aria-label={dict.favoritesBtn}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition ${
              place.isFavorite
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-black/35 text-white hover:bg-black/55'
            }`}
          >
            <Heart className={`h-4 w-4 ${place.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bottom image overlay pills */}
        <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs ${
                place.isOpenNow
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-600/90 text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/95" />
              {place.isOpenNow ? dict.openNow : dict.closedNow}
            </span>

            {place.is24Hours && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-stone-950 shadow-xs">
                {dict.hours24Badge}
              </span>
            )}
          </div>

          {place.distanceKm !== undefined && (
            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
              {formatDistance(place.distanceKm, lang)}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(place);
            }}
            className="text-start"
          >
            <h3 className="flex items-center gap-1.5 text-base font-extrabold leading-snug text-stone-900 transition group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-300">
              <span>{name}</span>
              {place.verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              )}
            </h3>
          </button>

          {/* Rating pill */}
          {place.reviewCount > 0 ? (
            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/12 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>{place.ratingAvg.toFixed(1)}</span>
              <span className="text-[11px] font-medium opacity-75">({place.reviewCount})</span>
            </div>
          ) : (
            <span className="shrink-0 rounded-lg bg-teal-500/10 px-2 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300">
              {lang === 'ar' ? 'جديد' : 'New'}
            </span>
          )}
        </div>

        {/* Location & Hours line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            {district} · {cityName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatHoursLabel(place, lang)}
          </span>
        </div>

        {!compact && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600 dark:text-slate-400">
            {description}
          </p>
        )}

        {/* Category-specific highlights */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {place.category === 'gas_stations' && place.metadata.queueStatus && (
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                QUEUE_LABELS[place.metadata.queueStatus].colorClass
              }`}
            >
              {QUEUE_LABELS[place.metadata.queueStatus][lang]}
            </span>
          )}

          {place.category === 'gas_stations' &&
            place.metadata.fuelTypes?.slice(0, 3).map((fuel) => (
              <span
                key={fuel}
                className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {FUEL_LABELS[fuel]?.[lang] || fuel}
              </span>
            ))}

          {(place.category === 'restaurants' || place.category === 'cafes') &&
            (place.metadata.cuisineAr || place.metadata.specialtyAr) && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 dark:bg-slate-800 dark:text-slate-300">
                {lang === 'ar'
                  ? place.metadata.cuisineAr || place.metadata.specialtyAr
                  : place.metadata.cuisineEn || place.metadata.specialtyEn}
              </span>
            )}

          {place.category === 'malls' && place.metadata.storesCount && (
            <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
              {lang === 'ar'
                ? `${place.metadata.floors || 3} طوابق · +${place.metadata.storesCount} متجر`
                : `${place.metadata.floors || 3} Floors · ${place.metadata.storesCount}+ Stores`}
            </span>
          )}

          {place.category === 'entertainment' && place.metadata.ticketInfoAr && (
            <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:text-violet-300">
              {lang === 'ar' ? place.metadata.ticketInfoAr : place.metadata.ticketInfoEn}
            </span>
          )}

          {place.category === 'markets' && place.metadata.marketTypeAr && (
            <span className="rounded-md bg-yellow-500/12 px-2 py-0.5 text-[11px] font-semibold text-yellow-800 dark:text-yellow-300">
              {lang === 'ar' ? place.metadata.marketTypeAr : place.metadata.marketTypeEn}
            </span>
          )}

          {place.amenities.slice(0, 2).map((am) => (
            <span
              key={am}
              className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-slate-800/80 dark:text-slate-300"
            >
              {AMENITY_LABELS[am]?.[lang] || am}
            </span>
          ))}
        </div>

        {/* Card Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 pt-3 mt-3 dark:border-slate-800">
          <span className="text-xs font-bold text-stone-500 dark:text-slate-400">
            {formatPriceLevel(place.priceLevel, lang)}
          </span>

          <div className="flex items-center gap-1.5">
            <a
              href={getGoogleMapsUrl(place.lat, place.lng, name)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{dict.directionsBtn}</span>
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(place);
              }}
              className="rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {dict.detailsBtn}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
