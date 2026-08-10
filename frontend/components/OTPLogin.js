// frontend/components/OTPLogin.js
//
// Email one-time-passcode flow, with two modes controlled by `intent`:
//
//   intent="login" (default) — used by the "Email Code" tab on the login
//   page. Enter email, get a code, verify it, and that's it: verifying
//   logs the user in directly (auto-registering a passwordless account
//   the first time). No password involved.
//
//   intent="register" — used by the password-registration flow. Enter
//   name + email, get a code, verify it — but verifying only *proves you
//   own the email*, it does not create an account yet. A password step
//   then appears, and submitting it calls /auth/register with the proof
//   token from the verify step to actually create the account.
//
// This second mode exists so nobody can register a password account
// using an email address they don't control.

import { useEffect, useState } from "react";

import { authAPI } from "../services/api";

import PhoneInput from "./PhoneInput";

export default function OTPLogin({ onSuccess, collectName = false, intent = "login" }) {

  // "request" = entering email (+ name), "verify" = entering the emailed
  // code, "password" = choosing a password (register intent only, after
  // the code has already been verified)
  const [stage, setStage] = useState("request");

  const [email, setEmail] = useState("");

  const [name, setName] = useState("");

  const [phone, setPhone] = useState("");

  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpToken, setOtpToken] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [expiresIn, setExpiresIn] = useState(10);

  // Seconds remaining before the user is allowed to request another code
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {

    if (cooldown <= 0) return;

    const timer = setInterval(() => setCooldown((prev) => Math.max(prev - 1, 0)), 1000);

    return () => clearInterval(timer);

  }, [cooldown]);

  const handleSendCode = async (e) => {

    e.preventDefault();

    setError("");

    if (!email) {

      setError("Please enter your email address.");

      return;

    }

    if (intent === "register" && collectName && !name.trim()) {

      setError("Please enter your name.");

      return;

    }

    setLoading(true);

    try {

      const res = await authAPI.sendOtp(email, collectName ? name : null);

      setExpiresIn(res.expires_in_minutes);

      setStage("verify");

      setCooldown(60);

    } catch (err) {

      setError(err.message || "Failed to send verification code.");

    } finally {

      setLoading(false);

    }

  };

  const handleVerifyCode = async (e) => {

    e.preventDefault();

    setError("");

    if (!code || code.length < 4) {

      setError("Please enter the code sent to your email.");

      return;

    }

    setLoading(true);

    try {

      const data = await authAPI.verifyOtp(email, code, { name: collectName ? name : null, intent });

      if (intent === "register") {

        // Email ownership confirmed — move on to choosing a password.
        // No account exists yet, so there's nothing to log into.
        setOtpToken(data.otp_token);

        setStage("password");

      } else {

        onSuccess(data);

      }

    } catch (err) {

      setError(err.message || "Invalid or expired code. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  const handleCompleteRegistration = async (e) => {

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

      const data = await authAPI.completeRegistration(name, email, password, otpToken, phone || null);

      onSuccess(data);

    } catch (err) {

      setError(err.message || "Failed to create account. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  const handleResend = async () => {

    if (cooldown > 0) return;

    setError("");

    setLoading(true);

    try {

      await authAPI.sendOtp(email, collectName ? name : null);

      setCooldown(60);

    } catch (err) {

      setError(err.message || "Failed to resend code.");

    } finally {

      setLoading(false);

    }

  };

  if (stage === "request") {

    return (

      <form onSubmit = {handleSendCode} className = "space-y-4">

        {collectName && (

          <div>

            <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

              Full Name

            </label>

            <input

              type = "text"

              value = {name}

              onChange = {(e) => setName(e.target.value)}

              placeholder = "Jane Doe"

              className = "auth-input"

            />

          </div>

        )}

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

            required

          />

        </div>

        {error && (

          <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm fade-in">

            ⚠️ {error}

          </div>

        )}

        <button type = "submit" disabled = {loading} className = "btn-primary w-full flex items-center justify-center gap-2">

          {loading ? "Sending code..." : "Send verification code"}

        </button>

      </form>

    );

  }

  if (stage === "verify") {

    return (

      <form onSubmit = {handleVerifyCode} className = "space-y-4">

        <p className = "text-sm text-[var(--tm-text-muted)]">

          Enter the {expiresIn}-minute code sent to <span className = "font-medium text-[var(--tm-text-strong)]">{email}</span>.

        </p>

        <div>

          <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

            Verification Code

          </label>

          <input

            type = "text"

            inputMode = "numeric"

            value = {code}

            onChange = {(e) => setCode(e.target.value.replace(/\D/g, ""))}

            placeholder = "123456"

            className = "auth-input"

            style = {{ letterSpacing: "0.3em", textAlign: "center", fontSize: "20px" }}

            maxLength = {8}

            autoFocus

            required

          />

        </div>

        {error && (

          <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm fade-in">

            ⚠️ {error}

          </div>

        )}

        <button type = "submit" disabled = {loading} className = "btn-primary w-full flex items-center justify-center gap-2">

          {loading ? "Verifying..." : intent === "register" ? "Verify Email" : "Verify & Continue"}

        </button>

        <div className = "flex items-center justify-between text-sm">

          <button

            type = "button"

            onClick = {() => { setStage("request"); setCode(""); setError(""); }}

            className = "text-[var(--tm-text-muted)] hover:text-[var(--tm-text-strong)] transition-colors"

          >

            ← Change email

          </button>

          <button

            type = "button"

            onClick = {handleResend}

            disabled = {cooldown > 0 || loading}

            className = "text-[var(--techmart-blue)] hover:text-[var(--techmart-blue-dark)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

          >

            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}

          </button>

        </div>

      </form>

    );

  }

  // stage === "password" — only reached when intent="register", after the
  // code has been verified. Email ownership is proven; now collect a password.
  return (

    <form onSubmit = {handleCompleteRegistration} className = "space-y-4">

      <div className = "bg-[var(--tm-success)]/10 border border-[var(--tm-success)]/30 rounded-xl px-4 py-3 text-[var(--tm-success)] text-sm">

        ✓ {email} verified. Choose a password to finish creating your account.

      </div>

      <div>

        <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

          Phone Number

          <span className = "text-[var(--tm-text-faint)] font-normal ml-1">(optional — for WhatsApp alerts)</span>

        </label>

        <PhoneInput value = {phone} onChange = {setPhone} />

      </div>

      <div>

        <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

          Password

        </label>

        <input

          type = "password"

          value = {password}

          onChange = {(e) => setPassword(e.target.value)}

          placeholder = "••••••••"

          className = "auth-input"

          autoComplete = "new-password"

          autoFocus

          required

        />

      </div>

      <div>

        <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

          Confirm Password

        </label>

        <input

          type = "password"

          value = {confirmPassword}

          onChange = {(e) => setConfirmPassword(e.target.value)}

          placeholder = "Repeat your password"

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

      <button type = "submit" disabled = {loading} className = "btn-primary w-full flex items-center justify-center gap-2">

        {loading ? "Creating account..." : "Create Account"}

      </button>

    </form>

  );

}