// frontend/components/GoogleSignInButton.js
//
// Renders Google's official "Sign in with Google" button using the
// Google Identity Services script (loaded globally in _app.js). Calls
// onCredential(idToken) once the user completes the Google flow —
// the caller is responsible for sending that token to the backend.

import { useEffect, useRef } from "react";

export default function GoogleSignInButton({ onCredential, onError, text = "continue_with" }) {

  const buttonRef = useRef(null);

  // Keep the latest callbacks in refs so the init effect below doesn't
  // need onCredential/onError in its dependency array — those are often
  // passed as new inline functions on every parent render, which would
  // otherwise cause google.accounts.id.initialize() to be called repeatedly.
  const onCredentialRef = useRef(onCredential);

  const onErrorRef = useRef(onError);

  useEffect(() => {

    onCredentialRef.current = onCredential;

    onErrorRef.current = onError;

  }, [onCredential, onError]);

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

            onCredentialRef.current?.(response.credential);

          } else {

            onErrorRef.current?.(new Error("Google did not return a credential."));

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

  }, [text]);

  return <div ref = {buttonRef} style = {{ display: "flex", justifyContent: "center" }} />;

}