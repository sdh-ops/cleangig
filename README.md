# CleanGig — 공간 청소 매칭 플랫폼

AI 기반 공간 청소 매칭 플랫폼. 에어비앤비·파티룸·무인매장 운영자와 청소 작업자를 자동 연결합니다.

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Deploy**: Vercel
- **AI Agents**: Supabase Edge Functions (Matching / Quality / Finance / Growth)

## 설치 및 실행

```bash
npm install
cp .env.example .env.local  # 환경 변수 설정
npm run dev
```

## 환경 변수

`.env.example` 파일을 참고하여 `.env.local` 을 설정하세요.

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `KAKAO_CLIENT_ID` | 카카오 앱 REST API 키 |
| `NAVER_MAP_CLIENT_ID` | 네이버 지도 클라이언트 ID |

## 프로젝트 구조

```
app/
├── (landing)     랜딩 페이지
├── login/         카카오 로그인
├── onboarding/    역할 선택
├── dashboard/     운영자 대시보드
├── spaces/        공간 관리
├── requests/      청소 요청
├── clean/         작업자 앱
├── earnings/      정산
├── profile/       프로필
└── admin/         관리자 콘솔
```

## AI 에이전트

| 에이전트 | 주기 | 역할 |
|---------|------|------|
| Matching Agent | 5분 | OPEN 작업 자동 매칭 |
| Quality Agent | 10분 | 사진 AI 검수 + 자동 승인 |
| Finance Agent | 30분 | 정산 금액 계산 |
| Growth Agent | 매일 02:00 | 이탈 위험 감지 |
