"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    updateProjectMeta,
    resetGameRanking,
} from "@/app/admin/actions";
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
        if (slug && !/^[a-zA-Z0-9-_]+$/.test(slug)) {
            alert("URL 경로는 영문, 숫자, 하이픈(-) 및 언더스코어(_)만 사용할 수 있습니다.");
            return;
        }

        startMetaTransition(async () => {
            try {
                await updateProjectMeta(project.id, title, desc, slug);
                setMetaSaved(true);
                setTimeout(() => setMetaSaved(false), 2000);
                router.refresh();
            } catch (err: any) {
                console.error("Meta save error:", err);
                if (err?.code === "23505" || err?.message?.includes("23505") || err?.message?.includes("duplicate")) {
                    alert("이미 사용 중인 URL 경로입니다. 다른 경로를 입력해주세요.");
                } else {
                    alert("저장에 실패했습니다. 관리자에게 문의하세요.");
                }
            }
        });
    };

    const handleResetRanking = () => {
        if (!window.confirm("랭킹을 초기화하시겠습니까?\n전체 점수 기록이 삭제되며 복구할 수 없습니다.")) return;
        startResetTransition(async () => {
            try {
                await resetGameRanking(project.id);
                alert("랭킹이 초기화되었습니다.");
                router.refresh();
            } catch (error) {
                console.error(error);
                alert("초기화 실패");
            }
        });
    };

    const baseUrlPrefix = initialConfig.category === 'party' ? '/party/' : '/plays/';

    return (
        <div className="space-y-6 max-w-xl">

            {/* ── 기본 정보 ── */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    기본 정보
                </h2>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">프로젝트 이름</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={project.title}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">설명</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="프로젝트 설명 (선택)"
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">URL 경로</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-2 rounded-lg border border-border shrink-0">{baseUrlPrefix}</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                                placeholder="test"
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 font-medium">
                            영문·숫자·하이픈만 가능 · 미설정 시 <span className="font-mono text-primary/80">{project.id}</span> 사용
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveMeta}
                    disabled={isSavingMeta}
                    className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm ${metaSaved
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-900 dark:bg-slate-50 text-slate-50 dark:text-slate-900 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        }`}
                >
                    {isSavingMeta ? "저장 중..." : metaSaved ? "✅ 저장됨" : "적용하기"}
                </button>
            </section>

            {/* ── 위험 구역 ── */}
            {hasRanking && (
                <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        위험 구역
                    </h2>
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold text-foreground leading-none">랭킹 초기화</p>
                            <p className="text-xs text-muted-foreground font-medium">전체 점수 기록을 영구적으로 삭제합니다.</p>
                        </div>
                        <button
                            onClick={handleResetRanking}
                            disabled={isResetting}
                            className="shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter border-2 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 active:scale-95"
                        >
                            {isResetting ? "삭제 중..." : "RESET"}
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
