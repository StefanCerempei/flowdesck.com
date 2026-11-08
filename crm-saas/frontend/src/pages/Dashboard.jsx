import { useLanguage, format, findingDescription, calendarDate } from "../i18n";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, CarFront } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import {
  PageHeader,
  Loading,
  ErrorNotice,
  Empty,
  Badge,
  ReservationTable,
} from "../components/RentalUI";
import "./Dashboard.css";
export default function Dashboard() {
  const { t: tr } = useLanguage();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [task, setTask] = useState(""),
    [priority, setPriority] = useState("Normal"),
    [busy, setBusy] = useState(false),
    [taskError, setTaskError] = useState("");
  async function load() {
    setError("");
    try {
      const { data } = await api.get("/fleet/dashboard");
      setData(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function addTask(e) {
    e.preventDefault();
    setBusy(true);
    setTaskError("");
    try {
      await api.post("/tasks", { title: task, priority });
      setTask("");
      await load();
    } catch (e) {
      setTaskError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(id) {
    setBusy(true);
    setTaskError("");
    const before = data.tasks;
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    }));
    try {
      await api.patch("/tasks/" + id, {});
      await load();
    } catch (e) {
      setData((d) => ({ ...d, tasks: before }));
      setTaskError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="dashboard-main r-page">
      <PageHeader
        eyebrow={data?.company || tr("RENTAL OPERATIONS")}
        title={tr("A clear view of the road ahead.")}
        description={tr(
          "Your fleet, bookings and daily priorities — together.",
        )}
      >
        <Link className="r-button" to="/reservations">
          <Plus size={17} /> {tr("Manage reservations")}{" "}
        </Link>
      </PageHeader>
      <ErrorNotice message={error} />
      {error && (
        <button
          className="r-button secondary"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          {tr("Retry")}{" "}
        </button>
      )}
      {loading ? (
        <Loading />
      ) : (
        data &&
        !error && (
          <>
            <div className="r-stats">
              {[
                [
                  "Total fleet",
                  data.stats.totalVehicles,
                  "All operational statuses",
                ],
                [
                  "Active rentals",
                  data.stats.outNow,
                  "Picked up · including overdue",
                ],
                [
                  "Upcoming bookings",
                  data.stats.upcomingPickups,
                  format(
                    "{0} → {1} (exclusive)",
                    calendarDate(data.valuePeriod.from),
                    calendarDate(data.valuePeriod.to),
                  ),
                ],
                [
                  "Available today",
                  data.stats.availableToday,
                  format(
                    "{0} → {1} (exclusive)",
                    calendarDate(data.availabilityPeriod.startDate),
                    calendarDate(data.availabilityPeriod.endDate),
                  ),
                ],
              ].map(([label, value, note]) => (
                <div className="r-stat" key={label}>
                  <span>{tr(label)}</span>
                  <strong>{value}</strong>
                  <small>{tr(note)}</small>
                </div>
              ))}
            </div>
            <p className="r-note" style={{ marginBottom: 22 }}>
              {tr("Operating day:")} {calendarDate(data.today)} ·{" "}
              {data.timezone}{" "}
              {tr("· availability calculated from stored bookings.")}{" "}
              {data.stats.overdueReturns > 0
                ? format(
                    "{0} return(s) need follow-up.",
                    data.stats.overdueReturns,
                  )
                : ""}
            </p>
            <section className="r-panel r-form">
              <h2>{tr("Fleet Intelligence")}</h2>
              <p>
                {data.intelligence.summary.insightsCount}{" "}
                {tr("operational alerts ·")}{" "}
                {data.intelligence.summary.highSeverityCount}{" "}
                {tr("high priority")}
              </p>
              <p>
                {data.intelligence.insights[0]
                  ? findingDescription(data.intelligence.insights[0])
                  : tr("No operational alerts detected.")}
              </p>
              <Link to="/insights">{tr("Review Fleet Intelligence")}</Link>
            </section>
            <section className="r-panel">
              <div className="r-panel-title">
                <div>
                  <h2>{tr("Recent reservations")}</h2>
                  <p>{tr("Real bookings across your fleet")}</p>
                </div>
                <Link className="r-text-link" to="/reservations">
                  {tr("View all")} <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.recentReservations.length ? (
                <ReservationTable items={data.recentReservations} />
              ) : (
                <Empty
                  title={tr("Ready for your first reservation")}
                  description={tr("Add a vehicle and a customer to begin.")}
                />
              )}
            </section>
            <div className="r-grid">
              <section className="r-panel">
                <div className="r-panel-title">
                  <div>
                    <h2>{tr("Upcoming returns")}</h2>
                    <p>
                      {tr(
                        "Vehicles currently on rent · earlier dates need follow-up",
                      )}{" "}
                    </p>
                  </div>
                </div>
                {data.returns.length ? (
                  <ul className="r-list">
                    {data.returns.map((r) => (
                      <li key={r.id}>
                        <div>
                          <strong>
                            {r.vehicle.brand} {r.vehicle.model}
                          </strong>
                          <small>
                            {r.vehicle.licensePlate} · {r.contact.firstName}{" "}
                            {r.contact.lastName}
                          </small>
                        </div>
                        <div>
                          <strong>{calendarDate(r.endDate)}</strong>
                          <small>
                            {r.endDate <= data.today
                              ? tr("Return follow-up required")
                              : tr("Scheduled return")}
                          </small>
                          <Link
                            className="r-text-link"
                            to={"/reservations?reservationId=" + r.id}
                          >
                            {tr("Open booking")}{" "}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty
                    title={tr("No vehicles out")}
                    description={tr("Active rentals will appear here.")}
                  />
                )}
              </section>
              <section className="r-panel">
                <div className="r-panel-title">
                  <div>
                    <h2>{tr("Fleet attention")}</h2>
                    <p>
                      {tr("Operational status and insurance within 30 days")}
                    </p>
                  </div>
                  <CarFront size={20} />
                </div>
                {data.attention.length ? (
                  <ul className="r-list">
                    {data.attention.map((v) => (
                      <li key={v.id}>
                        <div>
                          <Link
                            className="r-text-link"
                            to={"/vehicles?vehicleId=" + v.id}
                          >
                            {v.brand} {v.model}
                          </Link>
                          <small>
                            {v.licensePlate}
                            {v.insuranceExpiration
                              ? tr(" · Insurance: ") +
                                calendarDate(v.insuranceExpiration)
                              : ""}
                          </small>
                        </div>
                        <Badge value={v.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty
                    title={tr("Nothing flagged")}
                    description={tr(
                      "Check vehicle records regularly; missing insurance dates are not proof of coverage.",
                    )}
                  />
                )}
              </section>
            </div>
            <section className="r-panel">
              <div className="r-panel-title">
                <div>
                  <h2>{tr("Team tasks")}</h2>
                  <p>{tr("Keep the next action close")}</p>
                </div>
                <small>
                  {data.tasks.filter((t) => t.completed).length}/
                  {data.tasks.length} {tr("completed")}{" "}
                </small>
              </div>
              <ErrorNotice message={taskError} />
              <form className="r-task-form" onSubmit={addTask}>
                <input
                  aria-label={tr("New task")}
                  placeholder={tr(
                    "Add a follow-up, vehicle check or reminder…",
                  )}
                  required
                  maxLength={191}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <select
                  aria-label={tr("Task priority")}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Normal">{tr("Normal")}</option>
                  <option value="Urgent">{tr("Urgent")}</option>
                </select>
                <button className="r-button" disabled={busy}>
                  {tr("Add task")}{" "}
                </button>
              </form>
              <ul className="r-list">
                {data.tasks.map((t) => (
                  <li key={t.id}>
                    <label
                      className={"r-task-label" + (t.completed ? " done" : "")}
                    >
                      <input
                        aria-label={tr("Complete ") + t.title}
                        type="checkbox"
                        checked={t.completed}
                        disabled={busy}
                        onChange={() => toggle(t.id)}
                      />
                      {t.title}
                    </label>
                    <span className="r-badge">{tr(t.priority)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )
      )}
    </main>
  );
}
