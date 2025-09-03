import React, { useState, useRef, useEffect, useCallback } from 'react';


const GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";

// Main App Component
export default function App() {
  const [textToInsert, setTextToInsert] = useState(null);

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Editor textToInsert={textToInsert} onTextInserted={() => setTextToInsert(null)} />
      <ChatSidebar onInsertText={setTextToInsert} />
    </div>
  );
}

// Editor Component
const Editor = ({ textToInsert, onTextInserted }) => {
  const editorRef = useRef(null);
  const [toolbarPosition, setToolbarPosition] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAction, setEditAction] = useState('Edit with AI');
  
  const selectionTextRef = useRef(null);
  const selectionRangeRef = useRef(null);

  // Effect to handle inserting text from the chat
  useEffect(() => {
    if (textToInsert && editorRef.current) {
        const editor = editorRef.current;
        editor.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);

        document.execCommand('insertHTML', false, `<p><br></p><p>${textToInsert.replace(/\n/g, '<br>')}</p>`);
        onTextInserted(); 
    }
  }, [textToInsert, onTextInserted]);


  const handleSelectionChange = useCallback(() => {
    setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '' && editorRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            selectionTextRef.current = selection.toString();
            selectionRangeRef.current = range;

            setToolbarPosition({
                top: rect.top - 45,
                left: rect.left + (rect.width / 2),
            });
        } else {
            if (!isModalOpen) {
                setToolbarPosition(null);
            }
        }
    }, 10);
  }, [isModalOpen]);

  useEffect(() => {
    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('mouseup', handleSelectionChange);
      editorElement.addEventListener('keyup', handleSelectionChange);
      
      return () => {
        editorElement.removeEventListener('mouseup', handleSelectionChange);
        editorElement.removeEventListener('keyup', handleSelectionChange);
      };
    }
  }, [handleSelectionChange]);


  const handleConfirmReplace = (newText) => {
    if (selectionRangeRef.current) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectionRangeRef.current);
        document.execCommand('insertText', false, newText);
    }
    setIsModalOpen(false);
    setToolbarPosition(null);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setToolbarPosition(null);
  };

  const handleToolbarAction = (action) => {
    setEditAction(action);
    setIsModalOpen(true);
    setToolbarPosition(null);
  };

  return (
    <div className="flex-grow p-8 md:p-12 lg:p-16 overflow-y-auto">
      <div 
        ref={editorRef}
        contentEditable="true"
        suppressContentEditableWarning={true}
        className="prose prose-invert prose-lg max-w-none h-full focus:outline-none"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        <h1 className="text-4xl font-bold mb-4">AI Collaborative Editor</h1>
        <p>Start typing below. Select text to see AI options.</p>
        <p>You can also ask the AI to search the web by typing <code className="bg-gray-700 px-1 rounded">/search your query here</code> in the chat.</p>
      </div>

      {toolbarPosition && (
        <FloatingToolbar 
            position={toolbarPosition} 
            onAction={handleToolbarAction} 
        />
      )}
      {isModalOpen && (
        <AIPreviewModal 
            onClose={handleCloseModal} 
            originalText={selectionTextRef.current}
            onConfirm={handleConfirmReplace}
            editAction={editAction}
        />
      )}
    </div>
  );
};


