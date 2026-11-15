'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Compass,
  Crosshair,
  Fuel,
  Globe,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Moon,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Sun,
  Users,
  Car,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { CITIES, CITY_MAP } from '@/lib/cities';
import { FUEL_LABELS, t } from '@/lib/i18n';
import type {
  CategorySlug,
  CitySlug,
  FuelType,
  Language,
  Place,
  PlacesListResponse,
  SortOption,
  ViewMode,
} from '@/lib/types';
import { AddPlaceModal } from './AddPlaceModal';
import { CategoryIcon } from './CategoryIcon';
import { InteractiveMap } from './InteractiveMap';
import { PlaceCard } from './PlaceCard';
import { PlaceDetailModal } from './PlaceDetailModal';

interface DalilAppProps {
  initialPlaces: Place[];
  initialCounts: Record<CategorySlug | 'all', number>;
}

const DEFAULT_BAGHDAD_REF = { lat: 33.3095, lng: 44.4068 }; // Central Baghdad (Karrada / Abu Nuwas)

export function DalilApp({ initialPlaces, initialCounts }: DalilAppProps) {
  const [lang, setLang] = useState<Language>('ar');
  const [darkMode, setDarkMode] = useState(false);
  const [visitorId, setVisitorId] = useState('guest-baghdad');

  // Filter & Discovery State
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [counts, setCounts] = useState<Record<CategorySlug | 'all', number>>(initialCounts);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>('all');
  const [selectedCity, setSelectedCity] = useState<CitySlug | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [familyOnly, setFamilyOnly] = useState(false);
  const [parkingOnly, setParkingOnly] = useState(false);
  const [hours24Only, setHours24Only] = useState(false);
  const [workOnly, setWorkOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Location Reference State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(DEFAULT_BAGHDAD_REF);
  const [locationLabel, setLocationLabel] = useState<{ ar: string; en: string }>({
    ar: 'وسط بغداد (الكرادة)',
    en: 'Central Baghdad (Karrada)',
  });
  const [gpsFeedback, setGpsFeedback] = useState('');

  // Selection & Modals
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState<string | null>(
    initialPlaces[0]?.id || null
  );
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const dict = t(lang);

  // Hydrate persisted preferences & visitorId
  useEffect(() => {
    Promise.resolve().then(() => {
      const savedLang = window.localStorage.getItem('dalil_lang') as Language | null;
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang);
      }
      const savedTheme = window.localStorage.getItem('dalil_theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }

      let vid = window.localStorage.getItem('dalil_visitor_id');
      if (!vid) {
        vid = `dalil-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem('dalil_visitor_id', vid);
      }
      setVisitorId(vid);
    });
  }, []);

  // Sync HTML dir/lang & dark class
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 220);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildPlacesParams = useCallback(() => {
    const amenitiesList: string[] = [];
    if (familyOnly) amenitiesList.push('family_section');
    if (parkingOnly) amenitiesList.push('parking');
    if (workOnly) amenitiesList.push('work_friendly');

    const params = new URLSearchParams({
      category: selectedCategory,
      city: selectedCity,
      district: selectedDistrict,
      q: debouncedSearch,
      openNow: String(openNowOnly),
      hours24: String(hours24Only),
      favoritesOnly: String(favoritesOnly),
      fuelType,
      sort: sortBy,
      visitorId,
      lat: String(userCoords.lat),
      lng: String(userCoords.lng),
    });
    if (amenitiesList.length > 0) {
      params.set('amenities', amenitiesList.join(','));
    }
    return params;
  }, [
    selectedCategory,
    selectedCity,
    selectedDistrict,
    debouncedSearch,
    openNowOnly,
    familyOnly,
    parkingOnly,
    hours24Only,
    workOnly,
    favoritesOnly,
    fuelType,
    sortBy,
    visitorId,
    userCoords.lat,
    userCoords.lng,
  ]);

  // Fetch places from API whenever filters change
  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildPlacesParams();
      const res = await fetch(`/api/places?${params.toString()}`);
      if (!res.ok) return;
      const data: PlacesListResponse = await res.json();
      setPlaces(data.places);
      setCounts(data.countsByCategory);
      if (data.places.length > 0 && !data.places.some((p) => p.id === selectedMapPlaceId)) {
        setSelectedMapPlaceId(data.places[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [buildPlacesParams, selectedMapPlaceId]);

  useEffect(() => {
    let cancelled = false;
    const params = buildPlacesParams();
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      return fetch(`/api/places?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PlacesListResponse | null) => {
          if (cancelled || !data) return;
          setPlaces(data.places);
          setCounts(data.countsByCategory);
          setSelectedMapPlaceId((prevId) => {
            if (data.places.length === 0) return null;
            if (prevId && data.places.some((p) => p.id === prevId)) return prevId;
            return data.places[0].id;
          });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [buildPlacesParams]);

  // Available districts for current city
  const availableDistricts = useMemo(() => {
    if (selectedCity !== 'all') {
      return CITY_MAP[selectedCity]?.districts || [];
    }
    return CITY_MAP.baghdad.districts;
  }, [selectedCity]);

  const favoritesCount = useMemo(
    () => places.filter((p) => p.isFavorite).length,
    [places]
  );

  const handleCitySelect = (nextCity: CitySlug | 'all') => {
    setSelectedCity(nextCity);
    setSelectedDistrict('all');
    if (nextCity !== 'all') {
      const cfg = CITY_MAP[nextCity];
      setUserCoords(cfg.center);
      setLocationLabel({ ar: `مركز ${cfg.nameAr}`, en: `${cfg.nameEn} Center` });
    } else {
      setUserCoords(DEFAULT_BAGHDAD_REF);
      setLocationLabel({ ar: 'وسط بغداد (الكرادة)', en: 'Central Baghdad (Karrada)' });
    }
  };

  const handleDetectGps = () => {
    setGpsFeedback('');
    if (!navigator.geolocation) {
      setGpsFeedback(dict.gpsUnavailable);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
        });
        setLocationLabel({ ar: 'موقعي الحالي (GPS)', en: 'My GPS Location' });
        setSortBy('nearest');
      },
      () => {
        setGpsFeedback(dict.gpsUnavailable);
        setTimeout(() => setGpsFeedback(''), 3000);
      },
      { timeout: 5000 }
    );
  };

  const handleToggleFavorite = async (placeId: string) => {
    // Optimistic toggle
    setPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
    if (detailPlace?.id === placeId) {
      setDetailPlace((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, placeId }),
      });
      if (res.ok) {
        const data = await res.json();
        const favSet = new Set<string>(data.favorites || []);
        setPlaces((prev) => prev.map((p) => ({ ...p, isFavorite: favSet.has(p.id) })));
        if (favoritesOnly) {
          fetchPlaces();
        }
      }
    } catch {
      // ignore network failure
    }
  };

  const resetAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSelectedCity('all');
    setSelectedDistrict('all');
    setOpenNowOnly(false);
    setFamilyOnly(false);
    setParkingOnly(false);
    setHours24Only(false);
    setWorkOnly(false);
    setFavoritesOnly(false);
    setFuelType('all');
    setSortBy('featured');
  };

  // Quick discovery presets in Hero
  const applyPreset = (preset: 'nearest_fuel' | 'open_restaurants' | 'work_cafes' | 'malls') => {
    resetAllFilters();
    if (preset === 'nearest_fuel') {
      setSelectedCategory('gas_stations');
      setOpenNowOnly(true);
      setSortBy('nearest');
      setViewMode('split');
    } else if (preset === 'open_restaurants') {
      setSelectedCategory('restaurants');
      setOpenNowOnly(true);
    } else if (preset === 'work_cafes') {
      setSelectedCategory('cafes');
      setWorkOnly(true);
    } else if (preset === 'malls') {
      setSelectedCategory('malls');
      setSortBy('rating');
    }
    const el = document.getElementById('dalil-directory');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePlaceUpdated = (updated: Place) => {
    setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (detailPlace?.id === updated.id) {
      setDetailPlace(updated);
    }
  };

  const handlePlaceCreated = (created: Place) => {
    setSelectedCategory(created.category);
    setSelectedCity(created.city);
    setSelectedDistrict('all');
    setDetailPlace(created);
    fetchPlaces();
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedCity !== 'all' ||
    selectedDistrict !== 'all' ||
    Boolean(debouncedSearch) ||
    openNowOnly ||
    familyOnly ||
    parkingOnly ||
    hours24Only ||
    workOnly ||
    favoritesOnly ||
    fuelType !== 'all';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ==================== TOP HEADER ==================== */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#FAF7F2]/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0B1117]/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={resetAllFilters}
            className="flex items-center gap-2.5 text-start"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-sm dark:bg-teal-600">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-stone-900 dark:text-white">
                  {dict.brandAr}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  {dict.brandEn}
                </span>
              </div>
              <p className="hidden text-[11px] font-medium text-stone-500 sm:block dark:text-slate-400">
                {dict.tagline}
              </p>
            </div>
          </button>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* City Quick Switcher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold shadow-2xs dark:border-slate-700 dark:bg-[#131C26]">
              <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <select
                value={selectedCity}
                onChange={(e) => handleCitySelect(e.target.value as CitySlug | 'all')}
                aria-label={dict.cityLabel}
                className="bg-transparent text-xs font-bold text-stone-800 outline-none dark:text-slate-100"
              >
                <option value="all" className="dark:bg-slate-900">
                  {dict.allCities}
                </option>
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug} className="dark:bg-slate-900">
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorites Quick Filter */}
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                favoritesOnly
                  ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-rose-300 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : 'text-rose-500'}`} />
              <span className="hidden sm:inline">{dict.favoritesBtn}</span>
              {favoritesCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    favoritesOnly ? 'bg-white/25 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:bg-[#131C26] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Globe className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Switcher */}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:bg-[#131C26] dark:text-amber-300 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Add Place CTA */}
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Plus className="h-4 w-4" />
              <span>{dict.addPlaceBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== HERO DISCOVERY SECTION ==================== */}
      <section className="relative overflow-hidden border-b border-stone-200/70 dark:border-slate-800">
        <div className="absolute inset-0">
          <img
            src="/images/hero-baghdad.jpg"
            alt="Baghdad Riverfront"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#091C1F]/80 via-[#0A2527]/78 to-[#0B1117]/92" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-teal-500/20 px-3.5 py-1 text-xs font-bold text-teal-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {dict.heroBadge}
            </span>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {dict.heroTitle}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-stone-200 sm:text-base">
              {dict.heroSubtitle}
            </p>

            {/* Search Bar */}
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/96 p-1.5 shadow-2xl backdrop-blur dark:bg-slate-900/95">
              <Search className="ms-2.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={dict.searchPlaceholder}
                className="w-full bg-transparent py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none dark:text-white dark:placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  ×
                </button>
              )}
              <a
                href="#dalil-directory"
                className="shrink-0 rounded-xl bg-teal-700 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-teal-800 sm:px-5 sm:text-sm"
              >
                {dict.searchBtn}
              </a>
            </div>

            {/* Quick Smart Discovery Shortcuts */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('nearest_fuel')}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur transition hover:bg-emerald-500/35"
              >
                <Fuel className="h-3.5 w-3.5 text-emerald-300" />
                {dict.quickNearestFuel}
              </button>

              <button
                type="button"
                onClick={() => applyPreset('open_restaurants')}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/22"
              >
                <Clock className="h-3.5 w-3.5 text-amber-300" />
                {dict.quickOpenRestaurants}
              </button>

              <button
                type="button"
                onClick={() => applyPreset('work_cafes')}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/22"
              >
                <CategoryIcon category="cafes" className="h-3.5 w-3.5 text-amber-300" />
                {dict.quickWorkCafes}
              </button>

              <button
                type="button"
                onClick={() => applyPreset('malls')}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/22"
              >
                <Building2 className="h-3.5 w-3.5 text-teal-300" />
                {dict.quickMallsMarkets}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MAIN DIRECTORY WORKSPACE ==================== */}
      <main id="dalil-directory" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {/* 6-Category Visual Dock */}
        <section className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setFuelType('all');
            }}
            className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-start transition ${
              selectedCategory === 'all'
                ? 'border-teal-700 bg-teal-700 text-white shadow-md dark:border-teal-500 dark:bg-teal-600'
                : 'border-stone-200 bg-white text-stone-800 hover:border-teal-500/40 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-200'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                selectedCategory === 'all'
                  ? 'bg-white/15 text-white'
                  : 'bg-stone-100 text-teal-700 dark:bg-slate-800 dark:text-teal-400'
              }`}
            >
              <CategoryIcon category="all" className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-extrabold">{dict.allCategories}</div>
              <div
                className={`text-[11px] font-semibold ${
                  selectedCategory === 'all' ? 'text-white/80' : 'text-stone-400'
                }`}
              >
                {counts.all ?? 0}
              </div>
            </div>
          </button>

          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  if (cat.slug !== 'gas_stations') setFuelType('all');
                }}
                className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-start transition ${
                  active
                    ? 'border-teal-700 bg-teal-700 text-white shadow-md dark:border-teal-500 dark:bg-teal-600'
                    : 'border-stone-200 bg-white text-stone-800 hover:border-teal-500/40 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-200'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    active
                      ? 'bg-white/15 text-white'
                      : `${cat.badgeBgClass} ${cat.badgeTextClass}`
                  }`}
                >
                  <CategoryIcon category={cat.slug} className="h-4 w-4" />
                </span>
                <div>
                  <div className="whitespace-nowrap text-xs font-extrabold">
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </div>
                  <div
                    className={`text-[11px] font-semibold ${
                      active ? 'text-white/80' : 'text-stone-400'
                    }`}
                  >
                    {counts[cat.slug] ?? 0}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Filter, Location Reference & View Switcher Toolbar */}
        <section className="mt-4 rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-[#131C26]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-stone-500 dark:text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>

              {/* District Selector */}
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDistrict(val);
                  const found = availableDistricts.find((d) => d.nameEn === val || d.nameAr === val);
                  if (found) {
                    setUserCoords({ lat: found.lat, lng: found.lng });
                    setLocationLabel({ ar: found.nameAr, en: found.nameEn });
                  }
                }}
                aria-label={dict.districtLabel}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">{dict.allDistricts}</option>
                {availableDistricts.map((d) => (
                  <option key={d.nameEn} value={d.nameAr}>
                    {lang === 'ar' ? d.nameAr : d.nameEn}
                  </option>
                ))}
              </select>

              {/* Quick Filter Pills */}
              <button
                type="button"
                onClick={() => setOpenNowOnly((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  openNowOnly
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {dict.openNowOnly}
              </button>

              <button
                type="button"
                onClick={() => setHours24Only((v) => !v)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  hours24Only
                    ? 'border-amber-500 bg-amber-500 text-stone-950'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {dict.hours24Only}
              </button>

              <button
                type="button"
                onClick={() => setFamilyOnly((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  familyOnly
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                {dict.familyOnly}
              </button>

              <button
                type="button"
                onClick={() => setParkingOnly((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  parkingOnly
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                {dict.parkingOnly}
              </button>

              {/* Fuel Grade Filter when Gas Stations or All selected */}
              {(selectedCategory === 'gas_stations' || selectedCategory === 'all') && (
                <select
                  value={fuelType}
                  onChange={(e) => {
                    const val = e.target.value as FuelType | 'all';
                    setFuelType(val);
                    if (val !== 'all') setSelectedCategory('gas_stations');
                  }}
                  aria-label={dict.fuelFilterLabel}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-bold text-emerald-900 outline-none dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  <option value="all">{dict.fuelFilterLabel} {dict.allFuels}</option>
                  {(Object.keys(FUEL_LABELS) as FuelType[]).map((ft) => (
                    <option key={ft} value={ft}>
                      {FUEL_LABELS[ft][lang]}
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {dict.resetFilters}
                </button>
              )}
            </div>

            {/* Right Sort & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label={dict.sortLabel}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="featured">{dict.sortFeatured}</option>
                <option value="nearest">{dict.sortNearest}</option>
                <option value="rating">{dict.sortRating}</option>
                <option value="reviews">{dict.sortReviews}</option>
                <option value="price_asc">{dict.sortPrice}</option>
              </select>

              <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === 'grid'
                      ? 'bg-white text-teal-700 shadow-2xs dark:bg-slate-900 dark:text-teal-400'
                      : 'text-stone-600 dark:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{dict.viewGrid}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === 'split'
                      ? 'bg-white text-teal-700 shadow-2xs dark:bg-slate-900 dark:text-teal-400'
                      : 'text-stone-600 dark:text-slate-300'
                  }`}
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{dict.viewSplit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === 'map'
                      ? 'bg-white text-teal-700 shadow-2xs dark:bg-slate-900 dark:text-teal-400'
                      : 'text-stone-600 dark:text-slate-300'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{dict.viewMap}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reference Location & Results Summary Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5 text-xs dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-stone-600 dark:text-slate-400">
              <span>{dict.yourLocation}</span>
              <span className="font-bold text-stone-900 dark:text-white">
                {locationLabel[lang]}
              </span>
              <button
                type="button"
                onClick={handleDetectGps}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-300"
              >
                <Crosshair className="h-3 w-3" />
                {dict.detectGps}
              </button>
              {gpsFeedback && <span className="text-[11px] text-amber-600">{gpsFeedback}</span>}
            </div>

            <div className="flex items-center gap-2 font-bold text-stone-700 dark:text-slate-300">
              {loading && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
              )}
              <span>
                {places.length} {dict.resultsCount}
              </span>
            </div>
          </div>
        </section>

        {/* ==================== RESULTS AREA ==================== */}
        <section className="mt-6">
          {places.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-[#131C26]">
              <Compass className="mx-auto h-10 w-10 text-teal-600/60" />
              <h3 className="mt-3 text-base font-extrabold text-stone-900 dark:text-white">
                {dict.noResultsTitle}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500 dark:text-slate-400">
                {dict.noResultsDesc}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {dict.resetFilters}
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {dict.addPlaceBtn}
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  lang={lang}
                  onOpenDetail={setDetailPlace}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : viewMode === 'map' ? (
            <InteractiveMap
              places={places}
              lang={lang}
              selectedCity={selectedCity}
              selectedPlaceId={selectedMapPlaceId}
              onSelectPlace={(p) => setSelectedMapPlaceId(p.id)}
              onOpenDetail={setDetailPlace}
              userCoords={userCoords}
              heightClassName="h-[540px] sm:h-[640px]"
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="custom-scroll space-y-4 lg:col-span-5 lg:max-h-[640px] lg:overflow-y-auto lg:pe-1">
                {places.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    lang={lang}
                    compact
                    isSelected={selectedMapPlaceId === place.id}
                    onSelect={(p) => setSelectedMapPlaceId(p.id)}
                    onOpenDetail={setDetailPlace}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
              <div className="lg:col-span-7">
                <div className="lg:sticky lg:top-20">
                  <InteractiveMap
                    places={places}
                    lang={lang}
                    selectedCity={selectedCity}
                    selectedPlaceId={selectedMapPlaceId}
                    onSelectPlace={(p) => setSelectedMapPlaceId(p.id)}
                    onOpenDetail={setDetailPlace}
                    userCoords={userCoords}
                    heightClassName="h-[440px] lg:h-[640px]"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="mt-12 border-t border-stone-200/80 bg-white/70 py-8 dark:border-slate-800 dark:bg-[#0D141D]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-white">
              <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>
                {dict.brandAr} — {dict.brandEn}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-slate-400">
              {dict.footerAbout}
            </p>
          </div>

          <div className="text-xs text-stone-500 dark:text-slate-400">
            <p>{dict.baghdadTimeNote}</p>
          </div>
        </div>
      </footer>

      {/* ==================== MODALS ==================== */}
      <PlaceDetailModal
        place={detailPlace}
        lang={lang}
        visitorId={visitorId}
        userCoords={userCoords}
        onClose={() => setDetailPlace(null)}
        onToggleFavorite={handleToggleFavorite}
        onPlaceUpdated={handlePlaceUpdated}
        onSelectNearby={(np) => setDetailPlace(np)}
      />

      <AddPlaceModal
        open={addModalOpen}
        lang={lang}
        defaultCity={selectedCity}
        onClose={() => setAddModalOpen(false)}
        onCreated={handlePlaceCreated}
      />
    </div>
  );
}
