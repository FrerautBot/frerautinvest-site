import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CallToAction = () => {
  const { toast } = useToast();

  const handleCtaClick = () => {
    toast({
      title: "🚧 Esta caracteristica aun no esta implementada",
      description: "!Pero no te preocupes! Puedes solicitarla en tu proximo prompt. 🚀",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-gradient-to-r from-gold-primary to-gold-accent text-black rounded-xl p-8 text-center shadow-lg mt-12"
    >
      <h2 className="text-3xl font-bold mb-4">?Listo para invertir?</h2>
      <p className="text-lg mb-6">Let's turn your ideas into reality.</p>
      <Button
        onClick={handleCtaClick}
        className="bg-black text-gold-primary hover:bg-gray-800 hover:text-gold-accent transition-colors duration-300 px-8 py-3 rounded-lg text-lg font-semibold"
      >
        Comienza Ahora
      </Button>
    </motion.div>
  );
};

export default CallToAction;