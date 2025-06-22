import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Consultation = ({ cart, setCart, menuItems }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced function to process cart actions from AI (ADD and REMOVE)
  const processCartActions = (cartActions) => {
    if (!cartActions || cartActions.length === 0) return;

    cartActions.forEach(action => {
      if (action.action === 'ADD') {
        // Find the menu item
        const menuItem = menuItems.find(item => item._id === action.itemId);
        if (menuItem) {
          // Add to cart
          setCart(prevCart => ({
            ...prevCart,
            [action.itemId]: {
              ...menuItem,
              quantity: (prevCart[action.itemId]?.quantity || 0) + action.quantity
            }
          }));
          
          // Add a system message to show cart update
          const cartUpdateMessage = {
            content: `✅ Added ${action.quantity}x ${action.name} to your cart!`,
            sender: 'system',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'cart-update'
          };
          
          setMessages(prevMessages => [...prevMessages, cartUpdateMessage]);
        }
      } else if (action.action === 'REMOVE') {
        // Find the menu item
        const menuItem = menuItems.find(item => item._id === action.itemId);
        if (menuItem) {
          // Remove from cart
          setCart(prevCart => {
            const newCart = { ...prevCart };
            const currentItem = newCart[action.itemId];
            
            if (currentItem) {
              const newQuantity = currentItem.quantity - action.quantity;
              
              if (newQuantity <= 0) {
                // Remove item completely if quantity becomes 0 or negative
                delete newCart[action.itemId];
                
                const cartUpdateMessage = {
                  content: `🗑️ Removed all ${action.name} from your cart!`,
                  sender: 'system',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  type: 'cart-update'
                };
                
                setMessages(prevMessages => [...prevMessages, cartUpdateMessage]);
              } else {
                // Reduce quantity
                newCart[action.itemId] = {
                  ...currentItem,
                  quantity: newQuantity
                };
                
                const cartUpdateMessage = {
                  content: `➖ Removed ${action.quantity}x ${action.name} from your cart! (${newQuantity} remaining)`,
                  sender: 'system',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  type: 'cart-update'
                };
                
                setMessages(prevMessages => [...prevMessages, cartUpdateMessage]);
              }
            } else {
              // Item not in cart
              const cartUpdateMessage = {
                content: `❌ ${action.name} is not in your cart!`,
                sender: 'system',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'cart-update'
              };
              
              setMessages(prevMessages => [...prevMessages, cartUpdateMessage]);
            }
            
            return newCart;
          });
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    // Add user message to chat immediately
    const userMessage = {
      content: prompt,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Clear the input field
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const res = await axios.post('/api/consult', { 
        prompt: currentPrompt,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    
      if (res.data.error) {
        throw new Error(res.data.error);
      }

      const cleanResponse = res.data.response
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim();

      // Process cart actions if any (both ADD and REMOVE)
      if (res.data.cartActions && res.data.cartActions.length > 0) {
        processCartActions(res.data.cartActions);
      }

      // Add AI response to chat
      const aiMessage = {
        content: cleanResponse,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to get response';
      setError(errorMsg);
      
      // Add error message to chat
      const errorMessage = {
        content: `Error: ${errorMsg}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consultation-container">
      <div className="consultation-card">
        <h2>AI Consultation</h2>
        
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>Start a conversation with the AI assistant. Try asking "add 2 coffee to my cart" or "remove 1 pizza from cart"!</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.sender} ${message.type || ''}`}>
                  <div className="message-bubble">
                    {message.sender === 'ai' ? (
                      <pre className="ai-message-content">{message.content}</pre>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  <div className="message-timestamp">{message.timestamp}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {error && !messages.some(m => m.content === `Error: ${error}`) && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="chat-input-form">
          <div className="chat-input-container">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask me anything... Try 'add 2 coffee to my cart' or 'remove 1 pizza from cart'"
              rows="2"
              disabled={loading}
              className="chat-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button 
              type="submit" 
              disabled={loading || !prompt.trim()}
              className="send-button"
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Consultation;