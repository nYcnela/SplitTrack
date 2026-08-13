export type Person = "MACIEK" | "EMILKA";
export type SettlementMode = "NOT_SETTLED" | "HALF" | "FULL" | "CUSTOM";
export type Scope = "cycle" | "month" | "lifetime";
export type BalanceDirection = "MACIEK_OWES_EMILKA" | "EMILKA_OWES_MACIEK" | "EVEN";

export interface ExpenseDTO {
  id: number;
  expenseDate: string; // YYYY-MM-DD
  description: string;
  payer: Person;
  amountPLN: number;

  originalAmount: number;
  originalCurrency: string;
  exchangeRateToPLN: number;

  settlementMode: SettlementMode;
  customOwedPLN?: number | null;
  receiptUrl?: string | null;
  projectId?: number | null;

  maciekPaid?: number | null;
  emilkaPaid?: number | null;

  affectsBalance: boolean;
  owedFrom?: Person | null;
  owedTo?: Person | null;
  owedAmountPLN?: number | null;

  createdAt?: string;
}

export interface SettlementDTO {
  id: number;
  fromPerson: Person;
  toPerson: Person;
  amountPLN: number;
  isFull: boolean;
  note?: string | null;
  createdAt: string; // ISO
}

export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
export interface PagedResponse<T> {
  items: T[];
  page: PageMeta;
}

export interface SummaryResponse {
  scope: Scope;
  range: { dateFrom: string; dateTo: string };
  totalsSpent: Record<Person, number>;
  balance: { direction: BalanceDirection; amountPLN: number };
  lastSettlement: SettlementDTO | null;
}

export interface SpendingChartResponse {
  labels: Person[];
  values: number[];
}

export interface ReceiptOcrItem {
  name: string;
  amount: number;
  rawLine: string;
  quantity?: number | null;
  weight?: number | null;
  price?: number | null;
  discount?: number | null;
  totalPrice?: number | null;
  priceWithDiscount?: number | null;
}

export interface ReceiptOcrResponse {
  items: ReceiptOcrItem[];
  rawLines: string[];
  provider: string;
  establishment?: string | null;
  purchaseDate?: string | null;
  creditsRemaining?: number | null;
  total?: number | null;
  currency?: string | null;
}

export interface ShoppingListItemDTO {
  id: number;
  title: string;
  pricePLN?: number | null;
  imageUrl?: string | null;
  sortOrder: number;
  offerUrls: string[];
}

export interface ShoppingListDTO {
  id: number;
  name: string;
  description?: string | null;
  sortOrder: number;
  items: ShoppingListItemDTO[];
}

export interface ProjectExpenseDTO {
  id: number;
  expenseDate: string;
  description: string;
  amountPLN: number;
  imageUrls: string[];
  source: "PROJECT_EXPENSE" | "EXPENSE";
}

export interface ProjectDTO {
  id: number;
  name: string;
  description?: string | null;
  budgetPLN: number;
  spentPLN: number;
  expenses: ProjectExpenseDTO[];
}
