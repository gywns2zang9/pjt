# 뚝딱실 표준 게임 개발 가이드 (Standard Game Architecture)

이 문서는 뚝딱실 프로젝트의 게임 컴포넌트 개발 시 일관성을 유지하기 위한 레이아웃 및 기능 명세입니다.

## 1. 파일 구조 및 기본 구성
- **경로**: `components/games/[game-name].tsx`
- **필수 구성 요소**:
  - `use client` 지시어
  - `GamePhase` ("idle", "playing", "result", "gameover" 등)
  - `GameConfig` 인터페이스 (시간, 난이도 설정 등)
  - `RankEntry` 인터페이스 및 상위 랭킹 로드/저장 로직

## 2. 레이아웃 구조 (GridLayout)
- **전체 컨테이너**: `flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto`
- **모바일 대응 순서 (`order`)**:
  1. `How to Play` (모바일 전용: `lg:hidden`)
  2. `메인 게임 박스` (`lg:flex-1`)
  3. `사이드바` (`lg:w-64`) - 랭킹, 히스토리, PC전용 HTP 포함

## 3. 필수 UI 컴포넌트 및 기능
- **상태 표시**: 타이머(Progress Bar), 현재 점수(Score)를 상단에 배치
- **안내 문구**: 게임 중 피드백(성공/실패/팁) 표시 (애니메이션 포함 추천)
- **컨트롤 버튼**: [게임 시작/다시 시작/게임 종료] 버튼 (스페이스바 단축키 포함)
- **How to Play (HTPSection)**: `ChevronDown`을 이용한 아코디언 스타일 아키텍처
- **랭킹 보드 (RankingBoard)**: TOP 3 요약 및 '전체보기' 모달 기능
- **단어/액션 히스토리**: 최근 기록을 리스트 형태로 표시

## 4. 데이터 연동
- **랭킹 API**: `GET /api/[game-name]-scores`, `POST /api/[game-name]-scores`
- **로그인 체크**: 비회원일 경우 상단에 `AlertTriangle` 배너 표시 (페이지 레벨에서 처리)
- **방명록**: 게임 하단에 `Guestbook` 컴포넌트 배치 (페이지 레벨에서 처리)

## 5. 일관성 체크리스트
- [ ] 입력창/게시판 포커스 시 단축키(Space) 차단 로직 포함 여부
- [ ] 다크 모드/라이트 모드 대응 (색상 변수 사용)
- [ ] 모바일 터치 환경 고려 (입력창 자동 포커스 등)
- [ ] 게임 종료 시 최종 점수 DB 저장 및 랭킹 갱신 로직

---
이 가이드를 준수하여 모든 게임의 사용자 경험(UX)을 통일합니다.
