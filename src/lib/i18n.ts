import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import mg from "@/locales/mg.json";

export const SUPPORTED_LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "mg", label: "Malagasy", flag: "🇲🇬" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        mg: { translation: mg },
        en: { translation: en },
      },
      fallbackLng: "fr",
      supportedLngs: ["fr", "mg", "en"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "mbosstsika_lang",
      },
    });
}

export default i18n;
