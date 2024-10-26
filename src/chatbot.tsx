import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Info, Link, X, Send } from 'lucide-react';
import './chatbot.css';
import logo from '../src/logo.svg';
import worldLogo from '../src/worldlogo.svg';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

interface LinkRendererProps {
  href?: string; // Make href optional
  children: React.ReactNode;
}

// Add these interfaces at the top with your other interfaces
interface ConversationMessage {
  role: string;
  content: string;
}

interface Conversation {
  id: string;
  created_at: string;
  messages: ConversationMessage[];
  chatbot_id: string;
  customer: string;
  source: string;
}

interface ConversationsResponse {
  data: Conversation[];
}

// Add this function to fetch conversations
const fetchConversations = async ({
  chatbotId,
  startDate,
  endDate,
  page = '1',
  size = '10'
}: {
  chatbotId: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  size?: string;
}) => {
  const params = new URLSearchParams({
    chatbotId,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    page,
    size
  });

  const response = await fetch(
    `https://www.chatbase.co/api/v1/get-conversations?${params}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 7757df07-bf34-4e04-b8d5-7062fca325ff',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  return await response.json() as ConversationsResponse;
};

const getTimeString = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'bot', 
      text: 'Hello! How can I help you?',
      timestamp: getTimeString()
    }
  ]);

  const [streamingText, setStreamingText] = useState<string>('');
  const [copyNotification, setCopyNotification] = useState<{ show: boolean; text: string }>({
    show: false,
    text: ''
  });
  const [isBackdropVisible, setIsBackdropVisible] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);



  
  // Add this effect to fetch conversations
useEffect(() => {
  const loadConversations = async () => {
    setIsLoadingConversations(true);
    setConversationError(null);
    try {
      const result = await fetchConversations({
        chatbotId: 'WqQhkIYvKlQ0ouhoPGHfZ',
        // You can add date range if needed
        // startDate: '2024-01-01',
        // endDate: '2024-12-31',
      });
      setConversations(result.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversationError('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  loadConversations();
}, []); // Load conversations when component mounts

  const LinkRenderer = ({ href = '', children }: LinkRendererProps) => {
    const handleLinkClick = async (url: string, e: React.MouseEvent) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(url);
        setCopyNotification({ show: true, text: 'Link copied!' });
        setTimeout(() => {
          setCopyNotification({ show: false, text: '' });
        }, 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
        setCopyNotification({ show: true, text: 'Failed to copy link' });
        setTimeout(() => {
          setCopyNotification({ show: false, text: '' });
        }, 2000);
      }
    };
  
    return (
      <a
        href={href}
        onClick={(e) => handleLinkClick(href, e)}
        className="bot-link"
        title="Click to copy link"
      >
        {children}
      </a>
    );
  };

  const handleInfoClick = () => {
    setIsInfoOpen(!isInfoOpen);
    setIsSourcesOpen(false);
    setIsBackdropVisible(!isInfoOpen);
  };
  
  const handleSourcesClick = () => {
    setIsSourcesOpen(!isSourcesOpen);
    setIsInfoOpen(false);
    setIsBackdropVisible(!isSourcesOpen);
  };
  
  const handleBackdropClick = () => {
    setIsInfoOpen(false);
    setIsSourcesOpen(false);
    setIsBackdropVisible(false);
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      const plainText = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                           .replace(/[*_~`]/g, '');
      await navigator.clipboard.writeText(plainText);
      setCopiedMessageId(idx);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.info-popup') && !target.closest('.info-button')) {
        setIsInfoOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sendMessage = async (messageText: string) => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.text === messageText && lastMessage?.sender === 'user') {
      return;
    }
  
    setIsLoading(true);
    setStreamingText('');

    // Add user message immediately
    setMessages(prevMessages => [
      ...prevMessages,
      { 
        sender: 'user', 
        text: messageText,
        timestamp: getTimeString()
      }
    ]);

    try {
      const apiMessages = messages.map(msg => ({
        content: msg.text,
        role: msg.sender === 'bot' ? 'assistant' : 'user'
      }));

      apiMessages.push({
        content: messageText,
        role: 'user'
      });

      const response = await fetch('https://www.chatbase.co/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_CHATBASE_API_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          chatbotId: process.env.REACT_APP_CHATBASE_BOT_ID,
          stream: true,
          temperature: 0,
          model: 'claude-3-5-sonnet'
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
      }

      // Add final bot message
      if (accumulatedText) {
        setMessages(prevMessages => [
          ...prevMessages,
          { 
            sender: 'bot', 
            text: accumulatedText,
            timestamp: getTimeString()
          }
        ]);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          sender: 'bot', 
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: getTimeString()
        }
      ]);
    } finally {
      setStreamingText('');
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      {(isInfoOpen || isSourcesOpen) && (
        <div className="popup-backdrop" onClick={handleBackdropClick} />
      )}
      
      <header className="chat-header">
        <div className="header-content">
          <img src={logo} alt="World Helper Logo" className="header-logo" />
        </div>
        <div className="header-buttons">
          <button 
            className="info-button"
            onClick={handleSourcesClick}
            aria-label="Sources"
          >
            <Link size={24} />
          </button>
          <button 
            className="info-button"
            onClick={handleInfoClick}
            aria-label="Information"
          >
            <Info size={24} />
          </button>
          
        </div>

        {isSourcesOpen && (
          <div className="info-popup sources-popup">
            <div className="sources-section">
              <h3>
                <img src={worldLogo} alt="" className="section-icon" />
                World Links
              </h3>
              <ul>
                <li><a href="https://world.org/" target="_blank" rel="noopener noreferrer">World.org</a></li>
                <li><a href="https://world.org/blog" target="_blank" rel="noopener noreferrer">World Blog</a></li>
                <li><a href="https://world.org/faqs" target="_blank" rel="noopener noreferrer">World FAQs</a></li>
                <li><a href="https://world.org/tech-tree" target="_blank" rel="noopener noreferrer">World Tech Tree</a></li>
                <li><a href="https://whitepaper.world.org/" target="_blank" rel="noopener noreferrer">World White Paper</a></li>
                <li><a href="https://world.org/privacy" target="_blank" rel="noopener noreferrer">Privacy</a></li>
                <li><a href="https://world.org/tos" target="_blank" rel="noopener noreferrer">Terms of Service</a></li>
              </ul>
            </div>

            <div className="sources-section">
              <h3>Social Platforms</h3>
              <ul>
                <li><a href="https://world.org/discord" target="_blank" rel="noopener noreferrer">Discord</a></li>
                <li><a href="https://x.com/worldcoin" target="_blank" rel="noopener noreferrer">𝕏/Twitter</a></li>
                <li><a href="https://youtube.com/@worldcoinofficial" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                <li><a href="https://t.me/worldcoin" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                <li><a href="https://www.linkedin.com/company/worldcoinproject" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              </ul>
            </div>

            <div className="sources-section">
              <h3>Useful Links</h3>
              <ul>
                <li><a href="https://world.org/world-id" target="_blank" rel="noopener noreferrer">World ID</a></li>
                <li><a href="https://world.org/world-app" target="_blank" rel="noopener noreferrer">World App</a></li>
                <li><a href="https://world.org/world-chain" target="_blank" rel="noopener noreferrer">World Chain</a></li>
                <li><a href="https://worldchain-mainnet.explorer.alchemy.com/" target="_blank" rel="noopener noreferrer">World Chain Explorer</a></li>
                <li><a href="https://world.org/find-orb" target="_blank" rel="noopener noreferrer">Find an Orb</a></li>
                <li><a href="https://support.worldcoin.com/" target="_blank" rel="noopener noreferrer">Help Center</a></li>
                <li><a href="https://world.org/partners" target="_blank" rel="noopener noreferrer">Partners</a></li>
                <li><a href="https://hackerone.com/toolsforhumanity" target="_blank" rel="noopener noreferrer">Bug Bounties</a></li>
                <li><a href="https://www.toolsforhumanity.com/" target="_blank" rel="noopener noreferrer">Tools For Humanity</a></li>
                <li><a href="https://foundation.world.org/" target="_blank" rel="noopener noreferrer">The World Foundation</a></li>
              </ul>
            </div>
          </div>
        )}

        {isInfoOpen && (
          <div className="info-popup">
            <h3>Disclaimer</h3>
            <p>
              World Helper is an independent, community-driven project created to provide information and assistance.
            </p>
            
            <p>
              This application is not affiliated with, endorsed by, or officially connected to the World Foundation, Tools for Humanity, or any other organizations mentioned within the app. All product names, logos, brands, trademarks, and registered trademarks are the property of their respective owners.
            </p>
            
            <p>
              Any reference to third-party products, services, or organizations is for informational purposes only and does not constitute or imply endorsement, sponsorship, or recommendation. Information provided through this app is sourced from publicly available resources and is shared under fair use principles for educational and informational purposes only.
            </p>
          </div>
        )}
      </header>

      <div className="messages-container">
      {messages.map((message, idx) => (
  <div key={idx} className={`message-wrapper ${message.sender}`}>
    <div className="message-info">
      <span className="sender-name">
        {message.sender === 'bot' ? 'World Helper' : 'You'}
      </span>
      <span className="timestamp">{message.timestamp}</span>
    </div>
    <div className={`message-bubble ${message.sender}`}>
      <div className="markdown-content">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => <LinkRenderer {...props as LinkRendererProps} />
          }}
        >
          {message.text}
        </ReactMarkdown>
      </div>
      {message.sender === 'bot' && (
        <button
          onClick={() => handleCopy(message.text, idx)}
          className="copy-button"
          aria-label="Copy message"
        >
          {copiedMessageId === idx ? (
            <span className="copied-tooltip">Copied!</span>
          ) : null}
          <Copy size={16} />
        </button>
      )}
    </div>
  </div>
))}
        
        {/* Streaming message */}
        {streamingText && (
        <div className="message-wrapper bot">
          <div className="message-info">
            <span className="sender-name">World Helper</span>
            <span className="timestamp">{getTimeString()}</span>
          </div>
          <div className="message-bubble bot">
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => <LinkRenderer {...props as LinkRendererProps} />
                }}
              >
                {streamingText}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

        {isLoading && !streamingText && (
          <div className="message-wrapper">
            <div className="message-info">
              <span className="sender-name">World Helper</span>
              <span className="timestamp">{getTimeString()}</span>
            </div>
            <div className="message-bubble bot">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            className="message-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="disclaimer">
          World Helper may be wrong. Please double check the information.
        </p>
      </form>
      
      {copyNotification.show && (
        <div className="copy-notification">
          {copyNotification.text}
        </div>
      )}
    {showConversations && (
  <div className="conversations-panel">
    <div className="conversations-header">
      <h3>Conversation History</h3>
      <button onClick={() => setShowConversations(false)} className="close-button">
        <X size={24} />
      </button>
    </div>
    
    {isLoadingConversations ? (
      <div className="conversations-loading">Loading conversations...</div>
    ) : conversationError ? (
      <div className="conversations-error">{conversationError}</div>
    ) : (
      <div className="conversations-list">
        {conversations.map((conv) => (
          <div key={conv.id} className="conversation-item">
            <div className="conversation-header">
              <span className="conversation-date">
                {new Date(conv.created_at).toLocaleDateString()}
              </span>
              <span className="conversation-source">{conv.source}</span>
            </div>
            <div className="conversation-messages">
              {conv.messages.slice(0, 2).map((msg, idx) => (
                <div key={idx} className={`conversation-message ${msg.role}`}>
                  {msg.content.substring(0, 100)}
                  {msg.content.length > 100 && '...'}
                </div>
              ))}
              {conv.messages.length > 2 && (
                <div className="conversation-more">
                  +{conv.messages.length - 2} more messages
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>
  );
};

export default Chatbot;