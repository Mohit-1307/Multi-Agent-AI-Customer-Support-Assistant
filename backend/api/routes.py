"""
TechMart AI Support — API Routes

Defines every HTTP endpoint the frontend talks to: auth, chat sessions,
the main chat endpoint, feedback, analytics, admin knowledge-base
management, support tickets, escalation, and notification status checks.
"""

import logging
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..agents.llm_client import get_llm_client
from ..agents.router import get_router
from ..api.auth import (

    create_access_token,

    create_email_verification_token,

    generate_otp_code,

    generate_reset_token,

    get_admin_user,

    get_current_user,

    hash_otp_code,

    hash_password,

    hash_reset_token,

    verify_email_verification_token,

    verify_otp_code,

    verify_password,

)
from ..config import settings
from ..database.db import (BugReport, ChatSession, Feedback, KnowledgeBaseDoc, Message, OTPCode, PasswordResetToken, SupportTicket, User, get_db)
from ..models.schemas import (AnalyticsResponse, AgentStat, BugReportOut, BugReportRequest, ChatRequest, ChatResponse, DocContentOut, DocOut, EmailVerifiedResponse, FeedbackRequest, FeedbackOut, ForgotPasswordRequest, GenericMessageResponse,
                                GoogleAuthRequest, IntentStat, KBDocOut, KBRebuildResponse, LoginRequest, MessageOut, OTPSentResponse, RegisterRequest, ResetPasswordRequest, SendOTPRequest,
                                SentimentStat, SessionDetailOut, SessionOut, SuccessResponse, SummaryResponse, TokenResponse, TranslateRequest, TranslateResponse, UpdatePhoneRequest, UserOut, VerifyOTPRequest)

from ..rag.retriever import get_retriever

from .email_service import (

    send_escalation_emails,

    send_ticket_created_email,

    send_feedback_thank_you,

    send_otp_email,

    send_password_reset_email,

    send_email,

    is_email_configured,

)

from .whatsapp_service import (

    send_escalation_whatsapp,

    send_ticket_whatsapp,

    is_whatsapp_configured,

)

logger = logging.getLogger(__name__)

router = APIRouter()


# ------------------------------------------------------------------
# Simple in-memory rate limiter
# ------------------------------------------------------------------
# Keyed by user ID, holds a list of timestamps for recent messages.
# NOTE: this resets whenever the server restarts, and won't work
# correctly across multiple server processes — fine for a single-instance
# deployment, but wouldn't scale to a multi-worker/multi-server setup.
_message_counts = defaultdict(list)

# Keyed by email, holds the UTC timestamp of the last OTP request — used to
# enforce settings.OTP_RESEND_COOLDOWN_SECONDS between requests for the same address
_otp_last_sent = {}

# Keyed by email, holds the UTC timestamp of the last password-reset
# email sent — enforces settings.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS
_reset_last_sent = {}


def check_rate_limit(user_id: str, max_messages: int = 20, window_minutes: int = 1) -> bool:
    
    "Returns True if the user is allowed to send another message, False if they've hit the rate limit for the current time window."

    now = datetime.utcnow()

    window_start = now - timedelta(minutes = window_minutes)

    # Drop any timestamps older than the current window before counting
    _message_counts[user_id] = [t for t in _message_counts[user_id] if t > window_start]

    if len(_message_counts[user_id]) >= max_messages:

        return False

    _message_counts[user_id].append(now)

    return True


# ------------------------------------------------------------------
#  AUTH
# ------------------------------------------------------------------
@router.post("/auth/register", response_model = TokenResponse, tags = ["Auth"])
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    
    "Register a new user account with email + password. Requires an otp_token proving this email was just confirmed via /auth/verify-otp."

    # Validates the token's signature/expiry AND that it was issued for this
    # exact email — without this, anyone could register an account using an
    # email address they don't actually control.
    verify_email_verification_token(payload.otp_token, payload.email)

    if db.query(User).filter(User.email == payload.email).first():

        raise HTTPException(status_code = 400, detail = "Email already registered")

    user = User(

        name = payload.name,

        email = payload.email,

        password_hash = hash_password(payload.password),

        phone = payload.phone,

        auth_provider = "password",

        is_verified = True

    )

    db.add(user)

    db.commit()

    db.refresh(user)

    token = create_access_token({"sub": user.id})

    return TokenResponse(access_token = token, user = UserOut.model_validate(user))


@router.post("/auth/login", response_model = TokenResponse, tags = ["Auth"])
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    
    "Login with email and password, returns a JWT access token."

    user = db.query(User).filter(User.email == payload.email).first()

    # user.password_hash can be None for accounts created via Google Sign-In —
    # verify_password would error on a None hash, so check that case explicitly first
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):

        if user and not user.password_hash:

            raise HTTPException(

                status_code = 401,

                detail = "This account uses Google Sign-In. Please log in with Google, or use 'Sign in with a code' to set a password."

            )

        raise HTTPException(status_code = 401, detail = "Invalid email or password")

    token = create_access_token({"sub": user.id})

    return TokenResponse(access_token = token, user = UserOut.model_validate(user))


@router.post("/auth/google", response_model = TokenResponse, tags = ["Auth"])
async def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):

    "Login or register using a Google Sign-In ID token from the frontend."

    if not settings.GOOGLE_CLIENT_ID:

        raise HTTPException(status_code = 500, detail = "Google Sign-In is not configured on the server.")

    try:

        # Verifies the token's signature, expiry, and audience against Google's
        # public keys — raises ValueError if the token is invalid or tampered with
        idinfo = google_id_token.verify_oauth2_token(

            payload.id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID

        )

    except ValueError as e:

        raise HTTPException(status_code = 401, detail = "Invalid Google token") from e

    google_sub = idinfo.get("sub")

    email = idinfo.get("email")

    email_verified = idinfo.get("email_verified", False)

    name = idinfo.get("name") or (email.split("@")[0] if email else "TechMart User")

    if not google_sub or not email:

        raise HTTPException(status_code = 401, detail = "Google token missing required fields")

    if not email_verified:

        raise HTTPException(status_code = 401, detail = "Google account email is not verified")

    # Look up first by Google ID (returning user), then by email (existing
    # password/OTP account linking a Google identity for the first time)
    user = db.query(User).filter(User.google_id == google_sub).first()

    if not user:

        user = db.query(User).filter(User.email == email).first()

        if user:

            # Link the Google identity to the existing account
            user.google_id = google_sub

            user.is_verified = True

        else:

            user = User(

                name = name,

                email = email,

                password_hash = None,

                google_id = google_sub,

                auth_provider = "google",

                is_verified = True

            )

            db.add(user)

    db.commit()

    db.refresh(user)

    token = create_access_token({"sub": user.id})

    return TokenResponse(access_token = token, user = UserOut.model_validate(user))


