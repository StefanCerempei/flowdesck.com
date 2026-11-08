import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import PublicHeader from "../../components/PublicHeader";
import { useLanguage } from "../../i18n";
import { ErrorNotice } from "../../components/RentalUI";
export default function AuthPage({ register = false }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        (import.meta.env.VITE_API_BASE_URL || "") +
          "/api/auth/" +
          (register ? "register" : "login"),
        body,
      );
      if (!register) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      navigate(register ? "/login" : "/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.eroare ||
          (register ? "Could not create account." : "Sign-in failed."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public">
      <PublicHeader />
      <main className="auth-card r-panel">
        <form className="r-form" onSubmit={submit}>
          <p className="r-eyebrow">{t("RENTAL OPERATIONS")}</p>
          <h1>{t(register ? "Create your workspace" : "Welcome back")}</h1>
          <ErrorNotice message={t(error)} />
          {register && (
            <label>
              {t("Company name")}
              <input name="companyName" autoComplete="organization" required />
            </label>
          )}
          <label>
            {t("Email")}
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            {t("Password")}
            <input
              name="password"
              type={visible ? "text" : "password"}
              minLength={register ? 8 : undefined}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
          </label>
          <button
            type="button"
            className="r-text-link"
            onClick={() => setVisible(!visible)}
          >
            {t(visible ? "Hide password" : "Show password")}
          </button>
          <button disabled={busy} className="r-button">
            {t(busy ? "Please wait…" : register ? "Create account" : "Sign in")}
          </button>
          <Link to={register ? "/login" : "/register"}>
            {t(
              register
                ? "Already registered? Sign in"
                : "Create a company account",
            )}
          </Link>
        </form>
      </main>
    </div>
  );
}
