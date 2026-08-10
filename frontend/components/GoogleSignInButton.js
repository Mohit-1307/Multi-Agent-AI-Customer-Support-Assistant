// frontend/components/GoogleSignInButton.js
//
// Renders Google's official "Sign in with Google" button using the
// Google Identity Services script (loaded globally in _app.js). Calls
// onCredential(idToken) once the user completes the Google flow —
// the caller is responsible for sending that token to the backend.

import { useEffect, useRef } from "react";

export default function GoogleSignInButton({ onCredential, onError, text = "continue_with" }) {

  const buttonRef = useRef(null);

  useEffect(() => {

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {

      // Missing config is a setup issue, not a runtime error the user caused —
      // log it so it's easy to spot the .env value is missing.
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google Sign-In button will not render.");

      return;

    }

    let cancelled = false;

    // The GSI script loads asynchronously (see _app.js), so poll briefly
    // until window.google is available rather than assuming it's ready.
    const tryInit = () => {

      if (cancelled) return;

      if (!window.google || !window.google.accounts || !window.google.accounts.id) {

        setTimeout(tryInit, 100);

        return;

      }

      window.google.accounts.id.initialize({

        client_id: clientId,

        callback: (response) => {

          if (response && response.credential) {

            onCredential(response.credential);

          } else {

            onError?.(new Error("Google did not return a credential."));

          }

        },

      });

      if (buttonRef.current) {

        // Clear any previously rendered button before re-rendering,
        // avoids duplicate buttons if this effect re-runs
        buttonRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(buttonRef.current, {

          type: "standard",

          theme: "outline",

          size: "large",

          text,

          shape: "pill",

          width: 360,

        });

      }

    };

    tryInit();

    return () => {

      cancelled = true;

    };

  }, [onCredential, onError, text]);

  return <div ref = {buttonRef} style = {{ display: "flex", justifyContent: "center" }} />;

}
