import { Home, Calendar, MessageSquare, User } from 'lucide-react'

type Tab = 'home' | 'appointments' | 'messages' | 'profile'

interface Props {
  active: Tab
  onTab: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
}

export default function BottomNav({ active, onTab, badges = {} }: Props) {
  const tabs = [
    { key: 'home' as Tab, icon: Home, label: 'Home' },
    { key: 'appointments' as Tab, icon: Calendar, label: 'Appointments' },
    { key: 'messages' as Tab, icon: MessageSquare, label: 'Messages' },
    { key: 'profile' as Tab, icon: User, label: 'Profile' },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t flex items-center justify-around px-2 py-3 z-50" style={{ borderColor: '#F0F0F5' }}>
      {tabs.map(({ key, icon: Icon, label }) => {
        const isActive = active === key
        const badge = badges[key] ?? 0
        return (
          <button key={key} onClick={() => onTab(key)} className="relative flex flex-col items-center gap-1 px-3 py-1">
            <Icon size={22} style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }} strokeWidth={isActive ? 2.5 : 1.8} />
            {badge > 0 && (
              <span className="absolute -top-0.5 right-1.5 min-w-[16px] h-4 rounded-full text-white flex items-center justify-center font-bold"
                style={{ background: '#EF4444', fontSize: 9, padding: '0 3px' }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <span className="text-[10px] font-medium" style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }}>{label}</span>
            {isActive && <div className="w-1 h-1 rounded-full" style={{ background: '#3B5BDB' }} />}
          </button>
        )
      })}
    </div>
  )
}
