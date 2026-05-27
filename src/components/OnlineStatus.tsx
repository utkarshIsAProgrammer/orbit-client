import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const OnlineStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    };
    const goOffline = () => {
      setOnline(false);
      setShow(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full text-xs font-semibold shadow-xl ${
            online ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                online ? 'bg-green-200 animate-pulse' : 'bg-red-200 animate-pulse'
              }`}
              aria-hidden="true"
            />
            {online ? 'Back online' : 'No internet connection'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
