'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  Compass,
  ExternalLink,
  Fuel,
  Globe,
  Heart,
  MapPin,
  Moon,
  Phone,
  Star,
  Sun,
} from 'lucide-react';
import { CATEGORY_MAP } from '@/lib/categories';
import { CITY_MAP } from '@/lib/cities';
import {
  AMENITY_LABELS,
  FUEL_LABELS,
  QUEUE_LABELS,
  VISIT_TYPE_LABELS,
  t,
} from '@/lib/i18n';
import type {
  FuelReport,
  FuelType,
  Language,
  Place,
  QueueStatus,
  Review,
} from '@/lib/types';
import { formatDistance, formatHoursLabel, formatPriceLevel, getGoogleMapsUrl } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { InteractiveMap } from './InteractiveMap';

interface PlaceDetailPageClientProps {
  initialPlace: Place;
  initialReviews: Review[];
  initialFuelReports: FuelReport[];
  nearby: Place[];
}

export function PlaceDetailPageClient({
  initialPlace,
  initialReviews,
  initialFuelReports,
  nearby,
}: PlaceDetailPageClientProps) {
  const [lang, setLang] = useState<Language>('ar');
  const [darkMode, setDarkMode] = useState(false);
  const [visitorId, setVisitorId] = useState('guest-baghdad');

  const [place, setPlace] = useState<Place>(initialPlace);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [fuelReports, setFuelReports] = useState<FuelReport[]>(initialFuelReports);

  // Review form
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [visitType, setVisitType] = useState<Review['visitType']>('family');
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fuel status form
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(
    initialPlace.metadata.queueStatus || 'quiet'
  );
  const [selectedFuels, setSelectedFuels] = useState<FuelType[]>(
    initialPlace.metadata.fuelTypes || ['regular', 'improved']
  );
  const [fuelNote, setFuelNote] = useState('');
  const [submittingFuel, setSubmittingFuel] = useState(false);

  const dict = t(lang);

  useEffect(() => {
    Promise.resolve().then(() => {
      const savedLang = window.localStorage.getItem('dalil_lang') as Language | null;
      if (savedLang === 'ar' || savedLang === 'en') setLang(savedLang);
      const savedTheme = window.localStorage.getItem('dalil_theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }
      const vid = window.localStorage.getItem('dalil_visitor_id') || 'guest-baghdad';
      setVisitorId(vid);

      fetch(`/api/favorites?visitorId=${encodeURIComponent(vid)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.favorites?.includes(initialPlace.id)) {
            setPlace((p) => ({ ...p, isFavorite: true }));
          }
        })
        .catch(() => {});
    });
  }, [initialPlace.id]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('dalil_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('dalil_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('dalil_theme', 'light');
    }
  }, [darkMode]);

  const cat = CATEGORY_MAP[place.category];
  const city = CITY_MAP[place.city];
  const name = lang === 'ar' ? place.nameAr : place.nameEn;
  const description = lang === 'ar' ? place.descriptionAr : place.descriptionEn;
  const address = lang === 'ar' ? place.addressAr : place.addressEn;
  const district = lang === 'ar' ? place.districtAr : place.districtEn;
  const cityName = city ? (lang === 'ar' ? city.nameAr : city.nameEn) : place.city;

  const toggleFav = async () => {
    setPlace((p) => ({ ...p, isFavorite: !p.isFavorite }));
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, placeId: place.id }),
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/places/${place.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, rating, comment, visitType }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => [data.review, ...prev]);
        setPlace((p) => ({ ...p, ratingAvg: data.ratingAvg, reviewCount: data.reviewCount }));
        setAuthorName('');
        setComment('');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleFuelUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFuel(true);
    try {
      const res = await fetch(`/api/places/${place.id}/fuel-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueStatus, fuelAvailable: selectedFuels, note: fuelNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlace((prev) => ({ ...data.updatedPlace, isFavorite: prev.isFavorite }));
        setFuelReports((prev) => [data.report, ...prev]);
        setFuelNote('');
      }
    } finally {
      setSubmittingFuel(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#0B1117]">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAF7F2]/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B1117]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200"
            >
              {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              <span>{lang === 'ar' ? 'العودة للدليل' : 'Back to Dalil'}</span>
            </Link>

            <Link href="/" className="hidden items-center gap-1.5 sm:flex">
              <Compass className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                {dict.brandAr} · {dict.brandEn}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200"
            >
              <Globe className="h-3.5 w-3.5 text-teal-600" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-[#131C26] dark:text-amber-300"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131C26]">
          <div className="relative h-64 sm:h-80">
            <img src={place.imageUrl} alt={name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute inset-x-5 top-4 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold dark:bg-slate-900/95 ${cat.badgeTextClass}`}
              >
                <CategoryIcon category={place.category} className="h-4 w-4" />
                {lang === 'ar' ? cat.nameAr : cat.nameEn}
              </span>
              <button
                type="button"
                onClick={toggleFav}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur ${
                  place.isFavorite ? 'bg-rose-500 text-white' : 'bg-black/45 text-white'
                }`}
              >
                <Heart className={`h-4 w-4 ${place.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="absolute inset-x-6 bottom-5 flex flex-wrap items-end justify-between gap-4 text-white">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      place.isOpenNow ? 'bg-emerald-500' : 'bg-rose-600'
                    }`}
                  >
                    {place.isOpenNow ? dict.openNow : dict.closedNow}
                  </span>
                  {place.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-600/90 px-2.5 py-0.5 text-xs font-bold">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {dict.verifiedBadge}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{name}</h1>
                <p className="mt-1 text-xs text-white/85 sm:text-sm">
                  {district} · {cityName}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-black/45 px-3.5 py-2 backdrop-blur">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-extrabold">
                  {place.reviewCount > 0 ? place.ratingAvg.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-white/80">
                  ({place.reviewCount} {dict.reviewsWord})
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <p className="text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                {description}
              </p>

              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="flex items-start gap-2.5 rounded-2xl bg-stone-50 p-3.5 dark:bg-slate-800/60">
                  <MapPin className="mt-0.5 h-4 w-4 text-teal-600" />
                  <div className="font-bold text-stone-800 dark:text-slate-200">{address}</div>
                </div>
                <div className="flex items-start gap-2.5 rounded-2xl bg-stone-50 p-3.5 dark:bg-slate-800/60">
                  <Clock className="mt-0.5 h-4 w-4 text-teal-600" />
                  <div>
                    <div className="font-bold text-stone-800 dark:text-slate-200">
                      {formatHoursLabel(place, lang)}
                    </div>
                    <div className="mt-0.5 text-stone-500">
                      {formatPriceLevel(place.priceLevel, lang)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={getGoogleMapsUrl(place.lat, place.lng, name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {dict.directionsBtn}
                </a>
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold dark:border-slate-700 dark:text-slate-200"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr">{place.phone}</span>
                  </a>
                )}
              </div>

              {place.category === 'gas_stations' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                      <Fuel className="h-4 w-4" />
                      {dict.fuelAndQueueTitle}
                    </h2>
                    {place.metadata.queueStatus && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          QUEUE_LABELS[place.metadata.queueStatus].colorClass
                        }`}
                      >
                        {QUEUE_LABELS[place.metadata.queueStatus][lang]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(place.metadata.fuelTypes || []).map((f) => (
                      <span
                        key={f}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                      >
                        ✓ {FUEL_LABELS[f][lang]}
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleFuelUpdate} className="mt-3 space-y-2 rounded-xl bg-white p-3 dark:bg-slate-900">
                    <div className="flex flex-wrap gap-2">
                      {(['quiet', 'moderate', 'busy'] as QueueStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setQueueStatus(st)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            queueStatus === st ? QUEUE_LABELS[st].colorClass : 'border-stone-200 dark:border-slate-700'
                          }`}
                        >
                          {QUEUE_LABELS[st][lang]}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['regular', 'improved', 'super', 'lpg', 'diesel'] as FuelType[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() =>
                            setSelectedFuels((prev) =>
                              prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
                            )
                          }
                          className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                            selectedFuels.includes(f)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 dark:bg-slate-800'
                          }`}
                        >
                          {FUEL_LABELS[f][lang]}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={fuelNote}
                      onChange={(e) => setFuelNote(e.target.value)}
                      placeholder={lang === 'ar' ? 'ملاحظة قصيرة...' : 'Short note...'}
                      className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={submittingFuel}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {submittingFuel ? dict.submitting : dict.updateStatusBtn}
                    </button>
                  </form>

                  {fuelReports.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {fuelReports.slice(0, 3).map((rep) => (
                        <div key={rep.id} className="rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-slate-900/60">
                          <span className="font-bold">{rep.reporterName}: </span>
                          <span>{rep.note || QUEUE_LABELS[rep.queueStatus]?.[lang]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {dict.placeSpecs}
                </h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {place.amenities.map((am) => (
                    <span
                      key={am}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      ✓ {AMENITY_LABELS[am]?.[lang] || am}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-200 pt-5 dark:border-slate-800">
                <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {dict.reviewsTitle} ({place.reviewCount})
                </h2>

                <form onSubmit={handleReviewSubmit} className="mt-3 space-y-2.5 rounded-2xl bg-stone-50 p-4 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => setRating(s)}>
                          <Star
                            className={`h-5 w-5 ${
                              s <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value as Review['visitType'])}
                      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {Object.entries(VISIT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v[lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={dict.yourNamePlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={dict.commentPlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white"
                  >
                    {submittingReview ? dict.submitting : dict.submitReview}
                  </button>
                </form>

                <div className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-stone-100 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{r.authorName}</span>
                        <div className="flex gap-0.5 text-amber-500">
                          {Array.from({ length: r.rating }).map((_, idx) => (
                            <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-300">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-5">
              <InteractiveMap
                places={[place]}
                lang={lang}
                selectedCity={place.city}
                selectedPlaceId={place.id}
                userCoords={{ lat: place.lat, lng: place.lng }}
                heightClassName="h-72"
              />

              {nearby.length > 0 && (
                <div className="rounded-2xl border border-stone-200 p-4 dark:border-slate-800">
                  <h2 className="text-sm font-extrabold">{dict.nearbyPlaces}</h2>
                  <div className="mt-3 space-y-2">
                    {nearby.map((np) => (
                      <Link
                        key={np.id}
                        href={`/places/${np.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-stone-100 p-2 transition hover:bg-stone-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <img
                          src={np.imageUrl}
                          alt={lang === 'ar' ? np.nameAr : np.nameEn}
                          className="h-12 w-14 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold">
                            {lang === 'ar' ? np.nameAr : np.nameEn}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {formatDistance(np.distanceKm, lang)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
