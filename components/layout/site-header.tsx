import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { Container } from "./container";
import { NavLinks } from "./nav-links";

const navItems = [
  { href: "/profile", label: "프로필" },
];

export function SiteHeader() {
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
          <NavLinks items={navItems} />
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

