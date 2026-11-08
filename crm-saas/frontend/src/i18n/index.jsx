import { createContext, useContext, useEffect, useState } from "react";
import messages from "./messages.json";

const Context = createContext(null);
const storageKey = "flowdesck.language";
export const currentLanguage = () =>
  localStorage.getItem(storageKey) === "en" ? "en" : "ro";
export const currentLocale = () =>
  currentLanguage() === "ro" ? "ro-RO" : "en-GB";
export function translate(key, lang = currentLanguage()) {
  return Object.hasOwn(messages[lang], key) ? messages[lang][key] : key;
}
export function LanguageProvider({ children }) {
  const [language, update] = useState(currentLanguage);
  function setLanguage(lang) {
    localStorage.setItem(storageKey, lang);
    update(lang);
  }
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const locale = language === "ro" ? "ro-RO" : "en-GB";
  return (
    <Context.Provider
      value={{
        language,
        locale,
        setLanguage,
        t: (key) => translate(key, language),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className="language-switch"
      role="group"
      aria-label={language === "ro" ? "Limbă" : "Language"}
    >
      {["ro", "en"].map((lang) => (
        <button
          type="button"
          key={lang}
          lang={lang}
          aria-label={lang === "ro" ? "Română" : "English"}
          aria-pressed={lang === language}
          onClick={() => setLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
export function format(key, ...values) {
  return translate(key).replace(/\{(\d+)\}/g, (_, i) => values[i]);
}
export function findingDescription(finding) {
  if (finding.type === "LOW_UTILIZATION") {
    const { occupiedDays, eligibleDays, utilizationPercent } = finding.evidence;
    return format(
      "Scheduled rentals occupy {0} of {1} eligible days ({2}%).",
      occupiedDays,
      eligibleDays,
      utilizationPercent.toLocaleString(currentLocale()),
    );
  }
  if (finding.type === "INSURANCE_EXPIRATION")
    return format(
      "Recorded insurance expiration is {0}.",
      finding.evidence.expirationDate,
    );
  return translate(finding.description);
}

export function calendarDate(value) {
  if (!value) return "";
  // Rental dates are whole calendar days, independent of the browser's zone.
  return new Intl.DateTimeFormat(currentLocale(), {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(value.slice(0, 10) + "T00:00:00Z"));
}
const validationFields = {
  companyName: "Company name",
  email: "Email",
  password: "Password",
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  company: "Company",
  status: "Status",
  notes: "Notes",
  source: "Source",
  potentialValue: "Potential value",
  invoiceNumber: "Număr factură",
  amount: "Sumă (€)",
  dueDate: "Data scadenței",
  contactId: "Customer",
  title: "New task",
  priority: "Task priority",
};
export function localizedError(message) {
  if (!message) return "";
  const validation = message.match(
    /^(Câmp obligatoriu: |Valoare invalidă pentru câmpul )(\w+)\.$/,
  );
  if (validation)
    return format(
      validation[1].startsWith("Câmp")
        ? "Required field: {0}."
        : "Invalid value for {0}.",
      translate(validationFields[validation[2]] || validation[2]),
    );
  const price = message.match(
    /^Current total is EUR (\d+\.\d+)\. Review the current offer or explicitly agree an override\.$/,
  );
  if (price)
    return format(
      "Current total is EUR {0}. Review the current offer or explicitly agree an override.",
      price[1],
    );
  const limit = message.match(/^Text must contain 1–(\d+) characters\.$/);
  if (limit) return format("Text must contain 1–{0} characters.", limit[1]);
  return translate(message);
}
