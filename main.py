import asyncio
import json
import logging
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# --- Configuration ---
app = FastAPI()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CORS Middleware ---
# This is CRITICAL for localhost development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class ChatRequest(BaseModel):
    message: str

# --- MOCK AGENT (For Testing) ---
async def mock_agent_stream(query: str):
    """
    Simulates a streaming LLM response.
    REMOVE this when connecting your real Semantic Kernel agent.
    """
    simulated_response = (
        f"I received your query: '{query}'.\n\n"
        "Here is a simulated streaming response from the Python backend. "
        "I am sending this text in small chunks to demonstrate the "
        "Server-Sent Events (SSE) capability.\n\n"
        "1. First point\n"
        "2. Second point\n"
        "3. Final conclusion."
    )

    # Simulate processing delay
    await asyncio.sleep(0.5)

    # Stream chunks of characters
    for word in simulated_response.split(" "):
        yield word + " "
        await asyncio.sleep(0.1) # Simulate token generation delay

async def event_generator(user_query, request):
    try:
        # STAGE 1: Inform frontend we are thinking
        status_payload = json.dumps({"type": "status", "text": "Analyzing query..."})
        yield f"data: {status_payload}\n\n"
        await asyncio.sleep(1) # Simulate work

        # STAGE 2: Inform frontend we are searching
        status_payload = json.dumps({"type": "status", "text": "Searching legal database..."})
        yield f"data: {status_payload}\n\n"
        await asyncio.sleep(1) # Simulate work

        # STAGE 3: Streaming the actual content
        # (Signal that we are done with status and moving to content)
        status_payload = json.dumps({"type": "status", "text": "Generating response..."})
        yield f"data: {status_payload}\n\n"

        # Call your agent stream here
        stream = mock_agent_stream(user_query) # Or your real agent

        async for chunk in stream:
            if await request.is_disconnected():
                break

            if chunk:
                # Note: Type is now 'content'
                payload = json.dumps({"type": "content", "text": chunk})
                yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        err_payload = json.dumps({"type": "error", "text": str(e)})
        yield f"data: {err_payload}\n\n"


# --- Main Chat Endpoint ---
@app.post("/chat")
async def chat_endpoint(request: Request, chat_req: ChatRequest): # Note: added 'request'
    user_query = chat_req.message
    logger.info(f"Received query: {user_query}")
    return StreamingResponse(event_generator(user_query, request), media_type="text/event-stream")

# --- Entry Point ---
if __name__ == "__main__":
    # Run with: python main.py
    # or: uvicorn main:app --reload
    print("Starting Backend on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)