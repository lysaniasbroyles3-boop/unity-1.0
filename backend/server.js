
/* =====================================
   UNITY 1.0 — AI BACKEND
   Node.js + Express
===================================== */

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// AI CONFIGURATION

const AI_API_KEY = process.env.AI_API_KEY;

const AI_BASE_URL = (
  process.env.AI_BASE_URL ||
  "https://api.openai.com/v1"
).replace(/\/+$/, "");

const AI_MODEL = process.env.AI_MODEL;

// CORS CONFIGURATION

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "*"
).split(",").map(origin => origin.trim());

app.use(cors({
  origin: function(origin, callback) {

    if (!origin || allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed"));
  }
}));

app.use(express.json({ limit: "32kb" }));

// BASIC RATE LIMITING

const requests = new Map();

function rateLimit(req, res, next) {

  const ip = req.ip;
  const now = Date.now();

  const previous = requests.get(ip) || {
    count: 0,
    start: now
  };

  if (now - previous.start > 60000) {
    previous.count = 0;
    previous.start = now;
  }

  previous.count++;

  requests.set(ip, previous);

  if (previous.count > 30) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment."
    });
  }

  next();

}

/* =====================================
   HOME ROUTE
===================================== */

app.get("/", (req, res) => {

  res.json({
    name: "UNITY",
    version: "1.0",
    status: "ONLINE",
    message: "Welcome to UNITY - Your World of Answers."
  });

});

/* =====================================
   HEALTH CHECK
===================================== */

app.get("/api/health", (req, res) => {

  res.json({
    name: "UNITY AI",
    version: "1.0",
    status: "online",
    aiConfigured: Boolean(AI_API_KEY && AI_MODEL),
    streaming: true
  });

});

/* =====================================
   AI CHAT
===================================== */

app.post("/api/chat", rateLimit, async (req, res) => {

  try {

    if (!AI_API_KEY || !AI_MODEL) {

      return res.status(503).json({
        error: "UNITY AI is not configured yet. Check the server environment variables."
      });

    }

    if (!Array.isArray(req.body.messages) ||
        req.body.messages.length === 0 ||
        req.body.messages.length > 12) {

      return res.status(400).json({
        error: "Invalid conversation."
      });

    }

    const messages = req.body.messages;

    // Only allow ordinary user/assistant conversation messages.
    for (const message of messages) {

      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.length > 12000
      ) {

        return res.status(400).json({
          error: "Invalid message format."
        });

      }

    }

    const systemMessage = {
      role: "system",
      content:
        "You are UNITY, a helpful, knowledgeable and friendly AI assistant. " +
        "Your purpose is to help people learn, understand subjects, answer " +
        "questions and explore ideas. Give accurate, clear, well-organized " +
        "answers. Explain difficult concepts simply, especially for middle " +
        "school students. Be honest when you are uncertain. Never invent " +
        "sources or pretend to have live internet access. You are an AI " +
        "assistant, not a human."
    };

    // ASK THE REAL AI PROVIDER

    const upstream = await fetch(
      AI_BASE_URL + "/chat/completions",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + AI_API_KEY
        },

        body: JSON.stringify({

          model: AI_MODEL,

          messages: [
            systemMessage,
            ...messages
          ],

          temperature: 0.6,

          max_tokens: 600,

          stream: true

        }),

        signal: AbortSignal.timeout(90000)

      }
    );

    if (!upstream.ok) {

      const errorText = await upstream.text();

      console.error(
        "AI PROVIDER ERROR:",
        upstream.status,
        errorText.slice(0, 1000)
      );

      return res.status(502).json({
        error: "The AI provider could not complete the request. Check your provider settings."
      });

    }

    if (!upstream.body) {

      return res.status(502).json({
        error: "The AI provider did not return a response stream."
      });

    }

    // STREAM RESPONSE TO UNITY WEBSITE

    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    res.flushHeaders();

    for await (const chunk of upstream.body) {

      if (res.destroyed) break;

      if (!res.write(chunk)) {

        await new Promise(resolve => {
          res.once("drain", resolve);
        });

      }

    }

    if (!res.destroyed) {
      res.end();
    }

  } catch (error) {

    console.error("UNITY BACKEND ERROR:", error);

    if (!res.headersSent) {

      res.status(500).json({
        error: "UNITY encountered a server error."
      });

    } else if (!res.destroyed) {

      res.end();

    }

  }

});

/* =====================================
   ERROR HANDLING
===================================== */

app.use((err, req, res, next) => {

  console.error(err.message);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "A server error occurred."
  });

});

/* =====================================
   START SERVER
===================================== */

app.listen(PORT, () => {

  console.log("--------------------------------");
  console.log("UNITY AI BACKEND");
  console.log("--------------------------------");
  console.log("PORT:", PORT);
  console.log("MODEL:", AI_MODEL || "NOT CONFIGURED");
  console.log("AI KEY:", AI_API_KEY ? "CONFIGURED" : "MISSING");
  console.log("STATUS: ONLINE");
  console.log("--------------------------------");

});
