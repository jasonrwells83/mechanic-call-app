import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Calendar, 
  Briefcase, 
  Phone, 
  Users, 
  BarChart3, 
  Settings,
  Wrench
} from 'lucide-react';

const navigationItems = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
    description: 'Today\'s overview and KPIs'
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: '2-bay scheduler'
  },
  {
    title: 'Jobs',
    href: '/jobs',
    icon: Briefcase,
    description: 'Job management and kanban'
  },
  {
    title: 'Calls',
    href: '/calls',
    icon: Phone,
    description: 'Call intake and management'
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    description: 'Customer and vehicle records'
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    description: 'Analytics and exports'
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Shop configuration'
  },
];

export function LeftNavigation() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Shop Logo/Title */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-md">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Shop OS</span>
            <span className="text-xs text-muted-foreground">2-Bay System</span>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground"
                  )}
                  title={item.description}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Status Indicator */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span>System Online</span>
        </div>
      </div>
    </div>
  );
}











