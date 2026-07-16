import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useAds, trackEvent, type Advertisement } from "@/lib/api/queries";

// A "slide" is just the subset of an Advertisement this carousel renders —
// title -> eyebrow, body split into a two-part headline (first line / rest
// as the gold accent line) so existing admin-entered copy still reads well
// in the two-line treatment this component was designed around.
type Slide = {
  type: "video" | "image";
  src: string;
  eyebrow: string;
  line: string;
  accent: string;
  id: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

function toSlide(ad: Advertisement): Slide {
  const body = ad.body ?? "";
  const splitAt = body.lastIndexOf(" ", Math.ceil(body.length * 0.6));
  const line = splitAt > 0 ? body.slice(0, splitAt) : body;
  const accent = splitAt > 0 ? body.slice(splitAt + 1) : "";
  return {
    id: ad.id,
    type: ad.media_type,
    src: ad.media_url ?? "",
    eyebrow: ad.title,
    line: line || ad.title,
    accent,
    ctaLabel: ad.cta_label,
    ctaHref: ad.cta_href,
  };
}

/**
 * Richer instrumental — layered chord with slow arpeggio + sub drone.
 * Fades in on mount when playing=true. Auto-pauses when section is offscreen.
 */
function useAmbient(playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!playing) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);

    // gentle reverb-ish delay
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.45;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(wet).connect(master);
    master.connect(ctx.destination);

    // Drone chord — Amin9 → softer, more melancholic than Cmin9
    const droneFreqs = [55.0, 110.0, 164.81, 220.0, 261.63]; // A1 A2 E3 A3 C4
    const droneOscs = droneFreqs.map((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = 0.11 / droneFreqs.length;
      lfo.frequency.value = 0.06 + i * 0.018;
      lfoGain.gain.value = 0.04 / droneFreqs.length;
      lfo.connect(lfoGain).connect(g.gain);
      o.connect(g);
      g.connect(master);
      g.connect(delay);
      o.start();
      lfo.start();
      return { o, lfo };
    });

    // Slow distant bell — pentatonic A minor
    const arpNotes = [440.0, 523.25, 659.25, 880.0, 659.25, 523.25]; // A4 C5 E5 A5 E5 C5
    let arpStep = 0;
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0;
    arpGain.connect(delay);
    arpGain.connect(master);

    const interval = setInterval(() => {
      const now = ctx.currentTime;
      const f = arpNotes[arpStep % arpNotes.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
      o.connect(g).connect(arpGain);
      o.start(now);
      o.stop(now + 3.3);
      arpStep++;
    }, 2000);

    stopRef.current = () => {
      clearInterval(interval);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        droneOscs.forEach(({ o, lfo }) => {
          try {
            o.stop();
            lfo.stop();
          } catch {}
        });
        ctx.close().catch(() => {});
      }, 1100);
    };
    return () => stopRef.current?.();
  }, [playing]);
}

export function AdsCarousel() {
  const { data: ads = [], isLoading } = useAds({ placement: "homepage" });
  const slides = ads.filter((a) => a.media_url).map(toSlide);

  const [i, setI] = useState(0);
  const [music, setMusic] = useState(false); // user must opt-in due to autoplay rules
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useAmbient(music && inView);

  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (i >= slides.length) setI(0);
  }, [slides.length, i]);

  // No active ads (or admin hasn't added any) — don't render an empty
  // carousel shell with nothing in it.
  if (!isLoading && !slides.length) return null;
  if (isLoading) return null;

  const slide = slides[i];
  const next = () => setI((p) => (p + 1) % slides.length);
  const prev = () => setI((p) => (p - 1 + slides.length) % slides.length);

  return (
    <section ref={sectionRef} id="campaigns" className="section-pad relative px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-6 lg:grid-cols-[auto_1fr]">
          <span className="section-index text-[14vw] leading-none md:text-[6vw]">08</span>
          <div>
            <p className="label-eyebrow mb-5">Les Campagnes</p>
            <h2 className="heading-section" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
              The <span className="text-gradient-gold">House's</span> Visions
            </h2>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-sm border border-gold/15"
          style={{ background: "var(--obsidian)" }}
        >
          <div className="relative aspect-[16/9] w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0"
              >
                {slide.type === "video" ? (
                  <video
                    src={slide.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src={slide.src} alt={slide.eyebrow} className="h-full w-full object-cover" />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.7) 100%)",
                  }}
                />
                <div className="absolute inset-0 flex items-center">
                  <div className="max-w-xl px-10 md:px-20">
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="mb-6 text-[10px] uppercase tracking-[0.5em] text-gold"
                    >
                      {slide.eyebrow}
                    </motion.p>
                    <motion.h3
                      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
                      transition={{ delay: 0.5, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                      className="font-display text-4xl italic leading-tight text-foreground md:text-6xl"
                    >
                      {slide.line}
                      <br />
                      <span className="text-gradient-gold">{slide.accent}</span>
                    </motion.h3>
                    {slide.ctaLabel && slide.ctaHref && (
                      <motion.a
                        href={slide.ctaHref}
                        onClick={() => trackEvent("ad_click", { sourcePath: "/ads-carousel", metadata: { adId: slide.id } })}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.8 }}
                        className="btn-gold mt-8 inline-block px-8 py-3 text-[10px] uppercase tracking-[0.4em]"
                      >
                        {slide.ctaLabel}
                      </motion.a>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <button
            onClick={prev}
            data-magnetic
            aria-label="Previous"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gold/30 bg-black/40 p-3 text-gold backdrop-blur transition hover:border-gold hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            data-magnetic
            aria-label="Next"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gold/30 bg-black/40 p-3 text-gold backdrop-blur transition hover:border-gold hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => setMusic((m) => !m)}
            data-magnetic
            aria-label="Toggle music"
            className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-gold/30 bg-black/40 px-3 py-2 text-[9px] uppercase tracking-[0.3em] text-gold backdrop-blur transition hover:border-gold"
          >
            {music ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {music ? "Unmute" : "Silent"}
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-[3px] transition-all ${idx === i ? "w-10 bg-gold" : "w-5 bg-gold/30"}`}
              />
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.4em] text-foreground/40">
          Tap the speaker for the maison's instrumental
        </p>
      </div>
    </section>
  );
}
