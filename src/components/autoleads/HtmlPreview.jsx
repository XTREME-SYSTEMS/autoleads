import React, { useEffect, useRef, useState } from "react";

export default function HtmlPreview({ html, className = "", minHeight = 400 }) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    if (!html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;
        const h = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0);
        if (h > 0) setHeight(Math.max(h + 16, minHeight));
      } catch {}
    };

    iframe.onload = measure;
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [html, minHeight]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      className={`w-full border-0 ${className}`}
      style={{ height: `${height}px` }}
      sandbox="allow-same-origin"
      title="HTML Preview"
    />
  );
}