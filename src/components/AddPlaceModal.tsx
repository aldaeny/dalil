'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, PlusCircle, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP, PLACE_IMAGE_OPTIONS } from '@/lib/categories';
import { CITIES, CITY_MAP } from '@/lib/cities';
import { AMENITY_LABELS, FUEL_LABELS, t } from '@/lib/i18n';
import type { CategorySlug, CitySlug, FuelType, Language, Place, QueueStatus } from '@/lib/types';
import { CategoryIcon } from './CategoryIcon';
import { InteractiveMap } from './InteractiveMap';

interface AddPlaceModalProps {
  open: boolean;
  lang: Language;
  defaultCity: CitySlug | 'all';
  onClose: () => void;
  onCreated: (place: Place) => void;
}

const FUEL_TYPES: FuelType[] = ['regular', 'improved', 'super', 'lpg', 'diesel'];

export function AddPlaceModal({
  open,
  lang,
  defaultCity,
  onClose,
  onCreated,
}: AddPlaceModalProps) {
  const dict = t(lang);
  const initialCity: CitySlug = defaultCity === 'all' ? 'baghdad' : defaultCity;
  const initialDistrict = CITY_MAP[initialCity].districts[0];

  const [category, setCategory] = useState<CategorySlug>('restaurants');
  const [city, setCity] = useState<CitySlug>(initialCity);
  const [districtIdx, setDistrictIdx] = useState(0);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [phone, setPhone] = useState('');
  const [priceLevel, setPriceLevel] = useState<1 | 2 | 3>(2);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('23:30');
  const [imageUrl, setImageUrl] = useState(CATEGORY_MAP.restaurants.defaultImage);
  const [amenities, setAmenities] = useState<string[]>(['family_section']);
  const [coords, setCoords] = useState({ lat: initialDistrict.lat, lng: initialDistrict.lng });

  // Category-specific metadata fields
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>(['regular', 'improved', 'super']);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('quiet');
  const [cuisineAr, setCuisineAr] = useState('');
  const [floors, setFloors] = useState('3');
  const [storesCount, setStoresCount] = useState('120');
  const [ticketInfoAr, setTicketInfoAr] = useState('');
  const [marketTypeAr, setMarketTypeAr] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cityConfig = CITY_MAP[city];
  const selectedDistrict = cityConfig.districts[districtIdx] || cityConfig.districts[0];

  const handleCategoryChange = (nextCat: CategorySlug) => {
    setCategory(nextCat);
    setImageUrl(CATEGORY_MAP[nextCat].defaultImage);
    if (nextCat === 'gas_stations') {
      setIs24Hours(true);
      setAmenities(['open_24h', 'air_oil']);
    } else {
      setIs24Hours(false);
      setAmenities(CATEGORY_MAP[nextCat].suggestedAmenities.slice(0, 2));
    }
  };

  const handleCityChange = (nextCity: CitySlug) => {
    setCity(nextCity);
    setDistrictIdx(0);
    const firstDist = CITY_MAP[nextCity].districts[0];
    setCoords({ lat: firstDist.lat, lng: firstDist.lng });
  };

  const handleDistrictChange = (idx: number) => {
    setDistrictIdx(idx);
    const dist = cityConfig.districts[idx];
    if (dist) {
      setCoords({ lat: dist.lat, lng: dist.lng });
    }
  };

  const toggleAmenity = (am: string) => {
    setAmenities((prev) => (prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]));
  };

  const toggleFuel = (f: FuelType) => {
    setFuelTypes((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nameAr.trim() || !addressAr.trim()) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال اسم المكان والعنوان التفصيلي.'
          : 'Please enter the place name and detailed address.'
      );
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (category === 'gas_stations') {
      metadata.fuelTypes = fuelTypes;
      metadata.queueStatus = queueStatus;
      metadata.lastQueueUpdate = 'الآن';
    } else if (category === 'restaurants' && cuisineAr.trim()) {
      metadata.cuisineAr = cuisineAr.trim();
      metadata.cuisineEn = cuisineAr.trim();
    } else if (category === 'cafes' && cuisineAr.trim()) {
      metadata.specialtyAr = cuisineAr.trim();
      metadata.specialtyEn = cuisineAr.trim();
    } else if (category === 'malls') {
      metadata.floors = Number(floors) || 3;
      metadata.storesCount = Number(storesCount) || 100;
    } else if (category === 'entertainment' && ticketInfoAr.trim()) {
      metadata.ticketInfoAr = ticketInfoAr.trim();
      metadata.ticketInfoEn = ticketInfoAr.trim();
    } else if (category === 'markets' && marketTypeAr.trim()) {
      metadata.marketTypeAr = marketTypeAr.trim();
      metadata.marketTypeEn = marketTypeAr.trim();
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          city,
          districtAr: selectedDistrict.nameAr,
          districtEn: selectedDistrict.nameEn,
          nameAr,
          nameEn: nameEn || undefined,
          descriptionAr: descriptionAr || `${nameAr} في ${selectedDistrict.nameAr}`,
          descriptionEn: descriptionEn || undefined,
          addressAr,
          lat: coords.lat,
          lng: coords.lng,
          phone,
          priceLevel,
          is24Hours,
          openTime,
          closeTime,
          imageUrl,
          amenities,
          metadata,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error creating place');
        return;
      }

      onCreated(data.place);
      // Reset fields for next use
      setNameAr('');
      setNameEn('');
      setDescriptionAr('');
      setDescriptionEn('');
      setAddressAr('');
      setPhone('');
      onClose();
    } catch {
      setError(lang === 'ar' ? 'تعذر حفظ المكان.' : 'Could not save place.');
    } finally {
      setSubmitting(false);
    }
  };

  const suggestedAmenities = CATEGORY_MAP[category].suggestedAmenities;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="custom-scroll relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[#FAF7F2] p-5 shadow-2xl sm:rounded-3xl sm:p-6 dark:bg-[#0F1722]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-stone-900 dark:text-white">
              <PlusCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              {dict.addModalTitle}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
              {dict.addModalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.closeBtn}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-stone-700 transition hover:bg-stone-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. Category Picker */}
          <div>
            <label className="mb-2 block text-xs font-extrabold text-stone-800 dark:text-slate-200">
              {dict.categoryLabel}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((cat) => {
                const active = cat.slug === category;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleCategoryChange(cat.slug)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      active
                        ? 'border-teal-600 bg-teal-700 text-white shadow-sm dark:border-teal-500 dark:bg-teal-600'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-teal-500/40 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200'
                    }`}
                  >
                    <CategoryIcon category={cat.slug} className="h-4 w-4 shrink-0" />
                    <span>{lang === 'ar' ? cat.nameAr : cat.nameEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. City & District + Names */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.cityLabel}
              </label>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value as CitySlug)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              >
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.districtLabel}
              </label>
              <select
                value={districtIdx}
                onChange={(e) => handleDistrictChange(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              >
                {cityConfig.districts.map((d, idx) => (
                  <option key={d.nameEn} value={idx}>
                    {lang === 'ar' ? d.nameAr : d.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.nameArLabel} *
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={lang === 'ar' ? 'مثلاً: مطعم وكباب دجلة' : 'e.g. مطعم وكباب دجلة'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.nameEnLabel}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Dijlah Kebab House"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.addressArLabel} *
              </label>
              <input
                type="text"
                required
                value={addressAr}
                onChange={(e) => setAddressAr(e.target.value)}
                placeholder={lang === 'ar' ? 'الشارع أو أقرب نقطة دالة' : 'Street & nearby landmark'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.phoneLabel}
              </label>
              <input
                type="text"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+964 770 000 0000"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
              {dict.descArLabel}
            </label>
            <textarea
              rows={2}
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'نبذة قصيرة عن الخدمات أو الأجواء أو ما يميز المكان...'
                  : 'Short overview of services, atmosphere, or highlights...'
              }
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
            />
          </div>

          {/* 3. Category-specific details */}
          {category === 'gas_stations' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                {dict.fuelsAvailableLabel}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FUEL_TYPES.map((f) => {
                  const active = fuelTypes.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFuel(f)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        active
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white text-stone-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {FUEL_LABELS[f][lang]}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-slate-300">
                  {lang === 'ar' ? 'حالة الازدحام:' : 'Queue status:'}
                </span>
                <select
                  value={queueStatus}
                  onChange={(e) => setQueueStatus(e.target.value as QueueStatus)}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="quiet">{lang === 'ar' ? 'الازدحام خفيف' : 'Low Traffic'}</option>
                  <option value="moderate">{lang === 'ar' ? 'ازدحام متوسط' : 'Moderate'}</option>
                  <option value="busy">{lang === 'ar' ? 'مزدحمة' : 'Busy'}</option>
                </select>
              </div>
            </div>
          )}

          {(category === 'restaurants' || category === 'cafes') && (
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.cuisineLabel}
              </label>
              <input
                type="text"
                value={cuisineAr}
                onChange={(e) => setCuisineAr(e.target.value)}
                placeholder={
                  category === 'restaurants'
                    ? lang === 'ar'
                      ? 'مثلاً: مشويات عراقية ومسكوف'
                      : 'e.g. Iraqi Grills & Masgouf'
                    : lang === 'ar'
                    ? 'مثلاً: قهوة مختصة وجلسات عمل'
                    : 'e.g. Specialty Coffee & Workspace'
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>
          )}

          {category === 'malls' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                  {dict.floorsLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                  {dict.storesLabel}
                </label>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  value={storesCount}
                  onChange={(e) => setStoresCount(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
                />
              </div>
            </div>
          )}

          {category === 'entertainment' && (
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.ticketLabel}
              </label>
              <input
                type="text"
                value={ticketInfoAr}
                onChange={(e) => setTicketInfoAr(e.target.value)}
                placeholder={lang === 'ar' ? 'مثلاً: الدخول مجاني أو 5,000 د.ع' : 'e.g. Free entry or 5,000 IQD'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>
          )}

          {category === 'markets' && (
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {lang === 'ar' ? 'نوع السوق' : 'Market Type'}
              </label>
              <input
                type="text"
                value={marketTypeAr}
                onChange={(e) => setMarketTypeAr(e.target.value)}
                placeholder={lang === 'ar' ? 'مثلاً: هايبرماركت أو سوق شعبي' : 'e.g. Hypermarket or Traditional Souq'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-[#131C26] dark:text-white"
              />
            </div>
          )}

          {/* 4. Hours & Price */}
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 sm:grid-cols-4 dark:border-slate-800 dark:bg-[#131C26]">
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="is24h"
                type="checkbox"
                checked={is24Hours}
                onChange={(e) => setIs24Hours(e.target.checked)}
                className="h-4 w-4 rounded accent-teal-600"
              />
              <label htmlFor="is24h" className="text-xs font-bold text-stone-800 dark:text-slate-200">
                {dict.is24HoursLabel}
              </label>
            </div>

            {!is24Hours && (
              <>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-stone-500">
                    {dict.openTimeLabel}
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-stone-500">
                    {dict.closeTimeLabel}
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-4">
              <label className="mb-1.5 block text-xs font-bold text-stone-700 dark:text-slate-300">
                {dict.priceTierLabel}
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriceLevel(lvl)}
                    className={`flex-1 rounded-xl border py-1.5 text-xs font-bold transition ${
                      priceLevel === lvl
                        ? 'border-teal-600 bg-teal-600/10 text-teal-800 dark:text-teal-300'
                        : 'border-stone-200 text-stone-600 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {lvl === 1
                      ? lang === 'ar'
                        ? '$ اقتصادي'
                        : '$ Budget'
                      : lvl === 2
                      ? lang === 'ar'
                        ? '$$ متوسط'
                        : '$$ Moderate'
                      : lang === 'ar'
                      ? '$$$ فاخر'
                      : '$$$ Premium'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Amenities */}
          <div>
            <label className="mb-2 block text-xs font-bold text-stone-700 dark:text-slate-300">
              {dict.amenitiesLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggestedAmenities.map((am) => {
                const active = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => toggleAmenity(am)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-teal-600 bg-teal-700 text-white dark:bg-teal-600'
                        : 'border-stone-200 bg-white text-stone-700 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-300'
                    }`}
                  >
                    {AMENITY_LABELS[am]?.[lang] || am}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Cover Image Choice */}
          <div>
            <label className="mb-2 block text-xs font-bold text-stone-700 dark:text-slate-300">
              {dict.imageChoiceLabel}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PLACE_IMAGE_OPTIONS.map((opt) => {
                const active = imageUrl === opt.url;
                return (
                  <button
                    key={opt.url}
                    type="button"
                    onClick={() => setImageUrl(opt.url)}
                    className={`overflow-hidden rounded-xl border-2 text-start transition ${
                      active
                        ? 'border-teal-600 ring-2 ring-teal-500/30'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={opt.url} alt={opt.labelEn} className="h-14 w-full object-cover" />
                    <div className="truncate bg-white px-1.5 py-1 text-[10px] font-bold text-stone-700 dark:bg-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? opt.labelAr : opt.labelEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Map Location Picker */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-bold text-stone-700 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-teal-600" />
                {dict.pinLocationLabel}
              </span>
              <span dir="ltr" className="font-mono text-[11px] text-stone-500">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </div>
            <InteractiveMap
              places={[]}
              lang={lang}
              selectedCity={city}
              userCoords={coords}
              pickerMode
              pickedCoords={coords}
              onPickCoords={setCoords}
              heightClassName="h-52"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {dict.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {submitting ? dict.submitting : dict.createPlaceSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
