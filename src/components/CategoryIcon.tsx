import {
  Building2,
  Coffee,
  Compass,
  Fuel,
  ShoppingBasket,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { CategorySlug } from '@/lib/types';

interface CategoryIconProps {
  category: CategorySlug | 'all';
  className?: string;
}

export function CategoryIcon({ category, className = 'h-4 w-4' }: CategoryIconProps) {
  switch (category) {
    case 'restaurants':
      return <Utensils className={className} />;
    case 'cafes':
      return <Coffee className={className} />;
    case 'gas_stations':
      return <Fuel className={className} />;
    case 'entertainment':
      return <Sparkles className={className} />;
    case 'markets':
      return <ShoppingBasket className={className} />;
    case 'malls':
      return <Building2 className={className} />;
    default:
      return <Compass className={className} />;
  }
}
