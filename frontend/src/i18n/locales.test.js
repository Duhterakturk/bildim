import { expect, it } from "vitest";
import en from "./locales/en.json";
import tr from "./locales/tr.json";
import { apiErrorText } from "./apiError";

function leaves(value, prefix = "") {
  const out = {};
  Object.entries(value).forEach(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(out, leaves(item, path));
    else out[path] = String(item);
  });
  return out;
}

function tokens(text) {
  return [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)/g)].map((match) => match[1]).sort();
}

const turkish = leaves(tr);
const english = leaves(en);

it("Turkish and English catalogs have the same keys and placeholders", () => {
  expect(Object.keys(english).sort()).toEqual(Object.keys(turkish).sort());
  Object.keys(turkish).forEach((key) => {
    expect(tokens(english[key]), key).toEqual(tokens(turkish[key]));
    expect(english[key], key).not.toBe(key);
    expect(turkish[key], key).not.toBe(key);
  });
});

it("an unknown API error uses the localized fallback", () => {
  const t = (key) => (key === "errors.unknown" ? "Try again." : key);
  const i18n = { exists: (key) => key === "errors.class_code_mismatch" };
  expect(apiErrorText({ code: "not_a_real_code", fallback: "errors.unknown" }, t, i18n)).toBe("Try again.");
  expect(apiErrorText({ code: "class_code_mismatch", fallback: "errors.unknown" }, t, i18n)).toBe("errors.class_code_mismatch");
});
