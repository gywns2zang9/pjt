"use client";

import { projectComponents } from "./project-registry";
import { type GameConfig } from "@/components/games/chosung-game";

interface Props {
    id: string;
    userName: string;
    gameConfig?: Partial<GameConfig>;
}

export function ProjectRenderer({ id, userName, gameConfig }: Props) {
    const Component = projectComponents[id];

    if (!Component) {
        return (
            <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
                컴포넌트를 불러올 수 없습니다.
            </div>
        );
    }

    return <Component userName={userName} gameConfig={gameConfig} />;
}
