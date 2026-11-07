import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CarFront, CalendarDays, Sparkles, Layers, LayoutDashboard, Users, Receipt, Settings, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './workspace.css';

const links = [
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/vehicles', 'Fleet', CarFront],
    ['/reservations', 'Reservations', CalendarDays],
    ['/contacts', 'Customers', Users],
    ['/insights', 'AI Fleet Insights', Sparkles],
    ['/copilot', 'Booking Copilot', Sparkles],
    ['/settings', 'Settings', Settings],
];

export default function Workspace() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [openAt, setOpenAt] = useState(null);
    const [compact, setCompact] = useState(false);
    const open = openAt === pathname;
    if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
    function logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login', {replace:true});
    }
    return <div className={'dashboard-shell ws' + (compact ? ' ws-compact' : '')}>
        <aside className="ws-side" onKeyDown={e => { if (e.key === 'Escape') { setOpenAt(null); document.getElementById('ws-toggle').focus(); } }}>
            <div className="ws-brand"><span className="ws-mark"><Layers size={23}/></span><strong>Flowdesck</strong>
                <button className="ws-toggle" id="ws-toggle" aria-label="Meniu principal" aria-expanded={open} aria-controls="ws-navigation" onClick={() => setOpenAt(open ? null : pathname)}>{open ? <X/> : <Menu/>}</button>
            </div>
            <div id="ws-navigation" className={'ws-links' + (open ? ' ws-open' : '')}>
                <nav aria-label="Navigare principală">{links.map(([path,label,Icon]) =>
                    <NavLink key={path} to={path} title={label} aria-label={label} onClick={() => setOpenAt(null)}><Icon size={20}/><span>{label}</span></NavLink>
                )}</nav>
                <div className="ws-tools">
                    <NavLink to="/invoices" title="Invoices" className="ws-invoices"><Receipt size={19}/><span>Invoices</span></NavLink>
                    <button className="ws-collapse" aria-label={compact ? 'Extinde meniul' : 'Restrânge meniul'} onClick={() => setCompact(!compact)}>{compact ? <PanelLeftOpen/> : <PanelLeftClose/>}<span>Restrânge meniul</span></button>
                    <button aria-label="Deconectare" onClick={logout}><LogOut/><span>Deconectare</span></button>
                </div>
            </div>
        </aside>
        <Outlet/>
    </div>;
}
