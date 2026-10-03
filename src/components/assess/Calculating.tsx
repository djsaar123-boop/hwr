"use client";

import { motion } from "motion/react";
import type { Area } from "@/lib/types";
import { EASE_OUT, areaStyle } from "@/lib/ui";

/** The area colours converge into one ring while the score is computed. Shown only while real work runs. */
export default function Calculating({ areas }: { areas: Area[] }) {
  const R = 64;
  return (
    <motion.div
      className="fixed inset-0 z-30 grid place-items-center bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="relative size-40">
          {areas.map((a, i) => {
            const t = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.span
                key={a.id}
                style={areaStyle(a.color)}
                className="area-fill absolute top-1/2 left-1/2 -mt-3 -ml-3 size-6 rounded-full"
                initial={{ x: Math.cos(t) * R * 1.6, y: Math.sin(t) * R * 1.6, opacity: 0 }}
                animate={{ x: Math.cos(t) * R * 0.25, y: Math.sin(t) * R * 0.25, opacity: [0, 1, 1, 0.9] }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            );
          })}
          <motion.span
            className="absolute inset-6 rounded-full border-[3px] border-ink/15"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1, 0.96, 1], opacity: 1 }}
            transition={{ delay: 0.6, duration: 1.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          />
        </div>
        <p className="mt-6 font-serif text-xl">Bringing it all together…</p>
      </div>
    </motion.div>
  );
}
