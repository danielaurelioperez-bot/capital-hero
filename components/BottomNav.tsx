import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Target, TrendingUp, BookOpen, Settings } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Next Step', icon: Target, path: '/missions' },
    { label: 'Progress', icon: TrendingUp, path: '/progress' },
    { label: 'Coach', icon: BookOpen, path: '/story' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    // Móvil: fixed abajo. En sm+: se integra (static) y deja de “flotar”.
    <nav className="fixed sm:static inset-x-0 bottom-0 z-50 pb-safe">
      {/* Este wrapper asegura que el nav SIEMPRE mida lo mismo que tu panel */}
      <div className="mx-auto w-full min-w-0 max-w-md sm:max-w-2xl lg:max-w-4xl bg-white border-t-2 border-slate-100">
        <div className="flex justify-between items-center px-4 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full space-y-1 transition-transform active:scale-95 ${
                    isActive ? 'text-[#492582]' : 'text-slate-300 hover:text-slate-400'
                  }`
                }
                aria-label={item.label}
              >
                <Icon size={28} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
