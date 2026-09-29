import { useId } from "react";

export default function BrandLogo() {
  const maskId = useId();
  const emblemId = useId();
  return (
    <svg className="brand-logo" viewBox="0 0 2169 725" width="2169" height="725" aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="759" y="0" width="1102" height="725" style={{ maskType: "alpha" }}>
          <image href="/brand/bildim-logo-light.png" width="2169" height="725" />
        </mask>
        <clipPath id={emblemId}>
          <rect width="759" height="725" />
          <rect x="1861" width="308" height="725" />
        </clipPath>
      </defs>
      <image href="/brand/bildim-logo-light.png" width="2169" height="725" clipPath={`url(#${emblemId})`} />
      <rect className="brand-wordmark" x="759" width="1102" height="725" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
