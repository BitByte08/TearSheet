import { getFontEmbedCSS, toPng } from "html-to-image";

// CORS 를 막아 둔 외부 이미지는 그릴 수 없어서 투명 픽셀로 대신한다.
const PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

let fontCss: Promise<string> | null = null;

export async function exportPng(node: HTMLElement, title: string) {
  // 제목은 PNG 에만 보이게, 편집 버튼은 빼고
  const titleEl = node.querySelector<HTMLElement>("[data-export-only]");
  titleEl?.classList.remove("hidden");
  try {
    fontCss ??= getFontEmbedCSS(node).catch(() => "");
    const url = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#1a1a1c",
      imagePlaceholder: PLACEHOLDER,
      fontEmbedCSS: await fontCss,
      filter: (el) => !(el instanceof HTMLElement && el.dataset.exportSkip !== undefined),
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]/g, "_") || "tierlist"}.png`;
    a.click();
  } finally {
    titleEl?.classList.add("hidden");
  }
}
