"""
TechMart AI Support — Pydantic Schemas (request/response models)

These classes define the shape of every JSON payload the API sends
and receives. FastAPI uses them to validate incoming requests and
to automatically generate the /docs API documentation.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# ------------------------------------------------------------------
# Auth
# ------------------------------------------------------------------
class RegisterRequest(BaseModel):
    
    "Payload sent when a new user signs up with a password."

    name: str = Field(..., min_length = 2, max_length = 80)

    email: EmailStr

    password: str = Field(..., min_length = 6)

    phone: Optional[str] = Field(

        None, description = "Phone with country code e.g. +919876543210"

    )

    # Proof this email was just confirmed via OTP — obtained from
    # POST /auth/verify-otp (with intent="register") before this call.
    # Prevents anyone from creating a password account for an email they
    # don't actually control.
    otp_token: str = Field(..., description = "Verification token returned by /auth/verify-otp")


class LoginRequest(BaseModel):
    
    "Payload sent when a user logs in."

    email: EmailStr

    password: str


class UpdatePhoneRequest(BaseModel):

    "Payload sent to set or update the logged-in user's phone number, e.g. after Google sign-in where no phone was collected."

    phone: Optional[str] = Field(

        None, description = "Phone with country code e.g. +919876543210, or null to clear it"

    )


class GoogleAuthRequest(BaseModel):

    "Payload sent after the frontend completes Google Sign-In — contains the Google ID token to verify."

    id_token: str = Field(..., description = "The credential/ID token returned by Google Identity Services")


class SendOTPRequest(BaseModel):

    "Payload sent to request a one-time passcode be emailed to an address."

    email: EmailStr

    # Optional name, used only if this OTP ends up creating a brand-new account
    name: Optional[str] = Field(None, min_length = 2, max_length = 80)


class VerifyOTPRequest(BaseModel):

    "Payload sent to verify a one-time passcode and complete login/registration."

    email: EmailStr

    code: str = Field(..., min_length = 4, max_length = 8)

    # Optional name, used only if this OTP ends up creating a brand-new account
    # via the OTP-only login flow (intent="login")
    name: Optional[str] = Field(None, min_length = 2, max_length = 80)

    # "login": verifying logs the user straight in (or auto-registers via OTP-only).
    # "register": verifying only proves email ownership and returns a short-lived
    # token — no account is created yet; the frontend then calls /auth/register
    # with that token plus a chosen password to actually create the account.
    intent: str = Field("login", pattern = "^(login|register)$")


class OTPSentResponse(BaseModel):

    "Returned after successfully queuing an OTP email."

    message: str

    expires_in_minutes: int


class EmailVerifiedResponse(BaseModel):

    "Returned after verify-otp succeeds with intent='register' — email is confirmed but no account exists yet."

    message: str

    email: str

    otp_token: str = Field(..., description = "Pass this to /auth/register to complete account creation")


class ForgotPasswordRequest(BaseModel):

    "Payload sent to request a password reset link be emailed to an address."

    email: EmailStr


class ResetPasswordRequest(BaseModel):

    "Payload sent to actually reset a password using the token from the emailed reset link."

    token: str = Field(..., description = "The raw reset token from the emailed link's URL")

    new_password: str = Field(..., min_length = 6)


class GenericMessageResponse(BaseModel):

    "A plain success message — used for endpoints that don't need to reveal whether an email exists (e.g. forgot-password)."

    message: str


class TranslateRequest(BaseModel):

    "Payload sent to translate a batch of short strings (e.g. chat titles) into a target language."

    texts: List[str] = Field(..., min_length = 1, max_length = 50, description = "Short strings to translate, e.g. chat session titles")

    target_language: str = Field(..., description = "Target language name, e.g. 'Hindi', 'Spanish'")


class TranslateResponse(BaseModel):

    "Returned translations, in the same order as the input texts."

    translations: List[str]


class DocOut(BaseModel):

    "One entry in the public documentation list — metadata only, not the full content."

    id: str

    title: str

    description: str


class DocContentOut(BaseModel):

    "Full content of a single documentation page."

    id: str

    title: str

    content: str


class BugReportRequest(BaseModel):

    "Payload sent when a user submits a bug report from the Get Help menu."

    title: str = Field(..., min_length = 3, max_length = 150)

    description: str = Field(..., min_length = 10, max_length = 3000)

    steps_to_reproduce: Optional[str] = Field(None, max_length = 2000)

    page_url: Optional[str] = Field(None, max_length = 500, description = "The page the user was on when they hit the bug")


class BugReportOut(BaseModel):

    "A submitted bug report, as returned to the user or an admin."

    id: str

    title: str

    description: str

    steps_to_reproduce: Optional[str] = None

    page_url: Optional[str] = None

    status: str

    created_at: datetime

    class Config:

        from_attributes = True


class ScheduledReportRequest(BaseModel):

    "Payload sent to create a recurring analytics email report."

    email: Optional[str] = Field(None, description = "Defaults to the account's own email if not given")

    frequency: str = Field(..., pattern = "^(daily|weekly|monthly)$")


class ScheduledReportOut(BaseModel):

    "A scheduled report, as returned to the user."

    id: str

    email: str

    frequency: str

    is_active: bool

    last_sent_at: Optional[datetime] = None

    created_at: datetime

    class Config:

        from_attributes = True


class TokenResponse(BaseModel):
    
    "Returned after a successful login/registration — contains the JWT token."

    access_token: str

    token_type: str = "bearer"

    user: "UserOut"


class UserOut(BaseModel):
    
    "Public-facing representation of a user (never includes the password hash)."

    id: str

    name: str

    email: str

    phone: Optional[str] = None

    is_admin: bool

    auth_provider: str = "password"

    is_verified: bool = False

    created_at: datetime

    class Config:

        # Allows this schema to be built directly from a SQLAlchemy ORM object
        from_attributes = True


# ------------------------------------------------------------------
# Chat
# ------------------------------------------------------------------
class ChatRequest(BaseModel):
    
    "Payload sent when the user sends a chat message."

    message: str = Field(..., min_length = 1, max_length = 2000)

    session_id: Optional[str] = None  # None means: create a new session

    # The user's selected UI language (e.g. "Hindi", "Spanish"), if any —
    # when provided, the AI replies in this language regardless of what
    # script/language the message itself is written in. When omitted,
    # the reply language is auto-detected from the message text instead.
    language: Optional[str] = None


class AgentInfo(BaseModel):
    
    "Small summary of which agent handled a message and how."

    name: str

    intent: str

    confidence: float

    sentiment: str


class ChatResponse(BaseModel):
    
    "Returned after the assistant generates a reply to a chat message."

    session_id: str

    message_id: str

    response: str

    agent: str

    intent: str

    sentiment: str

    sentiment_score: float

    response_time_ms: float

    context_retrieved: bool

    timestamp: datetime


# ------------------------------------------------------------------
# Session / History
# ------------------------------------------------------------------
class MessageOut(BaseModel):
    
    "A single message as returned to the frontend (part of session history)."

    id: str

    role: str

    content: str

    agent: str

    intent: str

    sentiment: str

    timestamp: datetime

    class Config:

        from_attributes = True


class SessionOut(BaseModel):
    
    "Summary view of a chat session, used in the sidebar session list."

    id: str

    title: str

    summary: Optional[str]

    created_at: datetime

    updated_at: datetime

    message_count: int = 0

    class Config:

        from_attributes = True


class SessionDetailOut(BaseModel):
    
    "Full view of a chat session, including all its messages."

    id: str

    title: str

    summary: Optional[str]

    created_at: datetime

    messages: List[MessageOut]

    class Config:

        from_attributes = True


class SummaryResponse(BaseModel):
    
    "Returned when requesting an AI-generated summary of a session."

    session_id: str

    summary: str


# ------------------------------------------------------------------
# Feedback
# ------------------------------------------------------------------
class FeedbackRequest(BaseModel):
    
    "Payload sent when a user rates a response."

    session_id: str

    message_id: Optional[str] = None

    rating: int = Field(..., ge = 1, le = 5)

    comment: Optional[str] = Field(None, max_length = 500)


class FeedbackOut(BaseModel):
    
    "Feedback record as returned to the frontend."

    id: str

    rating: int

    comment: Optional[str]

    created_at: datetime

    class Config:

        from_attributes = True


# ------------------------------------------------------------------
# Analytics
# ------------------------------------------------------------------
class AgentStat(BaseModel):
    
    "How many messages a given agent handled, and what share of the total."

    agent: str

    count: int

    percentage: float


class IntentStat(BaseModel):
    
    "Count of messages classified under a given intent."

    intent: str

    count: int


class SentimentStat(BaseModel):
    
    "Count of messages classified under a given sentiment."

    sentiment: str

    count: int


class AnalyticsResponse(BaseModel):
    
    "Full analytics dashboard payload."

    total_conversations: int

    total_messages: int

    average_rating: float

    avg_response_time_ms: float

    agent_distribution: List[AgentStat]

    intent_distribution: List[IntentStat]

    sentiment_distribution: List[SentimentStat]

    # Each dict here represents one day's conversation count, e.g. {"date": ..., "count": ...}
    daily_conversations: List[dict]

    # Percentage of conversations that were NOT escalated to a human
    # agent (i.e. resolved by the AI alone) — null when there are no
    # conversations in range, so the frontend can distinguish "0%" from
    # "not enough data yet".
    resolution_rate: Optional[float] = None

    # 24 entries, one per hour (0-23, IST/UTC+5:30), each the count
    # of user messages sent during that hour across the selected range —
    # powers a "busiest hours" chart.
    busiest_hours: List[dict]


# ------------------------------------------------------------------
# Knowledge Base (admin)
# ------------------------------------------------------------------
class KBDocOut(BaseModel):
    
    "A single knowledge-base document as tracked in the database."

    id: str

    filename: str

    chunk_count: int

    file_size_bytes: int

    indexed_at: datetime

    class Config:

        from_attributes = True


class KBRebuildResponse(BaseModel):
    
    "Returned after triggering a knowledge-base index rebuild."

    message: str

    documents_indexed: int

    total_chunks: int


# ------------------------------------------------------------------
# Generic
# ------------------------------------------------------------------
class SuccessResponse(BaseModel):
    
    "Generic success message, used for simple confirmation endpoints."

    message: str

    detail: Optional[str] = None