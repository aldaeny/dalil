import { notFound } from 'next/navigation';
import { PlaceDetailPageClient } from '@/components/PlaceDetailPageClient';
import { getPlaceDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = getPlaceDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <PlaceDetailPageClient
      initialPlace={detail.place}
      initialReviews={detail.reviews}
      initialFuelReports={detail.fuelReports}
      nearby={detail.nearby}
    />
  );
}
