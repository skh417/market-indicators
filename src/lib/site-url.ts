// 배포 환경의 공개 URL — sitemap/robots처럼 절대 URL이 필요한 곳에서 사용.
// 우선순위: 명시적 override > Vercel 프로덕션 도메인 > 로컬
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
