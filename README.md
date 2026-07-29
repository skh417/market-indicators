# Market Indicators

미국·한국 증시의 밸류에이션·심리 지표 5종을 한눈에 보여주는 한국어 대시보드입니다.

- **버핏 지수** — 미국 시가총액 / GDP
- **Shiller CAPE** — S&P 500 경기조정 PER
- **VIX** — S&P 500 변동성 지수
- **CNN Fear & Greed** — 미국 시장 심리 지수
- **VKOSPI** — 코스피 변동성 지수

각 지표는 고정 임계값 밴드로 구간(과열/중립/공포 등)을 분류해 색상과 함께 표시하며, Gemini 기반 AI 분석 리포트 기능을 제공합니다.

## 기술 스택

- Next.js (App Router) + React, TypeScript
- DB·상태관리 없음 — 외부 공개 API에서 직접 수집, ISR 1시간 캐시
- 차트·게이지는 외부 라이브러리 없이 직접 그린 SVG
- Vercel 배포 (main 푸시 시 자동)

## 실행

```bash
pnpm install
pnpm dev        # 개발 서버 (http://localhost:3000)
pnpm build      # 프로덕션 빌드
pnpm test       # 테스트
```

### 환경변수 (`.env.local`)

| 변수 | 용도 |
|------|------|
| `KRX_API_KEY` | VKOSPI 수집 (KRX 공공데이터 API) |
| `GEMINI_API_KEY` | AI 분석 리포트 |

둘 다 없어도 페이지는 동작하며, 해당 기능만 에러로 표시됩니다.
