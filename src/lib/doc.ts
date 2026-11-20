// 티어표 문서 모델 · 브라우저 저장 · 공유 링크 인코딩

export interface Unit {
  id: string;
  name: string;
  /** 이미지 주소 — 공유 링크에 포함된다 */
  image?: string;
  /** 직접 올린 사진(data URL) — 내 브라우저와 PNG 에만 쓰이고 공유 링크에는 빠진다 */
  localImage?: string;
}

export interface Tier {
  id: string;
  label: string;
  color: string;
  units: string[];
}

export interface TierDoc {
  id: string;
  title: string;
  tiers: Tier[];
  units: Unit[];
  updatedAt: number;
}

export const TIER_COLORS = ["#ff9294", "#f5b27a", "#f5e07a", "#80d8a3", "#7ab8f5", "#b39af5", "#8a8087"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newDoc(title = "새 티어표"): TierDoc {
  return {
    id: uid(),
    title,
    tiers: ["S", "A", "B", "C", "D"].map((label, i) => ({ id: uid(), label, color: TIER_COLORS[i], units: [] })),
    units: [],
    updatedAt: Date.now(),
  };
}

/** 어느 티어에도 없는 유닛 */
export function poolOf(doc: TierDoc): Unit[] {
  const placed = new Set(doc.tiers.flatMap((t) => t.units));
  return doc.units.filter((u) => !placed.has(u.id));
}

/** 새 id 로 복제. clearPlacement 면 유닛을 모두 미배치로 (템플릿처럼). */
export function cloneDoc(doc: TierDoc, opts: { title?: string; clearPlacement?: boolean } = {}): TierDoc {
  const unitIds = new Map(doc.units.map((u) => [u.id, uid()]));
  const keepPlacement = !opts.clearPlacement;
  return {
    id: uid(),
    title: opts.title ?? doc.title,
    units: doc.units.map((u) => ({ ...u, id: unitIds.get(u.id)! })),
    tiers: doc.tiers.map((t) => ({
      ...t,
      id: uid(),
      units: keepPlacement ? t.units.map((id) => unitIds.get(id)!).filter(Boolean) : [],
    })),
    updatedAt: Date.now(),
  };
}

// ---------- 브라우저 저장 (localStorage) ----------

const KEY = "tearsheet:docs:v1";

export function loadDocs(): TierDoc[] {
  try {
    const raw = localStorage.getItem(KEY);
    const docs = raw ? (JSON.parse(raw) as TierDoc[]) : [];
    return Array.isArray(docs) ? docs.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function writeDocs(docs: TierDoc[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(docs));
    return true;
  } catch {
    return false; // 용량 초과 · 사생활 보호 모드
  }
}

export function loadDoc(id: string): TierDoc | undefined {
  return loadDocs().find((d) => d.id === id);
}

export function saveDoc(doc: TierDoc): boolean {
  const docs = loadDocs().filter((d) => d.id !== doc.id);
  return writeDocs([{ ...doc, updatedAt: Date.now() }, ...docs]);
}

export function deleteDoc(id: string) {
  writeDocs(loadDocs().filter((d) => d.id !== id));
}

// ---------- 공유 링크 (?d=...) ----------
// 짧은 배열 형태 → deflate 압축 → base64url

type Packed = [1, string, [string, string, number[]][], [string, string?][]];

/** asTemplate 이면 배치를 빼고 유닛·티어 구성만 담는다 */
function pack(doc: TierDoc, asTemplate: boolean): Packed {
  const index = new Map(doc.units.map((u, i) => [u.id, i]));
  return [
    1,
    doc.title,
    doc.tiers.map((t) => [t.label, t.color, asTemplate ? [] : t.units.map((id) => index.get(id)!).filter((i) => i !== undefined)]),
    doc.units.map((u) => (u.image ? [u.name, u.image] : [u.name])),
  ];
}

function unpack(p: Packed): TierDoc {
  if (!Array.isArray(p) || p[0] !== 1) throw new Error("bad version");
  const units: Unit[] = p[3].slice(0, 500).map(([name, image]) => ({
    id: uid(),
    name: String(name).slice(0, 40),
    image: typeof image === "string" && /^https?:\/\//.test(image) ? image : undefined,
  }));
  const used = new Set<number>();
  return {
    id: uid(),
    title: String(p[1]).slice(0, 60),
    tiers: p[2].slice(0, 20).map(([label, color, idx]) => ({
      id: uid(),
      label: String(label).slice(0, 12),
      color: /^#[0-9a-f]{6}$/i.test(color) ? color : TIER_COLORS[6],
      units: idx.filter((i) => units[i] && !used.has(i) && used.add(i)).map((i) => units[i].id),
    })),
    units,
    updatedAt: Date.now(),
  };
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function encodeShare(doc: TierDoc, asTemplate: boolean): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(doc, asTemplate)));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeShare(data: string): Promise<TierDoc> {
  const json = await pipe(fromBase64Url(data), new DecompressionStream("deflate-raw"));
  return unpack(JSON.parse(new TextDecoder().decode(json)) as Packed);
}

// ---------- 이미지 업로드 → 작은 data URL ----------

export async function fileToThumb(file: File, size = 160): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // 가운데를 정사각형으로 잘라 채움
  const s = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}
