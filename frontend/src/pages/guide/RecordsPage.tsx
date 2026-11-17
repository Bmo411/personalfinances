import { resourceLabels } from '../../services/guide';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Check, Folder, Pin, Dumbbell, Utensils } from 'lucide-react';
import { guide, dateLabel, dateTimeLabel, errorMessage, type Resource, type GuideRecord } from '../../services/guide';
import { RecordForm } from '../../components/guide/RecordForm';
import { Modal } from '../../components/ui/Modal';

const statusLabels: Record<string, string> = { ACTIVE: 'Activo', PAUSED: 'Pausado', DONE: 'Hecho', PENDING: 'Pendiente', IN_PROGRESS: 'En progreso', CANCELED: 'Cancelado', NEW: 'Nuevo', CONTACTED: 'Contactado', PROPOSAL: 'Propuesta', WON: 'Ganado', LOST: 'Cerrado' };

export function RecordsPage({ mode }: { mode: 'organization' | 'health' }) {
    const [params, setParams] = useSearchParams();
    const tabs: Resource[] = mode === 'organization' ? ['tasks', 'projects', 'notes', 'prospects'] : ['workouts', 'meals'];
    const requested = params.get('tab') as Resource;
    const resource = tabs.includes(requested) ? requested : tabs[0];
    const [editing, setEditing] = useState<GuideRecord | 'new' | null>(null);
    const [projectFilter, setProjectFilter] = useState('');
    const [showClosed, setShowClosed] = useState(false);
    const [search, setSearch] = useState('');
    const client = useQueryClient();
    const records = useQuery({ queryKey: ['guide', resource], queryFn: () => guide.list(resource) });
    const projects = useQuery({ queryKey: ['guide', 'projects'], queryFn: () => guide.list('projects') });
    const metrics = useQuery({ queryKey: ['guide', 'progress'], queryFn: guide.progress, enabled: mode === 'health' });
    const complete = useMutation({ mutationFn: (id: number) => guide.save('tasks', { status: 'DONE' }, id), onSuccess: () => client.invalidateQueries() });
    const plural: Record<string, string> = { projects: 'Proyectos', tasks: 'Pendientes', notes: 'Notas', prospects: 'Prospectos', workouts: 'Gym', meals: 'Dieta' };
    const items = (records.data || []).filter(item => (!projectFilter || item.project === Number(projectFilter)) && (showClosed || resource !== 'tasks' || !['DONE', 'CANCELED'].includes(item.status || '')) && `${item.title || item.name} ${item.body || item.notes || ''}`.toLowerCase().includes(search.toLowerCase()));

    return <div className="guide-page">
        <header className="page-heading"><div><p className="eyebrow">{mode === 'organization' ? 'Proyectos, trabajo y vida personal' : 'Tu progreso, semana a semana'}</p><h1>{mode === 'organization' ? 'Organización' : 'Gym y dieta'}</h1></div><button className="primary-button" onClick={() => setEditing('new')}><Plus size={18} />{resourceLabels[resource]}</button></header>
        <nav className="tabs" aria-label="Secciones">{tabs.map(tab => <button key={tab} className={tab === resource ? 'active' : ''} onClick={() => { setParams({ tab }); setProjectFilter(''); setSearch(''); }}>{plural[tab]}</button>)}</nav>
        {mode === 'health' && metrics.data && <>
            <div className="week-grid">
                <div className="surface compact-stat"><Dumbbell size={20} /><span>Sesiones esta semana</span><strong>{metrics.data.current.sessions}</strong><small>{metrics.data.previous.sessions} en el período anterior</small></div>
                <div className="surface compact-stat"><span>Series y volumen registrado</span><strong>{metrics.data.current.sets}<small> series</small></strong><small>{Number(metrics.data.current.volume_kg).toLocaleString('es-MX')} kg · antes {Number(metrics.data.previous.volume_kg).toLocaleString('es-MX')} kg</small></div>
                <div className="surface compact-stat"><Utensils size={20} /><span>Días con comidas</span><strong>{metrics.data.current.meal_days}</strong><small>{metrics.data.previous.meal_days} en el período anterior</small></div>
            </div><p className="text-muted text-sm">{metrics.data.comparison} · {dateLabel(metrics.data.current.start)} – {dateLabel(metrics.data.current.end)}</p>
            {resource === 'meals' && <div className="nutrition-grid">{Object.entries(metrics.data.current.nutrition).map(([field, value]) => <div className="surface" key={field}><span className="text-muted">{({ calories: 'Calorías', protein_g: 'Proteína · g', carbs_g: 'Carbohidratos · g', fat_g: 'Grasa · g' } as Record<string, string>)[field]}</span><strong className="block text-2xl my-2">{value.total === null ? 'Sin datos' : Number(value.total).toLocaleString('es-MX')}</strong><small className={value.missing ? 'text-warning' : 'text-muted'}>{value.missing ? `Total parcial · faltan ${value.missing} comidas` : 'Total de los registros'}</small></div>)}</div>}
            {resource === 'workouts' && metrics.data.current.exercises.length > 0 && <section className="surface"><h2 className="mb-3">Carga máxima por ejercicio</h2>{metrics.data.current.exercises.map(exercise => <p className="list-line" key={exercise.exercise}>{exercise.exercise}<span>{exercise.max_kg} kg <small className="text-muted">· anterior {metrics.data?.previous.exercises.find(item => item.exercise === exercise.exercise)?.max_kg ?? 'sin registro'}</small></span></p>)}</section>}
        </>}
        <div className="filter-bar"><input aria-label="Buscar registros" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />{['tasks', 'notes', 'prospects'].includes(resource) && <select aria-label="Filtrar proyecto" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="">Todos los proyectos</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}{resource === 'tasks' && <label className="check-label"><input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />Mostrar cerrados</label>}</div>
        {records.isPending && <p className="empty-state">Cargando registros…</p>}
        {records.isError && <p role="alert" className="form-error">{errorMessage(records.error)}<button className="text-button" onClick={() => records.refetch()}>Reintentar</button></p>}
        {complete.isError && <p className="form-error">{errorMessage(complete.error)}</p>}
        {!records.isPending && !records.isError && items.length === 0 && <div className="surface empty-state"><p>{search || projectFilter ? 'Sin coincidencias con estos filtros.' : 'Aquí aparecerán tus registros.'}</p><button className="text-button" onClick={() => setEditing('new')}><Plus size={18} />Agregar {resourceLabels[resource].toLowerCase()}</button></div>}
        <div className={['projects', 'notes'].includes(resource) ? 'record-grid' : 'space-y-3'}>{items.map(item => <article className="surface record-card" key={item.id}>
            <div className="section-heading"><div className="flex items-center gap-3">{resource === 'projects' && <Folder size={22} />}{item.pinned && <Pin size={16} />}<h2>{item.title || item.name}</h2></div><div className="flex gap-1">{resource === 'tasks' && !['DONE', 'CANCELED'].includes(item.status || '') && <button className="icon-button" disabled={complete.isPending} onClick={() => complete.mutate(item.id)} aria-label={`Completar ${item.title}`}><Check size={18} /></button>}<button className="icon-button" onClick={() => setEditing(item)} aria-label={`Editar ${item.title || item.name}`}><Pencil size={16} /></button></div></div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted mb-3">{item.project && <span className="small-tag">{projects.data?.find(project => project.id === item.project)?.name}</span>}{(item.status || item.stage) && <span>{statusLabels[item.status || item.stage || '']}</span>}{item.due_at && <span>{dateTimeLabel(item.due_at)}</span>}{item.date && <span>{dateLabel(item.date)}</span>}{item.next_follow_up && <span>Seguimiento {dateLabel(item.next_follow_up)}</span>}</div>
            {(item.body || item.description || item.notes) && <p className="record-body">{item.body || item.description || item.notes}</p>}
            {resource === 'projects' && <button className="text-button mt-4" onClick={() => { setParams({ tab: 'tasks' }); setProjectFilter(String(item.id)); }}>Ver pendientes</button>}
            {resource === 'prospects' && <p className="text-sm text-muted mt-2">{[item.company, item.email].filter(Boolean).join(' · ')}</p>}
            {resource === 'workouts' && <div className="table-scroll"><table><thead><tr><th>Ejercicio</th><th>Repeticiones</th><th>Carga</th></tr></thead><tbody>{item.sets?.map((set, index) => <tr key={index}><td>{set.exercise}</td><td>{set.reps}</td><td>{set.weight_kg} kg</td></tr>)}</tbody></table></div>}
            {resource === 'meals' && <p className="text-sm"><span>{item.portion}</span><span className="text-muted"> · {item.calories ?? 'Sin registrar'} kcal · {item.protein_g ?? '—'} g proteína · {item.carbs_g ?? '—'} g carbohidratos · {item.fat_g ?? '—'} g grasa</span></p>}
        </article>)}</div>
        <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={`${editing === 'new' ? 'Agregar' : 'Editar'} ${resourceLabels[resource].toLowerCase()}`}>{editing && <RecordForm key={editing === 'new' ? resource : editing.id} resource={resource} record={editing === 'new' ? undefined : editing} onSuccess={() => setEditing(null)} />}</Modal>
    </div>;
}
