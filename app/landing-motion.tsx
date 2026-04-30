'use client'

import { motion, type HTMLMotionProps } from 'motion/react'
import { useState, type ReactNode } from 'react'

const easeOut = [0.16, 1, 0.3, 1] as const
const navLinkVariants = {
  rest: { backgroundColor: '#FFFFFF', y: 0 },
  hover: { backgroundColor: '#DBEAFE', y: 0 },
  tap: { backgroundColor: '#FFBA07', y: 2 },
}
const navUnderlineVariants = {
  rest: { width: 0 },
  hover: { width: '100%' },
  tap: { width: '100%' },
}

type MotionSectionProps = HTMLMotionProps<'section'> & {
  children: ReactNode
}

export function MotionSection({ children, ...props }: MotionSectionProps) {
  return (
    <motion.section
      data-motion="section"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.55, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.section>
  )
}

type MotionNavLinkProps = HTMLMotionProps<'a'> & {
  href: string
  children: ReactNode
}

export function MotionNavLink({ children, className, ...props }: MotionNavLinkProps) {
  return (
    <motion.a
      data-motion="nav-link"
      className={className}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap="tap"
      variants={navLinkVariants}
      transition={{ duration: 0.16, ease: easeOut }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[4px] bg-cue-yellow"
        variants={navUnderlineVariants}
        transition={{ duration: 0.18, ease: easeOut }}
      />
    </motion.a>
  )
}

type MotionProofCardProps = HTMLMotionProps<'article'> & {
  index: number
  children: ReactNode
}

export function MotionProofCard({ index, children, ...props }: MotionProofCardProps) {
  return (
    <motion.article
      data-motion="proof-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 + index * 0.08, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.article>
  )
}

type MotionHeroLineProps = HTMLMotionProps<'span'> & {
  index: number
  children: ReactNode
}

export function MotionHeroLine({ index, children, ...props }: MotionHeroLineProps) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        data-motion="hero-line"
        className="block"
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.58, delay: 0.16 + index * 0.08, ease: easeOut }}
        {...props}
      >
        {children}
      </motion.span>
    </span>
  )
}

type MotionCollageProps = HTMLMotionProps<'div'> & {
  children: ReactNode
}

export function MotionCollage({ children, ...props }: MotionCollageProps) {
  return (
    <motion.div
      data-motion="collage"
      initial={{ opacity: 0, y: 24, rotate: -0.8 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.62, delay: 0.3, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type MotionTileProps = HTMLMotionProps<'article'> & {
  index: number
  children: ReactNode
}

export function MotionTile({ index, children, ...props }: MotionTileProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: 0.42 + index * 0.06, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.article>
  )
}

type MotionProgressCellProps = HTMLMotionProps<'span'> & {
  state: 'complete' | 'current' | 'empty'
  index: number
}

type MotionProgressTrackProps = HTMLMotionProps<'div'> & {
  children: ReactNode
}

export function MotionProgressTrack({ children, ...props }: MotionProgressTrackProps) {
  return (
    <motion.div
      role="progressbar"
      aria-label="Recall progress"
      aria-valuemin={0}
      aria-valuemax={7}
      aria-valuenow={4}
      data-motion="progress-track"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.72, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function MotionProgressCell({ state, index, ...props }: MotionProgressCellProps) {
  return (
    <motion.span
      data-testid={`progress-cell-${state}-${index}`}
      data-motion="progress-cell"
      initial={{ scaleX: 0.12, opacity: 0.35 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.24, delay: 0.76 + index * 0.07, ease: easeOut }}
      style={{ transformOrigin: 'left center' }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function RecallSlider() {
  const [value, setValue] = useState(4)

  return (
    <motion.div
      data-motion="recall-slider"
      className="w-full max-w-[320px]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.72, ease: easeOut }}
    >
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <label htmlFor="recall-confidence" className="font-display text-xs font-extrabold uppercase text-cue-yellow">
            Recall confidence
          </label>
          <div className="mt-1 text-xs font-bold uppercase text-paper-white/65">
            {value} of 7 recall checkpoints
          </div>
        </div>
        <motion.output
          htmlFor="recall-confidence"
          className="border border-cue-yellow bg-paper-white px-3 py-2 font-display text-xl font-extrabold leading-none text-ink-black"
          key={value}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          {value}
        </motion.output>
      </div>
      <input
        id="recall-confidence"
        aria-label="Recall confidence"
        aria-valuenow={value}
        type="range"
        min="0"
        max="7"
        value={value}
        onChange={(event) => setValue(Number(event.currentTarget.value))}
        className="h-3 w-full cursor-pointer accent-cue-yellow"
      />
    </motion.div>
  )
}

type MotionPressProps = HTMLMotionProps<'span'> & {
  children: ReactNode
}

export function MotionPress({ children, ...props }: MotionPressProps) {
  return (
    <motion.span
      whileHover={{ x: 2, y: 2 }}
      whileTap={{ x: 3, y: 3, scale: 0.99 }}
      transition={{ duration: 0.12 }}
      {...props}
    >
      {children}
    </motion.span>
  )
}
