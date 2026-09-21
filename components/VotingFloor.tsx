"use client";

import { useMemo } from "react";
import Avatar from "@/components/Avatar";
import { jitter } from "@/lib/avatar";
import { type Judgement, panelists, ZONES, type ZoneKey } from "@/lib/panel";

type Props = {
  results: Judgement[] | null;
  /** true になると待機位置から各陣地へ移動する */
  placed: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeCategory: string | null;
};

type Placement = {
  x: number;
  y: number;
  width: number;
  z: number;
  order: number;
};

const BAND = 100 / ZONES.length;

export default function VotingFloor({
  results,
  placed,
  selectedId,
  onSelect,
  activeCategory,
}: Props) {
  const byId = useMemo(
    () => new Map((results ?? []).map((r) => [r.id, r])),
    [results],
  );

  const placements = useMemo(
    () => (placed && results ? placedLayout(results) : waitingLayout()),
    [placed, results],
  );

  const counts = useMemo(() => {
    const c: Record<ZoneKey, number> = { interested: 0, neutral: 0, not: 0 };
    for (const r of results ?? []) c[r.zone] += 1;
    return c;
  }, [results]);

  return (
    // 背景クリックは選択解除のためのマウス向け補助操作。
    // 各アバターは button なのでキーボードで選択でき、解除は Escape で行える。
    // biome-ignore lint/a11y/noStaticElementInteractions: 上記のとおりキーボード操作の代替手段がある
    // biome-ignore lint/a11y/useKeyWithClickEvents: 解除は window の Escape ハンドラで実装している
    <div className="floor" onClick={() => onSelect(null)}>
      {ZONES.map((zone, i) => (
        <div
          key={zone.key}
          className={`band band--${zone.key}`}
          style={{ left: `${i * BAND}%`, width: `${BAND}%` }}
        >
          <div className="bandLabel">{zone.label}</div>
          <div className="bandCount">
            {placed && results ? (
              <>
                <strong>{counts[zone.key]}</strong>人
              </>
            ) : (
              <span className="bandCountWaiting">—</span>
            )}
          </div>
        </div>
      ))}

      {panelists.map((p) => {
        const place = placements.get(p.id);
        if (!place) return null;

        const judgement = byId.get(p.id);
        const dimmed = activeCategory !== null && p.category !== activeCategory;
        const selected = selectedId === p.id;

        return (
          <button
            type="button"
            key={p.id}
            className={[
              "panelist",
              dimmed ? "panelist--dimmed" : "",
              selected ? "panelist--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${place.x}%`,
              top: `${place.y}%`,
              width: `${place.width}%`,
              zIndex: selected ? 999 : place.z,
              transitionDelay: `${place.order * 16}ms`,
              opacity: judgement
                ? 0.45 + (judgement.confidence ?? 1) * 0.55
                : 1,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(selected ? null : p.id);
            }}
            aria-label={`${p.name}（${p.category}）`}
          >
            <Avatar
              id={p.id}
              title={p.name}
              invest={
                judgement?.invest !== null && (judgement?.invest ?? 0) > 0.6
              }
            />
            <span className="panelistName">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 判定前の待機位置。手前中央に固まって立っている状態。 */
function waitingLayout(): Map<string, Placement> {
  const perRow = 20;
  const map = new Map<string, Placement>();

  panelists.forEach((p, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    map.set(p.id, {
      x: 9 + (82 / (perRow - 1)) * col,
      y: 56 + row * 8,
      width: 3.6,
      z: 100 + row,
      order: i,
    });
  });

  return map;
}

/**
 * 判定後の立ち位置。
 * 陣地は score の3分類で決まり、陣地内はスコアの高い順に手前へ並ぶ。
 */
function placedLayout(results: Judgement[]): Map<string, Placement> {
  const map = new Map<string, Placement>();
  const ordered = [...results].sort((a, b) => b.score - a.score);
  // スコアの高い人から順に動き出すよう、移動の遅延に使う順番を先に引いておく
  const orderOf = new Map(ordered.map((r, i) => [r.id, i]));

  ZONES.forEach((zone, zoneIndex) => {
    const members = ordered.filter((r) => r.zone === zone.key);
    if (members.length === 0) return;

    const perRow = Math.max(3, Math.ceil(Math.sqrt(members.length * 1.7)));
    const rows = Math.ceil(members.length / perRow);
    const bandStart = zoneIndex * BAND;
    const pad = BAND * 0.07;
    const usable = BAND - pad * 2;

    members.forEach((member, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inThisRow = Math.min(perRow, members.length - row * perRow);
      const depth = rows <= 1 ? 1 : 1 - row / (rows - 1);
      const scale = 0.72 + depth * 0.28;

      map.set(member.id, {
        // 行ごとに実際の人数で割り、最後の行も中央に寄るようにする
        x:
          bandStart +
          pad +
          (usable / inThisRow) * (col + 0.5) +
          jitter(member.id, "x") * 0.4,
        // 手前（y が大きい）にスコアの高い人が立つ
        y:
          76 -
          (rows <= 1 ? 0 : row / (rows - 1)) * 54 +
          jitter(member.id, "y") * 0.8,
        width: (usable / perRow) * 0.9 * scale,
        z: 100 + (rows - row),
        order: orderOf.get(member.id) ?? 0,
      });
    });
  });

  return map;
}
