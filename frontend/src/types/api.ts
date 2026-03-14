import {
  User,
  Salon,
  ServiceCategory,
  Service,
  WorkingHours,
  Booking,
  Review,
  Favorite,
  DashboardStats,
  TimeSlot,
} from './models';

// Auth
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'owner';
  preferredLanguage: 'ar' | 'fr' | 'en';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Salon
export interface SearchSalonsRequest {
  query?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalonDetailResponse {
  salon: Salon;
  categories: ServiceCategory[];
  workingHours: WorkingHours[];
  isFavorited: boolean;
}

export interface AvailableSlotsRequest {
  salonId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
}

export interface AvailableSlotsResponse {
  date: string;
  slots: TimeSlot[];
}

// Booking
export interface CreateBookingRequest {
  salonId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
}

export interface BookingListRequest {
  status?: string;
  page?: number;
  limit?: number;
}

// Review
export interface CreateReviewRequest {
  salonId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface ReviewListRequest {
  salonId: string;
  page?: number;
  limit?: number;
}

// Favorites
export interface ToggleFavoriteRequest {
  salonId: string;
}

// User
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  preferredLanguage?: 'ar' | 'fr' | 'en';
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Owner
export interface CreateServiceRequest {
  categoryId: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  duration: number;
  sortOrder?: number;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  isActive?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  nameAr?: string;
  nameFr?: string;
  sortOrder?: number;
}

export interface UpdateWorkingHoursRequest {
  hours: WorkingHours[];
}

export interface UpdateBookingStatusRequest {
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

export interface OwnerBookingsRequest {
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export type {
  User,
  Salon,
  ServiceCategory,
  Service,
  WorkingHours,
  Booking,
  Review,
  Favorite,
  DashboardStats,
  TimeSlot,
};
