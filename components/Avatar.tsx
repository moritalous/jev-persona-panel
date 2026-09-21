import type { ReactNode } from "react";
import { avatarParts } from "@/lib/avatar";

type Props = {
  id: string;
  title?: string;
  /** 「自分の資金を出す」確率が高い場合に硬貨マークを付ける */
  invest?: boolean;
};

const INK = "#000000";

/** 白い床の上でも輪郭が立つよう、シルエットには黒線を回す */
const LINE = {
  stroke: INK,
  strokeWidth: 0.9,
  strokeLinejoin: "round",
} as const;

/**
 * id から決定的に生成する記号的なアバター。
 * 実在人物の肖像には寄せず、パーツの組み合わせで個体差を出す。
 *
 * 100人分が同時に描画されるため、filter や gradient のような
 * id を必要とする定義は使わず、平面的な図形だけで陰影を作っている。
 */
export default function Avatar({ id, title, invest = false }: Props) {
  const a = avatarParts(id);
  const { back, front } = hair(a.hairStyle, a.hair);

  return (
    <svg
      viewBox="0 0 40 60"
      className="avatarSvg"
      role="img"
      aria-label={title ?? "パネリスト"}
    >
      {title ? <title>{title}</title> : null}

      <g {...LINE}>{back}</g>

      {/* 胴体 */}
      <path
        d="M20 36 C12.2 36 6.8 41.4 5.8 50 L4.7 60 H35.3 L34.2 50 C33.2 41.4 27.8 36 20 36 Z"
        fill={a.shirt}
        {...LINE}
      />
      {/* 胴体の陰（右側）。上に重ねて立体感を出す */}
      <path
        d="M20 36 C27.8 36 33.2 41.4 34.2 50 L35.3 60 H24.6 Z"
        fill="rgba(0,0,0,.14)"
      />
      {/* 襟 */}
      <path
        d="M16.2 36.7 L20 41.8 L23.8 36.7 L21.9 36.1 L20 38.4 L18.1 36.1 Z"
        fill="rgba(255,255,255,.55)"
      />
      {/* 首 */}
      <path d="M16.9 28 h6.2 v8.4 h-6.2 Z" fill={a.skin} {...LINE} />
      <path
        d="M16.9 28 h6.2 v3.2 a10 10 0 0 1 -6.2 0 Z"
        fill="rgba(0,0,0,.14)"
      />

      {/* 頭 */}
      <ellipse cx="20" cy="19" rx="12.2" ry="12.8" fill={a.skin} {...LINE} />
      {/* 耳 */}
      <ellipse cx="8.3" cy="20.4" rx="1.6" ry="2.1" fill={a.skin} {...LINE} />
      <ellipse cx="31.7" cy="20.4" rx="1.6" ry="2.1" fill={a.skin} {...LINE} />
      {/* 頬のハイライト（左上からの照明） */}
      <ellipse
        cx="14.8"
        cy="17.2"
        rx="5"
        ry="4.4"
        fill="rgba(255,255,255,.09)"
      />

      <g {...LINE}>{front}</g>

      {beard(a.beard, a.hair)}
      {eyes(a.eyeStyle)}
      {mouth(a.mouthStyle)}
      {a.glasses ? glasses() : null}

      {/* 出資に前向きな人物の印。SVG 内に置くことでアバターと一緒に拡大縮小する。 */}
      {invest ? (
        <g>
          <circle cx="32.4" cy="44.6" r="6.6" fill="#fff" />
          <circle cx="32.4" cy="44.6" r="5.4" fill={INK} />
          <text
            x="32.4"
            y="47.4"
            textAnchor="middle"
            fontSize="7.8"
            fontWeight="700"
            fill="#fff"
          >
            ¥
          </text>
        </g>
      ) : null}
    </svg>
  );
}

type Hair = { back: ReactNode; front: ReactNode };

const NONE = <></>;

