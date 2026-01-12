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