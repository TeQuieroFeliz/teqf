// ── Shared file metadata ──────────────────────────────────────────────────────

export interface FileRecord {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  uploadedAt: string;
}

export interface InspirationPhoto extends FileRecord {
  caption: string;
}

export interface QuoteFile extends FileRecord {
  version: number;
  uploadedBy: string;
  uploadedByName: string;
}

export interface CustomItemImage {
  id: string;
  url: string;
  storagePath: string;
}

// ── Catalog item reference ────────────────────────────────────────────────────

export interface CatalogItemRef {
  itemId: string;
  type: 'furniture' | 'flower' | 'linen';
  name: string;
  quantity: number;
  notes: string;
}

// ── Custom item ───────────────────────────────────────────────────────────────

export interface CustomItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  description: string;
  images: CustomItemImage[];
  notes: string;
}

// ── Function ──────────────────────────────────────────────────────────────────

export type FunctionType = 'haldi' | 'sangeet' | 'ceremony' | 'cocktail' | 'reception' | 'custom';

export interface WeddingFunction {
  id: string;
  functionType: FunctionType;
  functionName: string;
  order: number;
  date: string;          // YYYY-MM-DD
  setupStartTime: string;
  venueEntryTime: string;
  eventStartTime: string;
  eventEndTime: string;
  breakdownTime: string;
  venue: string;
  layoutFiles: FileRecord[];
  moodboardFiles: FileRecord[];
  inspirationPhotos: InspirationPhoto[];
  catalogItems: CatalogItemRef[];
  customItems: CustomItem[];
  generalNotes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Wedding status ────────────────────────────────────────────────────────────

export type WeddingStatus = 'draft' | 'in_review' | 'quoted' | 'approved' | 'completed';

// ── Wedding ───────────────────────────────────────────────────────────────────

export interface Wedding {
  id: string;
  weddingName: string;
  primaryLocation: string;
  status: WeddingStatus;
  startDate: string | null;   // YYYY-MM-DD, auto-computed from earliest function
  endDate: string | null;     // YYYY-MM-DD, auto-computed from latest function
  createdBy: string;
  createdByName: string;
  assignedTeqfUser: string | null;
  assignedTeqfUserName: string | null;
  teqfCalendarEventId: string | null;
  currentVersionNumber: number;
  quoteFiles: QuoteFile[];
  createdAt: string;
  updatedAt: string;
}

// ── Version ───────────────────────────────────────────────────────────────────

export interface WeddingVersion {
  id: string;
  versionNumber: number;
  savedBy: string;
  savedByName: string;
  savedAt: string;
  versionLabel: string;
  changeDescription: string;
  isRestore: boolean;
  restoredFromVersion: number | null;
  weddingSnapshot: Omit<Wedding, 'id'>;
  functionsSnapshot: Omit<WeddingFunction, 'id'>[];
}
