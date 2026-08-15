import logging
from datetime import datetime
from ..config import settings

logger = logging.getLogger(__name__)

# Brand colors reused across every email template, kept in one place so
# the look stays consistent if the palette ever changes.
BRAND_BLUE = "#0f77ff"
BRAND_DARK = "#0f1533"
BRAND_MUTED = "#5b6472"
BRAND_BORDER = "#e6e9f0"
BRAND_BG = "#f5f7fb"
BRAND_SUCCESS = "#1f9d5c"
BRAND_WARNING = "#c98a1f"
BRAND_DANGER = "#d1372a"


def is_email_configured() -> bool:

    "True if either SendGrid or SMTP credentials are set — either is enough to send email."

    return bool(settings.SENDGRID_API_KEY) or bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def _wrap_html(preheader: str, body_html: str) -> str:

    """
    Wraps template-specific body_html in a consistent branded shell:
    a dark header with the TechMart wordmark, a white content card, and
    a plain footer. preheader is the short hidden summary text some email
    clients show next to the subject line in the inbox list.
    """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:{BRAND_BG}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none; font-size:1px; color:{BRAND_BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG}; padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid {BRAND_BORDER};">

<tr><td style="background:{BRAND_DARK}; padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:36px; height:36px; background:{BRAND_BLUE}; border-radius:10px; text-align:center; vertical-align:middle;">
<span style="color:#ffffff; font-size:18px; font-weight:700; line-height:36px;">T</span>
</td>
<td style="padding-left:12px; vertical-align:middle;">
<span style="color:#ffffff; font-size:16px; font-weight:600;">TechMart Electronics</span><br>
<span style="color:#9aa3b5; font-size:12px;">Customer Support</span>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:32px;">
{body_html}
</td></tr>

<tr><td style="padding:20px 32px; border-top:1px solid {BRAND_BORDER}; background:{BRAND_BG};">
<p style="margin:0; font-size:12px; color:{BRAND_MUTED}; line-height:1.6;">
TechMart Electronics Support Team<br>
Phone: 1-800-TECHMART &nbsp;&middot;&nbsp; Email: <a href="mailto:support@techmartelectronics.com" style="color:{BRAND_BLUE}; text-decoration:none;">support@techmartelectronics.com</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _badge(text: str, color: str) -> str:

    "A small pill-shaped label, e.g. for priority or status."

    return f'<span style="display:inline-block; padding:3px 10px; border-radius:999px; background:{color}1a; color:{color}; font-size:12px; font-weight:600;">{text}</span>'


def _detail_row(label: str, value: str) -> str:

    "One label/value row inside a details table."

    return f"""<tr>
<td style="padding:8px 0; font-size:13px; color:{BRAND_MUTED}; width:120px; vertical-align:top;">{label}</td>
<td style="padding:8px 0; font-size:13px; color:{BRAND_DARK}; font-weight:500;">{value}</td>
</tr>"""


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:

    """
    Sends an email. If html_body is provided, sends a multipart email
    (HTML for clients that render it, plain-text body as the fallback).
    body is always required as the plain-text version.
    """

    try:

        import urllib.request
        import urllib.error
        import json as _json
        import os

        api_key = os.getenv("SENDGRID_API_KEY", "")
        
        if not api_key:
            
            # Fallback to SMTP if no SendGrid key
            return _send_smtp(to_email, subject, body, html_body)

        content = [{"type": "text/plain", "value": body}]

        if html_body:

            content.append({"type": "text/html", "value": html_body})

        # The "from" address for SendGrid must be a verified sender in your
        # SendGrid account. Use SENDGRID_FROM_EMAIL if set, otherwise fall
        # back to SUPPORT_EMAIL, then SMTP_USER — NOT just SMTP_USER alone,
        # since a SendGrid-only setup (no SMTP configured) would otherwise
        # send an empty "from" address and SendGrid would silently reject
        # the whole request.
        from_email = settings.SENDGRID_FROM_EMAIL or settings.SUPPORT_EMAIL or settings.SMTP_USER

        if not from_email:

            logger.error("SendGrid send failed: no from-address configured (set SENDGRID_FROM_EMAIL).")

            return False

        payload = _json.dumps({
            
            "personalizations": [{"to": [{"email": to_email}]}],
            
            "from": {"email": from_email, "name": "TechMart Support"},
            
            "subject": subject,
            
            "content": content
            
        }).encode()

        req = urllib.request.Request(
            
            "https://api.sendgrid.com/v3/mail/send",
            data = payload,

            headers = {

                "Authorization": f"Bearer {api_key}",

                "Content-Type": "application/json"

            },

            method = "POST"

        )

        try:

            with urllib.request.urlopen(req, timeout = 10) as resp:

                logger.info(f"Email sent via SendGrid to {to_email} (status {resp.status})")

                return True

        except urllib.error.HTTPError as e:

            # SendGrid returns a JSON error body explaining exactly what's
            # wrong (bad/unverified from-address, invalid API key, etc).
            # Surfacing that body is the difference between "email send
            # failed" and actually knowing why — without this, every
            # SendGrid rejection just looks like a generic HTTP error.
            error_body = e.read().decode(errors = "replace")

            logger.error(f"SendGrid rejected the email (HTTP {e.code}): {error_body}")

            return False

    except Exception as e:

        logger.error(f"Email send failed: {e}")

        return False


