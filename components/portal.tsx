"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // 모달이 마운트될 때 현재 스크롤 상태 저장 및 스크롤 방지
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = "hidden";

        // 모달이 언마운트될 때 원래 스크롤 상태 복구
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    if (!mounted) return null;
    return createPortal(children, document.body);
}
