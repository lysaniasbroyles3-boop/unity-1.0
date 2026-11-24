
/* =====================================
   UNITY 1.0 — FRONTEND ENGINE
===================================== */

// IMPORTANT:
// Replace this with your actual Render URL
// after deploying the backend.

const API_URL = "https://unity-1-0.onrender.com";

const questionInput = document.getElementById("question");
const followupInput = document.getElementById("followup");
const messagesArea = document.getElementById("messages");

const sendButton = document.getElementById("sendButton");
const followupButton = document.getElementById("followupButton");

let conversation = [];
let busy = false;
let currentConversationId = null;

const HISTORY_KEY = "unity_conversations_v1";

let conversations = loadHistory();

/* =====================================
   STARTUP
===================================== */

setTimeout(() => {
  document.getElementById("startup").classList.add("hide");
}, 1800);

checkConnection();

renderHistory();

/* =====================================
   NAVIGATION
===================================== */

function showPage(page) {

  document.querySelectorAll(".page").forEach(section => {
    section.classList.add("hidden");
  });

  const selected = document.getElementById(page);

  if (selected) {
    selected.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const names = {
    home: "HOME",
    about: "ABOUT UNITY",
    technology: "TECHNOLOGY",
    how: "HOW IT WORKS",
    presentation: "PRESENTATION",
    chat: "CONVERSATION"
  };

  document.getElementById("pageName").textContent =
    names[page] || "HOME";
}

document.querySelectorAll(".nav-btn").forEach(button => {

  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });

});

/* =====================================
   NEW CONVERSATION
===================================== */

function newConversation() {

  conversation = [];
  currentConversationId = null;

  messagesArea.innerHTML = "";

  questionInput.value = "";
  followupInput.value = "";

  showPage("home");

}

/* =====================================
   SEARCH SUGGESTIONS
===================================== */

document.querySelectorAll(".suggestion").forEach(button => {

  button.addEventListener("click", () => {

    const suggestions = {
      "✧ Artificial Intelligence":
        "How does artificial intelligence work?",

      "◉ The Universe":
        "How did the universe begin?",

      "⌘ Computer Science":
        "How do computers understand programming?"
    };

    questionInput.value =
      suggestions[button.textContent.trim()] ||
      button.textContent.trim();

    askUnity(false);

  });

});

/* =====================================
   CONNECTION STATUS
===================================== */

function setStatus(text, color) {

  document.getElementById("statusText").textContent = text;

  document.getElementById("statusDot").style.color = color;

}

async function checkConnection() {

  try {

    const response = await fetch(
      API_URL + "/api/health"
    );

    if (!response.ok) {
      throw new Error("Server unavailable");
    }

    const data = await response.json();

    if (data.status === "online") {
      setStatus("UNITY AI ONLINE", "#4ade80");
    } else {
      setStatus("AI OFFLINE", "#ff6565");
    }

  } catch (error) {

    setStatus("BACKEND OFFLINE", "#ff6565");

    console.error("UNITY connection:", error);

  }

}

/* =====================================
   HISTORY STORAGE
===================================== */

function loadHistory() {

  try {

    const data = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];

  } catch {
    return [];
  }

}

function saveConversation() {

  if (!currentConversationId) {

    currentConversationId =
      Date.now().toString();

    conversations.unshift({
      id: currentConversationId,
      title: conversation[0]?.content || "New conversation",
      messages: []
    });

  }

  const existing = conversations.find(
    item => item.id === currentConversationId
  );

  if (existing) {
    existing.messages = conversation;
    existing.title = conversation.find(
      item => item.role === "user"
    )?.content || "New conversation";
    existing.updatedAt = Date.now();
  }

  conversations = conversations.slice(0, 40);

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(conversations)
  );

  renderHistory();

}

function renderHistory() {

  const history = document.getElementById("history");

  history.innerHTML = "";

  conversations.forEach(item => {

    const button = document.createElement("button");

    button.className = "history-item";
    button.textContent = "◷ " + item.title;

    button.title = item.title;

    button.addEventListener("click", () => {
      openConversation(item.id);
    });

    history.appendChild(button);

  });

}

