## 소개

개인 웹서비스(도메인 `gywns2zang9.dev`)를 위한 Next.js + Supabase 프로젝트입니다.  
Vercel(앱 호스팅)과 Cloudflare(도메인/DNS)를 사용하며, Tailwind + shadcn/ui로 스타일을 맞춥니다.

## 주요 기능
- 홈 + 방명록: 익명/이름으로 글 남기기, 좋아요/싫어요, 삭제(작성자/관리자), 페이지네이션.
- 프로필: 학력/군복무/대외활동/자격증 타임라인.
- 게임: 대기열 + 실시간 대결 요청(진행 중), 로그인 필요.
- AI / 금융: 섹션용 페이지(현재 안내 문구만 노출).
- 인증: 이메일/비밀번호, 가입 시 이름(full_name) 저장, 로그인/가입 성공 시 홈으로 이동.

## 기술 스택
- 프론트엔드: Next.js App Router, TypeScript, React Server/Client Components 혼용
- 스타일: Tailwind CSS, shadcn/ui, 커스텀 네이비·스카이 톤 팔레트
- 인증/데이터: Supabase Auth, PostgreSQL, Realtime(`postgres_changes`)
- 배포/인프라: Vercel(앱), Cloudflare(DNS), Supabase(백엔드)
- 기타: Supabase SSR 클라이언트(@supabase/ssr), Radix 기반 UI 컴포넌트

## 환경 변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # 서버 작업/로컬 스크립트 시 필요
```

> 보안 주의
> - `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트/브라우저나 퍼블릭 저장소에 노출하지 마세요.
> - 퍼블릭 레포에 `.env*` 파일을 올리지 마세요. `.gitignore`로 제외되어 있는지 확인.
> - Vercel 환경변수에만 서비스 롤 키를 넣고, 클라이언트에서는 `NEXT_PUBLIC_*` 키만 사용.

## 데이터베이스 개요 (Supabase)
- `guestbook`
  - 열: id (identity), user_id (uuid), display_name, user_email, content (<=200), created_at
  - RLS: select 모두 허용, insert/update/delete 작성자만 허용
- `guestbook_reactions` (좋아요/싫어요)
  - 열: id (uuid), entry_id (fk guestbook), user_id, reaction ("like"/"dislike"), created_at
  - RLS: select 모두 허용, insert/update/delete 작성자만
- `game_waiting`
  - 열: id (uuid), game_id (text), user_id (uuid, not null), display_name, created_at
  - Unique index: (user_id, game_id)
  - RLS: select 모두 허용, insert/update/delete 작성자만
  - 클라이언트 heartbeat 로 존재 갱신, 일정 시간 미응답 시 숨김
- `game_challenges`
  - 열: id (uuid), game_id, from_user, to_user, from_display_name, to_display_name, status (pending/accepted/declined), created_at
  - RLS: select 모두 허용, insert/update/delete 본인(from/to)만

> Realtime: `game_waiting`, `game_challenges` 테이블에서 `postgres_changes` 토글을 켜야 실시간 반영됩니다.

## 개발/실행
```bash
npm install
npm run dev
```
http://localhost:3000

## 배포 (Vercel)
- Supabase 프로젝트를 Vercel에 연동하면 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`가 자동 주입됩니다.
- 필요 시 `SUPABASE_SERVICE_ROLE_KEY`는 수동으로 Vercel 환경변수에 설정하세요(서버 작업용).

## 도메인 (Cloudflare)
- Cloudflare에서 `gywns2zang9.dev` DNS를 Vercel에 CNAME/ANAME으로 연결합니다.
- Vercel 도메인 설정에서 커스텀 도메인을 추가 후 소유권 검증을 완료하세요.

## 라우트 요약
- `/` 홈 + 방명록 (로그인 없이 읽기, 작성은 로그인)
- `/profile` 프로필
- `/ai`, `/finance` 안내 섹션
- `/games` 게임 목록 (로그인 필요, 현재 카드는 비활성화)
- `/games/[id]` 대기방 + 대결 요청 (로그인 필요)
- `/auth/login`, `/auth/signup`
