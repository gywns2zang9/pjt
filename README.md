# 🛠️ 뚝딱실 (Ddukddak Lab)

> 뚝딱뚝딱 만들고, 뚝딱거리며 실험하는 공간

## 소개

**뚝딱실**은 다양한 아이디어를 빠르게 구현하고 실험하는 개인 웹 프로젝트입니다.  
"뚝딱" 만들어보고, 때론 "뚝딱거리며" 배우는 과정을 즐깁니다.

- 🌐 도메인: `gywns2zang9.dev`
- 🚀 호스팅: Vercel
- 🔐 인증/DB: Supabase
- 🎨 스타일: Tailwind CSS + shadcn/ui

## 🎯 프로젝트 철학

- **빠른 실험**: 아이디어를 빠르게 구현하고 테스트
- **지속적인 학습**: 새로운 기술과 패턴 시도
- **실용적 접근**: 완벽함보다 작동하는 것을 우선

## 주요 기능

### 🏠 홈 + 방명록
- 카카오톡 로그인으로 간편하게 글 남기기
- 익명/실명 선택 가능
- 좋아요/싫어요 반응
- 실시간 업데이트

### 🧪 Labs (실험실)
뚝딱뚝딱 만든 다양한 실험적 기능들이 모이는 공간
- 새로운 아이디어 프로토타입
- 재미있는 미니 프로젝트
- 유용한 도구들

### 👤 프로필
개인 이력 및 활동 타임라인

## 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, React Server/Client Components
- **Styling**: Tailwind CSS, shadcn/ui
- **Auth**: Supabase Auth (Kakao OAuth)
- **Database**: Supabase PostgreSQL + Realtime
- **Deployment**: Vercel
- **DNS**: Cloudflare

## 환경 변수 (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 개발 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인

## 데이터베이스 스키마

### guestbook
방명록 데이터
- `id`, `user_id`, `display_name`, `user_email`, `content`, `created_at`

### guestbook_reactions
좋아요/싫어요 반응
- `id`, `entry_id`, `user_id`, `type` (like/dislike), `created_at`

## 라우트 구조

```
/                 # 홈 + 방명록
/labs             # 실험실 (다양한 프로젝트들)
/profile          # 개인 프로필
/auth/login       # 카카오 로그인
```

## 📝 라이선스

개인 프로젝트 - 학습 및 실험 목적

---

**만든 사람**: gywns2zang9  
**연락**: gywns2zang9@naver.com

