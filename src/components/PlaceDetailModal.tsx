'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Fuel,
  Heart,
  MapPin,
  MessageSquarePlus,
  Phone,
  Share2,
  Star,
  X,
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
  PlaceDetailResponse,
  QueueStatus,
  Review,
} from '@/lib/types';
import {
  formatDistance,
  formatHoursLabel,
  formatPriceLevel,
  getGoogleMapsUrl,
} from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { InteractiveMap } from './InteractiveMap';

interface PlaceDetailModalProps {
  place: Place | null;
  lang: Language;
  visitorId: string;
  userCoords: { lat: number; lng: number };
  onClose: () => void;
  onToggleFavorite: (placeId: string) => void;
  onPlaceUpdated: (updated: Place) => void;
  onSelectNearby: (place: Place) => void;
}

const ALL_FUEL_TYPES: FuelType[] = ['regular', 'improved', 'super', 'lpg', 'diesel'];

export function PlaceDetailModal({
  place,
  lang,
  visitorId,
  userCoords,
  onClose,
  onToggleFavorite,
  onPlaceUpdated,
  onSelectNearby,
}: PlaceDetailModalProps) {
  const dict = t(lang);
  const [detail, setDetail] = useState<PlaceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Review composer state
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [visitType, setVisitType] = useState<Review['visitType']>('family');
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Fuel status reporter state
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('quiet');
  const [selectedFuels, setSelectedFuels] = useState<FuelType[]>(['regular', 'improved']);
  const [fuelNote, setFuelNote] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [submittingFuel, setSubmittingFuel] = useState(false);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    const params = new URLSearchParams({
      visitorId,
      lat: String(userCoords.lat),
      lng: String(userCoords.lng),
    });

    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setQueueStatus(place.metadata.queueStatus || 'quiet');
      setSelectedFuels(place.metadata.fuelTypes || ['regular', 'improved']);
      return fetch(`/api/places/${place.id}?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PlaceDetailResponse | null) => {
          if (!cancelled && data) {
            setDetail(data);
            setQueueStatus(data.place.metadata.queueStatus || 'quiet');
            if (data.place.metadata.fuelTypes?.length) {
              setSelectedFuels(data.place.metadata.fuelTypes);
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [place, visitorId, userCoords.lat, userCoords.lng]);

  // Close on Escape
  useEffect(() => {
    if (!place) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [place, onClose]);

  if (!place) return null;

  const activeDetail = detail && detail.place.id === place.id ? detail : null;
  const activePlace = activeDetail?.place
    ? { ...activeDetail.place, isFavorite: place.isFavorite }
    : place;
  const reviews = activeDetail?.reviews || [];
  const fuelReports: FuelReport[] = activeDetail?.fuelReports || [];
  const nearby = activeDetail?.nearby || [];

  const cat = CATEGORY_MAP[activePlace.category];
  const city = CITY_MAP[activePlace.city];
  const name = lang === 'ar' ? activePlace.nameAr : activePlace.nameEn;
  const description = lang === 'ar' ? activePlace.descriptionAr : activePlace.descriptionEn;
  const address = lang === 'ar' ? activePlace.addressAr : activePlace.addressEn;
  const district = lang === 'ar' ? activePlace.districtAr : activePlace.districtEn;
  const cityName = city ? (lang === 'ar' ? city.nameAr : city.nameEn) : activePlace.city;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${name} - ${address}`);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/places/${activePlace.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: description, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1800);
      }
    } catch {
      // ignore cancelled share
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    if (!authorName.trim() || !comment.trim()) {
      setReviewError(lang === 'ar' ? 'يرجى إدخال الاسم والتعليق.' : 'Please enter your name and comment.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/places/${activePlace.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, rating, comment, visitType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || 'Error');
        return;
      }

      const updatedPlace: Place = {
        ...activePlace,
        ratingAvg: data.ratingAvg,
        reviewCount: data.reviewCount,
      };
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              place: updatedPlace,
              reviews: [data.review, ...prev.reviews],
            }
          : null
      );
      onPlaceUpdated(updatedPlace);
      setAuthorName('');
      setComment('');
      setRating(5);
    } catch {
      setReviewError(lang === 'ar' ? 'تعذر إرسال التقييم.' : 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleFuelChip = (fuel: FuelType) => {
    setSelectedFuels((prev) =>
      prev.includes(fuel) ? prev.filter((f) => f !== fuel) : [...prev, fuel]
    );
  };

  const handleSubmitFuelReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFuel(true);
    try {
      const res = await fetch(`/api/places/${activePlace.id}/fuel-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueStatus,
          fuelAvailable: selectedFuels,
          note: fuelNote,
          reporterName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.updatedPlace) {
        const updatedPlace: Place = {
          ...data.updatedPlace,
          isFavorite: activePlace.isFavorite,
          distanceKm: activePlace.distanceKm,
        };
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                place: updatedPlace,
                fuelReports: [data.report, ...prev.fuelReports],
              }
            : null
        );
        onPlaceUpdated(updatedPlace);
        setFuelNote('');
      }
    } finally {
      setSubmittingFuel(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="custom-scroll relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-[#FAF7F2] shadow-2xl sm:rounded-3xl dark:bg-[#0F1722]"
      >
        {/* Hero Photo Header */}
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          <img src={activePlace.imageUrl} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />

          {/* Top Controls */}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow dark:bg-slate-900/95 ${cat.badgeTextClass}`}
            >
              <CategoryIcon category={activePlace.category} className="h-4 w-4" />
              {lang === 'ar' ? cat.nameAr : cat.nameEn}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/45 px-3 text-xs font-bold text-white backdrop-blur transition hover:bg-black/65"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                <span>{copiedLink ? dict.copied : dict.shareBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite(activePlace.id)}
                aria-label={dict.favoritesBtn}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition ${
                  activePlace.isFavorite
                    ? 'bg-rose-500 text-white'
                    : 'bg-black/45 text-white hover:bg-black/65'
                }`}
              >
                <Heart className={`h-4 w-4 ${activePlace.isFavorite ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label={dict.closeBtn}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bottom Title Overlay */}
          <div className="absolute inset-x-5 bottom-4 text-white">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activePlace.isOpenNow ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {activePlace.isOpenNow ? dict.openNow : dict.closedNow}
              </span>
              {activePlace.is24Hours && (
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-extrabold text-stone-950">
                  {dict.hours24Badge}
                </span>
              )}
              {activePlace.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/85 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {dict.verifiedBadge}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold sm:text-2xl">{name}</h2>
                <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
                  {district} · {cityName}
                  {activePlace.distanceKm !== undefined &&
                    ` · ${formatDistance(activePlace.distanceKm, lang)}`}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-black/45 px-3 py-1.5 backdrop-blur">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-extrabold">
                  {activePlace.reviewCount > 0 ? activePlace.ratingAvg.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-white/80">
                  ({activePlace.reviewCount} {dict.reviewsWord})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-12">
          {/* Left / Main Column */}
          <div className="space-y-6 lg:col-span-7">
            {/* Description & Quick Actions */}
            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131C26]">
              <p className="text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                {description}
              </p>

              <div className="mt-4 grid gap-2.5 text-xs sm:grid-cols-2">
                <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 dark:bg-slate-800/60">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-stone-900 dark:text-white">{address}</div>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="mt-1 inline-flex items-center gap-1 font-bold text-teal-700 hover:underline dark:text-teal-400"
                    >
                      {copiedAddress ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedAddress ? dict.copied : dict.copyAddress}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 dark:bg-slate-800/60">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <div>
                    <div className="font-bold text-stone-900 dark:text-white">
                      {formatHoursLabel(activePlace, lang)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400">
                      {formatPriceLevel(activePlace.priceLevel, lang)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={getGoogleMapsUrl(activePlace.lat, activePlace.lng, name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {dict.directionsBtn}
                </a>

                {activePlace.phone && (
                  <a
                    href={`tel:${activePlace.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr">{activePlace.phone}</span>
                  </a>
                )}

                <Link
                  href={`/places/${activePlace.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {lang === 'ar' ? 'رابط الصفحة الدائم' : 'Open Permalink'}
                </Link>
              </div>
            </section>

            {/* Gas Station Live Community Fuel & Queue Status */}
            {activePlace.category === 'gas_stations' && (
              <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    <Fuel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {dict.fuelAndQueueTitle}
                  </h3>
                  {activePlace.metadata.queueStatus && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        QUEUE_LABELS[activePlace.metadata.queueStatus].colorClass
                      }`}
                    >
                      {QUEUE_LABELS[activePlace.metadata.queueStatus][lang]}
                      {activePlace.metadata.lastQueueUpdate
                        ? ` · ${activePlace.metadata.lastQueueUpdate}`
                        : ''}
                    </span>
                  )}
                </div>

                {/* Fuel grades badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(activePlace.metadata.fuelTypes || []).map((fuel) => (
                    <span
                      key={fuel}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs dark:bg-slate-900 dark:text-emerald-300"
                    >
                      ✓ {FUEL_LABELS[fuel]?.[lang] || fuel}
                    </span>
                  ))}
                </div>

                {/* Live Reporter Form */}
                <form onSubmit={handleSubmitFuelReport} className="mt-4 rounded-xl bg-white p-3.5 dark:bg-[#131C26]">
                  <div className="text-xs font-bold text-stone-800 dark:text-slate-200">
                    {dict.updateFuelStatus}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {(['quiet', 'moderate', 'busy'] as QueueStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setQueueStatus(st)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                          queueStatus === st
                            ? QUEUE_LABELS[st].colorClass + ' ring-2 ring-teal-500/30'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {QUEUE_LABELS[st][lang]}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {ALL_FUEL_TYPES.map((fuel) => {
                      const active = selectedFuels.includes(fuel);
                      return (
                        <button
                          key={fuel}
                          type="button"
                          onClick={() => handleToggleFuelChip(fuel)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            active
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {FUEL_LABELS[fuel][lang]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder={lang === 'ar' ? 'اسمك (اختياري)' : 'Your name (optional)'}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={fuelNote}
                      onChange={(e) => setFuelNote(e.target.value)}
                      placeholder={lang === 'ar' ? 'ملاحظة (مثلاً: البنزين المحسن متوفر)' : 'Note (e.g. Super petrol flowing)'}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFuel}
                    className="mt-2.5 rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {submittingFuel ? dict.submitting : dict.updateStatusBtn}
                  </button>
                </form>

                {fuelReports.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {fuelReports.slice(0, 3).map((rep) => (
                      <div
                        key={rep.id}
                        className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs dark:bg-slate-900/60"
                      >
                        <div>
                          <span className="font-bold text-stone-800 dark:text-slate-200">
                            {rep.reporterName}
                          </span>
                          {rep.note && (
                            <p className="mt-0.5 text-stone-600 dark:text-slate-400">{rep.note}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            QUEUE_LABELS[rep.queueStatus]?.colorClass || ''
                          }`}
                        >
                          {QUEUE_LABELS[rep.queueStatus]?.[lang]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Category Specs & Amenities */}
            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131C26]">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                {dict.placeSpecs}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {activePlace.metadata.cuisineAr && (
                  <span className="rounded-xl bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-800 dark:text-orange-300">
                    {lang === 'ar' ? activePlace.metadata.cuisineAr : activePlace.metadata.cuisineEn}
                  </span>
                )}
                {activePlace.metadata.specialtyAr && (
                  <span className="rounded-xl bg-amber-500/12 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    {lang === 'ar' ? activePlace.metadata.specialtyAr : activePlace.metadata.specialtyEn}
                  </span>
                )}
                {activePlace.metadata.floors && (
                  <span className="rounded-xl bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                    {lang === 'ar'
                      ? `${activePlace.metadata.floors} طوابق · ${activePlace.metadata.storesCount || 100}+ متجر`
                      : `${activePlace.metadata.floors} Floors · ${activePlace.metadata.storesCount || 100}+ Stores`}
                  </span>
                )}
                {activePlace.metadata.ticketInfoAr && (
                  <span className="rounded-xl bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-800 dark:text-violet-300">
                    {lang === 'ar' ? activePlace.metadata.ticketInfoAr : activePlace.metadata.ticketInfoEn}
                  </span>
                )}
                {activePlace.metadata.marketTypeAr && (
                  <span className="rounded-xl bg-yellow-500/12 px-3 py-1.5 text-xs font-bold text-yellow-800 dark:text-yellow-300">
                    {lang === 'ar' ? activePlace.metadata.marketTypeAr : activePlace.metadata.marketTypeEn}
                  </span>
                )}

                {activePlace.amenities.map((am) => (
                  <span
                    key={am}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
                  >
                    ✓ {AMENITY_LABELS[am]?.[lang] || am}
                  </span>
                ))}
              </div>
            </section>

            {/* Reviews & Composer */}
            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131C26]">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-white">
                <MessageSquarePlus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                {dict.reviewsTitle} ({activePlace.reviewCount})
              </h3>

              {/* Add Review Form */}
              <form
                onSubmit={handleSubmitReview}
                className="mt-3 rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="text-xs font-bold text-stone-800 dark:text-slate-200">
                  {dict.addReviewTitle}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  {/* Star Picker */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        aria-label={`${starVal} stars`}
                        className="p-0.5 transition hover:scale-110"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            starVal <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Visit Type */}
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as Review['visitType'])}
                    className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {Object.entries(VISIT_TYPE_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2.5 space-y-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={dict.yourNamePlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={dict.commentPlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {reviewError && <p className="mt-1.5 text-xs font-bold text-rose-600">{reviewError}</p>}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="mt-2.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  {submittingReview ? dict.submitting : dict.submitReview}
                </button>
              </form>

              {/* Review List */}
              <div className="mt-4 space-y-3">
                {loading && reviews.length === 0 ? (
                  <div className="py-4 text-center text-xs text-stone-400">...</div>
                ) : reviews.length === 0 ? (
                  <p className="py-3 text-center text-xs text-stone-500 dark:text-slate-400">
                    {lang === 'ar'
                      ? 'لا توجد تقييمات بعد — شاركنا تجربتك الأولى!'
                      : 'No reviews yet — be the first to review!'}
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600/15 text-xs font-extrabold text-teal-800 dark:text-teal-300">
                            {rev.authorName.slice(0, 1)}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-stone-900 dark:text-white">
                              {rev.authorName}
                            </div>
                            <div className="text-[10px] text-stone-500 dark:text-slate-400">
                              {VISIT_TYPE_LABELS[rev.visitType]?.[lang] || rev.visitType}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-stone-700 dark:text-slate-300">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right / Map & Nearby Column */}
          <div className="space-y-5 lg:col-span-5">
            <InteractiveMap
              places={[activePlace]}
              lang={lang}
              selectedCity={activePlace.city}
              selectedPlaceId={activePlace.id}
              userCoords={userCoords}
              heightClassName="h-64 sm:h-72"
            />

            {nearby.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131C26]">
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {dict.nearbyPlaces}
                </h3>
                <div className="mt-3 space-y-2.5">
                  {nearby.map((np) => {
                    const nCat = CATEGORY_MAP[np.category];
                    return (
                      <button
                        key={np.id}
                        type="button"
                        onClick={() => onSelectNearby(np)}
                        className="flex w-full items-center gap-3 rounded-xl border border-stone-100 p-2 text-start transition hover:border-teal-500/40 hover:bg-stone-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <img
                          src={np.imageUrl}
                          alt={lang === 'ar' ? np.nameAr : np.nameEn}
                          className="h-12 w-14 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-extrabold text-stone-900 dark:text-white">
                            {lang === 'ar' ? np.nameAr : np.nameEn}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-500 dark:text-slate-400">
                            <span className={nCat.badgeTextClass}>
                              {lang === 'ar' ? nCat.nameAr : nCat.nameEn}
                            </span>
                            <span>·</span>
                            <span>{formatDistance(np.distanceKm, lang)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
