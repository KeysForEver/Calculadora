import { CalculationResult } from '../types';

const STORAGE_KEY = 'metalon_calculator_history_v1';

export function getHistory(): CalculationResult[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(item: CalculationResult): CalculationResult[] {
  try {
    const current = getHistory();
    // Filter duplicates with same inputs if any
    const updated = [item, ...current.filter((x) => x.id !== item.id)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
