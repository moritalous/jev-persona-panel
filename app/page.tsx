"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import VotingFloor from "@/components/VotingFloor";
import {
  categories,
  type JudgeResponse,
  LEVELS,
  panelists,
  summarize,
} from "@/lib/panel";

const SAMPLES = [
  "使わなくなった楽器を、近所の子どもに月額で貸し出すサービス",
  "冷蔵庫の中身を撮るだけで、余り物から献立を提案してくれるアプリ",
  "空いている寺の本堂を、平日だけコワーキングスペースとして貸し出す事業",
  "職人の手の動きをセンサーで記録し、技能を次世代へ引き継ぐ装置",
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JudgeResponse | null>(null);
  const [placed, setPlaced] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  async function run() {
    const trimmed = idea.trim();
    if (!trimmed || loading) return;

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
      // 次のフレームで移動を開始させ、transition を確実に走らせる
      requestAnimationFrame(() => setPlaced(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "判定に失敗しました。");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <h1 className="title">新規事業ウケるかな？パネル</h1>
        <p className="lead">
          新規事業のアイデアを入力すると、100人のパネリストが「興味を持つか」を判定し、
          立ち位置で結果を示します。判定は Jev（TypeSafe AI）による推定です。
          100人分の判定は、API 呼び出し1回でまとめて行っています。
        </p>
      </header>

      <section className="inputCard">
        <label className="inputLabel" htmlFor="idea">
          新規事業のアイデア
        </label>
        <textarea
          id="idea"
          className="textarea"
          value={idea}
          maxLength={4000}
          rows={3}
          placeholder="例：使わなくなった楽器を、近所の子どもに月額で貸し出すサービス"
          onChange={(event) => setIdea(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              void run();
            }
          }}
        />

        <div className="samples">
          <span className="samplesLabel">お題の例</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              className="chip"
              onClick={() => setIdea(sample)}
            >
              {sample.length > 22 ? `${sample.slice(0, 22)}…` : sample}
            </button>
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={() => void run()}
            disabled={loading || idea.trim().length === 0}
          >
            {loading ? "100人に聞いています…" : "100人に聞く"}
          </button>
          <span className="hint">⌘ / Ctrl + Enter でも実行できます</span>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      {data?.mock ? (
        <p className="notice notice--warn">
          モックモードで動作しています。実際の判定を行うには{" "}
          <code>.env.local</code> に <code>TYPESAFE_API_KEY</code>{" "}
          を設定してください。
        </p>
      ) : null}

      <VotingFloor
        results={data?.results ?? null}
        placed={placed}
        selectedId={selectedId}
        onSelect={setSelectedId}
        activeCategory={activeCategory}
      />

      <section className="filters">
        <button
          type="button"
          className={`chip ${activeCategory === null ? "chip--on" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          全員（{panelists.length}）
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`chip ${activeCategory === category ? "chip--on" : ""}`}
            onClick={() =>
              setActiveCategory(activeCategory === category ? null : category)
            }
          >
            {category}（
            {panelists.filter((p) => p.category === category).length}）
          </button>
        ))}
      </section>

      <div className="lower">
        <section className="detail">
          {selected ? (
            <>
              <div className="detailHead">
                <div className="detailAvatar">
                  <Avatar id={selected.panelist.id} />
                </div>
                <div>
                  <h2 className="detailName">{selected.panelist.name}</h2>
                  <p className="detailMeta">
                    {selected.panelist.category} ／{" "}
                    {selected.panelist.kind === "figure"
                      ? "著名人をモデルにした架空の人物"
                      : "業界・業種のペルソナ"}
                  </p>
                </div>
              </div>

              <p className="detailProfile">{selected.panelist.profile}</p>

              <ul className="interests">
                {selected.panelist.interests.map((interest) => (
                  <li key={interest}>{interest}</li>
                ))}
              </ul>

              {judgement ? (
                <div className="judgement">
                  <p className="judgementLevel">「{judgement.levelText}」</p>
                  <dl className="metrics">
                    <div>
                      <dt>期待値</dt>
                      <dd>{judgement.score.toFixed(2)} / 4.00</dd>
                    </div>
                    <div>
                      <dt>確信度</dt>
                      <dd>{(judgement.confidence * 100).toFixed(0)}%</dd>
                    </div>
                    {judgement.invest !== null ? (
                      <div>
                        <dt>出資する確率</dt>
                        <dd>{(judgement.invest * 100).toFixed(0)}%</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="dist">
                    {LEVELS.map((level, i) => (
                      <div className="distRow" key={level}>
                        <span className="distLabel">{level}</span>
                        <span className="distBar">
                          <span
                            className="distFill"
                            style={{
                              width: `${(judgement.probabilities[i] ?? 0) * 100}%`,
                            }}
                          />
                        </span>
                        <span className="distValue">
                          {((judgement.probabilities[i] ?? 0) * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="detailMeta">まだ判定していません。</p>
              )}
            </>
          ) : (
            <p className="detailEmpty">
              アバターをクリックすると、その人物の判定の内訳を表示します。
            </p>
          )}
        </section>

        <section className="stats">
          <h2 className="statsTitle">集計</h2>
          {stats && data ? (
            <>
              <dl className="metrics metrics--stack">
                <div>
                  <dt>興味ある</dt>
                  <dd>{stats.counts.interested}人</dd>
                </div>
                <div>
                  <dt>あんまりない</dt>
                  <dd>{stats.counts.neutral}人</dd>
                </div>
                <div>
                  <dt>ない</dt>
                  <dd>{stats.counts.not}人</dd>
                </div>
                <div>
                  <dt>平均スコア</dt>
                  <dd>{stats.average.toFixed(2)} / 4.00</dd>
                </div>
              </dl>
              <p className="runInfo">
                モデル {data.model} ／ 質問 {data.questionCount} 問を1リクエスト
                <br />
                所要 {data.elapsedMs.toLocaleString()} ms
                {data.usage
                  ? ` ／ 入力 ${data.usage.input_tokens.toLocaleString()} トークン`
                  : ""}
              </p>
            </>
          ) : (
            <p className="detailEmpty">判定するとここに集計が出ます。</p>
          )}
        </section>
      </div>

      <footer className="footer">
        パネリストは実在の人物をモデルにした架空の人物です。判定は AI
        による推定であり、モデルとなった人物本人の見解を示すものではありません。
      </footer>
    </main>
  );
}
