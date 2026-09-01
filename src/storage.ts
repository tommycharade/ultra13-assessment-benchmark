import type { AssessmentState, JsonObject } from './types';

const STATE_KEY = 'ultra13-assessment-state/v1';
const DATABASE = 'ultra13-assessment-evidence';
const STORE = 'bundles';

const isState = (value: unknown): value is AssessmentState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AssessmentState>;
  return state.schemaVersion === 'ultra13-assessment-state/v1' && Array.isArray(state.agents);
};

export const loadLocalState = (): AssessmentState | null => {
  try {
    const text = localStorage.getItem(STATE_KEY);
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveLocalState = (state: AssessmentState): void => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // The UI remains usable when browser storage is unavailable.
  }
};

export const clearLocalState = (): void => {
  localStorage.removeItem(STATE_KEY);
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open evidence storage.'));
  });

export const saveRawEvidence = async (digest: string, bundle: JsonObject): Promise<void> => {
  if (!('indexedDB' in globalThis)) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(bundle, digest);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save evidence.'));
  });
  database.close();
};

export const getRawEvidence = async (digest: string): Promise<JsonObject | null> => {
  if (!('indexedDB' in globalThis)) return null;
  const database = await openDatabase();
  const result = await new Promise<unknown>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(digest);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to read evidence.'));
  });
  database.close();
  return result && typeof result === 'object' && !Array.isArray(result) ? (result as JsonObject) : null;
};

export const downloadJson = (filename: string, value: unknown): void => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const escapeCsvCell = (value: string | number): string => {
  let text = String(value);
  // Prevent spreadsheet applications from interpreting imported evidence as
  // a formula while preserving the visible cell value.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>): void => {
  const headers = Object.keys(rows[0] ?? {});
  const body = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
