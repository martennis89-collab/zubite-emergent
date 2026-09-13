'use client'

/**
 * Apple-style vertical accordion ("Significant others" pattern on
 * apple.com/iphone): a stacked list of rows on the left — only one open
 * at a time, chevron rotates, description text animates open/closed via
 * a JS-measured max-height transition (scrollHeight always reports the
 * panel's full natural content height even while clipped by
 * overflow:hidden at max-height:0, so this animates to the right value
 * regardless of how long each description is — a CSS-only
 * grid-template-rows 0fr->1fr version of this was tried first but did
 * not reliably re-trigger per-row in testing, so this ref-based approach
 * replaced it).
 *
 * Desktop: paired with a single shared image on the right that
 * cross-fades to match whichever row is active (.taste-symptom-accordion-stage).
 * Mobile (<900px): that shared stage is hidden — each row instead carries
 * its own photo inside its own expandable panel
 * (.taste-symptom-accordion-mobile-photo), so the photo stays directly
 * below its own tab rather than in one shared area below the whole list.
 *
 * Replaces the symptom grid's TILES only (see TasteHomeOrtho.tsx) — the
 * section heading above it is untouched.
 */

import Image from 'next/image'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SymptomAccordionItem {
  label: string
  note: string
  href: string
  image: string
  icon: ComponentType<{ 'aria-hidden'?: boolean }>
}

export function SymptomAccordion({ items }: { items: SymptomAccordionItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const panelRefs = useRef<Array<HTMLDivElement | null>>([])

  // Matches apple.com's behavior: clicking a closed row opens it; clicking
  // the row that's ALREADY open closes it and advances to the next one
  // (wrapping back to the first after the last), rather than leaving
  // nothing open.
  const handleSelect = (index: number) => {
    setActiveIndex((current) => (current === index ? (index + 1) % items.length : index))
  }

  useEffect(() => {
    const applyHeights = () => {
      panelRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.maxHeight = i === activeIndex ? `${el.scrollHeight}px` : '0px'
      })
    }
    applyHeights()
    // Re-measure on resize — the mobile inline photo (hidden on desktop)
    // changes each panel's natural height when the breakpoint flips.
    window.addEventListener('resize', applyHeights)
    return () => window.removeEventListener('resize', applyHeights)
  }, [activeIndex])

  return (
    <div className="taste-symptom-accordion" data-testid="home-symptoms-accordion">
      <div className="taste-symptom-accordion-list">
        {items.map((item, index) => {
          const isActive = activeIndex === index
          return (
            <div className="taste-symptom-accordion-row" key={item.label}>
              <button
                type="button"
                className={`taste-symptom-accordion-trigger${isActive ? ' is-active' : ''}`}
                aria-expanded={isActive}
                onClick={() => handleSelect(index)}
                data-testid={`symptom-card-${index}`}
              >
                <span>{item.label}</span>
                <ChevronDown aria-hidden className="taste-symptom-accordion-chevron" />
              </button>
              <div
                className="taste-symptom-accordion-panel-wrap"
                ref={(el) => { panelRefs.current[index] = el }}
              >
                <div className="taste-symptom-accordion-panel">
                  <p>{item.note}</p>
                  <div className="taste-symptom-accordion-mobile-photo">
                    {/* Only ever visible on mobile (hidden via CSS on
                        desktop) — the accordion's 28px mobile padding
                        means it never actually spans the full viewport
                        width, hence the calc() rather than a flat 100vw. */}
                    <Image src={item.image} alt={item.label} fill sizes="calc(100vw - 56px)" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="taste-symptom-accordion-stage">
        {items.map((item, index) => (
          <Image
            key={item.label}
            src={item.image}
            alt={item.label}
            fill
            className={`taste-symptom-accordion-photo${activeIndex === index ? ' is-active' : ''}`}
            sizes="(max-width: 900px) 100vw, 45vw"
          />
        ))}
      </div>
    </div>
  )
}

export default SymptomAccordion
