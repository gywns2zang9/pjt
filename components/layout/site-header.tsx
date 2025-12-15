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

  const navItems = [{ href: "/profile", label: "프로필" }];
  if (user) {
    navItems.push({ href: "/games", label: "게임" });
  }

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
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

