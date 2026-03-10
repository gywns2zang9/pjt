"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KakaoShareButtonProps {
    title: string;
    description: string;
    gameUrl: string; // ex) /works/size-game
    score?: number;
}

export function KakaoShareButton({ title, description, gameUrl, score }: KakaoShareButtonProps) {
    const handleShare = () => {
        // @ts-ignore
        if (window.Kakao && window.Kakao.isInitialized()) {
            // @ts-ignore
            window.Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                    title: title,
                    description: description,
                    imageUrl: "https://www.gywns2zang9.dev/og-image.png", // 프로젝트 OG 이미지 사용 권장
                    link: {
                        mobileWebUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                        webUrl: `https://www.gywns2zang9.dev${gameUrl}`,
                    },
                },
                buttons: [
                    {
                        title: "내 실력 보여주기",
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
            {(score !== undefined && score !== null) ? "내 점수 자랑하기" : "친구 초대하기"}
        </Button>
    );
}
