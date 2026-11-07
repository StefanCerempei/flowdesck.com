import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import {
  api,
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
      if (!signal?.aborted) setItems(rows);
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
  }, [filter, vehicleId, reservationId]);
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
          throw new Error("Check the new price and confirm before saving.");
        await api.patch("/reservations/" + editing.id, {
          startDate: start,
          endDate: end,
          agreedTotal: offer.total,
          expectedUpdatedAt: editing.updatedAt,
        });
      } else {
        const offer = offers?.items.find((x) => x.vehicle.id === selected);
        if (!offer || !confirmed)
          throw new Error("Choose a verified offer and confirm.");
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
        title="Every booking, in order."
        description="Real availability. Clear prices. No overlapping reservations."
      >
        {manage && (
          <button className="r-button" onClick={create}>
            <Plus size={17} /> New reservation
          </button>
        )}
      </PageHeader>
      <p className="r-note">
        Calendar days · Europe/Bucharest · start included, end excluded. A 10–12
        rental is billed for 2 days.
      </p>
      {!manage && (
        <p className="r-readonly">
          Read-only access. An administrator can manage reservations.
        </p>
      )}
      <ErrorNotice message={error} />
      <section className="r-panel" style={{ marginTop: 20 }}>
        <div className="r-panel-title">
          <div>
            <h2>Reservations</h2>
            <p>
              {loading ? "Fetching bookings…" : `${items.length} reservations`}
            </p>
          </div>
          {(vehicleId || reservationId) && (
            <button className="r-text-link" onClick={() => setParams({})}>
              Clear selected record
            </button>
          )}
        </div>
        <form
          className="r-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            if ((from && !to) || (!from && to)) {
              setError("Choose both rental-period dates.");
              return;
            }
            setFilter({
              ...(status ? { status } : {}),
              ...(from ? { from, to } : {}),
            });
          }}
        >
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((x) => (
                <option value={x} key={x}>
                  {labels[x]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Period start
            <input
              aria-label="Filter period start"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Period end (exclusive)
            <input
              aria-label="Filter period end"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="r-button secondary">
            <Search size={15} /> Apply filters
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
            Reset
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
                        Edit dates
                      </button>
                      <button
                        className="r-text-link"
                        onClick={() => {
                          setAction({ reservation: r, status: "IN_PROGRESS" });
                          setActionError("");
                        }}
                      >
                        Start rental
                      </button>
                      <button
                        className="r-text-link"
                        onClick={() => {
                          setAction({ reservation: r, status: "CANCELLED" });
                          setActionError("");
                        }}
                      >
                        Cancel
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
                      Confirm return
                    </button>
                  )}
                  <Link
                    className="r-text-link"
                    aria-label={"Vehicle " + r.vehicle.licensePlate}
                    to={"/vehicles?vehicleId=" + r.vehicleId}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
            />
          ) : (
            <Empty
              title="No reservations to show"
              description="Create a booking or adjust the current filters."
            />
          ))
        )}
      </section>
      {open && (
        <Modal
          title={editing ? "Change rental dates" : "Create a reservation"}
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
                Customer
                <select
                  aria-label="Customer"
                  required
                  value={contactId}
                  onChange={(e) => {
                    setContactId(e.target.value);
                    setConfirmed(false);
                  }}
                  disabled={busy}
                >
                  <option value="">Select an existing customer</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.phone ? " · " + c.phone : ""}
                    </option>
                  ))}
                </select>
                {!contacts.length && (
                  <small>
                    No customers?{" "}
                    <Link to="/contacts">Add a customer first.</Link>
                  </small>
                )}
              </label>
            )}
            <div className="r-form-grid">
              <label>
                Rental start
                <input
                  aria-label="Rental start"
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
                Rental end (exclusive)
                <input
                  aria-label="Rental end (exclusive)"
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
              EUR · Europe/Bucharest calendar dates. Availability is checked
              again when you save.
            </p>
            {editing && (
              <p className="r-note">
                Vehicle remains {editing.vehicle.brand} {editing.vehicle.model}{" "}
                ({editing.vehicle.licensePlate}). The server recalculates the
                total at the current daily rate. Cancel and recreate to change
                the vehicle.
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
                {busy ? "Checking…" : "Check available vehicles"}
              </button>
              {offers && (
                <>
                  <p className="r-note">
                    {offers.items.length} available vehicles ·{" "}
                    {offers.billedDays} calendar days · checked{" "}
                    {new Date(offers.checkedAt).toLocaleTimeString()}
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
                            {x.vehicle.licensePlate} · {x.vehicle.transmission}{" "}
                            · €{x.vehicle.dailyRate}/day
                          </small>
                        </span>
                        <strong>€{x.total}</strong>
                      </label>
                    ))}
                  </div>
                  {!offers.items.length && (
                    <p className="r-note">
                      No matching vehicles. Try another period or review overdue
                      returns.
                    </p>
                  )}
                </>
              )}
              {offer && (
                <>
                  <div className="r-price">
                    <span>
                      €{offer.vehicle.dailyRate} × {offers.billedDays} days
                      <br />
                      Agreed booking total
                    </span>
                    <strong>€{offer.total}</strong>
                  </div>
                  <label style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I reviewed the customer, dates, vehicle and price.
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
                Close
              </button>
              <button
                className="r-button"
                disabled={busy || !offer || !contactId || !confirmed}
              >
                {busy
                  ? "Saving…"
                  : editing
                    ? "Review & save changes"
                    : "Confirm reservation"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {action && (
        <Modal
          title={
            action.status === "CANCELLED"
              ? "Cancel reservation?"
              : action.status === "COMPLETED"
                ? "Confirm vehicle returned?"
                : "Start this rental?"
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
                ? "Only confirm when the vehicle is physically returned. This releases availability."
                : action.status === "CANCELLED"
                  ? "Cancellation preserves the booking history and releases availability."
                  : "Confirm pickup with the customer. The server checks the vehicle again."}
            </p>
            <div className="r-form-footer">
              <button
                className="r-button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Go back
              </button>
              <button
                className="r-button"
                disabled={busy}
                onClick={changeStatus}
              >
                {busy
                  ? "Saving…"
                  : "Confirm " + labels[action.status].toLowerCase()}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
