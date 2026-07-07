import { api } from './api';

export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type LessonStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
export type TaskArea = 'WORK' | 'BUSINESS' | 'PERSONAL' | 'CLASS';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';

export interface Student {
    id: number;
    name: string;
    subject: string;
    goal: string;
    status: StudentStatus;
    notes: string;
    last_contact_date: string | null;
    next_follow_up: string | null;
    upcoming_lessons_count?: number;
}

export interface Lesson {
    id: number;
    student: number;
    student_name?: string;
    student_subject?: string;
    scheduled_at: string;
    topic: string;
    homework: string;
    follow_up_notes: string;
    status: LessonStatus;
    reminder_enabled: boolean;
    reminder_minutes: number;
    completed_at: string | null;
}

export interface WorkTask {
    id: number;
    title: string;
    area: TaskArea;
    priority: TaskPriority;
    due_at: string | null;
    status: TaskStatus;
    notes: string;
    reminder_enabled: boolean;
    reminder_minutes: number;
    completed_at: string | null;
}

export interface MonthlyFocus {
    id: number;
    year: number;
    month: number;
    company_focus: string;
    skills_focus: string;
    personal_focus: string;
    health_focus: string;
    notes: string;
}

export interface MonthSummary {
    period: {
        month: string;
        start: string;
        end: string;
        today: string;
    };
    counts: {
        active_students: number;
        scheduled_lessons: number;
        completed_lessons: number;
        open_tasks: number;
        overdue_tasks: number;
        follow_up_students: number;
    };
    today_lessons: Lesson[];
    upcoming_lessons: Lesson[];
    overdue_tasks: WorkTask[];
    today_tasks: WorkTask[];
    upcoming_tasks: WorkTask[];
    follow_up_students: Student[];
    focus: MonthlyFocus;
}

export const lifeService = {
    getStudents: async () => {
        const { data } = await api.get('life/students/');
        return data as Student[];
    },
    createStudent: async (student: Partial<Student>) => {
        const { data } = await api.post('life/students/', student);
        return data as Student;
    },
    updateStudent: async (id: number, student: Partial<Student>) => {
        const { data } = await api.patch(`life/students/${id}/`, student);
        return data as Student;
    },
    deleteStudent: async (id: number) => {
        await api.delete(`life/students/${id}/`);
    },
    addStudentNote: async (id: number, payload: { note: string; next_follow_up?: string | null }) => {
        const { data } = await api.post(`life/students/${id}/add_note/`, payload);
        return data as Student;
    },

    getLessons: async (params?: { status?: LessonStatus; student?: number }) => {
        const { data } = await api.get('life/lessons/', { params });
        return data as Lesson[];
    },
    createLesson: async (lesson: Partial<Lesson>) => {
        const { data } = await api.post('life/lessons/', lesson);
        return data as Lesson;
    },
    updateLesson: async (id: number, lesson: Partial<Lesson>) => {
        const { data } = await api.patch(`life/lessons/${id}/`, lesson);
        return data as Lesson;
    },
    completeLesson: async (id: number, payload?: { follow_up_notes?: string; next_follow_up?: string | null }) => {
        const { data } = await api.post(`life/lessons/${id}/complete/`, payload || {});
        return data as Lesson;
    },
    rescheduleLesson: async (id: number, scheduled_at: string) => {
        const { data } = await api.post(`life/lessons/${id}/reschedule/`, { scheduled_at });
        return data as Lesson;
    },
    deleteLesson: async (id: number) => {
        await api.delete(`life/lessons/${id}/`);
    },

    getTasks: async (params?: { status?: TaskStatus; area?: TaskArea }) => {
        const { data } = await api.get('life/tasks/', { params });
        return data as WorkTask[];
    },
    createTask: async (task: Partial<WorkTask>) => {
        const { data } = await api.post('life/tasks/', task);
        return data as WorkTask;
    },
    updateTask: async (id: number, task: Partial<WorkTask>) => {
        const { data } = await api.patch(`life/tasks/${id}/`, task);
        return data as WorkTask;
    },
    completeTask: async (id: number) => {
        const { data } = await api.post(`life/tasks/${id}/complete/`);
        return data as WorkTask;
    },
    rescheduleTask: async (id: number, due_at: string) => {
        const { data } = await api.post(`life/tasks/${id}/reschedule/`, { due_at });
        return data as WorkTask;
    },
    deleteTask: async (id: number) => {
        await api.delete(`life/tasks/${id}/`);
    },

    getCurrentFocus: async () => {
        const { data } = await api.get('life/monthly-focus/current/');
        return data as MonthlyFocus;
    },
    updateCurrentFocus: async (focus: Partial<MonthlyFocus>) => {
        const { data } = await api.patch('life/monthly-focus/current/', focus);
        return data as MonthlyFocus;
    },
    getMonthSummary: async (month?: string) => {
        const { data } = await api.get('life/month-summary/', { params: month ? { month } : undefined });
        return data as MonthSummary;
    },
};
