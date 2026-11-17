import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, Send, Plug, Check } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { financeService, type UserProfile, type FinancialProfile } from '../../services/finance';
import { errorMessage } from '../../services/guide';

export function PreferencesPage() {
    const profile = useQuery({ queryKey: ['userProfile'], queryFn: financeService.getUserProfile });
    const finance = useQuery({ queryKey: ['financialProfile'], queryFn: financeService.getFinancialProfile });
    if (profile.isPending || finance.isPending) return <p className="empty-state">Cargando preferencias…</p>;
    if (!profile.data || !finance.data) return <p className="form-error">No se pudieron cargar las preferencias.</p>;
    return <PreferencesForm profile={profile.data} financial={finance.data} />;
}

function PreferencesForm({ profile, financial }: { profile: UserProfile; financial: FinancialProfile }) {
    const { theme, setTheme } = useThemeStore();
    const client = useQueryClient();
    const [phone, setPhone] = useState(profile.whatsapp_phone || '');
    const [key, setKey] = useState('');
    const [enabled, setEnabled] = useState(profile.whatsapp_enabled);
    const [meditation, setMeditation] = useState(profile.meditation_reminder_enabled);
    const [time, setTime] = useState(profile.meditation_reminder_time.slice(0, 5));
    const [testMessage, setTestMessage] = useState('');
    const payload = () => ({ whatsapp_phone: phone || null, ...(key ? { whatsapp_apikey: key } : {}), whatsapp_enabled: enabled, meditation_reminder_enabled: meditation, meditation_reminder_time: time + ':00' });
    const save = useMutation({ mutationFn: () => financeService.updateUserProfile(payload()), onSuccess: () => { setKey(''); client.invalidateQueries({ queryKey: ['userProfile'] }); } });
    const test = useMutation({ mutationFn: async () => {
        await financeService.updateUserProfile(payload());
        return financeService.sendWhatsAppTest(phone, key);
    }, onSuccess: result => { setTestMessage(result.message || 'CallMeBot aceptó la solicitud.'); setKey(''); client.invalidateQueries({ queryKey: ['userProfile'] }); }, onError: () => client.invalidateQueries({ queryKey: ['userProfile'] }) });
    const saveFinance = useMutation({ mutationFn: financeService.updateFinancialProfile, onSuccess: () => client.invalidateQueries() });
    const fields: { key: keyof FinancialProfile; label: string; min?: number }[] = [
        { key: 'emergency_fund_goal', label: 'Meta del fondo de emergencia · MXN' },
        { key: 'monthly_outing_budget', label: 'Presupuesto mensual de salidas · MXN' },
        { key: 'age', label: 'Edad' }, { key: 'weekly_work_hours', label: 'Horas de trabajo por semana' },
    ];
    return <div className="guide-page"><header className="page-heading"><div><p className="eyebrow">Tu guía, a tu ritmo</p><h1>Preferencias</h1></div><Link to="/integrations" className="subtle-link"><Plug size={16} />Integraciones</Link></header>
        <section className="surface"><h2 className="mb-5">Apariencia</h2><div className="flex gap-3"><button className={theme === 'dark' ? 'primary-button' : 'secondary-button'} onClick={() => setTheme('dark')}><Moon size={17} />Oscuro</button><button className={theme === 'light' ? 'primary-button' : 'secondary-button'} onClick={() => setTheme('light')}><Sun size={17} />Claro</button></div></section>
        <section className="surface space-y-5"><div className="section-heading"><h2>Recordatorios por WhatsApp</h2><span className="small-tag">{profile.whatsapp_status === 'QUOTA_EXHAUSTED' ? 'Cupo agotado' : profile.whatsapp_status === 'RATE_LIMITED' ? 'Límite temporal' : profile.whatsapp_status === 'CONFIG_REQUIRED' ? 'Requiere configuración' : profile.whatsapp_status === 'ACCEPTED' ? 'Envío aceptado' : profile.whatsapp_status === 'UNVERIFIED' ? 'Sin verificar' : 'Revisar conexión'}</span></div><p className="text-muted">Avisos de pendientes, clases, gastos fijos y tarjetas. El recordatorio de meditación incluye la frase del día y una pregunta para reflexionar.</p>
            {profile.whatsapp_status === 'QUOTA_EXHAUSTED' && <p className="text-warning">CallMeBot tiene el cupo de mensajes agotado. Revisa el servicio antes de reactivar los avisos. Tu práctica de meditación sigue disponible en la web.</p>}
            <label className="check-label"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Activar avisos por WhatsApp</label>
            <div className="grid sm:grid-cols-2 gap-4"><label className="field">Número con código de país<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52…" /></label><label className="field">Clave de CallMeBot<input type="password" autoComplete="new-password" value={key} onChange={e => setKey(e.target.value)} placeholder={profile.whatsapp_key_configured ? 'Clave guardada · escribe para reemplazar' : 'Tu clave de CallMeBot'} /></label></div>
            <div className="flex flex-wrap items-center gap-6"><label className="check-label"><input type="checkbox" checked={meditation} onChange={e => setMeditation(e.target.checked)} />Recordatorio diario de meditación</label><label className="field">Hora · Ciudad de México<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label></div>
            <div className="flex flex-wrap gap-3"><button className="primary-button" disabled={save.isPending || !time} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar preferencias'}</button><button className="secondary-button" disabled={test.isPending || !phone || (!key && !profile.whatsapp_key_configured) || !time} onClick={() => test.mutate()}><Send size={16} />{test.isPending ? 'Enviando…' : 'Guardar y probar WhatsApp'}</button></div>
            {save.isSuccess && <p className="text-brand-700 flex gap-2"><Check size={16} />Preferencias guardadas.</p>}{(save.isError || test.isError) && <p className="form-error">{errorMessage(save.error || test.error)}</p>}{testMessage && <p className="text-brand-700">{testMessage}</p>}
            <a className="text-button" href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">Activación de CallMeBot</a>
        </section>
        <section className="surface"><h2 className="mb-5">Metas financieras</h2><form className="space-y-5" onSubmit={event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            saveFinance.mutate({ emergency_fund_goal: String(form.get('emergency_fund_goal') || '0'), monthly_outing_budget: String(form.get('monthly_outing_budget') || '0'), age: form.get('age') ? Number(form.get('age')) : null, weekly_work_hours: form.get('weekly_work_hours') ? Number(form.get('weekly_work_hours')) : null, current_goal: String(form.get('current_goal') || '') });
        }}><div className="grid sm:grid-cols-2 gap-4">{fields.map(field => <label key={field.key} className="field">{field.label}<input name={field.key} type="number" min="0" step={field.key === 'age' ? '1' : '0.01'} defaultValue={financial[field.key] ?? ''} /></label>)}</div><label className="field">Tu meta actual<input name="current_goal" defaultValue={financial.current_goal} /></label><button className="primary-button" disabled={saveFinance.isPending}>{saveFinance.isPending ? 'Guardando…' : 'Guardar metas'}</button>{saveFinance.isSuccess && <p className="text-brand-700">Metas guardadas.</p>}{saveFinance.isError && <p className="form-error">{errorMessage(saveFinance.error)}</p>}</form></section>
    </div>;
}
