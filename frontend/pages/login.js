// frontend/pages/login.js
//
// Login page. Redirects straight to /chat if the user is already
// logged in, otherwise shows an email/password form.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

export default function LoginPage() {

  const router = useRouter();

  // Form field values
  const [form, setForm] = useState({ email: "", password: "" });

  // Error message shown above the submit button
  const [error, setError] = useState("");

  // True while the login request is in flight, disables the submit button
  const [loading, setLoading] = useState(false);

  // To Show/Hide Password
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {

    // If a valid session already exists, skip the login form entirely
    if (authAPI.isLoggedIn()) router.push("/chat");

  }, []);

  // Generic change handler — updates whichever field the user is typing into,
  // matched by the input's "name" attribute
  const handleChange = (e) =>

    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    if (!form.email || !form.password) {

      setError("Please fill in all fields.");

      return;

    }

    setLoading(true);

    try {

      await authAPI.login(form.email, form.password);

      router.push("/chat");

    } catch (err) {

      setError(err.message || "Login failed. Check your credentials.");

    } finally {

      setLoading(false);

    }

  };

  return (

    <>

      <Head>

        <title>Login — TechMart AI Support</title>

        {/* Same substitution as chat.js: Claude's real interface font
            ("Anthropic Sans") is proprietary and not redistributable,
            so Inter stands in — same variable weight range, same
            clean UI-grotesque character. */}
        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "anonymous" />

        <link href = "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap" rel = "stylesheet" />

      </Head>

      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

        }

      `}</style>

      <div className = "min-h-screen flex items-center justify-center bg-[var(--techmart-gray-50)] px-4">

        <div className = "w-full max-w-md">

          {/* Logo */}
          <div className = "text-center mb-8">

            <div className = "avatar-mark inline-flex w-14 h-14 rounded-2xl text-2xl mb-4 shadow-sm">

              T

            </div>

            <h1 className = "text-2xl font-semibold text-[var(--tm-text-strong)] tracking-tight">

              TechMart AI Support

            </h1>

            <p className = "text-[var(--tm-text-muted)] text-sm mt-1">

              Sign in to your account

            </p>

          </div>

          {/* Card */}
          <div className = "card p-8">

            <form onSubmit = {handleSubmit} className = "space-y-5">

              <div>

                <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                  Email Address

                </label>

                <input

                  type = "email"

                  name = "email"

                  value = {form.email}

                  onChange = {handleChange}

                  placeholder = "you@example.com"

                  className = "auth-input"

                  autoComplete = "email"

                  required

                />

              </div>

              <div>

                <div className = "flex items-center justify-between mb-1.5">

                  <label className = "block text-sm font-medium text-[var(--tm-text-slate)]">

                    Password

                  </label>

                </div>

                <div style = {{ position: "relative" }}>

                  <input

                    type = {showPassword ? "text" : "password"}

                    name = "password"

                    value = {form.password}

                    onChange = {handleChange}

                    placeholder="••••••••"

                    className = "auth-input"

                    style = {{ paddingRight: "44px" }}

                    autoComplete = "current-password"

                    required

                  />

                  <button

                    type = "button"

                    onClick={() => setShowPassword((prev) => !prev)}

                    className = "icon-btn"

                    style={{

                      position: "absolute",

                      right: 8,

                      top: "50%",

                      transform: "translateY(-50%)",

                      padding: 6,

                    }}

                  >

                    {showPassword ? (

                      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                        <path d = "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>

                        <path d = "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>

                        <line x1 ="1" y1 = "1" x2 = "23" y2 = "23"/>

                      </svg>

                    ) : (

                      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                        <path d = "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>

                        <circle cx = "12" cy = "12" r = "3"/>

                      </svg>

                    )}

                  </button>

                </div>

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

                {loading ? (

                  <>

                    <svg

                      className = "animate-spin w-4 h-4"

                      viewBox = "0 0 24 24"

                      fill = "none"

                    >

                      <circle

                        className = "opacity-25"

                        cx = "12"

                        cy = "12"

                        r = "10"

                        stroke = "currentColor"

                        strokeWidth = "4"

                      />

                      <path

                        className = "opacity-75"

                        fill = "currentColor"

                        d = "M4 12a8 8 0 018-8v8H4z"

                      />

                    </svg>

                    Signing in...

                  </>

                ) : (

                  "Sign In"

                )}

              </button>

            </form>

            <div className = "mt-6 pt-6 border-t border-[var(--tm-border-light)] text-center">

              <p className = "text-[var(--tm-text-muted)] text-sm">

                Don't have an account?{" "}

                <Link

                  href = "/register"

                  className = "text-[var(--techmart-blue)] hover:text-[var(--techmart-blue-dark)] font-medium transition-colors"

                >
                  Create one

                </Link>

              </p>

            </div>

          </div>

          {/* Demo credentials hint */}
          <div className = "mt-4 text-center">

            <p className = "text-[var(--tm-text-faint)] text-xs">

              Demo: admin@gmail.com / admin123

            </p>

          </div>

        </div>

      </div>

    </>

  );

}