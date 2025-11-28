import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

// Import the auth service
const API_BASE_URL = 'http://localhost:8000';

// Auth service functions
const authAPI = {
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },
  
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/api/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },
  
  logout: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });
    return response.json();
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/check-auth/`, {
      headers: {
        'Authorization': `Token ${token}`,
      },
    });
    return response.json();
  }
};

// Auth Form Component
function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

// Auth Form Component - Update the API calls inside handleSubmit
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        let response;
        if (isLogin) {
            // UPDATE THIS LINE:
            response = await fetch('http://localhost:8000/api/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                }),
            });
        } else {
            // UPDATE THIS LINE:
            response = await fetch('http://localhost:8000/api/signup/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong');
        }
        
        const data = await response.json();
        
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            id: data.user_id,
            username: data.username,
            email: data.email
        }));
        
        onAuthSuccess(data);
    } catch (error) {
        setError(error.message || 'Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to your account' : 'Sign up for a new account'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          )}
          
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <input
                type="password"
                name="confirm_password"
                placeholder="Confirm password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="switch-button"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Chat Component (your existing chat logic)
function ChatInterface({ user, onLogout }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Initialize session on component mount
  useEffect(() => {
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
        setError(null)
        console.log('Initializing session...')
        
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }
        
        // UPDATED URL:
        const response = await fetch('http://localhost:8000/api/sessions/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({}),
        })

        console.log('Session response status:', response.status)
        
        if (response.ok) {
            const data = await response.json()
            console.log('Session created:', data)
            setSessionId(data.session_id)
            
            // Load any existing messages for this session
            await loadSessionMessages(data.session_id)
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
    } catch (error) {
        console.error('Error initializing session:', error)
        setError(error.message)
    }
}

  const loadSessionMessages = async (sessionId) => {
    try {
        console.log('Loading messages for session:', sessionId)
        // UPDATED URL:
        const response = await fetch(`http://localhost:8000/api/sessions/get_messages/?session_id=${sessionId}`)
        console.log('Messages response status:', response.status)
        
        if (response.ok) {
            const data = await response.json()
            console.log('Messages loaded:', data)
            if (data.messages && data.messages.length > 0) {
                const formattedMessages = data.messages.map(msg => ({
                    text: msg.message,
                    sender: msg.is_user ? 'user' : 'bot',
                    timestamp: msg.timestamp
                }))
                setMessages(formattedMessages)
            }
        } else {
            console.warn('Failed to load messages, continuing with empty chat...')
        }
    } catch (error) {
        console.error('Error loading messages:', error)
        // Don't set error here, just continue with empty chat
    }
}

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) {
        console.log('Cannot send message - no input or session ID')
        return
    }

    const userMessage = { text: inputMessage, sender: 'user' }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError(null)
    setIsStreaming(true)
    setStreamingMessage('')

    try {
        console.log('Sending message to session:', sessionId)
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }
        
        // UPDATED URL:
        const response = await fetch('http://localhost:8000/api/sessions/send_message/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                session_id: sessionId,
                message: inputMessage
            }),
        })

        console.log('Send message response status:', response.status)
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Bot response received:', data)
        
        const botResponse = data.bot_message?.message || data.response || 'No response message found'
        
        // Simulate streaming effect
        let displayedText = ''
        for (let i = 0; i < botResponse.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 15))
            displayedText += botResponse[i]
            setStreamingMessage(displayedText)
        }
        
        // Add final message to chat
        const botMessage = { 
            text: botResponse, 
            sender: 'bot' 
        }
        setMessages(prev => [...prev, botMessage])
        
    } catch (error) {
        console.error('Error sending message:', error)
        setError(error.message)
        const errorMessage = { 
            text: `Sorry, I encountered an error: ${error.message}`, 
            sender: 'bot' 
        }
        setMessages(prev => [...prev, errorMessage])
    } finally {
        setIsLoading(false)
        setIsStreaming(false)
        setStreamingMessage('')
    }
}

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
    setIsStreaming(false)
    setStreamingMessage('')
    initializeSession()
  }

  const retryConnection = () => {
    setError(null)
    initializeSession()
  }

  const getStatusMessage = () => {
    if (sessionId) return '✓ Active'
    if (error) return '⚠️ Error'
    return '✗ Loading...'
  }

  // Markdown renderer components
  const MarkdownComponents = {
    p: ({ children }) => <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>{children}</p>,
    strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#2c3e50' }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
    ul: ({ children }) => <ul style={{ 
      margin: '12px 0', 
      paddingLeft: '24px',
      listStyleType: 'disc' 
    }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ 
      margin: '12px 0', 
      paddingLeft: '24px',
      listStyleType: 'decimal' 
    }}>{children}</ol>,
    li: ({ children }) => <li style={{ 
      marginBottom: '6px',
      lineHeight: '1.5' 
    }}>{children}</li>,
    code: ({ children }) => <code style={{
      background: 'rgba(102, 126, 234, 0.1)',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '0.9em',
      fontFamily: 'Monaco, Consolas, monospace'
    }}>{children}</code>,
    pre: ({ children }) => <pre style={{
      background: 'rgba(0, 0, 0, 0.05)',
      padding: '16px',
      borderRadius: '8px',
      overflowX: 'auto',
      fontSize: '0.9em',
      fontFamily: 'Monaco, Consolas, monospace',
      margin: '16px 0'
    }}>{children}</pre>,
    blockquote: ({ children }) => <blockquote style={{
      borderLeft: '4px solid #667eea',
      paddingLeft: '16px',
      margin: '16px 0',
      color: '#666',
      fontStyle: 'italic'
    }}>{children}</blockquote>
  }

  const renderMessageContent = (text, sender) => {
    if (sender === 'user') {
      return text
    }
    
    return (
      <ReactMarkdown components={MarkdownComponents}>
        {text}
      </ReactMarkdown>
    )
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-left">
            <h1>AI Chat Bot</h1>
            <div className="user-info">
              <span>Welcome, {user.username}!</span>
            </div>
          </div>
          <div className="header-right">
            <div className="session-status">
              <div className="status-dot"></div>
              Session: {getStatusMessage()}
              {sessionId && <div className="session-id">ID: {sessionId.substring(0, 8)}...</div>}
            </div>
            <button className="clear-chat-btn" onClick={clearChat}>
              New Chat
            </button>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
        
        <div className="messages-container">
          <div className="welcome-message">
            <p>Hello! I'm your Gemini AI assistant.</p>
            <p>How can I help you today?</p>
            
            {error && (
              <div className="error-message">
                <p><strong>Connection Error:</strong> {error}</p>
                <button onClick={retryConnection} className="retry-btn">
                  Retry Connection
                </button>
              </div>
            )}
          </div>
          
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              {renderMessageContent(message.text, message.sender)}
            </div>
          ))}
          
          {isStreaming && (
            <div className="message bot-message streaming-message">
              <div className="typing-animation">
                <ReactMarkdown components={MarkdownComponents}>
                  {streamingMessage}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {isLoading && !isStreaming && (
            <div className="message bot-message loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={sessionId ? "Type your message..." : "Initializing..."}
            disabled={isLoading || !sessionId}
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !inputMessage.trim() || !sessionId}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        // Verify token is still valid
        const response = await authAPI.checkAuth();
        setUser(response.user);
      }
    } catch (error) {
      console.log('Not authenticated or token expired');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser({
      id: userData.user_id,
      username: userData.username,
      email: userData.email
    });
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <ChatInterface user={user} onLogout={handleLogout} />
      ) : (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App