function hair(style: number, color: string): Hair {
  switch (style) {
    case 0: // 短髪
      return {
        back: NONE,
        front: (
          <path
            d="M7.9 19 a12.1 12.1 0 0 1 24.2 0 v1.8 c-1.7 -4 -5.8 -6 -12.1 -6 s-10.4 2 -12.1 6 Z"
            fill={color}
          />
        ),
      };
    case 1: // 前髪ぱっつん
      return {
        back: NONE,
        front: (
          <path
            d="M7.9 19 a12.1 12.1 0 0 1 24.2 0 v4.4 h-3.5 l-1.1 -3.6 h-15 l-1.1 3.6 h-3.5 Z"
            fill={color}
          />
        ),
      };
    case 2: // ロング
      return {
        back: (
          <path
            d="M6.2 19 a13.8 13.8 0 0 1 27.6 0 v17.6 h-5.4 v-15 h-16.8 v15 h-5.4 Z"
            fill={color}
          />
        ),
        front: (
          <path
            d="M7.9 19 a12.1 12.1 0 0 1 24.2 0 v2.6 c-4 -3.4 -6.4 -5.6 -8.2 -8 c-2.8 3.4 -8.6 6.4 -16 7.6 Z"
            fill={color}
          />
        ),
      };
    case 3: // ポニーテール
      return {
        back: (
          <>
            <path
              d="M31 22 c5.2 1.2 6.6 5.8 5.2 10.4 c-1 3.2 -3.4 4 -4.6 3.2 c1.8 -4.4 1.4 -8.6 -1.8 -11.6 Z"
              fill={color}
            />
            <circle cx="31.6" cy="21.6" r="3" fill={color} />
          </>
        ),
        front: (
          <path
            d="M7.9 19 a12.1 12.1 0 0 1 24.2 0 v1.8 c-3.6 -2.2 -5.6 -4.6 -7.4 -7.4 c-3 3.6 -9 6.2 -16.8 7.2 Z"
            fill={color}
          />
        ),
      };
    case 4: // 薄毛
      return {
        back: NONE,
        front: (
          <path
            d="M8 21.4 a12.1 12.1 0 0 1 4.6 -9.6 l1.4 2.4 a10 10 0 0 0 -3.8 7.2 Z M32 21.4 a12.1 12.1 0 0 0 -4.6 -9.6 l-1.4 2.4 a10 10 0 0 1 3.8 7.2 Z"
            fill={color}
          />
        ),
      };
    case 5: // ボリュームのある髪
      return {
        back: (
          <path
            d="M20 3.4 c8.6 0 14.6 5.8 14.6 12.4 c0 3.4 -1.4 6 -3.2 7.4 c.6 -6.6 -4 -11.4 -11.4 -11.4 s-12 4.8 -11.4 11.4 c-1.8 -1.4 -3.2 -4 -3.2 -7.4 c0 -6.6 6 -12.4 14.6 -12.4 Z"
            fill={color}
          />
        ),
        front: (
          <path
            d="M8.2 19.4 a11.9 11.9 0 0 1 23.6 0 a11.9 8.6 0 0 0 -23.6 0 Z"
            fill={color}
          />
        ),
      };
    case 6: // 七三分け
      return {
        back: NONE,
        front: (
          <path
            d="M7.9 19.4 a12.1 12.1 0 0 1 24.2 0 v1.4 c-1.6 -4.4 -5 -7 -9.6 -7.8 c1.6 2.2 2 4.4 1.4 6.6 c-3.2 -4.4 -8.8 -6 -16 -4.4 Z"
            fill={color}
          />
        ),
      };
    default: // お団子
      return {
        back: <circle cx="20" cy="7.8" r="4.4" fill={color} />,
        front: (
          <path
            d="M7.9 19.4 a12.1 12.1 0 0 1 24.2 0 v1 c-2.6 -3.8 -7 -5.8 -12.1 -5.8 s-9.5 2 -12.1 5.8 Z"
            fill={color}
          />
        ),
      };
  }
}

function eyes(style: number) {
  if (style === 0) {
    return (
      <>
        <circle cx="15.6" cy="20.2" r="1.55" fill={INK} />
        <circle cx="24.4" cy="20.2" r="1.55" fill={INK} />
      </>
    );
  }
  if (style === 1) {
    // 細めた目
    return (
      <>
        <rect x="13.8" y="19.6" width="3.7" height="1.3" rx="0.65" fill={INK} />
        <rect x="22.5" y="19.6" width="3.7" height="1.3" rx="0.65" fill={INK} />
      </>
    );
  }
  if (style === 2) {
    // 見開いた目
    return (
      <>
        <ellipse cx="15.6" cy="20.2" rx="1.95" ry="2.3" fill={INK} />
        <ellipse cx="24.4" cy="20.2" rx="1.95" ry="2.3" fill={INK} />
        <circle cx="16.25" cy="19.45" r="0.62" fill="#fff" />
        <circle cx="25.05" cy="19.45" r="0.62" fill="#fff" />
      </>
    );
  }
  // 笑った目
  return (
    <>
      <path
        d="M13.7 20.8 q1.9 -2.5 3.8 0"
        stroke={INK}
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22.5 20.8 q1.9 -2.5 3.8 0"
        stroke={INK}
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

function mouth(style: number) {
  if (style === 0) {
    return (
      <path
        d="M17 25.4 q3 2.8 6 0"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (style === 1) {
    return (
      <rect x="17.4" y="25.6" width="5.2" height="1.1" rx="0.55" fill={INK} />
    );
  }
  if (style === 2) {
    return <ellipse cx="20" cy="26" rx="1.35" ry="1.6" fill={INK} />;
  }
  // 口角の下がった口
  return (
    <path
      d="M17.2 26.6 q2.8 -2.4 5.6 0"
      stroke={INK}
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function beard(style: number, color: string) {
  if (style === 1) {
    // 顎髭
    return (
      <path d="M17.4 28.4 q2.6 3.4 5.2 0 q-2.6 1.4 -5.2 0 Z" fill={color} />
    );
  }
  if (style === 2) {
    // 口髭と顎髭
    return (
      <>
        <path d="M16.6 24.2 q3.4 -1.6 6.8 0 q-3.4 1.2 -6.8 0 Z" fill={color} />
        <path
          d="M12.6 24.6 a7.6 7.6 0 0 0 14.8 0 a9 9 0 0 1 -14.8 0 Z"
          fill={color}
        />
      </>
    );
  }
  return null;
}

function glasses() {
  return (
    <g fill="none" stroke={INK} strokeWidth="0.95" opacity="0.85">
      <rect x="11.6" y="17.4" width="7.2" height="5.4" rx="2.2" />
      <rect x="21.2" y="17.4" width="7.2" height="5.4" rx="2.2" />
      <path d="M18.8 20 h2.4" />
      <path d="M11.6 19.4 h-3.2" />
      <path d="M28.4 19.4 h3.2" />
    </g>
  );
}
