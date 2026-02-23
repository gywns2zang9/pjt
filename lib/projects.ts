// 코드에서는 id(컴포넌트 키)와 title(폴백)만 관리
// title·description·slug 등은 Supabase project_configs에서 관리

export interface ProjectMeta {
    id: string;     // 컴포넌트 키 + 기본 URL slug (절대 변경 불가)
    title: string;  // DB title 미설정 시 표시되는 기본값
}

export type ProjectStatus = "개발중" | "점검중" | "완성" | "중단";

export interface ProjectConfig {
    id: string;
    status: ProjectStatus;
    show_on_works: boolean;
    title?: string | null;
    description?: string | null;
    slug?: string | null;  // 커스텀 URL 경로 (미설정 시 id 사용)
}

export const STATUS_STYLES: Record<ProjectStatus, { label: string; className: string }> = {
    "개발중": {
        label: "개발중",
        className: "bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
    },
    "점검중": {
        label: "점검중",
        className: "bg-orange-400/15 text-orange-600 dark:text-orange-400 border-orange-400/30",
    },
    "완성": {
        label: "완성",
        className: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30",
    },
    "중단": {
        label: "중단",
        className: "bg-slate-400/15 text-slate-500 dark:text-slate-400 border-slate-400/30",
    },
};

export const DEFAULT_CONFIG: Omit<ProjectConfig, "id"> = {
    status: "개발중",
    show_on_works: false,
};

// ─── DB 값 우선, 없으면 정적 메타 폴백 ──────────────────────
export function effectiveTitle(meta: ProjectMeta, config: ProjectConfig): string {
    return config.title?.trim() || meta.title;
}
export function effectiveDescription(config: ProjectConfig): string {
    return config.description?.trim() || "";
}
export function effectiveSlug(meta: ProjectMeta, config: ProjectConfig): string {
    return config.slug?.trim() || meta.id;
}

// ─── 프로젝트 컴포넌트 키 목록 ──────────────────────────────
// 새 프로젝트 추가 시 여기 + components/project-registry.tsx 두 곳만 수정
export const projects: ProjectMeta[] = [
    {
        id: "chosung-game",
        title: "초성게임",
    },
];

export function getProjectById(id: string): ProjectMeta | undefined {
    return projects.find((p) => p.id === id);
}

export function getProjectBySlug(slug: string): ProjectMeta | undefined {
    return projects.find((p) => p.id === slug);
}
