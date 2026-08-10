"""
TechMart AI Support — Scheduled Analytics Reports

Runs a background job (via APScheduler, inside this same FastAPI
process — no separate cron service needed) that checks, once an hour,
which ScheduledReport rows are due and emails each one a summary.

"Due" logic:
    daily   -> last_sent_at was more than 24h ago (or never sent)
    weekly  -> last_sent_at was more than 7 days ago (or never sent)
    monthly -> last_sent_at was more than 30 days ago (or never sent)

This is intentionally simple (a rolling window from last send, not a
fixed calendar schedule like "every Monday at 9am") — good enough for
a first version, and avoids needing a more complex cron-expression
scheduler.
"""

import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import func
from .database.db import ChatSession, Feedback, Message, ScheduledReport, SessionLocal, SupportTicket
from .api.email_service import send_analytics_report_email

logger = logging.getLogger(__name__)

FREQUENCY_WINDOWS = {

    "daily": timedelta(hours = 24),

    "weekly": timedelta(days = 7),

    "monthly": timedelta(days = 30),

}


def _compute_summary_stats(db, user_id: str, since: datetime, until: datetime) -> dict:

    """
    A lighter-weight version of the /analytics endpoint's calculations —
    just the handful of headline numbers that go in the email summary,
    scoped to one user's own data (scheduled reports are always sent
    for the report owner's own conversations, admin-wide reports aren't
    part of this feature).
    """

    user_session_ids = [

        s.id for s in db.query(ChatSession.id).filter(ChatSession.user_id == user_id).all()

    ]

    session_q = db.query(ChatSession).filter(ChatSession.user_id == user_id)

    message_q = db.query(Message).filter(Message.session_id.in_(user_session_ids))

    feedback_q = db.query(Feedback).filter(Feedback.user_id == user_id)

    total_conversations = session_q.filter(

        ChatSession.created_at >= since, ChatSession.created_at <= until

    ).count()

    total_messages = message_q.filter(

        Message.timestamp >= since, Message.timestamp <= until

    ).count()

    avg_rating = feedback_q.with_entities(func.avg(Feedback.rating)).scalar() or 0.0

    avg_rt = (

        message_q.filter(Message.role == "assistant", Message.timestamp >= since, Message.timestamp <= until)

        .with_entities(func.avg(Message.response_time_ms))

        .scalar()

    ) or 0.0

    resolution_rate = None

    if total_conversations > 0:

        escalated_session_ids = {

            row[0]

            for row in db.query(SupportTicket.session_id)

            .join(ChatSession, SupportTicket.session_id == ChatSession.id)

            .filter(

                ChatSession.user_id == user_id,

                ChatSession.created_at >= since,

                ChatSession.created_at <= until,

            )

            .distinct()

            .all()

        }

        resolution_rate = round((1 - len(escalated_session_ids) / total_conversations) * 100, 1)

    return {

        "total_conversations": total_conversations,

        "total_messages": total_messages,

        "average_rating": round(float(avg_rating), 2) if avg_rating else None,

        "avg_response_time_ms": round(float(avg_rt), 1),

        "resolution_rate": resolution_rate,

    }


def _send_due_reports():

    "Checks every active ScheduledReport and sends any that are due. Runs on a schedule, not in response to a request, so it opens its own DB session."

    db = SessionLocal()

    try:

        now = datetime.utcnow()

        reports = db.query(ScheduledReport).filter(ScheduledReport.is_active == True).all()

        for report in reports:

            window = FREQUENCY_WINDOWS.get(report.frequency)

            if not window:

                continue

            is_due = report.last_sent_at is None or (now - report.last_sent_at) >= window

            if not is_due:

                continue

            since = now - window

            try:

                stats = _compute_summary_stats(db, report.user_id, since, now)

                period_label = f"{since.strftime('%b %d')} – {now.strftime('%b %d, %Y')}"

                sent = send_analytics_report_email(report.email, report.frequency, period_label, stats)

                if sent:

                    report.last_sent_at = now

                    db.commit()

                else:

                    logger.error(f"Failed to send scheduled report {report.id} to {report.email}")

            except Exception as e:

                logger.error(f"Error processing scheduled report {report.id}: {e}")

    finally:

        db.close()


_scheduler = None


def start_scheduler():

    "Starts the background scheduler. Called once at app startup (see main.py)."

    global _scheduler

    if _scheduler is not None:

        return

    _scheduler = BackgroundScheduler()

    # Checked hourly rather than at each report's exact cadence — cheap
    # to run, and "due" is already a rolling window so an hourly check
    # never delays a report by more than an hour past when it's due.
    _scheduler.add_job(_send_due_reports, "interval", hours = 1, id = "send_due_reports")

    _scheduler.start()

    logger.info("Scheduled reports background job started (checks hourly).")


def stop_scheduler():

    "Stops the background scheduler. Called at app shutdown (see main.py)."

    global _scheduler

    if _scheduler is not None:

        _scheduler.shutdown(wait = False)

        _scheduler = None