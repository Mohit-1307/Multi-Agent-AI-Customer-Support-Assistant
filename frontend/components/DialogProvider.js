// frontend/components/DialogProvider.js
//
// A drop-in replacement for window.confirm() / window.alert() that
// matches the app's own theme instead of the browser's native gray box.
//
// Usage, anywhere inside <DialogProvider>:
//
//   const { confirmDialog, alertDialog } = useDialog();
//
//   const ok = await confirmDialog({
//     title: "Delete conversation?",
//     message: "This cannot be undone.",
//     confirmLabel: "Delete",
//     danger: true,
//   });
//   if (ok) { ...proceed... }
//
//   await alertDialog({
//     title: "Escalated Successfully!",
//     message: "A human agent will contact you within 2 business hours.",
//   });
//
// Both return a Promise so calling code can `await` them exactly like
// the synchronous window.confirm/alert they replace — no callback-based
// rewiring needed at call sites.

import { createContext, useCallback, useContext, useState } from "react";

const DialogContext = createContext(null);

export function useDialog() {

  const ctx = useContext(DialogContext);

  if (!ctx) {

    throw new Error("useDialog must be used inside a <DialogProvider>");

  }

  return ctx;

}

export function DialogProvider({ children }) {

  // null when no dialog is showing. When set, holds everything needed
  // to render it plus the resolve() function for the pending Promise.
  const [dialogState, setDialogState] = useState(null);

  // Only used by promptDialog — the text currently typed into the input
  const [promptValue, setPromptValue] = useState("");

  const confirmDialog = useCallback(({ title, message, confirmLabel = "OK", cancelLabel = "Cancel", danger = false } = {}) => {

    return new Promise((resolve) => {

      setDialogState({

        type: "confirm",

        title,

        message,

        confirmLabel,

        cancelLabel,

        danger,

        resolve,

      });

    });

  }, []);

  const alertDialog = useCallback(({ title, message, confirmLabel = "OK", icon = null } = {}) => {

    return new Promise((resolve) => {

      setDialogState({

        type: "alert",

        title,

        message,

        confirmLabel,

        icon,

        resolve,

      });

    });

  }, []);

  // Replaces window.prompt() — resolves with the typed string, or null
  // if cancelled. requiredValue, if set, disables the confirm button
  // until the typed text matches exactly (e.g. "type DELETE to confirm").
  const promptDialog = useCallback(({ title, message, confirmLabel = "OK", cancelLabel = "Cancel", placeholder = "", requiredValue = null, danger = false } = {}) => {

    setPromptValue("");

    return new Promise((resolve) => {

      setDialogState({

        type: "prompt",

        title,

        message,

        confirmLabel,

        cancelLabel,

        placeholder,

        requiredValue,

        danger,

        resolve,

      });

    });

  }, []);

  const handleConfirm = () => {

    if (dialogState.type === "prompt") {

      dialogState.resolve(promptValue);

    } else {

      dialogState.resolve(true);

    }

    setDialogState(null);

  };

  const handleCancel = () => {

    dialogState.resolve(dialogState.type === "prompt" ? null : false);

    setDialogState(null);

  };

  const promptBlocked =

    dialogState?.type === "prompt" &&

    dialogState.requiredValue !== null &&

    promptValue !== dialogState.requiredValue;

  return (

    <DialogContext.Provider value = {{ confirmDialog, alertDialog, promptDialog }}>

      {children}

      {dialogState && (

        <div

          className = "fixed inset-0 bg-[var(--techmart-gray-900)]/45 backdrop-blur-[2px] flex items-center justify-center z-[100] fade-in"

          onClick = {dialogState.type === "alert" ? handleConfirm : handleCancel}

        >

          <div

            className = "dialog-box w-full max-w-sm mx-4"

            style = {{ padding: "28px 24px 24px" }}

            onClick = {(e) => e.stopPropagation()}

          >

            {(dialogState.icon || dialogState.danger) && (

              <div className = "flex items-center justify-center mb-4">

                <div

                  className = "flex items-center justify-center rounded-full"

                  style = {{

                    width: 48,

                    height: 48,

                    background: dialogState.danger ? "rgba(209, 55, 42, 0.12)" : "var(--techmart-blue-light)",

                  }}

                >

                  {dialogState.icon ? (

                    <span style = {{ fontSize: 22 }}>{dialogState.icon}</span>

                  ) : (

                    <svg width = "22" height = "22" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-danger)" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                      <path d = "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />

                      <line x1 = "12" y1 = "9" x2 = "12" y2 = "13" />

                      <line x1 = "12" y1 = "17" x2 = "12.01" y2 = "17" />

                    </svg>

                  )}

                </div>

              </div>

            )}

            {dialogState.title && (

              <h3 className = "text-lg font-semibold mb-1.5 text-center text-[var(--tm-text-strong)]">

                {dialogState.title}

              </h3>

            )}

            {dialogState.message && (

              dialogState.message.includes("\n•") || dialogState.message.startsWith("•") ? (

                // Bulleted messages: render as a real, left-aligned list
                // instead of a center-aligned blob of text with inline
                // bullet characters — that's what made the earlier
                // delete/reset dialogs look messy.
                <div className = "mb-5">

                  {dialogState.message.split("\n").map((line, i) => {

                    const isBullet = line.trim().startsWith("•");

                    return isBullet ? (

                      <div key = {i} className = "flex items-start gap-2 text-sm text-[var(--tm-text-muted)] leading-relaxed pl-1" style = {{ marginBottom: 4 }}>

                        <span style = {{ color: "var(--tm-text-faint)", marginTop: 1 }}>•</span>

                        <span>{line.trim().slice(1).trim()}</span>

                      </div>

                    ) : line.trim() === "" ? (

                      <div key = {i} style = {{ height: 10 }} />

                    ) : (

                      <p key = {i} className = "text-sm text-[var(--tm-text-muted)] leading-relaxed" style = {{ marginBottom: 4 }}>

                        {line}

                      </p>

                    );

                  })}

                </div>

              ) : (

                <p className = "text-[var(--tm-text-muted)] text-sm mb-5 text-center whitespace-pre-line leading-relaxed">

                  {dialogState.message}

                </p>

              )

            )}

            {dialogState.type === "prompt" && (

              <input

                type = "text"

                autoFocus

                value = {promptValue}

                onChange = {(e) => setPromptValue(e.target.value)}

                placeholder = {dialogState.placeholder}

                className = "auth-input mb-5"

                onKeyDown = {(e) => {

                  if (e.key === "Enter" && !promptBlocked) handleConfirm();

                }}

              />

            )}

            <div className = "flex justify-center gap-2 mt-1">

              {dialogState.type !== "alert" && (

                <button

                  type = "button"

                  onClick = {handleCancel}

                  className = "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--tm-text-muted)] border border-[var(--tm-border-light)] hover:bg-[var(--techmart-gray-100)] hover:text-[var(--tm-text-strong)] transition-colors"

                >

                  {dialogState.cancelLabel}

                </button>

              )}

              <button

                type = "button"

                onClick = {handleConfirm}

                autoFocus = {dialogState.type !== "prompt"}

                disabled = {promptBlocked}

                className = {

                  dialogState.danger

                    ? "flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"

                    : "btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"

                }

                style = {

                  dialogState.danger

                    ? {

                        background: "var(--tm-danger)",

                        boxShadow: "0 2px 8px rgba(209, 55, 42, 0.3)",

                      }

                    : undefined

                }

                onMouseEnter = {(e) => {

                  if (dialogState.danger) e.currentTarget.style.background = "#b82e22";

                }}

                onMouseLeave = {(e) => {

                  if (dialogState.danger) e.currentTarget.style.background = "var(--tm-danger)";

                }}

              >

                {dialogState.confirmLabel}

              </button>

            </div>

          </div>

        </div>

      )}

    </DialogContext.Provider>

  );

}