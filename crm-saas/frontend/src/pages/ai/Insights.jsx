import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage, canManage } from "../../lib/api";
import {
  PageHeader,
  ErrorNotice,
  Loading,
  Modal,
  Empty,
} from "../../components/RentalUI";
import "./Copilot.css";
export default function Insights() {
  const [periodDays, setPeriod] = useState("30"),
    [threshold, setThreshold] = useState("40"),
    [locale, setLocale] = useState("en-GB");
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [brief, setBrief] = useState(null),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null),
    [tasks, setTasks] = useState([]),
    [success, setSuccess] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    setBrief(null);
    setData(null);
    setPending(null);
    Promise.all([
      api.get("/ai/fleet-insights", {
        params: { periodDays, threshold },
        signal: c.signal,
      }),
      api.get("/tasks", { signal: c.signal }),
    ])
      .then(([r, t]) => {
        setData(r.data);
        setTasks(t.data);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [periodDays, threshold]);
  async function generate() {
    setBusy(true);
    setError("");
    setBrief(null);
    try {
      const { data } = await api.post("/ai/fleet-insights/explain", {
        periodDays: Number(periodDays),
        threshold: Number(threshold),
        locale,
      });
      setData(data);
      setBrief(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const titleFor = (i) =>
    `Review insurance for ${i.vehicle.licensePlate} — ${i.evidence.expirationDate}`;
  async function remind() {
    setBusy(true);
    setError("");
    try {
      const title = titleFor(pending);
      const existing = (await api.get("/tasks")).data;
      if (existing.some((t) => t.title === title)) {
        setTasks(existing);
        setPending(null);
        setSuccess("Reminder already exists.");
        return;
      }
      const { data } = await api.post("/tasks", {
        title,
        priority: pending.severity === "HIGH" ? "Urgent" : "Normal",
      });
      setTasks([...existing, data]);
      setPending(null);
      setSuccess("Reminder saved. View it in Dashboard tasks.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="dashboard-main r-page copilot">
      <PageHeader
        title="Fleet Intelligence"
        description="Know what needs your attention before it costs you time."
      />
      <ErrorNotice message={error} />
      {success && (
        <p role="status">
          {success} <Link to="/dashboard">Open tasks</Link>
        </p>
      )}
      <div className="r-panel r-form copilot-fields">
        <label>
          Historical period
          <select
            disabled={busy}
            value={periodDays}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label>
          Low utilization threshold
          <select
            disabled={busy}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          >
            {[20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="r-stats">
              {[
                ["Operational insights", data.summary.insightsCount],
                ["High-priority issues", data.summary.highSeverityCount],
                [
                  "Vehicles requiring attention",
                  data.summary.vehiclesRequiringAttention,
                ],
              ].map(([label, count]) => (
                <div className="r-stat" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <p>
              Scheduled utilization · {data.reportingPeriod.from} →{" "}
              {data.reportingPeriod.to} (exclusive) · Europe/Bucharest.
              Insurance warnings cover the next 30 days and recorded dates
              already passed.
            </p>
            <details>
              <summary>Calculation assumptions</summary>
              {data.limitations.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </details>
            <section className="r-panel r-form" style={{ marginTop: 20 }}>
              <h2>Management briefing</h2>
              <label>
                Briefing language
                <select
                  disabled={busy}
                  value={locale}
                  onChange={(e) => {
                    setLocale(e.target.value);
                    setBrief(null);
                  }}
                >
                  <option value="en-GB">English</option>
                  <option value="ro-RO">Română</option>
                </select>
              </label>
              <button className="r-button" disabled={busy} onClick={generate}>
                {busy ? "Working…" : "Generate AI Briefing"}
              </button>
              {brief && (
                <>
                  <strong>{brief.label}</strong>
                  {brief.recommendations.map((r) => (
                    <p key={r.findingId}>
                      <Link to={"#finding-" + r.findingId}>
                        {data.insights.find((i) => i.id === r.findingId)?.title}
                      </Link>{" "}
                      — {r.text}
                    </p>
                  ))}
                </>
              )}
            </section>
            {!data.insights.length && (
              <Empty title="Your fleet has no detected operational alerts for the selected criteria." />
            )}
            {data.insights.map((i) => (
              <article
                className="r-panel r-form"
                id={"finding-" + i.id}
                key={i.id}
              >
                <strong>
                  {i.severity} priority · {i.title}
                </strong>
                <span>
                  {i.vehicle.brand} {i.vehicle.model} · {i.vehicle.licensePlate}
                </span>
                <p>{i.description}</p>
                {i.type === "OVERDUE_RETURN" && (
                  <p>
                    Scheduled return {i.evidence.scheduledReturn} ·{" "}
                    {i.evidence.daysPastScheduledReturn} days past ·{" "}
                    {i.evidence.reservationStatus}
                  </p>
                )}
                {i.type === "INSURANCE_EXPIRATION" && (
                  <p>
                    {i.evidence.daysRemaining < 0
                      ? `Recorded date passed ${-i.evidence.daysRemaining} days ago`
                      : `${i.evidence.daysRemaining} days remaining`}
                  </p>
                )}
                {i.type === "INSURANCE_EXPIRATION" ? (
                  <>
                    <Link to={i.recommendedAction.href}>Review vehicle</Link>
                    {canManage() && (
                      <button
                        className="r-button secondary"
                        disabled={
                          busy || tasks.some((t) => t.title === titleFor(i))
                        }
                        onClick={() => {
                          setPending(i);
                          setError("");
                        }}
                      >
                        {tasks.some((t) => t.title === titleFor(i))
                          ? "Reminder exists"
                          : "Create reminder"}
                      </button>
                    )}
                  </>
                ) : (
                  <Link to={i.recommendedAction.href}>
                    {i.recommendedAction.label}
                  </Link>
                )}
              </article>
            ))}
          </>
        )
      )}
      {pending && (
        <Modal
          title="Create insurance reminder?"
          busy={busy}
          onClose={() => setPending(null)}
        >
          <div className="r-form">
            <p>{titleFor(pending)}</p>
            <ErrorNotice message={error} />
            <button className="r-button" disabled={busy} onClick={remind}>
              Confirm reminder
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
