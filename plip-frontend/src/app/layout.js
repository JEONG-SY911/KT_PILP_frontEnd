import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PLIP Population - 생활이동분석솔루션",
  description: "주소 기반 인구통계 방식을 벗어나 실제 생활인구 데이터를 분석하는 솔루션",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <script
          type="text/javascript"
          src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_MAP_API_KEY&libraries=services,clusterer"
        />
      </head>
      <body 
        className={`${geist.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
