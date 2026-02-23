"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProjectConfig } from "@/app/labs/actions";
import {
    type ProjectMeta,
    type ProjectConfig,
    type ProjectStatus,
    STATUS_STYLES,
    effectiveTitle,
    effectiveDescription,
} from "@/lib/projects";

const STATUS_OPTIONS: ProjectStatus[] = ["개발중", "점검중", "완성", "중단"];

interface Props {
    project: ProjectMeta;
    config: ProjectConfig;
}

export function ProjectAdminCard({ project, config: initialConfig }: Props) {
    const [config, setConfig] = useState<ProjectConfig>(initialConfig);
    const [isPending, startTransition] = useTransition();

    const displayTitle = effectiveTitle(project, config);
    const displayDesc = effectiveDescription(config);
    const statusStyle = STATUS_STYLES[config.status];

    const handleStatus = (status: ProjectStatus) => {
        const prev = config;
        setConfig((c) => ({ ...c, status }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { status }); }
            catch { setConfig(prev); }
        });
    };

    const handleToggleWorks = () => {
        const newVal = !config.show_on_works;
        const prev = config;
        setConfig((c) => ({ ...c, show_on_works: newVal }));
        startTransition(async () => {
            try { await updateProjectConfig(project.id, { show_on_works: newVal }); }
            catch { setConfig(prev); }
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
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle.className}`}>
                            {statusStyle.label}
                        </span>
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

            {/* 상태 변경 */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">상태</p>
                <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map((s) => {
                        const style = STATUS_STYLES[s];
                        return (
                            <button
                                key={s}
                                onClick={() => handleStatus(s)}
                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${config.status === s
                                        ? style.className
                                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                                    }`}
                            >
                                {style.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 뚝-딱! 표시 토글 */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <div>
                    <p className="text-sm font-medium text-foreground">뚝-딱!에 표시</p>
                    <p className="text-xs text-muted-foreground">
                        {config.show_on_works ? "공개됩니다" : "숨겨진 상태"}
                    </p>
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
    );
}
