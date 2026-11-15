import { DalilApp } from '@/components/DalilApp';
import { listPlaces } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initialData = listPlaces({
    userLat: 33.3095,
    userLng: 44.4068,
    sort: 'featured',
  });

  return (
    <DalilApp
      initialPlaces={initialData.places}
      initialCounts={initialData.countsByCategory}
    />
  );
}
