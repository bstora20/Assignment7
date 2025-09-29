import { useState, useEffect, useRef } from 'react'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import axios from 'axios'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { formatRelativeTime } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  confidence?: number
  citations?: string[]
  timestamp: string
  isGreeting?: boolean
}

interface Assistant {
  id: string
  name: string
  greeting: string
  branding: {
    primaryColor?: string
    secondaryColor?: string
    theme?: string
  }
}

interface ChatProps {
  assistant: Assistant
  initialSessionId?: string
}

export default function Chat({ assistant }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { slug } = router.query

  // Initialize chat session
  useEffect(() => {
    initializeSession()
  }, [])

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeSession = async () => {
    try {
      const response = await axios.post(`/chat/${slug}/session`)
      setSessionId(response.data.sessionId)
      
      // Add greeting message
      setMessages([{
        id: 'greeting',
        content: assistant.greeting,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isGreeting: true
      }])
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || isLoading || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      role: 'user',
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setIsLoading(true)

    try {
      const response = await axios.post(`/chat/${slug}/message`, {
        message: newMessage,
        sessionId
      })

      const assistantMessage: Message = {
        id: response.data.message.id,
        content: response.data.message.content,
        role: 'assistant',
        confidence: response.data.message.confidence,
        citations: response.data.message.citations,
        timestamp: response.data.message.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const primaryColor = assistant.branding?.primaryColor || '#3b82f6'

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200 px-4 py-3" style={{ borderBottomColor: primaryColor + '20' }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-secondary-900">{assistant.name}</h1>
          <p className="text-sm text-secondary-600">AI Assistant • Available 24/7</p>
        </div>
      </div>

      {/* Chat container */}
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role}`}
              >
                <div className={`chat-bubble ${message.role}`} style={
                  message.role === 'user' ? { backgroundColor: primaryColor } : {}
                }>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Citations */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-secondary-200">
                      <p className="text-xs text-secondary-600 mb-1">Sources:</p>
                      <ul className="text-xs space-y-1">
                        {message.citations.map((citation, index) => (
                          <li key={index} className="text-secondary-700">• {citation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Confidence indicator */}
                  {message.confidence !== undefined && !message.isGreeting && (
                    <div className="mt-2 flex items-center text-xs text-secondary-500">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        message.confidence >= 0.8 ? 'bg-green-500' :
                        message.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      {Math.round(message.confidence * 100)}% confidence
                    </div>
                  )}
                </div>
                
                <div className={`text-xs text-secondary-500 mt-1 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {formatRelativeTime(message.timestamp)}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message assistant">
                <div className="chat-bubble assistant flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="border-t border-secondary-200 p-4 bg-white">
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading || !sessionId}
                className="flex-1 input"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={isLoading || !newMessage.trim() || !sessionId}
                className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
              </button>
            </form>
            
            <p className="text-xs text-secondary-500 mt-2 text-center">
              This assistant provides information based on available documentation. 
              For complex issues, please contact support directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string
  
  try {
    // Fetch assistant info from the public API
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/assistants/public/${slug}`)
    
    return {
      props: {
        assistant: response.data.assistant
      }
    }
  } catch (error) {
    return {
      notFound: true
    }
  }
}