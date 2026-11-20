"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardTitle } from "@team-carol/design-system/react";
import { cloneDoc, decodeShare, loadDoc, saveDoc, type TierDoc } from "@/lib/doc";
import { Editor } from "./Editor";

type State =
  | { kind: "loading" }
  | { kind: "missing"; reason: string }
  | { kind: "local"; doc: TierDoc }
  | { kind: "shared"; doc: TierDoc };

export function TierPage() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const data = params.get("d");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (id) {
      const doc = loadDoc(id);
      setState(doc ? { kind: "local", doc } : { kind: "missing", reason: "이 브라우저에 그 티어표가 없어요." });
    } else if (data) {
      decodeShare(data)
        .then((doc) => setState({ kind: "shared", doc }))
        .catch(() => setState({ kind: "missing", reason: "공유 링크가 깨졌거나 잘렸어요." }));
    } else {
      setState({ kind: "missing", reason: "열 티어표가 지정되지 않았어요." });
    }
  }, [id, data]);

  function importShared(clearPlacement: boolean) {
    if (state.kind !== "shared") return;
    const copy = cloneDoc(state.doc, { clearPlacement });
    if (!saveDoc(copy)) return alert("브라우저 저장 공간이 부족해요.");
    router.push(`/t?id=${copy.id}`);
  }

  if (state.kind === "loading") return <p className="mx-auto max-w-page px-gutter py-12 text-dim">불러오는 중…</p>;

  if (state.kind === "missing") {
    return (
      <section className="mx-auto max-w-narrow px-gutter py-12">
        <Card>
          <CardTitle>티어표를 열 수 없어요</CardTitle>
          <CardBody>{state.reason}</CardBody>
          <Button href="/" variant="secondary" className="mt-4">
            내 티어표로
          </Button>
        </Card>
      </section>
    );
  }

  if (state.kind === "shared") {
    const placed = state.doc.tiers.some((t) => t.units.length > 0);
    return (
      <Editor
        doc={state.doc}
        readOnly
        banner={
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-accent/40 bg-surface p-4">
            <p className="flex-1 text-body-sm text-ink-soft">
              {placed
                ? "공유받은 티어표예요. 가져오면 내 브라우저에 저장되고 마음대로 고칠 수 있어요."
                : "공유받은 템플릿이에요. 가져와서 직접 티어를 배치해 보세요."}
            </p>
            <Button size="sm" onClick={() => importShared(false)}>
              {placed ? "가져와서 편집" : "가져와서 배치하기"}
            </Button>
            {placed && (
              <Button size="sm" variant="secondary" onClick={() => importShared(true)}>
                배치 없이 가져오기
              </Button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <Editor
      doc={state.doc}
      onChange={(doc) => {
        setState({ kind: "local", doc });
        return saveDoc(doc);
      }}
    />
  );
}
