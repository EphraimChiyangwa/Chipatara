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
    <div className="bottom-nav-float">
      <div className="flex items-center justify-around">
        {tabs.map(({ key, icon: Icon, label }) => {
          const isActive = active === key
          const badge = badges[key] ?? 0
          return (
            <button
              key={key}
              onClick={() => onTab(key)}
              className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-[20px] transition-all"
              style={{
                background: isActive ? 'rgba(59,91,219,0.10)' : 'transparent',
                minWidth: 68,
                transition: 'all 0.35s cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute top-1.5 left-1/2"
                  style={{
                    transform: 'translateX(-50%)',
                    width: 18,
                    height: 3,
                    borderRadius: 99,
                    background: '#3B5BDB',
                    opacity: 0.7,
                    display: 'block',
                  }}
                />
              )}
              <div className="relative mt-1">
                <Icon
                  size={20}
                  style={{
                    color: isActive ? '#3B5BDB' : '#9CA3AF',
                    transition: 'color 0.25s ease, transform 0.35s cubic-bezier(0.32,0.72,0,1)',
                    transform: isActive ? 'scale(1.12)' : 'scale(1)',
                  }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: 8, padding: '0 3px' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: isActive ? '#3B5BDB' : '#9CA3AF',
                  transition: 'color 0.25s ease',
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
