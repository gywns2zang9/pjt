import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

export default function PartyGameLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-6">
                    <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                    <div className="space-y-4">
                        <div className="w-40 h-7 bg-muted rounded animate-pulse" />
                        <div className="w-64 h-4 bg-muted/60 rounded animate-pulse" />
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <div className="w-full aspect-video max-h-[500px] bg-muted/50 rounded-xl animate-pulse" />
                    </div>
                </Container>
            </main>
        </div>
    );
}
