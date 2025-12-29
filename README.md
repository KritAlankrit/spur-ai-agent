# Spur AI Support Agent - Founding Engineer Assignment

A full-stack AI-powered live chat widget designed for customer engagement. This project simulates a real-world support agent that remembers customer history and answers store-specific FAQs using **Llama 3.3** and **Postgres**.

## Live Links
* **Deployed App (Vercel)**: https://spur-ai-agent-sage.vercel.app/
* **Backend API (Render)**: https://spur-ai-agent-6lo6.onrender.com
* **GitHub Repository**: https://github.com/KritAlankrit/spur-ai-agent

---

## Local Setup Instructions 

### 1. Database Setup (Supabase/PostgreSQL)
Run the following SQL in your database editor to create the required schema for persistence:
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    sender TEXT CHECK (sender IN ('user', 'ai')),
    text TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### 2. Backend Configuration
1. Navigate to `/backend`.
2. Install dependencies: `npm install`.
3. Create a `.env` file with your keys:
```env
PORT=3000
GROQ_API_KEY=your_groq_key_here
DATABASE_URL=your_connection_string_here
```
4. Start development server: `npm run dev`.

### 3. Frontend Configuration
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Create a `.env` file:
```env
PUBLIC_BACKEND_URL=http://localhost:3000
```
4. Start frontend: `npm run dev`.
5. Open http://localhost:5173.

---

## Architecture Overview
### 1. Backend Structure
* **Persistence Layer**: Built with `node-postgres` to persist every message (User + AI) to PostgreSQL, associated with a `sessionId`.
* **Contextual Memory**: The system fetches conversation history from the DB and injects it into the LLM prompt to maintain contextual awareness.
* **Validation Layer**: Implements input sanitization to reject empty messages and handles excessively long inputs to ensure system stability.

### 2. Design Decisions
* **Persistence on Reload**: `sessionId` is stored in browser `localStorage`. On page load, the frontend fetches the full chat history from the backend using the `GET /chat/history/:sessionId` route.
* **Graceful Failure**: Wrapped LLM and DB calls in `try/catch` blocks. Errors are caught and returned as clean JSON messages to the UI rather than crashing the server.
* **UI/UX**: Implemented a responsive interface with Svelte transitions, a typing indicator, and auto-scroll functionality.

---

## LLM Notes
* **Provider**: Groq (Llama 3.3-70b-versatile).
* **System Prompting**: The agent is seeded with specific Store Knowledge regarding shipping, returns, and support hours.
* **Guardrails**: Character limits and server-side validation protect against malformed inputs and API abuse.

---

## Trade-offs & Assumptions
### 1. Assumptions:
* Assumed a fictional store with 3-5 day shipping and a 30-day return policy.
* Assumed session-based persistence is sufficient for the exercise without user authentication.

### 2. Trade-offs:
* **Simple SQL over Redis**: For this exercise, I used PostgreSQL directly for history retrieval to keep the architecture lean.
* **REST vs WebSockets**: Used RESTful endpoints for simplicity and speed of development over real-time WebSockets.

### 3. If I had more time...:
* I would implement **RAG (Retrieval-Augmented Generation)** with a vector database for larger FAQ datasets.
* I would add unit tests for the LLM response service and integration tests for the database layer.
