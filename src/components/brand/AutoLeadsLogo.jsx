import React from "react";

const LIGHT_LOGO = "https://media.base44.com/images/public/6a6e5f6d8ef2d024c71818a5/145841650_autoleads-logo-light-master.png";
const DARK_LOGO  = "https://media.base44.com/images/public/6a6e5f6d8ef2d024c71818a5/015d45fbc_autoleads-logo-dark-master.png";

export default function AutoLeadsLogo({ height = 38, dark = undefined, compact = false, light = undefined, className = "" }) {
  // Support both explicit `dark` prop and CSS class-based dark mode
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.classList.contains("dark")
  );

  React.useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Allow explicit override via props
  const useDark = dark !== undefined ? dark : (light !== undefined ? !light : isDark);
  const src = useDark ? DARK_LOGO : LIGHT_LOGO;

  return (
    <img
      src={src}
      alt="AUTOLEADS Construction Intelligence"
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}