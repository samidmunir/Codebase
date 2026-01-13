import os
import glob
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

from config import settings


def load_pdfs(pdf_dir: str) -> List:
    pdf_paths = sorted(glob.glob(os.path.join(pdf_dir, "*.pdf")))
    docs = []
    for path in pdf_paths:
        loader = PyPDFLoader(path, mode="page")  # one Document per page
        docs.extend(loader.load())
    return docs


def chunk_docs(docs: List) -> List:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=[
            "\n\n", "\n", " ", ""
        ],
    )
    chunks = splitter.split_documents(docs)

    # Normalize metadata a bit (source/page are useful)
    for d in chunks:
        meta = d.metadata or {}
        # PyPDFLoader usually gives "source" and "page"
        d.metadata = {
            "source": meta.get("source"),
            "page": meta.get("page"),
            **{k: v for k, v in meta.items() if k not in ("source", "page")}
        }

    return chunks


def build_vectorstore(chunks: List):
    os.makedirs(settings.CHROMA_DIR, exist_ok=True)

    embeddings = HuggingFaceEmbeddings(model_name=settings.EMBED_MODEL)

    # Recreate the collection from scratch for a clean ingest
    vs = Chroma(
        collection_name=settings.COLLECTION,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_DIR,
    )
    try:
        # Delete existing collection content if present
        vs._collection.delete(where={})
    except Exception:
        pass

    vs.add_documents(chunks)
    vs.persist()
    return vs


def main():
    os.makedirs(settings.PDF_DIR, exist_ok=True)

    docs = load_pdfs(settings.PDF_DIR)
    if not docs:
        raise SystemExit(f"No PDFs found in '{settings.PDF_DIR}'. Add some PDFs and try again.")

    chunks = chunk_docs(docs)
    build_vectorstore(chunks)

    print(f"✅ Loaded {len(docs)} pages, chunked into {len(chunks)} chunks.")
    print(f"✅ Stored in Chroma at '{settings.CHROMA_DIR}' (collection='{settings.COLLECTION}').")


if __name__ == "__main__":
    main()
