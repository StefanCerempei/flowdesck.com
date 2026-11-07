import { useEffect, useRef } from "react";
import { X, CarFront, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import "../pages/Rental.css";
export const labels = {
  AVAILABLE: "Operational",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "On rent",
  COMPLETED: "Returned",
  CANCELLED: "Cancelled",
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};
export const Badge = ({ value }) => (
  <span className={"r-badge r-" + value}>{labels[value] || value}</span>
);
export const ErrorNotice = ({ message }) =>
  message ? (
    <div className="r-error" role="alert">
      {message}
    </div>
  ) : null;
export function PageHeader({
  eyebrow = "RENTAL OPERATIONS",
  title,
  description,
  children,
}) {
  return (
    <header className="r-header">
      <div>
        <div className="r-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div>{children}</div>
    </header>
  );
}
export function Empty({ title = "Nothing here yet", description, children }) {
  return (
    <div className="r-empty">
      <CarFront size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export const Loading = () => (
  <div className="r-loading" role="status">
    Loading your workspace…
  </div>
);
export function Modal({ title, onClose, children, busy = false }) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="r-modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) closeRef.current();
      }}
    >
      <div className="r-modal-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="r-icon"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ReservationTable({ items, actions }) {
  return (
    <div className="r-table-wrap">
      <table className="r-table">
        <thead>
          <tr>
            <th>Vehicle / customer</th>
            <th>Rental period</th>
            <th>Status</th>
            <th>Agreed total</th>
            <th>
              <span className="r-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>
                  {r.vehicle.brand} {r.vehicle.model}
                </strong>
                <small>
                  {r.vehicle.licensePlate} · {r.contact.firstName}{" "}
                  {r.contact.lastName}
                </small>
              </td>
              <td>
                {r.startDate}
                <span className="r-date-arrow"> → </span>
                {r.endDate}
                <small>{r.billedDays} calendar days · end exclusive</small>
              </td>
              <td>
                <Badge value={r.status} />
              </td>
              <td>
                <strong>€{r.agreedTotal}</strong>
              </td>
              <td>
                {actions ? (
                  actions(r)
                ) : (
                  <Link
                    className="r-text-link"
                    to={"/reservations?reservationId=" + r.id}
                    aria-label={
                      "Open reservation for " + r.vehicle.licensePlate
                    }
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
