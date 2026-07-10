export interface VitalRecord {
  id: string;
  recordedAt: string; // ISO 8601
  temperature: number; // °C
  systolic: number; // mmHg
  diastolic: number; // mmHg
}

// 정상 범위 (docs/01_plan.md §4)
export const NORMAL = {
  temp: { min: 36.0, max: 37.5 },
  sys: { min: 90, max: 120 },
  dia: { min: 60, max: 80 },
} as const;

// 입력 유효성 물리적 한계 (docs/03_screenPlan.md SCR-01)
export const LIMITS = {
  temp: { min: 34.0, max: 42.0 },
  sys: { min: 60, max: 250 },
  dia: { min: 40, max: 150 },
} as const;

export const isTempOut = (t: number) => t < NORMAL.temp.min || t > NORMAL.temp.max;
export const isSysOut = (s: number) => s < NORMAL.sys.min || s > NORMAL.sys.max;
export const isDiaOut = (d: number) => d < NORMAL.dia.min || d > NORMAL.dia.max;
export const isBpOut = (r: Pick<VitalRecord, "systolic" | "diastolic">) =>
  isSysOut(r.systolic) || isDiaOut(r.diastolic);
export const isRecordOut = (r: VitalRecord) => isTempOut(r.temperature) || isBpOut(r);

export const STORAGE_KEY = "lupus-tracker.records";

export function loadRecords(): VitalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: VitalRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function createRecord(input: Omit<VitalRecord, "id">): VitalRecord {
  return { id: crypto.randomUUID(), ...input };
}

// ── 날짜 유틸 ──────────────────────────────────────────────

export const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 로컬 기준 YYYY-MM-DD 키 */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** '26/7/9 14:30' 형식 */
export function formatShort(d: Date, withTime = true): string {
  const date = `${d.getFullYear() % 100}/${d.getMonth() + 1}/${d.getDate()}`;
  if (!withTime) return date;
  return `${date} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 날짜별 기록 그룹 (키: YYYY-MM-DD) */
export function groupByDay(records: VitalRecord[]): Map<string, VitalRecord[]> {
  const map = new Map<string, VitalRecord[]>();
  for (const r of records) {
    const key = dateKey(new Date(r.recordedAt));
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }
  return map;
}

/** 그날의 대표 기록 = 최신 기록 (docs/03_screenPlan.md SCR-02) */
export function latestOfDay(dayRecords: VitalRecord[]): VitalRecord {
  return dayRecords[0];
}
