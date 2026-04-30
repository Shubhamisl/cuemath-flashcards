'use client'

import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

const easeOut = [0.16, 1, 0.3, 1] as const

type IndexedMotionDivProps = HTMLMotionProps<'div'> & {
  index: number
  children: ReactNode
}

export function ProgressPanel({ index, children, ...props }: IndexedMotionDivProps) {
  return (
    <motion.div
      data-motion="progress-panel"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.46, delay: index * 0.05, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ProgressStatTile({ index, children, ...props }: IndexedMotionDivProps) {
  return (
    <motion.div
      data-motion="progress-stat"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type ProgressBarProps = HTMLMotionProps<'div'> & {
  index: number
  height: number
  label: string
}

export function ProgressBar({ index, height, label, style, ...props }: ProgressBarProps) {
  return (
    <motion.div
      data-motion="progress-bar"
      aria-label={label}
      initial={{ height: 18, opacity: 0.45, scaleX: 0.72 }}
      whileInView={{ height, opacity: 1, scaleX: 1 }}
      viewport={{ once: true, amount: 0.55 }}
      transition={{ duration: 0.42, delay: 0.08 + index * 0.045, ease: easeOut }}
      style={{ transformOrigin: 'bottom center', ...style }}
      {...props}
    />
  )
}

type ProgressHeatCellProps = HTMLMotionProps<'div'> & {
  index: number
}

export function ProgressHeatCell({ index, ...props }: ProgressHeatCellProps) {
  return (
    <motion.div
      data-motion="progress-heat-cell"
      initial={{ opacity: 0, scale: 0.35 }}
      whileInView={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.18, zIndex: 2 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.006, 0.5), ease: easeOut }}
      {...props}
    />
  )
}

export function ProgressListItem({ index, children, ...props }: IndexedMotionDivProps) {
  return (
    <motion.div
      data-motion="progress-list-item"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      whileHover={{ x: 3 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
