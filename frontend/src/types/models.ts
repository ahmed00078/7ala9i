export interface User {
  id: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'owner' | 'admin';
  avatarUrl?: string;
  preferredLanguage: 'ar' | 'fr' | 'en';
  createdAt: string;
  updatedAt: string;
}

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  phone: string;
  address: string;
  addressAr?: string;
  city: string;
  latitude: number;
  longitude: number;
  photos: string[];
  coverPhoto?: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  salonId: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  sortOrder: number;
  services: Service[];
}

export interface Service {
  id: string;
  categoryId: string;
  salonId: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  duration: number; // in minutes
  isActive: boolean;
  sortOrder: number;
}

export interface WorkingHours {
  id: string;
  salonId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  isOpen: boolean;
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export interface Booking {
  id: string;
  clientId: string;
  salonId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  salon?: Salon;
  service?: Service;
  client?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  clientId: string;
  salonId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  client?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  clientId: string;
  salonId: string;
  salon?: Salon;
  createdAt: string;
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  weekBookings: number;
  weekRevenue: number;
  monthBookings: number;
  monthRevenue: number;
  totalClients: number;
  averageRating: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  notif_type: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