def _send_smtp(to_email: str, subject: str, body: str, html_body: str = None) -> bool:

    import smtplib

    from email.mime.multipart import MIMEMultipart

    from email.mime.text import MIMEText

    try:

        msg = MIMEMultipart("alternative")

        msg["From"] = f"TechMart Support <{settings.SMTP_USER}>"

        msg["To"] = to_email

        msg["Subject"] = subject

        # Attach plain text first, HTML second — email clients render the
        # LAST part they understand, so HTML-capable clients show the
        # HTML version while plain-text-only clients fall back correctly.
        msg.attach(MIMEText(body, "plain"))

        if html_body:

            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT)) as server:

            server.ehlo()

            server.starttls()

            server.ehlo()

            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.send_message(msg)

        logger.info(f"Email sent via SMTP to {to_email}")

        return True

    except Exception as e:

        logger.error(f"SMTP failed: {e}")

        return False


def send_otp_email(to_email: str, code: str, expires_in_minutes: int) -> bool:

    subject = f"Your TechMart verification code is {code}"

    text_body = f"""Your TechMart Electronics verification code is:

{code}

This code expires in {expires_in_minutes} minutes. Don't share it with anyone.

If you didn't request this code, you can safely ignore this email.

TechMart Electronics Support Team"""

    body_html = f"""
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">Use the code below to verify your email address.</p>
<div style="text-align:center; background:{BRAND_BG}; border-radius:12px; padding:24px; margin-bottom:20px;">
<span style="font-size:32px; font-weight:700; letter-spacing:8px; color:{BRAND_DARK};">{code}</span>
</div>
<p style="margin:0; font-size:13px; color:{BRAND_MUTED}; line-height:1.6;">This code expires in {expires_in_minutes} minutes. If you didn't request this code, you can safely ignore this email.</p>
"""

    return send_email(to_email, subject, text_body, _wrap_html(f"Your verification code is {code}", body_html))


def send_password_reset_email(to_email: str, reset_url: str, expires_in_minutes: int) -> bool:

    subject = "Reset your TechMart password"

    text_body = f"""We received a request to reset your TechMart Electronics account password.

Reset your password using this link:
{reset_url}

This link expires in {expires_in_minutes} minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.

TechMart Electronics Support Team"""

    body_html = f"""
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">We received a request to reset the password for your TechMart Electronics account. Click the button below to choose a new password.</p>
<div style="text-align:center; margin-bottom:20px;">
<a href="{reset_url}" style="display:inline-block; background:{BRAND_BLUE}; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">Reset Password</a>
</div>
<p style="margin:0 0 8px; font-size:12px; color:{BRAND_MUTED}; line-height:1.6;">Or copy and paste this link into your browser:</p>
<p style="margin:0 0 20px; font-size:12px; word-break:break-all;"><a href="{reset_url}" style="color:{BRAND_BLUE};">{reset_url}</a></p>
<p style="margin:0; font-size:13px; color:{BRAND_MUTED}; line-height:1.6;">This link expires in {expires_in_minutes} minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
"""

    return send_email(to_email, subject, text_body, _wrap_html("Reset your TechMart password", body_html))


