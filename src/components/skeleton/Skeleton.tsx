/**
 * Skeleton Loading Components
 * Provides loading placeholders for better UX
 */

import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  circle?: boolean;
  width?: string;
  height?: string;
}

export function Skeleton({ 
  className = '', 
  circle = false,
  width,
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';
  const shapeClasses = circle ? 'rounded-full' : 'rounded';
  
  return (
    <div
      className={`${baseClasses} ${shapeClasses} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <Skeleton width="100%" height="200px" className="rounded-lg" />
      <Skeleton width="70%" height="24px" />
      <Skeleton width="50%" height="16px" />
      <div className="flex gap-2">
        <Skeleton width="80px" height="32px" circle />
        <Skeleton width="80px" height="32px" circle />
      </div>
    </div>
  );
}

/**
 * Place Card Skeleton
 */
export function PlaceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <Skeleton width="100%" height="180px" />
      <div className="p-4 space-y-3">
        <Skeleton width="80%" height="24px" />
        <Skeleton width="60%" height="16px" />
        <div className="flex items-center gap-2">
          <Skeleton width="100px" height="20px" circle />
          <Skeleton width="60px" height="20px" circle />
        </div>
      </div>
    </div>
  );
}

/**
 * List Skeleton
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
          <Skeleton width="60px" height="60px" circle />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height="20px" />
            <Skeleton width="60%" height="16px" />
          </div>
          <Skeleton width="80px" height="32px" circle />
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="80%" height="20px" />
        ))}
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                width={colIndex === 0 ? "90%" : "70%"} 
                height="16px" 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Profile Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-6">
        <Skeleton width="120px" height="120px" circle />
        <div className="flex-1 space-y-3">
          <Skeleton width="200px" height="28px" />
          <Skeleton width="300px" height="16px" />
          <div className="flex gap-2 pt-2">
            <Skeleton width="100px" height="36px" circle />
            <Skeleton width="100px" height="36px" circle />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Stats Skeleton
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="40px" height="40px" circle />
          </div>
          <Skeleton width="60%" height="32px" />
          <Skeleton width="50%" height="16px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="100%" height="44px" />
        </div>
      ))}
      <Skeleton width="150px" height="48px" className="mt-4" />
    </div>
  );
}

/**
 * Search Results Skeleton
 */
export function SearchResultsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton width="200px" height="24px" />
        <Skeleton width="120px" height="40px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <PlaceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Content Skeleton
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-4 max-w-3xl">
      <Skeleton width="70%" height="36px" />
      <Skeleton width="100%" height="200px" className="rounded-lg" />
      <div className="space-y-3">
        <Skeleton width="100%" height="16px" />
        <Skeleton width="100%" height="16px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="95%" height="16px" />
        <Skeleton width="85%" height="16px" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton width="60%" height="24px" />
        <Skeleton width="100%" height="16px" />
        <Skeleton width="100%" height="16px" />
        <Skeleton width="80%" height="16px" />
      </div>
    </div>
  );
}

/**
 * Skeleton Container with animation delay
 */
export function SkeletonContainer({ 
  children, 
  isLoading 
}: { 
  children: ReactNode; 
  isLoading: boolean;
}) {
  if (!isLoading) return <>{children}</>;
  
  return (
    <div className="animate-pulse">
      {children}
    </div>
  );
}
