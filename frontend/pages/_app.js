// frontend/pages/_app.js
//
// Next.js custom App component. Every page in the app gets rendered
// through this wrapper, which is why the global stylesheet is imported here.

import "../styles/globals.css";

import Script from "next/script";

import { LanguageProvider } from "../components/LanguageProvider";

export default function App({ Component, pageProps }) {

  // Component is whichever page is currently being rendered (chat, login, etc.),
  // and pageProps are the props Next.js passes to that page
  return (

    <LanguageProvider>

      {/* Google Identity Services — loaded once globally so any page
          (login, register) can render a "Sign in with Google" button
          without needing to inject the script itself. */}
      <Script src = "https://accounts.google.com/gsi/client" strategy = "afterInteractive" />

      <Component {...pageProps} />

    </LanguageProvider>

  );

}