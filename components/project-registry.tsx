"use client";

import { ChosungGame, type GameConfig } from "@/components/games/chosung-game";
import { CircleGame } from "@/components/games/circle-game";
import { IfBuy } from "./projects/if-buy";
import { SpeedGame } from "@/components/games/speed-game";
import { SizeGame } from "@/components/games/size-game";
import { DdongGame } from "@/components/games/ddong-game";
import { SortGame } from "@/components/games/sort-game";
import { TouchGame } from "@/components/games/touch-game";
import { EyesGame } from "@/components/games/eyes-game";
import { ArrowGame } from "@/components/games/arrow-game";

// 모든 프로젝트 컴포넌트가 공통으로 받는 props
export interface ProjectProps {
    userName: string;
    gameConfig?: Partial<GameConfig>;
    title?: string;
}

// 프로젝트 ID → 컴포넌트 매핑
// 새 프로젝트 추가 시 여기에도 등록하세요.
export const projectComponents: Record<string, React.ComponentType<ProjectProps>> = {
    "chosung-game": ChosungGame,
    "circle-game": CircleGame,
    "if-buy": IfBuy,
    "speed-game": SpeedGame,
    "size-game": SizeGame,
    "ddong-game": DdongGame,
    "sort-game": SortGame,
    "touch-game": TouchGame,
    "eyes-game": EyesGame,
    "arrow-game": ArrowGame,
};
