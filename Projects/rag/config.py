from dataclasses import dataclass
import os

@dataclass
class Settings:
    PDF_DIR: str = os.getenv("PDF_DIR", "data/pdfs")
    CHROMA_DIR: str = os.getenv("CHROMA_DIR", "data/chroma")
    COLLECTION: str = os.getenv("COLLECTION", "rag_docs")

    # Chunking
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "900"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))

    # Retrieval
    TOP_K: int = int(os.getenv("TOP_K", "4"))

    # LLM selection: "gemini" or "ollama"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

    # Gemini key
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")

settings = Settings()