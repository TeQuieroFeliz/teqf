// ── Inventario TeQF ───────────────────────────────────────────────────────────
// Virtual warehouse for company-owned stock, split by physical warehouse
// (Cancún / CDMX) and by kind:
//   • herramientas — consumable tools (scissors, pliers, cable ties, tape…) that
//     run out and need reordering; these carry a low-stock threshold that fires
//     an email alert to the admin inbox.
//   • elementos — décor/setup objects kept in stock, with a photo, quantity and a
//     free-text description (used for dimensions).
// NOTE: consumption tracking per wedding is intentionally NOT part of this model
// (decided out of scope for now).

export type InventoryKind = 'herramienta' | 'elemento';

export type Warehouse = 'cancun' | 'cdmx';

export const WAREHOUSES: { value: Warehouse; label: string }[] = [
  { value: 'cancun', label: 'Cancún' },
  { value: 'cdmx', label: 'CDMX' },
];

export const INVENTORY_KINDS: InventoryKind[] = ['herramienta', 'elemento'];

export type InventoryItem = {
  id: string;
  kind: InventoryKind;
  warehouse: Warehouse;
  name: string;
  description: string;   // dimensions and any free-text detail
  imageUrl: string;      // single photo (optional for herramientas)
  quantity: number;      // current units in stock
  minQuantity: number;   // low-stock threshold; 0 = no alert
  lowStockNotified: boolean; // guards against repeated alert emails
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  createdBy: string;     // uid
};

export type InventoryItemInput = Omit<
  InventoryItem,
  'id' | 'createdAt' | 'updatedAt' | 'lowStockNotified'
> & { id?: string };

// True when an item is at or below its (non-zero) threshold.
export function isLowStock(item: Pick<InventoryItem, 'quantity' | 'minQuantity'>): boolean {
  return item.minQuantity > 0 && item.quantity <= item.minQuantity;
}
