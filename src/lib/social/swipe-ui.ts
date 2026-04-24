export function computeSwipeThreshold(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 160;
  }

  // Mobile and desktop friendly threshold for position-based swipes.
  const proposed = Math.round(viewportWidth * 0.35);
  return Math.min(320, Math.max(110, proposed));
}

