# CleanGig — 공간 청소 매칭 플랫폼

에어비앤비·파티룸·무인매장 운영자와 청소 작업자를 AI로 자동 연결하는 플랫폼.

## 명령어

```bash
npm run dev      # 개발 서버 (next dev, http://localhost:3000)
npm run build    # 프로덕션 빌드 (next build)
npm run start    # 프로덕션 서버
npx tsc --noEmit # 타입체크 (lint 스크립트 없음 — tsc로 검증)
```

테스트·lint 스크립트 미정의. 변경 후 `npx tsc --noEmit` + `npm run build`로 검증.

## 스택

- **Next.js 16** App Router + **React 19** + **TypeScript 5**
- **Tailwind 4** (`@tailwindcss/postcss`)
- **Supabase**: PostgreSQL + Auth(카카오 OAuth) + Storage + Edge Functions
- **Toss Payments** 위젯 SDK (에스크로 결제)
- **Naver Maps** (`@types/navermaps`, 지오코딩)
- **web-push** (PWA 푸시 알림)
- **framer-motion**, **lucide-react**
- 배포: **Vercel** (`vercel.json`)

## 디렉터리

```
app/          App Router 페이지 + api/ 라우트 핸들러
  api/        ai-verify, jobs/{auto-approve,cancel,recurring,notify-workers}, push/{send,subscribe}, geocode, disputes, notifications
  admin/      관리자 콘솔 (disputes, jobs, users, settings)
  clean/      워커 앱 (jobs, job/[id], jobs/active)
  spaces/     공간 등록·관리 (운영자)
  requests/   청소 요청
  profile/    프로필 (worker, bank, tax, verification, favorites, preferences)
lib/          도메인 로직 (아래 참조)
  supabase/   client.ts(브라우저), server.ts(SSR)
components/    공유 UI
supabase/migrations/  DB 스키마 (SQL 마이그레이션)
types/         전역 타입
proxy.ts       미들웨어
```

## 핵심 도메인 모듈 (`lib/`)

| 파일 | 역할 |
|---|---|
| `matching.ts` | 작업↔워커 자동 매칭 점수 |
| `pricing.ts` | 가격 계산 (공간타입·긴급·면적·쓰레기) |
| `push.ts` | web-push 발송 |
| `naver.ts` | 네이버 지도/지오코딩 |
| `checklists.ts` | 청소 체크리스트 |
| `storage.ts` | Supabase Storage 업로드 |
| `admin.ts`, `settings.ts` | 관리·설정 |
| `types.ts` | 전 도메인 타입 (source of truth) |

## 도메인 규칙 (`lib/types.ts`)

- **역할**: `operator`(운영자) / `worker`(작업자) / `admin`. dual-role 지원 (`can_operate`, `can_work`).
- **작업 라이프사이클** (`JobStatus`):
  `OPEN → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → SUBMITTED → APPROVED → PAID_OUT`
  이탈: `DISPUTED`, `CANCELED`
- **결제** (`PaymentStatus`, 에스크로): `PENDING → HELD → RELEASED → REFUNDED/FAILED`
  정산 = `gross_amount − platform_fee − withholding_tax − penalty + bonus = worker_payout`
- **워커 등급**: `STARTER / SILVER / GOLD / MASTER`
- **세금**: `TaxType`(FREELANCER/INDIVIDUAL_BUSINESS/BUSINESS), `VatType`(GENERAL/SIMPLE/EXEMPT) — 원천징수·세금계산서
- **분쟁**: AI 1차 판정(`ai_verdict`,`ai_confidence`) → 자동/에스컬레이션
- **AI 에이전트** (Supabase Edge Functions): Matching(5분)·Quality(사진검수 10분)·Finance(정산 30분)·Growth(이탈감지 매일 02:00)

## 환경 변수 (`.env.example`)

필수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
인증: `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
선택: `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`, `SOLAPI_*`(알림톡), `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`

## 규약

- Supabase 접근: 브라우저 `lib/supabase/client.ts`, 서버/RSC·라우트 `lib/supabase/server.ts` 사용. 클라에서 service_role 키 금지.
- 타입 변경은 `lib/types.ts`에서. DB 스키마 변경은 `supabase/migrations/`에 새 SQL 추가 (기존 마이그레이션 수정 금지).
- 결제·정산 금액 계산은 서버에서만 (`pricing.ts`). 클라 계산값 신뢰 금지.
