"use client";

import { ChosungGame, type GameConfig } from "@/components/games/chosung-game";
import { CircleGame } from "@/components/games/circle-game";
import { IfBuy } from "./projects/if-buy";

// 모든 프로젝트 컴포넌트가 공통으로 받는 props
export interface ProjectProps {
    userName: string;
    gameConfig?: Partial<GameConfig>;
}

// 프로젝트 ID → 컴포넌트 매핑
// 새 프로젝트 추가 시 여기에도 등록하세요.
export const projectComponents: Record<string, React.ComponentType<ProjectProps>> = {
    "chosung-game": ChosungGame,
    "circle-game": CircleGame,
    "if-buy": IfBuy,
};
