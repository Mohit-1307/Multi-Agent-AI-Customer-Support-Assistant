// frontend/pages/reset-password.js
//
// Landing page for the link emailed by /forgot-password. Reads the
// reset token from the URL (?token=...), lets the person choose a new
// password, and calls /auth/reset-password to finish.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

export default function ResetPasswordPage() {

  const router = useRouter();

  const [token, setToken] = useState(null);

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [done, setDone] = useState(false);

  useEffect(() => {

    if (!router.isReady) return;

    const { token: urlToken } = router.query;

    setToken(typeof urlToken === "string" ? urlToken : "");

  }, [router.isReady, router.query]);

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    if (password.length < 6) {

      setError("Password must be at least 6 characters.");

      return;

    }

    if (password !== confirmPassword) {

      setError("Passwords do not match.");

      return;

    }

    setLoading(true);

    try {

      await authAPI.resetPassword(token, password);

      setDone(true);

    } catch (err) {

      setError(err.message || "This reset link is invalid or has expired. Please request a new one.");

    } finally {

      setLoading(false);

    }

  };

  // Still resolving router.query on first render
  if (token === null) {

    return null;

  }

  return (

    <>

      <Head>

        <title>Reset Password — TechMart AI Support</title>

        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "true" />

        <link href = "https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap" rel = "stylesheet" />

      </Head>

      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

        }

      `}</style>

      <div className = "min-h-screen flex items-center justify-center bg-white px-4">

        <div className = "w-full max-w-md">

          <div className = "text-center mb-8">

            <div className = "inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4 shadow-sm bg-[var(--techmart-blue)] text-white font-semibold">

              T

            </div>

            <h1

              className = "text-3xl font-normal text-[var(--tm-text-strong)]"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif", letterSpacing: "0.02em" }}

            >

              {done ? "Password Reset" : "Choose a New Password"}

            </h1>

          </div>

          <div className = "card p-8">

            {!token ? (

              <div className = "text-center py-2">

                <p className = "text-[var(--tm-danger)] font-medium mb-2">Missing reset link</p>

                <p className = "text-[var(--tm-text-muted)] text-sm mb-5">

                  This page needs a valid reset token in the link. Please use the link from your email, or request a new one.

                </p>

                <Link href = "/forgot-password" className = "btn-primary inline-block px-5 py-2 text-sm">

                  Request New Link

                </Link>

              </div>

            ) : done ? (

              <div className = "text-center py-2">

                <div className = "flex items-center justify-center mb-4">

                  <div

                    className = "flex items-center justify-center rounded-full"

                    style = {{ width: 48, height: 48, background: "var(--tm-success)" }}

                  >

                    <svg width = "22" height = "22" viewBox = "0 0 24 24" fill = "none" stroke = "#ffffff" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <polyline points = "20 6 9 17 4 12" />

                    </svg>

                  </div>

                </div>

                <p className = "text-[var(--tm-text-strong)] font-medium mb-5">

                  Your password has been reset successfully.

                </p>

                <Link href = "/login" className = "btn-primary inline-block px-5 py-2 text-sm">

                  Sign In

                </Link>

              </div>

            ) : (

              <form onSubmit = {handleSubmit} className = "space-y-5">

                <div>

                  <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                    New Password

                  </label>

                  <div style = {{ position: "relative" }}>

                    <input

                      type = {showPassword ? "text" : "password"}

                      value = {password}

                      onChange = {(e) => setPassword(e.target.value)}

                      placeholder = "••••••••"

                      className = "auth-input"

                      style = {{ paddingRight: "44px" }}

                      autoComplete = "new-password"

                      autoFocus

                      required

                    />

                    <button

                      type = "button"

                      onClick = {() => setShowPassword((prev) => !prev)}

                      className = "icon-btn"

                      style = {{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 6 }}

                    >

                      {showPassword ? (

                        <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                          <path d = "M2.5 12C4.8 7.2 8.2 4.8 12 4.8s7.2 2.4 9.5 7.2c-2.3 4.8-5.7 7.2-9.5 7.2S4.8 16.8 2.5 12Z"/>

                          <circle cx = "12" cy = "12" r = "3.2"/>

                          <line x1 = "3.5" y1 = "20.5" x2 = "20.5" y2 = "3.5"/>

                        </svg>

                      ) : (

                        <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                          <path d = "M2.5 12C4.8 7.2 8.2 4.8 12 4.8s7.2 2.4 9.5 7.2c-2.3 4.8-5.7 7.2-9.5 7.2S4.8 16.8 2.5 12Z"/>

                          <circle cx = "12" cy = "12" r = "3.2"/>

                        </svg>

                      )}

                    </button>

                  </div>

                </div>

                <div>

                  <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                    Confirm New Password

                  </label>

                  <input

                    type = {showPassword ? "text" : "password"}

                    value = {confirmPassword}

                    onChange = {(e) => setConfirmPassword(e.target.value)}

                    placeholder = "Repeat your new password"

                    className = "auth-input"

                    autoComplete = "new-password"

                    required

                  />

                </div>

                {error && (

                  <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm fade-in">

                    ⚠️ {error}

                  </div>

                )}

                <button

                  type = "submit"

                  disabled = {loading}

                  className = "btn-primary w-full flex items-center justify-center gap-2"

                >

                  {loading ? "Resetting..." : "Reset Password"}

                </button>

              </form>

            )}

          </div>

        </div>

      </div>

    </>

  );

}