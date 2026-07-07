import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    BookOpen,
    Briefcase,
    CalendarCheck,
    CalendarClock,
    CalendarPlus,
    CheckCircle2,
    Clock,
    GraduationCap,
    Loader2,
    MessageSquarePlus,
    Pencil,
    PlusCircle,
    Target,
    Trash2,
    Users,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import {
    Lesson,
    lifeService,
    MonthlyFocus,
    Student,
    StudentStatus,
    TaskArea,
    TaskPriority,
    TaskStatus,
    WorkTask,
} from '../../services/life';

type ActiveTab = 'summary' | 'students' | 'work' | 'focus';

const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'students', label: 'Alumnos' },
    { id: 'work', label: 'Trabajo' },
    { id: 'focus', label: 'Enfoque' },
];

const formatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
});

function formatDateTime(value?: string | null) {
    if (!value) return 'Sin fecha';
    return formatter.format(new Date(value));
}

function formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function toDatetimeInput(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function fromDatetimeInput(value: string) {
    return new Date(value).toISOString();
}

function defaultDatetimeInput(hoursFromNow = 24) {
    return toDatetimeInput(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString());
}

function studentStatusLabel(status: StudentStatus) {
    if (status === 'PAUSED') return 'Pausado';
    if (status === 'COMPLETED') return 'Completado';
    return 'Activo';
}

function taskAreaLabel(area: TaskArea) {
    if (area === 'BUSINESS') return 'Empresa';
    if (area === 'PERSONAL') return 'Personal';
    if (area === 'CLASS') return 'Clases';
    return 'Trabajo';
}

function priorityLabel(priority: TaskPriority) {
    if (priority === 'URGENT') return 'Urgente';
    if (priority === 'HIGH') return 'Alta';
    if (priority === 'LOW') return 'Baja';
    return 'Media';
}

function taskStatusLabel(status: TaskStatus) {
    if (status === 'IN_PROGRESS') return 'En progreso';
    if (status === 'DONE') return 'Hecho';
    if (status === 'CANCELED') return 'Cancelado';
    return 'Pendiente';
}

function priorityClass(priority: TaskPriority) {
    if (priority === 'URGENT') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (priority === 'LOW') return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-brand-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
}

export function MonthPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [lessonModalOpen, setLessonModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const queryClient = useQueryClient();

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['life-summary'],
        queryFn: () => lifeService.getMonthSummary(),
    });
    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: ['life-students'],
        queryFn: lifeService.getStudents,
    });
    const { data: lessons = [], isLoading: loadingLessons } = useQuery({
        queryKey: ['life-lessons'],
        queryFn: () => lifeService.getLessons(),
    });
    const { data: tasks = [], isLoading: loadingTasks } = useQuery({
        queryKey: ['life-tasks'],
        queryFn: () => lifeService.getTasks(),
    });
    const { data: focus } = useQuery({
        queryKey: ['life-focus'],
        queryFn: lifeService.getCurrentFocus,
    });

    const invalidateLife = () => {
        queryClient.invalidateQueries({ queryKey: ['life-summary'] });
        queryClient.invalidateQueries({ queryKey: ['life-students'] });
        queryClient.invalidateQueries({ queryKey: ['life-lessons'] });
        queryClient.invalidateQueries({ queryKey: ['life-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['life-focus'] });
    };

    const completeLessonMutation = useMutation({
        mutationFn: (lessonId: number) => lifeService.completeLesson(lessonId),
        onSuccess: invalidateLife,
    });
    const completeTaskMutation = useMutation({
        mutationFn: (taskId: number) => lifeService.completeTask(taskId),
        onSuccess: invalidateLife,
    });
    const deleteStudentMutation = useMutation({
        mutationFn: lifeService.deleteStudent,
        onSuccess: invalidateLife,
    });
    const deleteLessonMutation = useMutation({
        mutationFn: lifeService.deleteLesson,
        onSuccess: invalidateLife,
    });
    const deleteTaskMutation = useMutation({
        mutationFn: lifeService.deleteTask,
        onSuccess: invalidateLife,
    });

    const openStudentModal = (student?: Student) => {
        setEditingStudent(student || null);
        setStudentModalOpen(true);
    };

    const openLessonModal = (lesson?: Lesson, student?: Student) => {
        setEditingLesson(lesson || null);
        setSelectedStudent(student || null);
        setLessonModalOpen(true);
    };

    const openTaskModal = (task?: WorkTask) => {
        setEditingTask(task || null);
        setTaskModalOpen(true);
    };

    const openNoteModal = (student: Student) => {
        setSelectedStudent(student);
        setNoteModalOpen(true);
    };

    const openTasks = useMemo(
        () => tasks.filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS'),
        [tasks],
    );
    const scheduledLessons = useMemo(
        () => lessons.filter((lesson) => lesson.status === 'SCHEDULED'),
        [lessons],
    );
    const isLoading = loadingSummary || loadingStudents || loadingLessons || loadingTasks;

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Mi Mes</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Clases, alumnos, pendientes y enfoque mensual en un solo lugar.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => openStudentModal()}
                        className="bg-[var(--bg-secondary)] border border-brand-200 hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Users size={18} />
                        Alumno
                    </button>
                    <button
                        onClick={() => openLessonModal()}
                        className="bg-[var(--bg-secondary)] border border-brand-200 hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <CalendarPlus size={18} />
                        Clase
                    </button>
                    <button
                        onClick={() => openTaskModal()}
                        className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={18} />
                        Pendiente
                    </button>
                </div>
            </header>

            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2 bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-brand-700 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">Cargando Mi Mes...</div>
            ) : (
                <>
                    {activeTab === 'summary' && summary && (
                        <SummaryTab
                            summary={summary}
                            onCompleteLesson={(lesson) => completeLessonMutation.mutate(lesson.id)}
                            onCompleteTask={(task) => completeTaskMutation.mutate(task.id)}
                            onEditLesson={(lesson) => openLessonModal(lesson)}
                            onEditTask={(task) => openTaskModal(task)}
                        />
                    )}

                    {activeTab === 'students' && (
                        <StudentsTab
                            students={students}
                            lessons={scheduledLessons}
                            onAddStudent={() => openStudentModal()}
                            onEditStudent={openStudentModal}
                            onDeleteStudent={(student) => {
                                if (window.confirm(`Eliminar a ${student.name} y sus clases?`)) {
                                    deleteStudentMutation.mutate(student.id);
                                }
                            }}
                            onAddLesson={(student) => openLessonModal(undefined, student)}
                            onEditLesson={(lesson) => openLessonModal(lesson)}
                            onCompleteLesson={(lesson) => completeLessonMutation.mutate(lesson.id)}
                            onDeleteLesson={(lesson) => {
                                if (window.confirm(`Eliminar la clase de ${lesson.student_name || 'este alumno'}?`)) {
                                    deleteLessonMutation.mutate(lesson.id);
                                }
                            }}
                            onAddNote={openNoteModal}
                        />
                    )}

                    {activeTab === 'work' && (
                        <WorkTab
                            tasks={openTasks}
                            onAddTask={() => openTaskModal()}
                            onEditTask={openTaskModal}
                            onCompleteTask={(task) => completeTaskMutation.mutate(task.id)}
                            onDeleteTask={(task) => {
                                if (window.confirm(`Eliminar "${task.title}"?`)) {
                                    deleteTaskMutation.mutate(task.id);
                                }
                            }}
                        />
                    )}

                    {activeTab === 'focus' && focus && (
                        <FocusTab focus={focus} onSaved={invalidateLife} />
                    )}
                </>
            )}

            <Modal isOpen={studentModalOpen} onClose={() => setStudentModalOpen(false)} title={editingStudent ? 'Editar alumno' : 'Nuevo alumno'}>
                <StudentForm student={editingStudent || undefined} onSuccess={() => { setStudentModalOpen(false); invalidateLife(); }} />
            </Modal>

            <Modal isOpen={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title={editingLesson ? 'Editar clase' : 'Nueva clase'}>
                <LessonForm
                    lesson={editingLesson || undefined}
                    students={students}
                    selectedStudent={selectedStudent || undefined}
                    onSuccess={() => { setLessonModalOpen(false); setSelectedStudent(null); invalidateLife(); }}
                />
            </Modal>

            <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={editingTask ? 'Editar pendiente' : 'Nuevo pendiente'}>
                <TaskForm task={editingTask || undefined} onSuccess={() => { setTaskModalOpen(false); invalidateLife(); }} />
            </Modal>

            <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Nota de seguimiento">
                {selectedStudent && (
                    <StudentNoteForm student={selectedStudent} onSuccess={() => { setNoteModalOpen(false); setSelectedStudent(null); invalidateLife(); }} />
                )}
            </Modal>
        </div>
    );
}

