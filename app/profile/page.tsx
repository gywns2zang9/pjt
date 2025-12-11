import { Award, User2 } from "lucide-react";
import Image from "next/image";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TimelineItem = {
  title: string;
  subtitle?: string;
  period: string;
  description?: string;
  meta?: string;
};

const profile = {
  name: "김효준",
  birth: "1999.07.19 (양력)",
  image: "", // 추후 /public/profile.jpg 등 로컬 파일 경로로 교체하세요.
};

const experiences: TimelineItem[] = [
  {
    title: "Ackerton Technology Services",
    subtitle: "Team AI",
    period: "2025.08.21 ~ 재직중",
    description: "AI 서비스 개발·운영",
  },
];

const education: TimelineItem[] = [
  {
    title: "(경기) 한신대학교",
    subtitle: "수리금융학과 (학사)",
    period: "2018.03.02 ~ 2024.02.16",
  },
  {
    title: "(경기) 양명고등학교",
    period: "2015.03.02 ~ 2018.02.07",
  },
  {
    title: "(경기) 호계중학교",
    period: "2012.03.02 ~ 2015.02.11",
  },
  {
    title: "(경기) 삼성초등학교",
    period: "2006.03.02 ~ 2012.02.17",
  },
];

const military: TimelineItem[] = [
  {
    title: "대한민국 육군",
    period: "2019.02.12 ~ 2020.09.16 (만기 전역)",
  },
];

const activities: TimelineItem[] = [
  {
    title: "2025 금융 AI Challenge",
    period: "2025.07.14 ~ 2025.09.19",
    description: "맞춤형 금융 서비스 아이디어 공모전",
  },
  {
    title: "SK AI Leader Academy (SKALA)",
    period: "2025.02.03 ~ 2025.07.08",
    description: "AI 서비스 개발 과정 (908시간)",
  },
  {
    title: "삼성 청년 SW 아카데미 (SSAFY)",
    period: "2024.01.02 ~ 2024.12.31",
    description: "1학기 집중 코딩교육 (800시간)\n2학기 심화 프로젝트 (800시간)",
  },
  {
    title: "삼성생명 금융 아카데미",
    period: "2023.10.23 ~ 2023.10.27",
    description:
      "금융 전반(은행·증권·보험·부동산·세금)과 최신 트렌드 학습 및 재무·은퇴 설계 실습",
  },
];

const certifications: TimelineItem[] = [
  {
    title: "SQLD",
    subtitle: "한국데이터산업진흥원",
    period: "2025.06.27 ~ 2027.06.27",
    meta: "SQLD-057014283",
  },
  {
    title: "ADsP",
    subtitle: "한국데이터산업진흥원",
    period: "2025.06.13 ~ ",
    meta: "ADsP-045014578",
  },
  {
    title: "OPIc (영어) IM1",
    subtitle: "ACTFL",
    period: "2024.09.07 ~ 2026.09.06",
    meta: "2A0251225458",
  },
  {
    title: "자산관리사(FP)",
    subtitle: "한국금융연수원",
    period: "2023.04.28 ~ 2026.12.31",
    meta: "2304035545",
  },
];

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-6 border-l border-border/70 pl-6">
      <div className="absolute left-[-4px] top-0 h-3 w-3 rounded-full bg-primary" />
      {items.map((item, idx) => (
        <div key={`${item.title}-${idx}`} className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary/70" />
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {item.period}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/60 p-4 shadow-sm">
            <p className="text-base font-semibold text-foreground">
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            ) : null}
            {item.description ? (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                {item.description}
              </p>
            ) : null}
            {item.meta ? (
              <p className="mt-1 text-xs text-muted-foreground">#{item.meta}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <SiteHeader />
      <Container className="py-12 lg:py-16 space-y-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-primary/20 via-primary/50 to-slate-900 text-3xl font-bold text-white shadow-lg">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt="프로필 사진"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  HJ
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User2 size={14} />
                {profile.birth}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>경력</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={experiences} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>대외활동</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={activities} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>학력</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={education} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>병역</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={military} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award size={18} />
                자격증
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {certifications.map((cert, idx) => (
                  <div
                    key={`${cert.title}-${idx}`}
                    className="rounded-lg border border-border/70 bg-muted/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {cert.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {cert.period}
                      </span>
                    </div>
                    {cert.subtitle ? (
                      <p className="text-sm text-muted-foreground">
                        {cert.subtitle}
                      </p>
                    ) : null}
                    {cert.meta ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{cert.meta}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}

