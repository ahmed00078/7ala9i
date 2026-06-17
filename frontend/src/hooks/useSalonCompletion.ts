import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '../api/owner';
import {
  computeSalonCompletion,
  type SalonCompletion,
  type OwnerSalonLike,
} from '../utils/salonCompletion';

/**
 * Reads the owner's salon (shared `['owner','salon']` cache — already populated by
 * the Owner Profile screen) and derives its completion checklist. `loading` lets
 * callers (e.g. the dashboard banner) render nothing until the salon is known,
 * rather than flashing a "0% complete" nudge.
 */
export function useSalonCompletion(): SalonCompletion & { loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = data?.data as OwnerSalonLike | undefined;
  return { ...computeSalonCompletion(salon), loading: isLoading };
}
