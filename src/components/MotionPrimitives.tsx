import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'motion/react';

// ─── Ambient Floating Orbs ───────────────────────────────────────────
// Continuously drifting gradient orbs that create depth and movement
interface FloatingOrbProps {
  size?: number;
  color?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export const FloatingOrb: React.FC<FloatingOrbProps> = ({
  size = 200,
  color = 'var(--color-orbit-accent)',
  duration = 20,
  delay = 0,
  className = '',
}) => (
  <motion.div
    className={`absolute rounded-full pointer-events-none blur-3xl ${className}`}
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
    }}
    animate={{
      x: [0, 80, -40, 60, -20, 0],
      y: [0, -60, 40, -30, 50, 0],
      scale: [1, 1.2, 0.9, 1.15, 0.95, 1],
      opacity: [0.3, 0.5, 0.25, 0.45, 0.3, 0.3],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// ─── Ambient Gradient Mesh ───────────────────────────────────────────
// A slowly morphing background gradient that gives AI vibes
export const AmbientMesh: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <FloatingOrb size={300} color="var(--color-orbit-accent)" duration={25} delay={0} className="top-[10%] left-[5%]" />
    <FloatingOrb size={250} color="#8b5cf6" duration={30} delay={5} className="top-[60%] right-[10%]" />
    <FloatingOrb size={200} color="#06b6d4" duration={22} delay={10} className="bottom-[20%] left-[30%]" />
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
      style={{
        background:
          'conic-gradient(from 0deg, transparent, var(--color-orbit-accent)08, transparent, #8b5cf608, transparent)',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

// ─── Stagger Container & Item ────────────────────────────────────────
// Wrap children in stagger container for sequential entrance animations
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
  staggerDelay = 0.08,
  delayChildren = 0.1,
}) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
          delayChildren,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
      visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// ─── Magnetic Hover Button ───────────────────────────────────────────
// Button that subtly follows cursor on hover
interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const Magnetic: React.FC<MagneticProps> = ({ children, className = '', strength = 0.3 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
};

// ─── Glow Pulse ──────────────────────────────────────────────────────
// An element that subtly pulses with a glow effect
interface GlowPulseProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export const GlowPulse: React.FC<GlowPulseProps> = ({
  children,
  className = '',
  color = 'var(--color-orbit-accent)',
}) => (
  <motion.div
    className={`relative ${className}`}
    animate={{
      boxShadow: [
        `0 0 20px ${color}10, 0 0 40px ${color}05`,
        `0 0 30px ${color}20, 0 0 60px ${color}10`,
        `0 0 20px ${color}10, 0 0 40px ${color}05`,
      ],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.div>
);

// ─── Breathing Dot ───────────────────────────────────────────────────
// A single dot that breathes — great for status indicators / ambient feel
interface BreathingDotProps {
  size?: number;
  color?: string;
  className?: string;
}

export const BreathingDot: React.FC<BreathingDotProps> = ({
  size = 6,
  color = 'var(--color-orbit-accent)',
  className = '',
}) => (
  <motion.span
    className={`inline-block rounded-full ${className}`}
    style={{
      width: size,
      height: size,
      backgroundColor: color,
    }}
    animate={{
      scale: [1, 1.4, 1],
      opacity: [0.6, 1, 0.6],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// ─── Shimmer Text ────────────────────────────────────────────────────
// Text with a subtle moving shimmer gradient — AI-feeling
interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({ children, className = '' }) => (
  <motion.span
    className={`relative inline-block ${className}`}
    style={{
      backgroundImage:
        'linear-gradient(90deg, currentColor 0%, currentColor 40%, var(--color-orbit-accent) 50%, currentColor 60%, currentColor 100%)',
      backgroundSize: '200% 100%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
    animate={{
      backgroundPosition: ['100% 0%', '-100% 0%'],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: 'linear',
    }}
  >
    {children}
  </motion.span>
);

// ─── Scale on Tap ────────────────────────────────────────────────────
// Interactive press feedback
interface ScaleOnTapProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

export const ScaleOnTap: React.FC<ScaleOnTapProps> = ({ children, className = '', scale = 0.95 }) => (
  <motion.div
    className={className}
    whileTap={{ scale }}
    whileHover={{ scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  >
    {children}
  </motion.div>
);

// ─── Hover Lift Card ─────────────────────────────────────────────────
// Card that lifts up and gets a subtle glow on hover
interface HoverLiftProps {
  children: React.ReactNode;
  className?: string;
}

export const HoverLift: React.FC<HoverLiftProps> = ({ children, className = '' }) => (
  <motion.div
    className={className}
    whileHover={{
      y: -4,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
);

// ─── Animated List Item ──────────────────────────────────────────────
// For AnimatePresence list animations (enter/exit)
interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  layoutId?: string;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ children, className = '', layoutId }) => (
  <motion.div
    layout
    layoutId={layoutId}
    className={className}
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, x: -50, filter: 'blur(4px)' }}
    transition={{
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    }}
  >
    {children}
  </motion.div>
);

// ─── Orbit Ring Animation ────────────────────────────────────────────
// A decorative spinning ring — matches the Orbit brand
interface OrbitRingProps {
  size?: number;
  className?: string;
}

export const OrbitRing: React.FC<OrbitRingProps> = ({ size = 40, className = '' }) => (
  <motion.div className={`relative ${className}`} style={{ width: size, height: size }}>
    <motion.div
      className="absolute inset-0 border border-orbit-accent/30 rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
    <motion.div
      className="absolute inset-[25%] border border-orbit-accent/50 rounded-full"
      animate={{ rotate: -360 }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orbit-accent"
      animate={{
        scale: [1, 1.3, 1],
        boxShadow: [
          '0 0 4px var(--color-orbit-accent)',
          '0 0 12px var(--color-orbit-accent)',
          '0 0 4px var(--color-orbit-accent)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  </motion.div>
);

// ─── Typewriter Dots ─────────────────────────────────────────────────
// Three dots that animate like a typing indicator — AI thinking feel
export const TypewriterDots: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`}>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1 h-1 rounded-full bg-orbit-accent"
        animate={{
          y: [0, -4, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.15,
          ease: 'easeInOut',
        }}
      />
    ))}
  </span>
);

// ─── Slide In ────────────────────────────────────────────────────────
// Directional entrance animation
type Direction = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
}

const directionMap: Record<Direction, { x?: number; y?: number }> = {
  left: { x: -40 },
  right: { x: 40 },
  up: { y: -30 },
  down: { y: 30 },
};

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className = '',
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, ...directionMap[direction], filter: 'blur(6px)' }}
    animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
    transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

// ─── Counter Animation ──────────────────────────────────────────────
// Animates a number changing with a spring pop
interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, className = '' }) => (
  <AnimatePresence mode="popLayout">
    <motion.span
      key={value}
      className={className}
      initial={{ y: -10, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 10, opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      {value}
    </motion.span>
  </AnimatePresence>
);
