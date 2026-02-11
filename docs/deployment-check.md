# 배포 전 검사 체크리스트

**배포 URL:** `https://route-data-validation.vercel.app/`

## ✅ 현재 상태 (검사일 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| **index.html** | ✅ | charset, viewport, theme-color, SEO 메타, 네이버 소유확인, canonical, og:url 반영됨 |
| **robots.txt** | ✅ | `Allow: /`, Sitemap URL 설정됨 |
| **sitemap.xml** | ✅ | loc URL 배포 도메인으로 설정됨 |
| **vite.config.js** | ✅ | base 미설정(기본 `/`), Vercel 루트 배포에 적합 |
| **package.json** | ✅ | `build`: `vite build` 정상 |
| **public/** | ✅ | favicon.ico, robots.txt, sitemap.xml 빌드 시 dist 루트로 복사됨 |
| **소스 내부** | ✅ | localhost/하드코딩 URL 없음 |

## 빌드·배포 시 확인

- `npm run build` → `dist/` 생성, 그 안에 `index.html`, `robots.txt`, `sitemap.xml`, `favicon.ico` 포함되는지 확인
- Vercel은 루트를 `dist`(또는 설정한 출력 디렉터리)로 서빙하면 됨

## 도메인 변경 시 수정할 파일

배포 URL을 바꿀 경우 아래에서 `route-data-validation.vercel.app`을 새 도메인으로 일괄 변경:

1. **index.html** – `canonical` href, `og:url` content
2. **public/robots.txt** – Sitemap URL
3. **public/sitemap.xml** – `<loc>` 값
