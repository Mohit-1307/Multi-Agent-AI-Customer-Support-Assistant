// frontend/pages/documentation.js
//
// In-app documentation viewer. Lists every doc from GET /docs, and
// shows the full text of whichever one is selected via GET /docs/:id.
// Serves the same plain-text files that back the RAG knowledge base,
// so people can read the actual policy/guide text directly instead of
// only getting AI-summarized answers about it.

import { useState, useEffect } from "react";

import { useRouter } from "next/router";

import Head from "next/head";

import { authAPI, docsAPI } from "../services/api";

export default function DocumentationPage() {

  const router = useRouter();

  const [docs, setDocs] = useState([]);

  const [selectedDoc, setSelectedDoc] = useState(null);

  const [content, setContent] = useState("");

  const [loadingList, setLoadingList] = useState(true);

  const [loadingContent, setLoadingContent] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {

    if (!authAPI.isLoggedIn()) {

      router.push("/login");

      return;

    }

    docsAPI

      .list()

      .then((data) => {

        setDocs(data);

        if (data.length > 0) {

          selectDoc(data[0].id);

        }

      })

      .catch((err) => setError(err.message || "Failed to load documentation."))

      .finally(() => setLoadingList(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectDoc = (docId) => {

    setSelectedDoc(docId);

    setLoadingContent(true);

    setError("");

    docsAPI

      .get(docId)

      .then((data) => setContent(data.content))

      .catch((err) => setError(err.message || "Failed to load this page."))

      .finally(() => setLoadingContent(false));

  };

  const currentDoc = docs.find((d) => d.id === selectedDoc);

  return (

    <>

      <Head>

        <title>Documentation — TechMart AI Support</title>

      </Head>

      <div className = "min-h-screen bg-white flex flex-col">

        {/* Top bar */}
        <header className = "flex items-center justify-between px-6 py-4 border-b border-[var(--tm-border-light)]">

          <div className = "flex items-center gap-3">

            <div className = "inline-flex items-center justify-center w-9 h-9 rounded-xl text-base bg-[var(--techmart-blue)] text-white font-semibold">

              T

            </div>

            <div>

              <h1 className = "text-base font-semibold text-[var(--tm-text-strong)]" style = {{ fontFamily: "'Lora', Georgia, serif" }}>

                Documentation

              </h1>

              <p className = "text-xs text-[var(--tm-text-muted)]">TechMart AI Support</p>

            </div>

          </div>

          <button

            onClick = {() => router.push("/chat")}

            className = "btn-primary text-sm px-4 py-2"

          >

            ❮ Back to Chat

          </button>

        </header>

        <div className = "flex flex-1 overflow-hidden">

          {/* Sidebar list */}
          <nav className = "w-64 flex-shrink-0 border-r border-[var(--tm-border-light)] overflow-y-auto p-3">

            {loadingList ? (

              <p className = "text-sm text-[var(--tm-text-muted)] px-2 py-4">Loading...</p>

            ) : (

              docs.map((doc) => (

                <button

                  key = {doc.id}

                  onClick = {() => selectDoc(doc.id)}

                  className = "w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors"

                  style = {{

                    background: selectedDoc === doc.id ? "var(--techmart-gray-100)" : "transparent",

                  }}

                  onMouseEnter = {(e) => {

                    if (selectedDoc !== doc.id) e.currentTarget.style.background = "var(--techmart-gray-100)";

                  }}

                  onMouseLeave = {(e) => {

                    if (selectedDoc !== doc.id) e.currentTarget.style.background = "transparent";

                  }}

                >

                  <div className = "text-sm font-medium text-[var(--tm-text-strong)]">{doc.title}</div>

                  <div className = "text-xs text-[var(--tm-text-muted)] mt-0.5 line-clamp-2">{doc.description}</div>

                </button>

              ))

            )}

          </nav>

          {/* Content */}
          <main className = "flex-1 overflow-y-auto px-8 py-6">

            {error && (

              <div className = "bg-[var(--tm-danger)]/10 border border-[var(--tm-danger)]/30 rounded-xl px-4 py-3 text-[var(--tm-danger)] text-sm mb-4 max-w-2xl">

                ⚠️ {error}

              </div>

            )}

            {currentDoc && (

              <>

                <h2

                  className = "text-2xl font-semibold text-[var(--tm-text-strong)] mb-1"

                  style = {{ fontFamily: "'Lora', Georgia, serif" }}

                >

                  {currentDoc.title}

                </h2>

                <p className = "text-sm text-[var(--tm-text-muted)] mb-6">{currentDoc.description}</p>

              </>

            )}

            {loadingContent ? (

              <p className = "text-sm text-[var(--tm-text-muted)]">Loading content...</p>

            ) : (

              <pre

                className = "text-sm text-[var(--tm-text-strong)] whitespace-pre-wrap leading-relaxed max-w-2xl"

                style = {{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}

              >

                {content}

              </pre>

            )}

          </main>

        </div>

      </div>

    </>

  );

}