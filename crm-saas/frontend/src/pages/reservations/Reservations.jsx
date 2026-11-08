import { useLanguage, format, currentLocale } from "../../i18n";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import {
  api,
  euros,
  allPages,
  errorMessage,
  canManage,
  operatingToday,
  nextDay,
} from "../../lib/api";
import {
  PageHeader,
  Empty,
  Loading,
  ErrorNotice,
  Modal,
  ReservationTable,
  labels,
} from "../../components/RentalUI";
const statuses = ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export default function Reservations() {
  const { t: tr } = useLanguage();
  const [params, setParams] = useSearchParams(),
    manage = canManage();
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filter, setFilter] = useState({});
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [contacts, setContacts] = useState([]),
    [contactId, setContactId] = useState(""),
    [start, setStart] = useState(operatingToday()),
    [end, setEnd] = useState(nextDay(operatingToday())),
    [offers, setOffers] = useState(null),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [action, setAction] = useState(null),
    [actionError, setActionError] = useState("");
  const generation = useRef(0);
  const customerFilter = params.get("contactId");
  const vehicleId = params.get("vehicleId"),
    reservationId = params.get("reservationId");
  async function load(signal) {
    setLoading(true);
    setError("");
    try {
      const rows = await allPages(
        "/reservations",
        {
          ...filter,
          ...(vehicleId ? { vehicleId } : {}),
          ...(reservationId ? { reservationId } : {}),
        },
        signal,
      );
      if (!signal?.aborted)
        setItems(
          customerFilter
            ? rows.filter((row) => row.contactId === customerFilter)
            : rows,
        );
    } catch (e) {
      if (!signal?.aborted) setError(errorMessage(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [filter, vehicleId, reservationId, customerFilter]);
  function resetOffers() {
    generation.current++;
    setOffers(null);
    setSelected("");
    setConfirmed(false);
  }
  async function create() {
    setOpen(true);
    setEditing(null);
    setFormError("");
    setContactId("");
    setStart(operatingToday());
    setEnd(nextDay(operatingToday()));
    resetOffers();
    setBusy(true);
    try {
      const { data } = await api.get("/contacts");
      setContacts(data);
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(r) {
    setEditing(r);
    setOpen(true);
    setStart(r.startDate);
    setEnd(r.endDate);
    setContactId(r.contactId);
    setFormError("");
    resetOffers();
  }
  async function check() {
    setBusy(true);
    setFormError("");
    setOffers(null);
    setSelected("");
    setConfirmed(false);
    const request = ++generation.current;
    try {
      const { data } = await api.get("/reservations/availability", {
        params: {
          startDate: start,
          endDate: end,
          ...(editing ? { reservationId: editing.id } : {}),
        },
      });
      if (request === generation.current) {
        setOffers(data);
        if (editing) setSelected(editing.vehicleId);
      }
    } catch (e) {
      if (request === generation.current) setFormError(errorMessage(e));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  // Date edits are checked authoritatively in the locked update; the existing booking can exclude itself there.
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (editing) {
        const offer = offers?.items.find((x) => x.vehicle.id === selected);
        if (!offer || !confirmed)
          throw new Error(tr("Check the new price and confirm before saving."));
        await api.patch("/reservations/" + editing.id, {
          startDate: start,
          endDate: end,
          agreedTotal: offer.total,
          expectedUpdatedAt: editing.updatedAt,
        });
      } else {
        const offer = offers?.items.find((x) => x.vehicle.id === selected);
        if (!offer || !confirmed)
          throw new Error(tr("Choose a verified offer and confirm."));
        await api.post("/reservations", {
          vehicleId: selected,
          contactId,
          startDate: start,
          endDate: end,
          agreedTotal: offer.total,
          confirmed: true,
        });
      }
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e.response ? errorMessage(e) : e.message || errorMessage(e));
      if (e.response?.status === 409) {
        resetOffers();
      }
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus() {
    setBusy(true);
    setActionError("");
    try {
      await api.patch("/reservations/" + action.reservation.id + "/status", {
        status: action.status,
        expectedUpdatedAt: action.reservation.updatedAt,
      });
      setAction(null);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const offer = offers?.items.find((x) => x.vehicle.id === selected);
  return (
    <main className="dashboard-main r-page">
      <PageHeader
        title={tr("Every booking, in order.")}
        description={tr(
          "Real availability. Clear prices. No overlapping reservations.",
        )}
      >
        {manage && (
          <button className="r-button" onClick={create}>
            <Plus size={17} /> {tr("New reservation")}{" "}
          </button>
        )}
      </PageHeader>
      <p className="r-note">
        {tr(
          "Calendar days · Europe/Bucharest · start included, end excluded. A 10–12 rental is billed for 2 days.",
        )}{" "}
      </p>
      {!manage && (
        <p className="r-readonly">
          {tr(
            "Read-only access. An administrator can manage reservations.",
          )}{" "}
        </p>
      )}
      <ErrorNotice message={error} />
      <section className="r-panel" style={{ marginTop: 20 }}>
        <div className="r-panel-title">
          <div>
            <h2>{tr("Reservations")}</h2>
            <p>
              {loading
                ? tr("Fetching bookings…")
                : format("{0} reservations", items.length)}
            </p>
          </div>
          {(vehicleId || reservationId || customerFilter) && (
            <button className="r-text-link" onClick={() => setParams({})}>
              {tr("Clear selected record")}{" "}
            </button>
          )}
        </div>
        <form
          className="r-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            if ((from && !to) || (!from && to)) {
              setError(tr("Choose both rental-period dates."));
              return;
            }
            setFilter({
              ...(status ? { status } : {}),
              ...(from ? { from, to } : {}),
            });
          }}
        >
          <label>
            {tr("Status")}{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{tr("All statuses")}</option>
              {statuses.map((x) => (
                <option value={x} key={x}>
                  {tr(labels[x])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("Period start")}{" "}
            <input
              aria-label={tr("Filter period start")}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {tr("Period end (exclusive)")}{" "}
            <input
              aria-label={tr("Filter period end")}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="r-button secondary">
            <Search size={15} /> {tr("Apply filters")}{" "}
          </button>
          <button
            type="button"
            className="r-text-link"
            onClick={() => {
              setFrom("");
              setTo("");
              setStatus("");
              setFilter({});
            }}
          >
            {tr("Reset")}{" "}
          </button>
        </form>
        {loading ? (
          <Loading />
        ) : (
          !error &&
          (items.length ? (
            <ReservationTable
              items={items}
              actions={(r) => (
                <div className="r-actions">
                  {manage && r.status === "CONFIRMED" && (
                    <>
                      <button className="r-text-link" onClick={() => edit(r)}>
                        {tr("Edit dates")}{" "}
                      </button>
                      <button
                        className="r-text-link"
                        onClick={() => {
                          setAction({ reservation: r, status: "IN_PROGRESS" });
                          setActionError("");
                        }}
                      >
                        {tr("Start rental")}{" "}
                      </button>
                      <button
                        className="r-text-link"
                        onClick={() => {
                          setAction({ reservation: r, status: "CANCELLED" });
                          setActionError("");
                        }}
                      >
                        {tr("Cancel")}{" "}
                      </button>
                    </>
                  )}
                  {manage && r.status === "IN_PROGRESS" && (
                    <button
                      className="r-text-link"
                      onClick={() => {
                        setAction({ reservation: r, status: "COMPLETED" });
                        setActionError("");
                      }}
                    >
                      {tr("Confirm return")}{" "}
                    </button>
                  )}
                  <Link
                    className="r-text-link"
                    aria-label={tr("Vehicle ") + r.vehicle.licensePlate}
                    to={"/vehicles?vehicleId=" + r.vehicleId}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
            />
          ) : (
            <Empty
              title={tr("No reservations to show")}
              description={tr(
                "Create a booking or adjust the current filters.",
              )}
            />
          ))
        )}
      </section>
      {open && (
        <Modal
          title={
            editing ? tr("Change rental dates") : tr("Create a reservation")
          }
          busy={busy}
          onClose={() => {
            generation.current++;
            setOpen(false);
          }}
        >
          <form className="r-form" onSubmit={save}>
            <ErrorNotice message={formError} />
            {!editing && (
              <label>
                {tr("Customer")}{" "}
                <select
                  aria-label={tr("Customer")}
                  required
                  value={contactId}
                  onChange={(e) => {
                    setContactId(e.target.value);
                    setConfirmed(false);
                  }}
                  disabled={busy}
                >
                  <option value="">{tr("Select an existing customer")}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.phone ? " · " + c.phone : ""}
                    </option>
                  ))}
                </select>
                {!contacts.length && (
                  <small>
                    {tr("No customers?")}{" "}
                    <Link to="/contacts">{tr("Add a customer first.")}</Link>
                  </small>
                )}
              </label>
            )}
            <div className="r-form-grid">
              <label>
                {tr("Rental start")}{" "}
                <input
                  aria-label={tr("Rental start")}
                  type="date"
                  required
                  min={editing ? undefined : operatingToday()}
                  value={start}
                  disabled={busy}
                  onChange={(e) => {
                    setStart(e.target.value);
                    resetOffers();
                  }}
                />
              </label>
              <label>
                {tr("Rental end (exclusive)")}{" "}
                <input
                  aria-label={tr("Rental end (exclusive)")}
                  type="date"
                  required
                  min={start ? nextDay(start) : undefined}
                  value={end}
                  disabled={busy}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    resetOffers();
                  }}
                />
              </label>
            </div>
            <p className="r-note">
              {tr(
                "EUR · Europe/Bucharest calendar dates. Availability is checked again when you save.",
              )}{" "}
            </p>
            {editing && (
              <p className="r-note">
                {tr("Vehicle remains")} {editing.vehicle.brand}{" "}
                {editing.vehicle.model} ({editing.vehicle.licensePlate}
                {tr(
                  "). The server recalculates the total at the current daily rate. Cancel and recreate to change the vehicle.",
                )}{" "}
              </p>
            )}
            <>
              <button
                type="button"
                className="r-button secondary"
                disabled={busy || !start || !end}
                onClick={check}
              >
                <Search size={16} />
                {busy ? tr("Checking…") : tr("Check available vehicles")}
              </button>
              {offers && (
                <>
                  <p className="r-note">
                    {offers.items.length} {tr("available vehicles ·")}{" "}
                    {offers.billedDays} {tr("calendar days · checked")}{" "}
                    {new Date(offers.checkedAt).toLocaleTimeString(
                      currentLocale(),
                    )}
                  </p>
                  <div className="r-offers">
                    {offers.items.map((x) => (
                      <label className="r-offer" key={x.vehicle.id}>
                        <input
                          type="radio"
                          name="vehicle"
                          value={x.vehicle.id}
                          checked={selected === x.vehicle.id}
                          onChange={() => {
                            setSelected(x.vehicle.id);
                            setConfirmed(false);
                          }}
                        />
                        <span>
                          {x.vehicle.brand} {x.vehicle.model}
                          <small>
                            {x.vehicle.licensePlate} ·{" "}
                            {tr(x.vehicle.transmission)} ·{" "}
                            {euros(x.vehicle.dailyRate)}
                            {tr("/day")}{" "}
                          </small>
                        </span>
                        <strong>{euros(x.total)}</strong>
                      </label>
                    ))}
                  </div>
                  {!offers.items.length && (
                    <p className="r-note">
                      {tr(
                        "No matching vehicles. Try another period or review overdue returns.",
                      )}{" "}
                    </p>
                  )}
                </>
              )}
              {offer && (
                <>
                  <div className="r-price">
                    <span>
                      {euros(offer.vehicle.dailyRate)} × {offers.billedDays}{" "}
                      {tr("days")} <br />
                      {tr("Agreed booking total")}{" "}
                    </span>
                    <strong>{euros(offer.total)}</strong>
                  </div>
                  <label style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    {tr(
                      "I reviewed the customer, dates, vehicle and price.",
                    )}{" "}
                  </label>
                </>
              )}
            </>
            <div className="r-form-footer">
              <button
                type="button"
                disabled={busy}
                className="r-button secondary"
                onClick={() => setOpen(false)}
              >
                {tr("Close")}{" "}
              </button>
              <button
                className="r-button"
                disabled={busy || !offer || !contactId || !confirmed}
              >
                {busy
                  ? tr("Saving…")
                  : editing
                    ? tr("Review & save changes")
                    : tr("Confirm reservation")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {action && (
        <Modal
          title={
            action.status === "CANCELLED"
              ? tr("Cancel reservation?")
              : action.status === "COMPLETED"
                ? tr("Confirm vehicle returned?")
                : tr("Start this rental?")
          }
          busy={busy}
          onClose={() => setAction(null)}
        >
          <div className="r-form">
            <ErrorNotice message={actionError} />
            <p>
              {action.reservation.vehicle.brand}{" "}
              {action.reservation.vehicle.model} ·{" "}
              {action.reservation.contact.firstName}{" "}
              {action.reservation.contact.lastName}
            </p>
            <p className="r-note">
              {action.status === "COMPLETED"
                ? tr(
                    "Only confirm when the vehicle is physically returned. This releases availability.",
                  )
                : action.status === "CANCELLED"
                  ? tr(
                      "Cancellation preserves the booking history and releases availability.",
                    )
                  : tr(
                      "Confirm pickup with the customer. The server checks the vehicle again.",
                    )}
            </p>
            <div className="r-form-footer">
              <button
                className="r-button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                {tr("Go back")}{" "}
              </button>
              <button
                className="r-button"
                disabled={busy}
                onClick={changeStatus}
              >
                {busy
                  ? tr("Saving…")
                  : tr("Confirm " + labels[action.status].toLowerCase())}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
