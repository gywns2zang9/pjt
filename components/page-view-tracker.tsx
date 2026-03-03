"use client";

import { useEffect } from "react";

// 브라우저에 visitor_id 쿠키/localStorage가 없으면 생성
function getOrCreateVisitorId(): string {
    const key = "vid";
    let vid = localStorage.getItem(key);
    if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem(key, vid);
    }
    return vid;
}

export function PageViewTracker({ path = "/" }: { path?: string }) {
    useEffect(() => {
        // 중복 기록 방지: 세션 내에서 같은 경로는 한 번만
        const sessionKey = `pv_recorded_${path}`;
        if (sessionStorage.getItem(sessionKey)) return;

        const visitorId = getOrCreateVisitorId();
        fetch("/api/page-views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, visitorId }),
        }).then(() => {
            sessionStorage.setItem(sessionKey, "1");
        }).catch(() => {/* 조용히 실패 */ });
    }, [path]);

    return null;
}
