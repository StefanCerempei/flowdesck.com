import { sessionToken } from "../lib/session";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { LanguageSwitch, useLanguage } from "../i18n";
export default function PublicHeader() {
  const { t } = useLanguage();
  return (
    <header className="public-header">
      <Link className="wordmark" to="/">
        <Layers aria-hidden="true" />
        Flowdesck
      </Link>
      <nav>
        <Link to="/business-plan">{t("Business plan")}</Link>
        <LanguageSwitch />
        <Link
          className="r-button secondary"
          to={sessionToken() ? "/dashboard" : "/login"}
        >
          {t(sessionToken() ? "Dashboard" : "Sign in")}
        </Link>
      </nav>
    </header>
  );
}
