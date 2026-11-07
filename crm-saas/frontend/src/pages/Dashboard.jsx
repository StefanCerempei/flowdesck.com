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
        eyebrow={data?.company || "RENTAL OPERATIONS"}
        title="A clear view of the road ahead."
        description="Your fleet, bookings and daily priorities — together."
      >
        <Link className="r-button" to="/reservations">
          <Plus size={17} /> Manage reservations
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
          Retry
        </button>
      )}
      {loading ? (
        <Loading />
      ) : (
        data &&
        !error && (
          <>
            <section className="r-panel r-form">
              <h2>Fleet Intelligence</h2>
              <p>{data.intelligence.summary.insightsCount} operational alerts · {data.intelligence.summary.highSeverityCount} high priority</p>
              <p>{data.intelligence.insights[0]?.description || "No operational alerts detected."}</p>
              <Link to="/insights">Review Fleet Intelligence</Link>
            </section>
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
                  `${data.valuePeriod.from} → ${data.valuePeriod.to} (exclusive)`,
                ],
                [
                  "Available today",
                  data.stats.availableToday,
                  `${data.availabilityPeriod.startDate} → ${data.availabilityPeriod.endDate} (exclusive)`,
                ],
              ].map(([label, value, note]) => (
                <div className="r-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
            <p className="r-note" style={{ marginBottom: 22 }}>
              Operating day: {data.today} · {data.timezone} · availability
              calculated from stored bookings.{" "}
              {data.stats.overdueReturns > 0
                ? `${data.stats.overdueReturns} return(s) need follow-up.`
                : ""}
            </p>
            <section className="r-panel">
              <div className="r-panel-title">
                <div>
                  <h2>Recent reservations</h2>
                  <p>Real bookings across your fleet</p>
                </div>
                <Link className="r-text-link" to="/reservations">
                  View all <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.recentReservations.length ? (
                <ReservationTable items={data.recentReservations} />
              ) : (
                <Empty
                  title="Ready for your first reservation"
                  description="Add a vehicle and a customer to begin."
                />
              )}
            </section>
            <div className="r-grid">
              <section className="r-panel">
                <div className="r-panel-title">
                  <div>
                    <h2>Upcoming returns</h2>
                    <p>
                      Vehicles currently on rent · earlier dates need follow-up
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
                          <strong>{r.endDate}</strong>
                          <small>
                            {r.endDate <= data.today
                              ? "Return follow-up required"
                              : "Scheduled return"}
                          </small>
                          <Link
                            className="r-text-link"
                            to={"/reservations?reservationId=" + r.id}
                          >
                            Open booking
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty
                    title="No vehicles out"
                    description="Active rentals will appear here."
                  />
                )}
              </section>
              <section className="r-panel">
                <div className="r-panel-title">
                  <div>
                    <h2>Fleet attention</h2>
                    <p>Operational status and insurance within 30 days</p>
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
                              ? " · Insurance: " + v.insuranceExpiration
                              : ""}
                          </small>
                        </div>
                        <Badge value={v.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty
                    title="Nothing flagged"
                    description="Check vehicle records regularly; missing insurance dates are not proof of coverage."
                  />
                )}
              </section>
            </div>
            <section className="r-panel">
              <div className="r-panel-title">
                <div>
                  <h2>Team tasks</h2>
                  <p>Keep the next action close</p>
                </div>
                <small>
                  {data.tasks.filter((t) => t.completed).length}/
                  {data.tasks.length} completed
                </small>
              </div>
              <ErrorNotice message={taskError} />
              <form className="r-task-form" onSubmit={addTask}>
                <input
                  aria-label="New task"
                  placeholder="Add a follow-up, vehicle check or reminder…"
                  required
                  maxLength={191}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <select
                  aria-label="Task priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option>Normal</option>
                  <option>Urgent</option>
                </select>
                <button className="r-button" disabled={busy}>
                  Add task
                </button>
              </form>
              <ul className="r-list">
                {data.tasks.map((t) => (
                  <li key={t.id}>
                    <label
                      className={"r-task-label" + (t.completed ? " done" : "")}
                    >
                      <input
                        aria-label={"Complete " + t.title}
                        type="checkbox"
                        checked={t.completed}
                        disabled={busy}
                        onChange={() => toggle(t.id)}
                      />
                      {t.title}
                    </label>
                    <span className="r-badge">{t.priority}</span>
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
