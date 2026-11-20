import { Suspense } from "react";
import { TierPage } from "@/components/TierPage";

export default function Page() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-page px-gutter py-12 text-dim">불러오는 중…</p>}>
      <TierPage />
    </Suspense>
  );
}
