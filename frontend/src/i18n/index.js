import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import tr from "./locales/tr.json";
import en from "./locales/en.json";

// Only an explicit selection in Bildim enables English. Ignore legacy values.
export const LANGUAGE_STORAGE_KEY = "bildim_language";
let initialLanguage = "tr";
try {
  if (localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en") initialLanguage = "en";
} catch { /* Storage may be disabled; the default remains Turkish. */ }

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "tr",
  interpolation: {
    escapeValue: false,
    format(value, format, lng) {
      if (format === "number" && typeof value === "number") {
        return new Intl.NumberFormat(lng?.startsWith("en") ? "en" : "tr").format(value);
      }
      return value;
    },
  },
});

export default i18n;
