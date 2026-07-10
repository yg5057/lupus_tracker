"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  dateKey,
  formatShort,
  groupByDay,
  isBpOut,
  isDiaOut,
  isSysOut,
  isTempOut,
  latestOfDay,
  VitalRecord,
} from "@/lib/records";
import { useRecords } from "@/lib/useRecords";

const W = 320;
const PAD_X = 14;
const TOP = 12;
const PLOT_H = 122;

// y 스케일: 체온 35.5–38.5°C, 혈압 50–150mmHg (docs/03_screenPlan.md SCR-03)
const yTemp = (v: number) => ((38.5 - v) / 3) * PLOT_H + TOP;
const yBp = (v: number) => ((150 - v) / 100) * PLOT_H + TOP;

interface Point {
  label: string;
  temp: number;
  sys: number;
  dia: number;
}

/** 최근 days일 내 일별 대표값(그날의 최신 기록) 목록, 날짜 오름차순 */
function buildPoints(records: VitalRecord[], days: number): Point[] {
  const byDay = groupByDay(records);
  const points: Point[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayRecords = byDay.get(dateKey(d));
    if (!dayRecords) continue;
    const r = latestOfDay(dayRecords);
    points.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      temp: r.temperature,
      sys: r.systolic,
      dia: r.diastolic,
    });
  }
  return points;
}

function xOf(i: number, n: number) {
  if (n === 1) return W / 2;
  return PAD_X + (i * (W - 2 * PAD_X)) / (n - 1);
}

function Dot({ cx, cy, out, color }: { cx: number; cy: number; out: boolean; color: string }) {
  return (
    <circle
      cx={cx.toFixed(1)}
      cy={cy.toFixed(1)}
      r={out ? 4.5 : 3}
      fill={out ? "#F56B7F" : color}
      stroke="#FFFFFF"
      strokeWidth={out ? 2 : 1.5}
    />
  );
}

function XLabels({ points, every }: { points: Point[]; every: number }) {
  return (
    <div className="flex justify-between px-[4.4%] pt-1.5">
      {points
        .filter((_, i) => i % every === 0)
        .map((p, i) => (
          <div
            key={`${p.label}-${i}`}
            className="flex w-0 justify-center text-[10.5px] font-medium whitespace-nowrap text-faint"
          >
            {p.label}
          </div>
        ))}
    </div>
  );
}

function StatRow({ avg, max, min }: { avg: string; max: string; min: string }) {
  return (
    <div className="mt-2.5 flex border-t border-screen pt-3">
      <div className="flex-1 text-center">
        <div className="text-xs font-medium text-sub">평균</div>
        <div className="mt-[3px] text-lg font-extrabold">{avg}</div>
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
  );
}

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const polyline = (points: Point[], value: (p: Point) => number, y: (v: number) => number) =>
  points.map((p, i) => `${xOf(i, points.length).toFixed(1)},${y(value(p)).toFixed(1)}`).join(" ");

