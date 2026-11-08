import { useState } from "react";
import PublicHeader from "../components/PublicHeader";
import { useLanguage } from "../i18n";
import { roadmap, financials } from "./planData";
const rows = [
  ["Paying companies", (f) => f.clients],
  ["Monthly revenue per company", (f) => f.arpa],
  ["Annual revenue", (f) => f.revenue],
  ["Marketing", (f) => f.marketing],
  ["Hosting and domain", (f) => f.infrastructure],
  ["Planned expenses", (f) => f.marketing + f.infrastructure],
  [
    "Balance before other expenses",
    (f) => f.revenue - f.marketing - f.infrastructure,
  ],
];
export default function BusinessPlan() {
  const { t, locale } = useLanguage();
  const [index, setIndex] = useState(0);
  const phase = roadmap[index];
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <div className="public">
      <PublicHeader />
      <main className="plan">
        <header>
          <p className="r-eyebrow">2027–2031</p>
          <h1>{t("Business plan")}</h1>
          <p>
            {t(
              "Historical roadmap and illustrative projections from the original Flowdesck plan. Targets and prices describe the planning scenario.",
            )}
          </p>
        </header>
        <section className="r-panel r-form">
          <h2>{t("Original business model")}</h2>
          <p>
            {t(
              "The five-year strategy proposed industry-specific workspaces, a 30-day trial and a target of 3,000 paying companies by year five.",
            )}
          </p>
          <a href="#roadmap">{t("Explore the roadmap")}</a>
        </section>
        <section id="roadmap" className="r-panel r-form">
          <h2>{t("Development roadmap")}</h2>
          <div className="phase-tabs">
            {roadmap.map((p, i) => (
              <button
                key={p.year}
                className={"r-button " + (index === i ? "" : "secondary")}
                onClick={() => setIndex(i)}
                aria-pressed={index === i}
              >
                {t(p.year)}
              </button>
            ))}
          </div>
          <article aria-live="polite">
            <p className="r-eyebrow">{t(phase.status)}</p>
            <h2>{t(phase.phase)}</h2>
            <p>
              {t("Target")} · {t(phase.target)}
            </p>
            <ul>
              {phase.tasks.map((task) => (
                <li key={task}>{t(task)}</li>
              ))}
            </ul>
          </article>
          <div className="r-actions">
            <button
              className="r-button secondary"
              disabled={!index}
              onClick={() => setIndex(index - 1)}
            >
              {t("Previous")}
            </button>
            <button
              className="r-button secondary"
              disabled={index === roadmap.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              {t("Next")}
            </button>
          </div>
        </section>
        <section className="r-panel">
          <div className="r-panel-title">
            <h2>{t("Financial projections")}</h2>
          </div>
          <div className="r-table-wrap">
            <table className="r-table">
              <thead>
                <tr>
                  <th>{t("Indicator")}</th>
                  {financials.map((f) => (
                    <th key={f.year}>{t(f.year)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, value], i) => (
                  <tr key={label}>
                    <th>{t(label)}</th>
                    {financials.map((f) => (
                      <td key={f.year}>
                        {i
                          ? currency.format(value(f))
                          : value(f).toLocaleString(locale)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="projection-note">
            {t(
              "Revenue uses estimated average customer counts. The balance excludes taxes, payment processing, AI costs, salaries and other unlisted expenses.",
            )}
          </p>
          <div className="r-form">
            <h3>{t("Annual revenue")}</h3>
            {financials.map((f) => (
              <div key={f.year} className="plan-bar">
                <span>{t(f.year)}</span>
                <meter
                  aria-label={t(f.year)}
                  min="0"
                  max="702000"
                  value={f.revenue}
                />
                <strong>{currency.format(f.revenue)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="r-panel r-form">
          <h2>{t("Original cost and subscription assumptions")}</h2>
          <p>
            {t(
              "The plan allowed $140 for hosting and $50 for the domain, with in-house development and organic marketing for six months.",
            )}
          </p>
          <p>
            {t(
              "The model assumed $10 per month for four members and $5 per additional member, with part of subscription revenue reinvested in growth.",
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
