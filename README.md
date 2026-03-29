# 🛠️ 뚝딱실

> 뚝딱뚝딱 만들고, 뚝딱거리며 실험하는 공간

## 소개

**뚝딱실**은 다양한 아이디어를 빠르게 구현해보며 실험하는 개인 웹 프로젝트입니다.

- 🌐 도메인: `gywns2zang9.dev`
- 🚀 호스팅: Vercel
- 🔐 인증/DB: Supabase
- 🎨 스타일: Tailwind CSS + shadcn/ui

---

## 주요 기능

### 🏠 홈 (`/`)
- 다크 테마
- **성능 최적화**: 스트리밍 렌더링(Suspense) 및 서버 컴포넌트 분리를 통해 초기 로딩 체감 속도 극대화
- 통계 표시: 총 방문 횟수, 플레이 횟수, 가입자 수 (애니메이션 카운터 적용)


### 🎉 뚝-딱! (`/works`)
- 완성된 프로젝트 목록
- 프로젝트별 상태 표시
- 하단 방명록: 경험 공유 및 자유 의견

### 🧪 뚝딱~ing (`/labs`) — 관리자 전용
- 프로젝트 공개 여부, 정렬 순서, 메타(제목·설명·슬러그) 관리
- DB 초기화

### 🎮 미니 게임
| 프로젝트 | 설명 |
|---|---|
| 초성게임 | 초성만 보고 단어 맞히기, 개인 최고 기록 저장 |
| 원 그리기 | 최대한 완벽한 원을 그리는 게임 |
| 그때 살걸 | 과거 날짜 기준 가상 투자 시뮬레이터 |
| 스피드 | 반응 속도 측정 게임 |
| 크기 게임 | 화면에 나타난 도형의 크기를 비교해 정답을 맞히는 게임 |
| 똥 게임 | 순서대로 등장하는 똥을 기억해 번호를 입력하는 게임 |
| 정렬 게임 | 서로 다른 높이의 블록 10개를 순서대로 정렬하는 게임 |

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, React |
| **스타일링** | Tailwind CSS, shadcn/ui |
| **인증** | Supabase Auth (카카오 OAuth) |
| **데이터베이스** | Supabase PostgreSQL |
| **배포** | Vercel |
| **DNS** | Cloudflare |

---

## 라우트 구조

```
/                     # 홈
/plays                # 혼자 뚝딱 프로젝트 목록
/party               # 같이 뚝딱 프로젝트 목록
/plays/[id]           # 프로젝트 페이지 (혼자)
/party/[id]          # 프로젝트 페이지 (같이)
/admin                # 관리자 대시보드
/labs                 # 실험실 (관리자 전용)
/labs/[id]            # 실험 프로젝트 상세
/auth/login           # 카카오 로그인
```

---

## DB 테이블

| 테이블 | 용도 |
|---|---|
| `project_configs` | 프로젝트 공개 여부, 정렬, 제목, 설명 등 |
| `guestbook` | 방명록 메시지 (project_id별 분류) |
| `chosung_scores` | 초성게임 최고 점수 |
| `circle_scores` | 원 그리기 최고 점수 |
| `speed_scores` | 스피드 게임 최고 점수 |
| `ddong_scores` | 똥 치우기 최고 점수 |
| `sort_scores` | 정렬 게임 최고 기록 |
| `page_views` | 페이지별 방문 횟수 집계 |

---

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # 가입자 수 정확한 집계용 (서버 전용)
NEXT_PUBLIC_ADMIN_UID=            # 관리자 사용자 ID

KAKAO_REST_API_KEY=               # 카카오 OAuth
RESEND_API_KEY=                   # 이메일 발송
DICTIONARY_API_KEY=               # 국립국어원 사전 API
```

---

## 📝 라이선스

개인 프로젝트 — 학습 및 실험 목적

---

**만든 사람**: gywns2zang9  
**연락**: gywns2zang9@naver.com
