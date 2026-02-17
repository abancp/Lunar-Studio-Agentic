# 🌙 Lunar Studio

**Lunar Studio** is a powerful AI assistant that runs locally on your machine. Chat with it from the **CLI**, a **web interface**, or even through **WhatsApp** — all powered by leading LLM providers like OpenAI and Google Gemini.

---

## ✨ Features

- 🖥️ **CLI Chat** — Fast, interactive AI conversations in your terminal
- 🌐 **Web Interface** — Clean browser-based chat UI
- 💬 **WhatsApp Integration** — Chat with your AI assistant via WhatsApp
- 🧠 **Memory System** — Persistent memory across conversations
- 🔧 **Tool Use** — Extensible tool support (file operations, system commands, and more)
- 🔑 **Multi-Provider** — Supports OpenAI and Google Gemini

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)
- Git

---

## 🚀 Installation

**1. Clone the repository**

```bash
git clone https://github.com/abancp/Lunar-Studio-Agentic.git
```

**2. Navigate to the project directory**

```bash
cd Lunar-Studio-Agentic
```

**3. Run the install script**

```bash
./install.sh
```

This will install dependencies, build the project, and link the `lunarstudio` command globally.

---

## ⚙️ Setup

After installation, run the setup command to configure your API keys and preferred provider:

```bash
lunarstudio setup
```

Follow the interactive prompts to complete the configuration.

---

## 🧑‍💻 Usage

### CLI Chat

Start an interactive AI chat session directly in your terminal:

```bash
lunarstudio chat
```

### Web & WhatsApp (Daemon Mode)

To launch the web interface and WhatsApp bot, start the daemon:

```bash
lunarstudio daemon
```

This starts a background service that powers both the **web UI** and **WhatsApp** integration.

---

## 📁 Project Structure

```
Lunar-Studio-Agentic/
├── src/            # Core application source code
│   └── cli/        # CLI entry point and commands
├── llm/            # LLM provider integrations
├── tools/          # Built-in tools for the AI agent
├── web/            # Web interface
├── external-apps/  # WhatsApp and other integrations
├── install.sh      # Installation script
└── package.json
```

---

## 📄 License

ISC

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.
