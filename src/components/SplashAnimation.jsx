import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import AppLogo from "./AppLogo";

// Animation de démarrage (app Android uniquement) : le logo apparaît en
// douceur, "respire" une fois, puis l'écran se fond dans l'app.
// Le splash natif reste affiché jusqu'à ce que celle-ci soit prête (aucun
// flash), puis passe le relais à cette animation qui a le même fond.
const TOTAL_MS = 1900;
const FADE_MS = 350;

export default function SplashAnimation() {
  const native = Capacitor.isNativePlatform();
  const [phase, setPhase] = useState(native ? "in" : "done");

  useEffect(() => {
    if (!native) return;
    SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => {});
    const t1 = setTimeout(() => setPhase("out"), TOTAL_MS - FADE_MS);
    const t2 = setTimeout(() => setPhase("done"), TOTAL_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [native]);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "#12131F",
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <div className="splash-logo"><AppLogo size={96} /></div>
      <p className="splash-word font-display text-2xl text-sable-50 mt-5">
        Mon<span className="text-ocre-400">Djassa</span>
      </p>
    </div>
  );
}
