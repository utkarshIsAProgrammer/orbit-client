import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.5 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[calc(100%-2rem)] sm:w-full max-w-md"
          >
            <div className="bg-orbit-card border border-orbit-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 id="modal-title" className="text-lg font-display font-semibold text-white">
                  {title}
                </h3>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-orbit-muted hover:text-white transition-colors p-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {description && <p className="text-orbit-muted text-sm leading-relaxed mb-6">{description}</p>}

              {children}

              {(onConfirm || cancelText) && (
                <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-black/30 hover:bg-black/50 text-white font-semibold rounded-full px-3 sm:px-4 py-2.5 transition-all text-[11px] sm:text-sm shrink-0"
                    aria-label={cancelText}
                  >
                    {cancelText}
                  </motion.button>
                  {onConfirm && (
                    <motion.button
                      onClick={onConfirm}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-1 font-semibold rounded-full px-3 sm:px-4 py-2.5 transition-all text-[11px] sm:text-sm ${
                        variant === 'danger'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-orbit-accent hover:opacity-90 text-orbit-accent-foreground'
                      }`}
                    >
                      {confirmText}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
