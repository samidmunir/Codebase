"""
Data Ingestion Pipeline for RAG
1. Document structure
"""
import os
from typing import List
from pathlib import Path
from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.document_loaders import PyMuPDFLoader

"""
This function takes in the path to a .txt file and returns a langchain document.
"""
def load_txt_file(file_path: str) -> List:
    loader = TextLoader(file_path, encoding = "utf-8")
    document = loader.load()

    return document

"""
This function takes in the path to a .txt file directory and returns a langchain document.
"""
def load_txt_dir(dir_path: str) -> List:
    loader = DirectoryLoader(
        dir_path,
        glob = "**/*.txt", # pattern to match files
        loader_cls = TextLoader, # loader class to use
        loader_kwargs = {"encoding": "utf-8"},
        show_progress = False
    )
    documents = loader.load()
    
    return documents

"""
This function takes in the path to a .pdf file and returns a langchain document.
"""
def load_pdf_file(file_path: str) -> List:
    loader = PyMuPDFLoader(file_path)
    document = loader.load()

    return document

"""
This function takes in the path to a .pdf file directory and returns a langchain document.
"""
def load_pdf_dir(dir_path: str) -> List:
    loader = DirectoryLoader(
        dir_path,
        glob = "**/*.pdf",
        loader_cls = PyMuPDFLoader,
        show_progress = False
    )
    documents = loader.load()

    return documents

"""
Data Ingestion Pipeline for RAG
2. Vector embedding
"""
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

def process_pdfs(pdf_dir: str) -> List:
    all_docs = []
    pdf_dir = Path(pdf_dir)

    pdf_files = list(pdf_dir.glob("**/*.pdf"))
    print(f"Found {len(pdf_files)} PDF files to process")

    for pdf_file in pdf_files:
        print(f"\nProcessing: {pdf_file.name}")
        try:
            loader = PyMuPDFLoader(str(pdf_file))
            documents = loader.load()

            for doc in documents:
                doc.metadata["source_file"] = pdf_file.name
                doc.metadata["file_type"] = "pdf"
            
            all_docs.extend(documents)
            print(f"✅ Loaded {len(documents)} pages")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\nTotal documents loaded: {len(all_docs)}")

    return all_docs

process_pdfs("./data/pdfs")