function SummaryTab({
    summary,
    onCompleteLesson,
    onCompleteTask,
    onEditLesson,
    onEditTask,
}: {
    summary: NonNullable<Awaited<ReturnType<typeof lifeService.getMonthSummary>>>;
    onCompleteLesson: (lesson: Lesson) => void;
    onCompleteTask: (task: WorkTask) => void;
    onEditLesson: (lesson: Lesson) => void;
    onEditTask: (task: WorkTask) => void;
}) {
    return (
        <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard icon={Users} label="Alumnos activos" value={summary.counts.active_students} />
                <MetricCard icon={CalendarCheck} label="Clases completadas" value={`${summary.counts.completed_lessons}/${summary.counts.scheduled_lessons}`} />
                <MetricCard icon={Briefcase} label="Pendientes abiertos" value={summary.counts.open_tasks} />
                <MetricCard icon={AlertTriangle} label="Urgentes/vencidos" value={summary.counts.overdue_tasks} tone="red" />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Panel title="Hoy" icon={Clock}>
                    <ListBlock
                        emptyText="No hay clases para hoy."
                        items={summary.today_lessons}
                        render={(lesson) => (
                            <LessonRow key={lesson.id} lesson={lesson} onComplete={onCompleteLesson} onEdit={onEditLesson} />
                        )}
                    />
                    <div className="mt-4 pt-4 border-t border-brand-100">
                        <ListBlock
                            emptyText="No hay tareas para hoy."
                            items={summary.today_tasks}
                            render={(task) => (
                                <TaskRow key={task.id} task={task} onComplete={onCompleteTask} onEdit={onEditTask} />
                            )}
                        />
                    </div>
                </Panel>

                <Panel title="Proximos 7 dias" icon={CalendarClock}>
                    <ListBlock
                        emptyText="No hay clases proximas."
                        items={summary.upcoming_lessons}
                        render={(lesson) => (
                            <LessonRow key={lesson.id} lesson={lesson} onComplete={onCompleteLesson} onEdit={onEditLesson} />
                        )}
                    />
                    <div className="mt-4 pt-4 border-t border-brand-100">
                        <ListBlock
                            emptyText="No hay pendientes proximos."
                            items={summary.upcoming_tasks}
                            render={(task) => (
                                <TaskRow key={task.id} task={task} onComplete={onCompleteTask} onEdit={onEditTask} />
                            )}
                        />
                    </div>
                </Panel>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Panel title="Tareas vencidas" icon={AlertTriangle}>
                    <ListBlock
                        emptyText="No hay tareas vencidas."
                        items={summary.overdue_tasks}
                        render={(task) => (
                            <TaskRow key={task.id} task={task} onComplete={onCompleteTask} onEdit={onEditTask} />
                        )}
                    />
                </Panel>
                <Panel title="Alumnos por seguimiento" icon={GraduationCap}>
                    <ListBlock
                        emptyText="No hay seguimientos pendientes."
                        items={summary.follow_up_students}
                        render={(student) => (
                            <div key={student.id} className="rounded-xl border border-brand-100 bg-[var(--bg-main)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">{student.name}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{student.subject || 'Sin materia'}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-brand-700">Seguir {formatDate(student.next_follow_up)}</span>
                                </div>
                            </div>
                        )}
                    />
                </Panel>
            </section>

            <section className="bg-brand-700 text-white rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-medium opacity-80">Enfoque del mes</p>
                <h2 className="text-2xl font-bold mt-2">{summary.focus.company_focus || summary.focus.skills_focus || 'Define una direccion para este mes'}</h2>
                <p className="mt-2 text-white/80">{summary.focus.personal_focus || 'El mes mejora cuando tu atencion tiene un destino claro.'}</p>
            </section>
        </div>
    );
}

