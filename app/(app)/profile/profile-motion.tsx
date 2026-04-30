'use client'

import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

const easeOut = [0.16, 1, 0.3, 1] as const

type IndexedDivProps = HTMLMotionProps<'div'> & {
  index: number
  children: ReactNode
}

export function ProfilePanel({ index, children, ...props }: IndexedDivProps) {
  return (
    <motion.div
      data-motion="profile-panel"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.42, delay: index * 0.05, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ProfileSummaryTile({ index, children, ...props }: IndexedDivProps) {
  return (
    <motion.div
      data-motion="profile-summary-tile"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.28, delay: 0.1 + index * 0.05, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type ProfileChoiceProps = HTMLMotionProps<'button'> & {
  index: number
  children: ReactNode
}

export function ProfileChoice({ index, children, ...props }: ProfileChoiceProps) {
  return (
    <motion.button
      data-motion="profile-choice"
      whileHover={{ y: -2 }}
      whileTap={{ x: 2, y: 2, scale: 0.98 }}
      transition={{ duration: 0.12, delay: index * 0.01 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
