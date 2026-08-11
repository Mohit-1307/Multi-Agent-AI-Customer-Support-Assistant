"""
TechMart AI Support — Base Agent

All specialized agents (billing, technical, product, etc.) inherit
from this class. It handles the shared logic: retrieving context
from the knowledge base, detecting the customer's language, calling
the LLM, and returning a structured response.
"""

import logging
from typing import List, Optional
from ..config import settings
from ..rag.retriever import FAISSRetriever, RetrievalResult, get_retriever
from .language import detect_language
from .llm_client import LLMClient, get_llm_client

logger = logging.getLogger(__name__)

# Shortcut so we don't have to write settings.COMPANY_NAME everywhere
COMPANY = settings.COMPANY_NAME


class BaseAgent:
    
    """
    Base class for all TechMart specialized agents.

    Each subclass is expected to define:
        - name: display name shown to the user
        - domain: short identifier used in logs and the database
        - relevant_sources: which knowledge-base documents this agent should prioritise
        - role_description: what this particular agent is responsible for
        """

    # Default values — subclasses override these
    name: str = "General Support"

    domain: str = "general"

    relevant_sources: List[str] = []  # empty list = search all knowledge base sources

    def __init__(self):

        # Shared singleton retriever — gives access to the FAISS knowledge base search
        self._retriever: FAISSRetriever = get_retriever()

        # Shared singleton LLM client — wraps whichever provider is configured
        self._llm: LLMClient = get_llm_client()

    # ------------------------------------------------------------------------------------
    # Overridable properties — subclasses customize agent behaviour by overriding these
    # ------------------------------------------------------------------------------------
    @property
    def role_description(self) -> str:
        
        "Short description of this agent's job. Subclasses override this."

        return "Handle general customer inquiries and provide helpful support."

    def build_system_prompt(self, extra: str = "") -> str:
        
        """
        Construct the full system prompt sent to the LLM, including
        the language rule, response guidelines, and company info.

        `extra` lets a subclass append additional agent-specific instructions.
        """

        base = (

            f"You are {self.name}, a specialized AI customer support agent for {COMPANY}.\n\n"

            f"Your role: {self.role_description}\n\n"

            "CRITICAL LANGUAGE RULE — MUST FOLLOW:\n"

            "1. Detect the language of the LAST customer message.\n"

            "2. You MUST respond in the EXACT SAME language.\n"

            "3. If the customer writes in Hindi, respond ONLY in Hindi.\n"

            "4. If the customer writes in Spanish, respond ONLY in Spanish.\n"

            "5. If the customer writes in English, respond ONLY in English.\n"

            "6. NEVER mix languages in a single response.\n"

            "7. This rule overrides everything else.\n\n"

            "GUIDELINES:\n"

            "- Be empathetic, professional, and solution-oriented.\n"

            "- Always base your answers on the provided CONTEXT from our knowledge base.\n"

            "- If the CONTEXT does not contain enough information, say so clearly and offer to escalate.\n"

            "- Do not invent policies, prices, or product details not mentioned in the CONTEXT.\n"

            "- Keep responses concise (3-5 sentences unless the topic requires more detail).\n"

            "- When referencing specific policies or prices, mention the source.\n"

            "- If you cannot resolve the issue, offer: email support@techmartelectronics.com or call 1-800-TECHMART.\n"

            "- End with a friendly close and ask if there is anything else you can help with.\n\n"

            f"Company: {COMPANY}\n"

            "Support Phone: 1-800-TECHMART (1-800-832-4627)\n"

            "Support Email: support@techmartelectronics.com\n"

            "Business Hours: Mon-Fri 8 AM-9 PM EST; Sat-Sun 9 AM-6 PM EST\n"

        )

        # Append any extra agent-specific instructions passed in by a subclass
        if extra:

            base += f"\n\n{extra}"

        return base

    # --------------------------------------------------------------------
    # Main entry point — this is what routes.py calls to get a response
    # --------------------------------------------------------------------
    async def respond(self, user_message: str, conversation_history: Optional[List[dict]] = None, top_k: int = None, preferred_language: Optional[str] = None) -> dict:
        
        """
        Generate a response to the user message.

        preferred_language, if given (e.g. "Hindi", "Spanish"), forces the
        reply into that language regardless of what language the message
        itself is written in — this is how the UI's language selector
        controls AI reply language. When omitted, the reply language is
        auto-detected from the message text instead (the original behavior).

        Returns a dict with keys: response, context_retrieved, sources, agent
        """

        # Use an empty list if no history was passed in
        history = conversation_history or []

        # Step 1: Retrieve relevant context from the knowledge base
        context, sources, retrieved = await self._retrieve_context(user_message, top_k or settings.TOP_K_RESULTS)

        # Step 2: Build the message list (recent history + current message)
        messages = self._build_messages(user_message, history, context, preferred_language)

        # Step 3: Build the system prompt, falling back to a simple default if it fails
        try:

            system = self.build_system_prompt() or ""

        except Exception:

            # If anything goes wrong building the detailed prompt, don't crash —
            # fall back to a minimal but still functional system prompt
            system = ""

        if not system:

            system = (

                f"You are {self.name}, a helpful customer support agent for TechMart Electronics. "

                f"Your role: {self.role_description}. Be professional, empathetic, and helpful. "

                f"Base answers on the knowledge base context provided."

            )

        if preferred_language:

            # The user has an explicit language preference set in the UI —
            # honor that over whatever language the message happens to be
            # written in (e.g. they typed in English but want replies in Hindi).
            lang_hint = preferred_language

            system += (

                f"\n\nCRITICAL LANGUAGE INSTRUCTION:\n"

                f"The customer has selected {lang_hint} as their preferred language.\n"

                f"You MUST respond in {lang_hint} ONLY, regardless of what language "

                f"the customer's message is written in.\n"

                f"Ignore the language of the message text and of previous messages — "

                f"always reply in {lang_hint}."

            )

        else:

            # No explicit preference — detect language from the CURRENT
            # message only, ignoring conversation history, so a reply
            # always matches what the customer just typed
            lang_hint = detect_language(user_message)

            system += (

                f"\n\nCRITICAL LANGUAGE INSTRUCTION:\n"

                f"The customer's CURRENT message language is: {lang_hint}\n"

                f"You MUST respond in {lang_hint} ONLY.\n"

                f"Ignore the language of previous messages in the conversation.\n"

                f"Base your language choice ONLY on the current message above."

            )

        # If we retrieved any knowledge-base context, attach it to the system prompt
        if context:

            system += f"\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n{context}"

        # Step 4: Call the LLM with the assembled messages and system prompt
        response_text = await self._llm.chat(messages = messages, system = system)

        return {

            "response": response_text,

            "context_retrieved": retrieved,

            "sources": sources,

            "agent": self.domain

        }

    # ------------------------------------------------------------------
    # Internal helper methods
    # ------------------------------------------------------------------
    async def _retrieve_context(self, query: str, top_k: int) -> tuple[str, List[str], bool]:
        
        """
        Retrieve relevant chunks from the knowledge base and format them as context text.

        Returns a tuple of (context_string, list_of_sources, was_anything_retrieved)
        """

        # If the FAISS index hasn't been built yet, there's nothing to search
        if not self._retriever.is_ready:

            return "", [], False

        # Prefer this agent's own relevant_sources as the filter, so e.g. the
        # billing agent searches pricing/refund_policy/faq chunks first instead
        # of the whole knowledge base. An empty list (the BaseAgent default)
        # means "no filter — search everything".
        source_filter = self.relevant_sources or None

        results: List[RetrievalResult] = self._retriever.retrieve(query, top_k = top_k, source_filter = source_filter)

        # No matching chunks found
        if not results:

            return "", [], False

        # Turn the raw retrieval results into a single formatted context string
        context = self._retriever.format_context(results)

        # Deduplicate sources using a set, then convert back to a list
        sources = list({r.source for r in results})

        return context, sources, True

    def _build_messages(self, user_message: str, history: List[dict], context: str, preferred_language: Optional[str] = None) -> List[dict]:
        
        "Build the list of chat messages to send to the LLM: a limited window of recent conversation history, plus the current user message."

        messages = []

        # Only include the last few turns to keep the prompt from growing too large
        MAX_HISTORY_TURNS = 3

        for turn in history[-MAX_HISTORY_TURNS:]:

            messages.append({"role": turn["role"], "content": turn["content"]})

        # Add the current message with an explicit language reminder appended,
        # so the LLM sees the language instruction right next to the actual text.
        # preferred_language (the UI's language selector) takes priority over
        # auto-detecting from the message text, same as in respond() above.
        lang = preferred_language or detect_language(user_message)

        messages.append({"role": "user", "content": f"{user_message}\n\n[SYSTEM NOTE: Respond in {lang} only]"})

        return messages

    def __repr__(self):

        return f"<Agent:{self.domain}>"