import type { CreatureLayers } from "@/lib/game/creature";

/**
 * Placeholder layered creature art (build plan: Claude draws flat SVG; BAM can replace the
 * set later; the CreatureLayers contract is the stable interface). One renderer for every
 * surface: reveal outline, payoff plate, Guild thumbnails, and later the share image.
 */
type Archetype = "round" | "point" | "side" | "top";

const ANIMAL_STYLE: Record<string, { archetype: Archetype; wash: string; earInner?: string; whiskers?: boolean; beak?: boolean }> = {
  mouse: { archetype: "round", wash: "#ece4d2", earInner: "#e7b9a8", whiskers: true },
  hamster: { archetype: "round", wash: "#e8d9b0", earInner: "#e7b9a8", whiskers: true },
  frog: { archetype: "top", wash: "#cfdcb5" },
  hummingbird: { archetype: "top", wash: "#c9d8e2", beak: true },
  fox: { archetype: "point", wash: "#f0d5b8", whiskers: true },
  raccoon: { archetype: "point", wash: "#d8dfe8" },
  cat: { archetype: "point", wash: "#f0c9d2", whiskers: true },
  goose: { archetype: "top", wash: "#e3d6c4", beak: true },
  bear: { archetype: "side", wash: "#d9c7a8" },
  moose: { archetype: "side", wash: "#d4cfc0" },
  walrus: { archetype: "side", wash: "#c9d8e2", whiskers: true },
  elephant: { archetype: "side", wash: "#d8d3cc" },
  goat: { archetype: "side", wash: "#f1ead9" },
};

const POSE_TILT: Record<string, number> = {
  dab: 0, flick: 4, press: 0, punch: 0, wring: -4, slash: 6, glide: 2, float: -6,
};

function headShapes(archetype: Archetype): { ears: React.ReactNode; head: React.ReactNode } {
  switch (archetype) {
    case "round":
      return {
        ears: (
          <>
            <circle cx="34" cy="34" r="20" />
            <circle cx="86" cy="34" r="20" />
          </>
        ),
        head: <ellipse cx="60" cy="66" rx="36" ry="32" />,
      };
    case "point":
      return {
        ears: (
          <>
            <path d="M20 30 L40 8 L52 34 Z" />
            <path d="M100 30 L80 8 L68 34 Z" />
          </>
        ),
        head: <ellipse cx="60" cy="66" rx="38" ry="32" />,
      };
    case "side":
      return {
        ears: (
          <>
            <circle cx="30" cy="38" r="14" />
            <circle cx="90" cy="38" r="14" />
          </>
        ),
        head: <ellipse cx="60" cy="68" rx="42" ry="36" />,
      };
    case "top":
      return {
        ears: (
          <>
            <circle cx="38" cy="34" r="16" />
            <circle cx="82" cy="34" r="16" />
          </>
        ),
        head: <ellipse cx="60" cy="70" rx="42" ry="30" />,
      };
  }
}

export function CreatureSvg({
  layers,
  variant,
  size = 120,
  title,
}: {
  layers: CreatureLayers;
  variant: "outline" | "plate";
  size?: number;
  title?: string;
}) {
  const style = ANIMAL_STYLE[layers.baseAnimal] ?? ANIMAL_STYLE.mouse;
  const { ears, head } = headShapes(style.archetype);
  const eyeY = style.archetype === "top" ? 34 : 62;
  const eyeL = style.archetype === "top" ? 38 : 46;
  const eyeR = style.archetype === "top" ? 82 : 74;
  const tilt = POSE_TILT[layers.pose] ?? 0;

  if (variant === "outline") {
    return (
      <svg viewBox="0 0 120 120" width={size} height={size} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
        {title ? <title>{title}</title> : null}
        <g fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" transform={`rotate(${tilt} 60 60)`}>
          {ears}
          {head}
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g transform={`rotate(${tilt} 60 60)`}>
        <g fill={style.wash} stroke="#1e293b" strokeWidth="2">
          {ears}
          {head}
        </g>
        {style.earInner && style.archetype === "round" ? (
          <>
            <circle cx="34" cy="34" r="10" fill={style.earInner} stroke="#1e293b" strokeWidth="1" />
            <circle cx="86" cy="34" r="10" fill={style.earInner} stroke="#1e293b" strokeWidth="1" />
          </>
        ) : null}
        {style.beak ? <path d="M54 74 L60 84 L66 74 Z" fill="#b45309" stroke="#1e293b" strokeWidth="1.5" /> : null}
        {layers.expression === "menacing" ? (
          <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
            <path d={`M${eyeL - 8} ${eyeY - 12} l16 6`} />
            <path d={`M${eyeR + 8} ${eyeY - 12} l-16 6`} />
            <path d={`M${eyeL - 6} ${eyeY + 2} h12`} />
            <path d={`M${eyeR - 6} ${eyeY + 2} h12`} />
          </g>
        ) : (
          <g fill="#1e293b">
            <circle cx={eyeL} cy={eyeY} r="4" />
            <circle cx={eyeR} cy={eyeY} r="4" />
          </g>
        )}
        {layers.accessory === "glasses" ? (
          <g fill="none" stroke="#1e293b" strokeWidth="1.5">
            <circle cx={eyeL} cy={eyeY + 1} r="9" />
            <circle cx={eyeR} cy={eyeY + 1} r="9" />
            <path d={`M${eyeL + 9} ${eyeY + 1} H${eyeR - 9}`} />
          </g>
        ) : null}
        {layers.accessory === "cap" ? (
          <g>
            <path d="M42 22 a18 14 0 0 1 36 0 z" fill="#b45309" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M60 8 v-4" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : null}
        {layers.expression === "friendly" ? (
          <path d="M52 84 q8 6 16 0" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        ) : layers.expression === "deadpan" ? (
          <path d="M52 84 h16" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M52 86 q8 5 16 0" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        )}
        {style.whiskers ? (
          <path d="M18 74 H40 M18 82 H40 M80 74 H102 M80 82 H102" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        ) : null}
      </g>
    </svg>
  );
}
