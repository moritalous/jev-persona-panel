/**
 * パネリストの id から決定的にアバターのパーツを決める。
 * 外部アセットに依存せず、同じ id なら常に同じ見た目になる。
 */

const SKINS = ["#f6d5bd", "#e8bd9a", "#c68a63", "#8d5a3c"];
const HAIRS = [
  "#2b2b33",
  "#4b3527",
  "#7a6a5a",
  "#b9b3ad",
  "#e7e2db",
  "#6b3f2a",
];
const SHIRTS = [
  "#4f8ef7",
  "#ef5f8a",
  "#3fbf8f",
  "#f0a93b",
  "#8a6ef0",
  "#43b6d6",
  "#e0625a",
  "#6f8f3f",
];

export type AvatarParts = {
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: number;
  eyeStyle: number;
  mouthStyle: number;
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarParts(id: string): AvatarParts {
  const h = hash(id);
  // h は 2^31 を超え得るため、符号付きシフト（>>）では負の添字になる。必ず >>> を使う。
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 3) % HAIRS.length],
    shirt: SHIRTS[(h >>> 7) % SHIRTS.length],
    hairStyle: (h >>> 11) % 6,
    eyeStyle: (h >>> 15) % 3,
    mouthStyle: (h >>> 19) % 3,
  };
}

/** 同じ id から -1〜1 の決定的な揺らぎを作る（立ち位置の微調整用） */
export function jitter(id: string, salt = ""): number {
  return ((hash(id + salt) % 1000) / 1000) * 2 - 1;
}
