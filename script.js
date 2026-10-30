
const $ = (id) => document.getElementById(id);

const messages = $("messages");
const input = $("userInput");
const micButton = $("micButton");
const statusText = $("statusText");
const voiceStatus = $("voiceStatus");
const aiStatus = $("aiStatus");
const orb = $("orb");

let recognition = null;
let listening = false;
let focusTimer = null;
let reminderTimers = [];

const STORAGE_KEY = "titan_notes";

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.className = "message " +
    (sender === "YOU" ? "user-message" : "titan-message");

  const name = document.createElement("b");
  name.textContent = sender;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  div.append(name, paragraph);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function notify(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.08;
  utterance.pitch = 1;
  utterance.volume = 1;

  speechSynthesis.speak(utterance);
}

function reply(text, shouldSpeak = true) {
  addMessage("TITAN", text);
  statusText.textContent = text.length > 65
    ? text.slice(0, 65) + "..."
    : text;

  if (shouldSpeak) speak(text);
}

function openWebsite(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function getDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function calculate(expression) {
  const clean = expression.replace(/,/g, "").trim();

  if (!/^[\d+\-*/().%\s]+$/.test(clean)) {
    return null;
  }

  try {
    const result = Function('"use strict"; return (' + clean + ')')();
    if (!Number.isFinite(result)) return "That calculation is not valid.";
    return String(Number(result.toFixed(8)));
  } catch {
    return null;
  }
}

function saveNote(note) {
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  notes.push({ text: note, date: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, n => chars[n % chars.length]).join("");
}

function startTimer(seconds, label = "Timer") {
  clearInterval(focusTimer);

  const end = Date.now() + seconds * 1000;

  focusTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));

    if (remaining === 0) {
      clearInterval(focusTimer);
      reply(label + " completed!");
      notify(label + " completed!");
    }
  }, 250);

  reply(label + " started for " + seconds + " seconds.");
}

function setReminder(seconds, message) {
  const timer = setTimeout(() => {
    reply("Reminder: " + message);
  }, seconds * 1000);

  reminderTimers.push(timer);
  reply("I will remind you in " + seconds + " seconds.");
}

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "Why did the computer go to the doctor? It caught a virus!",
  "There are 10 types of people: those who understand binary and those who don't.",
  "Why was the JavaScript developer sad? Because he didn't know how to null his feelings."
];

const tips = [
  "Use a password manager and never reuse passwords.",
  "Enable two-factor authentication on important accounts.",
  "Never open unexpected email attachments.",
  "Keep your operating system and browser updated.",
  "Avoid entering passwords on websites without HTTPS."
];

function handleCommand(raw) {
  const command = raw.trim();
  const lower = command.toLowerCase();

  if (!command) return;

  addMessage("YOU", command);
  input.value = "";

  if (/^(hi|hello|hey|hello titan|hey titan)\b/.test(lower)) {
    return reply("Hello! TITAN is ready. What can I do for you?");
  }

  if (/\b(help|commands|what can you do)\b/.test(lower)) {
    return reply(
      "Here are my commands. Ask for the time or date, open Google or YouTube, " +
      "calculate something, tell a joke, give a cybersecurity tip, generate a password, " +
      "save or show notes, start a timer, set a reminder, search the web, or ask me a question."
    );
  }

  if (/\b(time|clock)\b/.test(lower)) {
    return reply("The current time is " + getTime());
  }

  if (/\b(date|today|day)\b/.test(lower)) {
    return reply("Today is " + getDate());
  }

  if (/\b(open|launch|go to)\b/.test(lower)) {
    const sites = {
      google: "https://www.google.com",
      youtube: "https://www.youtube.com",
      github: "https://github.com",
      gmail: "https://mail.google.com",
      chatgpt: "https://chatgpt.com",
      maps: "https://maps.google.com",
      wikipedia: "https://wikipedia.org",
      sentinelx: "https://sentinelx.sujalffkiller.workers.dev/",
      neontype: "https://neontype.vercel.app"
    };

    for (const [name, url] of Object.entries(sites)) {
      if (lower.includes(name)) {
        openWebsite(url);
        return reply("Opening " + name + ".");
      }
    }

    return reply("Tell me which website you want to open.");
  }

  if (lower.startsWith("search for ") || lower.startsWith("search ")) {
    const query = command.replace(/^search( for)? /i, "");
    openWebsite("https://www.google.com/search?q=" + encodeURIComponent(query));
    return reply("Searching the web for " + query);
  }

  if (lower.includes("joke")) {
    return reply(jokes[Math.floor(Math.random() * jokes.length)]);
  }

  if (lower.includes("cybersecurity tip") || lower.includes("security tip")) {
    return reply(tips[Math.floor(Math.random() * tips.length)]);
  }

  if (lower.includes("generate password") || lower.includes("create password")) {
    const password = generatePassword();
    addMessage("TITAN", "Generated password: " + password);
    speak("Your password has been generated. Please use the copy button.");
    const copy = document.createElement("button");
    copy.textContent = "COPY PASSWORD";
    copy.className = "text-button";
    copy.onclick = () => {
      navigator.clipboard.writeText(password)
        .then(() => notify("Password copied."))
        .catch(() => notify("Clipboard permission denied."));
    };
    messages.lastElementChild.appendChild(copy);
    return;
  }

  if (lower.startsWith("note ") || lower.startsWith("remember ")) {
    const note = command.replace(/^(note|remember)\s+/i, "");
    if (!note) return reply("Please tell me what to save.");
    saveNote(note);
    return reply("Your note has been saved in this browser.");
  }

  if (lower.includes("show notes") || lower.includes("read notes")) {
    const notes = getNotes();
    return reply(notes.length
      ? "Your saved notes: " + notes.map((n, i) => (i + 1) + ". " + n.text).join(". ")
      : "You don't have any saved notes.");
  }

  if (lower.includes("clear notes")) {
    localStorage.removeItem(STORAGE_KEY);
    return reply("Your notes have been cleared.");
  }

  const reminder = lower.match(
    /remind me in (\d+)\s*(seconds?|minutes?|hours?)\s*(?:to)?\s*(.*)/
  );

  if (reminder) {
    const amount = Number(reminder[1]);
    const unit = reminder[2];
    const seconds = amount * (
      unit.startsWith("hour") ? 3600 :
      unit.startsWith("minute") ? 60 : 1
    );
    return setReminder(seconds, reminder[3] || "Your reminder is due.");
  }

  const timer = lower.match(/(?:start|set|create)?\s*(?:a\s*)?(\d+)\s*(seconds?|minutes?|hours?)\s*(?:timer)?/);

  if (timer && (lower.includes("timer") || lower.includes("focus"))) {
    const amount = Number(timer[1]);
    const seconds = amount * (
      timer[2].startsWith("hour") ? 3600 :
      timer[2].startsWith("minute") ? 60 : 1
    );
    return startTimer(seconds);
  }

  if (lower.includes("focus")) {
    return startTimer(25 * 60, "25 minute focus session");
  }

  if (lower.startsWith("calculate ") || lower.startsWith("what is ")) {
    const expression = command
      .replace(/^(calculate|what is)\s+/i, "")
      .replace(/[?=]/g, "");

    const result = calculate(expression);
    if (result !== null) return reply("The answer is " + result);
  }

  if (lower.includes("your name") || lower.includes("who are you")) {
    return reply("I am TITAN AI, your personal digital assistant.");
  }

  if (lower.includes("how are you")) {
    return reply("I'm running perfectly. Ready for your next command!");
  }

  if (lower.includes("thank")) {
    return reply("You're welcome! Always here to help.");
  }

  if (lower === "clear chat") {
    messages.innerHTML = "";
    return reply("Conversation cleared.");
  }

  // Send unsupported questions to local Ollama if available.
  askOllama(command);
}

