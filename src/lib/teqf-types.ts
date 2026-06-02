// ── TeQF Projects ─────────────────────────────────────────────────────────────

export type TeqfProjectStatus = 'active' | 'archived';

export type TeqfProject = {
  id: string;
  name: string;
  dateStart: string;       // "YYYY-MM-DD"
  dateEnd: string;         // "YYYY-MM-DD"
  createdBy: string;       // userId
  createdByName: string;   // display name
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  status: TeqfProjectStatus;
};

// ── Cash Control ──────────────────────────────────────────────────────────────

export type TeqfMovementType = 'income' | 'expense';
export type TeqfMovementStatus = 'completed' | 'pending';

export type TeqfCashMovement = {
  id: string;
  date: string;              // "YYYY-MM-DD"
  description: string;
  amount: number;            // always positive
  type: TeqfMovementType;
  assignedTo: string;        // free-text name
  receiptUrl?: string;
  status: TeqfMovementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