function StudentsTab({
    students,
    lessons,
    onAddStudent,
    onEditStudent,
    onDeleteStudent,
    onAddLesson,
    onEditLesson,
    onCompleteLesson,
    onDeleteLesson,
    onAddNote,
}: {
    students: Student[];
    lessons: Lesson[];
    onAddStudent: () => void;
    onEditStudent: (student: Student) => void;
    onDeleteStudent: (student: Student) => void;
    onAddLesson: (student: Student) => void;
    onEditLesson: (lesson: Lesson) => void;
    onCompleteLesson: (lesson: Lesson) => void;
    onDeleteLesson: (lesson: Lesson) => void;
    onAddNote: (student: Student) => void;
}) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
            <Panel title="Alumnos" icon={Users}>
                {students.length === 0 ? (
                    <EmptyState icon={GraduationCap} title="Aun no hay alumnos" text="Agrega alumnos para dar seguimiento a clases, objetivos y pendientes." actionLabel="Agregar alumno" onAction={onAddStudent} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {students.map((student) => (
                            <div key={student.id} className="rounded-2xl border border-brand-200 bg-[var(--bg-secondary)] p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{student.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">{student.subject || 'Sin materia definida'}</p>
                                    </div>
                                    <span className="rounded-full border border-brand-200 bg-[var(--bg-main)] px-3 py-1 text-xs font-semibold text-brand-700">
                                        {studentStatusLabel(student.status)}
                                    </span>
                                </div>
                                <p className="mt-4 text-sm text-[var(--text-secondary)] min-h-10">{student.goal || 'Sin objetivo registrado.'}</p>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-[var(--bg-main)] border border-brand-100 p-3">
                                        <p className="text-[var(--text-secondary)]">Seguimiento</p>
                                        <p className="font-semibold text-[var(--text-primary)]">{formatDate(student.next_follow_up)}</p>
                                    </div>
                                    <div className="rounded-xl bg-[var(--bg-main)] border border-brand-100 p-3">
                                        <p className="text-[var(--text-secondary)]">Clases prox.</p>
                                        <p className="font-semibold text-[var(--text-primary)]">{student.upcoming_lessons_count || 0}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <IconButton label="Clase" icon={CalendarPlus} onClick={() => onAddLesson(student)} />
                                    <IconButton label="Nota" icon={MessageSquarePlus} onClick={() => onAddNote(student)} />
                                    <IconButton label="Editar" icon={Pencil} onClick={() => onEditStudent(student)} />
                                    <IconButton label="Borrar" icon={Trash2} onClick={() => onDeleteStudent(student)} danger />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel title="Clases programadas" icon={BookOpen}>
                <ListBlock
                    emptyText="No hay clases programadas."
                    items={lessons}
                    render={(lesson) => (
                        <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            onComplete={onCompleteLesson}
                            onEdit={onEditLesson}
                            onDelete={onDeleteLesson}
                        />
                    )}
                />
            </Panel>
        </div>
    );
}

function WorkTab({
    tasks,
    onAddTask,
    onEditTask,
    onCompleteTask,
    onDeleteTask,
}: {
    tasks: WorkTask[];
    onAddTask: () => void;
    onEditTask: (task: WorkTask) => void;
    onCompleteTask: (task: WorkTask) => void;
    onDeleteTask: (task: WorkTask) => void;
}) {
    return (
        <Panel title="Pendientes abiertos" icon={Briefcase}>
            {tasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Sin pendientes abiertos" text="Cuando algo ocupe tu mente, registralo aqui y ponle fecha." actionLabel="Crear pendiente" onAction={onAddTask} />
            ) : (
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <TaskRow key={task.id} task={task} onComplete={onCompleteTask} onEdit={onEditTask} onDelete={onDeleteTask} />
                    ))}
                </div>
            )}
        </Panel>
    );
}

