// frontend/pages/forgot-password.js
//
// Collects an email address and requests a password reset link. Always
// shows the same "check your email" confirmation regardless of whether
// an account exists for that address — the backend does the same, so
// this page can't be used to check which emails are registered.

import { useState } from "react";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    if (!email) {

      setError("Please enter your email address.");

      return;

    }

    setLoading(true);

    try {

      await authAPI.forgotPassword(email);

      setSubmitted(true);

    } catch (err) {

      // The backend intentionally never reveals whether the email
      // exists, so any error here is a genuine failure (network,
      // server down) rather than "no such account".
      setError(err.message || "Something went wrong. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  return (

    <>

      <Head>

        <title>Forgot Password — TechMart AI Support</title>

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

              Reset Your Password

            </h1>

            <p

              className = "text-[var(--tm-text-muted)] text-sm mt-1"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

            >

              {submitted ? "Check your inbox for a reset link" : "Enter your email to receive a reset link"}

            </p>

          </div>

          <div className = "card p-8">

            {submitted ? (

              <div className = "text-center py-2">

                <div className = "flex items-center justify-center mb-4">

                  <div

                    className = "flex items-center justify-center rounded-full"

                    style = {{ width: 48, height: 48, background: "var(--techmart-blue-light)" }}

                  >

                    <svg width = "22" height = "22" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                      <path d = "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />

                      <path d = "m22 6-10 7L2 6" />

                    </svg>

                  </div>

                </div>

                <p className = "text-[var(--tm-text-strong)] font-medium mb-2">

                  If an account exists for {email}, a reset link is on its way.

                </p>

                <p className = "text-[var(--tm-text-muted)] text-sm">

                  The link expires in 30 minutes. Check your spam folder if you don't see it soon.

                </p>

              </div>

            ) : (

              <form onSubmit = {handleSubmit} className = "space-y-5">

                <div>

                  <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                    Email Address

                  </label>

                  <input

                    type = "email"

                    value = {email}

                    onChange = {(e) => setEmail(e.target.value)}

                    placeholder = "you@example.com"

                    className = "auth-input"

                    autoComplete = "email"

                    autoFocus

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

                  {loading ? "Sending..." : "Send Reset Link"}

                </button>

              </form>

            )}

            <div className = "mt-6 pt-6 border-t border-[var(--tm-border-light)] text-center">

              <p className = "text-[var(--tm-text-muted)] text-sm">

                <Link

                  href = "/login"

                  className = "text-[var(--techmart-blue)] hover:text-[var(--techmart-blue-dark)] font-medium transition-colors"

                >

                  ← Back to Sign In

                </Link>

              </p>

            </div>

          </div>

        </div>

      </div>

    </>

  );

}