import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share, ExternalLink } from "lucide-react";

const ICON_URL = "https://media.base44.com/images/public/6a6e5f6d8ef2d024c71818a5/fb3bdd812_autoleads-mark-color-master.png";

export default function PwaInstallButton({ variant = "card" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    const isInStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isInStandalone) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // No native install prompt available.
      if (isIos) setShowIosHelp(true);
      else setShowUnavailable(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) return null;

  if (variant === "card") {
    return (
      <>
        <button
          onClick={handleInstall}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2df0d] px-4 py-3 text-sm font-black text-black transition hover:bg-[#f6e958] active:scale-[0.98]"
        >
          <Download size={18} strokeWidth={2.5} />
          Download App
        </button>
        {isIos && !deferredPrompt && (
          <button
            onClick={() => setShowIosHelp(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#f2df0d] px-4 py-2.5 text-xs font-bold text-[#f2df0d] transition hover:bg-[#fefbe2]"
          >
            <Smartphone size={15} /> Add to Home Screen
          </button>
        )}
        {showIosHelp && <IosHelpModal onClose={() => setShowIosHelp(false)} />}
        {showUnavailable && <UnavailableModal onClose={() => setShowUnavailable(false)} />}
      </>
    );
  }

  // compact variant for header
  return (
    <>
      <button
        onClick={handleInstall}
        title="Download App"
        className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2df0d] text-black transition hover:bg-[#f6e958]"
      >
        <Download size={17} strokeWidth={2.5} />
      </button>
      {showIosHelp && <IosHelpModal onClose={() => setShowIosHelp(false)} />}
      {showUnavailable && <UnavailableModal onClose={() => setShowUnavailable(false)} />}
    </>
  );
}

function IosHelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">Add to Home Screen</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-black/40 hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-black/70">
          <div className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d] text-xs font-black text-black">1</span>
            <p>Tap the <strong>Share</strong> button in Safari's toolbar <Share size={14} className="inline" /></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d] text-xs font-black text-black">2</span>
            <p>Select <strong>"Add to Home Screen"</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d] text-xs font-black text-black">3</span>
            <p>Tap <strong>Add</strong> — AutoLeads will appear on your home screen like a native app.</p>
          </div>
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-[#f2df0d] py-3 text-sm font-black text-black">Got it</button>
      </div>
    </div>
  );
}

function UnavailableModal({ onClose }) {
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">Install AutoLeads</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-black/40 hover:bg-black/5"><X size={18} /></button>
        </div>
        {inIframe ? (
          <div className="mt-4 space-y-3 text-sm text-black/70">
            <p>The install prompt isn't available inside the builder preview.</p>
            <p>To install AutoLeads as an app, open the <strong>published app</strong> in its own browser tab, then tap the Download App button there.</p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2df0d] py-3 text-sm font-black text-black"
            >
              <ExternalLink size={16} /> Open app in new tab
            </a>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-black/70">
            <p>Your browser didn't offer an install prompt. App installation works best in <strong>Chrome</strong> or <strong>Edge</strong> on desktop, or Chrome on Android.</p>
            <p>On iPhone/iPad, use Safari's <strong>Share → Add to Home Screen</strong>.</p>
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-black/15 py-2.5 text-sm font-bold text-black/70 hover:bg-black/5">Close</button>
      </div>
    </div>
  );
}