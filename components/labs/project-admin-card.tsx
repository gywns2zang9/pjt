"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProjectConfig } from "@/app/admin/actions";
import {
    type ProjectMeta,
    type ProjectConfig,
    effectiveTitle,
    effectiveDescription,
} from "@/lib/projects";

interface Props {
    project: ProjectMeta;
    config: ProjectConfig;
}

export function ProjectAdminCard({ project, config: initialConfig }: Props) {
    const [config, setConfig] = useState<ProjectConfig>(initialConfig);
    const [isPending, startTransition] = useTransition();

    const displayTitle = effectiveTitle(project, config);
    const displayDesc = effectiveDescription(config);

    const handleTogglePublication = () => {
        const newVal = !config.show_on_works;
        const prev = config;
        setConfig((c) => ({ ...c, show_on_works: newVal }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { show_on_works: newVal }); }
            catch { setConfig(prev); }
        });
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value as 'plays' | 'party';
        const prev = config;
        setConfig((c) => ({ ...c, category: newCategory }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { category: newCategory }); }
            catch { setConfig(prev); }
        });
    };

    const handleSortOrder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOrder = Number(e.target.value);
        if (isNaN(newOrder)) return;

        const prev = config;
        setConfig((c) => ({ ...c, sort_order: newOrder }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { sort_order: newOrder }); }
            catch {
                setConfig(prev);
                alert("저장에 실패했습니다.");
            }
        });
    };

    return (
        <div
            className={`rounded-2xl border bg-card p-5 space-y-4 transition-all duration-200 ${isPending ? "opacity-60 pointer-events-none" : ""
                } ${config.show_on_works ? "border-primary/30" : "border-border"}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-base text-foreground">{displayTitle}</h2>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            config.category === 'party' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                            {config.category === 'party' ? '같이 뚝딱' : '혼자 뚝딱'}
                        </span>
                    </div>
                    {displayDesc && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1">{displayDesc}</p>
                    )}
                </div>

                <Link
                    href={`/admin/${project.id}`}
                    title="설정"
                    className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </Link>
            </div>

            <div className="grid gap-4 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">콘텐츠 관리</p>
                        <p className="text-[11px] text-muted-foreground">목록 공개 상태 및 위치</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">분류</label>
                        <select
                            value={config.category}
                            onChange={handleCategoryChange}
                            className="text-xs font-semibold bg-background border border-border rounded-lg px-2 py-1 outline-none focus:border-primary transition-all cursor-pointer"
                        >
                            <option value="plays">혼자 뚝딱</option>
                            <option value="party">같이 뚝딱</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">순서</label>
                        <input
                            type="number"
                            value={config.sort_order ?? 0}
                            onChange={handleSortOrder}
                            className="w-12 px-2 py-1 text-xs font-bold bg-background border border-border rounded-lg outline-none focus:border-primary text-center"
                        />
                    </div>

                    <div className="flex-1 flex justify-end">
                        <button
                            onClick={handleTogglePublication}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ${config.show_on_works ? "bg-primary border-primary" : "bg-muted border-muted"
                                }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${config.show_on_works ? "translate-x-5" : "translate-x-0.5"
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
