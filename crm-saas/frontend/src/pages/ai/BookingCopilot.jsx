import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, CalendarDays, Copy, Check } from "lucide-react";
import { api, canManage, errorMessage } from "../../lib/api";
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
  const [inquiry, setInquiry] = useState(""),
    [locale, setLocale] = useState("ro-RO");
  const [result, setResult] = useState(null),
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
      setResult(data);
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
          "This offer changed. Refresh offers to check the current inventory.",
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
          : "Booking response unavailable. Check Reservations before retrying.",
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
      setError("Clipboard unavailable. Select and copy the draft manually.");
    }
  }
  return (
    <main className="dashboard-main r-page copilot">
      <PageHeader
        title="AI Booking Copilot"
        description="Turn customer inquiries into booking-ready offers."
      />
      <ErrorNotice message={error} />
      {saved && (
        <div className="r-panel" role="status">
          <Check size={16} /> Reservation saved for {saved.contact.firstName}{" "}
          {saved.contact.lastName}.{" "}
          <Link to={"/reservations?reservationId=" + saved.id}>
            View reservation
          </Link>
        </div>
      )}
      <div className="copilot-grid">
        <section className="r-panel r-form">
          <h2>Customer inquiry</h2>
          <label>
            Message
            <textarea
              rows={6}
              maxLength={2000}
              value={inquiry}
              disabled={!!busy}
              onChange={(e) => changeInquiry(e.target.value)}
              placeholder="Paste the customer's rental request…"
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
                  setLocale(lang);
                }}
              >
                {lang === "ro-RO" ? "Romanian example" : "English example"}
              </button>
            ))}
          </div>
          <label>
            Reply language
            <select
              value={locale}
              disabled={!!busy}
              onChange={(e) => {
                setLocale(e.target.value);
                changeInquiry(inquiry);
              }}
            >
              <option value="ro-RO">Română</option>
              <option value="en-GB">English</option>
            </select>
          </label>
          <button
            className="r-button"
            disabled={!!busy || !inquiry.trim()}
            onClick={() => analyze()}
          >
            <Sparkles size={16} />
            {busy === "analysis" ? "Analyzing…" : "Analyze inquiry"}
          </button>
        </section>
        <section className="r-panel r-form">
          <h2>Rental details</h2>
          {!result ? (
            <p>
              Analyze an inquiry to review the dates, preferences and budget.
            </p>
          ) : (
            <>
              <strong>
                {
                  {
                    gemini: "Gemini extraction",
                    local: "Manual assisted search",
                    test: "Test provider",
                  }[result.source]
                }
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
                    {label}
                    {!dirty &&
                      result.missingFields.includes(key) &&
                      " · required"}
                    {Array.isArray(type) ? (
                      <select
                        disabled={!!busy}
                        value={details[key] || ""}
                        onChange={(e) => changeField(key, e.target.value)}
                      >
                        <option value="">Any</option>
                        {type.map((x) => (
                          <option key={x}>{x}</option>
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
                Refresh offers
              </button>
            </>
          )}
        </section>
      </div>
      {result && !dirty && (
        <>
          <section className="r-panel copilot-results">
            <h2>Available vehicles</h2>
            {result.checkedAt && (
              <p>
                Checked {new Date(result.checkedAt).toLocaleTimeString()} ·{" "}
                {details.startDate} – {details.endDate} · Europe/Bucharest
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
                    {o.category} · {o.transmission}
                  </span>
                  <span>
                    Available · €{o.dailyRate}/day × {o.billedDays} days
                  </span>
                  <strong>€{o.total} total</strong>
                  {!!o.mismatches.length && (
                    <span>
                      Alternative · different {o.mismatches.join(", ")}
                    </span>
                  )}
                  {canManage() && (
                    <button
                      disabled={!!busy}
                      className="r-button secondary"
                      onClick={() => select(o)}
                    >
                      {selected?.vehicleId === o.vehicleId
                        ? "Selected"
                        : "Select vehicle"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
          {selected && (
            <section className="r-panel r-form">
              <h2>Review booking</h2>
              <p>
                {selected.brand} {selected.model} · {details.startDate} –{" "}
                {details.endDate} · EUR {selected.total}
              </p>
              <label>
                Customer
                <select
                  aria-label="Customer"
                  disabled={!!busy}
                  value={customer}
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    setConfirmed(false);
                  }}
                >
                  <option value="">Select a customer</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </label>
              {!contacts.length && <Link to="/contacts">Add a customer</Link>}
              <label className="copilot-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!!busy || !customer}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I confirm the customer, vehicle, dates and total.
              </label>
              <button
                className="r-button"
                disabled={!!busy || !confirmed || !customer}
                onClick={book}
              >
                {busy === "booking" ? "Saving…" : "Confirm reservation"}
              </button>
            </section>
          )}
          <section className="r-panel r-form">
            <h2>Customer reply</h2>
            <label>
              Editable draft
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
              {copied ? "Copied" : "Copy reply"}
            </button>
          </section>
        </>
      )}
      {busy === "quote" && <p role="status">Checking the selected offer…</p>}
    </main>
  );
  function changeField(key, value) {
    invalidate();
    setDetails((prev) => ({ ...prev, [key]: value || null }));
  }
}
