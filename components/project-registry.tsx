"use client";

import dynamic from "next/dynamic";
import { type GameConfig } from "@/components/games/chosung-game";

// 모든 프로젝트 컴포넌트가 공통으로 받는 props
export interface ProjectProps {
    userName: string;
    gameConfig?: Partial<GameConfig>;
    title?: string;
}

/**
 * 게임 컴포넌트를 next/dynamic으로 lazy load합니다.
 * 이렇게 하면 Works 목록 페이지에서는 ~270KB+ 번들을 로딩하지 않고,
 * 실제 게임 페이지에 진입할 때만 해당 게임 코드를 다운로드합니다.
 */
const ChosungGame = dynamic(() => import("@/components/games/chosung-game").then(m => m.ChosungGame));
const CircleGame = dynamic(() => import("@/components/games/circle-game").then(m => m.CircleGame));
const IfBuy = dynamic(() => import("@/components/projects/if-buy").then(m => m.IfBuy));
const SpeedGame = dynamic(() => import("@/components/games/speed-game").then(m => m.SpeedGame));
const SizeGame = dynamic(() => import("@/components/games/size-game").then(m => m.SizeGame));
const DdongGame = dynamic(() => import("@/components/games/ddong-game").then(m => m.DdongGame));
const SortGame = dynamic(() => import("@/components/games/sort-game").then(m => m.SortGame));
const TouchGame = dynamic(() => import("@/components/games/touch-game").then(m => m.TouchGame));
const EyesGame = dynamic(() => import("@/components/games/eyes-game").then(m => m.EyesGame));
const ArrowGame = dynamic(() => import("@/components/games/arrow-game").then(m => m.ArrowGame));
const BalloonGame = dynamic(() => import("@/components/games/balloon-game").then(m => m.BalloonGame));
const BugGame = dynamic(() => import("@/components/games/bug-game").then(m => m.BugGame));

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
    "balloon-game": BalloonGame,
    "bug-game": BugGame,
};

