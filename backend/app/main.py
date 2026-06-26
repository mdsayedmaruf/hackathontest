import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import get_settings
from .models import ChatRequest, ChatResponse
from .openrouter import OpenRouterError, chat_completion, stream_chat_completion

settings = get_settings()

app = FastAPI(title=settings.app_title, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": settings.app_title}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": settings.openrouter_model,
        "configured": bool(settings.openrouter_api_key),
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Non-streaming chat endpoint. Returns the full reply at once."""
    messages = [m.model_dump() for m in req.messages]
    try:
        reply, model = await chat_completion(
            settings, messages, model=req.model, temperature=req.temperature
        )
    except OpenRouterError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ChatResponse(reply=reply, model=model)


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming chat endpoint using Server-Sent Events (SSE)."""
    messages = [m.model_dump() for m in req.messages]

    async def event_generator():
        try:
            async for chunk in stream_chat_completion(
                settings, messages, model=req.model, temperature=req.temperature
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except OpenRouterError as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
