import HomeClient from "@/components/home-client";
import { SiteHeader } from "@/components/layout/site-header";
import { Suspense } from "react";
import HomeStats, { HomeStatsFallback } from "@/components/home-stats";

/**
 * ISR (Incremental Static Regeneration) 설정 
 * 5분 주기를 유지하지만, 통계는 클라이언트에서 비동기로 불러와 
 * 전체 페이지 초기 응답 속도를 극대화합니다.
 */
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <SiteHeader />

      <HomeClient>
        <Suspense fallback={<HomeStatsFallback />}>
          <HomeStats />
        </Suspense>
      </HomeClient>
    </>
  );
}

