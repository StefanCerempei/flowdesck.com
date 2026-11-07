import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Users, Bell, TrendingUp, BarChart3, CreditCard, CheckCircle2, CalendarDays } from "lucide-react";
import "./Dashboard.css";

export default function Dashboard() {
    const [brief, setBrief] = useState(null);
    const [busy, setBusy] = useState(false);
    async function generateBrief() {
        setBusy(true);
        try {
            const result = await axios.post(`${import.meta.env.VITE_API_BASE_URL || ''}/api/dashboard/brief`, {}, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            setBrief(result.data);
        } catch { setBrief({source:'error', text:'Cererea a eșuat. Încearcă din nou.'}); }
        finally { setBusy(false); }
    }
    const navigate = useNavigate();

    // 1. TOATE HOOK-URILE (STATE) ÎN INTERIORUL FUNCȚIEI
    const [user, setUser] = useState(null);

    // State pentru formularul de sarcini noi
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState("Normal");

    // State-ul pentru datele reale din backend
    const [dashboardData, setDashboardData] = useState({
        stats: { activeClients: 0, totalContacts: 0, monthlyRevenue: 0, unpaidInvoices: 0 },
        salesPipeline: { leads: 0, active: 0 },
        tasks: []
    });

    // 2. HOOK-URILE PENTRU EFECTE
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token || !userData) {
            navigate("/login", { replace: true });
            return;
        }

        try {
            setUser(JSON.parse(userData));
        } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    const fetchDashboardData = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/api/dashboard/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDashboardData(res.data);
        } catch (error) {
            console.error("Eroare la încărcarea dashboard-ului:", error);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Funcție pentru adăugarea unei sarcini noi
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const token = localStorage.getItem("token");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL || ''}/api/tasks`, {
                title: newTaskTitle,
                priority: newTaskPriority
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewTaskTitle("");
            setNewTaskPriority("Normal");
            await fetchDashboardData(); // Reîmprospătăm datele
        } catch (error) {
            console.error("Eroare la adăugarea sarcinii:", error);
        }
    };

    // Funcție pentru bifarea/debifarea unei sarcini
    const handleToggleTask = async (taskId) => {
        const token = localStorage.getItem("token");
        try {
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/tasks/${taskId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchDashboardData(); // Reîmprospătăm datele
        } catch (error) {
            console.error("Eroare la actualizarea sarcinii:", error);
        }
    };


    // 3. EARLY RETURN
    if (!user) {
        return (
            <div className="dashboard-loading">
                <span className="dashboard-spinner" />
            </div>
        );
    }

    // 4. VARIABILE DERIVATE
    const name = user.name || user.email?.split("@")[0] || "Utilizator";
    const initials = name.substring(0, 2).toUpperCase();



    const currentStats = [
        {
            title: "Clienți activi",
            value: dashboardData.stats.activeClients.toString(),
            change: "Din totalul de",
            icon: Users,
            color: "blue",
            note: `${dashboardData.stats.totalContacts} contacte înregistrate`,
        },
        {
            title: "Venituri lunare",
            value: `€${dashboardData.stats.monthlyRevenue}`,
            change: "Luna curentă",
            icon: BarChart3,
            color: "violet",
            note: "facturi emise și plătite",
        },
        {
            title: "Facturi neplătite",
            value: dashboardData.stats.unpaidInvoices.toString(),
            change: "Necesită atenție",
            icon: CreditCard,
            color: "orange",
            note: "facturi în așteptare",
        },
    ];

    const sales = [
        { label: "Lead-uri noi", value: dashboardData.salesPipeline.leads, color: "blue" },
        { label: "Contactate", value: 0, color: "violet" },
        { label: "În negociere", value: 0, color: "amber" },
        { label: "Clienți Activi", value: dashboardData.salesPipeline.active, color: "green" },
    ];



    return (
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-left">

                    </div>

                    <div className="header-right">
                        <button className="icon-button notification-button"><Bell size={19} /><span className="notification-dot" /></button>
                        <div className="header-divider" />
                        <div className="user-profile">
                            <div className="user-details">
                                <span className="user-name">{name}</span>
                                <span className="user-role">{String(user.role || "Member").replace(/_/g, " ")}</span>
                            </div>
                            <div className="user-avatar">{initials}</div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    <section className="dashboard-welcome">
                        <div>
                            <div className="welcome-eyebrow"><CalendarDays size={14} /><span>{dashboardData.company || "Compania mea"}</span></div>
                            <p className="welcome-kicker">Bine ai revenit!</p>
                            <h1>Bună, {name}!</h1>
                        </div>
                        <button className="primary-action" onClick={() => navigate("/contacts")}>
                            <Users size={17} /> Adaugă client <span>+</span>
                        </button>
                    </section>

                    <section className="stats-grid">
                        {currentStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <article className="stat-card" key={stat.title}>
                                    <div className="stat-card-top">
                                        <div className={`stat-icon ${stat.color}`}><Icon size={21} /></div>
                                        <span className={`stat-change ${stat.color === "orange" ? "attention" : ""}`}>
                                            {stat.color !== "orange" && <TrendingUp size={13} />}
                                            {stat.change}
                                        </span>
                                    </div>
                                    <p className="stat-title">{stat.title}</p>
                                    <div className="stat-value-row">
                                        <h2>{stat.value}</h2>
                                        <span>{stat.note}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </section>

                    <section className="dashboard-grid dashboard-grid-main">
                        <article className="panel revenue-panel">
                            <div className="panel-heading">
                                <div><h2>Ultimele 4 săptămâni</h2><p>Facturi plătite, grupate după data emiterii</p></div>
                            </div>
                            {(dashboardData.activity?.weeks || []).map(w => <div key={w.start} style={{marginBottom:12}}>
                                <div className="sales-item-label"><span>Săptămâna din {w.start}</span><strong>{w.amount} €</strong></div>
                                <div className="progress-track"><div className="progress-fill blue" style={{width:(100*w.amount/Math.max(1,...dashboardData.activity.weeks.map(x=>x.amount)))+'%'}} /></div>
                            </div>)}
                            <button className="primary-action" onClick={generateBrief} disabled={busy}>{busy ? 'Se pregătește…' : 'Analizează cu Gemini'}</button>
                            {brief && <div aria-live="polite" style={{marginTop:12}}><strong>{brief.source === 'gemini' ? 'Analiză Gemini' : brief.source === 'local' ? 'Rezumat local · AI indisponibil' : 'Eroare'}</strong><p>{brief.text}</p></div>}
                        </article>

                        <article className="panel sales-panel">
                            <div className="panel-heading">
                                <div><h2>Rezumat vânzări</h2><p>Oportunități curente</p></div>
                            </div>
                            <div className="sales-total">
                                <strong>{dashboardData.stats.totalContacts}</strong>
                                <span>contacte în sistem</span>
                            </div>
                            <div className="sales-list">
                                {sales.map((item) => (
                                    <div className="sales-item" key={item.label}>
                                        <div className="sales-item-label">
                                            <span>{item.label}</span>
                                            <strong>{item.value}</strong>
                                        </div>
                                        <div className="progress-track">
                                            <div className={`progress-fill ${item.color}`} style={{ width: `${(item.value / Math.max(dashboardData.stats.totalContacts, 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </section>

                    {/* SECȚIUNEA NOUĂ PENTRU SARCINI (TASKS) */}
                    <section className="dashboard-grid dashboard-grid-bottom" style={{ marginTop: '24px' }}>
                        <article className="panel tasks-panel" style={{ width: '100%' }}>
                            <div className="panel-heading">
                                <div>
                                    <h2>Sarcinile mele</h2>
                                    <p>Activitățile tale pentru astăzi</p>
                                </div>
                                <span className="task-count">
                                    {dashboardData.tasks.filter(t => t.completed).length}/{dashboardData.tasks.length}
                                </span>
                            </div>

                            {/* Formular adăugare sarcină nouă */}
                            <form onSubmit={handleAddTask} className="ws-task-form">
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Adaugă o sarcină nouă..."
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e9f0', fontSize: '13px', background: '#f9fafc' }}
                                />
                                <select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e5e9f0', fontSize: '12px', background: '#f9fafc' }}
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                                <button type="submit" style={{ padding: '10px 16px', background: '#3563e9', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    + Adaugă
                                </button>
                            </form>

                            <div className="task-list">
                                {dashboardData.tasks.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '24px 0' }}>Nu ai nicio sarcină înregistrată.</p>
                                ) : (
                                    dashboardData.tasks.map((task) => (
                                        <label className={`task-item ${task.completed ? "completed" : ""}`} key={task.id} style={{ cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={task.completed}
                                                onChange={() => handleToggleTask(task.id)}
                                            />
                                            <span className="custom-checkbox">
                                                {task.completed && <CheckCircle2 size={17} />}
                                            </span>
                                            <span className="task-copy">
                                                <strong>{task.title}</strong>
                                                <small>{new Date(task.createdAt).toLocaleDateString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</small>
                                            </span>
                                            <span className={`task-priority ${task.priority === "Urgent" ? "urgent" : ""}`}>
                                                {task.priority}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </article>
                    </section>
                </div>
            </main>
    );
}