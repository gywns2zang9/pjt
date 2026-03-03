import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { Container } from "./container";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "./nav-links";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const isAdmin = checkIsAdmin(user?.id);

  const navItems = [
    { href: "/works", label: "뚝-딱!" },
    ...(isAdmin ? [{ href: "/labs", label: "뚝딱~ing" }] : []),
  ];

  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-lg font-black tracking-normal hover:text-primary transition-colors pl-1 py-1"
          >
            뚝딱실
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

