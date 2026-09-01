"use client";

import { useState } from "react";
import { HINTS, WHEELS, type Recipe, type Wheel } from "@/lib/game/recipe";

const LABELS: Record<Wheel, string> = {
  effort: "Effort", placement: "Place", air: "Air", age: "Age",
  size: "Size", tempo: "Tempo", volume: "Volume", attitude: "Attitude",
};

// Mockup order: paired columns reading effort/size, place/tempo, air/volume, age/attitude.
const ORDER: Wheel[] = ["effort", "size", "placement", "tempo", "air", "volume", "age", "attitude"];

/** The specimen label: eight rows print in with a stagger; tap a row for its coaching hint. */
export function WheelTable({ recipe }: { recipe: Recipe }) {
  const [selected, setSelected] = useState<Wheel>("effort");

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-4 border-t border-rule pt-2">
        {ORDER.map((wheel) => (
          <button
            key={wheel}
            type="button"
            onClick={() => setSelected(wheel)}
            aria-pressed={selected === wheel}
            style={{ animationDelay: `${0.12 * (WHEELS.indexOf(wheel) + 1)}s` }}
            className={`reveal-row flex min-h-11 items-center justify-between gap-2 border-b border-dotted border-rule px-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              selected === wheel ? "bg-paper" : ""
            }`}
          >
            <span className="text-muted">{LABELS[wheel]}</span>
            <span className="font-semibold">{recipe[wheel]}</span>
          </button>
        ))}
      </div>
      <p className="reveal-row text-xs leading-relaxed text-muted" style={{ animationDelay: "1.1s" }} aria-live="polite">
        <span className="font-semibold text-ink">{recipe[selected]}.</span> {HINTS[recipe[selected]]}{" "}
        <span>Tap any row for its hint.</span>
      </p>
    </div>
  );
}
