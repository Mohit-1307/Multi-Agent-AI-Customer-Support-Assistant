// frontend/pages/chat.js
//
// This is the main chat page — the screen where the user actually
// talks to the AI support assistant. It handles showing messages,
// sending new ones, switching between past chat sessions, and
// attaching files like images or PDFs.
import { useState, useEffect, useRef, useCallback } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import { chatAPI, sessionsAPI, feedbackAPI, authAPI, analyticsAPI, translateAPI, bugReportAPI } from "../services/api";

import { DialogProvider, useDialog } from "../components/DialogProvider";

import { useLanguage } from "../components/LanguageProvider";

import { LANGUAGES, LANGUAGE_NAMES } from "../data/translations";

// Small helper function that wraps the part of a text string that
// matches the user's search query in a <mark> tag, so it shows up
// highlighted in yellow (or whatever color we picked) on the page.
function highlightMatch(text, query) {

  if (!query) return text;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());

  if (idx === -1) return text;

  return (

    <>

      {text.slice(0, idx)}

      <mark

        style = {{

          background: "var(--tm-accent-stroke)",

          color: "white",

          borderRadius: "2px",

          padding: "0 2px"

        }}

      >

        {text.slice(idx, idx + query.length)}

      </mark>

      {text.slice(idx + query.length)}

    </>

  );
  
}

// Some fixed values we reuse throughout this file, like the labels
// and icons for each support agent type (billing, tech, etc.).
const AGENT_META = {

  billing: {

    label: "Billing",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <rect x = "2" y = "5" width = "20" height = "14" rx = "2" fill = "var(--tm-accent-fill)" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" />

        <rect x = "2" y = "9" width = "20" height = "2" fill = "var(--tm-accent-stroke)" />

        <rect x = "5" y = "14" width = "5" height = "2" rx = "1" fill = "var(--tm-accent-stroke)" />

      </svg>

    ),

    color: "agent-billing",

  },

  technical: {

    label: "Technical",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <path

          d = "M14.7 6.3a4 4 0 0 1-5.4 5.4l-5.6 5.6a1.5 1.5 0 0 0 2.1 2.1l5.6-5.6a4 4 0 0 1 5.4-5.4l-2.3 2.3-1.4-1.4z"

          fill = "var(--tm-accent-fill)"

          stroke = "var(--tm-accent-stroke)"

          strokeWidth = "1.5"

          strokeLinejoin = "round"

        />

      </svg>

    ),

    color: "agent-technical",

  },

  product: {

    label: "Product",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <path

          d = "M21 8l-9-5-9 5 9 5 9-5z"

          fill = "var(--tm-accent-fill)"

          stroke = "var(--tm-accent-stroke)"

          strokeWidth = "1.5"

          strokeLinejoin = "round"

        />

        <path d = "M3 8v8l9 5 9-5V8" fill = "none" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" strokeLinejoin = "round" />

        <path d = "M12 13v8" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" />

      </svg>

    ),

    color: "agent-product",

  },

  complaint: {

    label: "Relations",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <path

          d = "M18 8a6 6 0 1 0-12 0c0 4-2 5-2 5h16s-2-1-2-5"

          fill = "var(--tm-accent-fill)"

          stroke = "var(--tm-accent-stroke)"

          strokeWidth = "1.5"

          strokeLinejoin = "round"

        />

        <path d = "M9 17a3 3 0 0 0 6 0" fill = "none" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" />

      </svg>

    ),

    color: "agent-complaint",

  },

  faq: {

    label: "Support",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <path

          d = "M21 12a8 8 0 1 1-3.5-6.6L21 4l-1 4.5A8 8 0 0 1 21 12z"

          fill = "var(--tm-accent-fill)"

          stroke = "var(--tm-accent-stroke)"

          strokeWidth = "1.5"

          strokeLinejoin = "round"

        />

        <path

          d = "M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 1.6-2.4 3.3"

          stroke = "var(--tm-accent-stroke)"

          strokeWidth = "1.5"

          strokeLinecap = "round"

          fill = "none"

        />

        <circle cx = "12" cy = "16.5" r = "0.9" fill = "var(--tm-accent-stroke)" />

      </svg>

    ),

    color: "agent-faq",

  },

  general: {

    label: "General",

    icon: (

      <svg width = "16" height = "16" viewBox = "0 0 24 24">

        <rect x = "4" y = "8" width = "16" height = "12" rx = "2" fill = "var(--tm-accent-fill)" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" />

        <circle cx = "9" cy = "14" r = "1.3" fill = "var(--tm-accent-stroke)" />

        <circle cx = "15" cy = "14" r = "1.3" fill = "var(--tm-accent-stroke)" />

        <path d = "M12 4v4" stroke = "var(--tm-accent-stroke)" strokeWidth = "1.5" />

        <circle cx = "12" cy = "3" r = "1.2" fill = "var(--tm-accent-stroke)" />

      </svg>

    ),

    color: "agent-general",

  },

};

// Sentiment glyphs, tied to the same tokens as the .sentiment-* text
// classes in globals.css. Professional status-indicator style (check /
// dash / trend-down / alert-triangle) rather than the earlier
// smiley-face metaphor — reads like a support-tool status badge.
const SENTIMENT_ICON = {

  positive: (

    <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-success)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

      <circle cx = "12" cy = "12" r = "9" />

      <path d = "M8 12.5l2.5 2.5L16 9.5" />

    </svg>

  ),

  neutral: (

    <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-text-slate)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

      <circle cx = "12" cy = "12" r = "9" />

      <line x1 = "8" y1 = "12" x2 = "16" y2 = "12" />

    </svg>

  ),

  negative: (

    <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-warning)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

      <circle cx = "12" cy = "12" r = "9" />

      <path d = "M8 10l4 4 4-4" />

    </svg>

  ),

  frustrated: (

    <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-danger)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

      <path d = "M12 3.5l9.5 16.5H2.5Z" />

      <line x1 = "12" y1 = "10" x2 = "12" y2 = "14" />

      <circle cx = "12" cy = "17" r = "0.6" fill = "var(--tm-danger)" stroke = "none" />

    </svg>

  ),

};

// Smaller components used inside the main chat page below.
function TypingIndicator() {

  return (

    <div className = "flex items-start gap-3 mb-5 message-enter">

      <div className = "avatar-mark inline-flex w-9 h-9 rounded-full text-sm flex-shrink-0">

        T

      </div>

      <div className = "message-assistant flex items-center gap-1 py-4 px-5">

        <span className = "typing-dot" />

        <span className = "typing-dot" />

        <span className = "typing-dot" />

      </div>

    </div>

  );

}

function AgentBadge({ agent }) {

  const meta = AGENT_META[agent] || AGENT_META.general;

  return (

    <span className = {`agent-badge ${meta.color}`}>

      {meta.icon} {meta.label}

    </span>

  );

}

function MessageBubble({ message }) {

  const isUser = message.role === "user";

  if (isUser) {

    return (

      <div className = "flex justify-end mb-5 message-enter">

        <div className = "flex flex-col items-end gap-1 max-w-[80%]">

          <div className = "flex flex-col items-end gap-2">

            {/* File Previews */}
            {message.files && message.files.length > 0 && (

              <div className = "flex flex-wrap gap-2 justify-end">

                {message.files.map((f, i) => (

                  <div key = {i} className = "bg-white/10 rounded-xl overflow-hidden">

                    {f.url ? (

                      <img src = {f.url} alt = {f.name} className = "max-w-[200px] max-h-[150px] object-cover rounded-xl" />

                    ) : (

                      <div className = "flex items-center gap-2 px-3 py-2">

                        <span className = "text-lg">{f.type === "application/pdf" ? "📄" : f.type.includes("word") ? "📝" : "📎"}</span>

                        <div>

                          <div className = "text-xs font-medium text-white truncate max-w-[150px]">{f.name}</div>

                          <div className = "text-[10px] text-white/60">{(f.size / 1024).toFixed(1)} KB</div>

                        </div>

                      </div>

                    )}

                  </div>

                ))}

              </div>

            )}

            {message.content && <div className = "message-user">{message.content}</div>}

          </div>

          <div className = "text-xs text-[var(--tm-text-faint)] px-1">

            {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {

              hour: "2-digit",

              minute: "2-digit",

            })}

          </div>

        </div>

      </div>

    );

  }

  return (

    <div className = "flex items-start gap-3 mb-5 message-enter">

      <div className = "avatar-mark inline-flex w-9 h-9 rounded-full text-sm flex-shrink-0">

        T

      </div>

      <div className = "flex flex-col items-start gap-1 max-w-[80%]">

        <div className = "message-assistant whitespace-pre-wrap">{message.content}</div>

        <div className = "flex items-center gap-2 mt-1">

          {message.agent && <AgentBadge agent = {message.agent} />}

          {message.sentiment && message.sentiment !== "neutral" && (

            <span className = {`sentiment-badge sentiment-${message.sentiment}`}>

              {SENTIMENT_ICON[message.sentiment]}

              <span style = {{ textTransform: "capitalize" }}>{message.sentiment}</span>

            </span>

          )}

          {message.response_time_ms > 0 && <span className = "text-xs text-[var(--tm-text-faint)]">{Math.round(message.response_time_ms)}ms</span>}

        </div>

        <div className = "text-xs text-[var(--tm-text-faint)] px-1">

          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit",

          })}

        </div>

      </div>

    </div>

  );

}

function FeedbackModal({ sessionId, onClose }) {

  const [rating, setRating] = useState(0);

  const [comment, setComment] = useState("");

  const [hover, setHover] = useState(0);

  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {

    if (!rating) return;

    await feedbackAPI.submit(sessionId, rating, comment || null);

    setSubmitted(true);

    setTimeout(onClose, 1500);

  };

  return (

    <div className = "fixed inset-0 bg-[var(--techmart-gray-900)]/40 flex items-center justify-center z-[100] fade-in">

      <div className = "card p-6 w-full max-w-md mx-4">

        {submitted ? (

          <div className = "text-center py-4">

            <div className = "flex items-center justify-center mb-3">

              <div

                className = "flex items-center justify-center rounded-full"

                style = {{ width: 48, height: 48, background: "var(--tm-success)" }}

              >

                <svg width = "24" height = "24" viewBox = "0 0 24 24" fill = "none" stroke = "#ffffff" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                  <polyline points = "20 6 9 17 4 12" />

                </svg>

              </div>

            </div>

            <p className = "font-medium text-lg text-[var(--tm-text-strong)]">Thank you for your feedback!</p>

          </div>

        ) : (

          <>

            <h3 className = "text-lg font-semibold mb-1 text-[var(--tm-text-strong)]">Rate this conversation</h3>

            <p className = "text-[var(--tm-text-muted)] text-sm mb-4">How helpful was our support today?</p>

            <div className = "flex justify-center gap-1 mb-4">

              {[1, 2, 3, 4, 5].map((star) => (

                <button

                  key = {star}

                  className = {`star-btn ${star <= (hover || rating) ? "filled" : ""}`}

                  onMouseEnter = {() => setHover(star)}

                  onMouseLeave = {() => setHover(0)}

                  onClick = {() => setRating(star)}

                >

                  <svg width = "24" height = "24" viewBox = "0 0 24 24" fill = {star <= (hover || rating) ? "currentColor" : "none"} stroke = "currentColor" strokeWidth = "1.5" strokeLinejoin = "round">

                    <path d = "M12 3.5l2.6 5.4 5.9.6-4.4 4 1.3 5.9-5.4-3-5.4 3 1.3-5.9-4.4-4 5.9-.6z" />

                  </svg>

                </button>

              ))}

            </div>

            <textarea

              className = "auth-input resize-none mb-4"

              rows = {3}

              placeholder = "Additional comments (optional)..."

              value = {comment}

              onChange = {(e) => setComment(e.target.value)}

            />

            <div className = "flex gap-3">

              <button className = "btn-primary flex-1" onClick = {submit} disabled = {!rating}>

                Submit Feedback

              </button>

              <button className = "flex-1 border border-[var(--tm-border-light)] rounded-xl py-2 text-sm font-medium text-[var(--tm-text-slate)] hover:bg-[var(--techmart-gray-100)] transition-colors" onClick = {onClose}>

                Skip

              </button>

            </div>

          </>

        )}

      </div>

    </div>

  );

}

