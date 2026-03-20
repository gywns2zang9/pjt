# 뚝딱실 표준 게임 개발 가이드 (Standard Game Architecture)

이 문서는 뚝딱실 프로젝트의 게임 컴포넌트 개발 시 일관성을 유지하기 위한 레이아웃·기능 명세 및 **신규 게임 추가 체크리스트**입니다.

---

## 1. 파일 구조 및 기본 구성

| 항목 | 경로 / 설명 |
|---|---|
| 게임 컴포넌트 | `components/games/[game-name].tsx` |
| API Route | `app/api/[game-name]-scores/route.ts` |
| 프로젝트 메타 | `lib/projects.ts` — `projects` 배열에 `{ id, title }` 추가 |
| 컴포넌트 등록 | `components/project-registry.tsx` — `projectComponents` 맵에 등록 |
| Works 목록 통계 | `app/works/page.tsx` — `TABLE_MAP`, `SCORE_ASC` 에 추가 |
| 로그인 배너 | `app/works/[id]/page.tsx` — `showLoginBanner` 배열에 추가 |
| Supabase 테이블 | SQL Editor에서 `[game]_scores` 테이블 + RLS 정책 생성 |
| 전역 레이아웃 | `app/layout.tsx` — `html` 태그에 `data-scroll-behavior="smooth"` 확인 |

```

### 필수 코드 구성

```tsx
"use client";
// GamePhase: "idle" | "go" | "playing" | "result" | "gameover" | "fault" | "timeout" 등
// RankEntry: { user_name: string; score: number; created_at: string; }
// 사운드: Web Audio API (효과음 파일 없이 코드로 생성 권장)
```

---

## 2. 레이아웃 구조 (GridLayout)

```
┌──────────────────────────────────────────────┐
│  [1] How to Play (모바일 전용, lg:hidden)      │
├──────────────────────────────┬───────────────┤
│  [2] 메인 게임 박스 (lg:flex-1) │ [3] 사이드바   │
│  - 상단 정보 영역             │  (lg:w-64)    │
│  - 게임 영역                 │  - HTP (PC용)  │
│  - 컨트롤 버튼               │  - 랭킹 보드   │
│                              │  - 기타 정보   │
└──────────────────────────────┴───────────────┘
```

- **전체 컨테이너**: `flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto`
- **모바일 대응 순서 (`order`)**:
  1. `How to Play` — 모바일 전용: `order-1 lg:hidden`
  2. `메인 게임 박스` — `order-2 lg:flex-1`
  3. `사이드바` — `order-3 lg:w-64`

---

## 3. 상단 정보 영역 (통일 스타일)

다른 게임과 동일한 디자인을 유지하기 위해 아래 패턴을 따릅니다.

```tsx
<div className="min-h-[100px] flex flex-col gap-4">
    {/* 점수/라운드 뱃지 */}
    <div className="flex items-center justify-between">
        <div className="... rounded-full bg-muted/50 border border-border/50">
            <span className="text-[10px]">ROUND</span>
            <span className="text-lg font-black tabular-nums">{round}</span>
        </div>
        <div className="... rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px]">SCORE</span>
            <span className="text-lg font-black text-primary tabular-nums">{score}</span>
        </div>
    </div>

    {/* 타이머 바 */}
    <div className="space-y-1">
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">TIME</span>
            <span className="text-sm font-black tabular-nums">{seconds}s</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width, backgroundColor, transition }} />
        </div>
    </div>
</div>
```

### 타이머 바 규칙
- **카운트다운 방식** (SizeGame 등): `width = (timeLeft / timeLimit) * 100%`, 초록 → 주황 → 빨강
- **경과시간 방식** (TouchGame 등): `width = (elapsed / limit) * 100%`, `transition: "none"` (RAF 기반이므로 CSS transition 불필요)
- **색상 전환**: 남은 시간 3초 미만일 때 `#ef4444`(빨강), 그 외 `#34d399`(초록)
- **리셋 시**: `transition: "none"`으로 설정해야 0으로 즉시 초기화됨

---

## 4. 필수 UI 컴포넌트 및 기능

### 4-1. 게임 시작/재시작
- **시작**: 버튼 클릭 또는 `Space` / `Enter` 키
- **재시작**: 결과 화면에서 버튼 클릭 또는 `Space` / `Enter` 키
- ⚠️ **방향키 등 게임 조작 키로 시작/재시작이 되지 않도록 주의**

### 4-2. How to Play (HTPSection)
- `ChevronDown`을 이용한 아코디언 스타일
- 모바일: 게임 상단에 배치 (`lg:hidden`)
- PC: 사이드바 상단에 배치 (`hidden lg:block`)

