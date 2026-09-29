import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { HOW_IT_WORKS_STEPS } from "../data/howItWorks";
import AppLogo from "./AppLogo";

const STORAGE_KEY = "mondjassa:hideHowItWorks";

function isHidden() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

// Introduction « Comment ça marche », affichée à l'ouverture de l'app Android
// uniquement (rien sur le web). Les étapes se font défiler au doigt ou avec
// « Suivant ». « Passer » ferme pour cette ouverture ; « Ne plus afficher »
// ferme définitivement (mémorisé sur l'appareil).
export default function HowItWorksIntro() {
  const [open, setOpen] = useState(() => Capacitor.isNativePlatform() && !isHidden());
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef(null);

  if (!open) return null;

  const last = HOW_IT_WORKS_STEPS.length - 1;

  function handleScroll(e) {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goNext() {
    if (index >= last) { setOpen(false); return; }
    const el = scrollerRef.current;
    el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: "smooth" });
  }

  function neverShowAgain() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-sable-50 flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="font-display text-lg flex items-center gap-2">
          <AppLogo size={24} />
          <span>Mon<span className="text-ocre-500">Djassa</span></span>
        </p>
        <button onClick={() => setOpen(false)} className="text-sm text-encre-700/70 px-2 py-1">
          Passer
        </button>
      </div>

      <h2 className="font-display font-semibold text-xl text-center mt-6">Comment ça marche</h2>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex flex-1 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {HOW_IT_WORKS_STEPS.map((step) => (
          <div key={step.n} className="min-w-full snap-center flex flex-col items-center justify-center text-center px-8">
            <div className="w-14 h-14 rounded-full bg-indigo-500 text-sable-50 font-display font-semibold text-2xl flex items-center justify-center mb-5">
              {step.n}
            </div>
            <h3 className="font-display font-semibold text-xl mb-2">{step.title}</h3>
            <p className="text-sm text-encre-700/70 leading-relaxed max-w-xs">{step.text}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mb-5">
        {HOW_IT_WORKS_STEPS.map((s, i) => (
          <span key={s.n} className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-indigo-500" : "w-2 bg-encre-950/20"}`} />
        ))}
      </div>

      <div className="px-5 pb-5 space-y-2">
        <button onClick={goNext} className="w-full bg-encre-950 text-sable-50 rounded-full py-3 font-medium">
          {index >= last ? "Commencer" : "Suivant"}
        </button>
        <button onClick={neverShowAgain} className="w-full text-sm text-encre-700/70 py-2">
          Ne plus afficher
        </button>
      </div>
    </div>
  );
}
