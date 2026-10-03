import type { CSSProperties } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** Sets the `--area` CSS variable used by the area-* utilities. */
export const areaStyle = (color: string, extra?: CSSProperties) =>
  ({ "--area": color, ...extra }) as CSSProperties;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
