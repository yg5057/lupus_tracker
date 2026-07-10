"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY, VitalRecord, createRecord, loadRecords, saveRecords } from "./records";

const EMPTY: VitalRecord[] = [];
let cache: VitalRecord[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): VitalRecord[] {
  if (cache === null) cache = loadRecords();
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 저장한 변경도 반영
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: VitalRecord[]) {
  cache = next;
  saveRecords(cache);
  listeners.forEach((l) => l());
}

function addRecord(input: Omit<VitalRecord, "id">): VitalRecord {
  const record = createRecord(input);
  commit([...getSnapshot(), record]);
  return record;
}

function updateRecord(id: string, patch: Omit<VitalRecord, "id">) {
  commit(getSnapshot().map((r) => (r.id === id ? { ...patch, id } : r)));
}

function removeRecord(id: string) {
  commit(getSnapshot().filter((r) => r.id !== id));
}

/** localStorage 기반 기록 스토어 훅. ready는 클라이언트 하이드레이션 완료 여부. */
export function useRecords() {
  const records = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return { records, ready, add: addRecord, update: updateRecord, remove: removeRecord };
}