function FocusTab({ focus, onSaved }: { focus: MonthlyFocus; onSaved: () => void }) {
    const [companyFocus, setCompanyFocus] = useState(focus.company_focus || '');
    const [skillsFocus, setSkillsFocus] = useState(focus.skills_focus || '');
    const [personalFocus, setPersonalFocus] = useState(focus.personal_focus || '');
    const [healthFocus, setHealthFocus] = useState(focus.health_focus || '');
    const [notes, setNotes] = useState(focus.notes || '');
    const queryClient = useQueryClient();

    useEffect(() => {
        setCompanyFocus(focus.company_focus || '');
        setSkillsFocus(focus.skills_focus || '');
        setPersonalFocus(focus.personal_focus || '');
        setHealthFocus(focus.health_focus || '');
        setNotes(focus.notes || '');
    }, [focus]);

    const mutation = useMutation({
        mutationFn: lifeService.updateCurrentFocus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['life-focus'] });
            onSaved();
        },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            company_focus: companyFocus,
            skills_focus: skillsFocus,
            personal_focus: personalFocus,
            health_focus: healthFocus,
            notes,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <Panel title="Enfoque del mes" icon={Target}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textarea label="Empresa" value={companyFocus} onChange={setCompanyFocus} placeholder="Que necesita avanzar este mes en la empresa?" />
                    <Textarea label="Habilidades" value={skillsFocus} onChange={setSkillsFocus} placeholder="Que habilidad vas a practicar o estudiar?" />
                    <Textarea label="Enfoque personal" value={personalFocus} onChange={setPersonalFocus} placeholder="Que decision te mantiene centrado?" />
                    <Textarea label="Salud / energia" value={healthFocus} onChange={setHealthFocus} placeholder="Que habito cuida tu energia?" />
                </div>
                <div className="mt-4">
                    <Textarea label="Notas del mes" value={notes} onChange={setNotes} placeholder="Ideas, aprendizajes o recordatorios." rows={5} />
                </div>
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="mt-5 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Guardar enfoque
                </button>
            </Panel>

            <section className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-semibold text-brand-700">Recordatorio</p>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">Tu mes necesita direccion, no ruido.</h2>
                <p className="text-[var(--text-secondary)] mt-3">
                    Este apartado alimenta el resumen diario de WhatsApp cuando tienes avisos activos.
                </p>
            </section>
        </form>
    );
}

