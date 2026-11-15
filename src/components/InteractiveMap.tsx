'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  ExternalLink,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Star,
} from 'lucide-react';
import { CATEGORY_MAP } from '@/lib/categories';
import { CITY_MAP } from '@/lib/cities';
import { t } from '@/lib/i18n';
import type { CitySlug, Language, Place } from '@/lib/types';
import { formatDistance, getGoogleMapsUrl } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';

interface InteractiveMapProps {
  places: Place[];
  lang: Language;
  selectedCity: CitySlug | 'all';
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: Place) => void;
  onOpenDetail?: (place: Place) => void;
  userCoords: { lat: number; lng: number };
  heightClassName?: string;
  pickerMode?: boolean;
  pickedCoords?: { lat: number; lng: number };
  onPickCoords?: (coords: { lat: number; lng: number }) => void;
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  mode: 'baghdad' | 'iraq' | 'city';
}

const BAGHDAD_BOUNDS: Bounds = {
  minLat: 33.255,
  maxLat: 33.445,
  minLng: 44.255,
  maxLng: 44.485,
  mode: 'baghdad',
};

const IRAQ_BOUNDS: Bounds = {
  minLat: 29.8,
  maxLat: 37.1,
  minLng: 41.8,
  maxLng: 48.8,
  mode: 'iraq',
};

// Authentic Baghdad Tigris River polyline (north Fahama -> Adhamiyah -> Mutanabbi -> Karrada -> Jadriya -> Dora)
const BAGHDAD_TIGRIS_POINTS: [number, number][] = [
  [33.445, 44.336],
  [33.428, 44.349],
  [33.402, 44.342],
  [33.382, 44.351],
  [33.368, 44.360],
  [33.354, 44.365],
  [33.344, 44.380],
  [33.334, 44.394],
  [33.321, 44.401],
  [33.308, 44.403],
  [33.296, 44.395],
  [33.283, 44.376],
  [33.268, 44.372],
  [33.255, 44.395],
];

const BAGHDAD_BRIDGES: { nameAr: string; nameEn: string; a: [number, number]; b: [number, number] }[] = [
  { nameAr: 'جسر الصرافية', nameEn: 'Sarrafiya', a: [33.356, 44.359], b: [33.356, 44.371] },
  { nameAr: 'جسر الجمهورية', nameEn: 'Jumhuriya', a: [33.329, 44.390], b: [33.329, 44.404] },
  { nameAr: 'جسر 14 تموز', nameEn: '14 July', a: [33.295, 44.388], b: [33.295, 44.401] },
  { nameAr: 'جسر الجادرية', nameEn: 'Jadriya', a: [33.281, 44.369], b: [33.281, 44.382] },
];

const BAGHDAD_LABELS: { nameAr: string; nameEn: string; lat: number; lng: number }[] = [
  { nameAr: 'المنصور', nameEn: 'Al-Mansour', lat: 33.322, lng: 44.333 },
  { nameAr: 'الكرادة', nameEn: 'Karrada', lat: 33.301, lng: 44.426 },
  { nameAr: 'زيونة', nameEn: 'Zayouna', lat: 33.334, lng: 44.458 },
  { nameAr: 'الجادرية', nameEn: 'Jadriya', lat: 33.274, lng: 44.392 },
  { nameAr: 'الحارثية', nameEn: 'Harithiya', lat: 33.303, lng: 44.354 },
  { nameAr: 'المتنبي والشورجة', nameEn: 'Mutanabbi & Shorja', lat: 33.346, lng: 44.396 },
  { nameAr: 'الأعظمية', nameEn: 'Adhamiyah', lat: 33.376, lng: 44.366 },
  { nameAr: 'الكاظمية', nameEn: 'Kadhimiya', lat: 33.381, lng: 44.334 },
  { nameAr: 'شارع فلسطين', nameEn: 'Palestine St', lat: 33.353, lng: 44.424 },
  { nameAr: 'طريق المطار', nameEn: 'Airport Rd', lat: 33.292, lng: 44.281 },
];

const IRAQ_TIGRIS_PATH: [number, number][] = [
  [37.0, 42.4],
  [36.35, 43.13],
  [35.47, 43.25],
  [34.6, 43.68],
  [33.33, 44.38],
  [32.5, 45.8],
  [31.85, 47.15],
  [30.51, 47.82],
];

