import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { nextTabTarget } from "./modalFocus";

const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function tabbable(root) {
  return [...root.querySelectorAll(TABBABLE)].filter((node) => {
    if (node.closest("[hidden], [aria-hidden='true']")) return false;
    const style = window.getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

let depth = 0;
let snapshot = null;

function lockBackground() {
  const root = document.getElementById("root");
  if (depth === 0) {
    snapshot = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      scrollY: window.scrollY,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${snapshot.scrollY}px`;
    document.body.style.width = "100%";
    if (root) root.inert = true;
  }
  depth += 1;
  return function release() {
    depth = Math.max(0, depth - 1);
    if (depth > 0 || !snapshot) return;
    const y = snapshot.scrollY;
    document.body.style.overflow = snapshot.overflow;
    document.body.style.position = snapshot.position;
    document.body.style.top = snapshot.top;
    document.body.style.width = snapshot.width;
    snapshot = null;
    if (root) root.inert = false;
    window.scrollTo(0, y);
  };
}

function restoreFocus(node) {
  if (node && node.isConnected && node !== document.body && node !== document.documentElement) {
    node.focus({ preventScroll: true });
    if (document.activeElement === node) return;
  }
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

export default function Modal({
  onClose,
  labelledBy,
  describedBy,
  children,
  decoration = null,
  overlayClassName,
  panelClassName,
  closeOnBackdrop = false,
  returnTo = null,
  footer = null,
  testId,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const explicit = returnTo?.current;
    const previous = explicit && explicit.isConnected ? explicit : document.activeElement;
    const release = lockBackground();
    panelRef.current?.focus({ preventScroll: true });

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const target = nextTabTarget({
        nodes: tabbable(panelRef.current),
        active: document.activeElement,
        shift: event.shiftKey,
        container: panelRef.current,
      });
      if (!target) return;
      event.preventDefault();
      target.focus();
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      release();
      restoreFocus(previous);
    };
  }, [returnTo]);

  return createPortal(
    <div
      className={`modal-layer ${overlayClassName}`}
      data-testid={testId}
      onClick={closeOnBackdrop ? () => onCloseRef.current() : undefined}
    >
      {decoration}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy || undefined}
        tabIndex={-1}
        className={`modal-panel flex min-h-0 flex-col ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-body">{children}</div>
        {footer}
      </div>
    </div>,
    document.body,
  );
}
