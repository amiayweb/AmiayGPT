# AmiayGPT

AmiayGPT is a modern chatbot web application inspired by ChatGPT, built with Node.js (Express), vanilla JS, HTML, CSS, and Tailwind CSS. It features user authentication, persistent conversations, and a beautiful, responsive UI.

## Features

- OpenAI GPT-3.5-turbo integration
- User registration and login (MySQL, JWT)
- Per-user conversation history (saved in database)
- Modern UI (glassmorphism, blob animations, dark/light mode)
- Codeblock syntax highlighting (PrismJS, all languages supported)
- Markdown support in bot responses
- Light and dark mode toggle
- Real-time typing indicator
- Notification system
- Suggestion cards for quick prompts
- Copy button for code blocks

## Setup

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

## Project Structure

- `server.js` - Main Express server
- `routes/` - API routes (auth, conversations)
- `config/` - Database config
- `middleware/` - JWT authentication
- `public/` - Frontend (HTML, CSS, JS)
- `database.sql` - MySQL schema

## Codeblock & Markdown Syntax

- **Codeblocks**: Use triple backticks and language name (e.g. ```python```)
- **Markdown**: Bot responses support headings, bold, italic, lists, tables, blockquotes, links, inline code, and more
- **Syntax highlighting**: All languages supported via PrismJS
- **Light/Dark mode**: Toggle in the UI

## Coming Soon

- More advanced markdown rendering
- User profile customization
- Conversation export
- More themes for codeblocks
- Mobile support

---

**AmiayGPT** is under active development. Stay tuned for more features! 