export default function ChartPage() {
  const { records, ready } = useRecords();
  const [period, setPeriod] = useState<"주별" | "월별">("주별");
  const [recentOpen, setRecentOpen] = useState(true);

  const points = useMemo(
    () => buildPoints(records, period === "주별" ? 7 : 30),
    [records, period],
  );
  const labelEvery = period === "주별" ? 1 : 3;

  const recent = useMemo(
    () => [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 5),
    [records],
  );

  const segClass = (active: boolean) =>
    `flex h-[38px] flex-1 items-center justify-center rounded-[10px] text-sm transition-all ${
      active ? "bg-white font-bold text-ink shadow-seg" : "font-semibold text-sub"
    }`;

  // 오늘 날짜 의존 UI는 하이드레이션 후에만 렌더링해 SSR 불일치를 피한다
  if (!ready) return null;

  const empty = points.length === 0;

  return (
    <>
      <header className="px-1 pb-0.5">
        <h1 className="text-[25px] font-extrabold tracking-[-0.4px]">차트</h1>
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

      {/* 최근 기록 (아코디언) */}
      <div className="rounded-[20px] bg-white px-5 py-1 shadow-card">
        <button
          type="button"
          onClick={() => setRecentOpen((v) => !v)}
          className="flex w-full items-center justify-between py-4"
        >
          <span className="text-[15px] font-bold">최근 기록</span>
          <ChevronDown
            size={16}
            strokeWidth={1.8}
            className={`text-sub transition-transform ${recentOpen ? "rotate-180" : ""}`}
          />
        </button>
        {recentOpen && (
          <div className="pb-2.5">
            <div className="grid grid-cols-3 pb-2">
              <div className="text-xs font-medium text-sub">날짜</div>
              <div className="text-right text-xs font-medium text-sub">체온</div>
              <div className="text-right text-xs font-medium text-sub">혈압</div>
            </div>
            {recent.length === 0 && (
              <p className="border-t border-screen py-4 text-center text-sm font-medium text-sub">
                아직 기록이 없어요
              </p>
            )}
            {recent.map((r) => {
              const d = new Date(r.recordedAt);
              return (
                <div key={r.id} className="grid grid-cols-3 items-center border-t border-screen py-[11px]">
                  <div>
                    <div className="text-sm font-medium text-mid">{formatShort(d, false)}</div>
                    <div className="mt-0.5 text-xs font-medium text-faint">
                      {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}
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
            })}
          </div>
        )}
      </div>

      {/* 체온 차트 */}
      <div className="rounded-[20px] bg-white px-4 pt-5 pb-3.5 shadow-card">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[15px] font-bold">체온</h2>
          <span className="text-xs font-medium text-faint">정상 36.0–37.5°C</span>
        </div>
        {empty ? (
          <p className="py-10 text-center text-sm font-medium text-sub">기간 내 기록이 없어요</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} 140`} className="mt-2 block w-full">
              <rect
                x={PAD_X}
                y={yTemp(37.5)}
                width={W - 2 * PAD_X}
                height={yTemp(36.0) - yTemp(37.5)}
                rx={4}
                fill="rgba(1,220,227,0.09)"
              />
              <polyline
                points={polyline(points, (p) => p.temp, yTemp)}
                fill="none"
                stroke="#00BFC9"
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <Dot
                  key={i}
                  cx={xOf(i, points.length)}
                  cy={yTemp(p.temp)}
                  out={isTempOut(p.temp)}
                  color="#00BFC9"
                />
              ))}
            </svg>
            <XLabels points={points} every={labelEvery} />
            <StatRow
              avg={`${avg(points.map((p) => p.temp)).toFixed(1)}°`}
              max={`${Math.max(...points.map((p) => p.temp)).toFixed(1)}°`}
              min={`${Math.min(...points.map((p) => p.temp)).toFixed(1)}°`}
            />
          </>
        )}
      </div>

      {/* 혈압 차트 */}
      <div className="rounded-[20px] bg-white px-4 pt-5 pb-3.5 shadow-card">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[15px] font-bold">혈압</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-[5px]">
              <span className="h-[3px] w-2.5 rounded-sm bg-mint-chart" />
              <span className="text-xs font-medium text-sub">수축기</span>
            </div>
            <div className="flex items-center gap-[5px]">
              <span className="h-[3px] w-2.5 rounded-sm bg-mint-soft" />
              <span className="text-xs font-medium text-sub">이완기</span>
            </div>
          </div>
        </div>
        {empty ? (
          <p className="py-10 text-center text-sm font-medium text-sub">기간 내 기록이 없어요</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} 140`} className="mt-2 block w-full">
              <rect
                x={PAD_X}
                y={yBp(120)}
                width={W - 2 * PAD_X}
                height={yBp(90) - yBp(120)}
                rx={4}
                fill="rgba(1,220,227,0.09)"
              />
              <rect
                x={PAD_X}
                y={yBp(80)}
                width={W - 2 * PAD_X}
                height={yBp(60) - yBp(80)}
                rx={4}
                fill="rgba(1,220,227,0.09)"
              />
              <polyline
                points={polyline(points, (p) => p.sys, yBp)}
                fill="none"
                stroke="#00BFC9"
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={polyline(points, (p) => p.dia, yBp)}
                fill="none"
                stroke="#8FE3E8"
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <Dot key={`s${i}`} cx={xOf(i, points.length)} cy={yBp(p.sys)} out={isSysOut(p.sys)} color="#00BFC9" />
              ))}
              {points.map((p, i) => (
                <Dot key={`d${i}`} cx={xOf(i, points.length)} cy={yBp(p.dia)} out={isDiaOut(p.dia)} color="#8FE3E8" />
              ))}
            </svg>
            <XLabels points={points} every={labelEvery} />
            <StatRow
              avg={`${Math.round(avg(points.map((p) => p.sys)))}/${Math.round(avg(points.map((p) => p.dia)))}`}
              max={`${Math.max(...points.map((p) => p.sys))}/${Math.max(...points.map((p) => p.dia))}`}
              min={`${Math.min(...points.map((p) => p.sys))}/${Math.min(...points.map((p) => p.dia))}`}
            />
          </>
        )}
      </div>
    </>
  );
}