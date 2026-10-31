import type { ScheduleItem, TimelineTask } from "./types";

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

/**
 * Builds an .ics calendar: one all-day event per timeline task, plus one per
 * scheduled function on the celebration days. Function times are free text from
 * the model ("7:00 PM"), so they go in the title rather than being parsed.
 */
export function buildIcs(
  title: string,
  eventDate: string,
  tasks: TimelineTask[],
  now = new Date(),
  schedule: ScheduleItem[] = [],
): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const compact = (d: string) => d.replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UtsavAI//EN", "CALSCALE:GREGORIAN"];
  const allDay = (uid: string, day: string, summary: string, description: string) =>
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@utsav-ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(day)}`,
      `DTEND;VALUE=DATE:${compact(taskDate(day, -1))}`, // DTEND is exclusive for all-day events
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT",
    );

  tasks.forEach((t, i) =>
    allDay(
      `${compact(eventDate)}-${i}`,
      taskDate(eventDate, t.daysBefore),
      `${title}: ${t.task}`,
      `Owner: ${t.owner}`,
    ),
  );
  schedule.forEach((s, i) =>
    allDay(
      `${compact(eventDate)}-s${i}`,
      taskDate(eventDate, 1 - s.day),
      `${s.title}${s.time ? ` · ${s.time}` : ""}`,
      `${title}, day ${s.day}. ${s.details}`,
    ),
  );
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
