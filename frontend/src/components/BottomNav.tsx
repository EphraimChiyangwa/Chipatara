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
    { key: 'appointments' as Tab, icon: Calendar, label: 'Visits' },
    { key: 'messages' as Tab, icon: MessageSquare, label: 'Chat' },
    { key: 'profile' as Tab, icon: User, label: 'Profile' },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-50"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map(({ key, icon: Icon, label }) => {
          const isActive = active === key
          const badge = badges[key] ?? 0
          return (
            <button key={key} onClick={() => onTab(key)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all"
              style={{ background: isActive ? '#EBF0FF' : 'transparent', minWidth: 64 }}>
              <div className="relative">
                <Icon size={20}
                  style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }}
                  strokeWidth={isActive ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: 8, padding: '0 3px' }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? '#3B5BDB' : '#9CA3AF' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