function openConversation(id) {

  const item = conversations.find(
    entry => entry.id === id
  );

  if (!item) return;

  currentConversationId = id;
  conversation = [...item.messages];

  messagesArea.innerHTML = "";

  conversation.forEach(message => {
    addMessage(
      message.content,
      message.role === "user" ? "user" : "ai"
    );
  });

  showPage("chat");

}

/* =====================================
   DISPLAY MESSAGES
===================================== */

function addMessage(text, type) {

  const box = document.createElement("div");

  box.className =
    "message " +
    (type === "user" ? "user-message" : "ai-message");

  if (type === "ai") {

    const label = document.createElement("div");

    label.className = "ai-label";
    label.textContent = "✦ UNITY AI";

    const content = document.createElement("div");

    content.className = "answer-content";
    content.textContent = text;

    box.append(label, content);

    messagesArea.appendChild(box);

    return content;

  }

  box.textContent = text;

  messagesArea.appendChild(box);

  return null;

}

/* =====================================
   AI STREAMING
===================================== */

async function askUnity(isFollowup = false) {

  if (busy) return;

  const input = isFollowup
    ? followupInput
    : questionInput;

  const text = input.value.trim();

  if (!text) return;

  if (!API_URL.startsWith("https://") ||
      API_URL.includes("YOUR-UNITY-SERVER")) {

    alert("Please configure your Render API URL in script.js.");

    return;
  }

  busy = true;

  sendButton.disabled = true;
  followupButton.disabled = true;

  input.value = "";

  if (!isFollowup) {

    conversation = [];
    currentConversationId = null;

    messagesArea.innerHTML = "";

    showPage("chat");

  }

  addMessage(text, "user");

  conversation.push({
    role: "user",
    content: text
  });

  const answer = addMessage("", "ai");

  answer.classList.add("typing");
  answer.textContent = "UNITY is thinking...";

  try {

    const response = await fetch(
      API_URL + "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          messages: conversation.slice(-12)
        })
      }
    );

    if (!response.ok) {

      const error = await response.json().catch(() => ({}));

      throw new Error(
        error.error || "AI server returned an error."
      );

    }

    if (!response.body) {
      throw new Error("Streaming is not supported.");
    }

    answer.classList.remove("typing");
    answer.textContent = "";

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    let buffer = "";
    let fullAnswer = "";

    while (true) {

      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true
      });

      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {

        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6).trim();

        if (!data) continue;

        if (data === "[DONE]") continue;

        const chunk = JSON.parse(data);

        const token =
          chunk.choices?.[0]?.delta?.content || "";

        fullAnswer += token;

        answer.textContent = fullAnswer;

      }

      messagesArea.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });

    }

    if (!fullAnswer.trim()) {
      throw new Error("The AI returned an empty answer.");
    }

    conversation.push({
      role: "assistant",
      content: fullAnswer
    });

    saveConversation();

  } catch (error) {

    console.error("UNITY AI ERROR:", error);

    answer.classList.remove("typing");
    answer.classList.add("message-error");

    answer.textContent =
      "UNITY encountered a problem: " + error.message;

    // Remove unanswered user request from the
    // saved conversation context.
    conversation.pop();

  } finally {

    busy = false;

    sendButton.disabled = false;
    followupButton.disabled = false;

  }

}

/* =====================================
   BUTTON EVENTS
===================================== */

sendButton.addEventListener("click", () => {
  askUnity(false);
});

followupButton.addEventListener("click", () => {
  askUnity(true);
});

questionInput.addEventListener("keydown", event => {

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askUnity(false);
  }

});

followupInput.addEventListener("keydown", event => {

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askUnity(true);
  }

});

// Start a fresh conversation from the
// New Question navigation button.
document.querySelector('[data-page="home"]')
  .addEventListener("dblclick", newConversation);

