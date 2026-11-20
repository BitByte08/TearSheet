# TearSheet — 티어표 메이커

이름·사진으로 유닛을 만들고 티어에 배치한 뒤, 링크나 PNG 로 공유하는 정적 웹사이트입니다.
로그인·서버·DB 없이 브라우저(localStorage)에 저장되고, Cloudflare Pages 에 올립니다.
디자인은 [@team-carol/design-system](https://github.com/team-carol/carol-design-system) 을 씁니다.

## 기능

- 티어표 만들기 · 이름 바꾸기 · 티어 추가/삭제/순서/색 변경
- 유닛 추가 (한 명씩 또는 여러 명 한번에), 사진은 주소(URL) 또는 직접 업로드
- 끌어다 놓기, 또는 유닛을 눌러 티어 선택 (모바일)
- **티어표 내보내기**: 배치까지 담은 링크 / **템플릿으로 내보내기**: 유닛과 티어만, 배치는 비운 링크
- 공유받은 링크 → ‘가져와서 편집’ 또는 ‘배치 없이 가져오기’
- 배치 초기화, PNG 저장, 자동 저장
- 직접 올린 사진은 링크에 담기지 않습니다(이 브라우저와 PNG 에만). 링크로도 보이게 하려면 사진 주소를 쓰세요.
- 외부 사진 중 CORS 를 막아 둔 곳의 이미지는 PNG 에서 빈칸으로 나옵니다.

## 개발

```bash
npm install
npm run dev
```

## Cloudflare Pages 배포

배포 주소: https://tearsheet-9e7.pages.dev

```bash
npx wrangler login
npm run deploy
```

`tearsheet` Pages 프로젝트(직접 업로드 방식)는 이미 만들어져 있습니다.
처음부터 새 계정에 만들 때는 `npx wrangler pages project create tearsheet --production-branch main --force` 를 한 번 실행하세요.
(`--force` 가 없으면 최신 wrangler 가 Workers 로 넘기려다 실패합니다.)
