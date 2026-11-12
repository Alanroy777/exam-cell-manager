/**
 * Design Tokens for College of Engineering Poonjar - Exam Cell Manager
 * Matches official institutional styling (https://cep.ac.in/)
 */

export const THEME_TOKENS = {
  colors: {
    // Primary institutional navy
    brandNavy: '#0f0c29',
    brandNavyDark: '#080616',
    brandNavyLight: '#1a163b',
    brandNavyMuted: '#2b2752',

    // College logo accent red
    accentRed: '#dc2626',
    accentRedHover: '#b91c1c',
    accentRedLight: '#fef2f2',
    accentRedBorder: '#fca5a5',

    // Institutional slate / borders
    surface: '#ffffff',
    surfaceSubtle: '#f8fafc',
    surfaceHover: '#f1f5f9',
    surfaceActive: '#e2e8f0',
    border: '#cbd5e1',
    borderLight: '#e2e8f0',

    // Text colors
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textInverted: '#ffffff',

    // Status badges
    statusValidBg: '#f0fdf4',
    statusValidText: '#15803d',
    statusValidBorder: '#86efac',

    statusWarningBg: '#fffbeb',
    statusWarningText: '#b45309',
    statusWarningBorder: '#fde68a',

    statusErrorBg: '#fef2f2',
    statusErrorText: '#b91c1c',
    statusErrorBorder: '#fecaca',
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: '14px',
    h1: '20px',
    h2: '16px',
    h3: '14px',
    tabular: 'tabular-nums',
  },
  radius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
  },
  institution: {
    collegeName: 'COLLEGE OF ENGINEERING POONJAR',
    subtitle: 'A Unit of IHRD, Government of Kerala',
    affiliation: 'Affiliated to APJ Abdul Kalam Technological University & State Board of Technical Education',
    defaultHeader: 'COLLEGE OF ENGINEERING POONJAR\nA Unit of IHRD, Government of Kerala\nEXAMINATION CELL',
  }
} as const;

