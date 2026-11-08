import { sessionToken, isDemoGuest, clearSession } from "./lib/session";
import { useState } from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CarFront,
  CalendarDays,
  Sparkles,
  Layers,
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import "./workspace.css";
import { LanguageSwitch, useLanguage } from "./i18n";

const groups = [
  [
    "Operations",
    [
      ["/dashboard", "Dashboard", LayoutDashboard],
      ["/vehicles", "Fleet", CarFront],
      ["/reservations", "Reservations", CalendarDays],
      ["/contacts", "Customers", Users],
      ["/invoices", "Invoices", Receipt],
    ],
  ],
  [
    "AI assistance",
    [
      ["/copilot", "Booking Copilot", Sparkles],
      ["/insights", "Fleet Intelligence", Sparkles],
    ],
  ],
  ["Workspace", [["/settings", "Settings", Settings]]],
];

export default function Workspace() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openAt, setOpenAt] = useState(null);
  const [compact, setCompact] = useState(false);
  const open = openAt === pathname;
  if (!sessionToken()) return <Navigate to="/login" replace />;
  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }
  return (
    <div className={"dashboard-shell ws" + (compact ? " ws-compact" : "")}>
      <aside
        className="ws-side"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpenAt(null);
            document.getElementById("ws-toggle").focus();
          }
        }}
      >
        <div className="ws-brand">
          <span className="ws-mark">
            <Layers size={23} />
          </span>
          <strong>Flowdesck</strong>
          <button
            className="ws-toggle"
            id="ws-toggle"
            aria-label={t("Meniu principal")}
            aria-expanded={open}
            aria-controls="ws-navigation"
            onClick={() => setOpenAt(open ? null : pathname)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div
          id="ws-navigation"
          className={"ws-links" + (open ? " ws-open" : "")}
        >
          <nav aria-label={t("Navigare principală")}>
            {groups.map(([heading, links]) => (
              <section
                className="ws-nav-group"
                key={heading}
                aria-label={t(heading)}
              >
                <h2>{t(heading)}</h2>
                {links.map(([path, label, Icon]) => (
                  <NavLink
                    key={path}
                    to={path}
                    title={t(label)}
                    aria-label={t(label)}
                    onClick={() => setOpenAt(null)}
                  >
                    <Icon size={20} />
                    <span>{t(label)}</span>
                  </NavLink>
                ))}
              </section>
            ))}
          </nav>
          <div className="ws-tools">
            <LanguageSwitch />
            <button
              className="ws-collapse"
              aria-label={compact ? t("Extinde meniul") : t("Restrânge meniul")}
              onClick={() => setCompact(!compact)}
            >
              {compact ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span>{t("Restrânge meniul")}</span>
            </button>
            <button aria-label={t("Deconectare")} onClick={logout}>
              <LogOut />
              <span>{t("Deconectare")}</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="demo-banner" hidden={!isDemoGuest()} role="status">
        {t("Demo Mode — Read Only")} · {t("Saving is restricted in demo mode.")}
      </div>
      <Outlet />
    </div>
  );
}
