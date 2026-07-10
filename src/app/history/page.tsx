"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import {
  DOW_KO,
  groupByDay,
  isBpOut,
  isTempOut,
  latestOfDay,
  VitalRecord,
} from "@/lib/records";
import { useRecords } from "@/lib/useRecords";

/** 오늘 포함 최근 days일의 시작 시각(00:00) */
function periodStart(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

interface DaySummary {
  key: string;
  date: Date;
  count: number;
  rep: VitalRecord; // 그날 대표(최신) 기록
}

function StatCard({
  title,
  hint,
  avg: avgVal,
  max,
  min,
}: {
  title: string;
  hint?: string;
  avg: string;
  max: string;
  min: string;
}) {
  return (
    <div className="rounded-[20px] bg-white px-4 pt-4 pb-3.5 shadow-card">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {hint && <span className="text-xs font-medium text-faint">{hint}</span>}
      </div>
      <div className="mt-3 flex border-t border-screen pt-3">
        <div className="flex-1 text-center">
          <div className="text-xs font-medium text-sub">평균</div>
          <div className="mt-[3px] text-lg font-extrabold">{avgVal}</div>
        </div>
        <div className="flex-1 border-l border-screen text-center">
          <div className="text-xs font-medium text-sub">최고</div>
          <div className="mt-[3px] text-lg font-extrabold text-alert">{max}</div>
        </div>
        <div className="flex-1 border-l border-screen text-center">
          <div className="text-xs font-medium text-sub">최저</div>
          <div className="mt-[3px] text-lg font-extrabold">{min}</div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { records, ready } = useRecords();
  const [period, setPeriod] = useState<"주별" | "월별">("주별");

  const days = period === "주별" ? 7 : 30;

  // 기간 내 모든 개별 기록 (최신순) — 통계와 주별 목록의 원본
  const rows = useMemo<VitalRecord[]>(() => {
    const start = periodStart(days);
    return records
      .filter((r) => new Date(r.recordedAt) >= start)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [records, days]);

  // 월별 목록용: 하루당 1행 요약 (대표=최신, 건수)
  const daySummaries = useMemo<DaySummary[]>(() => {
    const byDay = groupByDay(rows);
    return [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, dayRecords]) => ({
        key,
        date: new Date(
          Number(key.slice(0, 4)),
          Number(key.slice(5, 7)) - 1,
          Number(key.slice(8, 10)),
        ),
        count: dayRecords.length,
        rep: latestOfDay(dayRecords),
      }));
  }, [rows]);

  const segClass = (active: boolean) =>
    `flex h-[38px] flex-1 items-center justify-center rounded-[10px] text-sm transition-all ${
      active ? "bg-white font-bold text-ink shadow-seg" : "font-semibold text-sub"
    }`;

  // 오늘 날짜 의존 UI는 하이드레이션 후에만 렌더링해 SSR 불일치를 피한다
  if (!ready) return null;

  const empty = rows.length === 0;
  const temps = rows.map((r) => r.temperature);
  const syss = rows.map((r) => r.systolic);
  const dias = rows.map((r) => r.diastolic);

  return (
    <>
      <header className="flex items-center justify-between px-1 pb-0.5">
        <h1 className="text-[25px] font-extrabold tracking-[-0.4px]">기록 보기</h1>
        <button
          type="button"
          onClick={() => downloadCsv(records)}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 rounded-[10px] bg-mint px-3 py-2 text-[13px] font-bold text-white transition-colors hover:bg-mint-dark active:bg-mint-press disabled:bg-mint/40 disabled:text-white"
        >
          <Download size={14} strokeWidth={2} />
          CSV 내보내기
        </button>
      </header>

      {/* 주별/월별 토글 */}
      <div className="flex gap-1 rounded-[13px] bg-seg p-1">
        <button type="button" className={segClass(period === "주별")} onClick={() => setPeriod("주별")}>
          주별
        </button>
        <button type="button" className={segClass(period === "월별")} onClick={() => setPeriod("월별")}>
          월별
        </button>
      </div>

      {empty ? (
        <div className="rounded-[20px] bg-white px-5 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-sub">최근 {days}일 기록이 없어요</p>
        </div>
      ) : (
        <>
          {/* 요약 통계 */}
          <StatCard
            title="체온"
            hint="정상 36.0–37.5°C"
            avg={`${avg(temps).toFixed(1)}°`}
            max={`${Math.max(...temps).toFixed(1)}°`}
            min={`${Math.min(...temps).toFixed(1)}°`}
          />
          <StatCard
            title="혈압"
            hint="수축기 / 이완기"
            avg={`${Math.round(avg(syss))}/${Math.round(avg(dias))}`}
            max={`${Math.max(...syss)}/${Math.max(...dias)}`}
            min={`${Math.min(...syss)}/${Math.min(...dias)}`}
          />

          {/* 기록 목록 — 주별: 개별 기록 / 월별: 일별 요약 */}
          <div className="rounded-[20px] bg-white px-5 shadow-card">
            <div className="flex items-center justify-between border-b border-screen py-3.5">
              <span className="text-[15px] font-bold">
                {period === "주별" ? "최근 7일 기록" : "최근 30일 · 일별 요약"}
              </span>
              <span className="text-[13px] font-medium text-faint">
                {period === "주별" ? `${rows.length}건` : `${daySummaries.length}일`}
              </span>
            </div>

            {period === "주별"
              ? rows.map((r) => {
                  const d = new Date(r.recordedAt);
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-3 items-center border-t border-screen py-[11px] first:border-t-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-mid">
                          {d.getMonth() + 1}/{d.getDate()}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-faint">
                          {String(d.getHours()).padStart(2, "0")}:
                          {String(d.getMinutes()).padStart(2, "0")}
                        </div>
                      </div>
                      <div
                        className={`text-right text-sm font-bold ${isTempOut(r.temperature) ? "text-alert" : "text-body"}`}
                      >
                        {r.temperature.toFixed(1)}°C
                      </div>
                      <div className={`text-right text-sm font-bold ${isBpOut(r) ? "text-alert" : "text-body"}`}>
                        {r.systolic}/{r.diastolic}
                      </div>
                    </div>
                  );
                })
              : daySummaries.map((s) => (
                  <div
                    key={s.key}
                    className="grid grid-cols-3 items-center border-t border-screen py-[11px] first:border-t-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-mid">
                        {s.date.getMonth() + 1}/{s.date.getDate()} ({DOW_KO[s.date.getDay()]})
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-faint">{s.count}건</div>
                    </div>
                    <div
                      className={`text-right text-sm font-bold ${isTempOut(s.rep.temperature) ? "text-alert" : "text-body"}`}
                    >
                      {s.rep.temperature.toFixed(1)}°C
                    </div>
                    <div className={`text-right text-sm font-bold ${isBpOut(s.rep) ? "text-alert" : "text-body"}`}>
                      {s.rep.systolic}/{s.rep.diastolic}
                    </div>
                  </div>
                ))}
          </div>
          {period === "월별" && (
            <p className="px-2 text-xs font-medium text-faint">
              일별 요약은 그날의 마지막 기록 기준이에요
            </p>
          )}
        </>
      )}
    </>
  );
}