function StudentForm({ student, onSuccess }: { student?: Student; onSuccess: () => void }) {
    const [name, setName] = useState(student?.name || '');
    const [subject, setSubject] = useState(student?.subject || '');
    const [goal, setGoal] = useState(student?.goal || '');
    const [status, setStatus] = useState<StudentStatus>(student?.status || 'ACTIVE');
    const [nextFollowUp, setNextFollowUp] = useState(student?.next_follow_up || '');
    const [notes, setNotes] = useState(student?.notes || '');

    const mutation = useMutation({
        mutationFn: (payload: Partial<Student>) => student ? lifeService.updateStudent(student.id, payload) : lifeService.createStudent(payload),
        onSuccess,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            name,
            subject,
            goal,
            status,
            next_follow_up: nextFollowUp || null,
            notes,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput label="Nombre" value={name} onChange={setName} placeholder="Nombre del alumno" required />
            <TextInput label="Materia o tema" value={subject} onChange={setSubject} placeholder="Matematicas, ingles, programacion..." />
            <Textarea label="Objetivo" value={goal} onChange={setGoal} placeholder="Que estas ayudando a lograr?" />
            <div className="grid grid-cols-2 gap-3">
                <SelectInput label="Estado" value={status} onChange={(value) => setStatus(value as StudentStatus)}>
                    <option value="ACTIVE">Activo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="COMPLETED">Completado</option>
                </SelectInput>
                <DateInput label="Proximo seguimiento" value={nextFollowUp} onChange={setNextFollowUp} />
            </div>
            <Textarea label="Notas" value={notes} onChange={setNotes} placeholder="Contexto, avances, pendientes." rows={4} />
            <SubmitButton pending={mutation.isPending} label={student ? 'Actualizar alumno' : 'Guardar alumno'} disabled={!name} />
        </form>
    );
}

function LessonForm({ lesson, students, selectedStudent, onSuccess }: { lesson?: Lesson; students: Student[]; selectedStudent?: Student; onSuccess: () => void }) {
    const [studentId, setStudentId] = useState(String(lesson?.student || selectedStudent?.id || students[0]?.id || ''));
    const [scheduledAt, setScheduledAt] = useState(toDatetimeInput(lesson?.scheduled_at) || defaultDatetimeInput(24));
    const [topic, setTopic] = useState(lesson?.topic || '');
    const [homework, setHomework] = useState(lesson?.homework || '');
    const [reminderEnabled, setReminderEnabled] = useState(lesson?.reminder_enabled ?? true);
    const [reminderMinutes, setReminderMinutes] = useState(String(lesson?.reminder_minutes || 60));

    const mutation = useMutation({
        mutationFn: (payload: Partial<Lesson>) => lesson ? lifeService.updateLesson(lesson.id, payload) : lifeService.createLesson(payload),
        onSuccess,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            student: Number(studentId),
            scheduled_at: fromDatetimeInput(scheduledAt),
            topic,
            homework,
            reminder_enabled: reminderEnabled,
            reminder_minutes: Number(reminderMinutes || 0),
        });
    };

    if (students.length === 0) {
        return <p className="text-[var(--text-secondary)]">Primero agrega un alumno para poder programar clases.</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <SelectInput label="Alumno" value={studentId} onChange={setStudentId}>
                {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                ))}
            </SelectInput>
            <TextInput label="Tema de la clase" value={topic} onChange={setTopic} placeholder="Tema o bloque a revisar" required />
            <DateTimeInput label="Fecha y hora" value={scheduledAt} onChange={setScheduledAt} />
            <Textarea label="Tarea / seguimiento" value={homework} onChange={setHomework} placeholder="Que debe traer o practicar?" rows={3} />
            <ReminderInputs enabled={reminderEnabled} onEnabledChange={setReminderEnabled} minutes={reminderMinutes} onMinutesChange={setReminderMinutes} />
            <SubmitButton pending={mutation.isPending} label={lesson ? 'Actualizar clase' : 'Guardar clase'} disabled={!studentId || !topic || !scheduledAt} />
        </form>
    );
}

