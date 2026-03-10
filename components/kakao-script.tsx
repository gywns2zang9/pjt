"use client";

import Script from "next/script";

export function KakaoScript() {
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

    if (!KAKAO_KEY) {
        console.warn("NEXT_PUBLIC_KAKAO_JS_KEY is not set. Kakao SDK will not initialize.");
        return null;
    }

    const handleLoad = () => {
        // @ts-ignore
        if (window.Kakao && !window.Kakao.isInitialized()) {
            // @ts-ignore
            window.Kakao.init(KAKAO_KEY);
            console.log("Kakao SDK Initialized");
        }
    };

    return (
        <Script
            src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
            crossOrigin="anonymous"
            onLoad={handleLoad}
            strategy="lazyOnload"
        />
    );
}