@router.post("/auth/send-otp", response_model = OTPSentResponse, tags = ["Auth"])
async def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):

    "Email a one-time passcode for logging in or registering with this address."

    if not is_email_configured():

        raise HTTPException(status_code = 500, detail = "Email delivery is not configured on the server.")

    now = datetime.utcnow()

    last_sent = _otp_last_sent.get(payload.email)

    if last_sent and (now - last_sent).total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:

        wait_for = int(settings.OTP_RESEND_COOLDOWN_SECONDS - (now - last_sent).total_seconds())

        raise HTTPException(status_code = 429, detail = f"Please wait {wait_for}s before requesting another code.")

    # Invalidate any still-outstanding codes for this email so only the newest one works
    db.query(OTPCode).filter(OTPCode.email == payload.email, OTPCode.is_used == False).update({"is_used": True})

    code = generate_otp_code()

    otp_row = OTPCode(

        email = payload.email,

        code_hash = hash_otp_code(code),

        expires_at = now + timedelta(minutes = settings.OTP_EXPIRE_MINUTES)

    )

    db.add(otp_row)

    db.commit()

    sent = send_otp_email(payload.email, code, settings.OTP_EXPIRE_MINUTES)

    if not sent:

        raise HTTPException(status_code = 502, detail = "Failed to send verification email. Please try again.")

    _otp_last_sent[payload.email] = now

    return OTPSentResponse(message = f"Verification code sent to {payload.email}", expires_in_minutes = settings.OTP_EXPIRE_MINUTES)


@router.post("/auth/verify-otp", tags = ["Auth"])
async def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):

    """
    Verify a one-time passcode.

    intent="login": logs in an existing account, or auto-registers a new
    passwordless account if none exists yet (returns TokenResponse).

    intent="register": only confirms the person controls this email address
    — does NOT create an account. Returns a short-lived otp_token the
    frontend must pass to /auth/register along with a chosen password to
    actually create the account (returns EmailVerifiedResponse).
    """

    otp_row = (

        db.query(OTPCode)

        .filter(OTPCode.email == payload.email, OTPCode.is_used == False)

        .order_by(OTPCode.created_at.desc())

        .first()

    )

    if not otp_row:

        raise HTTPException(status_code = 400, detail = "No active code for this email. Please request a new one.")

    if datetime.utcnow() > otp_row.expires_at:

        raise HTTPException(status_code = 400, detail = "This code has expired. Please request a new one.")

    if otp_row.attempts >= settings.OTP_MAX_ATTEMPTS:

        raise HTTPException(status_code = 400, detail = "Too many incorrect attempts. Please request a new code.")

    if not verify_otp_code(payload.code, otp_row.code_hash):

        otp_row.attempts += 1

        db.commit()

        raise HTTPException(status_code = 400, detail = "Incorrect code. Please try again.")

    otp_row.is_used = True

    db.commit()

    if payload.intent == "register":

        # Ownership of the email is now proven, but no account exists yet —
        # hand back a narrow, short-lived token for the follow-up /auth/register call
        if db.query(User).filter(User.email == payload.email).first():

            raise HTTPException(status_code = 400, detail = "Email already registered. Please log in instead.")

        return EmailVerifiedResponse(

            message = "Email verified. You can now set a password to finish creating your account.",

            email = payload.email,

            otp_token = create_email_verification_token(payload.email)

        )

    # intent == "login" — existing OTP-only login/auto-register behavior
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:

        user = User(

            name = payload.name or payload.email.split("@")[0],

            email = payload.email,

            password_hash = None,

            auth_provider = "otp",

            is_verified = True

        )

        db.add(user)

    else:

        user.is_verified = True

    db.commit()

    db.refresh(user)

    token = create_access_token({"sub": user.id})

    return TokenResponse(access_token = token, user = UserOut.model_validate(user))


@router.get("/auth/me", response_model = UserOut, tags = ["Auth"])
async def get_me(current_user: User = Depends(get_current_user)):
    
    "Return the currently logged-in user's profile."

    return current_user


