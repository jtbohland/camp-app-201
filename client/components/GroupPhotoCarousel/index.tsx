import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";

const ADVANCE_MS = 5000;

/**
 * Past cAMPs: every cohort's group photo, oldest first. Auto-advances, pauses on hover,
 * arrows + dots to jump. Hidden until at least one photo exists.
 */
export default function GroupPhotoCarousel() {
  const { data, loading } = useApiData("GetGroupPhotos", {}, { staleTime: 60_000 });
  const photos = useMemo(() => (data?.photos ?? []).filter((p) => p.kind === "group"), [data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = photos.length;

  const go = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)), [count]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => go(1), ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, count, go]);

  if (loading) return <div className="mx-auto aspect-[16/9] w-full max-w-4xl animate-pulse rounded-2xl bg-muted" />;
  if (count === 0) return null;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Icon icon="camera" className="h-3.5 w-3.5" /> The Class Photos
      </div>
      <div
        className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-border"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          >
            {/* Blurred fill behind portrait-ish photos so there are no black bars */}
            <img src={p.photo_data} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
            <img
              src={p.photo_data}
              alt={`cAMP 201 Cohort ${p.cohort_number} group photo`}
              loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
              className="relative h-full w-full object-contain"
            />
            {/* Cohort banner */}
            <div className="absolute left-4 top-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 text-sm font-bold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-camp-green text-[11px] font-black">C{p.cohort_number}</span>
                Cohort {p.cohort_number}
                <span className="font-medium text-white/75">· {p.label}</span>
              </span>
            </div>
          </div>
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
            >
              <Icon icon="chevron-left" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
            >
              <Icon icon="chevron-right" className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show Cohort ${p.cohort_number}`}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
