import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { getAppointmentMessages } from '../api'

interface Msg {
  _id: string
  sender: { _id: string; name: string; role: string }
  text: string
  createdAt: string
}

interface Props {
  appointmentId: string
  appointmentLabel: string
  currentUserId: string
  token: string
  onBack: () => void
}

export default function ChatScreen({ appointmentId, appointmentLabel, currentUserId, token, onBack }: Props) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load history
    getAppointmentMessages(appointmentId)
      .then((msgs: any) => setMessages(msgs))
      .catch(() => {})

    // Connect socket
    const socket = io('http://localhost:5000', { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join', appointmentId)
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('message', (msg: Msg) => {
      setMessages(prev => [...prev, msg])
    })

    return () => { socket.disconnect() }
  }, [appointmentId, token])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || !socketRef.current) return
    socketRef.current.emit('message', { appointmentId, text })
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3 flex-shrink-0" style={{ background: '#EBF0FF' }}>
        <button onClick={onBack}><X size={20} style={{ color: '#3B5BDB' }} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate" style={{ color: '#1B1B2F' }}>{appointmentLabel}</h2>
          <p className="text-xs" style={{ color: connected ? '#10B981' : '#9CA3AF' }}>
            {connected ? 'Connected' : 'Connecting…'}
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map(m => {
          const isMe = m.sender?._id === currentUserId
          return (
            <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!isMe && (
                  <p className="text-xs font-medium mb-0.5 px-1" style={{ color: '#6B7280' }}>
                    {m.sender?.name}
                  </p>
                )}
                <div className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: isMe ? '#3B5BDB' : '#F3F4F6',
                    color: isMe ? '#fff' : '#1B1B2F',
                    borderBottomRightRadius: isMe ? 4 : undefined,
                    borderBottomLeftRadius: isMe ? undefined : 4,
                  }}>
                  {m.text}
                </div>
                <p className="text-xs mt-0.5 px-1" style={{ color: '#9CA3AF' }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2 flex items-center gap-2" style={{ background: '#fff', borderTop: '1px solid #F0F0F5' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          className="flex-1 input-field text-sm"
          style={{ paddingLeft: '1rem', paddingTop: '0.6rem', paddingBottom: '0.6rem' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: input.trim() ? '#3B5BDB' : '#E5E7EB' }}>
          <Send size={16} color={input.trim() ? 'white' : '#9CA3AF'} />
        </button>
      </div>
    </div>
  )
}
