'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { label: 'Explore', href: '/', icon: 'explore' },
    { label: 'Identify', href: '/identify', icon: 'center_focus_strong', isAction: true },
    { label: 'Missions', href: '/missions', icon: 'hiking' },
    { label: 'Journal', href: '/journal', icon: 'book_2' },
  ];

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f2fcf4]/95 backdrop-blur-md border-t border-[#e5e0d3] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(41,50,45,0.08)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Identify nature specimen"
                aria-current={isActive ? 'page' : undefined}
                className="relative -top-4 flex flex-col items-center group min-w-[56px] min-h-[44px]"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md border-4 border-[#f2fcf4] transition-transform group-active:scale-95 hover:bg-primary-container">
                  <span className="material-symbols-outlined text-[26px] sm:text-[28px]">{item.icon}</span>
                </div>
                <span className="text-[11px] font-semibold tracking-tight text-primary mt-0.5">
                  Identify
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[48px] min-h-[44px] ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
