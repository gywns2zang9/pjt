"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Gamepad2, Compass } from "lucide-react";
import { effectiveTitle, effectiveDescription, effectiveSlug, type ProjectConfig } from "@/lib/projects";

type ProjectWithStats = {
    config: ProjectConfig;
    meta: { id: string; title: string; };
    totalPlay: number;
    myPlay: number;
    myRank: number | null;
    totalPlayers: number;
};

type SortOption = "default" | "rank-asc" | "rank-desc";

export default function ProjectListClient({ projects }: { projects: ProjectWithStats[] }) {
    const [sortBy, setSortBy] = useState<SortOption>("default");

    const sortedProjects = [...projects].sort((a, b) => {
        switch (sortBy) {
            case "rank-asc": {
                // 등수 낮은 순 (1등이 먼저) — 기록 없는 사람은 뒤로
                const ra = a.myRank ?? Infinity;
                const rb = b.myRank ?? Infinity;
                if (ra !== rb) return ra - rb;
                break;
            }
            case "rank-desc": {
                // 등수 높은 순 (꼴등이 먼저) — 기록 없는 사람은 뒤로
                const ra = a.myRank ?? -1;
                const rb = b.myRank ?? -1;
                if (ra !== rb) return rb - ra;
                break;
            }
        }
        // 기본 정렬: sort_order
        const orderA = a.config.sort_order ?? 0;
        const orderB = b.config.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return b.totalPlay - a.totalPlay;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-md w-fit inline-flex items-center">
                    총 <span className="text-foreground font-bold mx-1">{projects.length}</span>개의 콘텐츠
                </p>

                {/* Sort Dropdown */}
                <div className="relative group w-full sm:w-auto">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full sm:w-auto appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium pl-4 pr-10 py-2.5 sm:py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                        <option value="default">기본순</option>
                        <option value="rank-asc">순위 높은 순</option>
                        <option value="rank-desc">순위 낮은 순</option>

                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {sortedProjects.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground text-sm border border-dashed rounded-2xl">
                    공개된 콘텐츠가 없어요
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sortedProjects.map(({ meta, config, totalPlay, myPlay, myRank, totalPlayers }) => {
                        const title = effectiveTitle(meta, config);
                        const description = effectiveDescription(config);
                        const slug = effectiveSlug(meta, config);

                        return (
                            <Link
                                key={meta.id}
                                href={`/works/${slug}`}
                                className="group block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                                                {title}
                                            </h2>
                                            {myPlay > 0 && (
                                                <div className="inline-flex items-center gap-1 bg-primary/5 dark:bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 text-primary/90 dark:text-primary/80 shrink-0">
                                                    <Gamepad2 className="w-3 h-3 text-primary/70 shrink-0" />
                                                    <span className="text-[10px] font-bold tracking-wide">{myPlay.toLocaleString()}회</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                            {description}
                                        </p>


                                    </div>

                                    {/* Rank */}
                                    {myRank !== null && totalPlayers > 0 && (
                                        <div className="shrink-0 text-right">
                                            <span className="text-2xl font-black text-foreground tabular-nums">{myRank}</span>
                                            <span className="text-xs text-muted-foreground font-medium">등 / {totalPlayers}명</span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
