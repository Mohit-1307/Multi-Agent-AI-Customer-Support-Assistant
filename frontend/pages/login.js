// frontend/pages/login.js
//
// Login page. Redirects straight to /chat if the user is already
// logged in, otherwise shows an email/password form.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

import GoogleSignInButton from "../components/GoogleSignInButton";

import OTPLogin from "../components/OTPLogin";

import AddPhoneModal from "../components/AddPhoneModal";

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

  // Which login method is currently shown: "password" or "otp"
  const [loginMethod, setLoginMethod] = useState("password");

  // Shown once right after a Google sign-in that has no phone on file yet
  const [showAddPhone, setShowAddPhone] = useState(false);

  useEffect(() => {

    // If a valid session already exists, skip the login form entirely
    if (authAPI.isLoggedIn()) router.push("/chat");

  }, []);

  const handleGoogleCredential = async (idToken) => {

    setError("");

    setLoading(true);

    try {

      const data = await authAPI.googleLogin(idToken);

      if (!data.user?.phone) {

        setShowAddPhone(true);

      } else {

        router.push("/chat");

      }

    } catch (err) {

      setError(err.message || "Google sign-in failed. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  const handleOTPSuccess = () => {

    router.push("/chat");

  };

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

      </Head>

      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

        }

      `}</style>

      <div className = "min-h-screen flex items-center justify-center bg-white px-4">

        <div className = "w-full max-w-md">

          {/* Logo */}
          <div className = "text-center mb-8">

            <div className = "inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4 shadow-sm bg-[var(--techmart-blue)] text-white font-semibold">

              T

            </div>

            <h1

              className = "text-3xl font-normal text-[var(--tm-text-strong)]"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif", letterSpacing: "0.02em" }}

            >

              TechMart AI Support

            </h1>

            <p

              className = "text-[var(--tm-text-muted)] text-sm mt-1"

              style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

            >

              Sign in to your account

            </p>

          </div>

          {/* Card */}
          <div className = "card p-8">

            <GoogleSignInButton onCredential = {handleGoogleCredential} onError = {(err) => setError(err.message)} />

            <div className = "flex items-center gap-3 my-5">

              <div className = "flex-1 h-px bg-[var(--tm-border-light)]" />

              <span className = "text-xs text-[var(--tm-text-faint)]">OR SIGN IN WITH</span>

              <div className = "flex-1 h-px bg-[var(--tm-border-light)]" />

            </div>

            <div className = "flex gap-2 mb-5 p-1 rounded-xl bg-[var(--techmart-gray-100)]">

              <button

                type = "button"

                onClick = {() => { setLoginMethod("password"); setError(""); }}

                className = {`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${

                  loginMethod === "password" ? "bg-white text-[var(--tm-text-strong)] shadow-sm" : "text-[var(--tm-text-muted)]"

                }`}

              >

                Password

              </button>

              <button

                type = "button"

                onClick = {() => { setLoginMethod("otp"); setError(""); }}

                className = {`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${

                  loginMethod === "otp" ? "bg-white text-[var(--tm-text-strong)] shadow-sm" : "text-[var(--tm-text-muted)]"

                }`}

              >

                Email Code

              </button>

            </div>

            {loginMethod === "otp" ? (

              <OTPLogin onSuccess = {handleOTPSuccess} collectName = {false} />

            ) : (

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

                  <Link

                    href = "/forgot-password"

                    className = "text-xs text-[var(--techmart-blue)] hover:text-[var(--techmart-blue-dark)] font-medium transition-colors"

                  >

                    Forgot password?

                  </Link>

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

            )}

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

        </div>

      </div>

      {showAddPhone && (

        <AddPhoneModal onClose = {() => { setShowAddPhone(false); router.push("/chat"); }} />

      )}

    </>

  );

}