import { sessionToken, sessionUser } from "../lib/session";
import { useLanguage } from "../i18n";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/RentalUI";
import { api } from "../lib/api";


const auth = () => ({
  headers: { Authorization: "Bearer " + sessionToken() },
});
export default function Settings() {
  const { t: tr } = useLanguage();
  const [company, setCompany] = useState(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = ["ADMIN", "SUPER_ADMIN"].includes(
    sessionUser()?.role,
  );
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/settings", { ...auth(), signal: controller.signal })
      .then(({ data }) => {
        setCompany(data);
        setName(data.name);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("Configurările nu au putut fi încărcate.");
      });
    return () => controller.abort();
  }, []);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.patch("/settings", { name }, auth());
      setCompany(data);
      setName(data.name);
      setMessage("Modificările au fost salvate.");
    } catch {
      setMessage("Salvarea a eșuat. Verifică accesul și încearcă din nou.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="dashboard-main r-page">
      <PageHeader title={tr("Configurare SaaS")} />
      {company ? (
        <form className="r-panel r-form settings-form" onSubmit={save}>
          <h2>{tr("Compania ta")}</h2>
          <label>
            {tr("Numele companiei")}
            <input
              required
              maxLength={191}
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p>
            {tr("Abonament actual ·")} {company.subscriptionPlan}
          </p>
          {canEdit && (
            <button
              className="r-button"
              disabled={saving || !name.trim() || name.trim() === company.name}
            >
              {saving ? tr("Se salvează…") : tr("Salvează modificările")}
            </button>
          )}
        </form>
      ) : (
        !message && <p>{tr("Se încarcă…")}</p>
      )}
      <p role="status">{tr(message)}</p>
    </main>
  );
}
