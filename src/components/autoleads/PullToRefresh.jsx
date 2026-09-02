import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;

function getScrollParent(node) {
  let el = node?.parentElement;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY)) return el;
    el = el.parentElement;
  }
  return document.scrollingElement || document.body;
}

export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    scrollRef.current = getScrollParent(el);
    const target = scrollRef.current;

    const onTouchStart = (e) => {
      if (refreshing) return;
      if (target.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && target.scrollTop <= 0) {
        const dampened = Math.min(delta * 0.5, MAX_PULL);
        setPull(dampened);
        setActive(true);
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) { return; }
      pulling.current = false;
      setActive(false);
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try { await onRefresh?.(); } finally { setRefreshing(false); setPull(0); }
      } else {
        setPull(0);
      }
    };

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, refreshing, pull]);

  const showIndicator = pull > 0 || refreshing;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {showIndicator && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center"
          style={{ height: Math.max(pull, refreshing ? THRESHOLD : 0), opacity: refreshing ? 1 : Math.min(pull / THRESHOLD, 1) }}
        >
          <Loader2 className={refreshing ? "animate-spin text-[#f2df0d]" : "text-muted-foreground"} size={24} />
        </div>
      )}
      <div style={{ transform: `translateY(${pull}px)`, transition: active ? "none" : "transform 0.3s ease" }}>
        {children}
      </div>
    </div>
  );
}