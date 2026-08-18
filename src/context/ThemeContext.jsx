import { createContext, useContext, useEffect, useState } from 'react'
import { ACCENT_THEMES } from '../data/accentThemes'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'command-zone-theme'
const defaultSettings = { mode: 'system', accent: 'ocean' }

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const root = document.documentElement

    function applyMode() {
      if (settings.mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      } else {
        root.setAttribute('data-theme', settings.mode)
      }
    }
    applyMode()

    if (settings.mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', applyMode)
      return () => mq.removeEventListener('change', applyMode)
    }
  }, [settings.mode])

  useEffect(() => {
    const root = document.documentElement
    const palette = ACCENT_THEMES.find((t) => t.id === settings.accent) || ACCENT_THEMES[0]
    root.style.setProperty('--accent', palette.accent)
    root.style.setProperty('--accent-secondary', palette.secondary)
    root.style.setProperty('--accent-soft', hexToRgba(palette.accent, 0.16))
    root.style.setProperty('--accent-secondary-soft', hexToRgba(palette.secondary, 0.18))
  }, [settings.accent])

  const value = {
    mode: settings.mode,
    accent: settings.accent,
    setMode: (mode) => setSettings((s) => ({ ...s, mode })),
    setAccent: (accent) => setSettings((s) => ({ ...s, accent })),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
