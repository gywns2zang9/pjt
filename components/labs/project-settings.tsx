"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    updateProjectMeta,
    resetChosungRanking,
    resetCircleRanking,
    resetSpeedRanking,
} from "@/app/labs/actions";
import {
    type ProjectMeta,
    type ProjectConfig,
    effectiveTitle,
    effectiveDescription,
    effectiveSlug,
} from "@/lib/projects";

interface Props {
    project: ProjectMeta;
    config: ProjectConfig;
    hasRanking?: boolean;
}

export function ProjectSettings({ project, config: initialConfig, hasRanking }: Props) {
    const router = useRouter();

    // ── 기본 정보 ──
    const [title, setTitle] = useState(effectiveTitle(project, initialConfig));
    const [desc, setDesc] = useState(effectiveDescription(initialConfig));
    const [slug, setSlug] = useState(effectiveSlug(project, initialConfig));
    const [isSavingMeta, startMetaTransition] = useTransition();
    const [metaSaved, setMetaSaved] = useState(false);

    // ── 랭킹 초기화 ──
    const [isResetting, startResetTransition] = useTransition();

    const handleSaveMeta = () => {
        startMetaTransition(async () => {
            await updateProjectMeta(project.id, title, desc, slug);
            setMetaSaved(true);
            setTimeout(() => setMetaSaved(false), 2000);
            router.refresh();
        });
    };

    const handleResetRanking = () => {
        if (!window.confirm("랭킹을 초기화하시겠습니까?\n전체 점수 기록이 삭제되며 복구할 수 없습니다.")) return;
        startResetTransition(async () => {
            if (project.id === "chosung-game") {
                await resetChosungRanking();
            } else if (project.id === "circle-game") {
                await resetCircleRanking();
            } else if (project.id === "speed-test") {
                await resetSpeedRanking();
            }
        });
    };

    return (
        <div className="space-y-6 max-w-xl">

            {/* ── 기본 정보 ── */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">기본 정보</h2>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">프로젝트 이름</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={project.title}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">설명</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="프로젝트 설명 (선택)"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">URL 경로</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">/works/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                                placeholder="test"
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground/50">
                            영문·숫자·하이픈만 가능 · 미설정 시 <span className="font-mono">{project.id}</span> 사용
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveMeta}
                    disabled={isSavingMeta}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${metaSaved
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        }`}
                >
                    {isSavingMeta ? "저장 중..." : metaSaved ? "✅ 저장됨" : "저장"}
                </button>
            </section>

            {/* ── 위험 구역 ── */}
            {hasRanking && (
                <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-destructive">위험 구역</h2>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-foreground">랭킹 초기화</p>
                            <p className="text-xs text-muted-foreground">전체 점수 기록을 삭제합니다. 복구 불가.</p>
                        </div>
                        <button
                            onClick={handleResetRanking}
                            disabled={isResetting}
                            className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        >
                            {isResetting ? "삭제 중..." : "초기화"}
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
