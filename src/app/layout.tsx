import type { Metadata } from "next";
import { Brand, Footer, TopBar, TopBarLink } from "@team-carol/design-system/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TearSheet — 티어표 메이커",
  description: "티어표를 만들고 링크나 PNG 로 공유하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* crossOrigin: PNG 내보내기 때 글꼴을 이미지에 넣으려면 스타일시트를 읽을 수 있어야 한다 */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <TopBar brand={<Brand name="TearSheet" href="/" />}>
          <TopBarLink href="/">내 티어표</TopBarLink>
        </TopBar>
        <main>{children}</main>
        <Footer>
          <span>TearSheet</span>
          <span>티어표는 이 브라우저에만 저장됩니다. 다른 기기로 옮기려면 공유 링크를 쓰세요.</span>
        </Footer>
      </body>
    </html>
  );
}
