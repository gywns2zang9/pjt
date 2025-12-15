import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 lg:py-16 space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">금융 페이지</h1>
          <p className="text-muted-foreground">금융 페이지입니다.</p>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

