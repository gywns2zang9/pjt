import Link from "next/link";
import { Mail } from "lucide-react";

import { Container } from "./container";


function IconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary hover:text-primary"
      aria-label={label}
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80">
      <Container className="flex flex-col gap-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-end">
        <div className="flex items-center justify-center gap-3 md:justify-end">
          <IconButton href="mailto:gywns2zang9@naver.com" label="이메일">
            <Mail className="h-5 w-5" />
          </IconButton>
          <IconButton href="https://gywns2zang9.tistory.com/" label="티스토리">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="7" cy="5.5" r="2.5" />
              <circle cx="14" cy="5.5" r="2.5" />
              <circle cx="7" cy="12" r="2.5" />
              <circle cx="14" cy="18.5" r="2.5" />
            </svg>
          </IconButton>
          <IconButton href="https://open.kakao.com/o/s986705h" label="카카오톡">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 3C6.477 3 2 6.58 2 11.02c0 2.64 1.75 4.96 4.4 6.35-.14.53-.9 3.35-.93 3.57 0 0-.02.17.09.24.11.07.24.02.24.02.32-.05 3.72-2.45 4.31-2.86.6.09 1.21.14 1.84.14 5.523 0 10-3.58 10-8.02C22 6.58 17.523 3 12 3Z" />
            </svg>
          </IconButton>
          <IconButton href="https://www.instagram.com/gywns2zang9" label="인스타그램">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          </IconButton>
          <IconButton href="https://www.linkedin.com/in/gywns2zang9/" label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5C0 2.12 1.08 1 2.48 1s2.5 1.12 2.5 2.5ZM.24 8.25h4.5V23h-4.5V8.25Zm7.98 0h4.3v2h.06c.6-1.1 2.08-2.25 4.28-2.25 4.58 0 5.42 2.85 5.42 6.56V23h-4.5v-7.5c0-1.78-.04-4.06-2.48-4.06-2.48 0-2.86 1.94-2.86 3.94V23h-4.5V8.25Z" />
            </svg>
          </IconButton>
        </div>
      </Container>
    </footer>
  );
}

