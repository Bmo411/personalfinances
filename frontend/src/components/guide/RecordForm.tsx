import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { guide, localDate, errorMessage, type Resource, type GuideRecord, type ExerciseSet } from '../../services/guide';


function localDatetime(value?: string | null) {
    if (!value) return '';
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replace(' ', 'T');
}

export function RecordForm({ resource, record, onSuccess }: { resource: Resource; record?: GuideRecord; onSuccess: () => void }) {
    const queryClient = useQueryClient();
    const { data: projects = [] } = useQuery({ queryKey: ['guide', 'projects'], queryFn: () => guide.list('projects') });
    const [sets, setSets] = useState<ExerciseSet[]>(record?.sets || [{ exercise: '', reps: 10, weight_kg: '0' }]);
    const mutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => guide.save(resource, data, record?.id),
        onSuccess: () => { queryClient.invalidateQueries(); onSuccess(); },
    });
    const input = (name: keyof GuideRecord, label: string, type = 'text', required = false) => <label className="field" key={name}>{label}<input name={name} type={type} required={required} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} defaultValue={String(record?.[name] ?? '')} /></label>;
    const select = (name: keyof GuideRecord, label: string, options: [string, string][], fallback: string) => <label className="field">{label}<select name={name} defaultValue={String(record?.[name] ?? fallback)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const data: Record<string, unknown> = Object.fromEntries(form.entries());
        if (form.has('project')) data.project = form.get('project') ? Number(form.get('project')) : null;
        if (resource === 'tasks') {
            data.due_at = form.get('due_at') ? new Date(`${form.get('due_at')}:00-06:00`).toISOString() : null;
            data.reminder_enabled = form.get('reminder_enabled') === 'on';
            data.reminder_minutes = Number(form.get('reminder_minutes') || 60);
        }
        if (resource === 'prospects') data.next_follow_up = form.get('next_follow_up') || null;
        if (resource === 'notes') data.pinned = form.get('pinned') === 'on';
        if (resource === 'workouts') data.sets = sets;
        if (resource === 'meals') for (const field of ['calories', 'protein_g', 'carbs_g', 'fat_g']) data[field] = form.get(field) || null;
        mutation.mutate(data);
    }

    return <form onSubmit={submit} className="space-y-4">
        {['projects', 'prospects', 'meals'].includes(resource) ? input('name', 'Nombre', 'text', true) : ['tasks', 'notes', 'workouts'].includes(resource) ? input('title', 'Título', 'text', true) : null}
        {['tasks', 'notes', 'prospects'].includes(resource) && <label className="field">Proyecto<select name="project" defaultValue={record?.project ?? ''}><option value="">Personal / sin proyecto</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
        {resource === 'projects' && <>{input('description', 'Descripción')}{select('status', 'Estado', [['ACTIVE', 'Activo'], ['PAUSED', 'Pausado'], ['DONE', 'Terminado']], 'ACTIVE')}</>}
        {resource === 'tasks' && <>
            <div className="grid grid-cols-2 gap-3">{select('priority', 'Prioridad', [['LOW', 'Baja'], ['MEDIUM', 'Media'], ['HIGH', 'Alta'], ['URGENT', 'Urgente']], 'MEDIUM')}{select('status', 'Estado', [['PENDING', 'Pendiente'], ['IN_PROGRESS', 'En progreso'], ['DONE', 'Hecho'], ['CANCELED', 'Cancelado']], 'PENDING')}</div>
            <label className="field">Fecha límite · Ciudad de México<input name="due_at" type="datetime-local" defaultValue={localDatetime(record?.due_at)} /></label>
            <div className="flex items-center gap-3"><label className="check-label"><input name="reminder_enabled" type="checkbox" defaultChecked={record?.reminder_enabled ?? true} />Aviso por WhatsApp</label><label className="field flex-1">Minutos antes<input name="reminder_minutes" type="number" min="0" max="65535" defaultValue={record?.reminder_minutes ?? 60} /></label></div>
        </>}
        {resource === 'notes' && <><label className="field">Contenido<textarea name="body" required rows={7} defaultValue={record?.body} /></label><label className="check-label"><input type="checkbox" name="pinned" defaultChecked={record?.pinned} />Fijar nota</label></>}
        {resource === 'prospects' && <>{input('company', 'Empresa')}{input('email', 'Correo', 'email')}{select('stage', 'Estado del contacto', [['NEW', 'Nuevo'], ['CONTACTED', 'Contactado'], ['PROPOSAL', 'Propuesta'], ['WON', 'Ganado'], ['LOST', 'Cerrado']], 'NEW')}{input('next_follow_up', 'Próximo seguimiento', 'date')}</>}
        {['workouts', 'meals', 'meditations'].includes(resource) && <label className="field">Fecha<input name="date" type="date" required defaultValue={record?.date || localDate()} /></label>}
        {resource === 'workouts' && <div className="space-y-3"><div className="flex justify-between items-center"><span className="text-sm text-muted">Series realizadas</span><button type="button" className="text-button" onClick={() => setSets([...sets, { ...sets[sets.length - 1] }])}><Plus size={16} />Añadir serie</button></div>{sets.map((set, index) => <div key={index} className="set-row">
            <label className="field col-span-3">Ejercicio<input aria-label={`Ejercicio de serie ${index + 1}`} required value={set.exercise} onChange={e => setSets(sets.map((item, i) => i === index ? { ...item, exercise: e.target.value } : item))} /></label>
            <label className="field">Reps<input type="number" min="1" max="32767" required value={set.reps} onChange={e => setSets(sets.map((item, i) => i === index ? { ...item, reps: Number(e.target.value) } : item))} /></label>
            <label className="field">Kg<input type="number" min="0" step="0.01" required value={set.weight_kg} onChange={e => setSets(sets.map((item, i) => i === index ? { ...item, weight_kg: e.target.value } : item))} /></label>
            <button type="button" className="icon-button self-end" aria-label={`Eliminar serie ${index + 1}`} disabled={sets.length === 1} onClick={() => setSets(sets.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
        </div>)}</div>}
        {resource === 'meals' && <>{input('portion', 'Porción o cantidad', 'text', true)}<p className="text-sm text-muted">Registra los valores que conozcas para esta porción.</p><div className="grid grid-cols-2 gap-3">{input('calories', 'Calorías', 'number')}{input('protein_g', 'Proteína · g', 'number')}{input('carbs_g', 'Carbohidratos · g', 'number')}{input('fat_g', 'Grasa · g', 'number')}</div></>}
        {resource === 'meditations' && <><label className="field">Minutos<input name="minutes" type="number" min="1" max="1440" required defaultValue={record?.minutes ?? 5} /></label><label className="field">Tu reflexión<textarea name="reflection" rows={5} defaultValue={record?.reflection} /></label></>}
        {['tasks', 'prospects', 'workouts', 'meals'].includes(resource) && <label className="field">Notas<textarea name="notes" rows={3} defaultValue={record?.notes} /></label>}
        {mutation.isError && <p role="alert" className="form-error">{errorMessage(mutation.error)}</p>}
        <button className="primary-button w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : record ? 'Guardar cambios' : 'Guardar registro'}</button>
    </form>;
}
