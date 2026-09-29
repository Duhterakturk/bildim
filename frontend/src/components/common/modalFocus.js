/**
 * Tab yönünde bir sonraki hedef.
 * null: tarayıcı odağı pencerenin içinde doğal olarak ilerletsin.
 */
export function nextTabTarget({ nodes, active, shift, container }) {
  if (!container) return null;
  if (nodes.length === 0) return container;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const inside = active === container || nodes.includes(active);
  if (shift) {
    if (!inside || active === container || active === first) return last;
    return null;
  }
  if (!inside || active === last) return first;
  return null;
}
