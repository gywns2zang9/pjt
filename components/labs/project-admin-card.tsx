"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProjectConfig } from "@/app/labs/actions";
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

    const handleToggleWorks = () => {
        const newVal = !config.show_on_works;
        const prev = config;
        setConfig((c) => ({ ...c, show_on_works: newVal }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { show_on_works: newVal }); }
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
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-base text-foreground">{displayTitle}</h2>
                    </div>
                    {displayDesc && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{displayDesc}</p>
                    )}
                </div>

                {/* 설정 버튼 */}
                <Link
                    href={`/labs/${project.id}`}
                    title="설정"
                    className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </Link>
            </div>



            {/* 뚝-딱! 표시 토글 */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <div>
                    <p className="text-sm font-medium text-foreground">뚝-딱!에 표시</p>
                    <p className="text-xs text-muted-foreground">
                        {config.show_on_works ? "공개됩니다" : "숨겨진 상태"}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">순위 정렬</label>
                        <input
                            type="number"
                            value={config.sort_order ?? 0}
                            onChange={handleSortOrder}
                            className="w-14 px-2 py-1 text-sm bg-background border border-border rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            title="낮을수록 먼저 표시됩니다"
                        />
                    </div>
                    <button
                        onClick={handleToggleWorks}
                        aria-label="뚝-딱 표시 토글"
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
    );
}