function TaskForm({ task, onSuccess }: { task?: WorkTask; onSuccess: () => void }) {
    const [title, setTitle] = useState(task?.title || '');
    const [area, setArea] = useState<TaskArea>(task?.area || 'WORK');
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'MEDIUM');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'PENDING');
    const [dueAt, setDueAt] = useState(toDatetimeInput(task?.due_at) || defaultDatetimeInput(48));
    const [notes, setNotes] = useState(task?.notes || '');
    const [reminderEnabled, setReminderEnabled] = useState(task?.reminder_enabled ?? true);
    const [reminderMinutes, setReminderMinutes] = useState(String(task?.reminder_minutes || 1440));

    const mutation = useMutation({
        mutationFn: (payload: Partial<WorkTask>) => task ? lifeService.updateTask(task.id, payload) : lifeService.createTask(payload),
        onSuccess,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            title,
            area,
            priority,
            status,
            due_at: dueAt ? fromDatetimeInput(dueAt) : null,
            notes,
            reminder_enabled: reminderEnabled,
            reminder_minutes: Number(reminderMinutes || 0),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput label="Pendiente" value={title} onChange={setTitle} placeholder="Que hay que resolver?" required />
            <div className="grid grid-cols-2 gap-3">
                <SelectInput label="Area" value={area} onChange={(value) => setArea(value as TaskArea)}>
                    <option value="WORK">Trabajo</option>
                    <option value="BUSINESS">Empresa</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="CLASS">Clases</option>
                </SelectInput>
                <SelectInput label="Prioridad" value={priority} onChange={(value) => setPriority(value as TaskPriority)}>
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                </SelectInput>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <SelectInput label="Estado" value={status} onChange={(value) => setStatus(value as TaskStatus)}>
                    <option value="PENDING">Pendiente</option>
                    <option value="IN_PROGRESS">En progreso</option>
                    <option value="DONE">Hecho</option>
                    <option value="CANCELED">Cancelado</option>
                </SelectInput>
                <DateTimeInput label="Fecha limite" value={dueAt} onChange={setDueAt} />
            </div>
            <Textarea label="Notas" value={notes} onChange={setNotes} placeholder="Contexto o siguiente accion." rows={4} />
            <ReminderInputs enabled={reminderEnabled} onEnabledChange={setReminderEnabled} minutes={reminderMinutes} onMinutesChange={setReminderMinutes} />
            <SubmitButton pending={mutation.isPending} label={task ? 'Actualizar pendiente' : 'Guardar pendiente'} disabled={!title} />
        </form>
    );
}

