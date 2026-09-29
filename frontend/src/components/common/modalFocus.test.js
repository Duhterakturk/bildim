import { describe, expect, it } from "vitest";
import { nextTabTarget } from "./modalFocus";

function harness(count) {
  const nodes = Array.from({ length: count }, (_, index) => ({ id: index }));
  const container = { id: "dialog" };
  return { nodes, container };
}

describe("modal tab cycle", () => {
  it("wraps forward from the last control and backward from the first", () => {
    const { nodes, container } = harness(3);
    expect(nextTabTarget({ nodes, active: nodes[2], shift: false, container })).toBe(nodes[0]);
    expect(nextTabTarget({ nodes, active: nodes[0], shift: true, container })).toBe(nodes[2]);
  });

  it("lets the browser move between controls in the middle", () => {
    const { nodes, container } = harness(3);
    expect(nextTabTarget({ nodes, active: nodes[1], shift: false, container })).toBeNull();
    expect(nextTabTarget({ nodes, active: nodes[1], shift: true, container })).toBeNull();
  });

  it("pulls focus back when it sits on the dialog shell or outside", () => {
    const { nodes, container } = harness(2);
    const outside = { id: "page" };
    expect(nextTabTarget({ nodes, active: container, shift: true, container })).toBe(nodes[1]);
    expect(nextTabTarget({ nodes, active: outside, shift: false, container })).toBe(nodes[0]);
    expect(nextTabTarget({ nodes, active: outside, shift: true, container })).toBe(nodes[1]);
  });

  it("keeps an empty window on its shell", () => {
    const container = { id: "dialog" };
    expect(nextTabTarget({ nodes: [], active: container, shift: false, container })).toBe(container);
  });
});
