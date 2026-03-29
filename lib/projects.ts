// 코드에서는 id(컴포넌트 키)와 title(폴백)만 관리
// title·description·slug 등은 Supabase project_configs에서 관리

export interface ProjectMeta {
    id: string;     // 컴포넌트 키 + 기본 URL slug (절대 변경 불가)
    title: string;  // DB title 미설정 시 표시되는 기본값
}

export interface ProjectConfig {
    id: string;
    show_on_works: boolean;
    category: 'plays' | 'party';
    sort_order?: number;
    title?: string | null;
    description?: string | null;
    slug?: string | null;  // 커스텀 URL 경로 (미설정 시 id 사용)
    game_config?: any;     // 게임별 추가 설정
}

export const DEFAULT_CONFIG: Omit<ProjectConfig, "id"> = {
    show_on_works: true,
    category: 'plays',
    sort_order: 0,
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
    {
        id: "circle-game",
        title: "원 게임",
    },
    {
        id: "if-buy",
        title: "그때 살걸",
    },
    {
        id: "speed-game",
        title: "스피드 게임",
    },
    {
        id: "size-game",
        title: "크기 게임",
    },
    {
        id: "ddong-game",
        title: "똥 게임",
    },
    {
        id: "sort-game",
        title: "정렬 게임",
    },
    {
        id: "touch-game",
        title: "터치 게임",
    },
    {
        id: "eyes-game",
        title: "눈 게임",
    },
    {
        id: "arrow-game",
        title: "화살표 게임",
    },
    {
        id: "balloon-game",
        title: "풍선 게임",
    },
    {
        id: "bug-game",
        title: "버그 게임",
    },
    {
        id: "speed-game-multi",
        title: "같이 스피드 게임",
    },
];

export function getProjectById(id: string): ProjectMeta | undefined {
    return projects.find((p) => p.id === id);
}

export function getProjectBySlug(slug: string): ProjectMeta | undefined {
    return projects.find((p) => p.id === slug);
}