function StudentNoteForm({ student, onSuccess }: { student: Student; onSuccess: () => void }) {
    const [note, setNote] = useState('');
    const [nextFollowUp, setNextFollowUp] = useState(student.next_follow_up || '');
    const mutation = useMutation({
        mutationFn: () => lifeService.addStudentNote(student.id, { note, next_follow_up: nextFollowUp || null }),
        onSuccess,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-[var(--bg-main)] p-4">
                <p className="font-semibold text-[var(--text-primary)]">{student.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{student.subject || 'Sin materia'}</p>
            </div>
            <Textarea label="Nota nueva" value={note} onChange={setNote} placeholder="Que paso o que toca seguir?" rows={4} />
            <DateInput label="Proximo seguimiento" value={nextFollowUp} onChange={setNextFollowUp} />
            <SubmitButton pending={mutation.isPending} label="Guardar nota" disabled={!note && !nextFollowUp} />
        </form>
    );
}

function LessonRow({ lesson, onComplete, onEdit, onDelete }: { lesson: Lesson; onComplete: (lesson: Lesson) => void; onEdit: (lesson: Lesson) => void; onDelete?: (lesson: Lesson) => void }) {
    return (
        <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">{lesson.student_name || 'Alumno'}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{lesson.topic}</p>
                    <p className="text-xs text-brand-700 font-semibold mt-2">{formatDateTime(lesson.scheduled_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <IconButton label="Completar" icon={CheckCircle2} onClick={() => onComplete(lesson)} />
                    <IconButton label="Editar" icon={Pencil} onClick={() => onEdit(lesson)} />
                    {onDelete && <IconButton label="Borrar" icon={Trash2} onClick={() => onDelete(lesson)} danger />}
                </div>
            </div>
        </div>
    );
}

function TaskRow({ task, onComplete, onEdit, onDelete }: { task: WorkTask; onComplete: (task: WorkTask) => void; onEdit: (task: WorkTask) => void; onDelete?: (task: WorkTask) => void }) {
    return (
        <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)]">{task.title}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>
                            {priorityLabel(task.priority)}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {taskAreaLabel(task.area)} - {taskStatusLabel(task.status)} - {formatDateTime(task.due_at)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <IconButton label="Hecho" icon={CheckCircle2} onClick={() => onComplete(task)} />
                    <IconButton label="Editar" icon={Pencil} onClick={() => onEdit(task)} />
                    {onDelete && <IconButton label="Borrar" icon={Trash2} onClick={() => onDelete(task)} danger />}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string | number; tone?: 'red' }) {
    return (
        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">{label}</p>
                    <p className={`text-3xl font-bold mt-2 ${tone === 'red' ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>{value}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-[var(--bg-main)] border border-brand-100 flex items-center justify-center text-brand-700">
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: ReactNode }) {
    return (
        <section className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-main)] border border-brand-100 flex items-center justify-center text-brand-700">
                    <Icon size={20} />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function ListBlock<T>({ items, render, emptyText }: { items: T[]; render: (item: T) => ReactNode; emptyText: string }) {
    if (items.length === 0) {
        return <p className="text-sm text-[var(--text-secondary)] py-4">{emptyText}</p>;
    }
    return <div className="space-y-3">{items.map(render)}</div>;
}

function EmptyState({ icon: Icon, title, text, actionLabel, onAction }: { icon: typeof Users; title: string; text: string; actionLabel: string; onAction: () => void }) {
    return (
        <div className="text-center py-14 bg-[var(--bg-main)] rounded-2xl border border-dashed border-brand-200">
            <Icon size={42} className="mx-auto text-brand-400 mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-[var(--text-secondary)] mt-2 max-w-md mx-auto">{text}</p>
            <button
                type="button"
                onClick={onAction}
                className="mt-5 bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 px-5 rounded-xl inline-flex items-center gap-2"
            >
                <PlusCircle size={18} />
                {actionLabel}
            </button>
        </div>
    );
}

function IconButton({ label, icon: Icon, onClick, danger }: { label: string; icon: typeof Users; onClick: () => void; danger?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${danger ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-brand-100 hover:bg-[var(--bg-hover)]'}`}
        >
            <Icon size={15} />
            {label}
        </button>
    );
}

function TextInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</span>
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                placeholder={placeholder}
                required={required}
            />
        </label>
    );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={rows}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] resize-none"
                placeholder={placeholder}
            />
        </label>
    );
}