def send_analytics_report_email(to_email: str, frequency: str, period_label: str, stats: dict) -> bool:

    """
    Emails a summary analytics report. stats is the same shape the
    /analytics endpoint returns (as a plain dict): total_conversations,
    total_messages, average_rating, avg_response_time_ms, resolution_rate.
    """

    subject = f"Your {frequency} TechMart analytics report — {period_label}"

    resolution_display = f"{stats.get('resolution_rate')}%" if stats.get("resolution_rate") is not None else "N/A"

    rating_display = f"{stats.get('average_rating'):.1f}" if stats.get("average_rating") else "N/A"

    text_body = f"""Your {frequency} analytics summary for {period_label}:

Total Conversations: {stats.get('total_conversations', 0)}
Total Messages: {stats.get('total_messages', 0)}
Average Rating: {rating_display}
Avg Response Time: {round(stats.get('avg_response_time_ms', 0))}ms
Resolution Rate: {resolution_display}

View the full dashboard in the app for detailed breakdowns.

TechMart Electronics Support Team"""

    body_html = f"""
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">Here's your {frequency} analytics summary for <strong style="color:{BRAND_DARK};">{period_label}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG}; border-radius:12px; padding:16px 20px; margin-bottom:20px;">
{_detail_row("Total Conversations", str(stats.get("total_conversations", 0)))}
{_detail_row("Total Messages", str(stats.get("total_messages", 0)))}
{_detail_row("Average Rating", rating_display)}
{_detail_row("Avg Response Time", f"{round(stats.get('avg_response_time_ms', 0))}ms")}
{_detail_row("Resolution Rate", resolution_display)}
</table>
<p style="margin:0; font-size:13px; color:{BRAND_MUTED}; line-height:1.6;">Open the app and go to Analytics for the full breakdown by agent, intent, and sentiment.</p>
"""

    return send_email(to_email, subject, text_body, _wrap_html(f"Your {frequency} analytics report", body_html))


def send_escalation_emails(customer_name, customer_email, session_id, session_title = "Support Query"):

    reference = f"ESC-{session_id[:8].upper()}"

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # --- Customer-facing email ---
    customer_text = f"""Dear {customer_name},

Your support request has been escalated to a human agent.

Reference: {reference}
Topic: {session_title}
Time: {timestamp}

A TechMart specialist will contact you at {customer_email} within 2 business hours.

Phone: 1-800-TECHMART
Email: support@techmartelectronics.com

Thank you for your patience.

TechMart Electronics Support Team"""

    customer_html = f"""
<p style="margin:0 0 4px; font-size:15px; color:{BRAND_DARK};">Dear {customer_name},</p>
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">Your support request has been escalated to a human agent. A specialist will contact you within 2 business hours.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG}; border-radius:12px; padding:16px 20px;">
{_detail_row("Reference", reference)}
{_detail_row("Topic", session_title)}
{_detail_row("Time", timestamp)}
{_detail_row("Status", _badge("ESCALATED", BRAND_BLUE))}
</table>
"""

    # --- Internal support-team alert ---
    support_email = settings.SUPPORT_EMAIL or settings.SMTP_USER

    support_text = f"""ESCALATION ALERT

Customer: {customer_name}
Email: {customer_email}
Reference: {reference}
Topic: {session_title}
Time: {timestamp}

Contact this customer within 2 business hours."""

    support_html = f"""
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_DANGER}; font-weight:600;">A customer has been escalated to a human agent — response required within 2 business hours.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG}; border-radius:12px; padding:16px 20px;">
{_detail_row("Customer", customer_name)}
{_detail_row("Email", customer_email)}
{_detail_row("Reference", reference)}
{_detail_row("Topic", session_title)}
{_detail_row("Time", timestamp)}
</table>
"""

    customer_sent = send_email(

        customer_email,

        f"[TechMart] Your Case {reference} — Human Agent Requested",

        customer_text,

        _wrap_html(f"Your case {reference} has been escalated", customer_html)

    )
    
    support_sent = send_email(

        support_email,

        f"ESCALATION — {customer_name} [{reference}]",

        support_text,

        _wrap_html(f"Escalation alert for {customer_name}", support_html)

    )

    return {"customer_email_sent": customer_sent, "support_email_sent": support_sent, "reference": reference}


