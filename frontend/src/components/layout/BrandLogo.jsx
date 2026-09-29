import { useLayoutEffect, useRef, useState } from "react";

function luminance(rgb) {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

// Canvas understands computed CSS colors, including color-mix's color(srgb …).
function surfaceColor(element, context) {
  let color = [0, 0, 0];
  let opacity = 0;
  for (let node = element; node && opacity < 0.999; node = node.parentElement) {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(node).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    const contribution = (pixel[3] / 255) * (1 - opacity);
    color = color.map((channel, index) => channel + pixel[index] * contribution);
    opacity += contribution;
  }
  return color.map((channel) => channel + 255 * (1 - opacity));
}

export default function BrandLogo() {
  const ref = useRef(null);
  const [tone, setTone] = useState("dark");

  useLayoutEffect(() => {
    const surface = ref.current?.closest("nav");
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!surface || !context) return undefined;
    function update() {
      const background = luminance(surfaceColor(surface, context));
      const ink = luminance([32, 35, 42]);
      const darkContrast = (Math.max(background, ink) + 0.05) / (Math.min(background, ink) + 0.05);
      const whiteContrast = 1.05 / (background + 0.05);
      setTone(whiteContrast > darkContrast ? "light" : "dark");
    }
    update();
    const observer = new MutationObserver(update);
    // Theme purchases, previews and preview expiry all update these surfaces.
    for (const node of [document.documentElement, document.body, surface]) {
      observer.observe(node, { attributes: true, attributeFilter: ["style", "class"] });
    }
    window.addEventListener("resize", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);
    surface.addEventListener("transitionend", update);
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
      surface.removeEventListener("transitionend", update);
      colorScheme.removeEventListener?.("change", update);
    };
  }, []);

  return (
    <span ref={ref} data-brand-tone={tone} aria-hidden="true">
      <img className="brand-logo" src="/brand/bildim-logo-light.png" alt="" width="2169" height="725" fetchPriority="high" />
      <img className="brand-logo brand-logo-white" src="/brand/bildim-logo-light.png" alt="" width="2169" height="725" />
    </span>
  );
}