const IRAQ_EUPHRATES_PATH: [number, number][] = [
  [34.4, 41.9],
  [33.42, 43.3],
  [32.61, 44.03],
  [32.0, 44.34],
  [31.3, 45.28],
  [31.04, 46.26],
  [30.51, 47.78],
];

const SVG_W = 1000;
const SVG_H = 660;

export function InteractiveMap({
  places,
  lang,
  selectedCity,
  selectedPlaceId,
  onSelectPlace,
  onOpenDetail,
  userCoords,
  heightClassName = 'h-[500px]',
  pickerMode = false,
  pickedCoords,
  onPickCoords,
}: InteractiveMapProps) {
  const dict = t(lang);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bounds: Bounds = useMemo(() => {
    if (selectedCity === 'baghdad') return BAGHDAD_BOUNDS;
    if (selectedCity === 'all') {
      // If all visible places are in Baghdad, keep Baghdad zoom for clarity; otherwise show Iraq
      const allBaghdad = places.length > 0 && places.every((p) => p.city === 'baghdad');
      return allBaghdad ? BAGHDAD_BOUNDS : IRAQ_BOUNDS;
    }
    const cityCfg = CITY_MAP[selectedCity];
    return {
      minLat: cityCfg.center.lat - 0.055,
      maxLat: cityCfg.center.lat + 0.055,
      minLng: cityCfg.center.lng - 0.075,
      maxLng: cityCfg.center.lng + 0.075,
      mode: 'city',
    };
  }, [selectedCity, places]);

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * SVG_W;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * SVG_H;
    return { x, y };
  };

  const unproject = (svgX: number, svgY: number) => {
    const lng = bounds.minLng + (svgX / SVG_W) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + (1 - svgY / SVG_H) * (bounds.maxLat - bounds.minLat);
    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  };

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) || null,
    [places, selectedPlaceId]
  );

  const tigrisSvgPath = useMemo(() => {
    const pts = bounds.mode === 'iraq' ? IRAQ_TIGRIS_PATH : BAGHDAD_TIGRIS_POINTS;
    return pts
      .map(([lat, lng], idx) => {
        const { x, y } = project(lat, lng);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  const euphratesSvgPath = useMemo(() => {
    if (bounds.mode !== 'iraq') return '';
    return IRAQ_EUPHRATES_PATH.map(([lat, lng], idx) => {
      const { x, y } = project(lat, lng);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }
    setPan({
      x: Math.max(-360, Math.min(360, dragStartRef.current.panX + dx)),
      y: Math.max(-240, Math.min(240, dragStartRef.current.panY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMoved = dragStartRef.current?.moved;
    setDragging(false);
    dragStartRef.current = null;

    if (pickerMode && onPickCoords && !wasMoved && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      // Convert viewport pixel inside map container back into SVG space accounting for transform
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const untransformedX = (relX - cx - pan.x) / zoom + cx;
      const untransformedY = (relY - cy - pan.y) / zoom + cy;
      const svgX = (untransformedX / rect.width) * SVG_W;
      const svgY = (untransformedY / rect.height) * SVG_H;
      onPickCoords(unproject(svgX, svgY));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const userPt = project(userCoords.lat, userCoords.lng);
  const pickedPt = pickedCoords ? project(pickedCoords.lat, pickedCoords.lng) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-200/90 bg-[#EFE9DD] shadow-sm dark:border-slate-800 dark:bg-[#0F1823] ${heightClassName}`}
    >
      {/* Top Map Header Pill */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/92 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
          <Navigation className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>
            {pickerMode
              ? dict.pinLocationLabel
              : bounds.mode === 'baghdad'
              ? dict.mapHintBaghdad
              : dict.mapHintIraq}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-stone-200/90 bg-white/92 p-1 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.6, Math.round((z + 0.35) * 100) / 100))}
            aria-label={dict.zoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.85, Math.round((z - 0.35) * 100) / 100))}
            aria-label={dict.zoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label={dict.resetMap}
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Pan/Zoom Canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setDragging(false);
          dragStartRef.current = null;
        }}
        className={`relative h-full w-full touch-none select-none ${
          pickerMode ? 'cursor-crosshair' : dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          className="relative h-full w-full transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Geographic Vector Layer */}
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <pattern id="dalil-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  className="stroke-stone-300/45 dark:stroke-slate-800/70"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            {/* Map background grid */}
            <rect width={SVG_W} height={SVG_H} fill="url(#dalil-grid)" />

            {/* Subtle Baghdad major ring road & avenues when in Baghdad mode */}
            {bounds.mode === 'baghdad' && (
              <g className="stroke-stone-300/80 dark:stroke-slate-700/75" fill="none">
                <ellipse cx="550" cy="360" rx="340" ry="215" strokeWidth="5" strokeDasharray="10 8" />
                <line x1="120" y1="530" x2="540" y2="395" strokeWidth="6" />
                <line x1="540" y1="395" x2="900" y2="290" strokeWidth="5" />
                <line x1="480" y1="80" x2="660" y2="590" strokeWidth="4" />
                <line x1="300" y1="310" x2="880" y2="345" strokeWidth="4" />
              </g>
            )}

            {/* Tigris River */}
            <path
              d={tigrisSvgPath}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-[#77C3C0]/75 dark:stroke-[#165E63]/85"
              strokeWidth={bounds.mode === 'baghdad' ? 28 : 8}
            />
            <path
              d={tigrisSvgPath}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-[#A5DCD9]/80 dark:stroke-[#1F7E84]/70"
              strokeWidth={bounds.mode === 'baghdad' ? 14 : 4}
            />

            {/* Euphrates River in Iraq Overview */}
            {bounds.mode === 'iraq' && euphratesSvgPath && (
              <path
                d={euphratesSvgPath}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-[#77C3C0]/65 dark:stroke-[#165E63]/75"
                strokeWidth="7"
              />
            )}

            {/* Baghdad Bridges */}
            {bounds.mode === 'baghdad' &&
              BAGHDAD_BRIDGES.map((br) => {
                const pa = project(br.a[0], br.a[1]);
                const pb = project(br.b[0], br.b[1]);
                return (
                  <g key={br.nameEn}>
                    <line
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      className="stroke-amber-600/80 dark:stroke-amber-400/80"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

            {/* District / City Labels */}
            {bounds.mode === 'baghdad' &&
              BAGHDAD_LABELS.map((lbl) => {
                const pt = project(lbl.lat, lbl.lng);
                return (
                  <text
                    key={lbl.nameEn}
                    x={pt.x}
                    y={pt.y}
                    textAnchor="middle"
                    className="fill-stone-500/75 text-[14px] font-bold tracking-tight dark:fill-slate-400/65"
                  >
                    {lang === 'ar' ? lbl.nameAr : lbl.nameEn}
                  </text>
                );
              })}

            {bounds.mode === 'iraq' &&
              Object.values(CITY_MAP).map((city) => {
                const pt = project(city.center.lat, city.center.lng);
                return (
                  <g key={city.slug}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      className="fill-teal-600/20 stroke-teal-700/40 dark:fill-teal-400/20 dark:stroke-teal-300/40"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 14}
                      textAnchor="middle"
                      className="fill-stone-600 text-[15px] font-bold dark:fill-slate-300"
                    >
                      {lang === 'ar' ? city.nameAr : city.nameEn}
                    </text>
                  </g>
                );
              })}

            {bounds.mode === 'city' &&
              selectedCity !== 'all' &&
              CITY_MAP[selectedCity]?.districts.map((dist) => {
                const pt = project(dist.lat, dist.lng);
                return (
                  <text
                    key={dist.nameEn}
                    x={pt.x}
                    y={pt.y - 14}
                    textAnchor="middle"
                    className="fill-stone-500/80 text-[14px] font-bold dark:fill-slate-400/75"
                  >
                    {lang === 'ar' ? dist.nameAr : dist.nameEn}
                  </text>
                );
              })}
          </svg>

          {/* User Reference Marker */}
          {!pickerMode &&
            userPt.x >= 0 &&
            userPt.x <= SVG_W &&
            userPt.y >= 0 &&
            userPt.y <= SVG_H && (
              <div
                style={{
                  left: `${(userPt.x / SVG_W) * 100}%`,
                  top: `${(userPt.y / SVG_H) * 100}%`,
                  transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(zoom)})`,
                }}
                className="pointer-events-none absolute z-10 flex flex-col items-center"
              >
                <span className="absolute h-8 w-8 animate-ping rounded-full bg-sky-500/35" />
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-md dark:border-slate-900">
                  <Crosshair className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="mt-1 whitespace-nowrap rounded-full bg-sky-900/85 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  {dict.userPinLabel}
                </span>
              </div>
            )}

          {/* Picker Mode Marker */}
          {pickerMode && pickedPt && (
            <div
              style={{
                left: `${(pickedPt.x / SVG_W) * 100}%`,
                top: `${(pickedPt.y / SVG_H) * 100}%`,
                transform: `translate(-50%, -100%) scale(${1 / Math.sqrt(zoom)})`,
              }}
              className="pointer-events-none absolute z-20 flex flex-col items-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-white shadow-lg">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="mt-0.5 h-2 w-2 rounded-full bg-teal-600/40" />
            </div>
          )}

          {/* Place Pins */}
          {!pickerMode &&
            places.map((place) => {
              const pt = project(place.lat, place.lng);
              if (pt.x < -30 || pt.x > SVG_W + 30 || pt.y < -30 || pt.y > SVG_H + 30) return null;

              const cat = CATEGORY_MAP[place.category];
              const isSelected = place.id === selectedPlaceId;
              const isHovered = place.id === hoveredId;

              return (
                <div
                  key={place.id}
                  style={{
                    left: `${(pt.x / SVG_W) * 100}%`,
                    top: `${(pt.y / SVG_H) * 100}%`,
                    transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(zoom)})`,
                  }}
                  className={`absolute ${isSelected || isHovered ? 'z-30' : 'z-10'}`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlace?.(place);
                    }}
                    onMouseEnter={() => setHoveredId(place.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    aria-label={lang === 'ar' ? place.nameAr : place.nameEn}
                    className={`group relative flex items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-all duration-150 dark:border-slate-900 ${
                      cat.pinBgClass
                    } ${
                      isSelected
                        ? 'h-10 w-10 scale-115 ring-4 ring-teal-500/40'
                        : 'h-8 w-8 hover:scale-110'
                    }`}
                  >
                    <CategoryIcon category={place.category} className="h-4 w-4" />
                    {place.isOpenNow && (
                      <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400 dark:border-slate-900" />
                    )}
                  </button>

                  {/* Hover Tooltip */}
                  {(isHovered || isSelected) && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-stone-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-stone-800 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100">
                      {lang === 'ar' ? place.nameAr : place.nameEn}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Selected Place Floating Card on Map */}
      {!pickerMode && selectedPlace && (
        <div className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-md rounded-2xl border border-stone-200/95 bg-white/96 p-3 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <img
              src={selectedPlace.imageUrl}
              alt={lang === 'ar' ? selectedPlace.nameAr : selectedPlace.nameEn}
              className="h-16 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    CATEGORY_MAP[selectedPlace.category].badgeBgClass
                  } ${CATEGORY_MAP[selectedPlace.category].badgeTextClass}`}
                >
                  <CategoryIcon category={selectedPlace.category} className="h-3 w-3" />
                  {lang === 'ar'
                    ? CATEGORY_MAP[selectedPlace.category].nameAr
                    : CATEGORY_MAP[selectedPlace.category].nameEn}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    selectedPlace.isOpenNow
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedPlace.isOpenNow ? dict.openNow : dict.closedNow}
                </span>
              </div>

              <h4 className="mt-1 truncate text-sm font-bold text-stone-900 dark:text-white">
                {lang === 'ar' ? selectedPlace.nameAr : selectedPlace.nameEn}
              </h4>

              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                <span>
                  {lang === 'ar' ? selectedPlace.districtAr : selectedPlace.districtEn}
                </span>
                {selectedPlace.distanceKm !== undefined && (
                  <>
                    <span>·</span>
                    <span>{formatDistance(selectedPlace.distanceKm, lang)}</span>
                  </>
                )}
                {selectedPlace.reviewCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-current" />
                      {selectedPlace.ratingAvg.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDetail?.(selectedPlace)}
              className="flex-1 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {dict.detailsBtn}
            </button>
            <a
              href={getGoogleMapsUrl(
                selectedPlace.lat,
                selectedPlace.lng,
                lang === 'ar' ? selectedPlace.nameAr : selectedPlace.nameEn
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {dict.directionsBtn}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
