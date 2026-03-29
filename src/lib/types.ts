export interface Category {
  id: string;
  name: string;
  color: string; // HSL string
}

export interface HistoryEntry {
  type: 'created' | 'edited' | 'solved';
  timestamp: string; // ISO string
}

export interface Note {
  id: string;
  content: string;
  categoryId: string | null;
  isSolved: boolean;
  history: HistoryEntry[];
  createdAt: string; // ISO string
}
