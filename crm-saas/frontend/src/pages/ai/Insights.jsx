import { useLanguage, format, findingDescription } from "../../i18n";
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
    [threshold, setThreshold] = useState("40");
  const { t: tr, locale, setLanguage } = useLanguage();
  const setLocale = (value) => setLanguage(value === "ro-RO" ? "ro" : "en");
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
  }, [periodDays, threshold, locale]);
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
      setBrief({ ...data, locale });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const titleFor = (i, lang = locale) =>
    (lang === "ro-RO"
      ? "Verifică asigurarea pentru "
      : "Review insurance for ") +
    i.vehicle.licensePlate +
    " — " +
    i.evidence.expirationDate;
  const hasReminder = (list, i) =>
    list.some((task) =>
      ["en-GB", "ro-RO"].some((lang) => task.title === titleFor(i, lang)),
    );
  async function remind() {
    setBusy(true);
    setError("");
    try {
      const title = titleFor(pending);
      const existing = (await api.get("/tasks")).data;
      if (hasReminder(existing, pending)) {
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
        title={tr("Fleet Intelligence")}
        description={tr(
          "Know what needs your attention before it costs you time.",
        )}
      />
      <ErrorNotice message={error} />
      {success && (
        <p role="status">
          {tr(success)} <Link to="/dashboard">{tr("Open tasks")}</Link>
        </p>
      )}
      <div className="r-panel r-form copilot-fields">
        <label>
          {tr("Historical period")}{" "}
          <select
            disabled={busy}
            value={periodDays}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">{tr("Last 7 days")}</option>
            <option value="30">{tr("Last 30 days")}</option>
          </select>
        </label>
        <label>
          {tr("Low utilization threshold")}{" "}
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
                  <span>{tr(label)}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <p>
              {tr("Scheduled utilization ·")} {data.reportingPeriod.from} →{" "}
              {data.reportingPeriod.to}{" "}
              {tr(
                "(exclusive) · Europe/Bucharest. Insurance warnings cover the next 30 days and recorded dates already passed.",
              )}{" "}
            </p>
            <details>
              <summary>{tr("Calculation assumptions")}</summary>
              {data.limitations.map((t) => (
                <p key={t}>{tr(t)}</p>
              ))}
            </details>
            <section className="r-panel r-form" style={{ marginTop: 20 }}>
              <h2>{tr("Management briefing")}</h2>
              <label>
                {tr("Briefing language")}{" "}
                <select
                  disabled={busy}
                  value={locale}
                  onChange={(e) => {
                    setLocale(e.target.value);
                    setBrief(null);
                  }}
                >
                  <option value="en-GB">{tr("English")}</option>
                  <option value="ro-RO">{tr("Română")}</option>
                </select>
              </label>
              <button className="r-button" disabled={busy} onClick={generate}>
                {busy ? tr("Working…") : tr("Generate AI Briefing")}
              </button>
              {brief?.locale === locale && (
                <>
                  <strong>{tr(brief.label)}</strong>
                  {brief.recommendations.map((r) => (
                    <p key={r.findingId}>
                      <Link to={"#finding-" + r.findingId}>
                        {tr(
                          data.insights.find((i) => i.id === r.findingId)
                            ?.title,
                        )}
                      </Link>{" "}
                      — {r.text}
                    </p>
                  ))}
                </>
              )}
            </section>
            {!data.insights.length && (
              <Empty
                title={tr(
                  "Your fleet has no detected operational alerts for the selected criteria.",
                )}
              />
            )}
            {data.insights.map((i) => (
              <article
                className="r-panel r-form"
                id={"finding-" + i.id}
                key={i.id}
              >
                <strong>
                  {format("{0} priority · {1}", tr(i.severity), tr(i.title))}
                </strong>
                <span>
                  {i.vehicle.brand} {i.vehicle.model} · {i.vehicle.licensePlate}
                </span>
                <p>{findingDescription(i)}</p>
                {i.type === "OVERDUE_RETURN" && (
                  <p>
                    {tr("Scheduled return")} {i.evidence.scheduledReturn} ·{" "}
                    {i.evidence.daysPastScheduledReturn} {tr("days past ·")}{" "}
                    {tr(i.evidence.reservationStatus)}
                  </p>
                )}
                {i.type === "INSURANCE_EXPIRATION" && (
                  <p>
                    {i.evidence.daysRemaining < 0
                      ? format(
                          "Recorded date passed {0} days ago",
                          -i.evidence.daysRemaining,
                        )
                      : format("{0} days remaining", i.evidence.daysRemaining)}
                  </p>
                )}
                {i.type === "INSURANCE_EXPIRATION" ? (
                  <>
                    <Link to={i.recommendedAction.href}>
                      {tr("Review vehicle")}
                    </Link>
                    {canManage() && (
                      <button
                        className="r-button secondary"
                        disabled={busy || hasReminder(tasks, i)}
                        onClick={() => {
                          setPending(i);
                          setError("");
                        }}
                      >
                        {hasReminder(tasks, i)
                          ? tr("Reminder exists")
                          : tr("Create reminder")}
                      </button>
                    )}
                  </>
                ) : (
                  <Link to={i.recommendedAction.href}>
                    {tr(i.recommendedAction.label)}
                  </Link>
                )}
              </article>
            ))}
          </>
        )
      )}
      {pending && (
        <Modal
          title={tr("Create insurance reminder?")}
          busy={busy}
          onClose={() => setPending(null)}
        >
          <div className="r-form">
            <p>{titleFor(pending)}</p>
            <ErrorNotice message={error} />
            <button className="r-button" disabled={busy} onClick={remind}>
              {tr("Confirm reminder")}{" "}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
