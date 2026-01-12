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
        loader = PyPDFLoader(path, mode = "page")
        docs.extend(loader.load())

    return docs

def chunk_docs(docs: List) -> List:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size = settings.CHUNK_SIZE, chunk_overlap = settings.CHUNK_OVERLAP, separators = ["\n\n", "\n", " ", ""]
    )
    return splitter.split_documents(docs)