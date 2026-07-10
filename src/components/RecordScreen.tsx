"use client";

import { useMemo, useState } from "react";
import { LIMITS, VitalRecord, dateKey, formatShort, groupByDay } from "@/lib/records";
import { useRecords } from "@/lib/useRecords";

function toInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialDate(dateParam?: string) {
  const now = new Date();
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split("-").map(Number);
    const parsed = new Date(y, m - 1, d, now.getHours(), now.getMinutes());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return now;
}

export default function RecordScreen({ dateParam }: { dateParam?: string }) {
  const { records, ready, add, update, remove } = useRecords();
  const [recordedAt, setRecordedAt] = useState(() => initialDate(dateParam));
  const [editingDate, setEditingDate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [temp, setTemp] = useState("");
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isToday = dateKey(recordedAt) === dateKey(new Date());
  const title = editingId
    ? "기록 수정"
    : isToday
      ? "오늘의 기록"
      : `${recordedAt.getMonth() + 1}월 ${recordedAt.getDate()}일 기록`;

  const dayRecords = useMemo(
    () => groupByDay(records).get(dateKey(recordedAt)) ?? [],
    [records, recordedAt],
  );

  // 시각 의존 UI는 localStorage 로딩(하이드레이션) 후에만 렌더링해 SSR 불일치를 피한다
  if (!ready) return null;

  const resetForm = () => {
    setEditingId(null);
    setTemp("");
    setSys("");
    setDia("");
    setError(null);
  };

  const startEdit = (r: VitalRecord) => {
    setEditingId(r.id);
    setRecordedAt(new Date(r.recordedAt));
    setTemp(r.temperature.toFixed(1));
    setSys(String(r.systolic));
    setDia(String(r.diastolic));
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = () => {
    if (editingId) remove(editingId);
    resetForm();
  };

  const save = () => {
    const t = Number(temp);
    const s = Number(sys);
    const d = Number(dia);
    if (temp === "" || Number.isNaN(t) || t < LIMITS.temp.min || t > LIMITS.temp.max) {
      setError(`체온은 ${LIMITS.temp.min}~${LIMITS.temp.max}°C 사이로 입력해 주세요`);
      return;
    }
    if (sys === "" || !Number.isInteger(s) || s < LIMITS.sys.min || s > LIMITS.sys.max) {
      setError(`수축기 혈압은 ${LIMITS.sys.min}~${LIMITS.sys.max} 사이로 입력해 주세요`);
      return;
    }
    if (dia === "" || !Number.isInteger(d) || d < LIMITS.dia.min || d > LIMITS.dia.max) {
      setError(`이완기 혈압은 ${LIMITS.dia.min}~${LIMITS.dia.max} 사이로 입력해 주세요`);
      return;
    }
    if (d >= s) {
      setError("이완기 혈압은 수축기보다 낮아야 해요");
      return;
    }
    const payload = {
      recordedAt: recordedAt.toISOString(),
      temperature: t,
      systolic: s,
      diastolic: d,
    };
    if (editingId) update(editingId, payload);
    else add(payload);
    resetForm();
  };

  return (
    <>
      <header className="px-1 pb-2">
        <h1 className="text-[25px] font-extrabold tracking-[-0.4px]">{title}</h1>
        <p className="mt-1 text-sm text-sub">
          {editingId
            ? "값을 고친 뒤 수정하기를 눌러 저장하세요"
            : "매일 같은 시간에 기록하면 추세가 더 정확해져요"}
        </p>
      </header>

      {/* 날짜 및 시간 */}
      <div className="flex items-center justify-between rounded-[20px] bg-white px-5 py-[18px] shadow-card">
        <div className="flex flex-col gap-1">
          <div className="text-[13px] font-medium text-sub">날짜 및 시간</div>
          {editingDate ? (
            <input
              type="datetime-local"
              autoFocus
              value={toInputValue(recordedAt)}
              onChange={(e) => {
                const next = new Date(e.target.value);
                if (!Number.isNaN(next.getTime())) setRecordedAt(next);
              }}
              className="text-[17px] font-bold text-ink focus:outline-none"
            />
          ) : (
            <div className="text-[17px] font-bold">{formatShort(recordedAt)}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditingDate((v) => !v)}
          className="rounded-[10px] bg-mint/10 px-[13px] py-2 text-[13px] font-bold text-mint-dark"
        >
          {editingDate ? "완료" : "수정"}
        </button>
      </div>

      {/* 체온 */}
      <div className="rounded-[20px] bg-white px-5 py-[22px] shadow-card">
        <div className="text-[13px] font-medium text-sub">체온</div>
        <div className="mt-2.5 flex items-baseline gap-[7px]">
          <input
            type="text"
            inputMode="decimal"
            placeholder="36.5"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="w-[130px] border-b-[2.5px] border-mint pb-1 text-[46px] leading-none font-extrabold tracking-[-1.2px] text-ink placeholder:text-disabled focus:outline-none"
          />
          <span className="text-[19px] font-semibold text-faint">°C</span>
        </div>
      </div>

      {/* 혈압 */}
      <div className="rounded-[20px] bg-white px-5 py-[22px] shadow-card">
        <div className="text-[13px] font-medium text-sub">혈압</div>
        <div className="mt-2.5 flex items-center">
          <div className="flex-1">
            <div className="flex items-baseline gap-[5px]">
              <input
                type="text"
                inputMode="numeric"
                placeholder="120"
                value={sys}
                onChange={(e) => setSys(e.target.value)}
                className="w-[84px] border-b-[2.5px] border-mint pb-1 text-[40px] leading-none font-extrabold tracking-[-1px] text-ink placeholder:text-disabled focus:outline-none"
              />
              <span className="text-sm font-semibold text-faint">mmHg</span>
            </div>
            <div className="mt-[9px] text-[13px] font-medium text-sub">수축기 (최고)</div>
          </div>
          <div className="mx-[18px] h-[54px] w-px bg-screen" />
          <div className="flex-1">
            <div className="flex items-baseline gap-[5px]">
              <input
                type="text"
                inputMode="numeric"
                placeholder="80"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-[84px] border-b-[2.5px] border-mint pb-1 text-[40px] leading-none font-extrabold tracking-[-1px] text-ink placeholder:text-disabled focus:outline-none"
              />
              <span className="text-sm font-semibold text-faint">mmHg</span>
            </div>
            <div className="mt-[9px] text-[13px] font-medium text-sub">이완기 (최저)</div>
          </div>
        </div>
      </div>

      {error && <p className="px-1 text-[13px] font-medium text-alert">{error}</p>}

      {/* 오늘 기록 */}
      <section className="mt-2.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] font-bold">{isToday ? "오늘 기록" : "이 날의 기록"}</h2>
          <span className="text-[13px] font-medium text-faint">눌러서 수정</span>
        </div>
        {dayRecords.length === 0 && (
          <p className="rounded-[18px] bg-white px-[18px] py-6 text-center text-sm font-medium text-sub shadow-card">
            {isToday ? "아직 오늘 기록이 없어요" : "이 날의 기록이 없어요"}
          </p>
        )}
        {dayRecords.map((r) => {
          const active = r.id === editingId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => (active ? resetForm() : startEdit(r))}
              className={`flex items-center justify-between rounded-[18px] bg-white px-[18px] py-4 text-left shadow-card transition-all ${
                active ? "ring-2 ring-mint" : "active:bg-screen/50"
              }`}
            >
              <div className="text-sm font-medium text-mid">{formatShort(new Date(r.recordedAt))}</div>
              <div className="flex gap-2">
                <div className="rounded-[9px] bg-screen px-2.5 py-1.5 text-sm font-bold text-body">
                  {r.temperature.toFixed(1)}°C
                </div>
                <div className="rounded-[9px] bg-screen px-2.5 py-1.5 text-sm font-bold text-body">
                  {r.systolic}/{r.diastolic}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* 저장 / 수정 바 */}
      <div className="sticky bottom-0 mt-auto -mx-5 bg-gradient-to-t from-page via-page to-transparent px-5 pt-4 pb-3">
        {editingId ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-[14px] border border-alert px-6 text-[16px] font-bold text-alert transition-colors active:bg-alert/5"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={save}
              className="h-14 flex-1 rounded-[14px] bg-mint text-[17px] font-extrabold tracking-[-0.2px] text-white transition-colors active:bg-mint-press"
            >
              수정하기
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={save}
            className="h-14 w-full rounded-[14px] bg-mint text-[17px] font-extrabold tracking-[-0.2px] text-white transition-colors active:bg-mint-press"
          >
            저장하기
          </button>
        )}
      </div>
    </>
  );
}