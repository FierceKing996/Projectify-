import { PROJECT_TEMPLATES, STANDARD_BOARD_TEMPLATE } from '../data/projectTemplates';

interface TemplateChooserProps {
    error?: string;
    isSubmitting?: boolean;
    onSelect: (templateId: string | null) => void;
}

export default function TemplateChooser({
    error = '',
    isSubmitting = false,
    onSelect
}: TemplateChooserProps) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-8 text-slate-900">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">First Login Setup</p>
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Choose a starter template for your first board</h1>
                            <p className="mt-3 text-sm text-slate-600 sm:text-base">
                                Pick one of the ready-made workflows below, or skip templates and start with the standard
                                To Do, In Progress, and Done board.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onSelect(null)}
                            disabled={isSubmitting}
                            className="rounded-full border border-slate-300 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? 'Setting up...' : 'Use Standard Board'}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    {PROJECT_TEMPLATES.map((template) => (
                        <article
                            key={template.id}
                            className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-950">{template.name}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{template.pitch}</p>
                                </div>
                                <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                                    {template.sections.length} stages
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Columns</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {template.sections.map((section) => (
                                        <span
                                            key={section.id}
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${section.isCompleted
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-700'
                                                }`}
                                        >
                                            {section.title}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Starter Tasks</p>
                                <div className="mt-3 space-y-2">
                                    {template.tasks.map((task) => (
                                        <div key={task.content} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-sm font-medium text-slate-800">{task.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Preset Labels</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {template.labels.map((label) => (
                                        <span key={label} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => onSelect(template.id)}
                                disabled={isSubmitting}
                                className="mt-6 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Setting up...' : `Use ${template.name}`}
                            </button>
                        </article>
                    ))}

                    <article className="flex h-full flex-col rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">No Template</p>
                            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{STANDARD_BOARD_TEMPLATE.name}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{STANDARD_BOARD_TEMPLATE.pitch}</p>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {STANDARD_BOARD_TEMPLATE.sections.map((section) => (
                                <span
                                    key={section.id}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${section.isCompleted
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    {section.title}
                                </span>
                            ))}
                        </div>
                        <p className="mt-5 text-sm text-slate-500">
                            This keeps the current default board structure with no starter tasks.
                        </p>
                        <button
                            type="button"
                            onClick={() => onSelect(null)}
                            disabled={isSubmitting}
                            className="mt-6 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? 'Setting up...' : 'Skip Templates'}
                        </button>
                    </article>
                </div>
            </div>
        </div>
    );
}
