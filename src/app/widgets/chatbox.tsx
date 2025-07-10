/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState } from "react";

interface ChatboxProps {
  entities: string[];
  relations: string[];
}

const Chatbox: React.FC<ChatboxProps> = ({ entities, relations }) => {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: `You can create, update, or delete entity nodes by chatting here.\nCurrent entities: ${entities.join(
        ", "
      )}\nCurrent relations: ${relations.join(", ")}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      // Handle function call result or assistant reply
      const assistantMsg = data.choices?.[0]?.message;
      if (assistantMsg) {
        setMessages([...newMessages, assistantMsg]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "No response from assistant." },
        ]);
      }
    } catch (e) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error contacting assistant." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="text-gray-400 bg-gray-900 rounded-lg shadow-md flex flex-col h-full">
      <div className="chatbox-header p-2 border-b border-gray-700">
        <h2>Chat</h2>
      </div>
      <div className="chatbox-messages flex-1 overflow-y-auto p-2">
        {messages.slice(1).map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 ${
              msg.role === "user" ? "text-blue-300" : "text-green-300"
            }`}
          >
            <span className="font-bold">
              {msg.role === "user" ? "You" : "Assistant"}:
            </span>{" "}
            {msg.content}
          </div>
        ))}
        {loading && <div className="text-gray-500">Assistant is typing...</div>}
      </div>
      <div className="chatbox-input flex p-2 border-t border-gray-700">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 rounded bg-gray-800 text-white outline-none"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-800"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
