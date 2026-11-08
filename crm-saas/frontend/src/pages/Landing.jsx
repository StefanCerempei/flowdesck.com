import { Link } from "react-router-dom";
import {
  CalendarDays,
  CarFront,
  ClipboardCheck,
  ArrowUpRight,
  ShieldCheck,
  Gauge,
  MessageSquareText,
} from "lucide-react";
import PublicHeader from "../components/PublicHeader";
import { useLanguage } from "../i18n";
const features = [
  [
    CarFront,
    "Fleet and reservations",
    "Check availability, calculate rental prices and confirm bookings against the current fleet.",
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
            <p className="r-eyebrow">{t("RENTAL OPERATIONS")}</p>
            <h1>
              {t("Your fleet.")}
              <br />
              {t("Your next booking.")}
            </h1>
            <p>
              {t(
                "An AI rental operations assistant for independent car rental teams. Manage vehicles, answer booking inquiries and follow up on the work that needs attention.",
              )}
            </p>
            <Link className="r-button" to="/register">
              {t("Create your workspace")} <ArrowUpRight size={18} />
            </Link>
          </div>
          <aside className="workflow">
            <h2>{t("From inquiry to pickup")}</h2>
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
