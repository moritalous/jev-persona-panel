import panelistsJson from "@/data/panelists.json";

export type PanelistKind = "figure" | "archetype";

export type Panelist = {
  id: string;
  name: string;
  kind: PanelistKind;
  category: string;
  profile: string;
  interests: string[];
};

export const panelists = panelistsJson as Panelist[];

export const categories = Array.from(new Set(panelists.map((p) => p.category)));

/**
 * Jev の score 質問に渡すルーブリック。
 * 0 から順に並べた 2〜10 件の説明で、返る score はこの添字の期待値（小数を含む）になる。
 */
export const LEVELS = [
  "全く興味を示さず、自分には関係のないことだと考える",
  "懐疑的で、うまくいかないだろうと考える",
  "悪くはないと思うが、自分から積極的に関わろうとは思わない",
  "関心を持ち、もっと詳しく知りたいと考える",
  "強い興味を示し、自ら関わりたいと考える",
] as const;

export const MAX_SCORE = LEVELS.length - 1;

/**
 * 画面に並べるときの短い見出し。
 * Jev へ渡すのはあくまで LEVELS のほうで、こちらは表示専用。
 */
export const LEVEL_LABELS = [
  "興味なし",
  "懐疑的",
  "中立",
  "関心あり",
  "強い関心",
] as const;

export type ZoneKey = "interested" | "neutral" | "not";

export type Zone = {
  key: ZoneKey;
  label: string;
  /** この陣地に入る score の下限（以上） */
  min: number;
};

/** 画面左から順に並べる。5段階の判定を3つの陣地へ畳む。 */
export const ZONES: Zone[] = [
  { key: "interested", label: "興味ある", min: 2.5 },
  { key: "neutral", label: "あんまりない", min: 1.5 },
  { key: "not", label: "ない", min: -Infinity },
];

export function zoneOf(score: number): ZoneKey {
  for (const z of ZONES) {
    if (score >= z.min) return z.key;
  }
  return "not";
}

export type Judgement = {
  id: string;
  /** 0〜4 の期待値。整数レベルの間の値を取り得る。 */
  score: number;
  /** 0〜1。分布が尖っているほど高い。 */
  confidence: number;
  /** score を四捨五入した代表レベルの説明文 */
  levelText: string;
  /** レベルごとの確率（添字が score に対応） */
  probabilities: number[];
  /** 「自分の資金を出すか」の確率。質問しなかった場合は null */
  invest: number | null;
  zone: ZoneKey;
};

export type JudgeResponse = {
  results: Judgement[];
  model: string;
  usage: { input_tokens: number; output_tokens: number } | null;
  /** API キーが無く、疑似データで動作している場合に true */
  mock: boolean;
  elapsedMs: number;
  questionCount: number;
};

export function levelTextOf(score: number): string {
  const i = Math.min(MAX_SCORE, Math.max(0, Math.round(score)));
  return LEVELS[i];
}

export function summarize(results: Judgement[]) {
  const counts: Record<ZoneKey, number> = { interested: 0, neutral: 0, not: 0 };
  for (const r of results) counts[r.zone] += 1;
  const average = results.length
    ? results.reduce((a, r) => a + r.score, 0) / results.length
    : 0;
  return { counts, average };
}
