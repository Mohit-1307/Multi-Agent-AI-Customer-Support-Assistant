// frontend/pages/register.js
//
// Account creation page. Validates the form client-side (name, email,
// password length/match) before calling the register API, and shows
// a simple password-strength indicator as the user types.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

export default function RegisterPage() {

  const router = useRouter();

  const [form, setForm] = useState({

    name: "",

    email: "",

    phone: "",

    password: "",

    confirm: ""

  });

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

// To Show/Hide Password
  const [showPassword, setShowPassword] = useState(false);

// To Show/Hide Password
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {

    // Skip registration entirely if already logged in
    if (authAPI.isLoggedIn()) router.push("/chat");

  }, []);

  const handleChange = (e) =>

    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Client-side validation, returns an error string or null if the form is valid
  const validate = () => {

    if (!form.name.trim()) return "Please enter your name.";

    if (!form.email) return "Please enter your email.";

    if (form.password.length < 6)

      return "Password must be at least 6 characters.";

    if (form.password !== form.confirm) return "Passwords do not match.";

    return null;

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    const validationError = validate();

    if (validationError) {

      setError(validationError);

      return;

    }

    setError("");

    setLoading(true);

    try {

      await authAPI.register(

        form.name.trim(),

        form.email,

        form.password,

        form.phone || null

      );

      router.push("/chat");

    } catch (err) {

      setError(err.message || "Registration failed. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  // Simple password strength score based on length only:
  // 0 = empty, 1 = weak (<6 chars), 2 = good (<10 chars), 3 = strong (10+ chars)
  const strength =

    form.password.length === 0

      ? 0

      : form.password.length < 6

        ? 1

        : form.password.length < 10

          ? 2

          : 3;

  const strengthLabel = ["", "Weak", "Good", "Strong"];

  const strengthColor = ["", "bg-[var(--tm-danger)]", "bg-[var(--tm-warning)]", "bg-[var(--tm-success)]"];

  return (

    <>
      <Head>

        <title>Create Account — TechMart AI Support</title>

        {/* Same substitution as chat.js/login.js: Claude's real interface
            font ("Anthropic Sans") is proprietary and not redistributable,
            so Inter stands in — same variable weight range, same clean
            UI-grotesque character. */}
        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "anonymous" />

        <link href = "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap" rel = "stylesheet" />

      </Head>

      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

        }

      `}</style>

      <div className = "min-h-screen flex items-center justify-center bg-[var(--techmart-gray-50)] px-4 py-8">

        <div className = "w-full max-w-md">

          <div className = "text-center mb-8">

            <div className = "avatar-mark inline-flex w-14 h-14 rounded-2xl text-2xl mb-4 shadow-sm">

              T

            </div>

            <h1 className = "text-2xl font-semibold text-[var(--tm-text-strong)] tracking-tight">

              Create Your Account

            </h1>

            <p className = "text-[var(--tm-text-muted)] text-sm mt-1">

              Get started with TechMart AI Support

            </p>

          </div>

          <div className = "card p-8">

            <form onSubmit = {handleSubmit} className = "space-y-4">

              <div>

                <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                  Full Name

                </label>

                <input

                  type = "text"

                  name = "name"

                  value = {form.name}

                  onChange = {handleChange}

                  placeholder = "Jane Doe"

                  className = "auth-input"

                  required

                />

              </div>

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

                <div>

                  <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                    Phone Number

                    <span className = "text-[var(--tm-text-faint)] font-normal ml-1">

                      (optional — for WhatsApp alerts)

                    </span>

                  </label>

                  <input

                    type = "tel"

                    name = "phone"

                    value = {form.phone}

                    onChange = {handleChange}

                    placeholder = "+91 98765 43210"

                    className = "auth-input"

                  />

                  <p className = "text-[var(--tm-text-faint)] text-xs mt-1">

                    Include country code e.g. +91 for India, +1 for US

                  </p>

                </div>

                <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                  Password

                </label>

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

                {form.password && (

                  <div className = "mt-2 flex items-center gap-2">

                    <div className = "flex-1 h-1 bg-[var(--techmart-gray-200)] rounded-full overflow-hidden">

                      <div

                        className = {`h-full rounded-full transition-all ${strengthColor[strength]}`}

                        style = {{ width: `${(strength / 3) * 100}%` }}

                      />

                    </div>

                    <span className = "text-xs text-[var(--tm-text-muted)]">

                      {strengthLabel[strength]}

                    </span>

                  </div>

                )}

              </div>

              <div>

                <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                  Confirm Password

                </label>

                <div style = {{ position: "relative" }}>

                  <input

                    type = {showConfirm ? "text" : "password"}

                    name = "confirm"

                    value = {form.confirm}

                    onChange = {handleChange}

                    placeholder = "Repeat your password"

                    className = "auth-input"

                    style = {{ paddingRight: "44px" }}

                    required

                  />

                  <button

                    type = "button"

                    onClick = {() => setShowConfirm((prev) => !prev)}

                    className = "icon-btn"

                    style = {{

                      position: "absolute",

                      right: 8,

                      top: "50%",

                      transform: "translateY(-50%)",

                      padding: 6,

                    }}

                  >

                    {showConfirm ? (

                      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                        <path d = "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>

                        <path d = "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>

                        <line x1 = "1" y1 = "1" x2 = "23" y2 = "23"/>

                      </svg>

                    ) : (

                      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                        <path d = "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>

                        <circle cx = "12" cy = "12" r = "3"/>

                      </svg>

                    )}

                  </button>

                </div>

                {form.confirm && form.password !== form.confirm && (

                  <p className = "text-[var(--tm-danger)] text-xs mt-1.5">

                    Passwords don't match

                  </p>

                )}

              </div>

              {error && (

                <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm fade-in">

                  ⚠️ {error}

                </div>

              )}

              <button

                type = "submit"

                disabled = {loading}

                className = "btn-primary w-full flex items-center justify-center gap-2 mt-2"

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

                    Creating account...

                  </>

                ) : (

                  "Create Account"

                )}

              </button>

            </form>

            <div className = "mt-6 pt-6 border-t border-[var(--tm-border-light)] text-center">

              <p className = "text-[var(--tm-text-muted)] text-sm">

                Already have an account?{" "}

                <Link

                  href = "/login"

                  className = "text-[var(--techmart-blue)] hover:text-[var(--techmart-blue-dark)] font-medium"

                >

                  Sign in
                  
                </Link>
              </p>

            </div>

          </div>

        </div>

      </div>
    </>

  );

}