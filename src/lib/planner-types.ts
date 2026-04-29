export type FurnitureCategory =
  | 'sedie'
  | 'tavoli'
  | 'tovaglie'
  | 'cocktail_table'
  | 'divani'
  | 'sala_lounge';

export type City = 'cdmx' | 'cancun';

export const FURNITURE_CATEGORIES: { value: FurnitureCategory; label: string }[] = [
  { value: 'sedie', label: 'Sedie' },
  { value: 'tavoli', label: 'Tavoli' },
  { value: 'tovaglie', label: 'Tovaglie' },
  { value: 'cocktail_table', label: 'Cocktail Table' },
  { value: 'divani', label: 'Divani' },
  { value: 'sala_lounge', label: 'Sala Lounge' },
];

export const CITIES: { value: City; label: string }[] = [
  { value: 'cdmx', label: 'Ciudad de México' },
  { value: 'cancun', label: 'Cancún' },
];

export type FurnitureCurrency = 'MXN' | 'USD' | 'EUR';

export type FurnitureItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: FurnitureCurrency;
  cities: string[];
  images: string[];
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FlowerCategory =
  | 'rosas'
  | 'orquideas'
  | 'peonias'
  | 'tulipanes'
  | 'lirios'
  | 'follaje'
  | 'otros';

export const FLOWER_CATEGORIES: { value: FlowerCategory; label: string }[] = [
  { value: 'rosas', label: 'Rosas' },
  { value: 'orquideas', label: 'Orquídeas' },
  { value: 'peonias', label: 'Peonías' },
  { value: 'tulipanes', label: 'Tulipanes' },
  { value: 'lirios', label: 'Lirios' },
  { value: 'follaje', label: 'Follaje' },
  { value: 'otros', label: 'Otros' },
];

export type FlowerItem = {
  id: string;
  name: string;
  category: FlowerCategory;
  price: number;
  unit: string;
  images: string[];
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SelectedFurnitureItem = {
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  price: number;
};

export type SelectedFlowerItem = {
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  price: number;
  unit: string;
};

export type PlannerEventStatus = 'draft' | 'submitted';

export type CustomItem = {
  id: string;
  imageUrls: string[];
  note: string;
};

export type EventDay = {
  id: string;
  date: string;
  eventName: string;
  venue: string;
  venueAddress?: string;
  venuePlaceId?: string;
  venueMapUrl?: string;
  notes: string;
  setupTime: string;
  breakdownTime: string;
  supplierAccessTime: string;
  supplierRegulationUrl: string;
  layoutUrls: string[];
  selectedFurniture: SelectedFurnitureItem[];
  selectedFlowers: SelectedFlowerItem[];
  customItems: CustomItem[];
};

export type PlannerEvent = {
  id: string;
  plannerId: string;
  plannerName: string;
  plannerEmail: string;
  eventCode: string;
  clientName: string;
  city: string;
  days: EventDay[];
  status: PlannerEventStatus;
  createdAt: string;
  updatedAt: string;
  // Legacy fields (kept for backward compatibility)
  selectedFurniture?: SelectedFurnitureItem[];
  selectedFlowers?: SelectedFlowerItem[];
  notes?: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
};

export const CONTRACT_TYPES = [
  { value: 'dipendente', label: 'Dipendente' },
  { value: 'collaboratore', label: 'Collaboratore' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'stage', label: 'Stage' },
] as const;

export type ContractType = typeof CONTRACT_TYPES[number]['value'];

export type PlannerRequestStatus = 'pending' | 'approved' | 'rejected';

export type PlannerRequest = {
  id: string;
  name: string;
  email: string;
  status: PlannerRequestStatus;
  createdAt: string;
};

export type PlannerUser = {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  birthDate?: string;
  startDate?: string;
  contractType?: ContractType;
  phone?: string;
  contactEmail?: string;
  role?: string;
  avatarUrl?: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: any;
  lastLogin: any;
};
