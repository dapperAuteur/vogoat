/**
 * One 16:9 slot per guide. With no video id yet it is a labelled placeholder; once BAM pastes
 * an id into src/lib/how-to/guides.ts it becomes the embed, framed like /about.
 */
export function VideoSlot({ videoId, title }: { videoId: string | null; title: string }) {
  if (videoId) {
    return (
      <div className="overflow-hidden rounded-md border border-rule" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={`${title}: the VO GOAT walkthrough`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label={`Walkthrough video for ${title} is not published yet`}
      className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted bg-card p-4 text-center"
      style={{ aspectRatio: "16 / 9" }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-muted"
      >
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M10 9.5v5l4.5-2.5z" />
      </svg>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Walkthrough coming</p>
      <p className="max-w-[22rem] text-sm leading-relaxed text-muted">
        The video for {title} is still being filmed. The written steps below are complete on their own.
      </p>
    </div>
  );
}
