import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Circle, Check, CalendarDays, Wallet, Dumbbell, Utensils, ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { guide, localDate, money, dateLabel, dateTimeLabel, errorMessage } from '../../services/guide';
import { financeService } from '../../services/finance';

export function TodayPage() {
    const client = useQueryClient();
    const today = localDate();
    const { data, isPending, isError, refetch } = useQuery({ queryKey: ['guide', 'today'], queryFn: guide.today });
    const { data: finances, isError: financeError } = useQuery({ queryKey: ['summary', 'home', today], queryFn: () => financeService.getSummary({ month: Number(today.slice(5, 7)), year: Number(today.slice(0, 4)) }) });
    const complete = useMutation({ mutationFn: (id: number) => guide.save('tasks', { status: 'DONE' }, id), onSuccess: () => client.invalidateQueries() });
    if (isPending) return <p className="empty-state">Cargando tu día…</p>;
    if (isError || !data) return <div className="empty-state">No se pudo cargar tu día.<button className="text-button" onClick={() => refetch()}>Reintentar</button></div>;
    const tasks = [...data.overdue_tasks, ...data.today_tasks];
    const current = data.progress.current;
    const previous = data.progress.previous;
    return <div className="guide-page">
        <header className="page-heading"><div><p className="eyebrow">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: 'America/Mexico_City' }).format(new Date())}</p><h1>Hoy</h1></div><Link className="subtle-link" to="/month"><CalendarDays size={17} />Planeación mensual<ArrowUpRight size={16} /></Link></header>
        <div className="overview-grid">
            <section className="surface focus-panel">
                <div className="section-heading"><h2>Lo que necesita tu atención</h2><Link to="/organization" className="icon-button" aria-label="Ver pendientes"><ArrowUpRight size={19} /></Link></div>
                <div className="task-list">{tasks.length === 0 ? <div className="quiet-state"><Check size={26} /><p>Tu agenda de hoy está al día.</p>{data.unscheduled_tasks > 0 && <Link to="/organization">Revisar {data.unscheduled_tasks} pendientes sin fecha</Link>}</div> : tasks.slice(0, 6).map(task => <div className="task-row" key={task.id}>
                    <button className="complete-button" disabled={complete.isPending} onClick={() => complete.mutate(task.id)} aria-label={`Completar ${task.title}`}><Circle size={21} /></button><div><p>{task.title}</p><span className={data.overdue_tasks.some(overdue => overdue.id === task.id) ? 'text-warning' : 'text-muted'}>{data.overdue_tasks.some(overdue => overdue.id === task.id) ? 'Vencido · ' : ''}{task.due_at ? dateTimeLabel(task.due_at) : 'Sin fecha'}</span></div>{['HIGH', 'URGENT'].includes(task.priority || '') && <span className="small-tag">Prioridad alta</span>}
                </div>)}</div>
                {complete.isError && <p className="form-error">{errorMessage(complete.error)}</p>}
                {tasks.length > 6 && <Link to="/organization" className="text-button">Ver los {tasks.length} pendientes<ArrowRight size={16} /></Link>}
                <div className="next-lesson"><Clock3 size={20} /><div><span className="eyebrow">Próxima clase registrada</span>{data.next_lesson ? <><p>{data.next_lesson.student_name} · {data.next_lesson.topic}</p><small>{dateTimeLabel(data.next_lesson.scheduled_at)}</small></> : <p>Sin fecha programada</p>}</div><Link to="/math" className="icon-button" aria-label="Ver clases"><ArrowUpRight size={18} /></Link></div>
            </section>
            <section className="quote-panel"><span className="eyebrow">Una pausa para pensar</span><blockquote>{data.quote.text}</blockquote><p className="quote-source">{data.quote.kind} de {data.quote.author}<br />{data.quote.work} · {data.quote.passage}</p><p className="reflection-question">{data.quote.question}</p><Link className="primary-button" to="/meditation">Registrar mi práctica<ArrowRight size={16} /></Link></section>
        </div>
        <section className="surface finance-overview"><div className="section-heading"><h2><Wallet size={18} />Tu dinero este mes</h2><Link className="subtle-link" to="/finance">Ver finanzas<ArrowUpRight size={16} /></Link></div>{financeError ? <p className="form-error">No se pudieron cargar las finanzas.</p> : <div className="money-grid"><div><span>Disponible en efectivo y débito</span><strong>{finances ? money(finances.liquid_balance) : '…'}</strong></div><div><span>Ingresos del mes</span><strong>{finances ? money(finances.total_income) : '…'}</strong></div><div><span>Egresos del mes</span><strong>{finances ? money(finances.total_expense) : '…'}</strong></div></div>}</section>
        <div className="section-heading"><h2>Esta semana</h2><span className="text-muted text-sm">{dateLabel(current.start)} – {dateLabel(current.end)}</span></div>
        <div className="week-grid">
            <Link to="/health" className="surface metric-panel"><Dumbbell size={22} /><span>Entrenamiento</span><strong>{current.sessions}<small>sesiones</small></strong><p>{current.sets} series · {Number(current.volume_kg).toLocaleString('es-MX')} kg de volumen</p><small>{previous.sessions} sesiones en los mismos días de la semana anterior</small></Link>
            <Link to="/health?tab=meals" className="surface metric-panel"><Utensils size={22} /><span>Alimentación</span><strong>{current.meal_days}<small>días registrados</small></strong><p>{current.meals} comidas registradas</p><small>{current.nutrition.calories.missing ? `${current.nutrition.calories.missing} comidas sin calorías registradas` : 'Calorías completas en los registros'}</small></Link>
            <Link to="/meditation" className="surface metric-panel"><Circle size={22} /><span>Meditación</span><strong>{current.meditation_days}<small>días de práctica</small></strong><p>{current.meditation_minutes} minutos registrados</p><small>{previous.meditation_days} días en el período anterior</small></Link>
        </div>
        {data.followups.length > 0 && <section className="surface"><div className="section-heading"><h2>Contactos por retomar</h2><Link to="/organization?tab=prospects" className="text-button">Ver prospectos<ArrowUpRight size={16} /></Link></div>{data.followups.map(contact => <p key={contact.id} className="list-line">{contact.name}<span className="text-muted">{dateLabel(contact.next_follow_up)}</span></p>)}</section>}
    </div>;
}
