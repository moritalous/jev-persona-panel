/**
 * 舞台（投票フロア）の座標。
 *
 * 3つの陣地は、左右の境界が垂直な「列」として並ぶ。
 * 列の中では、スコアの高い人ほど手前（下）に立ち、奥の人ほど小さく描く。
 * 列の幅は奥行きで変わらないので、どの高さで見ても3列の切れ目が一致する。
 */

/** 最後列・最前列の足元の位置（フロアの高さに対する %） */
export const BACK_Y = 22;
export const FRONT_Y = 91;

/** 最後列のアバターの大きさ（最前列に対する比率） */
export const FAR_SCALE = 0.6;

/**
 * 行の深さ t（0 = 最奥、1 = 最前）から足元の y（%）を求める。
 * 指数を掛けて、奥の行ほど間隔が詰まって見えるようにしている。
 */
export function depthToY(t: number): number {
  return BACK_Y + (FRONT_Y - BACK_Y) * t ** 1.3;
}

/** 行の深さ t から、アバターの大きさの倍率を求める。 */
export function scaleAt(t: number): number {
  return FAR_SCALE + (1 - FAR_SCALE) * t;
}

/**
 * 行の間隔。8行でフロアの奥行きをちょうど使い切る。
 *
 * 行数に関係なく間隔を一定にすることで、人数の少ない列は手前だけが埋まり、
 * 多い列は奥まで伸びる。列の「厚み」がそのまま人数として読める。
 */
const ROW_STEP = 1 / 7;

/** 手前から数えた行番号と総行数から、その行の深さ t を求める。 */
export function rowDepth(row: number, rows: number): number {
  if (rows <= 1) return 1;
  // 8行を超える列は、はみ出さないよう間隔を詰める
  const step = Math.min(ROW_STEP, 1 / (rows - 1));
  return Math.max(0, 1 - row * step);
}

/** フロアに引く奥行き方向の罫線の位置（フロアの高さに対する %） */
export const DEPTH_RULES = [1, 5 / 7, 3 / 7, 1 / 7].map((t) => depthToY(t) + 3);