@router.patch("/auth/phone", response_model = UserOut, tags = ["Auth"])
async def update_phone(payload: UpdatePhoneRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    "Set or update the logged-in user's phone number — used for WhatsApp notifications. Optional; pass null to clear it."

    current_user.phone = payload.phone

    db.commit()

    db.refresh(current_user)

    return current_user


@router.post("/auth/forgot-password", response_model = GenericMessageResponse, tags = ["Auth"])
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):

    """
    Request a password reset link by email.

    Always returns the same generic success message whether or not an
    account exists for this email — this prevents the endpoint being
    used to check which emails have accounts (email enumeration).
    """

    generic_response = GenericMessageResponse(

        message = "If an account exists for this email, a password reset link has been sent."

    )

    if not is_email_configured():

        # Still return the generic message — don't leak server config
        # state to the caller, but log it so it's visible to the operator
        logger.error("Password reset requested but email is not configured on the server.")

        return generic_response

    user = db.query(User).filter(User.email == payload.email).first()

    if not user:

        return generic_response

    now = datetime.utcnow()

    last_sent = _reset_last_sent.get(payload.email)

    if last_sent and (now - last_sent).total_seconds() < settings.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS:

        # Still return the generic success message so this can't be used
        # to distinguish "no account" from "you're on cooldown"
        return generic_response

    # Invalidate any still-outstanding reset tokens for this email
    db.query(PasswordResetToken).filter(PasswordResetToken.email == payload.email, PasswordResetToken.is_used == False).update({"is_used": True})

    raw_token = generate_reset_token()

    reset_row = PasswordResetToken(

        email = payload.email,

        token_hash = hash_reset_token(raw_token),

        expires_at = now + timedelta(minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    )

    db.add(reset_row)

    db.commit()

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"

    sent = send_password_reset_email(payload.email, reset_url, settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    if sent:

        _reset_last_sent[payload.email] = now

    else:

        logger.error(f"Failed to send password reset email to {payload.email}")

    return generic_response


@router.post("/auth/reset-password", response_model = GenericMessageResponse, tags = ["Auth"])
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):

    "Reset a password using the token from the emailed reset link."

    token_hash = hash_reset_token(payload.token)

    reset_row = db.query(PasswordResetToken).filter(

        PasswordResetToken.token_hash == token_hash,

        PasswordResetToken.is_used == False

    ).first()

    if not reset_row:

        raise HTTPException(status_code = 400, detail = "This reset link is invalid or has already been used. Please request a new one.")

    if datetime.utcnow() > reset_row.expires_at:

        raise HTTPException(status_code = 400, detail = "This reset link has expired. Please request a new one.")

    user = db.query(User).filter(User.email == reset_row.email).first()

    if not user:

        raise HTTPException(status_code = 400, detail = "This reset link is no longer valid.")

    user.password_hash = hash_password(payload.new_password)

    # A user resetting a password via email has, by definition, just
    # proven they control that inbox — mark it verified too, same as
    # the OTP-registration flow does.
    user.is_verified = True

    reset_row.is_used = True

    db.commit()

    return GenericMessageResponse(message = "Your password has been reset. You can now log in with your new password.")


@router.post("/translate", response_model = TranslateResponse, tags = ["Chat"])
async def translate_texts(payload: TranslateRequest, current_user: User = Depends(get_current_user)):

    """
    Translate a batch of short strings (typically chat session titles)
    into the given target language. Used by the frontend when the user
    switches the UI language, so their existing chat titles read
    naturally in the new language instead of staying in whatever
    language they were originally generated in.
    """

    if not payload.texts:

        return TranslateResponse(translations = [])

    llm = get_llm_client()

    # Numbered list in, numbered list out — keeps the LLM's output in
    # the same order as the input even for short/ambiguous strings,
    # which a plain newline-joined list can lose track of.
    numbered_input = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(payload.texts))

    system_prompt = (

        f"You are a translation engine. Translate each numbered line into {payload.target_language}. "

        f"Return ONLY the translated lines, each on its own line, in the exact same numbered format "

        f"(e.g. '1. translated text'). Do not add any explanation, preamble, or extra text. "

        f"Keep product names and brand names (like 'TechMart', 'UltraBook Pro 15') untranslated. "

        f"If a line is already in {payload.target_language}, return it unchanged."

    )

    try:

        raw_response = await llm.chat(

            messages = [{"role": "user", "content": numbered_input}],

            system = system_prompt

        )

        # Parse "N. text" lines back into a plain list, keyed by their
        # original position — falls back to the original text for any
        # line the model dropped or reordered unexpectedly
        translated_by_index = {}

        for line in raw_response.strip().split("\n"):

            line = line.strip()

            if not line:

                continue

            match = re.match(r"^(\d+)\.\s*(.*)$", line)

            if match:

                idx = int(match.group(1)) - 1

                translated_by_index[idx] = match.group(2).strip()

        translations = [

            translated_by_index.get(i, payload.texts[i]) for i in range(len(payload.texts))

        ]

        return TranslateResponse(translations = translations)

    except Exception as e:

        logger.error(f"Translation failed: {e}")

        # Fail soft — return the original text untranslated rather than
        # erroring out and breaking the chat list
        return TranslateResponse(translations = payload.texts)


# ------------------------------------------------------------------
#  DOCUMENTATION
#
# Serves the plain-text versions of the same files used to build the
# RAG knowledge base (backend/../knowledge_base/*.txt), so logged-in
# users can read the underlying policies/guides directly in-app
# instead of only getting AI-summarized answers about them.
# ------------------------------------------------------------------

# id -> (filename, title, description). Order here is the display order.
_DOC_CATALOG = [

    ("faq", "faq.txt", "Frequently Asked Questions", "Common questions about orders, accounts, and support."),

    ("products", "products.txt", "Product Catalog", "Full lineup of TechMart Electronics products and specs."),

    ("pricing", "pricing.txt", "Pricing & Subscription Plans", "Current pricing for products, plans, and TechMart Care."),

    ("shipping_policy", "shipping_policy.txt", "Shipping Policy", "Delivery timelines, carriers, and shipping costs."),

    ("refund_policy", "refund_policy.txt", "Refund & Return Policy", "How returns, refunds, and exchanges work."),

    ("warranty", "warranty.txt", "Warranty Policy", "What's covered, for how long, and how to make a claim."),

    ("installation_guide", "installation_guide.txt", "Installation Guide & Troubleshooting", "Setup steps and fixes for common issues."),

    ("user_manual", "user_manual.txt", "User Manual & Maintenance Guide", "Day-to-day usage and maintenance instructions."),

]

_DOC_CATALOG_BY_ID = {doc_id: (filename, title, description) for doc_id, filename, title, description in _DOC_CATALOG}


@router.get("/docs", response_model = List[DocOut], tags = ["Documentation"])
async def list_docs(_: User = Depends(get_current_user)):

    "List all in-app documentation pages available to read."

    return [

        DocOut(id = doc_id, title = title, description = description)

        for doc_id, _filename, title, description in _DOC_CATALOG

    ]


@router.get("/docs/{doc_id}", response_model = DocContentOut, tags = ["Documentation"])
async def get_doc(doc_id: str, _: User = Depends(get_current_user)):

    "Get the full text content of a single documentation page."

    entry = _DOC_CATALOG_BY_ID.get(doc_id)

    if not entry:

        raise HTTPException(status_code = 404, detail = "Documentation page not found.")

    filename, title, _description = entry

    file_path = settings.KNOWLEDGE_BASE_DIR / filename

    if not file_path.exists():

        raise HTTPException(status_code = 404, detail = "This documentation page's content file is missing on the server.")

    content = file_path.read_text(encoding = "utf-8", errors = "replace")

    return DocContentOut(id = doc_id, title = title, content = content)


