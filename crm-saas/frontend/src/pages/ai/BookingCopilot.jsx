import { useLanguage, calendarDate } from "../../i18n";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, CalendarDays, Copy, Check } from "lucide-react";
import { euros, api, canManage, errorMessage } from "../../lib/api";
import { PageHeader, ErrorNotice } from "../../components/RentalUI";
import "./Copilot.css";

const examples = [
  [
    "ro-RO",
    "Vreau un Golf automat din 13 până pe 16 noiembrie, maxim 180 euro.",
  ],
  ["en-GB", "Do you have an automatic SUV available next Friday for 3 days?"],
];
const fields = [
  ["startDate", "Pickup date", "date"],
  ["endDate", "Return date (exclusive)", "date"],
  ["preferredBrand", "Preferred brand"],
  ["preferredModel", "Preferred model"],
  ["category", "Category", ["ECONOMY", "COMPACT", "SUV", "VAN"]],
  ["transmission", "Transmission", ["MANUAL", "AUTOMATIC"]],
  ["maxTotalBudget", "Maximum total budget"],
  ["currency", "Budget currency"],
  ["pickupLocation", "Requested pickup location"],
];

export default function BookingCopilot() {
  const [inquiry, setInquiry] = useState("");
  const { t: tr, locale, setLanguage } = useLanguage();
  const setLocale = (value) => setLanguage(value === "ro-RO" ? "ro" : "en");
  const [analysis, setResult] = useState(null),
    [details, setDetails] = useState({});
  const [dirty, setDirty] = useState(false),
    [draft, setDraft] = useState(""),
    [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState(null),
    [contacts, setContacts] = useState([]);
  const [customer, setCustomer] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(null);
  const result = analysis?.locale === locale ? analysis : null;
  useEffect(() => {
    setResult(null);
    setSelected(null);
    setConfirmed(false);
    setError("");
  }, [locale]);
  function clearSelection() {
    setSelected(null);
    setConfirmed(false);
    setCustomer("");
  }
  function invalidate() {
    clearSelection();
    setDirty(true);
    setDraft("");
    setCopied(false);
    setSaved(null);
    setError("");
  }
  function changeInquiry(value) {
    setInquiry(value);
    invalidate();
    setResult(null);
    setDetails({});
  }
  async function analyze(manual = false) {
    invalidate();
    setBusy("analysis");
    try {
      const { data } = await api.post("/ai/booking-proposals", {
        inquiry,
        locale,
        ...(manual ? { manual: true, clarifications: details } : {}),
      });
      setResult({ ...data, locale });
      setDetails(data.extracted);
      setDraft(data.replyDraft);
      setDirty(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function select(offer) {
    clearSelection();
    setBusy("quote");
    setError("");
    setCopied(false);
    try {
      const { startDate, endDate } = result.extracted;
      const [quotes, customers] = await Promise.all([
        api.get("/reservations/availability", {
          params: { startDate, endDate },
        }),
        api.get("/contacts"),
      ]);
      const fresh = quotes.data.items.find(
        (q) => q.vehicle.id === offer.vehicleId,
      );
      if (
        !fresh ||
        fresh.total !== offer.total ||
        ["brand", "model", "category", "transmission", "dailyRate"].some(
          (k) => fresh.vehicle[k] !== offer[k],
        )
      ) {
        invalidate();
        setError(
          tr(
            "This offer changed. Refresh offers to check the current inventory.",
          ),
        );
        return;
      }
      setContacts(customers.data);
      setSelected(offer);
      setDraft(offer.replyDraft);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function book() {
    if (!confirmed || !selected || !customer || dirty) return;
    setBusy("booking");
    setError("");
    try {
      const { data } = await api.post("/reservations", {
        vehicleId: selected.vehicleId,
        contactId: customer,
        startDate: details.startDate,
        endDate: details.endDate,
        agreedTotal: selected.total,
        confirmed: true,
      });
      invalidate();
      setSaved(data);
    } catch (e) {
      invalidate();
      setError(
        e.response
          ? errorMessage(e)
          : tr(
              "Booking response unavailable. Check Reservations before retrying.",
            ),
      );
    } finally {
      setBusy("");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setError(
        tr("Clipboard unavailable. Select and copy the draft manually."),
      );
    }
  }
  return (
    <main className="dashboard-main r-page copilot">
      <PageHeader
        title={tr("AI Booking Copilot")}
        description={tr("Turn customer inquiries into booking-ready offers.")}
      />
      <ErrorNotice message={error} />
      {saved && (
        <div className="r-panel" role="status">
          <Check size={16} /> {tr("Reservation saved for")}{" "}
          {saved.contact.firstName} {saved.contact.lastName}.{" "}
          <Link to={"/reservations?reservationId=" + saved.id}>
            {tr("View reservation")}{" "}
          </Link>
        </div>
      )}
      <div className="copilot-grid">
        <section className="r-panel r-form">
          <h2>{tr("Customer inquiry")}</h2>
          <label>
            {tr("Message")}{" "}
            <textarea
              rows={6}
              maxLength={2000}
              value={inquiry}
              disabled={!!busy}
              onChange={(e) => changeInquiry(e.target.value)}
              placeholder={tr("Paste the customer's rental request…")}
            />
          </label>
          <div className="copilot-examples">
            {examples.map(([lang, msg]) => (
              <button
                key={lang}
                disabled={!!busy}
                className="r-text-link"
                onClick={() => {
                  changeInquiry(msg);
                }}
              >
                {lang === "ro-RO"
                  ? tr("Romanian example")
                  : tr("English example")}
              </button>
            ))}
          </div>
          <label>
            {tr("Reply language")}{" "}
            <select
              value={locale}
              disabled={!!busy}
              onChange={(e) => {
                setLocale(e.target.value);
                changeInquiry(inquiry);
              }}
            >
              <option value="ro-RO">{tr("Română")}</option>
              <option value="en-GB">{tr("English")}</option>
            </select>
          </label>
          <button
            className="r-button"
            disabled={!!busy || !inquiry.trim()}
            onClick={() => analyze()}
          >
            <Sparkles size={16} />
            {busy === "analysis" ? tr("Analyzing…") : tr("Analyze inquiry")}
          </button>
        </section>
        <section className="r-panel r-form">
          <h2>{tr("Rental details")}</h2>
          {!result ? (
            <p>
              {tr(
                "Analyze an inquiry to review the dates, preferences and budget.",
              )}{" "}
            </p>
          ) : (
            <>
              <strong>
                {tr(
                  {
                    gemini: "Gemini extraction",
                    local: "Manual assisted search",
                    test: "Test provider",
                  }[result.source],
                )}
              </strong>
              {result.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              {!dirty && result.clarificationQuestion && (
                <p role="status">{result.clarificationQuestion}</p>
              )}
              <div className="copilot-fields">
                {fields.map(([key, label, type]) => (
                  <label key={key}>
                    {tr(label)}
                    {!dirty &&
                      result.missingFields.includes(key) &&
                      tr(" · required")}
                    {Array.isArray(type) ? (
                      <select
                        disabled={!!busy}
                        value={details[key] || ""}
                        onChange={(e) => changeField(key, e.target.value)}
                      >
                        <option value="">{tr("Any")}</option>
                        {type.map((x) => (
                          <option key={x} value={x}>
                            {tr(x)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        disabled={!!busy}
                        type={type || "text"}
                        maxLength={80}
                        value={details[key] || ""}
                        onChange={(e) => changeField(key, e.target.value)}
                      />
                    )}
                  </label>
                ))}
              </div>
              <button
                disabled={!!busy}
                className="r-button secondary"
                onClick={() => analyze(true)}
              >
                <CalendarDays size={16} />
                {tr("Refresh offers")}{" "}
              </button>
            </>
          )}
        </section>
      </div>
      {result && !dirty && (
        <>
          <section className="r-panel copilot-results">
            <h2>{tr("Available vehicles")}</h2>
            {result.checkedAt && (
              <p>
                {tr("Checked")}{" "}
                {new Date(result.checkedAt).toLocaleTimeString(locale)} ·{" "}
                {calendarDate(details.startDate)} –{" "}
                {calendarDate(details.endDate)} · Europe/Bucharest
              </p>
            )}
            {!result.offers.length && (
              <p>{result.clarificationQuestion || result.replyDraft}</p>
            )}
            <div className="copilot-offers">
              {result.offers.map((o) => (
                <article key={o.vehicleId}>
                  <strong>
                    {o.brand} {o.model}
                  </strong>
                  <span>
                    {tr(o.category)} · {tr(o.transmission)}
                  </span>
                  <span>
                    {tr("Available · ")}
                    {euros(o.dailyRate)}
                    {tr("/day ×")} {o.billedDays} {tr("days")}{" "}
                  </span>
                  <strong>
                    {euros(o.total)} {tr("total")}
                  </strong>
                  {!!o.mismatches.length && (
                    <span>
                      {tr("Alternative · different")}{" "}
                      {o.mismatches
                        .map((key) =>
                          tr({brand:"Brand", model:"Model", category:"Category", transmission:"Transmission"}[key] || key),
                        )
                        .join(", ")}
                    </span>
                  )}
                  {canManage() && (
                    <button
                      disabled={!!busy}
                      className="r-button secondary"
                      onClick={() => select(o)}
                    >
                      {selected?.vehicleId === o.vehicleId
                        ? tr("Selected")
                        : tr("Select vehicle")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
          {selected && (
            <section className="r-panel r-form">
              <h2>{tr("Review booking")}</h2>
              <p>
                {selected.brand} {selected.model} ·{" "}
                {calendarDate(details.startDate)} –{" "}
                {calendarDate(details.endDate)} · {euros(selected.total)}
              </p>
              <label>
                {tr("Customer")}{" "}
                <select
                  aria-label={tr("Customer")}
                  disabled={!!busy}
                  value={customer}
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    setConfirmed(false);
                  }}
                >
                  <option value="">{tr("Select a customer")}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </label>
              {!contacts.length && (
                <Link to="/contacts">{tr("Add a customer")}</Link>
              )}
              <label className="copilot-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!!busy || !customer}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {tr("I confirm the customer, vehicle, dates and total.")}{" "}
              </label>
              <button
                className="r-button"
                disabled={!!busy || !confirmed || !customer}
                onClick={book}
              >
                {busy === "booking" ? tr("Saving…") : tr("Confirm reservation")}
              </button>
            </section>
          )}
          <section className="r-panel r-form">
            <h2>{tr("Customer reply")}</h2>
            <label>
              {tr("Editable draft")}{" "}
              <textarea
                rows={4}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setCopied(false);
                }}
              />
            </label>
            <button
              className="r-button secondary"
              disabled={!draft.trim()}
              onClick={copy}
            >
              <Copy size={16} />
              {copied ? tr("Copied") : tr("Copy reply")}
            </button>
          </section>
        </>
      )}
      {busy === "quote" && (
        <p role="status">{tr("Checking the selected offer…")}</p>
      )}
    </main>
  );
  function changeField(key, value) {
    invalidate();
    setDetails((prev) => ({ ...prev, [key]: value || null }));
  }
}
