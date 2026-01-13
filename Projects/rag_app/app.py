from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from rag import ask

app = FastAPI(title="PDF RAG Assistant")

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


class QueryIn(BaseModel):
    question: str


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/query")
def query_post(payload: QueryIn):
    res = ask(payload.question)
    return {"answer": res.answer, "sources": res.sources}


@app.get("/api/query")
def query_get(q: str):
    res = ask(q)
    return {"answer": res.answer, "sources": res.sources}