# ------------------------------------------------------------------
#  BUG REPORTS
# ------------------------------------------------------------------
@router.post("/bug-reports", response_model = BugReportOut, tags = ["Support"])
async def submit_bug_report(payload: BugReportRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    "Submit a bug report from the Get Help menu."

    report = BugReport(

        user_id = current_user.id,

        title = payload.title,

        description = payload.description,

        steps_to_reproduce = payload.steps_to_reproduce,

        page_url = payload.page_url,

    )

    db.add(report)

    db.commit()

    db.refresh(report)

    # Best-effort email notification to the support team — a failed
    # notification shouldn't fail the actual bug report submission
    if is_email_configured():

        try:

            support_email = settings.SUPPORT_EMAIL or settings.SMTP_USER

            body_lines = [

                f"New bug report from {current_user.name} ({current_user.email})",

                "",

                f"Title: {payload.title}",

                "",

                f"Description:\n{payload.description}",

            ]

            if payload.steps_to_reproduce:

                body_lines.append(f"\nSteps to reproduce:\n{payload.steps_to_reproduce}")

            if payload.page_url:

                body_lines.append(f"\nPage: {payload.page_url}")

            send_email(support_email, f"[Bug Report] {payload.title}", "\n".join(body_lines))

        except Exception as e:

            logger.error(f"Failed to send bug report notification email: {e}")

    return report


@router.get("/bug-reports", response_model = List[BugReportOut], tags = ["Support"])
async def list_my_bug_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    "List bug reports submitted by the current user."

    return (

        db.query(BugReport)

        .filter(BugReport.user_id == current_user.id)

        .order_by(BugReport.created_at.desc())

        .all()

    )


# ------------------------------------------------------------------
#  SESSIONS
# ------------------------------------------------------------------
@router.get("/sessions", response_model = List[SessionOut], tags = ["Sessions"])
async def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "List all active chat sessions for the current user, most recently updated first."

    sessions = (

        db.query(ChatSession)

        .filter(ChatSession.user_id == current_user.id, ChatSession.is_active == True)

        .order_by(ChatSession.updated_at.desc())

        .all()

    )

    result = []

    for s in sessions:

        # Attach a live message count to each session for display in the sidebar
        msg_count = db.query(Message).filter(Message.session_id == s.id).count()

        out = SessionOut.model_validate(s)

        out.message_count = msg_count

        result.append(out)

    return result


@router.post("/sessions", response_model = SessionOut, tags = ["Sessions"])
async def create_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Create a new, empty chat session for the current user."

    session = ChatSession(user_id = current_user.id)

    db.add(session)

    db.commit()

    db.refresh(session)

    out = SessionOut.model_validate(session)

    out.message_count = 0

    return out


@router.delete("/sessions/{session_id}", tags = ["Sessions"])
async def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Soft-delete a session — marks it inactive/deleted without removing the data."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    session.is_active = False

    session.is_deleted = True

    db.commit()

    return SuccessResponse(message = "Session deleted")


@router.get("/sessions/{session_id}/history", response_model = SessionDetailOut, tags = ["Sessions"])
async def get_session_history(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Get the full message history for a single session."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    return SessionDetailOut.model_validate(session)


# ------------------------------------------------------------------
#  CHAT
# ------------------------------------------------------------------
@router.post("/chat", response_model = ChatResponse, tags = ["Chat"])
async def chat(payload: ChatRequest,current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    
    """
    Main chat endpoint. Routes the user's message through the
    multi-agent system and returns the assistant's reply.
    If session_id is None, a new session is created automatically.
    """

    # Rate limiting — max 20 messages per minute per user
    if not check_rate_limit(current_user.id):

        raise HTTPException(

            status_code = 429,

            detail = "Too many messages. Please wait a moment before sending again."

        )

    # Step 1: Resolve the target session, or create a new one if none was given
    if payload.session_id:

        session = (

            db.query(ChatSession)

            .filter(

                ChatSession.id == payload.session_id,

                ChatSession.user_id == current_user.id,

            )

            .first()

        )

        if not session:

            raise HTTPException(status_code = 404, detail = "Session not found")

    else:

        session = ChatSession(user_id = current_user.id)

        db.add(session)

        db.commit()

        db.refresh(session)

    # Step 2: Build the conversation history so the agent has context
    prev_messages = (

        db.query(Message)

        .filter(Message.session_id == session.id)

        .order_by(Message.timestamp)

        .all()

    )

    history = [{"role": m.role, "content": m.content} for m in prev_messages]

    # Step 3: Detect intent/sentiment using the FULL pipeline (keyword baseline,
    # refined by an LLM call when the keyword match is ambiguous), so the stored
    # Message row already has this metadata attached
    start_ms = time.time() * 1000

    router_obj = get_router()

    routing = await router_obj.detect_intent(payload.message)

    user_msg = Message(

        session_id = session.id,

        role = "user",

        content = payload.message,

        agent = "user",

        intent = routing.get("intent", "general"),

        sentiment = routing.get("sentiment", "neutral"),

        sentiment_score = routing.get("sentiment_score", 0.0)

    )

    db.add(user_msg)

    db.commit()

    # Step 4: Route the message through the full agent system to get a reply
    result = await router_obj.route(payload.message, history, preferred_language = payload.language)

    elapsed_ms = time.time() * 1000 - start_ms

    # Step 5: Store the assistant's reply as a new message
    assistant_msg = Message(

        session_id = session.id,

        role = "assistant",

        content = result["response"],

        agent = result["agent"],

        intent = result["intent"],

        sentiment = result["sentiment"],

        sentiment_score = result["sentiment_score"],

        response_time_ms = elapsed_ms,

        context_used = result.get("context_retrieved", False)

    )

    db.add(assistant_msg)

    # Auto-create a support ticket for complaints or frustrated customers,
    # and notify the customer by email/WhatsApp about the new ticket

    if result.get("intent") == "complaint" or result.get("sentiment") in ["frustrated", "negative"]:

        import random

        ticket_number = f"TM-{random.randint(10000, 99999)}"

        priority = "high" if result.get("sentiment") == "frustrated" else "medium"

        ticket = SupportTicket(

            user_id = current_user.id,

            session_id = session.id,

            ticket_number = ticket_number,

            subject = payload.message[:100],

            priority = priority,

            agent = result.get("agent", "complaint")

        )

        db.add(ticket)

        # Send ticket creation email
        send_ticket_created_email(

            customer_name = current_user.name,

            customer_email = current_user.email,

            ticket_number = ticket_number,

            subject = payload.message[:80],

            priority = priority

        )

        # Send WhatsApp notification, only if the user has a phone number on file
        if current_user.phone and is_whatsapp_configured():

            send_ticket_whatsapp(

                customer_name = current_user.name,

                customer_phone = current_user.phone,

                ticket_number = ticket_number,

                priority = priority

            )

    # Step 6: Update session metadata (timestamp, and title if this is the first message)
    session.updated_at = datetime.utcnow()

    if len(prev_messages) == 0:

        # Smart title generation — pick a title based on message language and detected intent
        msg = payload.message.strip()

        # Check whether the message contains non-ASCII characters (Hindi, Arabic, Chinese, etc.)
        has_non_ascii = not all(ord(c) < 128 for c in msg)

        if has_non_ascii:

            # Use a pre-translated title based on intent and detected language,
            # since a plain character-slice title wouldn't read naturally in these languages
            intent = result.get("intent", "general")

            hindi_titles = {

                "billing": "बिलिंग सहायता",

                "technical": "तकनीकी सहायता",

                "product": "उत्पाद जानकारी",

                "complaint": "शिकायत",

                "refund": "वापसी अनुरोध",

                "faq": "सामान्य प्रश्न",

                "general": "ग्राहक सहायता"

            }

            spanish_titles = {

                "billing": "Consulta de Facturación",

                "technical": "Soporte Técnico",

                "product": "Información de Producto",

                "complaint": "Queja",

                "refund": "Solicitud de Reembolso",

                "faq": "Pregunta General",

                "general": "Atención al Cliente"

            }

            french_titles = {

                "billing": "Facturation",

                "technical": "Support Technique",

                "product": "Info Produit",

                "complaint": "Réclamation",

                "refund": "Remboursement",

                "faq": "Question Générale",

                "general": "Service Client"

            }

            # Detect which language's title map to use, based on character/keyword hints
            if any("\u0900" <= c <= "\u097f" for c in msg):

                title_map = hindi_titles

            elif any(w in msg.lower() for w in ["hola", "como", "gracias", "política", "necesito"]):

                title_map = spanish_titles

            elif any(w in msg.lower() for w in ["bonjour", "merci", "politique", "besoin"]):

                title_map = french_titles

            else:

                # Non-ASCII but not one of the languages above — fall back to English titles
                title_map = {

                    "billing": "Billing Support",

                    "technical": "Technical Support",

                    "product": "Product Inquiry",

                    "complaint": "Complaint",

                    "refund": "Refund Request",

                    "faq": "General FAQ",

                    "general": "Support Query"

                }

            session.title = title_map.get(intent, "Customer Support")

        else:

            # Plain English (or other ASCII) message — just use the first 50 characters
            session.title = msg[:50] + ("..." if len(msg) > 50 else "")

    db.commit()

    db.refresh(assistant_msg)

    return ChatResponse(

        session_id = session.id,

        message_id = assistant_msg.id,

        response = result["response"],

        agent = result["agent"],

        intent = result["intent"],

        sentiment = result["sentiment"],

        sentiment_score = result["sentiment_score"],

        response_time_ms = elapsed_ms,

        context_retrieved = result.get("context_retrieved", False),

        timestamp = assistant_msg.timestamp

    )


# ------------------------------------------------------------------
#  CONVERSATION SUMMARY  (Optional/Bonus Feature)
# ------------------------------------------------------------------
@router.get("/sessions/{session_id}/summary", response_model = SummaryResponse, tags = ["Chat"])
async def get_session_summary(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Generate (or return a cached) AI summary of a conversation session."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    # Return the cached summary if one was already generated, to avoid an extra LLM call
    if session.summary:

        return SummaryResponse(session_id = session_id, summary = session.summary)

    messages = (

        db.query(Message)

        .filter(Message.session_id == session_id)

        .order_by(Message.timestamp)

        .all()

    )

    if not messages:

        return SummaryResponse(

            session_id = session_id, summary = "No messages in this session."

        )

    # Format the whole conversation as plain text for the summarization prompt
    convo_text = "\n".join(f"{m.role.upper()}: {m.content}" for m in messages)

    prompt = (

        f"Summarize this customer support conversation in 2–3 sentences. "

        f"Include: the customer's main issue, how it was resolved, and any follow-up actions needed.\n\n"

        f"Conversation:\n{convo_text[:3000]}"

    )

    llm = get_llm_client()

    summary = await llm.complete(prompt, max_tokens = 200)

    # Cache the summary on the session so we don't regenerate it next time
    session.summary = summary

    db.commit()

    return SummaryResponse(session_id = session_id, summary = summary)


# ------------------------------------------------------------------
#  FEEDBACK  (Optional/Bonus Feature)
# ------------------------------------------------------------------
@router.post("/feedback", response_model = FeedbackOut, tags = ["Feedback"])
async def submit_feedback(payload: FeedbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Submit a 1-5 star rating (and optional comment) for a conversation."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == payload.session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    feedback = Feedback(

        session_id = payload.session_id,

        user_id = current_user.id,

        message_id = payload.message_id,

        rating = payload.rating,

        comment = payload.comment,

    )

    db.add(feedback)

    db.commit()

    db.refresh(feedback)

    # Send a thank-you email for the feedback (best-effort, doesn't block the response)
    send_feedback_thank_you(

        customer_name = current_user.name,

        customer_email = current_user.email,

        rating = payload.rating,

    )

    return FeedbackOut.model_validate(feedback)


# ------------------------------------------------------------------
#  ANALYTICS DASHBOARD  (Optional/Bonus Feature)
# ------------------------------------------------------------------
@router.get("/analytics", response_model = AnalyticsResponse, tags = ["Analytics"])
async def get_analytics(

    days: int = 30,

    start_date: Optional[str] = None,

    end_date: Optional[str] = None,

    current_user: User = Depends(get_current_user),

    db: Session = Depends(get_db)

):
    
    """
    Return usage analytics: totals, average rating/response time, and
    breakdowns by agent, intent, and sentiment. Admins see data for all
    users; regular users only see their own.

    Date range: pass either `days` (a rolling window ending now, e.g.
    days=7/30/90 — the default), or both `start_date` and `end_date`
    (ISO format "YYYY-MM-DD") for a custom range. When both are given,
    start_date/end_date take priority over days.
    """

    if start_date and end_date:

        try:

            since = datetime.strptime(start_date, "%Y-%m-%d")

            # Include the entire end day, not just midnight at its start
            until = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days = 1) - timedelta(seconds = 1)

        except ValueError:

            raise HTTPException(status_code = 400, detail = "start_date and end_date must be in YYYY-MM-DD format.")

        if since > until:

            raise HTTPException(status_code = 400, detail = "start_date must be before end_date.")

    else:

        since = datetime.utcnow() - timedelta(days = days)

        until = datetime.utcnow()

    if current_user.is_admin:

        session_q = db.query(ChatSession)

        message_q = db.query(Message)

        feedback_q = db.query(Feedback)

    else:

        # Non-admins only see analytics scoped to their own sessions
        user_session_ids = [

            s.id

            for s in db.query(ChatSession.id)

            .filter(ChatSession.user_id == current_user.id)

            .all()

        ]

        session_q = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)

        message_q = db.query(Message).filter(Message.session_id.in_(user_session_ids))

        feedback_q = db.query(Feedback).filter(Feedback.user_id == current_user.id)

    total_conversations = session_q.filter(ChatSession.created_at >= since, ChatSession.created_at <= until).count()

    total_messages = message_q.filter(Message.timestamp >= since, Message.timestamp <= until).count()

    # Average feedback rating across the scoped set
    avg_rating = feedback_q.with_entities(func.avg(Feedback.rating)).scalar() or 0.0

    # Average assistant response time, in milliseconds
    avg_rt = (

        message_q.filter(Message.role == "assistant", Message.timestamp >= since, Message.timestamp <= until)

        .with_entities(func.avg(Message.response_time_ms))

        .scalar()

    ) or 0.0

    # Break down assistant messages by which agent handled them
    agent_rows = (

        message_q.filter(Message.role == "assistant", Message.timestamp >= since, Message.timestamp <= until)

        .with_entities(Message.agent, func.count(Message.agent))

        .group_by(Message.agent)

        .all()

    )

    total_agent_msgs = sum(r[1] for r in agent_rows) or 1

    agent_dist = [

        AgentStat(

            agent = r[0] or "general",

            count = r[1],

            percentage = round(r[1] / total_agent_msgs * 100, 1),

        )

        for r in agent_rows

    ]

    # Break down assistant messages by detected intent
    intent_rows = (

        message_q.filter(Message.role == "assistant", Message.timestamp >= since, Message.timestamp <= until)

        .with_entities(Message.intent, func.count(Message.intent))

        .group_by(Message.intent)

        .all()

    )

    intent_dist = [

        IntentStat(intent = r[0] or "general", count = r[1]) for r in intent_rows

    ]

    # Break down user messages by sentiment — queried one sentiment at a time
    sentiment_dist = []

    for sent in ["neutral", "positive", "negative", "frustrated"]:

        cnt = message_q.filter(

            Message.role == "user",

            Message.sentiment == sent,

            Message.timestamp >= since,

            Message.timestamp <= until,

        ).count()

        if cnt > 0:

            sentiment_dist.append(SentimentStat(sentiment = sent, count = cnt))

    # Daily conversation counts across the FULL selected range (not a
    # hardcoded 7 days) — capped at 90 days of daily buckets so a
    # multi-year custom range doesn't return thousands of near-empty points
    daily = defaultdict(int)

    range_span_days = (until - since).days + 1

    trend_start = since if range_span_days <= 90 else until - timedelta(days = 90)

    recent_sessions = session_q.filter(

        ChatSession.created_at >= trend_start,

        ChatSession.created_at <= until,

    ).all()

    for s in recent_sessions:

        day_key = s.created_at.strftime("%Y-%m-%d")

        daily[day_key] += 1

    daily_conversations = [{"date": k, "count": v} for k, v in sorted(daily.items())]

    # Resolution rate: percentage of conversations in range that were
    # NOT escalated to a human agent. A conversation counts as
    # "escalated" if any support ticket was ever created for it,
    # regardless of the ticket's current status.
    resolution_rate = None

    if total_conversations > 0:

        escalated_session_ids = {

            row[0]

            for row in db.query(SupportTicket.session_id)

            .join(ChatSession, SupportTicket.session_id == ChatSession.id)

            .filter(

                ChatSession.created_at >= since,

                ChatSession.created_at <= until,

                *([ChatSession.user_id == current_user.id] if not current_user.is_admin else []),

            )

            .distinct()

            .all()

        }

        resolution_rate = round((1 - len(escalated_session_ids) / total_conversations) * 100, 1)

    # Busiest hours: count of user messages per hour-of-day (0-23),
    # across the full selected range — reveals when people actually
    # reach out. Timestamps are stored in UTC throughout the app, but
    # "busiest hours" is only meaningful in the timezone people actually
    # message from — fixed to IST (UTC+5:30) here rather than the
    # server's UTC, so e.g. a message sent at 8:30am IST shows up under
    # 8am, not 3am.
    IST_OFFSET = timedelta(hours = 5, minutes = 30)

    hourly = defaultdict(int)

    user_message_timestamps = (

        message_q.filter(

            Message.role == "user",

            Message.timestamp >= since,

            Message.timestamp <= until,

        )

        .with_entities(Message.timestamp)

        .all()

    )

    for (ts,) in user_message_timestamps:

        local_ts = ts + IST_OFFSET

        hourly[local_ts.hour] += 1

    busiest_hours = [{"hour": h, "count": hourly.get(h, 0)} for h in range(24)]

    return AnalyticsResponse(

        total_conversations = total_conversations,

        total_messages = total_messages,

        average_rating = round(float(avg_rating), 2),

        avg_response_time_ms = round(float(avg_rt), 1),

        agent_distribution = agent_dist,

        intent_distribution = intent_dist,

        sentiment_distribution = sentiment_dist,

        daily_conversations = daily_conversations,

        resolution_rate = resolution_rate,

        busiest_hours = busiest_hours,

    )


# ------------------------------------------------------------------
#  ADMIN — Knowledge Base Management  (Optional/Bonus Feature)
# ------------------------------------------------------------------
@router.get("/admin/knowledge-base", response_model = List[KBDocOut], tags = ["Admin"])
async def list_kb_docs(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    
    "List all indexed knowledge base documents (admin only)."

    return db.query(KnowledgeBaseDoc).all()


@router.post("/admin/knowledge-base/rebuild", response_model = KBRebuildResponse, tags = ["Admin"])
async def rebuild_knowledge_base(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    
    "Rebuild the FAISS vector index from the knowledge base files (admin only)."

    retriever = get_retriever()

    result = retriever.build_index(force_rebuild = True)

    if result.get("status") == "error":

        raise HTTPException(status_code = 500, detail = "Failed to rebuild index")

    # Replace the tracked document records with the freshly rebuilt stats
    db.query(KnowledgeBaseDoc).delete()

    for filename, stats in result.get("file_stats", {}).items():

        doc = KnowledgeBaseDoc(

            filename = filename,

            chunk_count = stats["chunks"],

            file_size_bytes = stats["file_size_bytes"]

        )

        db.add(doc)

    db.commit()

    return KBRebuildResponse(

        message = "Knowledge base rebuilt successfully",

        documents_indexed = len(result.get("file_stats", {})),

        total_chunks = result.get("chunks", 0)

    )


@router.post("/admin/knowledge-base/upload", tags = ["Admin"])
async def upload_kb_document(file: UploadFile = File(...), _: User = Depends(get_admin_user)):
    
    """
    Upload a new .txt document to the knowledge base (admin only).
    Note: this only saves the file — the index must be rebuilt separately
    via /admin/knowledge-base/rebuild before the new content is searchable.
    """

    if not file.filename.endswith(".txt"):

        raise HTTPException(status_code = 400, detail = "Only .txt files are supported")

    save_path = settings.KNOWLEDGE_BASE_DIR / file.filename

    content = await file.read()

    save_path.write_bytes(content)

    return SuccessResponse(

        message = f"File '{file.filename}' uploaded. Run /admin/knowledge-base/rebuild to index.",

    )


# ------------------------------------------------------------------
#  TICKETS & ESCALATION
#  (NOTE: preserved as-is — the original source labeled this section
#  "HEALTH CHECK", which doesn't match the routes below; the actual
#  health check endpoint is the unlabeled one at the bottom of this file.
#  Comment corrected here since it's just a heading, not logic.)
# ------------------------------------------------------------------
@router.post("/tickets/create", tags = ["Tickets"])
async def create_ticket(session_id: str, subject: str, priority: str = "medium", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Manually create a support ticket."

    import random

    ticket_number = f"TM-{random.randint(10000, 99999)}"

    ticket = SupportTicket(

        user_id = current_user.id,

        session_id = session_id,

        ticket_number = ticket_number,

        subject = subject,

        priority = priority

    )

    db.add(ticket)

    db.commit()

    db.refresh(ticket)

    return {

        "ticket_number": ticket_number,

        "status": "open",

        "message": f"Ticket {ticket_number} created. Our team will contact you within 2 business hours."

    }


@router.get("/tickets", tags = ["Tickets"])
async def list_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "List all support tickets for the current user, newest first."

    tickets = (

        db.query(SupportTicket)

        .filter(SupportTicket.user_id == current_user.id)

        .order_by(SupportTicket.created_at.desc())

        .all()

    )

    return [

        {

            "ticket_number": t.ticket_number,

            "subject": t.subject,

            "status": t.status,

            "priority": t.priority,

            "agent": t.agent,

            "created_at": t.created_at

        }

        for t in tickets

    ]


@router.post("/escalate", tags = ["Escalation"])
async def escalate_to_human(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Escalate a conversation to a human agent — posts a confirmation message in the chat and sends email/WhatsApp notifications."

    session = (

        db.query(ChatSession)

        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    reference = f"ESC-{session_id[:8].upper()}"

    # Add a visible escalation confirmation message into the chat history
    escalation_msg = Message(

        session_id = session_id,

        role = "assistant",

        content = (

            f"I understand you'd like to speak with a human agent."

            f"Your case has been escalated (Reference: {reference})."

            f"A TechMart support specialist will contact you at"

            f"{current_user.email} within 2 business hours."

            f"You can also call us directly at 1-800-TECHMART."

            f"Thank you for your patience."

        ),

        agent = "escalation",

        intent = "escalation"

    )

    db.add(escalation_msg)

    db.commit()

    # Send confirmation + alert emails (to the customer and the support team)
    email_result = send_escalation_emails(

        customer_name = current_user.name,

        customer_email = current_user.email,

        session_id = session_id,

        session_title = session.title or "Support Query"

    )

    # Send a WhatsApp confirmation too, if the user has a phone number on file
    whatsapp_sent = False

    if current_user.phone and is_whatsapp_configured():

        whatsapp_sent = send_escalation_whatsapp(

            customer_name = current_user.name,

            customer_phone = current_user.phone,

            reference = reference

        )

    return {

        "escalated": True,

        "reference": reference,

        "message": "A human agent will contact you within 2 business hours.",

        "contact_email": current_user.email,

        "email_sent": email_result["customer_email_sent"],

        "whatsapp_sent": whatsapp_sent

    }


@router.get("/email/status", tags = ["Notifications"])
async def email_status(current_user: User = Depends(get_current_user)):
    
    "Check whether email notifications are configured on this server."

    return {

        "email_configured": is_email_configured(),

        "smtp_host": settings.SMTP_HOST if is_email_configured() else None,

        "support_email": (

            settings.SUPPORT_EMAIL or settings.SMTP_USER

            if is_email_configured()

            else None

        )

    }


@router.get("/whatsapp/status", tags = ["Notifications"])
async def whatsapp_status(current_user: User = Depends(get_current_user)):
    
    "Check whether WhatsApp notifications are configured, and whether the current user has a phone number on file to receive them."

    return {

        "whatsapp_configured": is_whatsapp_configured(),

        "user_phone": current_user.phone or "Not set",

        "note": "Add phone number during registration for WhatsApp notifications"

    }


@router.delete("/sessions", tags = ["Sessions"])
async def delete_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Soft-delete every active session belonging to the current user."

    db.query(ChatSession).filter(

        ChatSession.user_id == current_user.id,

        ChatSession.is_active == True,

    ).update({"is_active": False, "is_deleted": True})

    db.commit()

    return SuccessResponse(message = "All conversations deleted")


@router.post("/sessions/{session_id}/archive", tags = ["Sessions"])
async def archive_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Archive a single session (marks it inactive but not deleted)."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    session.is_active = False

    session.is_deleted = False

    db.commit()

    return SuccessResponse(message = "Conversation archived")


@router.post("/sessions/archive-all", tags = ["Sessions"])
async def archive_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Archive every active session belonging to the current user."

    db.query(ChatSession).filter(

        ChatSession.user_id == current_user.id,

        ChatSession.is_active == True,

    ).update({"is_active": False})

    db.commit()

    return SuccessResponse(message = "All conversations archived")


@router.get("/sessions/archived", response_model = List[SessionOut], tags = ["Sessions"])
async def list_archived_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "List all archived (inactive, not deleted) sessions for the current user."

    sessions = (

        db.query(ChatSession)

        .filter(

            ChatSession.user_id == current_user.id,

            ChatSession.is_active == False,

            ChatSession.is_deleted == False,

        )

        .order_by(ChatSession.updated_at.desc())

        .all()

    )

    result = []

    for s in sessions:

        msg_count = db.query(Message).filter(Message.session_id == s.id).count()

        out = SessionOut.model_validate(s)

        out.message_count = msg_count

        result.append(out)

    return result


@router.get("/sessions/deleted", response_model = List[SessionOut], tags = ["Sessions"])
async def list_deleted_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "List recently soft-deleted sessions for the current user."

    sessions = (

        db.query(ChatSession)

        .filter(

            ChatSession.user_id == current_user.id,

            ChatSession.is_deleted == True,

        )

        .order_by(ChatSession.updated_at.desc())

        .all()

    )

    result = []

    for s in sessions:

        msg_count = db.query(Message).filter(Message.session_id == s.id).count()

        out = SessionOut.model_validate(s)

        out.message_count = msg_count

        result.append(out)

    return result


@router.post("/sessions/{session_id}/restore", tags = ["Sessions"])
async def restore_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Restore an archived or soft-deleted session back to active."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    session.is_active = True

    session.is_deleted = False

    db.commit()

    return SuccessResponse(message = "Conversation restored")


@router.delete("/sessions/{session_id}/permanent", tags = ["Sessions"])
async def delete_session_permanent(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Permanently delete a session and all of its messages/feedback. Unlike delete_session above, this cannot be undone."

    session = (

        db.query(ChatSession)

        .filter(

            ChatSession.id == session_id,

            ChatSession.user_id == current_user.id,

        )

        .first()

    )

    if not session:

        raise HTTPException(status_code = 404, detail = "Session not found")

    # Delete dependent rows first to avoid foreign-key constraint errors
    db.query(Message).filter(Message.session_id == session_id).delete()

    db.query(Feedback).filter(Feedback.session_id == session_id).delete()

    db.query(SupportTicket).filter(SupportTicket.session_id == session_id).delete()

    db.delete(session)
    
    db.commit()

    return SuccessResponse(message = "Conversation permanently deleted")


@router.delete("/auth/account", tags = ["Auth"])
async def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Permanently delete the current user's account and all associated data (sessions, messages, feedback, tickets). This cannot be undone."

    user_id = current_user.id

    # Delete all messages/feedback/tickets tied to each of the user's sessions
    user_sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()

    for session in user_sessions:

        db.query(Message).filter(Message.session_id == session.id).delete()

        db.query(Feedback).filter(Feedback.session_id == session.id).delete()

        db.query(SupportTicket).filter(SupportTicket.session_id == session.id).delete()

    # Delete all the user's sessions themselves
    db.query(ChatSession).filter(ChatSession.user_id == user_id).delete()

    # Delete any remaining feedback tied directly to the user
    db.query(Feedback).filter(Feedback.user_id == user_id).delete()

    # Delete any remaining tickets tied directly to the user
    db.query(SupportTicket).filter(SupportTicket.user_id == user_id).delete()

    # Finally, delete the user account itself
    db.query(User).filter(User.id == user_id).delete()

    db.commit()

    return SuccessResponse(message = "Account permanently deleted")


@router.post("/auth/reset-history", tags = ["Auth"])
async def reset_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Wipe all chat/analytics data for the user but keep the account itself (unlike delete_account, this doesn't remove the user's login credentials)."

    user_id = current_user.id

    user_sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()

    for session in user_sessions:

        db.query(Message).filter(Message.session_id == session.id).delete()

        db.query(Feedback).filter(Feedback.session_id == session.id).delete()

        db.query(SupportTicket).filter(SupportTicket.session_id == session.id).delete()

    db.query(ChatSession).filter(ChatSession.user_id == user_id).delete()

    db.query(Feedback).filter(Feedback.user_id == user_id).delete()

    db.query(SupportTicket).filter(SupportTicket.user_id == user_id).delete()

    db.commit()

    return SuccessResponse(message = "Account history reset. Fresh start!")


@router.post("/sessions/unarchive-all", tags = ["Sessions"])
async def unarchive_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Restore all archived (but not deleted) sessions back to active."

    db.query(ChatSession).filter(

        ChatSession.user_id == current_user.id,

        ChatSession.is_active == False,

        ChatSession.is_deleted == False,

    ).update({"is_active": True})

    db.commit()

    return SuccessResponse(message = "All archived conversations restored")


@router.post("/sessions/restore-all", tags = ["Sessions"])
async def restore_all_deleted_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    "Restore all recently soft-deleted sessions back to active."

    db.query(ChatSession).filter(

        ChatSession.user_id == current_user.id,

        ChatSession.is_deleted == True,

    ).update({"is_active": True, "is_deleted": False})

    db.commit()

    return SuccessResponse(message = "All deleted conversations restored")


@router.api_route("/health", methods = ["GET", "HEAD"], tags = ["System"])
async def health_check():
    
    "Simple health check endpoint — reports app status and whether the RAG knowledge base index is loaded and ready."

    retriever = get_retriever()

    return {

        "status": "ok",

        "app": settings.APP_NAME,

        "version": settings.APP_VERSION,

        "rag_ready": retriever.is_ready,

        "knowledge_chunks": retriever.chunk_count,

        "llm_provider": settings.LLM_PROVIDER

    }