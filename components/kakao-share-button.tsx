"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KakaoShareButtonProps {
    userName: string;
    gameTitle: string;
    gameUrl: string; // ex) /works/size-game
    displayScore?: string;
    rank?: number | null;
}

export function KakaoShareButton({ userName, gameTitle, gameUrl, displayScore, rank }: KakaoShareButtonProps) {
    let cardTitle = "";
    let cardDescription = "";
    let cardButtonTitle = "";
    let uiButtonText = "";

    if (rank === 1 && displayScore) {
        cardTitle = `[뚝딱실] - ${userName}님 경쟁 상대가 없네요.`;
        cardDescription = `"${gameTitle}"에서 ${displayScore}(1등)을 달성했어요!`;
        cardButtonTitle = `[${gameTitle}] 바로가기`;
        uiButtonText = "내 점수 자랑하기"; ``
    } else if (rank === 2 && displayScore) {
        cardTitle = `[뚝딱실] - ${userName}님이 자랑해요.`;
        cardDescription = `${userName}님이 "${gameTitle}"에서 ${displayScore}을 달성했다고 자랑해요.`;
        cardButtonTitle = `[${gameTitle}] 바로가기`;
        uiButtonText = "내 점수 자랑하기";
    } else if (rank === 3 && displayScore) {
        cardTitle = `[뚝딱실] - 3등이 자랑하기 있나요?`;
        cardDescription = `${userName}님이 "${gameTitle}" 점수를 자랑해요.`;
        cardButtonTitle = `[${gameTitle}] 바로가기`;
        uiButtonText = "내 점수 자랑하기";
    } else if (rank !== null && rank !== undefined && rank >= 4 && displayScore) {
        cardTitle = `[뚝딱실] - [${gameTitle}] 같이해요.`;
        cardDescription = `${userName}님이 "${gameTitle}"에서 ${displayScore}을 달성했어요.`;
        cardButtonTitle = `[${gameTitle}] 바로가기`;
        uiButtonText = "내 점수 공유하기";
    } else {
        cardTitle = `[뚝딱실] - [${gameTitle}] 같이 해요~`;
        cardDescription = `${userName}님이 "${gameTitle}"에 초대했어요!`;
        cardButtonTitle = `바로가기`;
        uiButtonText = "초대하기";
    }

    const handleShare = () => {
        // @ts-ignore
        if (window.Kakao && window.Kakao.isInitialized()) {
            // @ts-ignore
            window.Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                    title: cardTitle,
                    description: cardDescription,
                    imageUrl: "https://www.gywns2zang9.dev/og-image.png", // 프로젝트 OG 이미지 사용 권장
                    link: {
                        mobileWebUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                        webUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                    },
                },
                buttons: [
                    {
                        title: cardButtonTitle,
                        link: {
                            mobileWebUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                            webUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                        },
                    },
                ],
            });
        } else {
            alert("잠시 후 다시 시도해 주세요.");
        }
    };

    return (
        <Button
            variant="outline"
            className="w-full h-12 border-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-500 font-bold transition-all shadow-sm group relative"
            onClick={handleShare}
        >
            <Share2 className="w-4 h-4 mr-2" />
            {uiButtonText}
        </Button>
    );
}
