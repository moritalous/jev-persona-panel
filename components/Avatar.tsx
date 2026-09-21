import { avatarParts } from "@/lib/avatar";

type Props = {
  id: string;
  title?: string;
  /** 「自分の資金を出す」確率が高い場合に硬貨マークを付ける */
  invest?: boolean;
};

/**
 * id から決定的に生成する記号的なアバター。
 * 実在人物の肖像には寄せず、パーツの組み合わせで個体差を出す。
 */
export default function Avatar({ id, title, invest = false }: Props) {
  const a = avatarParts(id);
  const { back, front } = hair(a.hairStyle, a.hair);

  return (
    <svg
      viewBox="0 0 40 58"
      className="avatarSvg"
      role="img"
      aria-label={title ?? "パネリスト"}
    >
      {title ? <title>{title}</title> : null}

      {back}

      {/* 胴体 */}
      <path
        d="M5 58 C5 45 11.5 39 20 39 C28.5 39 35 45 35 58 Z"
        fill={a.shirt}
      />
      {/* 襟 */}
      <path d="M16.5 39.5 L20 44 L23.5 39.5 Z" fill="rgba(255,255,255,.35)" />
      {/* 首 */}
      <rect x="17" y="29" width="6" height="9" rx="2" fill={a.skin} />
      {/* 頭 */}
      <circle cx="20" cy="19" r="12.5" fill={a.skin} />

      {front}

      {/* 目 */}
      {eyes(a.eyeStyle)}
      {/* 口 */}
      {mouth(a.mouthStyle)}

      {/* 出資に前向きな人物の印。SVG 内に置くことでアバターと一緒に拡大縮小する。 */}
      {invest ? (
        <g>
          <circle
            cx="33"
            cy="45"
            r="6"
            fill="#f2c94c"
            stroke="#8a6a00"
            strokeWidth="0.8"
          />
          <text
            x="33"
            y="47.8"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#3a2d00"
          >
            ¥
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function hair(style: number, color: string) {
  const none = <></>;

  switch (style) {
    case 0: // 短髪
      return {
        back: none,
        front: <path d="M8 19 a12 12 0 0 1 24 0 z" fill={color} />,
      };
    case 1: // 前髪あり
      return {
        back: none,
        front: <path d="M8 19 a12 12 0 0 1 24 0 v3.5 h-24 z" fill={color} />,
      };
    case 2: // ロング
      return {
        back: (
          <path
            d="M6.5 19 a13.5 13.5 0 0 1 27 0 v17 h-5 v-15 h-17 v15 h-5 z"
            fill={color}
          />
        ),
        front: <path d="M8 19 a12 12 0 0 1 24 0 v2 h-24 z" fill={color} />,
      };
    case 3: // ポニーテール
      return {
        back: <circle cx="33" cy="25" r="5" fill={color} />,
        front: <path d="M8 19 a12 12 0 0 1 24 0 v1.5 h-24 z" fill={color} />,
      };
    case 4: // 薄毛
      return {
        back: none,
        front: (
          <path
            d="M8.2 21 a12 12 0 0 1 4.3 -9.2 l1.2 2.2 a10 10 0 0 0 -3.6 7 z M31.8 21 a12 12 0 0 0 -4.3 -9.2 l-1.2 2.2 a10 10 0 0 1 3.6 7 z"
            fill={color}
          />
        ),
      };
    default: // ボリュームのある髪
      return {
        back: <circle cx="20" cy="16" r="14.5" fill={color} />,
        front: <path d="M8 18 a12 12 0 0 1 24 0 v1 h-24 z" fill={color} />,
      };
  }
}

function eyes(style: number) {
  if (style === 0) {
    return (
      <>
        <circle cx="15.5" cy="20" r="1.5" fill="#22232b" />
        <circle cx="24.5" cy="20" r="1.5" fill="#22232b" />
      </>
    );
  }
  if (style === 1) {
    return (
      <>
        <rect
          x="13.8"
          y="19.4"
          width="3.6"
          height="1.3"
          rx="0.65"
          fill="#22232b"
        />
        <rect
          x="22.6"
          y="19.4"
          width="3.6"
          height="1.3"
          rx="0.65"
          fill="#22232b"
        />
      </>
    );
  }
  return (
    <>
      <ellipse cx="15.5" cy="20" rx="1.9" ry="2.2" fill="#22232b" />
      <ellipse cx="24.5" cy="20" rx="1.9" ry="2.2" fill="#22232b" />
      <circle cx="16.1" cy="19.3" r="0.6" fill="#fff" />
      <circle cx="25.1" cy="19.3" r="0.6" fill="#fff" />
    </>
  );
}

function mouth(style: number) {
  if (style === 0) {
    return (
      <path
        d="M17 25.2 q3 2.6 6 0"
        stroke="#22232b"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (style === 1) {
    return (
      <rect
        x="17.4"
        y="25.4"
        width="5.2"
        height="1.1"
        rx="0.55"
        fill="#22232b"
      />
    );
  }
  return <circle cx="20" cy="25.8" r="1.3" fill="#22232b" />;
}
