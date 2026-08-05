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

        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "true" />

        <link href = "https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap" rel = "stylesheet" />

      </Head>

      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

        }

      `}</style>

      <div className = "min-h-screen flex items-center justify-center bg-white px-4 py-8">

        <div className = "w-full max-w-md">

          <div className = "text-center mb-8">

            <div className = "inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4 shadow-sm bg-[var(--techmart-blue)] text-white font-semibold">

              T

            </div>

            <h1

              className = "text-3xl font-normal text-[var(--tm-text-strong)]"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif", letterSpacing: "0.02em" }}

            >

              Create Your Account

            </h1>

            <p

              className = "text-[var(--tm-text-muted)] text-sm mt-1"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

            >

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

              <div>

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

                    autoComplete = "new-password"

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

                    autoComplete = "new-password"

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