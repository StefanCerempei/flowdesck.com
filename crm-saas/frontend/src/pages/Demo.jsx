import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { useLanguage } from "../i18n";
import axios from "axios";
export default function Demo() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    axios
      .post(
        (import.meta.env.VITE_API_BASE_URL || "") + "/api/demo/session",
        {},
        { signal: controller.signal },
      )
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        sessionStorage.setItem("flowdesck.demo", JSON.stringify(data));
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [navigate]);
  return (
    <div className="public">
      <PublicHeader />
      <main className="auth-card r-panel">
        <h1>{t(failed ? "Demo unavailable" : "Opening your demo…")}</h1>
        <p role="status">
          {t(
            failed
              ? "The public demo is currently unavailable. Please try again later."
              : "Preparing a read-only tour of Timiș Rent Demo.",
          )}
        </p>
        <Link to="/">{t("Home")}</Link>
      </main>
    </div>
  );
}
