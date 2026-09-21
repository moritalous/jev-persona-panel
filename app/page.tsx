"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Avatar from "@/components/Avatar";
import VotingFloor from "@/components/VotingFloor";
import {
  categories,
  type JudgeResponse,
  LEVEL_LABELS,
  LEVELS,
  MAX_SCORE,
  panelists,
  summarize,
  ZONES,
} from "@/lib/panel";

const SAMPLES = [
  "使わなくなった楽器を、近所の子どもに月額で貸し出すサービス",
  "冷蔵庫の中身を撮るだけで、余り物から献立を提案してくれるアプリ",
  "空いている寺の本堂を、平日だけコワーキングスペースとして貸し出す事業",
  "職人の手の動きをセンサーで記録し、技能を次世代へ引き継ぐ装置",
];

const MAX_LENGTH = 4000;

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JudgeResponse | null>(null);
  const [placed, setPlaced] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [samplesOpen, setSamplesOpen] = useState(true);
  // 最初は入力欄を画面の中央に出し、実行したら右の定位置へ飛ばす
  const [intro, setIntro] = useState(true);
  const composerRef = useRef<HTMLElement>(null);

  /**
   * 入力欄を中央から右の定位置へ移す。
   * 位置が変わる前後の矩形を測り、その差を打ち消す変形から戻す（FLIP）ことで、
   * レイアウトを壊さずに「飛んでいく」動きだけを見せる。
   */
  const leaveIntro = useCallback(() => {
    const el = composerRef.current;
    if (!el) {
      setIntro(false);
      return;
    }

    const first = el.getBoundingClientRect();
    // 直後に測り直したいので、この更新だけは同期的に反映させる
    flushSync(() => setIntro(false));
    const last = el.getBoundingClientRect();

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const scale = last.width === 0 ? 1 : first.width / last.width;

    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: "translate(0, 0) scale(1)" },
      ],
      {
        duration: 640,
        easing: "cubic-bezier(0.34, 0.68, 0.22, 1)",
        composite: "replace",
      },
    ).startTime = document.timeline.currentTime;
  }, []);

  useEffect(() => {
    if (!intro) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") leaveIntro();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [intro, leaveIntro]);

  // 背景クリックと同じ「選択解除」をキーボードからも行えるようにする
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const stats = useMemo(() => (data ? summarize(data.results) : null), [data]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const panelist = panelists.find((p) => p.id === selectedId);
    const judgement = data?.results.find((r) => r.id === selectedId) ?? null;
    return panelist ? { panelist, judgement } : null;
  }, [selectedId, data]);

  // map のコールバック内でも型が絞り込まれるようにローカルへ束縛する
  const judgement = selected?.judgement ?? null;
  const peakLevel = judgement
    ? judgement.probabilities.indexOf(Math.max(...judgement.probabilities))
    : -1;

  async function run() {
    const trimmed = idea.trim();
    if (!trimmed || loading) return;

    if (intro) leaveIntro();

    setLoading(true);
    setError(null);
    setSelectedId(null);
    // いったん待機位置へ戻してから、新しい結果へ移動させる
    setPlaced(false);

    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "判定に失敗しました。");
      }

      setData(json as JudgeResponse);
      // 結果が出たら、右側の場所を詳細に譲る
      setSamplesOpen(false);
      // 次のフレームで移動を開始させ、transition を確実に走らせる
      requestAnimationFrame(() => setPlaced(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "判定に失敗しました。");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const total = data?.results.length ?? 0;

  return (
    <main className="page">
      {/* 幕のクリックでも閉じられる。Escape と「先に画面を見る」が本来の手段。 */}
      <div
        className={`introBackdrop ${intro ? "introBackdrop--on" : ""}`}
        onClick={leaveIntro}
        aria-hidden="true"
      />

      <header className="masthead" inert={intro || undefined}>
        <div className="mastheadName">
          <p className="kicker">
            <span className="kickerMark" aria-hidden="true" />
            Jev Persona Panel
          </p>
          <h1 className="title">
            <span className="titleMain">新規事業ウケるかな？</span>
            <span className="titleSub">パネル</span>
          </h1>
        </div>
        <ul className="facts">
          <li>
            <strong>100</strong>
            <span>人のパネリスト</span>
          </li>
          <li>
            <strong>200</strong>
            <span>問を1リクエスト</span>
          </li>
          <li>
            <strong>Jev</strong>
            <span>文章生成モデルは不使用</span>
          </li>
        </ul>
      </header>

      <div className="workspace">
        <section
          ref={composerRef}
          className={`composer ${intro ? "composer--intro" : ""}`}
          {...(intro
            ? {
                role: "dialog" as const,
                "aria-modal": true,
                "aria-labelledby": "composerHeading",
              }
            : {})}
        >
          <div className="composerTop">
            <label
              className="composerLabel"
              htmlFor="idea"
              id="composerHeading"
            >
              <span className="stepNum" aria-hidden="true">
                1
              </span>
              新規事業のアイデアを書く
            </label>
            <span className="counter" aria-hidden="true">
              {idea.length} / {MAX_LENGTH}
            </span>
          </div>

          {intro ? (
            <p className="introLead">
              100人のパネリストが、それぞれ「興味を持つか」を判定します。
              書いて押すと、3つの列に分かれて並びます。
            </p>
          ) : null}

          <textarea
            id="idea"
            className="textarea"
            // biome-ignore lint/a11y/noAutofocus: 入力欄がひとつだけの道具なので、起点を示すために最初から合わせる
            autoFocus
            value={idea}
            maxLength={MAX_LENGTH}
            rows={intro ? 3 : 2}
            placeholder="例：使わなくなった楽器を、近所の子どもに月額で貸し出すサービス"
            onChange={(event) => setIdea(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void run();
              }
            }}
          />

          <details
            className="samples"
            open={samplesOpen}
            onToggle={(event) => setSamplesOpen(event.currentTarget.open)}
          >
            <summary className="samplesLabel">お題の例</summary>
            <div className="samplesList">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="chip chip--sample"
                  title={sample}
                  onClick={() => setIdea(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </details>

          <div className="actions">
            <button
              type="button"
              className={`primary ${loading ? "primary--busy" : ""}`}
              onClick={() => void run()}
              disabled={loading || idea.trim().length === 0}
            >
              <span className="primaryLabel">
                {loading ? "100人に聞いています" : "100人に聞く"}
              </span>
              {loading ? <span className="dots" aria-hidden="true" /> : null}
            </button>
            <span className="hint">
              <kbd>⌘</kbd>
              <span>/</span>
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>Enter</kbd>
              でも実行できます
            </span>
          </div>

          {intro ? (
            <button type="button" className="ghost" onClick={leaveIntro}>
              先に画面を見る
            </button>
          ) : null}

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          {data?.mock ? (
            <p className="notice">
              <strong>モックモード</strong>
              実際の判定を行うには <code>.env.local</code> に{" "}
              <code>TYPESAFE_API_KEY</code> を設定してください。
            </p>
          ) : null}
        </section>

        <div className="main" inert={intro || undefined}>
          <p className="stageIntro">
            <span className="stepNum" aria-hidden="true">
              2
            </span>
            <b>100人が、自分の答えの列に並ぶ</b>
            <span>
              前に立つ人ほどスコアが高い。ひとりクリックすると、判定の内訳が出ます。
            </span>
          </p>

          <VotingFloor
            results={data?.results ?? null}
            placed={placed}
            loading={loading}
            intro={intro}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeCategory={activeCategory}
          />

          <section className="summary" aria-label="判定の集計">
            <div className="hero">
              <p className="heroLabel">平均スコア</p>
              <p className="heroValue">
                {stats && placed ? (
                  stats.average.toFixed(2)
                ) : (
                  <span className="heroWaiting">—</span>
                )}
                <span className="heroMax">/ {MAX_SCORE.toFixed(2)}</span>
              </p>
            </div>

            <div className="share">
              <div
                className={`shareBar ${stats && placed ? "" : "shareBar--empty"}`}
              >
                {ZONES.map((zone) => {
                  const n = stats && placed ? stats.counts[zone.key] : 0;
                  return (
                    <span
                      key={zone.key}
                      className={`shareSeg shareSeg--${zone.key}`}
                      style={{ flexGrow: total > 0 ? Math.max(n, 0.001) : 1 }}
                    />
                  );
                })}
              </div>
              <ul className="legend">
                {ZONES.map((zone) => {
                  const n = stats && placed ? stats.counts[zone.key] : null;
                  return (
                    <li key={zone.key}>
                      <span
                        className={`swatch swatch--${zone.key}`}
                        aria-hidden="true"
                      />
                      <span className="legendLabel">{zone.label}</span>
                      <span className="legendValue">
                        {n === null ? "—" : `${n}人`}
                      </span>
                      <span className="legendShare">
                        {n === null || total === 0
                          ? ""
                          : `${Math.round((n / total) * 100)}%`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="filters" aria-label="カテゴリで絞り込む">
            <span className="filtersLabel">絞り込み</span>
            <button
              type="button"
              className={`chip ${activeCategory === null ? "chip--on" : ""}`}
              onClick={() => setActiveCategory(null)}
            >
              全員<span className="chipNum">{panelists.length}</span>
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`chip ${activeCategory === category ? "chip--on" : ""}`}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === category ? null : category,
                  )
                }
              >
                {category}
                <span className="chipNum">
                  {panelists.filter((p) => p.category === category).length}
                </span>
              </button>
            ))}
          </section>
        </div>

        <aside className="rail" inert={intro || undefined}>
          <section className="card detail">
            {selected ? (
              <>
                <div className="detailHead">
                  <div className="detailAvatar">
                    <Avatar id={selected.panelist.id} />
                  </div>
                  <div className="detailIdent">
                    <h2 className="detailName">{selected.panelist.name}</h2>
                    <p className="detailMeta">
                      {selected.panelist.category}
                      <span className="dot" aria-hidden="true" />
                      {selected.panelist.kind === "figure"
                        ? "著名人をモデルにした架空の人物"
                        : "業界・業種のペルソナ"}
                    </p>
                  </div>
                </div>

                {judgement ? (
                  <div className="judgement">
                    <p className="quote">{judgement.levelText}</p>

                    <dl className="metrics">
                      <div>
                        <dt>期待値</dt>
                        <dd>{judgement.score.toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt>確信度</dt>
                        <dd>
                          {(judgement.confidence * 100).toFixed(0)}
                          <small>%</small>
                        </dd>
                      </div>
                      {judgement.invest !== null ? (
                        <div>
                          <dt>出資</dt>
                          <dd>
                            {(judgement.invest * 100).toFixed(0)}
                            <small>%</small>
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    <p className="distTitle">確率分布</p>
                    <div className="dist">
                      {LEVELS.map((level, i) => {
                        const value = judgement.probabilities[i] ?? 0;
                        return (
                          <div
                            className={`distRow ${i === peakLevel ? "distRow--peak" : ""}`}
                            key={level}
                            title={level}
                          >
                            <span className="distLabel">{LEVEL_LABELS[i]}</span>
                            <span className="distTrack">
                              <span
                                className="distFill"
                                style={{ width: `${value * 100}%` }}
                              />
                            </span>
                            <span className="distValue">
                              {(value * 100).toFixed(0)}
                              <small>%</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="detailMeta">まだ判定していません。</p>
                )}

                <div className="profile">
                  <p className="detailProfile">{selected.panelist.profile}</p>
                  <ul className="interests">
                    {selected.panelist.interests.map((interest) => (
                      <li key={interest}>{interest}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="empty">
                <h2 className="cardTitle">
                  <span className="stepNum" aria-hidden="true">
                    3
                  </span>
                  ひとりを開く
                </h2>
                <span className="emptyMark" aria-hidden="true" />
                <p className="emptyText">
                  列に並んだ人をクリックすると、
                  <br />
                  その人物の判定の内訳とプロフィールが出ます。
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>

      <footer className="footer" inert={intro || undefined}>
        <p className="runLine">
          <b>この回の記録</b>
          {data && placed ? (
            <>
              <span>モデル {data.model}</span>
              <span>{data.questionCount}問を1リクエスト</span>
              <span>{data.elapsedMs.toLocaleString()} ms</span>
              {data.usage ? (
                <span>
                  入力 {data.usage.input_tokens.toLocaleString()} トークン
                </span>
              ) : null}
            </>
          ) : (
            <span>判定すると、使ったモデルと所要時間がここに出ます。</span>
          )}
        </p>
        <p className="disclaimer">
          パネリストは実在の人物をモデルにした架空の人物です。判定は AI
          による推定であり、モデルとなった人物本人の見解を示すものではありません。
        </p>
      </footer>
    </main>
  );
}
