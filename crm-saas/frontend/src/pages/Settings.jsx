import { useEffect, useState } from 'react';
import axios from 'axios';

const url = (import.meta.env.VITE_API_BASE_URL || '') + '/api/settings';
const auth = () => ({headers:{Authorization:'Bearer ' + localStorage.getItem('token')}});
export default function Settings() {
    const [company,setCompany] = useState(null);
    const [name,setName] = useState('');
    const [message,setMessage] = useState('');
    const [saving,setSaving] = useState(false);
    const canEdit = ['ADMIN','SUPER_ADMIN'].includes(JSON.parse(localStorage.getItem('user') || '{}')?.role);
    useEffect(() => {
        const controller = new AbortController();
        axios.get(url,{...auth(),signal:controller.signal}).then(({data}) => {
            setCompany(data); setName(data.name);
        }).catch(() => { if (!controller.signal.aborted) setMessage('Configurările nu au putut fi încărcate.'); });
        return () => controller.abort();
    },[]);
    async function save(event) {
        event.preventDefault(); setSaving(true); setMessage('');
        try {
            const {data} = await axios.patch(url,{name},auth());
            setCompany(data); setName(data.name); setMessage('Modificările au fost salvate.');
        } catch { setMessage('Salvarea a eșuat. Verifică accesul și încearcă din nou.'); }
        finally { setSaving(false); }
    }
    return <main className="dashboard-main ws-settings"><h1>Configurare SaaS</h1>
        {company ? <form className="panel" onSubmit={save}><h2>Compania ta</h2>
            <label>Numele companiei<input required maxLength={191} value={name} disabled={!canEdit} onChange={e=>setName(e.target.value)}/></label>
            <p>Abonament actual · {company.subscriptionPlan}</p>
            {canEdit && <button className="primary-action" disabled={saving || !name.trim() || name.trim() === company.name}>{saving ? 'Se salvează…' : 'Salvează modificările'}</button>}
        </form> : !message && <p>Se încarcă…</p>}<p role="status">{message}</p>
    </main>;
}
