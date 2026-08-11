import { Html, Head, Main, NextScript } from "next/document";

// Fonts are loaded here once, globally, instead of being repeated with
// next/head on every page — avoids Next.js's "Do not add stylesheets
// using next/head" warning and avoids re-fetching on every navigation.
export default function Document() {

  return (

    <Html lang = "en">

      <Head>

        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "anonymous" />

        <link href = "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&family=Lora:wght@400;500&display=swap" rel = "stylesheet" />

      </Head>

      <body>

        <Main />

        <NextScript />

      </body>

    </Html>

  );

}