async function askOllama(question) {
  statusText.textContent = "TITAN AI is thinking...";
  const thinking = document.createElement("div");
  thinking.className = "message titan-message";
  thinking.textContent = "TITAN is thinking...";
  messages.appendChild(thinking);

  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        stream: false,
        messages: [
          {
            role: "system",
            content: `
            You are TITAN AI, a personal AI assistant.

            IDENTITY RULES:
            - Your name is TITAN AI.
            - You were created and developed by Sujal.
            - You are not Meta AI, ChatGPT, Gemini, or any other company's AI.
            - You are a personal assistant project powered by the Llama 3.2 model through Ollama.
            - If someone asks "Who made you?", "Who created you?", or "Who is your developer?", answer:

            "I was created and developed by Sujal as the TITAN AI personal assistant project. My intelligence is powered by Llama 3.2 running through Ollama."

            - Never claim to be created by Meta or another organization.
            - Always identify yourself as TITAN AI.
            - Be friendly, intelligent, concise and helpful.
            `
            },
          { role: "user", content: question }
        ],
        options: { temperature: 0.5, num_predict: 180 }
      })
    });

    if (!response.ok) throw new Error("Ollama returned " + response.status);

    const data = await response.json();
    thinking.remove();

    aiStatus.textContent = "OLLAMA CONNECTED";
    return reply(data.message?.content || "I received an empty response.");
  } catch (error) {
    thinking.remove();
    aiStatus.textContent = "OFFLINE";
    return reply(
      "I don't know that command yet, and my local AI engine is unavailable. " +
      "Start Ollama on your PC to enable AI chat. Try saying 'help' for built-in commands."
    );
  }
}

// Voice recognition
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    micButton.classList.add("active");
    orb.classList.add("listening");
    voiceStatus.textContent = "LISTENING";
    statusText.textContent = "I'm listening. Speak now...";
  };

  recognition.onresult = (event) => {
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      statusText.textContent = transcript;
      if (event.results[i].isFinal) finalText += transcript;
    }

    if (finalText.trim()) {
      recognition.stop();
      handleCommand(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error:", event.error);
    notify("Microphone error: " + event.error);
  };

  recognition.onend = () => {
    listening = false;
    micButton.classList.remove("active");
    orb.classList.remove("listening");
    voiceStatus.textContent = "READY";
    if (!statusText.textContent.includes("error")) {
      statusText.textContent = "TITAN is ready for your command.";
    }
  };
} else {
  micButton.disabled = true;
  voiceStatus.textContent = "UNSUPPORTED";
  statusText.textContent = "Try the latest Google Chrome browser.";
}

micButton.addEventListener("click", () => {
  if (!recognition) return;

  if (listening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (error) {
      notify("Voice is already starting. Please wait.");
    }
  }
});

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  handleCommand(input.value);
});

$("clearButton").addEventListener("click", () => {
  messages.innerHTML = "";
  reply("Chat cleared.");
});

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => {
    handleCommand(button.dataset.command);
  });
});

setInterval(() => {
  $("clock").textContent = getTime();
}, 1000);

$("clock").textContent = getTime();

if ("speechSynthesis" in window) {
  aiStatus.textContent = "VOICE AVAILABLE";
}
