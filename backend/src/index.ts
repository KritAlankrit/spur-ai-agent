import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pg from 'pg';
import Groq from 'groq-sdk';

const { Pool } = pg;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Requirement 4: FAQ Knowledge [cite: 64, 71]
const STORE_KNOWLEDGE = `Store Name: Spur Gadgets. Shipping: USA/Canada only (3-5 days). Returns: 30 days. Support: 9am-5pm.`;

// Requirement 5: Fetch History [cite: 77]
app.get('/chat/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'SELECT sender, text FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC',
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load history" });
  }
});

// Requirement 2: Chat Endpoint [cite: 43]
app.post('/chat/message', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  // Requirement 6: Validation [cite: 82, 83, 84]
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Empty message" });
  }
  const cleanMessage = message.trim().slice(0, 2000);

  try {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const sessionResult = await pool.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
      currentSessionId = sessionResult.rows[0].id;
    }

    // Requirement 5: Persistence [cite: 46, 73]
    await pool.query('INSERT INTO messages (conversation_id, sender, text) VALUES ($1, $2, $3)', [currentSessionId, 'user', cleanMessage]);

    // Requirement 3: Contextual History 
    // Fetch last 10 to prevent context overflow errors
    const historyResult = await pool.query(
      'SELECT sender, text FROM messages WHERE conversation_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [currentSessionId]
    );
    
    // Reverse to chronological order for the LLM
    const history = historyResult.rows.reverse().map(row => ({
      role: (row.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: row.text
    }));

    let aiReply: string;
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: `You are a support agent for Spur Gadgets. ${STORE_KNOWLEDGE}` }, ...history],
        model: "llama-3.3-70b-versatile",
      });
      aiReply = chatCompletion.choices[0]?.message?.content || "I am currently over capacity.";
    } catch (llmErr) {
      // Requirement 6: Graceful Failure [cite: 59, 87, 89]
      console.error("LLM Error:", llmErr);
      return res.status(503).json({ error: "AI service timeout. Please try again." });
    }

    await pool.query('INSERT INTO messages (conversation_id, sender, text) VALUES ($1, $2, $3)', [currentSessionId, 'ai', aiReply]);

    res.json({ reply: aiReply, sessionId: currentSessionId });
  } catch (dbError) {
    console.error("DB Error:", dbError);
    res.status(500).json({ error: "Database connection lost." });
  }
});

app.listen(port, () => console.log(`Server: http://localhost:${port}`));