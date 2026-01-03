"use client";

import { motion } from 'framer-motion';

export default function Card({ children, className = "", hover = true, gradient = false }) {
  const baseClasses = gradient
    ? "bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border border-gray-100"
    : "bg-white rounded-2xl shadow-sm border border-gray-100";

  if (hover) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`${baseClasses} hover:shadow-lg transition-shadow duration-300 ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </motion.div>
  );
}
