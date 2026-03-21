'use client'

import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce])

  return { ref, isVisible }
}

// Component wrapper for scroll animations
interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom' | 'flip'
  delay?: number
  duration?: number
  once?: boolean
}

export function ScrollReveal({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  once = true,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation({ triggerOnce: once })

  const baseStyles = {
    transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  }

  const animationStyles: Record<string, React.CSSProperties> = {
    'fade-up': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
    },
    'fade-down': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-40px)',
    },
    'fade-left': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(40px)',
    },
    'fade-right': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(-40px)',
    },
    'zoom': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.9)',
    },
    'flip': {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'perspective(1000px) rotateX(0)' : 'perspective(1000px) rotateX(-10deg)',
    },
  }

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ ...baseStyles, ...animationStyles[animation] }}
    >
      {children}
    </div>
  )
}

// Staggered children animation
interface StaggerChildrenProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  animation?: 'fade-up' | 'fade-left' | 'zoom'
}

export function StaggerChildren({
  children,
  className = '',
  staggerDelay = 100,
  animation = 'fade-up',
}: StaggerChildrenProps) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              style={{
                transition: `all 500ms cubic-bezier(0.16, 1, 0.3, 1) ${index * staggerDelay}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                  ? 'translateY(0) translateX(0) scale(1)'
                  : animation === 'fade-up'
                  ? 'translateY(30px)'
                  : animation === 'fade-left'
                  ? 'translateX(30px)'
                  : 'scale(0.95)',
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  )
}

// Parallax effect hook
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const scrolled = window.innerHeight - rect.top
      setOffset(scrolled * speed * 0.1)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return { ref, offset }
}

// Counter animation hook
export function useCountUp(end: number, duration: number = 2000, startOnVisible: boolean = true) {
  const [count, setCount] = useState(0)
  const { ref, isVisible } = useScrollAnimation()
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isVisible || (startOnVisible && hasAnimated.current)) return
    hasAnimated.current = true

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, end, duration, startOnVisible])

  return { ref, count }
}
