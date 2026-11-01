import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    Building2,
    X,
    UserRound,
    RefreshCw,
    CreditCard,
    LayoutDashboard,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    TrendingUp,
    Globe,
    Pencil,
    Trash2
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import './Contact.css';

const API_URL = 'http://localhost:5000/api/contacts';

const INITIAL_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'LEAD',
    notes: '',
    potentialValue: '',
    source: '',
};

export default function Contacts() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null); // ID-ul clientului pe care îl edităm (null dacă adăugăm unul nou)
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

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await axios.get(API_URL, getAxiosConfig());
            setContacts(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Eroare la preluarea contactelor:', error);
            setErrorMessage(
                error.response?.data?.message ||
                'Nu am putut încărca lista de contacte. Verifică dacă serverul este pornit.'
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const filteredContacts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) return contacts;

        return contacts.filter((contact) => {
            const searchableValues = [
                contact.firstName,
                contact.lastName,
                contact.email,
                contact.phone,
                contact.company,
                contact.status,
                contact.source,
                contact.notes,
            ];

            return searchableValues.some((value) =>
                String(value || '').toLowerCase().includes(normalizedSearch)
            );
        });
    }, [contacts, searchTerm]);

    const updateFormField = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const closeModal = () => {
        if (isSaving) return;
        setIsModalOpen(false);
        setEditingId(null);
        setFormError('');
    };

    // Deschide modalul pentru adăugare nou client
    const openAddModal = () => {
        setEditingId(null);
        setFormData(INITIAL_FORM);
        setFormError('');
        setIsModalOpen(true);
    };

    // Deschide modalul pentru editarea unui client existent
    const openEditModal = (contact) => {
        setEditingId(contact.id);
        setFormData({
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || '',
            phone: contact.phone || '',
            company: contact.company || '',
            status: contact.status || 'LEAD',
            notes: contact.notes || '',
            potentialValue: contact.potentialValue ?? '',
            source: contact.source || '',
        });
        setFormError('');
        setIsModalOpen(true);
    };

    // Salvează formularul (POST dacă e nou, PUT dacă are editingId)
    const handleSaveContact = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');

        try {
            if (editingId) {
                await axios.put(`${API_URL}/${editingId}`, formData, getAxiosConfig());
            } else {
                await axios.post(API_URL, formData, getAxiosConfig());
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(INITIAL_FORM);
            await fetchContacts();
        } catch (error) {
            console.error('Eroare la salvarea contactului:', error);
            setFormError(
                error.response?.data?.message ||
                'Contactul nu a putut fi salvat. Verifică datele și încearcă din nou.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    // Șterge un client
    const handleDeleteContact = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi acest client?')) return;

        try {
            await axios.delete(`${API_URL}/${id}`, getAxiosConfig());
            await fetchContacts();
        } catch (error) {
            console.error('Eroare la ștergerea contactului:', error);
            alert('Nu am putut șterge clientul.');
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'Activ';
            case 'INACTIVE':
                return 'Inactiv';
            default:
                return 'Lead';
        }
    };

    const getInitials = (contact) =>
        `${contact.firstName?.charAt(0) || ''}${contact.lastName?.charAt(0) || ''}`.toUpperCase() || '?';

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
                            <div className="contacts-eyebrow">Relații și oportunități</div>
                            <h1>Clienți &amp; Lead-uri</h1>
                            <p>Gestionează contactele și urmărește stadiul relațiilor cu clienții.</p>
                        </div>

                        <button
                            type="button"
                            className="contacts-primary-button"
                            onClick={openAddModal}
                        >
                            <Plus size={18} />
                            <span>Adaugă client</span>
                        </button>
                    </header>

                    <section className="contacts-stats" aria-label="Statistici contacte">
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon blue"><Users size={19} /></div>
                            <div>
                                <span>Total contacte</span>
                                <strong>{contacts.length}</strong>
                            </div>
                        </div>
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon violet"><UserRound size={19} /></div>
                            <div>
                                <span>Lead-uri</span>
                                <strong>{contacts.filter((contact) => contact.status === 'LEAD').length}</strong>
                            </div>
                        </div>
                        <div className="contacts-stat-card">
                            <div className="contacts-stat-icon green"><Users size={19} /></div>
                            <div>
                                <span>Clienți activi</span>
                                <strong>{contacts.filter((contact) => contact.status === 'ACTIVE').length}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="contacts-panel">
                        <div className="contacts-panel-header">
                            <div>
                                <h2>Toate contactele</h2>
                                <p>{filteredContacts.length} {filteredContacts.length === 1 ? 'contact găsit' : 'contacte găsite'}</p>
                            </div>

                            <div className="contacts-toolbar">
                                <label className="contacts-search">
                                    <Search size={17} />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Caută după nume, email, sursă..."
                                        aria-label="Caută contacte"
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
                                    onClick={fetchContacts}
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
                                <button type="button" onClick={fetchContacts}>Încearcă din nou</button>
                            </div>
                        ) : (
                            <div className="contacts-table-wrap">
                                <table className="contacts-table">
                                    <thead>
                                    <tr>
                                        <th>Contact</th>
                                        <th>Companie &amp; Sursă</th>
                                        <th>Date de contact</th>
                                        <th>Valoare &amp; Status</th>
                                        <th style={{ textAlign: 'right' }}>Acțiuni</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="contacts-empty">
                                                <span className="contacts-loader" />
                                                Se încarcă contactele...
                                            </td>
                                        </tr>
                                    ) : filteredContacts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="contacts-empty">
                                                <div className="contacts-empty-icon"><Users size={24} /></div>
                                                <strong>{searchTerm ? 'Nu am găsit rezultate' : 'Nu ai încă niciun contact'}</strong>
                                                <span>
                                                    {searchTerm
                                                        ? 'Încearcă un alt termen de căutare.'
                                                        : 'Adaugă primul client pentru a începe să-ți organizezi relațiile.'}
                                                </span>
                                                {!searchTerm && (
                                                    <button type="button" onClick={openAddModal}>
                                                        <Plus size={16} /> Adaugă primul client
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContacts.map((contact) => (
                                            <tr key={contact.id}>
                                                <td>
                                                    <div className="contacts-person">
                                                        <div className="contacts-avatar">{getInitials(contact)}</div>
                                                        <div>
                                                            <strong>{contact.firstName} {contact.lastName}</strong>
                                                            {contact.notes ? (
                                                                <span className="contacts-note-snippet" title={contact.notes}>
                                                                    <FileText size={12} /> {contact.notes}
                                                                </span>
                                                            ) : (
                                                                <span>Contact Flowdesck</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="contacts-company-col">
                                                        {contact.company ? (
                                                            <span className="contacts-company"><Building2 size={15} />{contact.company}</span>
                                                        ) : <span className="contacts-muted">— Fără companie</span>}
                                                        {contact.source && (
                                                            <span className="contacts-source-badge">
                                                                <Globe size={11} /> {contact.source}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="contacts-contact-details">
                                                        {contact.email && <span><Mail size={14} />{contact.email}</span>}
                                                        {contact.phone && <span><Phone size={14} />{contact.phone}</span>}
                                                        {!contact.email && !contact.phone && <span className="contacts-muted">Fără date de contact</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="contacts-value-status">
                                                        {contact.potentialValue ? (
                                                            <strong className="contacts-value">
                                                                <TrendingUp size={13} /> €{Number(contact.potentialValue).toLocaleString()}
                                                            </strong>
                                                        ) : (
                                                            <span className="contacts-muted">—</span>
                                                        )}
                                                        <span className={`contacts-status status-${(contact.status || 'LEAD').toLowerCase()}`}>
                                                            <span />
                                                            {getStatusLabel(contact.status)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="contacts-actions-cell" style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(contact)}
                                                            title="Editează clientul"
                                                            style={{ padding: '6px 10px', fontSize: '11px', background: '#edf2ff', color: '#3563e9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Pencil size={13} /> Editează
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteContact(contact.id)}
                                                            title="Șterge clientul"
                                                            style={{ padding: '6px 10px', fontSize: '11px', background: '#fff1f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Trash2 size={13} /> Șterge
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <div className="contacts-footnote">Datele tale sunt organizate într-un singur loc, în Flowdesck.</div>
                </div>

                {isModalOpen && (
                    <div className="contacts-modal-backdrop" onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}>
                        <section className="contacts-modal" role="dialog" aria-modal="true" aria-labelledby="contacts-modal-title">
                            <div className="contacts-modal-header">
                                <div>
                                    <span className="contacts-modal-kicker">Baza ta de clienți</span>
                                    <h2 id="contacts-modal-title">{editingId ? 'Editează clientul' : 'Adaugă un client'}</h2>
                                    <p>{editingId ? 'Modifică informațiile contactului selectat.' : 'Completează informațiile extinse ale contactului.'}</p>
                                </div>
                                <button type="button" className="contacts-modal-close" onClick={closeModal} disabled={isSaving} aria-label="Închide">
                                    <X size={19} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveContact} className="contacts-form">
                                <div className="contacts-form-grid">
                                    <label className="contacts-field">
                                        <span>Prenume <b>*</b></span>
                                        <input name="firstName" value={formData.firstName} onChange={updateFormField} placeholder="Ex. Andrei" required />
                                    </label>
                                    <label className="contacts-field">
                                        <span>Nume <b>*</b></span>
                                        <input name="lastName" value={formData.lastName} onChange={updateFormField} placeholder="Ex. Popescu" required />
                                    </label>
                                    <label className="contacts-field">
                                        <span>Email</span>
                                        <input name="email" type="email" value={formData.email} onChange={updateFormField} placeholder="andrei@email.com" />
                                    </label>
                                    <label className="contacts-field">
                                        <span>Telefon</span>
                                        <input name="phone" type="tel" value={formData.phone} onChange={updateFormField} placeholder="+40 7xx xxx xxx" />
                                    </label>
                                </div>

                                <div className="contacts-form-grid" style={{ marginTop: '12px' }}>
                                    <label className="contacts-field">
                                        <span>Companie <small>OPȚIONAL</small></span>
                                        <input name="company" value={formData.company} onChange={updateFormField} placeholder="Ex. Tech Solutions SRL" />
                                    </label>
                                    <label className="contacts-field">
                                        <span>Valoare potențială (€)</span>
                                        <input name="potentialValue" type="number" min="0" step="any" value={formData.potentialValue} onChange={updateFormField} placeholder="Ex. 2500" />
                                    </label>
                                </div>

                                <div className="contacts-form-grid" style={{ marginTop: '12px' }}>
                                    <label className="contacts-field">
                                        <span>Status</span>
                                        <select name="status" value={formData.status} onChange={updateFormField}>
                                            <option value="LEAD">Lead — potențial client</option>
                                            <option value="ACTIVE">Activ — client existent</option>
                                            <option value="INACTIVE">Inactiv — fost client</option>
                                        </select>
                                    </label>
                                    <label className="contacts-field">
                                        <span>Sursă recrutare</span>
                                        <select name="source" value={formData.source} onChange={updateFormField}>
                                            <option value="">Selectează sursa...</option>
                                            <option value="Google">Google Search</option>
                                            <option value="Facebook">Facebook Ads</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                            <option value="Recomandare">Recomandare / Referral</option>
                                            <option value="Cold Call">Cold Call</option>
                                            <option value="Altele">Altă sursă</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="contacts-field" style={{ marginTop: '12px' }}>
                                    <span>Observații / Notițe</span>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={updateFormField}
                                        placeholder="Detalii despre discuții, preferințe, mențiuni importante..."
                                        rows="2"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: '1px solid #e5e9f0',
                                            background: '#f9fafc',
                                            fontFamily: 'inherit',
                                            fontSize: '12px',
                                            resize: 'vertical'
                                        }}
                                    />
                                </label>

                                {formError && <div className="contacts-form-error">{formError}</div>}

                                <div className="contacts-form-footer">
                                    <button type="button" className="contacts-cancel-button" onClick={closeModal} disabled={isSaving}>Anulează</button>
                                    <button type="submit" className="contacts-submit-button" disabled={isSaving}>
                                        {isSaving ? 'Se salvează...' : <><Plus size={16} /> {editingId ? 'Salvează modificările' : 'Salvează clientul'}</>}
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