"use client";

import { motion } from 'framer-motion';

export default function EmptyState({ 
  icon = '📭', 
  title = 'No Data Found', 
  description = 'There is no data to display at the moment.',
  action,
  actionLabel,
  onAction
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Animated icon */}
      <motion.div
        className="text-8xl mb-6"
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {icon}
      </motion.div>
      
      {/* Title */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      
      {/* Description */}
      <motion.p
        className="text-gray-500 text-center max-w-md mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {description}
      </motion.p>
      
      {/* Action button */}
      {action && onAction && (
        <motion.button
          onClick={onAction}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {actionLabel || action}
        </motion.button>
      )}
      
      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-100 rounded-full blur-3xl opacity-20"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-20"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -20, 0],
            y: [0, 20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}
