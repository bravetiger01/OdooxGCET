"use client";

import { motion } from 'framer-motion';

const colorVariants = {
  blue: {
    bg: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-50',
    text: 'text-blue-600'
  },
  purple: {
    bg: 'from-purple-500 to-violet-600',
    light: 'bg-purple-50',
    text: 'text-purple-600'
  },
  green: {
    bg: 'from-green-500 to-emerald-600',
    light: 'bg-green-50',
    text: 'text-green-600'
  },
  yellow: {
    bg: 'from-yellow-500 to-orange-600',
    light: 'bg-yellow-50',
    text: 'text-yellow-600'
  },
  pink: {
    bg: 'from-pink-500 to-rose-600',
    light: 'bg-pink-50',
    text: 'text-pink-600'
  },
  indigo: {
    bg: 'from-indigo-500 to-purple-600',
    light: 'bg-indigo-50',
    text: 'text-indigo-600'
  }
};

export default function StatsCard({ title, value, icon, color = "blue", trend, trendValue }) {
  const colors = colorVariants[color] || colorVariants.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </motion.div>
  );
}
