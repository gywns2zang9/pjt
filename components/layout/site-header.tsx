import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { Container } from "./container";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "./nav-links";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";

/**
 * 관리자 전용 네비게이션 링크 — Suspense 안에서 비동기로 렌더링됩니다.
 * SiteHeader 본체의 렌더링을 차단하지 않습니다.
 */
async function AdminNavItems() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isAdmin = checkIsAdmin(data.user?.id);

  if (!isAdmin) return null;

  return (
    <NavLinks
      items={[{ href: "/admin", label: "관리자" }]}
      className="flex items-center gap-4 text-sm text-yellow-500 font-bold"
    />
  );
}

/**
 * SiteHeader — 인증 호출 없이 즉시 렌더링됩니다.
 * 인증이 필요한 부분(AdminNavItems, AuthButton)은 Suspense로 감싸서
 * 나머지 UI를 차단하지 않습니다.
 */
export function SiteHeader() {
  const defaultNavItems = [
    { href: "/plays", label: "혼자 뚝딱" },
    { href: "/party", label: "같이 뚝딱" },
  ];

  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur sticky top-0 z-50">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter hover:text-primary transition-all active:scale-95"
          >
            홈
          </Link>
          <NavLinks
            items={defaultNavItems}
            className="flex items-center gap-4 text-xs md:text-sm font-bold text-muted-foreground"
          />
          <Suspense>
            <AdminNavItems />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Suspense fallback={<div className="w-16 h-8" />}>
            <AuthButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
