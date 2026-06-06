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
  // PART-3: close-account fields
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
};

// ── Cash Control ──────────────────────────────────────────────────────────────

export type TeqfMovementType = 'income' | 'expense';
export type TeqfMovementStatus = 'completed' | 'pending';
// PART-3: payment method for income movements (Transferencia / Efectivo)
export type TeqfPaymentMethod = 'efectivo' | 'transferencia';

export type TeqfCashMovement = {
  id: string;
  date: string;              // "YYYY-MM-DD"
  description: string;
  amount: number;            // always positive
  type: TeqfMovementType;
  paymentMethod?: TeqfPaymentMethod; // PART-3: payment method (income only)
  tags?: string[];                   // PART-3: FIFO-capped tags (max 8)
  photoUrls?: string[];              // PART-3: Firebase Storage download URLs
  uploadStatus?: 'pending' | 'uploaded' | 'failed' | null; // PART-3
  assignedTo: string;        // free-text name
  status: TeqfMovementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// PART-3: closed state on project
export type TeqfProjectClosure = {
  isClosed: boolean;
  closedAt?: string;   // ISO timestamp
  closedBy?: string;   // userId
};
