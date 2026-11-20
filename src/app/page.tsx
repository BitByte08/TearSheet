"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardTitle, Tag } from "@team-carol/design-system/react";
import { cloneDoc, deleteDoc, loadDocs, newDoc, poolOf, saveDoc, type TierDoc } from "@/lib/doc";

const fmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export default function Home() {
  const router = useRouter();
  const [docs, setDocs] = useState<TierDoc[] | null>(null);

  useEffect(() => setDocs(loadDocs()), []);

  function create() {
    const doc = newDoc();
    if (!saveDoc(doc)) return alert("브라우저 저장 공간이 부족해요.");
    router.push(`/t?id=${doc.id}`);
  }

  function duplicate(doc: TierDoc) {
    saveDoc(cloneDoc(doc, { title: `${doc.title} (복사본)` }));
    setDocs(loadDocs());
  }

  function remove(doc: TierDoc) {
    if (!confirm(`‘${doc.title}’ 티어표를 지울까요? 되돌릴 수 없어요.`)) return;
    deleteDoc(doc.id);
    setDocs(loadDocs());
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-gutter">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="crl-eyebrow">티어표 메이커</p>
            <h1 className="crl-heading-2">내 티어표</h1>
            <p className="crl-body-sm mt-2 max-w-[60ch]">
              이름과 사진으로 유닛을 만들고 티어에 배치하세요. 배치까지 담은 티어표로, 또는 유닛만 담은 템플릿으로
              내보낼 수 있어요. 모든 변경은 이 브라우저에 자동 저장됩니다.
            </p>
          </div>
          <Button onClick={create}>새 티어표</Button>
        </div>

        {docs === null ? null : docs.length === 0 ? (
          <Card className="mt-8">
            <CardTitle>아직 티어표가 없어요</CardTitle>
            <CardBody>‘새 티어표’를 눌러 시작하거나, 공유받은 링크를 열어 가져와 보세요.</CardBody>
          </Card>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col rounded-card border border-border bg-surface">
                <a href={`/t?id=${d.id}`} className="flex-1 rounded-t-card p-5 transition-colors hover:bg-surface-hover">
                  <span className="block truncate text-body font-medium text-ink">{d.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-caption text-dim">
                    <Tag>유닛 {d.units.length}</Tag>
                    <Tag>미배치 {poolOf(d).length}</Tag>
                    {fmt.format(d.updatedAt)}
                  </span>
                  <span className="mt-3 flex h-3 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
                    {d.tiers.map((t) => (
                      <span key={t.id} style={{ background: t.color, flexGrow: t.units.length }} />
                    ))}
                    <span style={{ flexGrow: poolOf(d).length }} />
                  </span>
                </a>
                <div className="flex gap-2 border-t border-border p-3">
                  <Button size="sm" variant="secondary" onClick={() => duplicate(d)}>
                    복제
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => remove(d)} className="ml-auto">
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
