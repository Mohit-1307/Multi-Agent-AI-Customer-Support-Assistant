// TechMart AI Support — API Service Layer
//
// Central place for every call the frontend makes to the backend API.
// Handles auth token storage, request timeouts, and automatic logout
// on an expired session, so individual pages don't have to repeat that logic.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ------------------------------------------------------------------
// Token Management — stores the JWT in localStorage
// ------------------------------------------------------------------

// Reads the stored token, guarding against server-side rendering
// (localStorage doesn't exist outside the browser)
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("techmart_token") : null);

const setToken = (token) => localStorage.setItem("techmart_token", token);

const clearToken = () => localStorage.removeItem("techmart_token");

// ------------------------------------------------------------------
// Base Fetch — wraps the native fetch() with auth headers, a timeout,
// and consistent error handling used by every API call below
// ------------------------------------------------------------------
async function apiFetch(endpoint, options = {}) {

  const token = getToken();

  const headers = {"Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers};

  // AbortController lets us cancel the request if it takes too long
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), 120000);

  try {

    const response = await fetch(`${API_BASE}${endpoint}`, {...options, headers, signal: controller.signal});
    
    clearTimeout(timeout)

    // Token expired or invalid — clear it and send the user back to login
    if (response.status === 401) {clearToken(); if (typeof window !== "undefined") window.location.href = "/login"; throw new Error("Session expired. Please log in again.")}

    const data = await response.json()

    if (!response.ok) {throw new Error(data.detail || data.message || "Request failed")}

    return data

  }
  
  catch (err) {
    
    clearTimeout(timeout)

    // AbortController triggers an AbortError when the 30s timeout fires
    if (err.name === "AbortError") {throw new Error("Request timed out. The AI is taking too long. Please try again.")}
    
    throw err

  };

};

// ------------------------------------------------------------------
// Auth API
// ------------------------------------------------------------------
export const authAPI = {async register(name, email, password, phone = null) {const data = await apiFetch("/auth/register", {method: "POST", body: JSON.stringify({ name, email, password, phone })})

    // Registering also logs the user in, so save the returned token
    setToken(data.access_token);

    return data

  },

  async login(email, password) {const data = await apiFetch("/auth/login", {method: "POST", body: JSON.stringify({ email, password })}); setToken(data.access_token); return data},

  async googleLogin(idToken) {const data = await apiFetch("/auth/google", {method: "POST", body: JSON.stringify({ id_token: idToken })}); setToken(data.access_token); return data},

  async sendOtp(email, name = null) {return apiFetch("/auth/send-otp", {method: "POST", body: JSON.stringify({ email, name })})},

  // intent: "login" (default) logs in / auto-registers a passwordless account.
  // intent: "register" only proves email ownership — returns { otp_token }
  // which must then be passed to completeRegistration() to actually create
  // the account with a chosen password.
  async verifyOtp(email, code, { name = null, intent = "login" } = {}) {

    const data = await apiFetch("/auth/verify-otp", {method: "POST", body: JSON.stringify({ email, code, name, intent })});

    if (intent === "login") setToken(data.access_token);

    return data

  },

  async completeRegistration(name, email, password, otpToken, phone = null) {

    const data = await apiFetch("/auth/register", {method: "POST", body: JSON.stringify({ name, email, password, phone, otp_token: otpToken })});

    setToken(data.access_token);

    return data

  },

  async getMe() {return apiFetch("/auth/me")},

  async updatePhone(phone) {return apiFetch("/auth/phone", { method: "PATCH", body: JSON.stringify({ phone }) })},

  async forgotPassword(email) {return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) })},

  async resetPassword(token, newPassword) {return apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password: newPassword }) })},

  logout() {clearToken(); if (typeof window !== "undefined") window.location.href = "/login"},

  async deleteAccount() {return apiFetch("/auth/account", { method: "DELETE" })},

  async resetHistory() {return apiFetch("/auth/reset-history", { method: "POST" })},

  isLoggedIn() {return !!getToken()} // True if a token is stored, regardless of whether it's still valid —
                                    // an expired token will trigger the 401 handling above on the next request

};

