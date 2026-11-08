import { useLanguage, calendarDate } from "../../i18n";
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Pencil, ArrowUpRight, CarFront } from "lucide-react";
import { euros, api, allPages, errorMessage, canManage } from "../../lib/api";
import {
  Badge,
  PageHeader,
  Empty,
  Loading,
  ErrorNotice,
  Modal,
  ReservationTable,
} from "../../components/RentalUI";
const initial = {
  brand: "",
  model: "",
  licensePlate: "",
  category: "COMPACT",
  transmission: "MANUAL",
  dailyRate: "",
  status: "AVAILABLE",
  insuranceExpiration: "",
};
export default function Vehicles() {
  const { t: tr } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]),
    [summary, setSummary] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null),
    [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [detail, setDetail] = useState(null),
    [history, setHistory] = useState([]),
    [detailError, setDetailError] = useState(""),
    [detailLoading, setDetailLoading] = useState(false);
  const manage = canManage();
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [items, { data }] = await Promise.all([
        allPages("/vehicles"),
        api.get("/vehicles", { params: { limit: 1 } }),
      ]);
      setRows(items);
      setSummary(data.summary);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const detailId = params.get("vehicleId");
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    Promise.all([
      api.get("/vehicles/" + detailId),
      allPages("/reservations", { vehicleId: detailId }),
    ])
      .then(([{ data }, rs]) => {
        if (active) {
          setDetail(data);
          setHistory(rs);
        }
      })
      .catch((e) => {
        if (active) setDetailError(errorMessage(e));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detailId]);
  function open(v) {
    setEditing(v?.id || "new");
    setForm(
      v
        ? {
            ...initial,
            ...Object.fromEntries(
              Object.keys(initial).map((k) => [k, v[k] ?? ""]),
            ),
          }
        : initial,
    );
    setFormError("");
  }
  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        insuranceExpiration: form.insuranceExpiration || null,
      };
      if (editing === "new") await api.post("/vehicles", payload);
      else await api.patch("/vehicles/" + editing, payload);
      setEditing(null);
      if (detailId) setParams({});
      await load();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (v) =>
      (!status || v.status === status) &&
      ([v.brand, v.model].some((x) =>
        x.toLowerCase().includes(search.toLowerCase().trim()),
      ) ||
        v.licensePlate
          .toLowerCase()
          .includes(search.toLowerCase().replace(/[\s-]/g, ""))),
  );
  return (
    <main className="dashboard-main r-page">
      <PageHeader
        title={tr("Your fleet, in focus.")}
        description={tr("Manage the vehicles that move your business forward.")}
      >
        {manage && (
          <button className="r-button" onClick={() => open(null)}>
            <Plus size={17} /> {tr("Add vehicle")}{" "}
          </button>
        )}
      </PageHeader>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            <div className="r-stats">
              {[
                ["Total fleet", summary?.total],
                ["Operational", summary?.AVAILABLE],
                ["In maintenance", summary?.MAINTENANCE],
                ["Inactive", summary?.INACTIVE],
              ].map(([label, value]) => (
                <div className="r-stat" key={label}>
                  <span>{tr(label)}</span>
                  <strong>{value}</strong>
                  <small>
                    {tr("Operational status · not date availability")}
                  </small>
                </div>
              ))}
            </div>
            {!manage && (
              <p className="r-readonly">
                {tr(
                  "Read-only access. An administrator can manage vehicles.",
                )}{" "}
              </p>
            )}
            <section className="r-panel">
              <div className="r-panel-title">
                <div>
                  <h2>{tr("Fleet directory")}</h2>
                  <p>
                    {filtered.length} {tr("vehicles · EUR daily rates")}
                  </p>
                </div>
                <CarFront size={22} color="#568270" />
              </div>
              <div className="r-toolbar">
                <label>
                  {tr("Search fleet")}{" "}
                  <input
                    type="search"
                    aria-label={tr("Search fleet")}
                    placeholder={tr("Brand, model or plate…")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  {tr("Operational status")}{" "}
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">{tr("All statuses")}</option>
                    <option value="AVAILABLE">{tr("Operational")}</option>
                    <option value="MAINTENANCE">{tr("MAINTENANCE")}</option>
                    <option value="INACTIVE">{tr("INACTIVE")}</option>
                  </select>
                </label>
              </div>
              {filtered.length ? (
                <div className="r-table-wrap">
                  <table className="r-table">
                    <thead>
                      <tr>
                        <th>{tr("Vehicle")}</th>
                        <th>{tr("Category")}</th>
                        <th>{tr("Transmission")}</th>
                        <th>{tr("Daily rate")}</th>
                        <th>{tr("Status")}</th>
                        <th>{tr("Manage")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <strong>
                              {v.brand} {v.model}
                            </strong>
                            <small>{v.licensePlate}</small>
                          </td>
                          <td>{tr(v.category)}</td>
                          <td>
                            {v.transmission === "AUTOMATIC"
                              ? tr("Automatic")
                              : tr("Manual")}
                          </td>
                          <td>
                            <strong>{euros(v.dailyRate)}</strong>
                            <small>{tr("per calendar day")}</small>
                          </td>
                          <td>
                            <Badge value={v.status} />
                          </td>
                          <td>
                            <div className="r-actions">
                              <button
                                className="r-text-link"
                                aria-label={tr("View ") + v.licensePlate}
                                onClick={() => setParams({ vehicleId: v.id })}
                              >
                                {tr("Details")} <ArrowUpRight size={15} />
                              </button>
                              {manage && (
                                <button
                                  className="r-icon"
                                  aria-label={tr("Edit ") + v.licensePlate}
                                  onClick={() => open(v)}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title={
                    rows.length
                      ? tr("No matching vehicles")
                      : tr("Build your fleet")
                  }
                  description={
                    rows.length
                      ? tr("Try another search or status.")
                      : tr(
                          "Add your first vehicle to start accepting reservations.",
                        )
                  }
                />
              )}
            </section>
          </>
        )
      )}
      {editing && (
        <Modal
          title={editing === "new" ? tr("Add a vehicle") : tr("Edit vehicle")}
          onClose={() => setEditing(null)}
          busy={busy}
        >
          <form className="r-form" onSubmit={save}>
            <ErrorNotice message={formError} />
            <div className="r-form-grid">
              {[
                ["brand", "Brand"],
                ["model", "Model"],
                ["licensePlate", "License plate"],
              ].map(([name, label]) => (
                <label key={name}>
                  {tr(label)}
                  <input
                    name={name}
                    required
                    maxLength={name === "licensePlate" ? 32 : 80}
                    value={form[name]}
                    onChange={change}
                  />
                </label>
              ))}
              <label>
                {tr("Category")}{" "}
                <select name="category" value={form.category} onChange={change}>
                  {["ECONOMY", "COMPACT", "SUV", "VAN"].map((x) => (
                    <option key={x} value={x}>
                      {tr(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {tr("Transmission")}{" "}
                <select
                  name="transmission"
                  value={form.transmission}
                  onChange={change}
                >
                  <option value="MANUAL">{tr("MANUAL")}</option>
                  <option value="AUTOMATIC">{tr("AUTOMATIC")}</option>
                </select>
              </label>
              <label>
                {tr("Daily rate · EUR")}{" "}
                <input
                  name="dailyRate"
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  required
                  value={form.dailyRate}
                  onChange={change}
                />
              </label>
              <label>
                {tr("Operational status")}{" "}
                <select name="status" value={form.status} onChange={change}>
                  {["AVAILABLE", "MAINTENANCE", "INACTIVE"].map((x) => (
                    <option key={x} value={x}>
                      {tr(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {tr("Insurance expires (optional)")}{" "}
                <input
                  name="insuranceExpiration"
                  type="date"
                  value={form.insuranceExpiration}
                  onChange={change}
                />
              </label>
            </div>
            <p className="r-note">
              {tr(
                "Operational vehicles may already be reserved. Use Reservations to check an actual date range. Keep historical vehicles by marking them inactive.",
              )}{" "}
            </p>
            <div className="r-form-footer">
              <button
                type="button"
                className="r-button secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                {tr("Cancel")}{" "}
              </button>
              <button className="r-button" disabled={busy}>
                {busy ? tr("Saving…") : tr("Save vehicle")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {detailId && (
        <Modal title={tr("Vehicle details")} onClose={() => setParams({})}>
          {detailLoading ? (
            <Loading />
          ) : (
            <>
              <ErrorNotice message={detailError} />
              {detail && (
                <div className="r-detail">
                  <h2>
                    {detail.brand} {detail.model}
                  </h2>
                  <Badge value={detail.status} />
                  <dl>
                    {[
                      ["License plate", detail.licensePlate],
                      ["Daily rate", euros(detail.dailyRate)],
                      ["Category", tr(detail.category)],
                      ["Transmission", tr(detail.transmission)],
                      [
                        "Insurance expiration",
                        calendarDate(detail.insuranceExpiration) ||
                          tr("Not recorded"),
                      ],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{tr(k)}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3>{tr("Reservation history")}</h3>
                  {history.length ? (
                    <ReservationTable items={history} />
                  ) : (
                    <p className="r-note">{tr("No reservations yet.")}</p>
                  )}
                  <Link
                    className="r-text-link"
                    to={"/reservations?vehicleId=" + detail.id}
                  >
                    {tr("Open reservations")} <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
