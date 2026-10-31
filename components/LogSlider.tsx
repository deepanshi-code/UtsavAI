"use client";

/** Maps a 0–1000 slider to [min, max] on a log scale, so ₹20k and ₹50L are both easy to hit. */
const toValue = (s: number, min: number, max: number) => min * Math.pow(max / min, s / 1000);
const toSlider = (v: number, min: number, max: number) =>
  Math.round((Math.log(Math.min(max, Math.max(min, v)) / min) / Math.log(max / min)) * 1000);

interface Props {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  round: (v: number) => number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export default function LogSlider({ id, label, value, min, max, round, format, onChange }: Props) {
  const s = toSlider(value, min, max);
  return (
    <input
      id={id}
      type="range"
      min={0}
      max={1000}
      value={s}
      aria-label={label}
      aria-valuetext={format(value)}
      style={{ "--fill": `${s / 10}%` } as React.CSSProperties}
      onChange={(e) => onChange(round(toValue(Number(e.target.value), min, max)))}
    />
  );
}

export const roundBudget = (v: number) => {
  const step = v < 1_00_000 ? 1_000 : v < 10_00_000 ? 5_000 : 25_000;
  return Math.round(v / step) * step;
};
export const roundGuests = (v: number) =>
  v < 50 ? Math.round(v) : v < 300 ? Math.round(v / 5) * 5 : Math.round(v / 25) * 25;
