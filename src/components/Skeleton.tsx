import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  width?: string;
  height?: string;
}

export function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg'
  };

  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%')
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function PlaceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton variant="rect" height="192px" />
      <div className="p-4 space-y-3">
        <Skeleton width="70%" height="20px" />
        <Skeleton width="50%" height="16px" />
        <div className="flex gap-2">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="60px" height="24px" />
        </div>
      </div>
    </div>
  );
}

export function PlaceDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Image */}
      <Skeleton variant="rect" height="400px" />
      
      {/* Title */}
      <div className="space-y-3">
        <Skeleton width="60%" height="32px" />
        <Skeleton width="40%" height="20px" />
      </div>
      
      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} variant="rect" height="80px" />
        ))}
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <Skeleton width="100%" height="16px" />
        <Skeleton width="95%" height="16px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="85%" height="16px" />
      </div>
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="flex-1">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="80px" height="12px" />
        </div>
      </div>
      <Skeleton width="100%" height="14px" />
      <Skeleton width="90%" height="14px" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-xl">
          <Skeleton variant="rect" width="80px" height="80px" className="rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="16px" />
            <Skeleton width="30%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 space-y-2">
          <Skeleton width="50%" height="14px" />
          <Skeleton width="70%" height="28px" />
        </div>
      ))}
    </div>
  );
}
