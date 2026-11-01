import { useState } from "react";
import { Link } from "react-router-dom";
import {
    LayoutDashboard, Users, BarChart3, Shield, ArrowRight,
    CheckCircle2, Menu, X
} from "lucide-react";
import "./Landing.css";

export default function Landing() {
    const [menuOpen, setMenuOpen] = useState(false);

    const features = [
        {
            icon: Users,
            title: "Management clienți",
            text: "Păstrează datele de contact, istoricul interacțiunilor și oportunitățile într-un singur loc.",
            color: "blue",
        },
        {
            icon: BarChart3,
            title: "Rapoarte inteligente",
            text: "Urmărește vânzările, conversiile și performanța echipei pentru decizii mai bune.",
            color: "green",
        },
        {
            icon: Shield,
            title: "Date protejate",
            text: "Fiecare companie are propriul spațiu de lucru, cu acces organizat pe roluri și permisiuni.",
            color: "purple",
        },
    ];

    return (
        <div className="landing-page">
            <header className="landing-header">
                <nav className="landing-nav">
                    <Link to="/" className="landing-brand">
                        <span className="landing-brand-icon"><LayoutDashboard size={22} /></span>
                        <span>Flowdesck</span>
                    </Link>

                    <button
                        className="landing-menu-toggle"
                        type="button"
                        aria-label={menuOpen ? "Închide meniul" : "Deschide meniul"}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    <div className={`landing-nav-actions ${menuOpen ? "is-open" : ""}`}>
                        <Link to="/login" className="landing-login-link" onClick={() => setMenuOpen(false)}>
                            Autentificare
                        </Link>
                        <Link to="/register" className="landing-nav-cta" onClick={() => setMenuOpen(false)}>
                            Începe gratuit <ArrowRight size={17} />
                        </Link>
                    </div>
                </nav>
            </header>

            <main>
                <section className="landing-hero">
                    <div className="landing-glow landing-glow-one" />
                    <div className="landing-glow landing-glow-two" />

                    <div className="landing-hero-content">
                        <div className="landing-eyebrow">
                            <span className="landing-status-dot" />
                            Platformă CRM pentru afaceri moderne
                        </div>

                        <h1>
                            Relații mai bune.
                            <span> Rezultate mai mari.</span>
                        </h1>

                        <p className="landing-hero-description">
                            Gestionează clienții, organizează oportunitățile și urmărește
                            evoluția afacerii tale dintr-un singur spațiu de lucru.
                        </p>

                        <div className="landing-hero-actions">
                            <Link to="/register" className="landing-primary-button">
                                Creează un cont gratuit <ArrowRight size={19} />
                            </Link>
                            <Link to="/login" className="landing-secondary-button">
                                Intră în cont
                            </Link>
                        </div>

                        <div className="landing-trust-note">
                            <CheckCircle2 size={17} />
                            Configurare rapidă · Spațiu de lucru dedicat companiei tale
                        </div>
                    </div>

                    <div className="landing-preview-wrap" aria-label="Previzualizare Flowdesck CRM">
                        <div className="landing-preview-card">
                            <div className="preview-topbar">
                                <div className="preview-brand">
                                    <span className="preview-brand-icon"><LayoutDashboard size={14} /></span>
                                    <strong>Flowdesck</strong>
                                </div>
                                <div className="preview-avatar">SC</div>
                            </div>

                            <div className="preview-body">
                                <aside className="preview-sidebar">
                                    <span className="preview-side-item active"><LayoutDashboard size={13} /> Overview</span>
                                    <span className="preview-side-item"><Users size={13} /> Clienți</span>
                                    <span className="preview-side-item"><BarChart3 size={13} /> Rapoarte</span>
                                </aside>

                                <div className="preview-main">
                                    <div className="preview-heading">
                                        <div><span className="preview-kicker">WORKSPACE</span><h3>Dashboard</h3></div>
                                        <span className="preview-date">Ultimele 30 zile</span>
                                    </div>
                                    <div className="preview-stats">
                                        <div className="preview-stat">
                                            <span>Clienți activi</span><strong>248</strong>
                                            <small>+12.8% față de luna trecută</small>
                                        </div>
                                        <div className="preview-stat">
                                            <span>Oportunități</span><strong>64</strong>
                                            <small>+8.2% față de luna trecută</small>
                                        </div>
                                    </div>
                                    <div className="preview-chart-card">
                                        <div className="preview-chart-title"><span>PERFORMANȚĂ</span><strong>Activitate în timp</strong></div>
                                        <div className="preview-chart">
                                            {[34, 49, 40, 66, 54, 78, 62, 91, 73, 100, 82, 94].map((height, i) =>
                                                <span key={i} style={{ height: `${height}%` }} />
                                            )}
                                        </div>
                                        <div className="preview-chart-labels">
                                            <span>Ian</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mai</span><span>Iun</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="landing-floating-note">
                            <span className="floating-note-icon"><CheckCircle2 size={18} /></span>
                            <span><strong>Totul organizat</strong><small>Clienții tăi, într-un singur loc</small></span>
                        </div>
                    </div>
                </section>

                <section className="landing-features">
                    <div className="landing-section-heading">
                        <span className="landing-section-kicker">SIMPLU. CLAR. EFICIENT.</span>
                        <h2>Tot ce ai nevoie pentru a-ți dezvolta afacerea.</h2>
                        <p>Instrumentele esențiale pentru a păstra controlul asupra relațiilor cu clienții și activității echipei.</p>
                    </div>

                    <div className="landing-feature-grid">
                        {features.map(({ icon: Icon, title, text, color }) => (
                            <article className="landing-feature-card" key={title}>
                                <div className={`landing-feature-icon ${color}`}><Icon size={25} /></div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                                <span className="landing-feature-link">Conceput pentru echipa ta <ArrowRight size={15} /></span>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-bottom-cta">
                    <div>
                        <span className="landing-section-kicker">E TIMPUL SĂ SIMPLIFICI</span>
                        <h2>Organizează-ți afacerea cu Flowdesck.</h2>
                        <p>Începe să gestionezi mai eficient relațiile cu clienții.</p>
                    </div>
                    <Link to="/register" className="landing-primary-button">
                        Începe gratuit <ArrowRight size={19} />
                    </Link>
                </section>
            </main>

            <footer className="landing-footer">
                <Link to="/" className="landing-brand">
                    <span className="landing-brand-icon"><LayoutDashboard size={18} /></span>
                    <span>Flowdesck</span>
                </Link>
                <span>© {new Date().getFullYear()} Flowdesck. Toate drepturile rezervate.</span>
            </footer>
        </div>
    );
}
