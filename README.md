# AI Collaborative Editor

This is a web-based collaborative editor built with React, featuring a suite of AI-powered tools designed to assist with writing and research. The application includes a rich text editor, an AI chat assistant, and a floating toolbar for quick text manipulations. This project was created to fulfill the requirements of a frontend developer technical assignment.

---

## Features

- **Rich Text Editor**: A clean, intuitive, and editable space for writing and formatting content.
- **Floating Toolbar**: Appears on text selection and provides quick AI actions:
  - **Improve**: Enhances clarity, tone, and grammar.
  - **Shorten**: Condenses the selected text while retaining the main points.
  - **Lengthen**: Expands on the selected text with additional details.
- **AI Preview Modal**: Shows a clear "Original vs. Suggestion" comparison, allowing users to confirm or cancel AI edits before they are applied.
- **Interactive Chat Sidebar**: Users can have a conversation with an AI assistant for help, brainstorming, or general queries.
- **Bonus: Web Search Agent**: By typing `/search <your query>`, users can ask the AI to perform a web search, summarize the findings, and insert the summary directly into the editor.

---

## Tech Stack

- **Frontend**: React (bootstrapped with Vite)
- **Styling**: Tailwind CSS (loaded via CDN for simplicity)
- **AI Integration**: Google Gemini API

---

## Setup and Installation

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/ai-collaborative-editor.git](https://github.com/your-username/ai-collaborative-editor.git)
    cd ai-collaborative-editor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    - Create a new file named `.env.local` in the root of your project.
    - Inside this file, add your Gemini API key. You can get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).

    ```
    VITE_GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

---

## Deployment

- **Recommended Platforms**: Vercel, Netlify
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

