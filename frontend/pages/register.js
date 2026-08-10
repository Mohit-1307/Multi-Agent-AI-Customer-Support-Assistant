// frontend/pages/register.js
//
// Account creation page. Sign up with Google, or verify your email with
// a one-time code before choosing a password (handled by OTPLogin with
// intent="register") — this proves the person actually owns the email
// address before any account is created.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import Link from "next/link";

import { authAPI } from "../services/api";

import GoogleSignInButton from "../components/GoogleSignInButton";

import OTPLogin from "../components/OTPLogin";

import AddPhoneModal from "../components/AddPhoneModal";

export default function RegisterPage() {

  const router = useRouter();

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  // Shown once right after a Google sign-up that has no phone on file yet
  const [showAddPhone, setShowAddPhone] = useState(false);

  useEffect(() => {

    // Skip registration entirely if already logged in
    if (authAPI.isLoggedIn()) router.push("/chat");

  }, []);

  const handleGoogleCredential = async (idToken) => {

    setError("");

    setLoading(true);

    try {

      const data = await authAPI.googleLogin(idToken);

      if (!data.user?.phone) {

        setShowAddPhone(true);

        return;

      }

      router.push("/chat");

    } catch (err) {

      setError(err.message || "Google sign-in failed. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  const handleOTPSuccess = () => {

    router.push("/chat");

  };

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

            <GoogleSignInButton onCredential = {handleGoogleCredential} onError = {(err) => setError(err.message)} text = "signup_with" />

            <div className = "flex items-center gap-3 my-5">

              <div className = "flex-1 h-px bg-[var(--tm-border-light)]" />

              <span className = "text-xs text-[var(--tm-text-faint)]">OR SIGN UP WITH</span>

              <div className = "flex-1 h-px bg-[var(--tm-border-light)]" />

            </div>

            <p className = "text-sm text-[var(--tm-text-muted)] mb-4">

              We'll email you a verification code, then you can set a password.

            </p>

            <OTPLogin onSuccess = {handleOTPSuccess} collectName = {true} intent = "register" />


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

      {showAddPhone && (

        <AddPhoneModal onClose = {() => { setShowAddPhone(false); router.push("/chat"); }} />

      )}
    </>

  );

}