import { HIGH_SCORE_KEY } from './constants'

export function loadHighScore(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch {
    // Ignore write failures (e.g. private browsing storage quota).
  }
}
