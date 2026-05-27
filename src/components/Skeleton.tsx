import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
  ariaLabel?: string;
}

export const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
  ariaLabel = 'Loading',
}: SkeletonProps) => {
  const baseClass = 'bg-white/5 rounded overflow-hidden relative';
  const variantClass = {
    text: 'h-3 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];

  const style: React.CSSProperties = {
    width: width ?? (variant === 'circular' ? 40 : '100%'),
    height: height ?? (variant === 'text' ? 12 : variant === 'circular' ? 40 : 100),
  };

  const shimmer = (
    <div className={`${baseClass} ${variantClass} ${className}`} style={style} role="status" aria-label={ariaLabel}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );

  if (count === 1) return shimmer;

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${baseClass} ${variantClass} ${className}`} style={style}>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
          />
        </div>
      ))}
    </div>
  );
};

// Convenience components
export const SkeletonCard = () => (
  <div
    className="bg-orbit-card border border-orbit-border rounded-2xl p-5 space-y-3"
    role="status"
    aria-label="Loading card"
  >
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" />
        <Skeleton width="25%" />
      </div>
    </div>
    <Skeleton count={3} />
    <Skeleton width="60%" />
  </div>
);

export const SkeletonFeed = ({ count = 5 }: { count?: number }) => (
  <div role="group" aria-label="Loading feed" className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonProfile = () => (
  <div className="space-y-6" role="status" aria-label="Loading profile">
    <div className="h-48 bg-white/5 rounded-xl" />
    <div className="flex items-center gap-4 px-4">
      <Skeleton variant="circular" width={80} height={80} />
      <div className="flex-1 space-y-2">
        <Skeleton width="50%" height={20} />
        <Skeleton width="30%" />
      </div>
    </div>
    <div className="px-4 space-y-2">
      <Skeleton count={3} />
    </div>
  </div>
);
