"use client";

import Link from "next/link";
import { ArrowRight, LayoutGrid, MessageCircle, Users, Eye } from "lucide-react";
import { Container } from "@/components/layout/container";
import { PageViewTracker } from "@/components/page-view-tracker";

export default function HomeClient({
    projectCount,
    totalFeedback,
    userCount,
    visitorCount
}: {
    projectCount: number,
    totalFeedback: number,
    userCount: number,
    visitorCount: number
}) {

    return (
        <div className="bg-[#020617] text-slate-100 overflow-x-hidden selection:bg-primary/30">
            <PageViewTracker path="/" />
            <main>
                <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12">
                    {/* 배경 앰비언트 */}
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
                        <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] bg-blue-600/5 rounded-full blur-[100px]" />
                    </div>

                    <Container className="relative z-10 flex flex-col items-center text-center space-y-10">
                        <div
                            className="space-y-6"
                        >
                            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight drop-shadow-2xl">
                                뚝딱실<br />
                            </h1>
                        </div>

                        <div className="flex flex-col items-center gap-16 w-full max-w-5xl">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 pt-10 border-t border-white/5 w-full">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1">
                                        <Eye className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-3xl font-black text-white italic">{visitorCount}회</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">총 방문</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-3xl font-black text-white italic">{userCount}명</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">가입자</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1">
                                        <LayoutGrid className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-3xl font-black text-white italic">{projectCount}개</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">작업물</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1">
                                        <MessageCircle className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-3xl font-black text-white italic">{totalFeedback}개</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">의견</span>
                                </div>
                            </div>
                        </div>
                    </Container>

                    {/* 시작하기 버튼 */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                        <Link
                            href="/works"
                            className="group relative flex items-center gap-3 px-8 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-500 hover:scale-105"
                        >
                            {/* 그라데이션 테두리 */}
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/60 via-blue-400/40 to-primary/60 p-px">
                                <span className="absolute inset-0 rounded-full bg-slate-950/80 backdrop-blur-sm" />
                            </span>
                            {/* 호버 글로우 */}
                            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] blur-sm" />
                            <span className="relative text-slate-300 group-hover:text-white transition-colors duration-300">시작하기</span>
                            <ArrowRight className="relative w-3.5 h-3.5 text-primary group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