def send_ticket_created_email(customer_name, customer_email, ticket_number, subject, priority):

    priority_color = {"high": BRAND_DANGER, "medium": BRAND_WARNING, "low": BRAND_SUCCESS}.get(priority.lower(), BRAND_MUTED)

    text_body = f"""Dear {customer_name},

A support ticket has been created for your inquiry.

Ticket: {ticket_number}
Subject: {subject[:80]}
Priority: {priority.upper()}
Status: OPEN

Our team will respond based on priority:
HIGH -> Within 2 hours
MEDIUM -> Within 4 hours

Phone: 1-800-TECHMART
Email: support@techmartelectronics.com

TechMart Electronics Support Team"""

    body_html = f"""
<p style="margin:0 0 4px; font-size:15px; color:{BRAND_DARK};">Dear {customer_name},</p>
<p style="margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">A support ticket has been created for your inquiry.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG}; border-radius:12px; padding:16px 20px; margin-bottom:20px;">
{_detail_row("Ticket", ticket_number)}
{_detail_row("Subject", subject[:80])}
{_detail_row("Priority", _badge(priority.upper(), priority_color))}
{_detail_row("Status", _badge("OPEN", BRAND_BLUE))}
</table>
<p style="margin:0; font-size:13px; color:{BRAND_MUTED}; line-height:1.6;">Expected response time: <strong style="color:{BRAND_DARK};">2 hours</strong> for high priority, <strong style="color:{BRAND_DARK};">4 hours</strong> for medium priority.</p>
"""

    return send_email(

        customer_email,

        f"[TechMart] Ticket {ticket_number} Created — {priority.upper()} Priority",

        text_body,

        _wrap_html(f"Your ticket {ticket_number} has been created", body_html)

    )


def send_feedback_thank_you(customer_name, customer_email, rating):

    text_body = f"""Dear {customer_name},

Thank you for rating your experience: {rating}/5

{'We are glad to hear you had a great experience.' if rating >= 4 else 'We appreciate your honest feedback and will use it to improve.'}

TechMart Electronics Support Team"""

    stars_html = "".join(

        f'<span style="color:{BRAND_WARNING if i < rating else BRAND_BORDER}; font-size:22px;">&#9733;</span>' for i in range(5)

    )

    follow_up = (

        "We're glad to hear you had a great experience."

        if rating >= 4

        else "We appreciate your honest feedback and will use it to improve our service."

    )

    body_html = f"""
<p style = "margin:0 0 4px; font-size:15px; color:{BRAND_DARK};">Dear {customer_name},</p>
<p style = "margin:0 0 20px; font-size:14px; color:{BRAND_MUTED}; line-height:1.6;">Thank you for taking the time to rate your experience.</p>
<div style = "text-align:center; margin-bottom:20px;">{stars_html}<br>
<span style = "font-size:13px; color:{BRAND_MUTED};">{rating} out of 5</span>
</div>
<p style = "margin:0; font-size:14px; color:{BRAND_MUTED}; line-height:1.6; text-align:center;">{follow_up}</p>
"""

    return send_email(

        customer_email,

        "[TechMart] Thank You for Your Feedback",

        text_body,

        _wrap_html("Thank you for your feedback", body_html)

    )