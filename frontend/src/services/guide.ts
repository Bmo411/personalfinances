import { api } from './api';

export type Resource = 'projects' | 'tasks' | 'notes' | 'prospects' | 'workouts' | 'meals' | 'meditations';
export const resourceLabels: Record<Resource, string> = { projects: 'Proyecto', tasks: 'Pendiente', notes: 'Nota', prospects: 'Prospecto', workouts: 'Entrenamiento', meals: 'Comida', meditations: 'Meditación' };

export interface ExerciseSet { exercise: string; reps: number; weight_kg: string; }
export interface GuideRecord {
    id: number;
    title?: string;
    name?: string;
    description?: string;
    body?: string;
    notes?: string;
    project?: number | null;
    status?: string;
    priority?: string;
    due_at?: string | null;
    reminder_enabled?: boolean;
    reminder_minutes?: number;
    date?: string;
    sets?: ExerciseSet[];
    portion?: string;
    calories?: string | null;
    protein_g?: string | null;
    carbs_g?: string | null;
    fat_g?: string | null;
    minutes?: number;
    reflection?: string;
    company?: string;
    email?: string;
    stage?: string;
    next_follow_up?: string | null;
    pinned?: boolean;
}
export interface Quote { text: string; author: string; work: string; passage: string; question: string; url: string; kind: string; }
export interface WeekMetrics {
    start: string; end: string; sessions: number; sets: number; volume_kg: string; meal_days: number; meals: number;
    exercises: { exercise: string; max_kg: string }[];
    nutrition: Record<string, { total: string | null; missing: number }>;
    meditation_days: number; meditation_minutes: number;
}
export interface Progress { current: WeekMetrics; previous: WeekMetrics; comparison: string; }
export interface Today {
    date: string; quote: Quote; today_tasks: GuideRecord[]; overdue_tasks: GuideRecord[]; unscheduled_tasks: number;
    next_lesson: { student_name: string; topic: string; scheduled_at: string } | null;
    followups: { id: number; name: string; next_follow_up: string }[]; progress: Progress;
}
export interface MathPanel {
    updated_at: string | null; panel: string;
    students: { source_id: string; name: string; content: string }[];
    plans: { source_id: string; content: string }[];
}

export const guide = {
    list: async (resource: Resource) => (await api.get<GuideRecord[]>(`life/${resource}/`)).data,
    save: async (resource: Resource, data: Record<string, unknown>, id?: number) => {
        if (id) return (await api.patch(`life/${resource}/${id}/`, data)).data;
        return (await api.post(`life/${resource}/`, data)).data;
    },
    today: async () => (await api.get<Today>('life/today/')).data,
    progress: async () => (await api.get<Progress>('life/progress/')).data,
    math: async () => (await api.get<MathPanel>('life/math-panel/')).data,
};

export function localDate() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export const money = (value: number | string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value));
export const dateLabel = (date?: string | null) => date ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(date.length === 10 ? `${date}T12:00:00-06:00` : date)) : 'Sin fecha';
export const dateTimeLabel = (date: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(date));
export function errorMessage(error: unknown): string {
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    if (typeof data === 'string' && data.length < 300) return data;
    if (data && typeof data === 'object') return Object.entries(data).map(([key, value]) => `${key === 'detail' || key === 'error' ? '' : key + ' · '}${typeof value === 'string' ? value : JSON.stringify(value)}`).join(' ');
    return 'No se pudo guardar. Comprueba la conexión y vuelve a intentarlo.';
}
