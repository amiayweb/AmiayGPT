<p align="center">
  <img src="https://placehold.co/600x120?text=AmiayGPT+Banner" alt="AmiayGPT Banner" width="500"/>
</p>

<h1 align="center">AmiayGPT 🤖✨</h1>

<p align="center">
  <b>Modern, open-source ChatGPT-like chatbot app with user authentication, persistent conversations, beautiful UI, markdown/codeblock support, and OpenAI integration.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-green?logo=node.js"/>
  <img src="https://img.shields.io/github/license/votreuser/amiaygpt"/>
  <img src="https://img.shields.io/badge/OpenAI-API-blueviolet"/>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"/>
</p>

---

## 📚 Table of Contents
- [Features](#-features)
- [Setup](#-setup)
- [Project Structure](#-project-structure)
- [Codeblock & Markdown Syntax](#-codeblock--markdown-syntax)
- [Coming Soon](#-coming-soon)

---

## ✨ Features

- 🤖 **OpenAI GPT-3.5-turbo integration**
- 🔐 **User authentication (JWT, MySQL)**
- 💬 **Persistent conversation history**
- 🎨 **Modern UI (glassmorphism, dark/light mode)**
- 📝 **Markdown & codeblock syntax highlighting**
- 🌗 **Light/Dark mode toggle**
- 📋 **Copy button for code blocks**
- 📱 **Responsive design**
- 🛎️ **Notifications & real-time typing indicator**
- 💡 **Suggestion cards for quick prompts**
- ...and more!

---

## 🚀 Setup

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your values (OpenAI API key, MySQL credentials, JWT secret, etc.)
4. **Import the database schema**
   - Run the SQL in `database.sql` on your MySQL server
5. **Start the server**
   ```bash
   npm start
   ```
6. **Visit** [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Project Structure

```text
amiaygpt/
├── public/                 # Frontend (HTML, CSS, JS)
├── config/                 # Database config
├── middleware/             # JWT authentication
├── routes/                 # API routes (auth, conversations)
├── server.js               # Main Express server
├── database.sql            # MySQL schema
├── package.json            # Dependencies and scripts
└── README.md               # Documentation
```

---

## 📝 Codeblock & Markdown Syntax

- **Codeblocks**: Use triple backticks and language name (e.g. ```python)
- **Markdown**: Bot responses support headings, bold, italic, lists, tables, blockquotes, links, inline code, and more
- **Syntax highlighting**: All languages supported via PrismJS
- **Light/Dark mode**: Toggle in the UI

**Example:**
```python
# This is a Python code block
for i in range(5):
    print(i)
```

---

## 🧩 Coming Soon

- 🎨 More advanced markdown rendering
- 🧑‍💻 User profile customization
- 📦 Conversation export
- 🖌️ More codeblock themes
- 📱 Mobile app

---

<p align="center"><b>AmiayGPT is under active development. Stay tuned! 🚀</b></p> 
