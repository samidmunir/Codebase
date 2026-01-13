from dataclasses import dataclass
from typing import Any, Dict, List

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

from config import settings


# -----------------------------
# Vector store
# -----------------------------
def load_vectorstore() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name=settings.EMBED_MODEL)
    return Chroma(
        collection_name=settings.COLLECTION,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_DIR,
    )


def retrieve(query: str):
    vs = load_vectorstore()

    if settings.RETRIEVER == "mmr":
        return vs.max_marginal_relevance_search(
            query,
            k=settings.TOP_K,
            fetch_k=settings.FETCH_K,
            lambda_mult=settings.MMR_LAMBDA,
        )

    return vs.similarity_search(query, k=settings.TOP_K)


# -----------------------------
# LLM backends
# -----------------------------
def call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in your environment.")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()


def call_ollama(prompt: str) -> str:
    import ollama
    resp = ollama.chat(
        model=settings.OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return (resp["message"]["content"] or "").strip()


def llm(prompt: str) -> str:
    if settings.LLM_PROVIDER == "gemini":
        return call_gemini(prompt)
    return call_ollama(prompt)


# -----------------------------
# RAG prompt + output
# -----------------------------
def format_context(docs) -> str:
    parts = []
    for i, d in enumerate(docs, start=1):
        meta = d.metadata or {}
        src = meta.get("source", "unknown")
        page = meta.get("page", "n/a")
        parts.append(f"[{i}] (source={src}, page={page})\n{d.page_content}")
    return "\n\n".join(parts)


def build_prompt(question: str, context: str) -> str:
    # Aviation-safe-ish: grounded answers, refusal when missing, cite chunks.
    return f"""You are a retrieval-augmented assistant. Answer using ONLY the context below.

Rules:
- If the context does not contain enough information, say exactly:
  "I don't have enough information in the provided documents."
- Do NOT invent procedures, limits, or numerical values.
- Cite sources using bracketed chunk IDs like [1], [2].
- Keep answers clear and concise. If steps are requested, use a numbered list.

Question:
{question}

Context:
{context}

Answer:
"""


@dataclass
class RAGResult:
    answer: str
    sources: List[Dict[str, Any]]


def ask(question: str) -> RAGResult:
    retrieved = retrieve(question)
    context = format_context(retrieved)
    prompt = build_prompt(question, context)
    answer = llm(prompt)

    sources = []
    for d in retrieved:
        meta = d.metadata or {}
        text = d.page_content or ""
        sources.append(
            {
                "source": meta.get("source"),
                "page": meta.get("page"),
                "snippet": (text[:260] + "…") if len(text) > 260 else text,
            }
        )

    return RAGResult(answer=answer, sources=sources)
