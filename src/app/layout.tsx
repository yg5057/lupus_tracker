import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Lupus Tracker",
  description: "체온과 혈압을 기록하고 추세를 확인하세요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F9FAFB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
          <main className="flex flex-1 flex-col gap-3 px-5 pt-[30px]">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}