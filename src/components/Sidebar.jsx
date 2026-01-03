"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Settings,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, hasPermission } = useApp();

  // Define menu items with required permissions
  const allMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
    { name: user?.role === 'Employee' ? 'My Profile' : 'Employees', path: '/employees', icon: Users, permission: 'view_employees' },
    { name: user?.role === 'Employee' ? 'My Attendance' : 'Attendance', path: '/attendance', icon: Clock, permission: 'view_attendance' },
    { name: user?.role === 'Employee' ? 'Time Off' : 'Leaves', path: '/leaves', icon: Calendar, permission: 'view_leaves' },
    { name: 'Approvals', path: '/approvals', icon: CheckCircle, permission: 'view_approvals' },
    { name: 'Payroll', path: '/payroll/run', icon: DollarSign, permission: 'view_payroll' },
    { name: 'Reports', path: '/reports', icon: FileText, permission: 'view_reports' },
    { name: 'Settings', path: '/settings', icon: Settings, permission: 'view_settings' },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => hasPermission(item.permission));

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white border-r border-gray-100
          flex flex-col shadow-xl lg:shadow-none
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">DayFlow</h1>
              <p className="text-sm text-gray-500 mt-1">{user?.role || 'HR Management'}</p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <motion.li
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    href={item.path}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200 group relative overflow-hidden
                      ${active
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl"
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 relative z-10 ${active ? 'text-white' : 'text-gray-500 group-hover:text-cyan-600'}`} />
                    <span className={`font-medium relative z-10 ${active ? 'text-white' : 'group-hover:text-gray-900'}`}>
                      {item.name}
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'user@DayFlow.com'}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 text-center mt-3">
            © 2025 DayFlow India
          </div>
        </div>
      </aside>
    </>
  );
}