function BugReportModal({ onClose }) {

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [stepsToReproduce, setStepsToReproduce] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    if (!title.trim() || title.trim().length < 3) {

      setError("Please enter a short title (at least 3 characters).");

      return;

    }

    if (!description.trim() || description.trim().length < 10) {

      setError("Please describe the bug in a bit more detail (at least 10 characters).");

      return;

    }

    setSubmitting(true);

    try {

      const pageUrl = typeof window !== "undefined" ? window.location.href : null;

      await bugReportAPI.submit(title.trim(), description.trim(), stepsToReproduce.trim() || null, pageUrl);

      setSubmitted(true);

      setTimeout(onClose, 1800);

    } catch (err) {

      setError(err.message || "Failed to submit bug report. Please try again.");

    } finally {

      setSubmitting(false);

    }

  };

  return (

    <div className = "fixed inset-0 bg-[var(--techmart-gray-900)]/40 flex items-center justify-center z-[100] fade-in" onClick = {onClose}>

      <div className = "card p-6 w-full max-w-md mx-4" onClick = {(e) => e.stopPropagation()}>

        {submitted ? (

          <div className = "text-center py-4">

            <div className = "flex items-center justify-center mb-3">

              <div

                className = "flex items-center justify-center rounded-full"

                style = {{ width: 48, height: 48, background: "var(--tm-success)" }}

              >

                <svg width = "24" height = "24" viewBox = "0 0 24 24" fill = "none" stroke = "#ffffff" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                  <polyline points = "20 6 9 17 4 12" />

                </svg>

              </div>

            </div>

            <p className = "font-medium text-lg text-[var(--tm-text-strong)]">Thanks for the report!</p>

            <p className = "text-sm text-[var(--tm-text-muted)] mt-1">Our team will take a look shortly.</p>

          </div>

        ) : (

          <form onSubmit = {handleSubmit} className = "space-y-4">

            <div>

              <h3 className = "text-lg font-semibold text-[var(--tm-text-strong)] mb-1">Report a Bug</h3>

              <p className = "text-sm text-[var(--tm-text-muted)]">Tell us what went wrong — the more detail, the faster we can fix it.</p>

            </div>

            <div>

              <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">Title</label>

              <input

                type = "text"

                value = {title}

                onChange = {(e) => setTitle(e.target.value)}

                placeholder = "e.g. Export CSV button doesn't work"

                className = "auth-input"

                autoFocus

                required

              />

            </div>

            <div>

              <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">What happened?</label>

              <textarea

                value = {description}

                onChange = {(e) => setDescription(e.target.value)}

                placeholder = "Describe the bug in as much detail as you can..."

                className = "auth-input"

                rows = {4}

                style = {{ resize: "vertical", fontFamily: "inherit" }}

                required

              />

            </div>

            <div>

              <label className = "block text-sm font-medium text-[var(--tm-text-slate)] mb-1.5">

                Steps to reproduce <span className = "text-[var(--tm-text-faint)] font-normal">(optional)</span>

              </label>

              <textarea

                value = {stepsToReproduce}

                onChange = {(e) => setStepsToReproduce(e.target.value)}

                placeholder = {"1. Go to...\n2. Click on...\n3. See error"}

                className = "auth-input"

                rows = {3}

                style = {{ resize: "vertical", fontFamily: "inherit" }}

              />

            </div>

            {error && (

              <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm fade-in">

                ⚠️ {error}

              </div>

            )}

            <div className = "flex gap-2 justify-end">

              <button

                type = "button"

                onClick = {onClose}

                disabled = {submitting}

                className = "px-4 py-2 rounded-xl text-sm font-medium text-[var(--tm-text-muted)] border border-[var(--tm-border-light)] hover:bg-[var(--techmart-gray-100)] hover:text-[var(--tm-text-strong)] transition-colors"

              >

                Cancel

              </button>

              <button type = "submit" disabled = {submitting} className = "btn-primary px-4 py-2 text-sm">

                {submitting ? "Submitting..." : "Submit Report"}

              </button>

            </div>

          </form>

        )}

      </div>

    </div>

  );

}

// Shared row used for the sidebar's top-level nav (Chats / Analytics /
// Archived / Deleted / New Chat). Pulled out because all five used to
// be near-identical blocks of inline style plus onMouseEnter/onMouseLeave
// handlers — this collapses that repetition into one place while every
// row keeps its own icon, label, active state, and click handler.
function NavRow({ icon, label, active, onClick, emphasize }) {

  return (

    <button

      onClick = {onClick}

      className = {`sidebar-item w-full text-left ${active ? "active" : ""} ${emphasize ? "font-semibold" : ""}`}

    >

      {icon}

      <span>{label}</span>

    </button>

  );

}

// Shared expandable section used for Settings / Language / Get Help in
// the account popover, plus the row style used inside each of them.
function MenuSection({ id, icon, label, expanded, onToggle, children }) {

  return (

    <div>

      <button onClick = {() => onToggle(id)} className = {`menu-section-btn ${expanded ? "active" : ""}`}>

        {icon}

        <span style = {{ flex: 1 }}>{label}</span>

        <svg

          width = "10"

          height = "10"

          viewBox = "0 0 24 24"

          fill = "none"

          stroke = "currentColor"

          strokeWidth = "2.5"

          strokeLinecap = "round"

          strokeLinejoin = "round"

          style = {{

            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",

            transition: "transform 0.2s var(--tm-ease)",

          }}

        >

          <polyline points = "6 9 12 15 18 9" />

        </svg>

      </button>

      {expanded && <div className = "bg-[var(--techmart-gray-100)]" style = {{ borderBottom: "1px solid rgba(30,28,24,0.05)" }}>{children}</div>}

    </div>

  );

}

function MenuRow({ icon, label, onClick, danger }) {

  return (

    <button onClick = {onClick} className = {`menu-item ${danger ? "menu-item-danger" : ""}`}>

      {icon}

      {label}

    </button>

  );

}

