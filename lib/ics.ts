import type { TimelineTask } from "./types";

/** Returns YYYY-MM-DD for `eventDate` minus `daysBefore` days (UTC, so no DST drift). */
export function taskDate(eventDate: string, daysBefore: number): string {
  const d = new Date(`${eventDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  return d.toISOString().slice(0, 10);
}

/** RFC 5545 text escaping. */
export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding: lines longer than 75 octets continue with CRLF + space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (curLen + len > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Builds an .ics calendar with one all-day event per timeline task. */
export function buildIcs(title: string, eventDate: string, tasks: TimelineTask[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const compact = (d: string) => d.replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UtsavAI//EN", "CALSCALE:GREGORIAN"];

  tasks.forEach((t, i) => {
    const start = taskDate(eventDate, t.daysBefore);
    const end = taskDate(start, -1); // DTEND is exclusive for all-day events
    lines.push(
      "BEGIN:VEVENT",
      `UID:${compact(eventDate)}-${i}@utsav-ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(start)}`,
      `DTEND;VALUE=DATE:${compact(end)}`,
      `SUMMARY:${escapeIcs(`${title}: ${t.task}`)}`,
      `DESCRIPTION:${escapeIcs(`Owner: ${t.owner}`)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