// ------------------------------------------------------------------
// Sessions API
// ------------------------------------------------------------------
export const sessionsAPI = {

  async list() {return apiFetch("/sessions")},

  async create() {return apiFetch("/sessions", { method: "POST" })},

  async delete(sessionId) {return apiFetch(`/sessions/${sessionId}`, { method: "DELETE" })},

  async deleteAll() {return apiFetch("/sessions", { method: "DELETE" })},

  async archive(sessionId) {return apiFetch(`/sessions/${sessionId}/archive`, { method: "POST" })},

  async archiveAll() {return apiFetch("/sessions/archive-all", { method: "POST" });},

  async getHistory(sessionId) {return apiFetch(`/sessions/${sessionId}/history`)},

  async getSummary(sessionId) {return apiFetch(`/sessions/${sessionId}/summary`)},

  async listArchived() {return apiFetch("/sessions/archived")},

  async listDeleted() {return apiFetch("/sessions/deleted")},

  async restore(sessionId) {return apiFetch(`/sessions/${sessionId}/restore`, { method: "POST" })},

  async deletePermanent(sessionId) {return apiFetch(`/sessions/${sessionId}/permanent`, { method: "DELETE" })},

  async unarchiveAll() {return apiFetch("/sessions/unarchive-all", { method: "POST" })},

  async restoreAll() {return apiFetch("/sessions/restore-all", { method: "POST" })}

};

// ------------------------------------------------------------------
// Chat API
// ------------------------------------------------------------------
export const chatAPI = {async sendMessage(message, sessionId = null, language = null) {return apiFetch("/chat", {method: "POST", body: JSON.stringify({ message, session_id: sessionId, language })})}};

// ------------------------------------------------------------------
// Translate API — used to translate stored content (e.g. chat titles)
// into the user's selected UI language, since that content was
// generated once in whatever language it was created in and doesn't
// automatically follow later language switches like static UI text does.
// ------------------------------------------------------------------
export const translateAPI = {async translate(texts, targetLanguage) {return apiFetch("/translate", {method: "POST", body: JSON.stringify({ texts, target_language: targetLanguage })})}};

// ------------------------------------------------------------------
// Feedback API
// ------------------------------------------------------------------
export const feedbackAPI = {
  
  async submit(sessionId, rating, comment = null, messageId = null) 
  
  {return apiFetch("/feedback", {method: "POST", body: JSON.stringify({session_id: sessionId, rating, comment, message_id: messageId})})}

};

// ------------------------------------------------------------------
// Analytics API
// ------------------------------------------------------------------
export const analyticsAPI = {

  async get({ days = 30, startDate = null, endDate = null } = {}) {

    const params = startDate && endDate

      ? `start_date=${startDate}&end_date=${endDate}`

      : `days=${days}`;

    return apiFetch(`/analytics?${params}`);

  },

};

// ------------------------------------------------------------------
// Documentation API
// ------------------------------------------------------------------
export const docsAPI = {

  async list() {return apiFetch("/docs")},

  async get(docId) {return apiFetch(`/docs/${docId}`)},

};

// ------------------------------------------------------------------
// Bug Report API
// ------------------------------------------------------------------
export const bugReportAPI = {

  async submit(title, description, stepsToReproduce = null, pageUrl = null) {

    return apiFetch("/bug-reports", {

      method: "POST",

      body: JSON.stringify({ title, description, steps_to_reproduce: stepsToReproduce, page_url: pageUrl }),

    });

  },

  async listMine() {return apiFetch("/bug-reports")},

};

// ------------------------------------------------------------------
// Admin API
// ------------------------------------------------------------------
export const adminAPI = {

  async listKBDocs() {return apiFetch("/admin/knowledge-base")},

  async rebuildIndex() {return apiFetch("/admin/knowledge-base/rebuild", { method: "POST" })}

};

// ------------------------------------------------------------------
// Health / System API
// ------------------------------------------------------------------
export const systemAPI = {async health() {return apiFetch("/health")}};

export default {authAPI, sessionsAPI, chatAPI, translateAPI, feedbackAPI, analyticsAPI, docsAPI, bugReportAPI, adminAPI, systemAPI};