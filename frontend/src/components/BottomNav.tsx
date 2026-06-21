import { Home, Calendar, MessageSquare, User, Stethoscope } from 'lucide-react'

interface Props {
  active: 'home' | 'appointments' | 'messages' | 'profile'
  onTab: (tab: 'home' | 'appointments' | 'messages' | 'profile') => void
}

export default function BottomNav({ active, onTab }: Props) {
  const tabs = [
    { key: 'home', icon: Home, label: 'Home' },
    { key: 'appointments', icon: Calendar, label: 'Appointments' },
    { key: 'messages', icon: MessageSquare, label: 'Messages' },
    { key: 'profile', icon: User, label: 'Profile' },
  ] as const

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t flex items-center justify-around px-2 py-3 z-50" style={{ borderColor: '#F0F0F5' }}>
      {tabs.map(({ key, icon: Icon, label }) => {
        const isActive = active === key
        return (
          <button key={key} onClick={() => onTab(key)} className="flex flex-col items-center gap-1 px-3 py-1">
            <Icon size={22} style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium" style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }}>{label}</span>
            {isActive && <div className="w-1 h-1 rounded-full" style={{ background: '#3B5BDB' }} />}
          </button>
        )
      })}
    </div>
  )
}
