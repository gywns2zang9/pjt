import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

export default function PartyLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    <div className="space-y-1">
                        <div className="w-48 h-7 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="w-32 h-8 bg-muted rounded-md animate-pulse" />
                        <div className="w-24 h-9 bg-muted rounded-xl animate-pulse" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="w-3/4 h-5 bg-muted rounded animate-pulse" />
                                        <div className="w-full h-4 bg-muted/60 rounded animate-pulse" />
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className="w-8 h-6 bg-muted rounded animate-pulse" />
                                        <div className="w-14 h-3 bg-muted/60 rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </main>
        </div>
    );
}
