"use client";

import { useRef, useState } from "react";
import { Button, Select, TextArea, TextInput } from "@team-carol/design-system/react";
import { TIER_COLORS, encodeShare, fileToThumb, poolOf, uid, type Tier, type TierDoc, type Unit } from "@/lib/doc";
import { exportPng } from "@/lib/png";
import { UnitTile } from "./UnitTile";

interface Props {
  doc: TierDoc;
  /** 없으면 읽기 전용 */
  onChange?: (doc: TierDoc) => boolean;
  readOnly?: boolean;
  banner?: React.ReactNode;
}

export function Editor({ doc, onChange, readOnly, banner }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTiers, setEditTiers] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const editable = !readOnly && !!onChange;
  const canPlace = editable;
  const pool = poolOf(doc);
  const selected = doc.units.find((u) => u.id === selectedId) ?? null;
  const unitById = new Map(doc.units.map((u) => [u.id, u]));

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3000);
  }

  function update(next: TierDoc) {
    if (!onChange) return;
    const ok = onChange(next);
    setSaveFailed(!ok);
    if (!ok) flash("브라우저 저장 공간이 부족해서 저장하지 못했어요. 올린 사진을 줄여 보세요.");
  }

  /** 모든 유닛을 미배치로 */
  function resetPlacement() {
    if (!confirm("모든 유닛을 미배치로 되돌릴까요?")) return;
    update({ ...doc, tiers: doc.tiers.map((t) => ({ ...t, units: [] })) });
  }

  // ---------- 유닛 이동 ----------

  /** tierId 가 null 이면 미배치로. beforeId 가 있으면 그 앞에 끼운다. */
  function move(unitId: string, tierId: string | null, beforeId?: string) {
    const tiers = doc.tiers.map((t) => ({ ...t, units: t.units.filter((id) => id !== unitId) }));
    if (tierId) {
      const t = tiers.find((x) => x.id === tierId)!;
      const at = beforeId ? t.units.indexOf(beforeId) : -1;
      if (at >= 0) t.units.splice(at, 0, unitId);
      else t.units.push(unitId);
    }
    update({ ...doc, tiers });
  }

  const dragStart = (unitId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", unitId);
    e.dataTransfer.effectAllowed = "move";
  };

  const dropOn = (tierId: string | null, beforeId?: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const unitId = e.dataTransfer.getData("text/plain");
    if (unitId && unitId !== beforeId && unitById.has(unitId)) move(unitId, tierId, beforeId);
  };

  // ---------- 티어 ----------

  function patchTier(id: string, patch: Partial<Tier>) {
    update({ ...doc, tiers: doc.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }

  function moveTier(index: number, delta: number) {
    const tiers = [...doc.tiers];
    const [t] = tiers.splice(index, 1);
    tiers.splice(index + delta, 0, t);
    update({ ...doc, tiers });
  }

  function removeTier(id: string) {
    if (doc.tiers.length <= 1) return;
    update({ ...doc, tiers: doc.tiers.filter((t) => t.id !== id) }); // 안에 있던 유닛은 미배치로
  }

  function addTier() {
    const color = TIER_COLORS[doc.tiers.length % TIER_COLORS.length];
    update({ ...doc, tiers: [...doc.tiers, { id: uid(), label: "새 티어", color, units: [] }] });
  }

  // ---------- 유닛 ----------

  function addUnits(names: string[], image?: string) {
    const units = names
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ id: uid(), name: name.slice(0, 40), image }));
    if (units.length) update({ ...doc, units: [...doc.units, ...units] });
  }

  function patchUnit(id: string, patch: Partial<Unit>) {
    update({ ...doc, units: doc.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }

  function removeUnit(id: string) {
    update({
      ...doc,
      units: doc.units.filter((u) => u.id !== id),
      tiers: doc.tiers.map((t) => ({ ...t, units: t.units.filter((x) => x !== id) })),
    });
    setSelectedId(null);
  }

  // ---------- 내보내기 ----------

  /** 링크로 내보내기. asTemplate 이면 배치를 뺀 유닛·티어만 */
  async function share(asTemplate: boolean) {
    const data = await encodeShare(doc, asTemplate);
    const url = `${location.origin}/t?d=${data}`;
    try {
      await navigator.clipboard.writeText(url);
      const local = doc.units.some((u) => u.localImage && !u.image);
      flash(
        (asTemplate ? "템플릿 링크(배치 없음)를 복사했어요." : "티어표 링크(배치 포함)를 복사했어요.") +
          (local ? " 직접 올린 사진은 링크에 포함되지 않아 이름으로 보여요." : ""),
      );
    } catch {
      prompt("이 링크를 복사하세요", url);
    }
  }

  async function png() {
    if (!boardRef.current) return;
    setBusy(true);
    setSelectedId(null);
    try {
      await exportPng(boardRef.current, doc.title);
    } catch (e) {
      console.error(e);
      flash("PNG 를 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- 화면 ----------

  return (
    <section className="py-8">
      <div className="mx-auto max-w-page space-y-5 px-gutter">
        {banner}

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            {editable ? (
              <input
                aria-label="티어표 이름"
                value={doc.title}
                maxLength={60}
                onChange={(e) => update({ ...doc, title: e.target.value })}
                className="w-full rounded-control border border-transparent bg-transparent px-2 py-1 text-heading-3 font-medium text-ink hover:border-border focus:border-border-strong"
              />
            ) : (
              <h1 className="crl-heading-3">{doc.title}</h1>
            )}
            {editable && (
              <p className={`px-2 text-caption ${saveFailed ? "text-danger" : "text-dim"}`} aria-live="polite">
                {saveFailed ? "저장 실패 — 저장 공간 부족" : "✓ 이 브라우저에 자동 저장됨"}
              </p>
            )}
          </div>
          {editable && (
            <>
              <Button size="sm" onClick={() => share(false)} title="티어 배치까지 담은 링크를 복사">
                티어표 내보내기
              </Button>
              <Button size="sm" variant="secondary" onClick={() => share(true)} title="배치 없이 유닛과 티어만 담은 링크를 복사">
                템플릿으로 내보내기
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={png} disabled={busy}>
            {busy ? "만드는 중…" : "PNG 저장"}
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            {/* PNG 로 저장되는 영역 */}
            <div ref={boardRef} className="overflow-hidden rounded-card border border-border bg-canvas">
              <div data-export-only className="hidden px-4 pt-4 text-heading-4 font-medium text-ink">
                {doc.title}
              </div>
              <div className="divide-y divide-border">
                {doc.tiers.map((tier, i) => (
                  <div
                    key={tier.id}
                    className="flex min-h-[96px]"
                    onDragOver={canPlace ? (e) => e.preventDefault() : undefined}
                    onDrop={canPlace ? dropOn(tier.id) : undefined}
                  >
                    <div
                      className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 p-2 text-center sm:w-28"
                      style={{ background: tier.color }}
                    >
                      {editable && editTiers ? (
                        <>
                          <input
                            aria-label="티어 이름"
                            value={tier.label}
                            maxLength={12}
                            onChange={(e) => patchTier(tier.id, { label: e.target.value })}
                            className="w-full rounded-inline bg-black/15 px-1 text-center text-body font-medium text-accent-ink"
                          />
                          <div data-export-skip className="flex gap-0.5 text-accent-ink">
                            <TierCtl
                              label="색 바꾸기"
                              onClick={() =>
                                patchTier(tier.id, {
                                  color: TIER_COLORS[(TIER_COLORS.indexOf(tier.color) + 1) % TIER_COLORS.length],
                                })
                              }
                            >
                              ◐
                            </TierCtl>
                            <TierCtl label="위로" disabled={i === 0} onClick={() => moveTier(i, -1)}>
                              ↑
                            </TierCtl>
                            <TierCtl label="아래로" disabled={i === doc.tiers.length - 1} onClick={() => moveTier(i, 1)}>
                              ↓
                            </TierCtl>
                            <TierCtl label="티어 삭제" disabled={doc.tiers.length <= 1} onClick={() => removeTier(tier.id)}>
                              ✕
                            </TierCtl>
                          </div>
                        </>
                      ) : (
                        <span className="break-all text-heading-4 font-medium text-accent-ink">{tier.label}</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-wrap content-start gap-1 bg-surface p-2">
                      {tier.units.map((id) => {
                        const u = unitById.get(id);
                        return u ? (
                          <UnitTile
                            key={id}
                            unit={u}
                            selected={id === selectedId}
                            draggable={canPlace}
                            onDragStart={dragStart(id)}
                            onDrop={canPlace ? dropOn(tier.id, id) : undefined}
                            onSelect={editable ? () => setSelectedId(id === selectedId ? null : id) : undefined}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editable && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditTiers((v) => !v)}>
                  {editTiers ? "티어 편집 끝" : "티어 편집"}
                </Button>
                {editTiers && (
                  <Button size="sm" variant="secondary" onClick={addTier} disabled={doc.tiers.length >= 20}>
                    티어 추가
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto"
                  onClick={resetPlacement}
                  disabled={pool.length === doc.units.length}
                >
                  배치 초기화
                </Button>
              </div>
            )}

            {/* 미배치 유닛 */}
            <div
              className="rounded-card border border-dashed border-border-strong p-3"
              onDragOver={canPlace ? (e) => e.preventDefault() : undefined}
              onDrop={canPlace ? dropOn(null) : undefined}
            >
              <p className="mb-2 px-1 text-label text-muted">
                미배치 {pool.length}
                {canPlace && pool.length > 0 && " · 위 티어로 끌어다 놓거나, 눌러서 옮기세요"}
              </p>
              {pool.length === 0 ? (
                <p className="px-1 pb-1 text-caption text-dim">
                  {doc.units.length === 0 ? "‘유닛 추가’에서 유닛을 추가하세요." : "모두 배치했어요."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {pool.map((u) => (
                    <UnitTile
                      key={u.id}
                      unit={u}
                      selected={u.id === selectedId}
                      draggable={canPlace}
                      onDragStart={dragStart(u.id)}
                      onSelect={editable ? () => setSelectedId(u.id === selectedId ? null : u.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {editable && (
            <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
              {selected ? (
                <UnitPanel
                  key={selected.id}
                  unit={selected}
                  tiers={doc.tiers}
                  tierId={doc.tiers.find((t) => t.units.includes(selected.id))?.id ?? ""}
                  onPatch={(p) => patchUnit(selected.id, p)}
                  onMove={(tierId) => move(selected.id, tierId || null)}
                  onRemove={() => removeUnit(selected.id)}
                  onClose={() => setSelectedId(null)}
                  onError={flash}
                />
              ) : (
                <AddUnits onAdd={addUnits} />
              )}
            </aside>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-6 z-20 mx-auto max-w-md rounded-control border border-border-strong bg-surface-2 px-4 py-3 text-center text-body-sm text-ink shadow-lg"
        >
          {toast}
        </div>
      )}
    </section>
  );
}

function TierCtl(props: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className="grid size-6 place-items-center rounded-inline text-label hover:bg-black/15 disabled:opacity-30"
    >
      {props.children}
    </button>
  );
}

function AddUnits({ onAdd }: { onAdd: (names: string[], image?: string) => void }) {
  const [bulk, setBulk] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [names, setNames] = useState("");

  return (
    <div className="crl-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="crl-heading-4">유닛 추가</h2>
        <button type="button" className="text-label text-accent-soft hover:text-accent" onClick={() => setBulk((v) => !v)}>
          {bulk ? "한 명씩" : "여러 명 한번에"}
        </button>
      </div>
      {bulk ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(names.split(/\r?\n|,/));
            setNames("");
          }}
        >
          <TextArea
            label="이름 목록"
            helperText="한 줄에 한 명씩, 또는 쉼표로 구분"
            rows={6}
            value={names}
            onChange={(e) => setNames(e.target.value)}
          />
          <Button type="submit" disabled={!names.trim()}>
            추가
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd([name], /^https?:\/\//.test(image.trim()) ? image.trim() : undefined);
            setName("");
            setImage("");
          }}
        >
          <TextInput label="이름" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <TextInput
            label="사진 주소 (선택)"
            placeholder="https://…"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
          <Button type="submit" disabled={!name.trim()}>
            추가
          </Button>
        </form>
      )}
      <p className="crl-caption">유닛을 누르면 이름·사진을 고치거나 다른 티어로 옮길 수 있어요.</p>
    </div>
  );
}

interface PanelProps {
  unit: Unit;
  /** null 이면 (템플릿) 티어 선택을 숨긴다 */
  tiers: Tier[] | null;
  tierId: string;
  onPatch: (p: Partial<Unit>) => void;
  onMove: (tierId: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
}

function UnitPanel({ unit, tiers, tierId, onPatch, onMove, onRemove, onClose, onError }: PanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      onPatch({ localImage: await fileToThumb(file) });
    } catch {
      onError("이 이미지는 읽을 수 없어요.");
    }
  }

  return (
    <div className="crl-card space-y-4">
      <div className="flex items-center gap-3">
        <UnitTile unit={unit} />
        <h2 className="crl-heading-4 min-w-0 flex-1 truncate">{unit.name}</h2>
        <button type="button" aria-label="닫기" onClick={onClose} className="text-heading-4 text-dim hover:text-ink">
          ✕
        </button>
      </div>
      {tiers && (
        <Select label="티어" value={tierId} onChange={(e) => onMove(e.target.value)}>
          <option value="">미배치</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      )}
      <TextInput
        label="이름"
        value={unit.name}
        maxLength={40}
        onChange={(e) => onPatch({ name: e.target.value })}
      />
      <TextInput
        label="사진 주소"
        placeholder="https://…"
        value={unit.image ?? ""}
        helperText="링크로 공유할 때도 보이는 사진"
        onChange={(e) => onPatch({ image: e.target.value.trim() || undefined })}
      />
      <div className="space-y-2">
        <p className="crl-label">직접 올린 사진</p>
        <p className="crl-caption">이 브라우저와 PNG 에만 보여요. 주소 사진보다 우선합니다.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            {unit.localImage ? "바꾸기" : "사진 올리기"}
          </Button>
          {unit.localImage && (
            <Button size="sm" variant="secondary" onClick={() => onPatch({ localImage: undefined })}>
              지우기
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="border-t border-border pt-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => confirm(`‘${unit.name}’ 유닛을 지울까요?`) && onRemove()}
        >
          유닛 삭제
        </Button>
      </div>
    </div>
  );
}
