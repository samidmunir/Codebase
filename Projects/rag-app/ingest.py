"""
Data Ingestion Pipeline for RAG
* Document Structure
"""
from langchain_core.documents import Document

doc = Document(
    page_content = "this is the main text content I am using to create RAG",
    metadata = {
        "source": "example.txt",
        "pages": 1,
        "author": "Sami Munir",
        "date_created": "2026-13-01" 
    },
)