function SelectInput({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
            >
                {children}
            </select>
        </label>
    );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</span>
            <input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
            />
        </label>
    );
}

function DateTimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</span>
            <input
                type="datetime-local"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                required
            />
        </label>
    );
}

function ReminderInputs({ enabled, onEnabledChange, minutes, onMinutesChange }: { enabled: boolean; onEnabledChange: (value: boolean) => void; minutes: string; onMinutesChange: (value: string) => void }) {
    return (
        <div className="rounded-xl border border-brand-200 bg-[var(--bg-main)] px-4 py-3">
            <label className="flex items-center justify-between gap-3">
                <span>
                    <span className="block text-sm font-medium text-[var(--text-primary)]">Aviso por WhatsApp</span>
                    <span className="block text-xs text-[var(--text-secondary)]">Se manda una sola vez por evento.</span>
                </span>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => onEnabledChange(event.target.checked)}
                    className="h-5 w-5 accent-[var(--brand-700)]"
                />
            </label>
            {enabled && (
                <label className="block mt-3">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Minutos antes</span>
                    <input
                        type="number"
                        min="0"
                        value={minutes}
                        onChange={(event) => onMinutesChange(event.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-brand-200 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    />
                </label>
            )}
        </div>
    );
}

function SubmitButton({ pending, label, disabled }: { pending: boolean; label: string; disabled?: boolean }) {
    return (
        <button
            type="submit"
            disabled={pending || disabled}
            className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50"
        >
            {pending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {label}
        </button>
    );
}
