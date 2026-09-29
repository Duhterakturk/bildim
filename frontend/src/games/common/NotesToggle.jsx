export default function NotesToggle({ on, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={hint}
      className={[
        "inline-flex min-h-[44px] items-center justify-center px-4 py-2 rounded-lg font-semibold border",
        on ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-slate-200 border-transparent text-slate-700 hover:bg-slate-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
