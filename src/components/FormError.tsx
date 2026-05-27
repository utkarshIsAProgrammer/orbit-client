import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface FormErrorProps {
  message?: string;
  duration?: number;
}

export default function FormError({ message, duration = 4000 }: FormErrorProps) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (message) {
      const showTimer = setTimeout(() => setVisible(true), 0);
      const hideTimer = setTimeout(() => setVisible(false), duration);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      const hideTimer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(hideTimer);
    }
  }, [message, duration]);

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-rose-400 text-[9px] md:text-[11px] font-medium mt-1 md:mt-1.5"
        >
          {message.length > 50 ? `${message.slice(0, 50)}...` : message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
