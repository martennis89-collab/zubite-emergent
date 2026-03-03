import { useEffect, useRef, useState } from 'react';

/**
 * Hook to detect when an element enters the viewport
 * Respects prefers-reduced-motion
 */
export const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  
  const { 
    threshold = 0.1, 
    rootMargin = '0px 0px -50px 0px',
    once = true 
  } = options;

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setIsRevealed(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsRevealed(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isRevealed };
};

/**
 * Hook to reveal multiple items with stagger effect
 */
export const useStaggerReveal = (itemCount, options = {}) => {
  const containerRef = useRef(null);
  const [revealedItems, setRevealedItems] = useState([]);
  
  const { 
    threshold = 0.1, 
    rootMargin = '0px 0px -50px 0px',
    staggerDelay = 100 
  } = options;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setRevealedItems(Array.from({ length: itemCount }, (_, i) => i));
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reveal items one by one with stagger
          Array.from({ length: itemCount }).forEach((_, index) => {
            setTimeout(() => {
              setRevealedItems(prev => [...prev, index]);
            }, index * staggerDelay);
          });
          observer.unobserve(container);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [itemCount, threshold, rootMargin, staggerDelay]);

  return { containerRef, revealedItems, isItemRevealed: (index) => revealedItems.includes(index) };
};

/**
 * Component wrapper for scroll reveal
 */
export const ScrollReveal = ({ 
  children, 
  className = '', 
  delay = 0,
  direction = 'up' // up, down, left, right
}) => {
  const { ref, isRevealed } = useScrollReveal();
  
  const directionStyles = {
    up: 'translate-y-4',
    down: '-translate-y-4',
    left: 'translate-x-4',
    right: '-translate-x-4'
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? 'translate(0, 0)' : undefined
      }}
    >
      <div className={`${!isRevealed ? directionStyles[direction] : ''} transition-transform duration-500 ease-out`} style={{ transitionDelay: `${delay}ms` }}>
        {children}
      </div>
    </div>
  );
};

export default useScrollReveal;
