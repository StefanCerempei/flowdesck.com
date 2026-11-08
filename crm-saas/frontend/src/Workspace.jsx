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
import { BookOpen } from "lucide-react";

const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/vehicles", "Fleet", CarFront],
  ["/reservations", "Reservations", CalendarDays],
  ["/contacts", "Customers", Users],
  ["/insights", "AI Fleet Insights", Sparkles],
  ["/copilot", "Booking Copilot", Sparkles],
  ["/business-plan", "Business plan", BookOpen],
  ["/settings", "Settings", Settings],
];

export default function Workspace() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openAt, setOpenAt] = useState(null);
  const [compact, setCompact] = useState(false);
  const open = openAt === pathname;
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
          </nav>
          <div className="ws-tools">
            <LanguageSwitch />
            <NavLink
              to="/invoices"
              title={t("Invoices")}
              className="ws-invoices"
            >
              <Receipt size={19} />
              <span>{t("Invoices")}</span>
            </NavLink>
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
      <Outlet />
    </div>
  );
}
