"use client";

import { useEffect, useState } from "react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onValue: (n: number) => void;
}

/**
 * Number input that keeps what the user is typing as text. A plain controlled
 * `type=number` turns an emptied field into 0, so typing "10000" showed "010000".
 * Here the field may be empty mid-edit; leading zeros are stripped and the parent
 * only ever receives a real number.
 */
export default function NumberField({ value, onValue, min, ...rest }: Props) {
  const [text, setText] = useState(String(value));

  // Follow outside changes (e.g. a slider) without clobbering an in-progress edit.
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        setText(digits);
        if (digits !== "") onValue(Number(digits));
      }}
      onBlur={() => {
        const n = Number(text);
        const floor = Number(min ?? 0);
        if (text === "" || n < floor) {
          setText(String(Math.max(floor, value)));
          onValue(Math.max(floor, text === "" ? value : n));
        }
      }}
    />
  );
}
