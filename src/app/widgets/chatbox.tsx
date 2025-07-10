const Chatbox = () => {
  return (
    <div className="text-gray-400 bg-gray-900 rounded-lg shadow-md flex flex-col h-full">
      <div className="chatbox-header">
        <h2>Chat</h2>
      </div>
      <div className="chatbox-messages">
        {/* Messages will be displayed here */}
      </div>
      <div className="chatbox-input">
        <input type="text" placeholder="Type a message..." />
        <button>Send</button>
      </div>
    </div>
  );
};

export default Chatbox;