function Sidebar({

  sessions,

  currentSessionId,

  onSelectSession,

  onNewSession,

  onDeleteSession,

  onArchiveSession,

  user,

  onShowAnalytics,

  sidebarOpen,

  searchQuery,

  setSearchQuery,

  filteredSessions,

  sidebarCollapsed,

  onDeleteAll,

  onArchiveAll,

  darkMode,

  onRestoreSession,

  onUnarchiveAll,

  onRestoreAll,

  onOpenBugReport,

}) {

  const { confirmDialog, alertDialog, promptDialog } = useDialog();

  const { language, setLanguage, t } = useLanguage();

  const [showMenu, setShowMenu] = useState(false);

  const [activeView, setActiveView] = useState("chats");

  const [expandedSection, setExpandedSection] = useState(null);

  const [archivedSessions, setArchivedSessions] = useState([]);

  const [deletedSessions, setDeletedSessions] = useState([]);

  const menuRef = useRef(null);

  const displayTitle = (session) => session.title || "New Conversation";

  const loadArchived = async () => {

    try {

      const data = await sessionsAPI.listArchived();

      setArchivedSessions(data);

    } catch (e) {

      console.error(e);

    }

  };

  const loadDeleted = async () => {

    try {

      const data = await sessionsAPI.listDeleted();

      setDeletedSessions(data);

    } catch (e) {

      console.error(e);

    }

  };

  const toggleSection = (section) => {

    setExpandedSection((prev) => (prev === section ? null : section));

  };

  useEffect(() => {

    function handleClickOutside(event) {

      if (menuRef.current && !menuRef.current.contains(event.target)) {

        setShowMenu(false);

        setExpandedSection(null);

      }

    }

    if (showMenu) {

      document.addEventListener("mousedown", handleClickOutside);

    }

    return () => {

      document.removeEventListener("mousedown", handleClickOutside);

    };

  }, [showMenu]);

  // Sub-item definitions for the three expandable menu sections. Kept as
  // plain data (same as the original) so MenuSection/MenuRow can just map
  // over them — only the confirm/alert calls were swapped for confirmDialog/alertDialog.
  const SETTINGS_ITEMS = [

    {

      label: t("accountAndProfile"),

      action: () =>

        alertDialog({

          title: "Account",

          icon: "👤",

          message: `Name: ${user?.name}\nEmail: ${user?.email}\nRole: ${user?.is_admin ? "Admin" : "User"}\nMember since: ${new Date(user?.created_at || Date.now()).toLocaleDateString()}`,

        }),

    },

    {

      label: t("notifications"),

      action: () =>

        alertDialog({

          title: "Notifications",

          icon: "🔔",

          message: "✅ Email alerts: Enabled\n✅ Chat summaries: Enabled\n❌ SMS alerts: Disabled\n\nContact support to change notification settings.",

        }),

    },

    {

      label: t("privacyAndSecurity"),

      action: () =>

        alertDialog({

          title: "Privacy & Security",

          icon: "🔒",

          message: "✅ Data encrypted (256-bit SSL)\n✅ PCI-DSS Level 1 certified\n✅ No data sold to third parties\n\nView full policy: techmartelectronics.com/privacy",

        }),

    },

    {

      label: t("changePassword"),

      action: async () => {

        try {

          await authAPI.forgotPassword(user?.email);

          await alertDialog({

            title: "Check your email",

            icon: "📧",

            message: `We've sent a password reset link to ${user?.email}. The link expires in 30 minutes.`,

          });

        } catch (err) {

          await alertDialog({

            title: "Something went wrong",

            icon: "⚠️",

            message: "Failed to send the reset link. Please try again, or contact support@techmartelectronics.com.",

          });

        }

      },

    },

  ];

  const LANGUAGE_ITEMS = LANGUAGES.map((lang) => ({

    code: lang.code,

    label: `${lang.flag}  ${lang.label}`,

    action: () => {

      setLanguage(lang.code);

      alertDialog({ title: t("language"), icon: "✅", message: `${lang.label}` });

    },

  }));

  const HELP_ITEMS = [

    {

      label: t("emailSupport"),

      icon: (

        <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

          <rect x = "2" y = "4" width = "20" height = "16" rx = "2" />

          <path d = "M22 6l-10 7L2 6" />

        </svg>

      ),

      action: async () => {

        const email = "support@techmartelectronics.com";

        try {

          await navigator.clipboard.writeText(email);

        } catch (e) {

          // Clipboard API can fail in some contexts — the dialog below
          // still shows the address so the person can select/copy it manually
        }

        // Also try to open the system mail client — a no-op if none is
        // configured, but a nice bonus when one is
        window.location.href = `mailto:${email}?subject=Help Request`;

        await alertDialog({

          title: "Email Support",

          icon: "📧",

          message: `${email}\n\nCopied to your clipboard. Paste it into your email app to reach us.`,

        });

      },

    },

    {

      label: t("callSupport"),

      icon: (

        <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

          <path d = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />

        </svg>

      ),

      action: async () => {

        const phone = "1-800-TECHMART";

        try {

          await navigator.clipboard.writeText(phone);

        } catch (e) {

          // Non-fatal — the dialog below still shows the number

        }

        window.location.href = "tel:18008324627";

        await alertDialog({

          title: "Call Support",

          icon: "📞",

          message: `${phone}\n\nCopied to your clipboard.`,

        });

      },

    },

    {

      label: t("liveChat"),

      icon: (

        <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

          <path d = "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />

        </svg>

      ),

      action: () => {

        setShowMenu(false);

        onNewSession();

      },

    },

    {

      label: t("documentation"),

      icon: (

        <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

          <path d = "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

          <path d = "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />

        </svg>

      ),

      action: () => window.open("/documentation", "_blank"),

    },

    {

      label: t("reportABug"),

      icon: (

        <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

          <rect x = "8" y = "6" width = "8" height = "14" rx = "4" />

          <path d = "M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M12 6V3M8 3h8M3 13h5M16 13h5" />

        </svg>

      ),

      action: () => {

        setShowMenu(false);

        onOpenBugReport();

      },

    },

  ];

  return (

    <aside

      className = {`chat-sidebar ${sidebarOpen ? "open" : ""}`}

      style = {{

        background: "var(--tm-surface)",

        borderRight: "2px solid var(--tm-border-light)",

      }}

    >

      {/* Top Logo */}
      <div

        style = {{

          padding: "13.2px",

          borderBottom: "2px solid var(--tm-border-light)",

          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

        }}

      >

        <div style = {{ display: "flex", alignItems: "center", gap: "10px" }}>

          <div className = "avatar-mark inline-flex w-8 h-8 rounded-[10px] text-base flex-shrink-0">

            T

          </div>

          <div>

            <div style = {{ fontWeight: 650, fontSize: "0.933em", color: "var(--tm-text-strong)" }}>

              TechMart AI

            </div>

            <div style = {{ fontSize: "0.733em", color: "var(--tm-text-muted)" }}>{t("customerSupport")}</div>

          </div>

        </div>

      </div>

      {/* New Chat Button */}
      <div style = {{ padding: "9px 16px 4px" }}>

        <NavRow

          icon = {

            <div

              style = {{

                width: 24,

                height: 24,

                borderRadius: "50%",

                background: darkMode ? "rgba(232,233,237,0.12)" : "rgba(0,0,0,0.06)",

                border: darkMode ? "1px solid rgba(232,233,237,0.18)" : "none",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                flexShrink: 0,

              }}

            >

              <svg width = "14" height = "14" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-text-strong)" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                <line x1 = "12" y1 = "5" x2 = "12" y2 = "19" />

                <line x1 = "5" y1 = "12" x2 = "19" y2 = "12" />

              </svg>

            </div>

          }

          label = {t("newChat")}

          active = {false}

          emphasize = {true}

          onClick = {onNewSession}

        />

      </div>

      {/* Main Nav */}
      <div style = {{ padding: "0px 19px 4px" }}>

        <NavRow

          icon = {

            <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

              <path d = "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />

              <circle cx = "8.5" cy = "11" r = "0.75" fill = "currentColor" stroke = "none" />

              <circle cx = "12" cy = "11" r = "0.75" fill = "currentColor" stroke = "none" />

              <circle cx = "15.5" cy = "11" r = "0.75" fill = "currentColor" stroke = "none" />

            </svg>

          }

          label = {t("chats")}

          active = {activeView === "chats"}

          onClick = {() => setActiveView("chats")}

        />

      </div>

      <div style = {{ padding: "0px 19px 4px" }}>

        <NavRow

          icon = {

            <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

              <path d = "M4 19h16" />

              <path d = "M4 15l5-5 4 4 7-8" />

              <path d = "M16 6h4v4" />

            </svg>

          }

          label = {t("analytics")}

          active = {activeView === "analytics"}

          onClick = {() => {

            setActiveView("analytics");

            onShowAnalytics();

          }}

        />

      </div>

      <div style = {{ padding: "0px 19px 4px" }}>

        <NavRow

          icon = {

            <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

              <rect x = "2" y = "4" width = "20" height = "5" rx = "1.5" />

              <path d = "M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />

              <line x1 = "10" y1 = "13" x2 = "14" y2 = "13" />

            </svg>

          }

          label = {t("archivedChats")}

          active = {activeView === "archived"}

          onClick = {() => {

            setActiveView("archived");

            loadArchived();

          }}

        />

      </div>

      <div style = {{ padding: "0px 19px 4px" }}>

        <NavRow

          icon = {

            <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

              <path d = "M4 7h16" />

              <path d = "M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />

              <line x1 = "10" y1 = "11" x2 = "10" y2 = "17" />

              <line x1 = "14" y1 = "11" x2 = "14" y2 = "17" />

            </svg>

          }

          label = {t("recentlyDeletedChats")}

          active = {activeView === "deleted"}

          onClick = {() => {

            setActiveView("deleted");

            loadDeleted();

          }}

        />

      </div>

      {/* Search + Chats View */}
      <div style = {{ padding: "20px 6px 4px" }}></div>

      {activeView === "chats" && (

        <div

          style = {{

            flex: 1,

            overflow: "hidden",

            display: "flex",

            flexDirection: "column",

            padding: "0 12px",

          }}

        >

          {/* Search */}
          <div style = {{ position: "relative", marginBottom: 20 }}>

            <svg

              style = {{

                position: "absolute",

                left: 9,

                top: "50%",

                transform: "translateY(-50%)",

                color: "var(--tm-text-muted)",

                pointerEvents: "none",

              }}

              width = "12"

              height = "12"

              viewBox = "0 0 24 24"

              fill = "none"

              stroke = "currentColor"

              strokeWidth = "2.5"

              strokeLinecap = "round"

              strokeLinejoin = "round"

            >

              <circle cx = "11" cy = "11" r = "8" />

              <line x1 = "21" y1 = "21" x2 = "16.65" y2 = "16.65" />

            </svg>

            <input

              type = "text"

              placeholder = {t("searchChats")}

              value = {searchQuery}

              onChange = {(e) => setSearchQuery(e.target.value)}

              className = "search-input"

              style = {{

                paddingLeft: 28,

                color: "var(--tm-text-strong)",

                fontFamily: "'Lora', Georgia, 'Times New Roman', serif",

                fontWeight: 450,

              }}

            />

            {searchQuery && (

              <button

                onClick = {() => setSearchQuery("")}

                className = "icon-btn"

                style = {{

                  position: "absolute",

                  right: 6,

                  top: "50%",

                  transform: "translateY(-50%)",

                  fontSize: "0.733em",

                  borderRadius: "50%",

                  padding: 4,

                }}

              >
                ✕

              </button>

            )}

          </div>

          {/* Section Label + Action Buttons */}
          <div

            style = {{

              display: "flex",

              alignItems: "center",

              padding: "4px 4px",

              marginBottom: 4,

            }}

          >

            <div

              style = {{

                fontSize: "0.667em",

                fontWeight: 600,

                color: "var(--tm-text-muted)",

                letterSpacing: "0.8px",

                textTransform: "uppercase",

                flex: 1,

              }}

            >

              {searchQuery ? `${t("results")} (${filteredSessions.length})` : t("recents")}

            </div>

            {filteredSessions.length > 0 && !searchQuery && (

              <div style = {{ display: "flex", gap: 4 }}>

                {/* Archive All */}
                <button

                  title = {t("archiveAll")}

                  className = "icon-btn"

                  onClick = {async () => {

                    const ok = await confirmDialog({ title: "Archive all conversations?", confirmLabel: "Archive" });

                    if (ok) {

                      await sessionsAPI.archiveAll();

                      onArchiveAll();

                    }

                  }}

                >

                  <svg width = "11" height = "11" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                    <polyline points = "21 8 21 21 3 21 3 8" />

                    <rect x = "1" y = "3" width = "22" height = "5" />

                    <line x1 = "10" y1 = "12" x2 = "14" y2 = "12" />

                  </svg>

                </button>

                {/* Delete All */}
                <button

                  title = {t("deleteAll")}

                  className = "icon-btn icon-btn-danger"

                  onClick = {async () => {

                    const ok = await confirmDialog({

                      title: "Delete all conversations?",

                      message: "This cannot be undone.",

                      confirmLabel: "Delete All",

                      danger: true,

                    });

                    if (ok) {

                      await sessionsAPI.deleteAll();

                      onDeleteAll();

                    }

                  }}

                >

                  <svg width = "11" height = "11" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                    <path d = "M5 7h14l-1 13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5Z" />

                    <path d = "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />

                    <line x1 = "3" y1 = "7" x2 = "21" y2 = "7" />

                    <line x1 = "10" y1 = "11" x2 = "10" y2 = "17" />

                    <line x1 = "14" y1 = "11" x2 = "14" y2 = "17" />

                  </svg>

                </button>

              </div>

            )}

          </div>

          {/* Sessions */}
          <div style = {{ flex: 1, overflowY: "auto" }}>

            {filteredSessions.length === 0 && (

              <div style = {{ fontSize: "0.8em", color: "var(--tm-text-faint)", padding: "8px 4px" }}>

                {searchQuery ? t("noResultsFound") : "No conversations yet"}

              </div>

            )}

            {filteredSessions.map((s) => (

              <div

                key = {s.id}

                className = {`sidebar-item group ${s.id === currentSessionId ? "active" : ""}`}

                onClick = {() => onSelectSession(s.id)}

                style = {{ marginBottom: 1, borderRadius: 6 }}

              >

                <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" style = {{ flexShrink: 0 }}>

                  <path d = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />

                </svg>

                <div style = {{ flex: 1, minWidth: 0 }}>

                  <div style = {{ fontSize: "0.8em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

                    {displayTitle(s)}

                  </div>

                  <div style = {{ fontSize: "0.667em", color: "var(--tm-text-faint)", marginTop: 1 }}>

                    {new Date(s.created_at).toLocaleDateString()}

                  </div>

                </div>

                <button

                  className = "delete-btn icon-btn icon-btn-success"

                  title = "Archive"

                  style = {{ opacity: 0, padding: "2px" }}

                  onClick = {async (e) => {

                    e.stopPropagation();

                    try {

                      await sessionsAPI.archive(s.id);

                      // Just take this session out of the visible list.
                      // We're not actually deleting it from the backend here
                      // — calling onDeleteSession would mark it as deleted
                      // in the database, which we don't want in this case.
                      onArchiveSession(s.id);

                    } catch (err) {

                      await alertDialog({ title: "Something went wrong", icon: "⚠️", message: "Failed to archive. Please try again." });

                    }

                  }}

                >

                  <svg width = "11" height = "11" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                    <polyline points = "21 8 21 21 3 21 3 8" />

                    <rect x = "1" y = "3" width = "22" height = "5" />

                  </svg>

                </button>

                <button

                  className = "delete-btn icon-btn icon-btn-danger"

                  title = "Delete"

                  style = {{ opacity: 0, padding: "2px" }}

                  onClick = {(e) => {

                    e.stopPropagation();

                    onDeleteSession(s.id);

                  }}

                >

                  <svg width = "11" height = "11" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                    <path d = "M5 7h14l-1 13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5Z" />

                    <path d = "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />

                    <line x1 = "3" y1 = "7" x2 = "21" y2 = "7" />

                    <line x1 = "10" y1 = "11" x2 = "10" y2 = "17" />

                    <line x1 = "14" y1 = "11" x2 = "14" y2 = "17" />

                  </svg>

                </button>

              </div>

            ))}

          </div>

        </div>

      )}

      {/* Spacer for analytics/archived/deleted view */}
      {(activeView === "analytics" || activeView === "archived" || activeView === "deleted") && (

        <div style = {{ flex: 1, overflowY: "auto", padding: "0 12px" }}>

          {/* Archived Sessions */}
          {activeView === "archived" && (

            <>

              <div style = {{ display: "flex", alignItems: "center", padding: "8px 4px 4px" }}>

                <div style = {{ fontSize: "0.667em", fontWeight: 600, color: "var(--tm-text-slate)", letterSpacing: "0.8px", textTransform: "uppercase", flex: 1 }}>

                  Archived ({archivedSessions.length})

                </div>

                {archivedSessions.length > 0 && (

                  <button

                    title = {t("unarchiveAll")}

                    className = "icon-btn icon-btn-success"

                    style = {{ fontSize: "0.667em" }}

                    onClick = {async () => {

                      const ok = await confirmDialog({ title: "Unarchive all conversations?", confirmLabel: "Unarchive" });

                      if (ok) {

                        await sessionsAPI.unarchiveAll();

                        setArchivedSessions([]);

                        onUnarchiveAll();

                      }

                    }}

                  >
                    Unarchive All

                  </button>

                )}

              </div>

              {archivedSessions.length === 0 && (

                <div style = {{ fontSize: "0.8em", color: "var(--tm-text-faint)", padding: "8px 4px" }}>No archived conversations</div>

              )}

              {archivedSessions.map((s) => (

                <div key = {s.id} style = {{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 8, marginBottom: 2, background: "var(--techmart-gray-100)" }}>

                  <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-text-slate)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" style = {{ flexShrink: 0 }}>

                    <polyline points = "21 8 21 21 3 21 3 8" />

                    <rect x = "1" y = "3" width = "22" height = "5" />

                  </svg>

                  <div style = {{ flex: 1, minWidth: 0 }}>

                    <div style = {{ fontSize: "0.8em", color: "var(--tm-text-slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

                      {displayTitle(s)}

                    </div>

                    <div style = {{ fontSize: "0.667em", color: "var(--tm-text-faint)" }}>{new Date(s.created_at).toLocaleDateString()}</div>

                  </div>

                  <button

                    className = "icon-btn icon-btn-success"

                    title = "Restore to chats"

                    onClick = {async () => {

                      await sessionsAPI.restore(s.id);

                      setArchivedSessions((prev) => prev.filter((a) => a.id !== s.id));

                      onRestoreSession(s);

                    }}

                  >

                    <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <polyline points = "1 4 1 10 7 10" />

                      <path d = "M3.51 15a9 9 0 1 0 .49-3.85" />

                    </svg>

                  </button>

                </div>

              ))}

            </>

          )}

          {/* Deleted Sessions */}
          {activeView === "deleted" && (

            <>

              <div style = {{ display: "flex", alignItems: "center", padding: "8px 4px 4px" }}>

                <div style = {{ fontSize: "0.667em", fontWeight: 600, color: "var(--tm-text-slate)", letterSpacing: "0.8px", textTransform: "uppercase", flex: 1 }}>

                  Recently Deleted ({deletedSessions.length})

                </div>

                {deletedSessions.length > 0 && (

                  <button

                    title = {t("restoreAll")}

                    className = "icon-btn icon-btn-success"

                    style = {{ fontSize: "0.667em" }}

                    onClick = {async () => {

                      const ok = await confirmDialog({ title: "Restore all deleted conversations?", confirmLabel: "Restore" });

                      if (ok) {

                        await sessionsAPI.restoreAll();

                        setDeletedSessions([]);

                        onRestoreAll();

                      }

                    }}

                  >
                    Restore All

                  </button>

                )}

              </div>

              {deletedSessions.length === 0 && (

                <div style = {{ fontSize: "0.8em", color: "var(--tm-text-faint)", padding: "8px 4px" }}>{t("noDeletedConversations")}</div>

              )}

              {deletedSessions.map((s) => (

                <div key = {s.id} style = {{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 8, marginBottom: 2, background: "var(--techmart-gray-100)" }}>

                  <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "var(--tm-danger)" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" style = {{ flexShrink: 0 }}>

                    <path d = "M5 7h14l-1 13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5Z" />

                    <path d = "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />

                    <line x1 = "3" y1 = "7" x2 = "21" y2 = "7" />

                  </svg>

                  <div style = {{ flex: 1, minWidth: 0 }}>

                    <div style = {{ fontSize: "0.8em", color: "var(--tm-text-slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

                      {displayTitle(s)}

                    </div>

                    <div style = {{ fontSize: "0.667em", color: "var(--tm-text-faint)" }}>{new Date(s.created_at).toLocaleDateString()}</div>

                  </div>

                  {/* Restore button */}
                  <button

                    className = "icon-btn icon-btn-success"

                    title = "Restore"

                    onClick = {async () => {

                      await sessionsAPI.restore(s.id);

                      setDeletedSessions((prev) => prev.filter((d) => d.id !== s.id));

                      onRestoreSession(s);

                    }}

                  >

                    <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <polyline points = "1 4 1 10 7 10" />

                      <path d = "M3.51 15a9 9 0 1 0 .49-3.85" />

                    </svg>

                  </button>

                  {/* Delete permanently button */}
                  <button

                    className = "icon-btn icon-btn-danger"

                    title = {t("deletePermanently")}

                    onClick = {async () => {

                      const ok = await confirmDialog({

                        title: "Permanently delete this conversation?",

                        message: "This cannot be undone.",

                        confirmLabel: "Delete Permanently",

                        danger: true,

                      });

                      if (ok) {

                        await sessionsAPI.deletePermanent(s.id);

                        setDeletedSessions((prev) => prev.filter((d) => d.id !== s.id));

                      }

                    }}

                  >

                    <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <line x1 = "18" y1 = "6" x2 = "6" y2 = "18" />

                      <line x1 = "6" y1 = "6" x2 = "18" y2 = "18" />

                    </svg>

                  </button>

                </div>

              ))}

              {/* Empty deleted permanently button */}
              {deletedSessions.length > 0 && (

                <button

                  onClick = {async () => {

                    const ok = await confirmDialog({

                      title: "Permanently delete all deleted conversations?",

                      message: "This cannot be undone.",

                      confirmLabel: "Delete All Permanently",

                      danger: true,

                    });

                    if (ok) {

                      await Promise.all(deletedSessions.map((s) => sessionsAPI.deletePermanent(s.id)));

                      setDeletedSessions([]);

                    }

                  }}

                  style = {{

                    width: "100%",

                    marginTop: 8,

                    padding: "7px 12px",

                    background: "rgba(193,68,44,0.08)",

                    border: "1px solid rgba(193,68,44,0.2)",

                    borderRadius: 8,

                    color: "var(--tm-danger)",

                    fontSize: "0.8em",

                    cursor: "pointer",

                    textAlign: "center",

                  }}

                >
                  🗑️ Empty Bin

                </button>

              )}

            </>

          )}

        </div>

      )}

      {/* Footer User Menu */}
      <div ref = {menuRef} style = {{ padding: "10px 12px", borderTop: "2px solid var(--tm-border-light)", position: "relative" }}>

        {/* Popup Menu */}
        {showMenu && (

          <div

            style = {{

              position: "absolute",

              bottom: "calc(100% + 8px)",

              left: 12,

              right: 12,

              background: "var(--tm-surface)",

              border: "1px solid var(--tm-border-light)",

              borderRadius: 12,

              overflow: "hidden",

              boxShadow: "var(--tm-shadow-lg)",

              zIndex: 100,

            }}

          >

            {/* Email Header */}
            <div style = {{ padding: "12px 14px", borderBottom: "1px solid rgba(30,28,24,0.08)" }}>

              <div style = {{ fontSize: "0.733em", color: "var(--tm-text-muted)", marginBottom: 2 }}>

                {t("signedInAs")}

              </div>

              <div style = {{ fontSize: "0.8em", color: "var(--tm-text-strong)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

                {user?.email}

              </div>

            </div>

            <MenuSection

              id = "settings"

              expanded = {expandedSection === "settings"}

              onToggle = {toggleSection}

              label = {t("settings")}

              icon = {

                <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <circle cx = "12" cy = "12" r = "3" />

                  <path d = "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />

                </svg>

              }

            >

              {SETTINGS_ITEMS.map((sub) => (

                <MenuRow

                  key = {sub.label}

                  label = {sub.label}

                  onClick = {sub.action}

                  icon = {

                    <svg width = "8" height = "8" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <polyline points = "9 18 15 12 9 6" />

                    </svg>

                  }

                />

              ))}

            </MenuSection>

            <MenuSection

              id = "language"

              expanded = {expandedSection === "language"}

              onToggle = {toggleSection}

              label = {t("language")}

              icon = {

                <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <circle cx = "12" cy = "12" r = "10" />

                  <line x1 = "2" y1 = "12" x2 = "22" y2 = "12" />

                  <path d = "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />

                </svg>

              }

            >

              {LANGUAGE_ITEMS.map((lang) => (

                <MenuRow key = {lang.label} label = {lang.label} onClick = {lang.action} />

              ))}

            </MenuSection>

            <MenuSection

              id = "help"

              expanded = {expandedSection === "help"}

              onToggle = {toggleSection}

              label = {t("getHelp")}

              icon = {

                <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <circle cx = "12" cy = "12" r = "10" />

                  <path d = "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />

                  <line x1 = "12" y1 = "17" x2 = "12.01" y2 = "17" />

                </svg>

              }

            >

              {HELP_ITEMS.map((help) => (

                <MenuRow key = {help.label} label = {help.label} icon = {help.icon} onClick = {help.action} />

              ))}

            </MenuSection>

            {/* Log out */}
            <MenuRow

              danger

              label = {t("logOut")}

              onClick = {() => authAPI.logout()}

              icon = {

                <svg width = "13" height = "13" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <path d = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

                  <polyline points = "16 17 21 12 16 7" />

                  <line x1 = "21" y1 = "12" x2 = "9" y2 = "12" />

                </svg>

              }

            />

            {/* Reset History */}
            <MenuRow

              danger

              label = {t("resetHistory")}

              icon = {

                <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <polyline points = "1 4 1 10 7 10" />

                  <path d = "M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />

                </svg>

              }

              onClick = {async () => {

                const confirmed = await confirmDialog({

                  title: "Reset account history?",

                  message: "This will permanently clear:\n• All conversations\n• All messages\n• All analytics and feedback data\n\nYour account, login, and profile will remain.\n\nThis cannot be undone.",

                  confirmLabel: "Reset History",

                  danger: true,

                });

                if (!confirmed) return;

                try {

                  await authAPI.resetHistory();

                  await alertDialog({ title: "History reset", message: "Your account history has been reset. Fresh start!", icon: "✅" });

                  window.location.reload();

                } catch (err) {

                  await alertDialog({ title: "Something went wrong", message: "Failed to reset history. Please try again.", icon: "⚠️" });

                }

              }}

            />

            {/* Delete Account */}
            <MenuRow

              danger

              label = {t("deleteAccountPermanently")}

              icon = {

                <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <path d = "M5 7h14l-1 13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5Z" />

                  <path d = "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />

                  <line x1 = "3" y1 = "7" x2 = "21" y2 = "7" />

                  <line x1 = "10" y1 = "11" x2 = "10" y2 = "17" />

                  <line x1 = "14" y1 = "11" x2 = "14" y2 = "17" />

                </svg>

              }

              onClick = {async () => {

                const confirmed = await confirmDialog({

                  title: "Delete account permanently?",

                  message: "This will delete:\n• Your account\n• All conversations\n• All messages\n• All data\n\nThis cannot be undone.",

                  confirmLabel: "Continue",

                  danger: true,

                });

                if (!confirmed) return;

                const typed = await promptDialog({

                  title: "Confirm deletion",

                  message: "Type DELETE to permanently delete your account:",

                  placeholder: "DELETE",

                  requiredValue: "DELETE",

                  confirmLabel: "Delete Account",

                  danger: true,

                });

                if (typed === null) return;

                if (typed !== "DELETE") {

                  await alertDialog({ title: "Cancelled", icon: "⚠️", message: "Account deletion cancelled — you did not type DELETE correctly." });

                  return;

                }

                try {

                  await authAPI.deleteAccount();

                  await alertDialog({ title: "Account deleted", icon: "✅", message: "Your account has been permanently deleted. Goodbye!" });

                  authAPI.logout();

                } catch (err) {

                  await alertDialog({ title: "Something went wrong", icon: "⚠️", message: "Failed to delete account. Please try again." });

                }

              }}

            />

          </div>

        )}

        {/* User Row Button */}
        <button

          onClick = {() => setShowMenu((prev) => !prev)}

          className = {showMenu ? "bg-[var(--techmart-gray-100)]" : ""}

          style = {{

            width: "100%",

            display: "flex",

            alignItems: "center",

            gap: 10,

            border: "none",

            borderRadius: 8,

            padding: "8px 10px",

            cursor: "pointer",

            background: "none",

            transition: "background 0.15s var(--tm-ease)",

          }}

        >

          <div className = "avatar-mark inline-flex w-[30px] h-[30px] rounded-full text-xs flex-shrink-0">

            {user?.name?.[0]?.toUpperCase() || "U"}

          </div>

          <div style = {{ flex: 1, minWidth: 0, textAlign: "left" }}>

            <div style = {{ fontSize: "0.867em", fontWeight: 500, color: "var(--tm-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

              {user?.name}

            </div>

            <div style = {{ fontSize: "0.667em", color: "var(--tm-text-faint)" }}>{user?.is_admin ? "Admin" : t("freePlan")}</div>

          </div>

          <svg

            width = "12"

            height = "12"

            viewBox = "0 0 24 24"

            fill = "none"

            stroke = "var(--tm-text-faint)"

            strokeWidth = "2.5"

            strokeLinecap = "round"

            strokeLinejoin = "round"

            style = {{

              transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",

              transition: "transform 0.2s var(--tm-ease)",

              flexShrink: 0,

            }}

          >

            <polyline points = "18 15 12 9 6 15" />

          </svg>

        </button>

      </div>

    </aside>

  );

}

function AnalyticsPanel({ onClose }) {

  const { t } = useLanguage();

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  // "7" | "30" | "90" | "custom" — drives which query params get sent
  const [rangePreset, setRangePreset] = useState("30");

  const [customStart, setCustomStart] = useState("");

  const [customEnd, setCustomEnd] = useState("");

  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const fetchAnalytics = () => {

    setLoading(true);

    const params =

      rangePreset === "custom" && customStart && customEnd

        ? { startDate: customStart, endDate: customEnd }

        : { days: Number(rangePreset) };

    analyticsAPI

      .get(params)

      .then(setData)

      .catch(console.error)

      .finally(() => setLoading(false));

  };

  useEffect(() => {

    // Custom range only fetches once both dates are actually picked —
    // avoids firing a request while the person has only chosen a start date
    if (rangePreset === "custom" && (!customStart || !customEnd)) return;

    fetchAnalytics();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset, customStart, customEnd]);

  const RANGE_LABELS = {

    "7": "Last 7 days",

    "30": "Last 30 days",

    "90": "Last 90 days",

    "custom": customStart && customEnd ? `${customStart} → ${customEnd}` : "Custom range",

  };

  const rangePickerRef = useRef(null);

  useEffect(() => {

    const handleClickOutside = (e) => {

      if (rangePickerRef.current && !rangePickerRef.current.contains(e.target)) {

        setShowCustomPicker(false);

      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // One flat, muted icon per KPI instead of four different rainbow
  // gradients — same four metrics, one consistent visual treatment.
  const KPI_ICONS = {

    conversations: (

      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

        <path d = "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />

        <circle cx = "8.5" cy = "11" r = "0.75" fill = "var(--techmart-blue)" stroke = "none" />

        <circle cx = "12" cy = "11" r = "0.75" fill = "var(--techmart-blue)" stroke = "none" />

        <circle cx = "15.5" cy = "11" r = "0.75" fill = "var(--techmart-blue)" stroke = "none" />

      </svg>

    ),

    messages: (

      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.6" strokeLinecap = "round" strokeLinejoin = "round">

        <rect x = "3" y = "4" width = "18" height = "14" rx = "2" />

        <line x1 = "6.5" y1 = "8.5" x2 = "17.5" y2 = "8.5" />

        <line x1 = "6.5" y1 = "12" x2 = "14" y2 = "12" />

      </svg>

    ),

    rating: (

      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.6" strokeLinejoin = "round">

        <path d = "M12 3.5l2.6 5.4 5.9.6-4.4 4 1.3 5.9-5.4-3-5.4 3 1.3-5.9-4.4-4 5.9-.6z" />

      </svg>

    ),

    response: (

      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.6" strokeLinecap = "round" strokeLinejoin = "round">

        <path d = "M13.5 2L6 13H11L10 22L18 10H13L13.5 2Z" />

      </svg>

    ),

    resolution: (

      <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.6" strokeLinecap = "round" strokeLinejoin = "round">

        <path d = "M12 3 4 6.5v5c0 4.7 3.2 9 8 10 4.8-1 8-5.3 8-10v-5L12 3Z" />

        <polyline points = "9 12 11 14 15 10" />

      </svg>

    ),

  };

  // Same semantic colors already used for sentiment everywhere else in
  // the app (SENTIMENT_ICON, .sentiment-* classes) — reused here rather
  // than inventing a separate chart palette.
  const SENTIMENT_COLOR = {

    positive: "var(--tm-success)",

    neutral: "var(--tm-text-slate)",

    negative: "var(--tm-warning)",

    frustrated: "var(--tm-danger)",

  };

  // Renders the 30-day trend as a real line/area chart instead of a
  // row of height-adjusted divs. Only reads d.date/d.count — same
  // fields the old bar version used.
  //
  // Visual upgrade pass: horizontal gridlines at 0/50%/100% of the max
  // value, a labeled peak line, and larger invisible hit-areas around
  // each point so hover/tooltip triggers over a comfortable radius
  // instead of only the 3px visible dot. Still reads only d.date/d.count
  // — no new data fields required from the API.
  // Formats an ISO "YYYY-MM-DD" date string as "DD/MM/YYYY".
  const formatDateDMY = (isoDate) => {

    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;

  };

  const renderDailyTrend = (dailyData) => {

    const w = 480;

    const h = 120;

    const topPad = 18;

    const bottomPad = 4;

    const max = Math.max(...dailyData.map((d) => d.count), 1);

    const barGap = 6;

    const barWidth = dailyData.length > 0 ? Math.max((w - barGap * (dailyData.length - 1)) / dailyData.length, 2) : 0;

    const heightFor = (count) => (count / max) * (h - topPad - bottomPad);

    const bars = dailyData.map((d, i) => {

      const barHeight = heightFor(d.count);

      return {

        x: i * (barWidth + barGap),

        y: h - bottomPad - barHeight,

        height: barHeight,

        ...d,

      };

    });

    return (

      <>

        <svg viewBox = {`0 0 ${w} ${h}`} preserveAspectRatio = "none" style = {{ width: "100%", height: 150, display: "block", overflow: "visible" }}>

          {bars.map((b) => (

            <g key = {b.date} className = "trend-point">

              <rect

                x = {b.x}

                y = {b.y}

                width = {barWidth}

                height = {b.height}

                rx = "2"

                fill = "var(--tm-success)"

              />

              <text

                x = {b.x + barWidth / 2}

                y = {b.y - 5}

                textAnchor = "middle"

                fontSize = "9"

                fill = "var(--tm-text-faint)"

              >

                {b.count}

              </text>

              <title>{`${formatDateDMY(b.date)}: ${b.count} conversation${b.count === 1 ? "" : "s"}`}</title>

            </g>

          ))}

        </svg>

        <div style = {{ display: "flex", marginTop: 2, gap: 6 }}>

          {dailyData.map((d) => (

            <div key = {d.date} style = {{ flex: 1, textAlign: "center", fontSize: "0.6em", color: "var(--tm-text-faint)" }}>

              {formatDateDMY(d.date)}

            </div>

          ))}

        </div>

      </>

    );

  };

  // Vertical bar chart for the 24-hour busiest-hours breakdown. Peak
  // hour gets a distinct color so it's immediately scannable, same as
  // any real analytics tool would highlight the standout value.
  const renderBusiestHours = (hourlyData) => {

    const w = 480;

    const h = 120;

    const topPad = 18;

    const bottomPad = 4;

    const max = Math.max(...hourlyData.map((d) => d.count), 1);

    const barGap = 3;

    const barWidth = hourlyData.length > 0 ? Math.max((w - barGap * (hourlyData.length - 1)) / hourlyData.length, 2) : 0;

    const heightFor = (count) => (count / max) * (h - topPad - bottomPad);

    const peakHour = hourlyData.reduce((best, d) => (d.count > best.count ? d : best), hourlyData[0] || { hour: 0, count: 0 });

    const bars = hourlyData.map((d, i) => {

      const barHeight = heightFor(d.count);

      return {

        x: i * (barWidth + barGap),

        y: h - bottomPad - barHeight,

        height: barHeight,

        ...d,

      };

    });

    // 12-hour format with am/pm, e.g. 0 -> "12am", 13 -> "1pm"
    const formatHour = (hour) => {

      const period = hour < 12 ? "am" : "pm";

      const displayHour = hour % 12 === 0 ? 12 : hour % 12;

      return `${displayHour}${period}`;

    };

    return (

      <>

        <svg viewBox = {`0 0 ${w} ${h}`} preserveAspectRatio = "none" style = {{ width: "100%", height: 150, display: "block", overflow: "visible" }}>

          {bars.map((b) => (

            <g key = {b.hour}>

              <rect

                x = {b.x}

                y = {b.y}

                width = {barWidth}

                height = {Math.max(b.height, b.count > 0 ? 2 : 0)}

                rx = "2"

                fill = {b.count > 0 && b.hour === peakHour.hour ? "var(--techmart-blue)" : "var(--tm-success)"}

                opacity = {b.count > 0 && b.hour === peakHour.hour ? 1 : 0.75}

              />

              <title>{`${formatHour(b.hour)}: ${b.count} message${b.count === 1 ? "" : "s"}`}</title>

            </g>

          ))}

        </svg>

        <div style = {{ display: "flex", marginTop: 2, gap: 3 }}>

          {hourlyData.map((d, i) => (

            <div

              key = {d.hour}

              style = {{

                flex: 1,

                textAlign: "center",

                fontSize: "0.55em",

                color: "var(--tm-text-faint)",

                // Only label every 3rd hour to avoid crowding 24 labels into one row

                visibility: i % 3 === 0 ? "visible" : "hidden",

              }}

            >

              {formatHour(d.hour)}

            </div>

          ))}

        </div>

      </>

    );

  };

  // Small inline trend line for the Conversations KPI card — same
  // daily_conversations series the trend chart above uses, just at a
  // glance size. Real data, not decoration.
  const renderSparkline = (dailyData) => {

    const w = 100;

    const h = 28;

    const max = Math.max(...dailyData.map((d) => d.count), 1);

    const stepX = dailyData.length > 1 ? w / (dailyData.length - 1) : 0;

    const pts = dailyData.map((d, i) => `${(dailyData.length > 1 ? i * stepX : w / 2).toFixed(1)},${(h - (d.count / max) * (h - 4) - 2).toFixed(1)}`);

    return (

      <svg viewBox = {`0 0 ${w} ${h}`} preserveAspectRatio = "none" style = {{ width: 72, height: 22 }}>

        <polyline points = {pts.join(" ")} fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "2" strokeLinejoin = "round" strokeLinecap = "round" opacity = "0.55" />

      </svg>

    );

  };

  // Renders sentiment as a donut instead of an icon-and-count row —
  // same sentiment_distribution array, just a chart instead of a list.
  const renderSentimentDonut = (sentimentData) => {

    // ratedCount is the real number shown in the center label — can
    // legitimately be 0 when there's no data yet.
    const ratedCount = sentimentData.reduce((sum, s) => sum + s.count, 0);

    // total is only used for percentage math below — falls back to 1
    // purely to avoid a 0/0 divide-by-zero, never shown to the user.
    const total = ratedCount || 1;

    const radius = 38;

    const circumference = 2 * Math.PI * radius;

    let cumulative = 0;

    const arcs = sentimentData.map((s) => {

      const pct = s.count / total;

      const dash = pct * circumference;

      const arc = { ...s, pct, dash, offset: cumulative * circumference };

      cumulative += pct;

      return arc;

    });

    // Midpoint angle (in the original, un-rotated coordinate space) of
    // each arc segment, used to place its percentage label just outside
    // the ring.
    const labelPos = (a) => {

      const midFraction = (a.offset + a.dash / 2) / circumference;

      const angle = midFraction * 2 * Math.PI - Math.PI / 2;

      const labelRadius = radius + 13;

      return {

        x: 50 + labelRadius * Math.cos(angle),

        y: 50 + labelRadius * Math.sin(angle),

      };

    };

    return (

      <svg width = "140" height = "140" viewBox = "-15 -15 130 130">

        <g style = {{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }}>

          <circle cx = "50" cy = "50" r = {radius} fill = "none" stroke = "var(--techmart-gray-100)" strokeWidth = "13" />

          {arcs.map((a) => (

            <circle

              key = {a.sentiment}

              cx = "50"

              cy = "50"

              r = {radius}

              fill = "none"

              stroke = {SENTIMENT_COLOR[a.sentiment] || "var(--tm-text-faint)"}

              strokeWidth = "13"

              strokeDasharray = {`${a.dash} ${circumference - a.dash}`}

              strokeDashoffset = {-a.offset}

            />

          ))}

        </g>

        {arcs.filter((a) => a.pct > 0).map((a) => {

          const pos = labelPos(a);

          const label = `${Math.round(a.pct * 100)}%`;

          const chipWidth = label.length * 5.2 + 6;

          return (

            <g key = {`${a.sentiment}-label`}>

              <rect

                x = {pos.x - chipWidth / 2}

                y = {pos.y - 7}

                width = {chipWidth}

                height = "14"

                rx = "4"

                fill = "#ffffff"

                stroke = {SENTIMENT_COLOR[a.sentiment] || "var(--tm-text-faint)"}

                strokeWidth = "1"

              />

              <text

                x = {pos.x}

                y = {pos.y}

                textAnchor = "middle"

                dominantBaseline = "middle"

                fontSize = "8"

                fontWeight = "650"

                fill = {SENTIMENT_COLOR[a.sentiment] || "var(--tm-text-faint)"}

              >

                {label}

              </text>

            </g>

          );

        })}

        <text x = "50" y = "47" textAnchor = "middle" fontSize = "17" fontWeight = "650" fill = "var(--tm-text-strong)">

          {ratedCount}

        </text>

        <text x = "50" y = "61" textAnchor = "middle" fontSize = "7.5" fill = "var(--tm-text-faint)">

          rated

        </text>

      </svg>

    );

  };

  // Week-over-week % change — only computable for Conversations, since
  // it's the only metric with a daily breakdown (daily_conversations).
  // Messages/Rating/Response are single 30-day totals with no daily
  // series in the API response, so a WoW figure for those would be
  // fabricated, not derived — deliberately left out.
  const weekOverWeek = (dailyData) => {

    if (!dailyData || dailyData.length < 14) return null;

    const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

    const lastWeek = sorted.slice(-7).reduce((sum, d) => sum + d.count, 0);

    const priorWeek = sorted.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);

    if (priorWeek === 0) return null;

    return Math.round(((lastWeek - priorWeek) / priorWeek) * 100);

  };

  // Five-star rating display with exact partial fill — a 3.5 rating
  // fills star 4 exactly halfway via clip-path, not "round to nearest
  // half star", so 3.4 and 3.6 render visibly differently from 3.5.
  const renderStarRating = (rating) => {

    const stars = [1, 2, 3, 4, 5].map((n) => {

      const fillPct = Math.max(0, Math.min(1, rating - (n - 1))) * 100;

      return (

        <span key = {n} style = {{ position: "relative", display: "inline-block", width: 15, height: 15 }}>

          <svg width = "15" height = "15" viewBox = "0 0 24 24" style = {{ position: "absolute", top: 0, left: 0 }}>

            <path d = "M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5-6-3.3-6 3.3 1.3-6.5-4.9-4.5 6.6-.7z" fill = "none" stroke = "var(--tm-text-faint)" strokeWidth = "1.3" />

          </svg>

          <span style = {{ position: "absolute", top: 0, left: 0, width: `${fillPct}%`, height: "100%", overflow: "hidden" }}>

            <svg width = "15" height = "15" viewBox = "0 0 24 24">

              <path d = "M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5-6-3.3-6 3.3 1.3-6.5-4.9-4.5 6.6-.7z" fill = "var(--tm-warning)" stroke = "var(--tm-warning)" strokeWidth = "1.3" />

            </svg>

          </span>

        </span>

      );

    });

    return <span style = {{ display: "inline-flex", gap: 1 }}>{stars}</span>;

  };

  return (

    <div className = "flex-1 overflow-auto p-6 fade-in">

      <div className = "max-w-4xl mx-auto">

        <div className = "flex items-center justify-between mb-6">

          <h2 className = "text-xl font-semibold flex items-center gap-2 text-[var(--tm-text-strong)]">

            <svg width = "20" height = "20" viewBox = "0 0 24 24" fill = "none" stroke = "var(--techmart-blue)" strokeWidth = "1.6" strokeLinecap = "round" strokeLinejoin = "round">

              <path d = "M4 19h16" />

              <path d = "M4 15l5-5 4 4 7-8" />

              <path d = "M16 6h4v4" />

            </svg>

            Analytics Dashboard

          </h2>

          <div className = "flex items-center gap-3">

            <div ref = {rangePickerRef} style = {{ position: "relative" }}>

              <button

                className = "auth-input"

                style = {{ width: 170, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "9px 12px", fontSize: "0.867em", cursor: "pointer" }}

                onClick = {() => setShowCustomPicker((prev) => !prev)}

              >

                <span style = {{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{RANGE_LABELS[rangePreset]}</span>

                <svg width = "10" height = "10" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "3" strokeLinecap = "round" strokeLinejoin = "round" style = {{ flexShrink: 0 }}>

                  <polyline points = "6 9 12 15 18 9" />

                </svg>

              </button>

              {showCustomPicker && (

                <div

                  className = "card"

                  style = {{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 240, zIndex: 30, padding: 10 }}

                >

                  {["7", "30", "90"].map((preset) => (

                    <button

                      key = {preset}

                      onClick = {() => {

                        setRangePreset(preset);

                        setShowCustomPicker(false);

                      }}

                      style = {{

                        width: "100%",

                        textAlign: "left",

                        padding: "8px 10px",

                        borderRadius: 8,

                        fontSize: "0.867em",

                        border: "none",

                        cursor: "pointer",

                        background: rangePreset === preset ? "var(--techmart-gray-100)" : "transparent",

                        color: "var(--tm-text-strong)",

                        marginBottom: 2,

                      }}

                    >

                      {RANGE_LABELS[preset]}

                    </button>

                  ))}

                  <div style = {{ borderTop: "1px solid var(--tm-border-light)", margin: "6px 0" }} />

                  <div style = {{ fontSize: "0.8em", fontWeight: 600, color: "var(--tm-text-muted)", padding: "2px 10px 6px" }}>Custom range</div>

                  <div style = {{ display: "flex", flexDirection: "column", gap: 6, padding: "0 10px 8px" }}>

                    <input

                      type = "date"

                      value = {customStart}

                      onChange = {(e) => setCustomStart(e.target.value)}

                      className = "auth-input"

                      style = {{ fontSize: "0.8em", padding: "6px 8px" }}

                      max = {customEnd || undefined}

                    />

                    <input

                      type = "date"

                      value = {customEnd}

                      onChange = {(e) => setCustomEnd(e.target.value)}

                      className = "auth-input"

                      style = {{ fontSize: "0.8em", padding: "6px 8px" }}

                      min = {customStart || undefined}

                      max = {new Date().toISOString().slice(0, 10)}

                    />

                    <button

                      onClick = {() => {

                        if (customStart && customEnd) {

                          setRangePreset("custom");

                          setShowCustomPicker(false);

                        }

                      }}

                      disabled = {!customStart || !customEnd}

                      className = "btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"

                    >

                      Apply

                    </button>

                  </div>

                </div>

              )}

            </div>

            <button

              className = "btn-primary text-sm px-4 py-2 flex items-center gap-2"

              onClick = {() => {

                if (!data) return;

                const rows = [

                  ["Metric", "Value"],

                  ["Total Conversations", data.total_conversations],

                  ["Total Messages", data.total_messages],

                  ["Average Rating", data.average_rating ? data.average_rating.toFixed(2) : "N/A"],

                  ["Avg Response Time (ms)", Math.round(data.avg_response_time_ms)],

                  [],

                  ["Date", "Conversations"],

                  ...data.daily_conversations.map((d) => [d.date, d.count]),

                  [],

                  ["Agent", "Count", "Percentage"],

                  ...data.agent_distribution.map((a) => [a.agent, a.count, `${a.percentage}%`]),

                  [],

                  ["Sentiment", "Count"],

                  ...data.sentiment_distribution.map((s) => [s.sentiment, s.count]),

                ];

                const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

                const blob = new Blob([csv], { type: "text/csv" });

                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");

                a.href = url;

                a.download = `techmart-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

                a.click();

                URL.revokeObjectURL(url);

              }}

            >

              <svg width = "15" height = "15" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                <path d = "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />

                <polyline points = "7 10 12 15 17 10" />

                <line x1 = "12" y1 = "15" x2 = "12" y2 = "3" />

              </svg>

              {t("exportCSV")}

            </button>

            <button className = "btn-primary text-sm px-4 py-2" onClick = {onClose}>

              ❮ {t("backToChat")}

            </button>

          </div>

        </div>

        {loading && (

          <div className = "space-y-4 animate-pulse">

            <div className = "grid grid-cols-2 md:grid-cols-4 gap-4">

              {[1, 2, 3, 4].map((i) => (

                <div key = {i} className = "card p-4">

                  <div className = "h-3 bg-[var(--techmart-gray-100)] rounded w-16 mb-3" />

                  <div className = "h-7 bg-[var(--techmart-gray-200)] rounded w-12" />

                </div>

              ))}

            </div>

            <div className = "card p-4" style = {{ height: 180 }} />

            <div className = "grid md:grid-cols-2 gap-4">

              <div className = "card p-4" style = {{ height: 160 }} />

              <div className = "card p-4" style = {{ height: 160 }} />

            </div>

          </div>

        )}

        {data && (

          <>

            {/* KPI Cards — left-aligned label/value with the icon as a
                small corner mark, matching how real analytics dashboards
                (Stripe, Vercel, Linear Insights) lay out stat cards,
                rather than centered icon-over-number blocks. */}
            <div className = "grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">

              {[

                { label: "Conversations", value: data.total_conversations, icon: KPI_ICONS.conversations, spark: true, wow: weekOverWeek(data.daily_conversations) },

                { label: "Messages", value: data.total_messages, icon: KPI_ICONS.messages, spark: false, wow: null },

                { label: "Avg Rating", value: data.average_rating ? data.average_rating.toFixed(1) : "N/A", icon: KPI_ICONS.rating, spark: false, wow: null, isRating: true },

                { label: "Avg Response", value: `${Math.round(data.avg_response_time_ms)}ms`, icon: KPI_ICONS.response, spark: false, wow: null },

                { label: "Resolution Rate", value: data.resolution_rate !== null && data.resolution_rate !== undefined ? `${data.resolution_rate}%` : "N/A", icon: KPI_ICONS.resolution, spark: false, wow: null },

              ].map((kpi) => (

                <div key = {kpi.label} className = "card p-4">

                  <div className = "flex items-start justify-between mb-3">

                    <span className = "text-xs font-medium text-[var(--tm-text-muted)] uppercase tracking-wide">{kpi.label}</span>

                    {kpi.icon}

                  </div>

                  <div className = "flex items-end justify-between">

                    <div className = "flex items-center gap-2">

                      {kpi.isRating && data.average_rating ? (

                        <div className = "flex items-center gap-1.5">

                          {renderStarRating(data.average_rating)}

                          <span className = "text-sm font-semibold text-[var(--tm-text-strong)] tabular-nums">{kpi.value}</span>

                        </div>

                      ) : (

                        <div className = "text-2xl font-semibold text-[var(--tm-text-strong)] tabular-nums">{kpi.value}</div>

                      )}

                      {kpi.wow !== null && (

                        <span

                          className = "text-xs font-medium px-1.5 py-0.5 rounded-full"

                          style = {{

                            color: kpi.wow >= 0 ? "var(--tm-success)" : "var(--tm-danger)",

                            background: kpi.wow >= 0 ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)",

                          }}

                          title = "vs. the previous 7 days"

                        >

                          {kpi.wow >= 0 ? "+" : ""}{kpi.wow}%

                        </span>

                      )}

                    </div>

                    {kpi.spark && data.daily_conversations.length > 1 && renderSparkline(data.daily_conversations)}

                  </div>

                </div>

              ))}

            </div>

            {/* Daily Trend — the hero chart, full width */}
            {data.daily_conversations.length > 0 && (

              <div className = "card p-4 mb-4">

                <h3 className = "text-sm font-medium mb-4 text-[var(--tm-text-strong)]">Conversations, last 30 days</h3>

                {renderDailyTrend(data.daily_conversations)}

              </div>

            )}

            {/* Agent Usage + Sentiment side by side */}
            <div className = "grid md:grid-cols-2 gap-4 mb-4">

              <div className = "card p-4">

                <h3 className = "text-sm font-medium mb-4 text-[var(--tm-text-strong)]">Agent Usage</h3>

                <div className = "space-y-3">

                  {data.agent_distribution.map((a) => (

                    <div key = {a.agent} className = "flex items-center gap-3">

                      <div className = "w-20 text-xs text-right text-[var(--tm-text-slate)] capitalize flex-shrink-0">{a.agent}</div>

                      <div className = "flex-1 bg-[var(--techmart-gray-100)] rounded-full h-2" title = {`${a.agent}: ${a.count} conversation${a.count === 1 ? "" : "s"} (${a.percentage}%)`}>

                        <div className = "h-2 rounded-full transition-all" style = {{ width: `${a.percentage}%`, background: "#8b5cf6" }} />

                      </div>

                      <div className = "text-xs text-[var(--tm-text-muted)] w-20 text-right tabular-nums flex-shrink-0 whitespace-nowrap">

                        {a.count} · {a.percentage}%

                      </div>

                    </div>

                  ))}

                  {data.agent_distribution.length === 0 && <p className = "text-[var(--tm-text-faint)] text-sm">No data yet</p>}

                </div>

              </div>

              <div className = "card p-4">

                <h3 className = "text-sm font-medium mb-4 text-[var(--tm-text-strong)]">Sentiment</h3>

                <div className = "flex items-center gap-5">

                  {renderSentimentDonut(data.sentiment_distribution)}

                  <div className = "flex-1 space-y-2">

                    {data.sentiment_distribution.map((s) => (

                      <div key = {s.sentiment} className = "flex items-center gap-2">

                        <span style = {{ width: 8, height: 8, borderRadius: "50%", background: SENTIMENT_COLOR[s.sentiment] || "var(--tm-text-faint)", flexShrink: 0 }} />

                        <span className = "text-xs capitalize text-[var(--tm-text-slate)] flex-1">{s.sentiment}</span>

                        <span className = "text-xs font-medium text-[var(--tm-text-strong)] tabular-nums">{s.count}</span>

                      </div>

                    ))}

                    {data.sentiment_distribution.length === 0 && <p className = "text-[var(--tm-text-faint)] text-sm">No data yet</p>}

                  </div>

                </div>

              </div>

            </div>

            {/* Intent Distribution */}
            {data.intent_distribution && data.intent_distribution.length > 0 && (

              <div className = "card p-4">

                <h3 className = "text-sm font-medium mb-4 text-[var(--tm-text-strong)]">Intent Distribution</h3>

                <div className = "space-y-3">

                  {data.intent_distribution

                    .sort((a, b) => b.count - a.count)

                    .map((item) => {

                      const total = data.intent_distribution.reduce((sum, x) => sum + x.count, 0) || 1;

                      const pct = Math.round((item.count / total) * 100);

                      return (

                        <div key = {item.intent} className = "flex items-center gap-3">

                          <div className = "w-24 text-xs text-right text-[var(--tm-text-slate)] capitalize flex-shrink-0">{item.intent}</div>

                          <div className = "flex-1 bg-[var(--techmart-gray-100)] rounded-full h-2" title = {`${item.intent}: ${item.count} conversation${item.count === 1 ? "" : "s"} (${pct}%)`}>

                            <div className = "bg-[var(--tm-danger)] h-2 rounded-full transition-all" style = {{ width: `${pct}%` }} />

                          </div>

                          <div className = "text-xs text-[var(--tm-text-muted)] w-16 text-right tabular-nums flex-shrink-0">

                            {item.count} · {pct}%

                          </div>

                        </div>

                      );

                    })}

                </div>

              </div>

            )}

            {/* Busiest Hours — full width, shows when people actually message in */}
            {data.busiest_hours && data.busiest_hours.some((h) => h.count > 0) && (

              <div className = "card p-4 mb-4">

                <h3 className = "text-sm font-medium mb-4 text-[var(--tm-text-strong)]">Busiest Hours</h3>

                {renderBusiestHours(data.busiest_hours)}

              </div>

            )}

          </>

        )}

      </div>

    </div>

  );

}

// This is the main chat page component — everything above this point
// was just helper functions and smaller pieces used inside it.
function ChatPageInner() {

  const { confirmDialog, alertDialog } = useDialog();

  const { t, language } = useLanguage();

  const router = useRouter();

  const [user, setUser] = useState(null);

  const [sessions, setSessions] = useState([]);

  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [isTyping, setIsTyping] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);

  const [showBugReport, setShowBugReport] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [fontSize, setFontSize] = useState(15);

  useEffect(() => {

    // Setting the root font-size scales everything relative to it:
    // Tailwind's rem-based classes (text-xs, text-sm, etc.) AND our
    // own em-based inline fontSize values throughout the app, all in
    // one place, instead of needing to touch every element individually.
    document.documentElement.style.fontSize = `${fontSize}px`;

    return () => {

      // Reset to the browser default if this component ever unmounts,
      // so leaving the chat page doesn't leave other pages scaled
      document.documentElement.style.fontSize = "";

    };

  }, [fontSize]);

  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Only keep the sessions that match whatever the user typed
  // into the search box.
  const filteredSessions = sessions.filter((s) =>

    (s.title || "New Conversation")

      .toLowerCase()

      .includes(searchQuery.toLowerCase())

  );

  const [isListening, setIsListening] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState([]);

  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {

    const files = Array.from(e.target.files);

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "text/csv"];

    const maxSize = 10 * 1024 * 1024;

    for (const file of files) {

      if (file.size > maxSize) {

        await alertDialog({ title: "File too large", icon: "⚠️", message: `${file.name} is too large. Max 10MB.` });

        continue;

      }

      let fileContent = "";

      let previewUrl = null;

      try {

        if (file.type.startsWith("image/")) {

          // Turn the image into a base64 string so we can show a
          // quick preview of it before sending.

          previewUrl = URL.createObjectURL(file);

          fileContent = `[Image file: ${file.name}]`;

        } else if (file.type === "text/plain" || file.type === "text/csv") {

          // For plain text files we can just read them as-is.

          fileContent = await new Promise((resolve) => {

            const reader = new FileReader();

            reader.onload = (e) => resolve(e.target.result);

            reader.readAsText(file);

          });

        } else if (file.type === "application/pdf") {

          // For PDFs we need to read the raw file first, then try
          // to pull the text out of it below.

          fileContent = await new Promise((resolve) => {

            const reader = new FileReader();

            reader.onload = async (e) => {

              try {

                // Attempt to grab the actual text content from the PDF.
                const text = e.target.result;

                resolve(`[PDF: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]\n${text.substring(0, 3000)}`);

              } catch {

                resolve(`[PDF file: ${file.name}, Size: ${(file.size / 1024).toFixed(1)}KB]`);

              }

            };

            reader.readAsText(file);

          });

        } else {

          fileContent = `[File: ${file.name}, Type: ${file.type}, Size: ${(file.size / 1024).toFixed(1)}KB]`;

        }

        setAttachedFiles((prev) => [

          ...prev,

          {

            name: file.name,

            type: file.type,

            size: file.size,

            content: fileContent,

            previewUrl,

          },

        ]);

      } catch (err) {

        console.error("File read error:", err);

        await alertDialog({ title: "Could not read file", icon: "⚠️", message: `Could not read ${file.name}` });

      }

    }

    e.target.value = "";

  };

  const removeFile = (index) => {

    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));

  };

  const getFileIcon = (file) => {

    if (file.type.startsWith("image/")) return "🖼️";

    if (file.type === "application/pdf") return "📄";

    if (file.type.includes("word")) return "📝";

    if (file.type === "text/csv") return "📊";

    return "📎";

  };

  const formatFileSize = (bytes) => {

    if (bytes < 1024) return bytes + " B";

    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";

  };

  const startVoice = () => {

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {

      alertDialog({ title: "Not supported", icon: "⚠️", message: "Voice input only works in Google Chrome. Please use Chrome." });

      return;

    }

    if (isListening) {

      setIsListening(false);

      return;

    }

    try {

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      const recognition = new SpeechRecognition();

      recognition.lang = "en-US";

      recognition.continuous = false;

      recognition.interimResults = false;

      recognition.maxAlternatives = 1;

      recognition.onstart = () => {

        setIsListening(true);

      };

      recognition.onresult = (event) => {

        const transcript = event.results[0][0].transcript;

        setInput(transcript);

        setIsListening(false);

      };

      recognition.onerror = (event) => {

        setIsListening(false);

        if (event.error === "not-allowed") {

          alertDialog({ title: "Microphone blocked", icon: "🎤", message: "Fix it:\n1. Click 🔒 in address bar\n2. Set Microphone → Allow\n3. Refresh page" });

        } else if (event.error === "no-speech") {

          alertDialog({ title: "No speech detected", icon: "🎤", message: "Please try again and speak clearly." });

        }

      };

      recognition.onend = () => {

        setIsListening(false);

      };

      recognition.start();

    } catch (err) {

      setIsListening(false);

      alertDialog({ title: "Voice error", icon: "⚠️", message: err.message });

    }

  };

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {

    const saved = localStorage.getItem("techmart_dark_mode");

    if (saved === "true") setDarkMode(true);

  }, []);

  const toggleDark = () => {

    setDarkMode((prev) => {

      localStorage.setItem("techmart_dark_mode", String(!prev));

      return !prev;

    });

  };

  const bottomRef = useRef(null);

  const inputRef = useRef(null);

  // Make sure the user is actually logged in before showing this
  // page — if not, send them back to the login screen.
  useEffect(() => {

    if (!authAPI.isLoggedIn()) {

      router.push("/login");

      return;

    }

    authAPI

      .getMe()

      .then(setUser)

      .catch(() => {

        authAPI.logout();

      });

    // Load the user's past chat sessions in the background, but
    // always show the welcome screen first instead of jumping
    // straight into an old conversation.
    sessionsAPI

      .list()

      .then((data) => {

        setSessions(data);

        // We're intentionally not opening any session automatically
        // here — we want the welcome screen to show first.
      })

      .catch(console.error);

  }, []);

  // Keep a copy of the current session in localStorage so we don't
  // lose it if the page gets refreshed.
  useEffect(() => {

    if (currentSessionId) {

      localStorage.setItem("techmart_last_session", currentSessionId);

    }

  }, [currentSessionId]);

  // Whenever a new message comes in, scroll the chat down so the
  // latest message is visible.
  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages, isTyping]);

  // If the user navigates back from the analytics page, refresh
  // the sessions list in case anything changed.
  useEffect(() => {

    if (!showAnalytics) {

      sessionsAPI.list().then(setSessions).catch(console.error);

    }

  }, [showAnalytics]);

  // Fetch the full message history for a given session.
  const loadSession = useCallback(

    async (sessionId) => {

      setCurrentSessionId(sessionId);

      setSidebarOpen(false);

      setShowAnalytics(false);

      try {

        const data = await sessionsAPI.getHistory(sessionId);

        setMessages(data.messages || []);

      } catch {

        setMessages([]);

      }

    },

    []

  );

  const newSession = useCallback(async () => {

    const session = await sessionsAPI.create();

    setSessions((prev) => [session, ...prev]);

    setCurrentSessionId(session.id);

    setMessages([]);

    setShowAnalytics(false);

    setSidebarOpen(false);

    inputRef.current?.focus();

  }, []);

  const deleteSession = useCallback(

    async (sessionId) => {

      await sessionsAPI.delete(sessionId);

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (sessionId === currentSessionId) {

        setCurrentSessionId(null);

        setMessages([]);

      }

    },

    [currentSessionId]

  );

  const sendMessage = useCallback(async () => {

    const text = input.trim();

    if ((!text && attachedFiles.length === 0) || isTyping) return;

    // If the user didn't type anything but did attach files, give
    // the message some default text so it's not sent empty.
    const messageText = text || (attachedFiles.length > 0 ? "Please analyze the attached file(s)." : "");

    if (!messageText) return;

    setInput("");

    const userMsg = {

      id: Date.now(),

      role: "user",

      content: messageText,

    };

    // Put together the full message, including the contents of any
    // attached files, before sending it off.
    let fullMessage = messageText;

    if (attachedFiles.length > 0) {

      const fileContents = attachedFiles.map((f) => `--- File: ${f.name} ---\n${f.content || f.name}`).join("\n\n");

      fullMessage = messageText

        ? `${messageText}\n\nAttached files:\n${fileContents}`

        : `Please analyze these attached files:\n\n${fileContents}`;

    }

    setAttachedFiles([]); // clear after send

    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);

    try {

      // Only send an explicit language override for non-English UI
      // languages — for English, leave it null so the backend's
      // existing auto-detect-from-message behavior is unaffected
      const languageOverride = language === "en-US" || language === "en-GB" ? null : LANGUAGE_NAMES[language];

      const res = await chatAPI.sendMessage(fullMessage, currentSessionId, languageOverride);

      if (!currentSessionId) {

        setCurrentSessionId(res.session_id);

      }

      // Update the session's title right away in the sidebar so it
      // feels instant, instead of waiting on the server response.
      const updatedSessions = await sessionsAPI.list();

      setSessions(updatedSessions);

      // Same idea, but for the session we're currently viewing.
      if (res.session_id) {

        setSessions((prev) =>

          prev.map((s) =>

            s.id === res.session_id

              ? {

                  ...s,

                  title: updatedSessions.find((u) => u.id === res.session_id)?.title || s.title,

                }

              : s

          )

        );

      }

      const aiMsg = {

        id: res.message_id,

        role: "assistant",

        content: res.response,

        agent: res.agent,

        intent: res.intent,

        sentiment: res.sentiment,

        sentiment_score: res.sentiment_score,

        response_time_ms: res.response_time_ms,

        timestamp: res.timestamp,

      };

      setMessages((prev) => [...prev, aiMsg]);

    } catch (err) {

      const isTimeout =

        err.message.includes("timed out") ||

        err.message.includes("timeout") ||

        err.message.includes("aborted") ||

        err.message.includes("abort");

      const errorMsg = isTimeout

        ? "⏳ AI is still thinking... Please wait 30 seconds and try again. (First response is slow on free server)"

        : err.message.includes("Failed to fetch")

          ? "🔌 Connection error. Backend may be waking up — wait 60 seconds and retry."

          : `Something went wrong: ${err.message}. Please try again.`;

      setMessages((prev) => [

        ...prev,

        {

          id: Date.now(),

          role: "assistant",

          content: `⚠️ ${errorMsg}`,

          agent: "general",

          timestamp: new Date().toISOString()

        },
        
      ]);
      
    } finally {
      
      setIsTyping(false);
      
    }

  }, [input, currentSessionId, isTyping]);

  const handleKeyDown = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault();

      sendMessage();

    }

  };

  const QUICK_QUESTIONS = [

    t("suggestionReturnPolicy"),

    t("suggestionLaptopWontTurnOn"),

    t("suggestionUltraBook"),

    t("suggestionCancelSubscription"),

    t("suggestionTrackOrder"),

    t("suggestionCarePricing"),

  ];

  if (!user)

    return (

      <div className = "flex items-center justify-center h-screen">

        <div className = "text-[var(--tm-text-faint)] text-sm">Loading...</div>

      </div>

    );

  return (

    <>

      <Head>

        <title>TechMart AI Support</title>

        <meta name = "description" content = "TechMart Electronics Multi-Agent AI Customer Support" />

        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "anonymous" />

        <link href = "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap" rel = "stylesheet" />

        <link href = "https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap" rel = "stylesheet" />

      </Head>

      {/* Scoped to this page only — styled-jsx removes these rules from
          the document as soon as the user navigates away from /chat. */}
      <style jsx global>{`

        body {

          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

        }

      `}</style>

      <div className = {`chat-layout ${darkMode ? "dark-mode" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

        {/* Mobile overlay */}
        {sidebarOpen && <div className = "fixed inset-0 bg-black/50 z-40 md:hidden" onClick = {() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <Sidebar

          sessions = {sessions}

          currentSessionId = {currentSessionId}

          onSelectSession = {loadSession}

          onNewSession = {newSession}

          onDeleteSession = {deleteSession}

          user = {user}

          darkMode = {darkMode}

          onShowAnalytics = {() => {

            setShowAnalytics(true);

            setSidebarOpen(false);

          }}

          sidebarOpen = {sidebarOpen}

          searchQuery = {searchQuery}

          setSearchQuery = {setSearchQuery}

          filteredSessions = {filteredSessions}

          onDeleteAll = {async () => {

            setSessions([]);

            setCurrentSessionId(null);

            setMessages([]);

          }}

          onArchiveAll = {async () => {

            setSessions([]);

            setCurrentSessionId(null);

            setMessages([]);

          }}

          onRestoreSession = {(session) => {

            setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);

          }}

          onArchiveSession = {(sessionId) => {

            setSessions((prev) => prev.filter((s) => s.id !== sessionId));

            if (sessionId === currentSessionId) {

              setCurrentSessionId(null);

              setMessages([]);

            }

          }}

          onUnarchiveAll = {async () => {

            const data = await sessionsAPI.list();

            setSessions(data);

          }}

          onRestoreAll = {async () => {

            const data = await sessionsAPI.list();

            setSessions(data);

          }}

          onOpenBugReport = {() => setShowBugReport(true)}

        />

        {/* Main Content */}
        <main className = "chat-main">

          {/* Top Bar */}
          <header className = "flex items-center gap-3 px-4 py-3 bg-white" style = {{ borderBottom: "2px solid var(--tm-border-light)" }}>

            {/* Sidebar toggle — works on all screen sizes */}
            <button

              className = "icon-btn flex-shrink-0"

              onClick = {() => setSidebarCollapsed((prev) => !prev)}

              title = {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}

            >

              <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                <rect x = "3" y = "4" width = "18" height = "16" rx = "2" />

                <line x1 = "9" y1 = "4" x2 = "9" y2 = "20" />

              </svg>

            </button>

            <div className = "flex-1 min-w-0">

              <div

                className = "font-semibold text-[var(--tm-text-strong)] truncate"

                style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

              >

                {showAnalytics

                  ? "Analytics Dashboard"

                  : sessions.find((s) => s.id === currentSessionId)?.title || (currentSessionId ? "Loading..." : "TechMart AI Support")}

              </div>

              <div className = "text-xs text-[var(--tm-text-faint)]">{showAnalytics ? t("last30Days") : t("poweredByMultiAgentRAG")}</div>

            </div>

            {currentSessionId && !showAnalytics && (

              <button

                className = "icon-tooltip-btn tooltip-rate"

                onClick = {() => setShowFeedback(true)}

                data-tooltip = {t("rateThisConversation")}

              >

                <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                  <polygon points = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />

                </svg>

              </button>

            )}

            {currentSessionId && !showAnalytics && messages.length > 0 && (

              <button

                className = "icon-tooltip-btn tooltip-export"

                onClick = {() => {

                  const title = sessions.find((s) => s.id === currentSessionId)?.title || "conversation";

                  const content = messages

                    .map((m) => `[${m.role.toUpperCase()}] ${new Date(m.timestamp).toLocaleTimeString()}\n${m.content}`)

                    .join("\n\n---\n\n");

                  const blob = new Blob([`TechMart AI Support\n${title}\n${"=".repeat(50)}\n\n${content}`], { type: "text/plain" });

                  const url = URL.createObjectURL(blob);

                  const a = document.createElement("a");

                  a.href = url;

                  a.download = `${title.slice(0, 30)}.txt`;

                  a.click();

                  URL.revokeObjectURL(url);

                }}

                data-tooltip = {t("exportConversation")}

              >

                <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                  <path d = "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />

                  <polyline points = "7 10 12 15 17 10" />

                  <line x1 = "12" y1 = "15" x2 = "12" y2 = "3" />

                </svg>

              </button>

            )}

            {/* Human Agent Escalation Button */}
            {currentSessionId && !showAnalytics && (

              <button

                className = "icon-tooltip-btn tooltip-escalate"

                onClick = {async () => {

                  const confirmed = await confirmDialog({

                    title: "Escalate to a human agent?",

                    message: "A TechMart specialist will contact you within 2 business hours.",

                    confirmLabel: "Escalate",

                  });

                  if (confirmed) {

                    try {

                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

                      const token = localStorage.getItem("techmart_token");

                      const res = await fetch(

                        `${apiUrl}/escalate?session_id=${currentSessionId}`,

                        {

                          method: "POST",

                          headers: { Authorization: `Bearer ${token}` },

                        }

                      );

                      const data = await res.json();

                      const history = await sessionsAPI.getHistory(currentSessionId);

                      setMessages(history.messages || []);

                      await alertDialog({

                        title: "Escalated successfully",

                        icon: "✅",

                        message: `Reference: ${data.reference}\n\nA human agent will contact you at your registered email within 2 business hours.\n\nOr call: 1-800-TECHMART`,

                      });

                    } catch (err) {

                      await alertDialog({ title: "Escalation failed", icon: "⚠️", message: "Please call 1-800-TECHMART directly." });

                    }

                  }

                }}

                data-tooltip = "Escalate to human agent"

              >

                <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "1.75" strokeLinecap = "round" strokeLinejoin = "round">

                  <path d = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />

                  <circle cx = "9" cy = "7" r = "4" />

                  <path d = "M23 21v-2a4 4 0 0 0-3-3.87" />

                  <path d = "M16 3.13a4 4 0 0 1 0 7.75" />

                </svg>

              </button>

            )}

            {/* Font size controls */}
            <div style = {{ display: "flex", alignItems: "center", gap: 2, border: "1.5px solid var(--tm-border-light)", borderRadius: 8, padding: "2px 4px" }}>

              <button

                onClick = {() => setFontSize((prev) => Math.max(0, prev - 1))}

                className = "icon-btn"

                style = {{ fontSize: "1em", fontWeight: 650, padding: "0 4px", lineHeight: 1 }}

                title = "Decrease font size"

              >
                A-

              </button>

              <span style = {{ fontSize: "0.667em", color: "var(--tm-text-faint)", minWidth: 24, textAlign: "center" }}>

                {fontSize}px

              </span>

              <button

                onClick = {() => setFontSize((prev) => Math.min(20, prev + 1))}

                className = "icon-btn"

                style = {{ fontSize: "1em", fontWeight: 650, padding: "0 4px", lineHeight: 1 }}

                title = "Increase font size"

              >
                A+

              </button>

            </div>

            {/* Dark mode toggle */}
            <button

              onClick = {toggleDark}

              className = "icon-tooltip-btn"

              data-tooltip = {t("toggleDarkMode")}

            >

              {darkMode ? (

                /* Sun icon */
                <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <circle cx = "12" cy = "12" r = "5" />

                  <line x1 = "12" y1 = "1" x2 = "12" y2 = "3" />

                  <line x1 = "12" y1 = "21" x2 = "12" y2 = "23" />

                  <line x1 = "4.22" y1 = "4.22" x2 = "5.64" y2 = "5.64" />

                  <line x1 = "18.36" y1 = "18.36" x2 = "19.78" y2 = "19.78" />

                  <line x1 = "1" y1 = "12" x2 = "3" y2 = "12" />

                  <line x1 = "21" y1 = "12" x2 = "23" y2 = "12" />

                  <line x1 = "4.22" y1 = "19.78" x2 = "5.64" y2 = "18.36" />

                  <line x1 = "18.36" y1 = "5.64" x2 = "19.78" y2 = "4.22" />

                </svg>

              ) : (

                /* Moon icon */

                <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                  <path d = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />

                </svg>

              )}

            </button>

          </header>

          {/* Analytics or Chat */}
          {showAnalytics ? (

            <AnalyticsPanel

              onClose = {async () => {

                setShowAnalytics(false);

                // Same as above — refresh the sessions list if we're
                // coming back from the analytics page.
                try {

                  const data = await sessionsAPI.list();

                  setSessions(data);

                } catch (e) {

                  console.error(e);

                }

              }}

            />

          ) : (

            <>

              {/* Messages Area */}
              <div className = "flex-1 overflow-y-auto px-4 py-6">

                {messages.length === 0 && (

                  <div className = "flex flex-col items-center justify-center h-full text-center fade-in">

                    <div className = "avatar-mark inline-flex w-16 h-16 rounded-2xl text-2xl mb-4 shadow-sm">

                      T

                    </div>

                    <h2

                      className = "text-xl font-semibold text-[var(--tm-text-strong)] mb-2"

                      style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

                    >

                      {t("welcomeTitle")}

                    </h2>

                    <p

                      className = "text-sm text-[var(--tm-text-muted)] mb-6 max-w-sm"

                      style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

                    >

                      {t("welcomeSubtitle")}

                    </p>

                    <div className = "grid grid-cols-2 gap-2 max-w-md w-full">

                      {QUICK_QUESTIONS.map((q) => (

                        <button

                          key = {q}

                          className = "quick-question-btn text-left text-sm bg-white border border-[var(--tm-border-light)] rounded-xl px-4 py-3 text-[var(--tm-text-slate)]"

                          style = {{ fontFamily: "'Lora', Georgia, 'Times New Roman', serif" }}

                          onClick = {() => {

                            setInput(q);

                            inputRef.current?.focus();

                          }}

                        >

                          {q}

                        </button>

                      ))}

                    </div>

                  </div>

                )}

                <div className = "max-w-3xl mx-auto">

                  {messages.map((msg) => (

                    <MessageBubble key = {msg.id} message = {msg} />

                  ))}

                  {isTyping && <TypingIndicator />}

                  <div ref = {bottomRef} />

                </div>

              </div>

              {/* Input Area */}
              <div className = "px-4 py-4 bg-white">

                {/* File Attachments Preview */}
                {attachedFiles.length > 0 && (

                  <div className = "max-w-3xl mx-auto mb-3">

                    <div className = "flex flex-wrap gap-2 p-3 bg-[var(--techmart-gray-100)] rounded-xl border border-[var(--tm-border-light)]">

                      {attachedFiles.map((file, index) => (

                        <div key = {index} className = "flex items-center gap-2 bg-white border border-[var(--tm-border-light)] rounded-lg px-3 py-2 group">

                          {file.type.startsWith("image/") ? (

                            <img src = {URL.createObjectURL(file)} alt = {file.name} className = "w-8 h-8 object-cover rounded" />

                          ) : (

                            <span className = "text-lg">{getFileIcon(file)}</span>

                          )}

                          <div className = "min-w-0">

                            <div className = "text-xs font-medium text-[var(--tm-text-slate)] truncate max-w-[120px]">{file.name}</div>

                            <div className = "text-[10px] text-[var(--tm-text-faint)]">{formatFileSize(file.size)}</div>

                          </div>

                          <button

                            onClick = {() => removeFile(index)}

                            className = "icon-btn icon-btn-danger ml-1"

                            title = "Remove file"

                          >

                            <svg width = "12" height = "12" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5">

                              <line x1 = "18" y1 = "6" x2 = "6" y2 = "18" />

                              <line x1 = "6" y1 = "6" x2 = "18" y2 = "18" />

                            </svg>

                          </button>

                        </div>

                      ))}

                      <div className = "text-xs text-[var(--tm-text-faint)] self-center">

                        {attachedFiles.length} file

                        {attachedFiles.length > 1 ? "s" : ""} attached

                      </div>

                    </div>

                  </div>

                )}

                <div className = "max-w-3xl mx-auto flex items-end gap-3">

                  <textarea

                    ref = {inputRef}

                    className = "chat-input"

                    rows = {1}

                    placeholder = {t("typeYourMessage")}

                    value = {input}

                    onChange = {(e) => {

                      setInput(e.target.value);

                      e.target.style.height = "auto";

                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";

                    }}

                    onKeyDown = {handleKeyDown}

                    style = {{ maxHeight: "120px", overflowY: "auto" }}

                  />

                  {/* File upload button */}
                  <input

                    ref = {fileInputRef}

                    type = "file"

                    multiple

                    accept = "image/*,.pdf,.txt,.csv,.doc,.docx"

                    onChange = {handleFileSelect}

                    className = "hidden"

                  />

                  <button

                    className = "w-11 h-11 rounded-xl border border-[var(--tm-border-light)] hover:bg-[var(--techmart-blue-light)] hover:border-[var(--techmart-blue)] text-[var(--tm-text-faint)] hover:text-[var(--techmart-blue)] flex items-center justify-center flex-shrink-0 transition-all relative"

                    onClick = {() => fileInputRef.current?.click()}

                    title = "Attach files (images, PDF, documents)"

                  >

                    <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                      <path d = "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />

                    </svg>

                    {attachedFiles.length > 0 && (

                      <span className = "absolute -top-1 -right-1 bg-[var(--techmart-blue)] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">

                        {attachedFiles.length}

                      </span>

                    )}

                  </button>

                  {/* Voice input button */}
                  <button

                    className = {`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all ${

                      isListening

                        ? "bg-[var(--tm-danger)] text-white border-[var(--tm-danger)] voice-listening"

                        : "border-[var(--tm-border-light)] hover:bg-[var(--techmart-blue-light)] hover:border-[var(--techmart-blue)] text-[var(--tm-text-faint)] hover:text-[var(--techmart-blue)]"

                    }`}

                    onClick = {startVoice}

                    title = {isListening ? "Listening... click to stop" : "Click to use voice input"}

                  >

                    {isListening ? (

                      /* Stop / recording icon */
                      <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "currentColor">

                        <rect x = "6" y = "6" width = "12" height = "12" rx = "2" />

                      </svg>

                    ) : (

                      /* Microphone icon */
                      <svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round">

                        <path d = "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />

                        <path d = "M19 10v2a7 7 0 0 1-14 0v-2" />

                        <line x1 = "12" y1 = "19" x2 = "12" y2 = "23" />

                        <line x1 = "8" y1 = "23" x2 = "16" y2 = "23" />

                      </svg>

                    )}

                  </button>

                  <button

                    className = "btn-send"

                    onClick = {sendMessage}

                    disabled = {(!input.trim() && attachedFiles.length === 0) || isTyping}

                    title = "Send message"

                  >

                    <svg width = "18" height = "18" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" strokeLinejoin = "round">

                      <line x1 = "22" y1 = "2" x2 = "11" y2 = "13" />

                      <polygon points = "22 2 15 22 11 13 2 9 22 2" />

                    </svg>

                  </button>

                </div>

                <p className = "text-center text-xs text-[var(--tm-text-faint)] mt-2">{t("footerTagline")}</p>

              </div>

            </>

          )}

        </main>

      </div>

      {/* Feedback Modal */}
      {showFeedback && <FeedbackModal sessionId = {currentSessionId} onClose = {() => setShowFeedback(false)} />}

      {showBugReport && <BugReportModal onClose = {() => setShowBugReport(false)} />}

    </>

  );

}

export default function ChatPage() {

  return (

    <DialogProvider>

      <ChatPageInner />

    </DialogProvider>

  );

}