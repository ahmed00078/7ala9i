/**
 * Owner profile-completion model.
 *
 * Pure derivation over the owner's `['owner','salon']` payload (backend
 * `SalonDetailResponse`, snake_case). Distinguishes **required** items — a salon
 * literally can't take bookings without them — from **recommended** quality items.
 * i18n stays out of here: rows carry translation *keys*, resolved in the UI.
 */

/** Where a checklist row navigates when tapped (resolved by ProfileCompletionScreen). */
export type CompletionTarget =
  | 'workingHours'
  | 'services'
  | 'photos'
  | 'location'
  | 'address'
  | 'description';

export interface CompletionItem {
  key: CompletionTarget;
  /** Ionicon shown while the item is still incomplete. */
  icon: string;
  /** i18n key for the row label. */
  labelKey: string;
  /** i18n key for the short hint shown while incomplete. */
  hintKey: string;
  complete: boolean;
  required: boolean;
  target: CompletionTarget;
}

export interface SalonCompletion {
  items: CompletionItem[];
  /** Required items only. */
  requiredDone: number;
  requiredTotal: number;
  /** All items. */
  done: number;
  total: number;
  /** True once every required item is satisfied (the salon can take bookings). */
  isLiveReady: boolean;
  /** True once required + recommended are all satisfied. */
  allComplete: boolean;
}

/** Minimal structural shape of the owner salon payload we read. */
export interface OwnerSalonLike {
  name?: string | null;
  address?: string | null;
  description?: string | null;
  description_ar?: string | null;
  lat?: number | null;
  lng?: number | null;
  cover_photo_url?: string | null;
  photos?: Array<unknown> | null;
  working_hours?: Array<{ is_closed?: boolean | null }> | null;
  service_categories?: Array<{ services?: Array<unknown> | null }> | null;
}

const hasOpenDay = (salon: OwnerSalonLike): boolean =>
  (salon.working_hours ?? []).some((wh) => !wh?.is_closed);

const hasService = (salon: OwnerSalonLike): boolean =>
  (salon.service_categories ?? []).some((c) => (c?.services?.length ?? 0) > 0);

const hasPhoto = (salon: OwnerSalonLike): boolean =>
  !!salon.cover_photo_url || (salon.photos?.length ?? 0) > 0;

const hasLocation = (salon: OwnerSalonLike): boolean =>
  salon.lat != null && salon.lng != null;

const hasText = (v?: string | null): boolean => !!v && v.trim().length > 0;

/**
 * Compute the completion checklist for an owner salon. Returns an all-incomplete
 * result for a missing salon so the banner/screen can render a sensible "start
 * here" state instead of crashing.
 */
export function computeSalonCompletion(salon?: OwnerSalonLike | null): SalonCompletion {
  const s = salon ?? {};

  const items: CompletionItem[] = [
    {
      key: 'workingHours',
      icon: 'time-outline',
      labelKey: 'owner.completion.item.workingHours.label',
      hintKey: 'owner.completion.item.workingHours.hint',
      complete: hasOpenDay(s),
      required: true,
      target: 'workingHours',
    },
    {
      key: 'services',
      icon: 'cut-outline',
      labelKey: 'owner.completion.item.services.label',
      hintKey: 'owner.completion.item.services.hint',
      complete: hasService(s),
      required: true,
      target: 'services',
    },
    {
      key: 'photos',
      icon: 'images-outline',
      labelKey: 'owner.completion.item.photos.label',
      hintKey: 'owner.completion.item.photos.hint',
      complete: hasPhoto(s),
      required: false,
      target: 'photos',
    },
    {
      key: 'location',
      icon: 'map-outline',
      labelKey: 'owner.completion.item.location.label',
      hintKey: 'owner.completion.item.location.hint',
      complete: hasLocation(s),
      required: false,
      target: 'location',
    },
    {
      key: 'address',
      icon: 'location-outline',
      labelKey: 'owner.completion.item.address.label',
      hintKey: 'owner.completion.item.address.hint',
      complete: hasText(s.address),
      required: false,
      target: 'address',
    },
    {
      key: 'description',
      icon: 'document-text-outline',
      labelKey: 'owner.completion.item.description.label',
      hintKey: 'owner.completion.item.description.hint',
      complete: hasText(s.description) || hasText(s.description_ar),
      required: false,
      target: 'description',
    },
  ];

  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.complete).length;
  const done = items.filter((i) => i.complete).length;

  return {
    items,
    requiredDone,
    requiredTotal: required.length,
    done,
    total: items.length,
    isLiveReady: requiredDone === required.length,
    allComplete: done === items.length,
  };
}