### 4-3. 랭킹 보드 (RankingBoard)
- TOP 3 요약 표시
- '전체보기' 버튼 → `Portal`을 이용한 모달
- 모달 내부: 전체 랭킹 리스트 + 카카오 공유 버튼 (`KakaoShareButton`)

### 4-4. 키보드 단축키
```tsx
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // ⚠️ 입력창/게시판 포커스 시 단축키 차단
        if (document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA") return;

        // 게임별 키 매핑 ...
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [dependencies]);
```

---

## 5. 데이터 연동

### 5-1. API Route (`app/api/[game]-scores/route.ts`)

| Method | 용도 |
|---|---|
| `GET` | 상위 100개 랭킹 조회 (중복 제거, 최고 기록 기준) |
| `POST` | 점수 저장 (최고 기록일 때만 갱신, `play_count` 항상 증가) |
| `DELETE` | 랭킹 초기화 (관리자 전용) |

### 5-2. Supabase 테이블

```sql
CREATE TABLE public.[game]_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    score REAL NOT NULL,
    play_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

ALTER TABLE public.[game]_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
    ON public.[game]_scores FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only"
    ON public.[game]_scores FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
    ON public.[game]_scores FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for service role"
    ON public.[game]_scores FOR DELETE USING (true);
```

### 5-3. 점수 방향 (오름차순 vs 내림차순)

| 유형 | 예시 게임 | 정렬 | `SCORE_ASC`에 포함 |
|---|---|---|---|
| 시간 기반 (빠를수록 좋음) | speed-game, sort-game, touch-game | `ASC` | ✅ |
| 점수 기반 (높을수록 좋음) | chosung-game, circle-game, size-game, ddong-game | `DESC` | ❌ |

---

---

## 7. 성능 최적화 및 고급 UX (Advanced)

### 7-1. 스트리밍 렌더링 (Streaming SSR)
- 페이지 전체를 기다리지 않고 **정적 레이아웃 → 동적 데이터** 순서로 보여줍니다.
- 서버 컴포넌트 내부에서 `Suspense`를 활용하여 데이터 페칭 영역만 별도로 렌더링합니다. (예: `app/page.tsx`)

### 7-2. Web Audio API 사운드
- 무거운 `.mp3` 파일 로드 대신 코드로 사운드를 생성하여 즉각적인 피드백을 제공합니다.
- `AudioContext`를 사용하여 화이트 노이즈(폭발), 오실레이터(부저/비율)를 합성합니다. (참고: `eyes-game.tsx`)

### 7-3. 빠른 카운터 애니메이션
- 숫자가 카운팅되는 시간(`dur`)은 **0.8초(800ms) 이하**로 설정하여 사용자가 답답함을 느끼지 않게 합니다.

### 7-4. 루트 전환 스크롤 경고 해결
- `html` 태그에 `data-scroll-behavior="smooth"` 속성을 추가하여 페이지 전환 시 Next.js의 스크롤 제어 성능을 보장합니다.

---

## 8. 신규 게임 추가 체크리스트

### 코드 등록 (필수)
- [ ] `components/games/[game-name].tsx` — 게임 컴포넌트 생성
- [ ] `app/api/[game-name]-scores/route.ts` — API Route 생성
- [ ] `lib/projects.ts` — `projects` 배열에 `{ id: "[game-name]", title: "게임명" }` 추가
- [ ] `components/project-registry.tsx` — `projectComponents`에 컴포넌트 등록
- [ ] `app/works/page.tsx` → `TABLE_MAP`에 `"[game-name]": "[game]_scores"` 추가
- [ ] `app/works/page.tsx` → `SCORE_ASC`에 추가 여부 판단 (시간 기반이면 추가)
- [ ] `app/works/[id]/page.tsx` → `showLoginBanner` 배열에 `"[game-name]"` 추가

### Supabase (필수)
- [ ] SQL Editor에서 `[game]_scores` 테이블 생성 (RLS 포함)

### UI/UX 및 성능 점검
- [ ] **사운드 효과**: Web Audio API 사용 여부 (권장)
- [ ] **성능 최적화**: 카운터 애니메이션 속도 확인 (0.8s 이하)
- [ ] **레이아웃**: `HTPSection` 및 `RankingBoard` 탑재 유무
- [ ] **공유 기능**: 카카오 공유 시 `displayScore`와 `rank` 값이 정확히 전달되는지 확인
- [ ] **스크롤 제어**: 페이지 전환 시 부드러운 스크롤 관련 경고가 없는지 확인 (`data-attribute`)
- [ ] **모바일**: 터치 영역 및 브라우저 기본 제스처 충돌 확인

---

> 이 가이드를 준수하여 모든 게임의 사용자 경험(UX)을 통일합니다.
> **새 게임 추가 시 섹션 6의 체크리스트를 빠짐없이 확인하세요.**
