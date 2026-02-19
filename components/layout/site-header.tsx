import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { Container } from "./container";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "./nav-links";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const navItems = [
    { href: "/works", label: "뚝-딱!" },
    { href: "/labs", label: "뚝딱~ing" },
  ];

  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight hover:text-primary"
          >
            홈
          </Link>
          <NavLinks
            items={navItems}
            className="flex items-center gap-4 text-sm text-muted-foreground md:flex"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="https://pf.kakao.com/_xohxazX"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground transition hover:text-primary"
            aria-label="카카오톡 문의"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 3C6.477 3 2 6.58 2 11.02c0 2.64 1.75 4.96 4.4 6.35-.14.53-.9 3.35-.93 3.57 0 0-.02.17.09.24.11.07.24.02.24.02.32-.05 3.72-2.45 4.31-2.86.6.09 1.21.14 1.84.14 5.523 0 10-3.58 10-8.02C22 6.58 17.523 3 12 3Z" />
            </svg>
            <span className="hidden sm:inline">카카오톡 문의</span>
          </Link>
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

