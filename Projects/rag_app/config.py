from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    # Paths
    PDF_DIR: str = os.getenv("PDF_DIR", "data/pdfs")
    CHROMA_DIR: str = os.getenv("CHROMA_DIR", "data/chroma")
    COLLECTION: str = os.getenv("COLLECTION", "rag_docs")

    # Chunking
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "900"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))

    # Retrieval
    TOP_K: int = int(os.getenv("TOP_K", "4"))
    RETRIEVER: str = os.getenv("RETRIEVER", "mmr").lower()  # "similarity" | "mmr"
    MMR_LAMBDA: float = float(os.getenv("MMR_LAMBDA", "0.5"))
    FETCH_K: int = int(os.getenv("FETCH_K", "20"))

    # LLM
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama").lower()  # "ollama" | "gemini"
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Embeddings
    EMBED_MODEL: str = os.getenv(
        "EMBED_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2"
    )

settings = Settings()
