// frontend/components/AddPhoneModal.js
//
// Shown once, right after a Google sign-in that created a new account
// with no phone number on file. Entirely optional — "Skip for now"
// closes it with no changes, same as just not filling in the field.

import { useState } from "react";

import { authAPI } from "../services/api";

import PhoneInput from "./PhoneInput";

export default function AddPhoneModal({ onClose }) {

  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const handleSave = async () => {

    if (!phone) {

      onClose();

      return;

    }

    setError("");

    setSaving(true);

    try {

      await authAPI.updatePhone(phone);

      onClose();

    } catch (err) {

      setError(err.message || "Failed to save phone number. You can add it later from Settings.");

    } finally {

      setSaving(false);

    }

  };

  return (

    <div className = "fixed inset-0 bg-[var(--techmart-gray-900)]/40 flex items-center justify-center z-[100] fade-in">

      <div className = "card p-6 w-full max-w-sm mx-4">

        <div className = "flex items-center justify-center mb-3">

          <div

            className = "flex items-center justify-center rounded-full"

            style = {{ width: 48, height: 48, background: "var(--techmart-blue-light)" }}

          >

            <svg width = "22" height = "22" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

              <path d = "M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />

              <line x1 = "12" y1 = "18" x2 = "12.01" y2 = "18" />

            </svg>

          </div>

        </div>

        <h3 className = "text-lg font-semibold text-center mb-1.5 text-[var(--tm-text-strong)]">

          Add your phone number?

        </h3>

        <p className = "text-[var(--tm-text-muted)] text-sm text-center mb-5">

          Get order updates and support replies over WhatsApp. Optional — you can always add this later from Settings.

        </p>

        <PhoneInput value = {phone} onChange = {setPhone} />

        {error && (

          <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm mt-4">

            ⚠️ {error}

          </div>

        )}

        <div className = "flex gap-2 mt-5">

          <button

            type = "button"

            onClick = {onClose}

            disabled = {saving}

            className = "flex-1 px-4 py-2 rounded-xl text-sm font-medium text-[var(--tm-text-muted)] hover:text-[var(--tm-text-strong)] hover:bg-[var(--techmart-gray-100)] transition-colors"

          >

            Skip for now

          </button>

          <button

            type = "button"

            onClick = {handleSave}

            disabled = {saving}

            className = "btn-primary flex-1 px-4 py-2 text-sm"

          >

            {saving ? "Saving..." : "Save"}

          </button>

        </div>

      </div>

    </div>

  );

}