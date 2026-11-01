import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    Plus,
    Search,
    X,
    RefreshCw,
    Users,
    LayoutDashboard,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    TrendingUp,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import './Invoices.css';

const API_URL = 'http://localhost:5000/api/invoices';
const CONTACTS_API_URL = 'http://localhost:5000/api/contacts';

const INITIAL_FORM = {
    invoiceNumber: '',
    amount: '',
    status: 'PENDING',
    dueDate: '',
    contactId: '',
};

export default function Invoices() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState(INITIAL_FORM);

    const getAxiosConfig = () => {
        const token = localStorage.getItem('token');
        return {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        };
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const [invoicesRes, contactsRes] = await Promise.all([
                axios.get(API_URL, getAxiosConfig()),
                axios.get(CONTACTS_API_URL, getAxiosConfig())
            ]);
            setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
            setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
        } catch (error) {
            console.error('Eroare la preluarea datelor:', error);
            setErrorMessage(
                error.response?.data?.message ||
                'Nu am putut încărca facturile. Verifică dacă serverul este pornit.'
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredInvoices = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return invoices;

        return invoices.filter((inv) => {
            const clientName = inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : '';
            const searchableValues = [
                inv.invoiceNumber,
                inv.status,
                clientName,
                inv.amount.toString(),
            ];

            return searchableValues.some((value) =>
                String(value || '').toLowerCase().includes(normalizedSearch)
            );
        });
    }, [invoices, searchTerm]);

    const updateFormField = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const closeModal = () => {
        if (isSaving) return;
        setIsModalOpen(false);
        setFormError('');
    };

    const handleCreateInvoice = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');

        // Pregătim datele: dacă contactId este gol, trimitem null
        const payload = {
            ...formData,
            amount: parseFloat(formData.amount),
            contactId: formData.contactId === '' ? null : formData.contactId
        };

        try {
            await axios.post(API_URL, payload, getAxiosConfig());
            setIsModalOpen(false);
            setFormData(INITIAL_FORM);
            await fetchData();
        } catch (error) {
            console.error('Eroare la emiterea facturii:', error);
            setFormError(
                error.response?.data?.eroare ||
                error.response?.data?.message ||
                'Factura nu a putut fi emisă. Verifică datele și încearcă din nou.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi această factură?')) return;

        try {
            await axios.delete(`${API_URL}/${id}`, getAxiosConfig());
            await fetchData();
        } catch (error) {
            console.error('Eroare la ștergerea facturii:', error);
            alert('Nu am putut șterge factura.');
        }
    };

    const getStatusDetails = (status) => {
        switch (status) {
            case 'PAID':
                return { label: 'Plătită', className: 'status-active', icon: CheckCircle2 };
            case 'OVERDUE':
                return { label: 'Scadentă', className: 'status-inactive', icon: AlertCircle };
            default:
                return { label: 'În așteptare', className: 'status-lead', icon: Clock };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menu = [
        { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { title: 'Clienți & Lead-uri', path: '/contacts', icon: Users },
        { title: 'Facturi', path: '/invoices', icon: CreditCard },
        { title: 'Configurare SaaS', path: '/settings', icon: Settings },
    ];

    const totalRevenue = invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0);

    const pendingAmount = invoices
        .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
        .reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <div className={`dashboard-shell contacts-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
            <aside className={`dashboard-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon"><LayoutDashboard size={21} /></div>
                    {sidebarOpen && <span className="sidebar-brand-name">Flowdesck<span>.</span></span>}
                    <button className="sidebar-collapse" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Restrânge meniul' : 'Extinde meniul'}>
                        {sidebarOpen ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
                    </button>
                </div>

                {sidebarOpen && (
                    <div className="workspace-card">
                        <span className="workspace-label">COMPANIA TA</span>
                        <span className="workspace-name">My Workspace</span>
                        <span className="workspace-status"><span /> Spațiu de lucru activ</span>
                    </div>
                )}

                <nav className="sidebar-nav">
                    {sidebarOpen && <p className="sidebar-section-label">MENIU PRINCIPAL</p>}
                    {menu.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink key={item.path} to={item.path} title={!sidebarOpen ? item.title : ''}
                                     className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <Icon size={19} />
                                {sidebarOpen && <span>{item.title}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom">
                    {sidebarOpen && <div className="pro-card">
                        <div className="pro-card-top"><span className="pro-sparkle">✦</span><span>FLOWDESCK PRO</span></div>
                        <h3>Mai mult control. Mai multă creștere.</h3>
                        <p>Descoperă toate funcționalitățile CRM.</p>
                        <button onClick={() => navigate('/settings')}>Explorează planurile <span>→</span></button>
                    </div>}
                    <button className="logout-button" onClick={logout}>
                        <LogOut size={19} />{sidebarOpen && <span>Deconectare</span>}
                    </button>
                </div>
            </aside>

            <main className="dashboard-main contacts-page">
                <div className="contacts-container">
                    <header className="contacts-header">
                        <div>
                            <div className="contacts-eyebrow">Finanțe și încasări</div>
                            <h1>Facturi</h1>
                            <p>Emite și gestionează facturile emise către clienți.</p>
                        </div>

                        <button
                            type="button"
                            className="contacts-primary-button"
                            onClick={() => {
                                setFormData(INITIAL_FORM);
                                setFormError('');
                                setIsModalOpen(true);
                            }}
                        >
                            <Plus size={18} />
                            <span>Emite factură</span>
                        </button>
                    </header>

                    <section className="contacts-stats" aria-label="Statistici facturi">
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon blue"><CreditCard size={19} /></div>
                            <div>
                                <span>Total facturi</span>
                                <strong>{invoices.length}</strong>
                            </div>
                        </div>
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon green"><TrendingUp size={19} /></div>
                            <div>
                                <span>Încasări totale (Plătite)</span>
                                <strong>€{totalRevenue.toLocaleString()}</strong>
                            </div>
                        </div>
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon violet"><Clock size={19} /></div>
                            <div>
                                <span>De încasat (În așteptare)</span>
                                <strong>€{pendingAmount.toLocaleString()}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="contacts-panel">
                        <div className="contacts-panel-header">
                            <div>
                                <h2>Toate facturile</h2>
                                <p>{filteredInvoices.length} {filteredInvoices.length === 1 ? 'factură găsită' : 'facturi găsite'}</p>
                            </div>

                            <div className="contacts-toolbar">
                                <label className="contacts-search">
                                    <Search size={17} />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Caută după număr, client, status..."
                                        aria-label="Caută facturi"
                                    />
                                    {searchTerm && (
                                        <button type="button" onClick={() => setSearchTerm('')} aria-label="Șterge căutarea">
                                            <X size={15} />
                                        </button>
                                    )}
                                </label>
                                <button
                                    type="button"
                                    className="contacts-refresh-button"
                                    onClick={fetchData}
                                    disabled={isLoading}
                                    aria-label="Reîncarcă lista"
                                    title="Reîncarcă"
                                >
                                    <RefreshCw size={16} className={isLoading ? 'is-spinning' : ''} />
                                </button>
                            </div>
                        </div>

                        {errorMessage ? (
                            <div className="contacts-message contacts-error">
                                <p>{errorMessage}</p>
                                <button type="button" onClick={fetchData}>Încearcă din nou</button>
                            </div>
                        ) : (
                            <div className="contacts-table-wrap">
                                <table className="contacts-table">
                                    <thead>
                                    <tr>
                                        <th>Factură</th>
                                        <th>Client</th>
                                        <th>Valoare</th>
                                        <th>Scadență &amp; Status</th>
                                        <th aria-label="Acțiuni" style={{ textAlign: 'right' }} />
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="contacts-empty">
                                                <span className="contacts-loader" />
                                                Se încarcă facturile...
                                            </td>
                                        </tr>
                                    ) : filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="contacts-empty">
                                                <div className="contacts-empty-icon"><CreditCard size={24} /></div>
                                                <strong>{searchTerm ? 'Nu am găsit rezultate' : 'Nu ai emis încă nicio factură'}</strong>
                                                <span>
                                                    {searchTerm
                                                        ? 'Încearcă un alt termen de căutare.'
                                                        : 'Emite prima factură pentru a începe urmărirea încasărilor.'}
                                                </span>
                                                {!searchTerm && (
                                                    <button type="button" onClick={() => setIsModalOpen(true)}>
                                                        <Plus size={16} /> Emite prima factură
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            const statusInfo = getStatusDetails(inv.status);
                                            const StatusIcon = statusInfo.icon;
                                            return (
                                                <tr key={inv.id}>
                                                    <td>
                                                        <div className="contacts-person">
                                                            <div className="contacts-avatar" style={{ background: '#e0e7ff', color: '#3563e9' }}>
                                                                <FileText size={18} />
                                                            </div>
                                                            <div>
                                                                <strong>{inv.invoiceNumber}</strong>
                                                                <span>Emisă la {new Date(inv.createdAt).toLocaleDateString('ro-RO')}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="contacts-company-col">
                                                            {inv.contact ? (
                                                                <span className="contacts-company">
                                                                    <Users size={15} /> {inv.contact.firstName} {inv.contact.lastName}
                                                                </span>
                                                            ) : (
                                                                <span className="contacts-muted">— Fără client asociat</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="contacts-contact-details">
                                                            <strong className="contacts-value" style={{ fontSize: '14px', color: '#0f172a' }}>
                                                                €{Number(inv.amount).toLocaleString()}
                                                            </strong>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="contacts-value-status">
                                                            {inv.dueDate ? (
                                                                <span className="contacts-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Calendar size={13} /> {inv.dueDate}
                                                                </span>
                                                            ) : (
                                                                <span className="contacts-muted">—</span>
                                                            )}
                                                            <span className={`contacts-status ${statusInfo.className}`}>
                                                                <span />
                                                                {statusInfo.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="contacts-actions-cell" style={{ textAlign: 'right' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteInvoice(inv.id)}
                                                            title="Șterge factura"
                                                            style={{ padding: '6px 10px', fontSize: '11px', background: '#fff1f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Trash2 size={13} /> Șterge
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <div className="contacts-footnote">Toate finanțele tale, centralizate în Flowdesck.</div>
                </div>

                {isModalOpen && (
                    <div className="contacts-modal-backdrop" onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}>
                        <section className="contacts-modal" role="dialog" aria-modal="true" aria-labelledby="contacts-modal-title">
                            <div className="contacts-modal-header">
                                <div>
                                    <span className="contacts-modal-kicker">Finanțe &amp; Încasări</span>
                                    <h2 id="contacts-modal-title">Emite o factură nouă</h2>
                                    <p>Completează detaliile pentru noua factură.</p>
                                </div>
                                <button type="button" className="contacts-modal-close" onClick={closeModal} disabled={isSaving} aria-label="Închide">
                                    <X size={19} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateInvoice} className="contacts-form">
                                <div className="contacts-form-grid">
                                    <label className="contacts-field">
                                        <span>Număr factură <b>*</b></span>
                                        <input name="invoiceNumber" value={formData.invoiceNumber} onChange={updateFormField} placeholder="Ex. INV-2026-001" required />
                                    </label>
                                    <label className="contacts-field">
                                        <span>Sumă (€) <b>*</b></span>
                                        <input name="amount" type="number" min="0" step="any" value={formData.amount} onChange={updateFormField} placeholder="Ex. 1500" required />
                                    </label>
                                </div>

                                <div className="contacts-form-grid" style={{ marginTop: '12px' }}>
                                    <label className="contacts-field">
                                        <span>Status factură</span>
                                        <select name="status" value={formData.status} onChange={updateFormField}>
                                            <option value="PENDING">În așteptare (Pending)</option>
                                            <option value="PAID">Plătită (Paid)</option>
                                            <option value="OVERDUE">Scadentă (Overdue)</option>
                                        </select>
                                    </label>
                                    <label className="contacts-field">
                                        <span>Data scadenței</span>
                                        <input name="dueDate" type="date" value={formData.dueDate} onChange={updateFormField} />
                                    </label>
                                </div>

                                <label className="contacts-field" style={{ marginTop: '12px' }}>
                                    <span>Client asociat <small>OPȚIONAL</small></span>
                                    <select name="contactId" value={formData.contactId} onChange={updateFormField}>
                                        <option value="">Selectează clientul...</option>
                                        {contacts.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {formError && <div className="contacts-form-error">{formError}</div>}

                                <div className="contacts-form-footer">
                                    <button type="button" className="contacts-cancel-button" onClick={closeModal} disabled={isSaving}>Anulează</button>
                                    <button type="submit" className="contacts-submit-button" disabled={isSaving}>
                                        {isSaving ? 'Se emite...' : <><Plus size={16} /> Emite factura</>}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}