import { VitalRecord, dateKey } from "./records";

const pad = (n: number) => String(n).padStart(2, "0");

export function recordsToCsv(records: VitalRecord[]): string {
  const header = ["날짜", "시간", "체온(°C)", "수축기(mmHg)", "이완기(mmHg)"];
  const rows = [...records]
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((r) => {
      const d = new Date(r.recordedAt);
      return [
        dateKey(d),
        `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        r.temperature.toFixed(1),
        String(r.systolic),
        String(r.diastolic),
      ];
    });
  return [header, ...rows].map((row) => row.join(",")).join("\r\n");
}

/** 전체 기록을 CSV 파일로 다운로드. BOM을 붙여 Excel에서 한글이 깨지지 않게 한다. */
export function downloadCsv(records: VitalRecord[]) {
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + recordsToCsv(records)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lupus-tracker_${dateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
