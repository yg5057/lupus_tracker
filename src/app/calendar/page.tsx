"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DOW_KO,
  dateKey,
  groupByDay,
  isBpOut,
  isRecordOut,
  isTempOut,
  latestOfDay,
} from "@/lib/records";
import { useRecords } from "@/lib/useRecords";

export default function CalendarPage() {
  const { records, ready } = useRecords();
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [picked, setPicked] = useState<string | null>(null);

  const byDay = useMemo(() => groupByDay(records), [records]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const key = (day: number) =>
    `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // 선택값이 없으면 기본 선택: 오늘(기록 있을 때) → 이 달의 마지막 기록일
  const selectedKey = useMemo(() => {
    if (picked) return picked;
    const todayKey = dateKey(today);
    if (byDay.has(todayKey) && todayKey.startsWith(key(1).slice(0, 8))) return todayKey;
    for (let day = daysInMonth; day >= 1; day--) {
      if (byDay.has(key(day))) return key(day);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, byDay, view, daysInMonth]);

  const selectedRecords = selectedKey ? byDay.get(selectedKey) : undefined;
  const selected = selectedRecords ? latestOfDay(selectedRecords) : null;
  const selectedDate = selectedKey
    ? new Date(Number(selectedKey.slice(0, 4)), Number(selectedKey.slice(5, 7)) - 1, Number(selectedKey.slice(8, 10)))
    : null;

  const moveMonth = (delta: number) => {
    setPicked(null);
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // 오늘 날짜 의존 UI는 하이드레이션 후에만 렌더링해 SSR 불일치를 피한다
  if (!ready) return null;

  return (
    <>
      <header className="px-1 pb-2">
        <h1 className="text-[25px] font-extrabold tracking-[-0.4px]">캘린더</h1>
        <p className="mt-1 text-sm text-sub">날짜를 누르면 그날의 기록으로 이동해요</p>
      </header>

      {/* 달력 */}
      <div className="rounded-[20px] bg-white px-4 pt-5 pb-4 shadow-card">
        <div className="flex items-center justify-between px-1.5 pb-3.5">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="이전 달"
            className="flex size-8 items-center justify-center rounded-[10px] bg-screen text-mid"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <div className="text-[17px] font-extrabold">
            {view.year}년 {view.month + 1}월
          </div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="다음 달"
            className="flex size-8 items-center justify-center rounded-[10px] bg-screen text-mid"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="grid grid-cols-7 pb-1.5">
          {DOW_KO.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold ${i === 0 ? "text-alert" : "text-sub"}`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDow }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayKey = key(day);
            const dayRecords = byDay.get(dayKey);
            const isSelected = dayKey === selectedKey;
            const isFuture = new Date(view.year, view.month, day) > today;
            const hasOut = dayRecords?.some(isRecordOut);
            return (
              <button
                key={day}
                type="button"
                disabled={!dayRecords}
                onClick={() => setPicked(dayKey)}
                className="flex h-[46px] flex-col items-center gap-[3px]"
              >
                <span
                  className={`flex size-[34px] items-center justify-center rounded-full text-[14.5px] transition-colors ${
                    isSelected
                      ? "bg-mint font-extrabold text-white"
                      : isFuture
                        ? "font-semibold text-disabled"
                        : "font-semibold text-body"
                  }`}
                >
                  {day}
                </span>
                <span
                  className={`size-[5px] rounded-full ${
                    dayRecords ? (hasOut ? "bg-alert" : "bg-mint") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택한 날 요약 */}
      <div className="rounded-[20px] bg-white p-5 shadow-card">
        {selected && selectedDate ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
                {DOW_KO[selectedDate.getDay()]})
              </div>
              <Link
                href={`/?date=${selectedKey}`}
                className="flex items-center text-[13px] font-bold text-mint-dark"
              >
                기록 탭에서 열기
                <ChevronRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
            <div className="mt-4 flex">
              <div className="flex-1">
                <div className="text-xs font-medium text-sub">체온</div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span
                    className={`text-[28px] leading-none font-extrabold tracking-[-0.6px] ${
                      isTempOut(selected.temperature) ? "text-alert" : "text-ink"
                    }`}
                  >
                    {selected.temperature.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-faint">°C</span>
                </div>
              </div>
              <div className="mx-4 w-px bg-screen" />
              <div className="flex-1">
                <div className="text-xs font-medium text-sub">혈압</div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span
                    className={`text-[28px] leading-none font-extrabold tracking-[-0.6px] ${
                      isBpOut(selected) ? "text-alert" : "text-ink"
                    }`}
                  >
                    {selected.systolic}/{selected.diastolic}
                  </span>
                  <span className="text-sm font-semibold text-faint">mmHg</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="py-2 text-center text-sm font-medium text-sub">
            이 달에는 아직 기록이 없어요
          </p>
        )}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 px-2 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-mint" />
          <span className="text-xs font-medium text-sub">기록한 날</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-alert" />
          <span className="text-xs font-medium text-sub">정상 범위 벗어남</span>
        </div>
      </div>
    </>
  );
}