export default function BrandLogo() {
  const image = { src: "/brand/bildim-logo-light.png", alt: "", width: 2169, height: 725 };
  return (
    <span className="brand-art" aria-hidden="true">
      <img {...image} className="brand-logo brand-logo-brain" fetchPriority="high" />
      <img {...image} className="brand-logo brand-logo-punctuation" />
      <img {...image} className="brand-logo brand-logo-word" />
    </span>
  );
}