// Chat Sidebar Component
const ChatSidebar = ({ onInsertText }) => {
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hello! I can also search the web. Just type `/search` followed by your query.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const performWebSearch = async (query) => {
    console.log(`Simulating web search for: ${query}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    return `[
        {"title": "Next.js 15 Release Notes", "link": "https://nextjs.org/blog/next-15", "snippet": "Next.js 15 brings significant improvements to the App Router, build performance, and introduces new APIs for caching and data revalidation."},
        {"title": "Vercel Blog: The Road to Next.js 15", "link": "https://vercel.com/blog/nextjs-15", "snippet": "An overview of the new features in Next.js 15, including experimental support for React Compiler and partial pre-rendering."},
        {"title": "InfoWorld: Next.js 15 boosts performance", "link": "https://www.infoworld.com/article/3715004/nextjs-15-boosts-performance.html", "snippet": "The latest version of the popular React framework promises faster builds and more stable server actions."}
    ]`;
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    if (GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        setMessages(prev => [...prev, { from: 'ai', text: "Please add your Gemini API key to enable AI features."}]);
        return;
    }

    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
        let aiText;
        if (currentInput.toLowerCase().startsWith('/search ')) {
            const query = currentInput.substring(8);
            setMessages(prev => [...prev, { from: 'ai', text: `Searching the web for "${query}"...` }]);
            const searchResults = await performWebSearch(query);
            
            const summaryPrompt = `Based on the following web search results (in JSON format), provide a concise summary answering the user's query. Format the answer nicely using markdown.\n\nUser Query: "${query}"\n\nSearch Results:\n${searchResults}`;

            const result = await callGeminiAPI(summaryPrompt);
            aiText = result;
            setMessages(prev => [...prev.slice(0, -1), { from: 'ai', text: aiText, isSummary: true }]);

        } else {
            const prompt = `You are an expert writing assistant. The user's message is: "${currentInput}"`;
            aiText = await callGeminiAPI(prompt);
            setMessages(prev => [...prev, { from: 'ai', text: aiText }]);
        }

    } catch (error) {
      console.error("Error during AI interaction:", error);
      setMessages(prev => [...prev, { from: 'ai', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const callGeminiAPI = async (prompt) => {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        return text;
    } else {
        throw new Error("No content received from AI.");
    }
  };


  return (
    <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-800 flex flex-col p-4 shadow-2xl h-full">
      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">AI Assistant</h2>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index}>
                <div className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  </div>
                </div>
                {msg.isSummary && !msg.inserted && (
                    <div className="flex justify-start mt-2">
                        <button onClick={() => {
                            onInsertText(msg.text);
                            setMessages(prev => prev.map((m, i) => i === index ? {...m, inserted: true} : m));
                          }} className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Insert Summary into Editor
                        </button>
                    </div>
                )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-gray-700 text-gray-300">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="mt-4 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask or /search..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
          disabled={isLoading}
        />
        <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-md transition duration-300 disabled:bg-gray-500" disabled={isLoading}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>
    </div>
  );
};

// Floating Toolbar Component
const FloatingToolbar = ({ position, onAction }) => {
    const style = {
      top: `${position.top}px`,
      left: `${position.left}px`,
      transform: 'translateX(-50%)',
    };
  
    return (
      <div className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg flex items-center z-10" style={style}>
        <button onClick={() => onAction('Edit with AI')} className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-l-md">Improve</button>
        <div className="w-px h-4 bg-gray-600"></div>
        <button onClick={() => onAction('Shorten')} className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">Shorten</button>
        <div className="w-px h-4 bg-gray-600"></div>
        <button onClick={() => onAction('Lengthen')} className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-r-md">Lengthen</button>
      </div>
    );
};

// AI Preview Modal Component
const AIPreviewModal = ({ onClose, originalText, onConfirm, editAction }) => {
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const getPrompt = (action, text) => {
        let instruction = 'Improve the following text, keeping the core meaning the same but making it more clear, concise, and professional.';
        if (action === 'Shorten') {
            instruction = 'Shorten the following text significantly while preserving the key information.';
        } else if (action === 'Lengthen') {
            instruction = 'Expand on the following text, adding more detail and context to make it longer.';
        }
        return `You are an expert writing assistant. ${instruction} Only return the modified text, without any introductory phrases. Text to modify: "${text}"`;
    };

    useEffect(() => {
        const fetchSuggestion = async () => {
            if (GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
                setAiSuggestion("Please add your Gemini API key to the code to enable AI features.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
                
                const payload = {
                    contents: [{ parts: [{ text: getPrompt(editAction, originalText) }] }],
                };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("API request failed");

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text.trim();
                
                if (text) {
                    setAiSuggestion(text);
                } else {
                    setAiSuggestion("Could not generate a suggestion.");
                }
            } catch (error) {
                console.error("Failed to fetch AI suggestion:", error);
                setAiSuggestion("Error: Could not get suggestion. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        if (originalText) {
            fetchSuggestion();
        }
    }, [originalText, editAction]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-4">
                <h2 className="text-xl font-semibold mb-4">AI Suggestion</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 mb-2">ORIGINAL</h3>
                        <p className="bg-gray-900 p-3 rounded-md text-gray-300 h-24 overflow-y-auto">{originalText}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-green-400 mb-2">SUGGESTION</h3>
                        <div className="bg-gray-900 p-3 rounded-md text-green-300 h-24 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                </div>
                            ) : (
                                <p>{aiSuggestion}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Cancel</button>
                    <button onClick={() => onConfirm(aiSuggestion)} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:bg-gray-500" disabled={isLoading}>Confirm & Replace</button>
                </div>
            </div>
        </div>
    );
};

