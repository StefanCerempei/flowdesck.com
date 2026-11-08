import { Link } from "react-router-dom";
import {
  CalendarDays,
  CarFront,
  ClipboardCheck,
  ArrowUpRight,
  ShieldCheck,
  Gauge,
  MessageSquareText,
  Receipt,
} from "lucide-react";
import PublicHeader from "../components/PublicHeader";
import { useLanguage } from "../i18n";
const features = [
  [
    CalendarDays,
    "Reservations and pricing",
    "Review available vehicles and server-calculated prices. Your team confirms each booking.",
  ],
  [
    Receipt,
    "Customer invoices",
    "Issue customer invoices and track recorded payment statuses alongside rental operations.",
  ],
  [
    CarFront,
    "Fleet and availability",
    "Keep vehicle details, daily rates and insurance dates together. Check availability for the requested rental period.",
  ],
  [
    MessageSquareText,
    "Booking Copilot",
    "Turn Romanian and English inquiries into editable requests and customer replies. Your team confirms each reservation.",
  ],
  [
    Gauge,
    "Fleet Intelligence",
    "Follow up on overdue returns, spot low scheduled utilization and turn insurance alerts into reminders.",
  ],
  [
    ClipboardCheck,
    "Customers and tasks",
    "Keep contact details, rental activity and daily follow-ups together.",
  ],
];
export default function Landing() {
  const { t } = useLanguage();
  return (
    <div className="public">
      <PublicHeader />
      <main>
        <section className="hero">
          <div>
            <p className="r-eyebrow">{t("AI-POWERED RENTAL OPERATIONS")}</p>
            <h1>{t("Run your rental business smarter.")}</h1>
            <p>
              {t(
                "Flowdesck brings your fleet, reservations, customers and operational insights into one AI-assisted workspace. Built for modern car rental teams.",
              )}
            </p>
            <div className="hero-actions">
              <Link className="r-button" to="/demo">
                {t("Explore Live Demo")} <ArrowUpRight size={18} />
              </Link>
              <Link className="r-button secondary" to="/register">
                {t("Create Workspace")}
              </Link>
            </div>
            <p className="hero-demo-note">
              {t(
                "Explore fictional company data in an interactive, read-only demo. Guest AI workflows use manual and rule-based analysis.",
              )}
            </p>
          </div>
          <aside className="workflow">
            <h2>{t("From inquiry to fleet follow-up")}</h2>
            {[
              [
                MessageSquareText,
                "Review the inquiry",
                "Extract dates and vehicle preferences.",
              ],
              [
                CalendarDays,
                "Check the fleet",
                "Compare available cars and verified prices.",
              ],
              [
                ShieldCheck,
                "Confirm the booking",
                "Review the customer, vehicle and agreed total.",
              ],
              [
                Gauge,
                "Fleet follow-up",
                "Review overdue returns, utilization and insurance reminders.",
              ],
            ].map(([Icon, title, body]) => (
              <div key={title}>
                <Icon />
                <section>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </section>
              </div>
            ))}
          </aside>
        </section>
        <header className="features-heading">
          <h2>{t("Flowdesck — Your AI-powered rental business assistant.")}</h2>
          <p>{t("The B2B SaaS workspace for car rental teams.")}</p>
          <p>
            {t(
              "Manage your fleet, streamline bookings and make smarter operational decisions — all from one workspace.",
            )}
          </p>
        </header>
        <section className="feature-grid">
          {features.map(([Icon, title, body]) => (
            <article key={title}>
              <Icon />
              <h2>{t(title)}</h2>
              <p>{t(body)}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
