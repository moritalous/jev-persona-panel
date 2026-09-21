import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新規事業ウケるかな？パネル",
  description:
    "新規事業のアイデアを100人のパネリストが判定し、興味の度合いを立ち位置で可視化します。判定は TypeSafe AI の Jev を使用しています。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
