import { noul, type Questions, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { getVercelOidcToken } from "@vercel/oidc";
import {
  type Judgement,
  type JudgeResponse,
  LEVELS,
  levelTextOf,
  MAX_SCORE,
  panelists,
  zoneOf,
} from "./panel";

/**
 * 「自分の資金を出すか」という noul 質問を各パネリストに追加するか。
 * true にすると質問数が 200 問になる。トークン予算には収まる見込みだが、
 * レイテンシが気になる場合は false にする。
 */
const ASK_INVESTMENT = true;

/**
 * SDK の既定は 1 試行あたり 10 秒。100〜200 問のリクエストが収まるか未検証のため
 * 明示的に伸ばしておく。
 */
const TIMEOUT_MS = 30_000;

const SCORE_PROMPT =
  "次の人物は、この新規事業のアイデアにどの程度興味を持つか。人物の経歴・価値観・関心領域に照らして判断すること。";
const INVEST_PROMPT = "次の人物は、この新規事業に自分の資金を出すか。";

function buildQuestions(): Questions {
  const questions: Questions = {};

  for (const p of panelists) {
    const person = {
      名前: p.name,
      紹介: p.profile,
      関心領域: p.interests,
    };

    questions[p.id] = score({ 問い: SCORE_PROMPT, 人物: person }, LEVELS);

    if (ASK_INVESTMENT) {
      questions[`${p.id}__invest`] = noul({
        問い: INVEST_PROMPT,
        人物: { 名前: p.name, 紹介: p.profile },
      });
    }
  }

  return questions;
}

/**
 * Vercel AI Gateway 経由で Jev を呼ぶときの入口。
 * SDK はそのままで、宛先と鍵を差し替えるだけで通る。
 * https://vercel.com/docs/ai-gateway/typesafe-api
 */
const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/typesafe";

/**
 * Gateway 側のモデル ID。直接叩くときの既定（jev-latest）とは名前が違うため、
 * Gateway 経由のときだけ明示する。TYPESAFE_DEFAULT_MODEL があればそちらを優先する。
 */
const GATEWAY_MODEL = "typesafe-ai/jev";

type Credentials = {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
};

function gatewayCredentials(apiKey: string): Credentials {
  return {
    apiKey,
    baseURL: GATEWAY_BASE_URL,
    defaultModel: process.env.TYPESAFE_DEFAULT_MODEL?.trim() || GATEWAY_MODEL,
  };
}

/**
 * OIDC を試す価値がある環境か。
 *
 * Vercel 上では、トークンはリクエストの `x-vercel-oidc-token` ヘッダーで渡され、
 * process.env には現れない。環境変数だけを見ていると本番で必ず素通りしてしまう。
 * ローカルでは vercel env pull が VERCEL_OIDC_TOKEN を書くので、そちらも見る。
 */
function mayHaveOidc(): boolean {
  return Boolean(
    process.env.VERCEL ??
      process.env.VERCEL_ENV ??
      process.env.VERCEL_OIDC_TOKEN,
  );
}

/**
 * 使う資格情報を決める。上から順に、見つかったものを使う。
 *
 * 1. AI_GATEWAY_API_KEY … Gateway 経由
 * 2. TYPESAFE_API_KEY  … TypeSafe へ直接
 * 3. Vercel の OIDC トークン … Gateway 経由。短命トークンなので毎リクエスト取り直す。
 *    長期の秘密をどこにも置かずに済む、いちばん安全な経路。
 *
 * 明示した鍵を OIDC より先に見るのは、Vercel 自身の優先順位に合わせるためと、
 * 環境変数を足しただけで経路が黙って変わらないようにするため。
 * OIDC を使うときは、鍵のほうを消して明示的に切り替える。
 *
 * どれも無ければ null を返し、呼び出し側がモックモードへ落ちる。
 */
async function credentials(): Promise<Credentials | null> {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) return gatewayCredentials(gatewayKey);

  const directKey = process.env.TYPESAFE_API_KEY?.trim();
  if (directKey) return { apiKey: directKey };

  if (mayHaveOidc()) {
    try {
      // 失効の5分前から取り直す
      const token = await getVercelOidcToken({
        expirationBufferMs: 5 * 60 * 1000,
      });
      if (token) return gatewayCredentials(token);
    } catch (error) {
      // OIDC が使えない環境ならモックモードへ落とす
      console.warn("[judge] OIDC トークンを取得できませんでした:", error);
    }
  }

  return null;
}

export async function judge(idea: string): Promise<JudgeResponse> {
  const creds = await credentials();
  if (!creds) return mockJudge(idea);

  const client = new TypeSafeClient({ ...creds, timeout: TIMEOUT_MS });
  const questions = buildQuestions();
  const startedAt = Date.now();

  // Jev は 1 リクエスト内の全質問を並列に評価するため、分割せず一度に投げる。
  const result = await client.systemOne(
    {
      state: { 新規事業のアイデア: idea },
      questions,
    },
    { timeout: TIMEOUT_MS },
  );

  const results: Judgement[] = panelists.map((p) => {
    const answer = result.answers[p.id];
    if (answer?.type !== "score") {
      throw new Error(`パネリスト ${p.id} の score 応答が得られませんでした`);
    }

    const investAnswer = result.answers[`${p.id}__invest`];
    const invest = investAnswer?.type === "noul" ? investAnswer.noul : null;

    const probabilities = Array.from({ length: LEVELS.length }, (_, i) => {
      const value = (answer.probabilities as Record<string, number>)[String(i)];
      return typeof value === "number" ? value : 0;
    });

    return {
      id: p.id,
      score: answer.score,
      confidence: answer.confidence,
      levelText: levelTextOf(answer.score),
      probabilities,
      invest,
      zone: zoneOf(answer.score),
    };
  });

  return {
    results,
    model: result.model,
    usage: result.usage,
    mock: false,
    elapsedMs: Date.now() - startedAt,
    questionCount: Object.keys(questions).length,
  };
}

/* ------------------------------------------------------------------ *
 * モックモード
 * API キーが無いときに UI を確認するための疑似判定。
 * アイデア文とパネリストの関心領域の重なりで score を作るため、
 * 入力を変えれば結果も変わる。
 * ------------------------------------------------------------------ */

function seededHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function mockJudge(idea: string): JudgeResponse {
  const startedAt = Date.now();

  const results: Judgement[] = panelists.map((p) => {
    const hits = p.interests.filter((interest) =>
      idea.includes(interest.slice(0, 3)),
    ).length;
    const noise = seededHash(p.id + idea);
    const raw = 0.6 + hits * 1.1 + noise * 2.6;
    const value = Math.min(MAX_SCORE, Math.max(0, raw));

    // 期待値らしく見えるダミーの分布を作る
    const weights = LEVELS.map((_, i) => Math.exp(-((i - value) ** 2) / 0.9));
    const total = weights.reduce((a, b) => a + b, 0);
    const probabilities = weights.map((w) => w / total);

    return {
      id: p.id,
      score: value,
      confidence: Math.max(...probabilities),
      levelText: levelTextOf(value),
      probabilities,
      invest: Math.min(1, Math.max(0, value / MAX_SCORE - 0.15 + noise * 0.2)),
      zone: zoneOf(value),
    };
  });

  return {
    results,
    model: "mock",
    usage: null,
    mock: true,
    elapsedMs: Date.now() - startedAt,
    questionCount: ASK_INVESTMENT ? panelists.length * 2 : panelists.length,
  };
}
