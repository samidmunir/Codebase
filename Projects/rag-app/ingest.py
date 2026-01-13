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

"""
Text splitting get into chunks
"""
def split_documents(documents, chunk_size = 1000, chunk_overlap = 200):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size = chunk_size,
        chunk_overlap = chunk_overlap,
        length_function = len,
        separators = ["\n\n", "\n", " ", ""]
    )

    split_docs = text_splitter.split_documents(documents)
    print(f"Split {len(documents)} documents into {len(split_docs)} chunks")

    if split_docs:
        print(f"\nExample chunk:")
        print(f"Content: {split_docs[0].page_content[:200]}...")
        print(f"Metadata: {split_docs[0].metadata}")

    return split_docs

"""
Embedding & VectorStoreDB
"""
import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import uuid
from typing import List, Dict, Any, Tuple

from sklearn.metrics.pairwise import cosine_similarity

class EmbeddingManager:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            print(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print(f"Model loaded successfully. Embedding dimension: {self.model.get_sentence_embedding_dimension()}")
        except Exception as e:
            print(f"Error loading model {self.model_name}: {e}")
            raise

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        if not self.model:
            raise ValueError("Model not loaded")
        
        print(f"Generating embeddings for {len(texts)} texts...")
        embeddings = self.model.encode(texts, show_progress_bar = True)
        print(f"Generated embeddings with shape: {embeddings.shape}")

        return embeddings


class VectorStore:
    def __init__(self, collection_name: str = "pdf_documents", persist_directory: str = "./data/vector_store"):
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self._initialize_store()

    def _initialize_store(self):
        try:
            os.makedirs(self.persist_directory, exist_ok = True)
            self.client = chromadb.PersistentClient(path = self.persist_directory)

            self.collection = self.client.get_or_create_collection(
                name = self.collection_name,
                metadata = {"description": "PDF document embeddings for RAG"}
            )

            print(f"Vector store initialized. Collection: {self.collection_name}")
            print(f"Existing documents in collection: {self.collection.count()}")
        except Exception as e:
            print(f"Error initializing vector store: {e}")
            raise

    def add_documents(self, documents: List[Any], embeddings: np.ndarray):
        if (len(documents) != len(embeddings)):
            raise ValueError("Number of documents must match number of embeddings")
        
        print(f"Adding {len(documents)} documents to vector store...")

        ids = []
        metadatas = []
        documents_text = []
        embeddings_list = []

        for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
            doc_id = f"doc_{uuid.uuid4().hex[:8]}_{i}"
            ids.append(doc_id)

            metadata = dict(doc.metadata)
            metadata["doc_index"] = i
            metadata["content_length"] = len(doc.page_content)
            metadatas.append(metadata)

            documents_text.append(doc.page_content)

            embeddings_list.append(embedding.tolist())

        try:
            self.collection.add(
                ids = ids,
                embeddings = embeddings_list,
                metadatas = metadatas,
                documents = documents_text
            )
            print(f"Successfully added {len(documents)} documents to vector store")
            print(f"Total documents in collection: {self.collection.count()}")
        except Exception as e:
            print(f"Error adding documents to vector store: {e}")
            raise

documents = process_pdfs("./data/pdfs")
chunks = split_documents(documents = documents)

# initialize the embedding manager
embedding_manager = EmbeddingManager()
vectorStore = VectorStore()