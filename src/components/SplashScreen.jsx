import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // Usamos style para forzar el color de fondo a beige directamente, ignorando el tema
      style={{ backgroundColor: 'var(--panel)' }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <img 
          src="https://i.imgur.com/PO0c4Td.png" 
          alt="Freraut Invest Logo"
          className="w-48 h-48 mx-auto mb-6 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'block';
          }}
        />
        <div style={{ display: 'none' }} className="fallback-logo">
          <motion.h1
            className="text-5xl font-bold mb-2"
            style={{ color: '#C9A227' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            FRERAUT INVEST
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-400"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Investment Dashboard
          </motion.p>
        </div>
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-1 mx-auto mt-8 rounded-full"
          style={{ backgroundColor: '#C9A227' }}
        />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;