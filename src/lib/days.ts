export interface DayTheme {
  file: string
  name: string
  mood: string
  accent: string
  accent2: string
  glow: string
  confetti: string[]
}

/** Индекс 0 = понедельник. Палитры сняты с фоновых фотографий каждого дня. */
export const DAY_THEMES: DayTheme[] = [
  { file: 'monday', name: 'Понедельник', mood: 'Энергичный старт', accent: '#ffc21a', accent2: '#1e6fd9', glow: '#5cc8ff', confetti: ['#ffc21a', '#ff3b3b', '#7ed321', '#5cc8ff'] },
  { file: 'tuesday', name: 'Вторник', mood: 'Тропический заряд', accent: '#ff8a1f', accent2: '#0fb3c9', glow: '#6fe7ff', confetti: ['#ff8a1f', '#ffb347', '#0fb3c9', '#ffffff'] },
  { file: 'wednesday', name: 'Среда', mood: 'Свежесть и рост', accent: '#6ccb2f', accent2: '#0e9f7e', glow: '#b8f56a', confetti: ['#6ccb2f', '#ffd21f', '#0e9f7e', '#c8ff8a'] },
  { file: 'thursday', name: 'Четверг', mood: 'Яркие мечты', accent: '#ff3d9a', accent2: '#8b3dff', glow: '#d9a6ff', confetti: ['#ff3d9a', '#8b3dff', '#ffb3e0', '#7fb8ff'] },
  { file: 'friday', name: 'Пятница', mood: 'Золотой финиш', accent: '#ffb000', accent2: '#e86a00', glow: '#ffe08a', confetti: ['#ffb000', '#ffd65c', '#e86a00', '#5cc8ff'] },
  { file: 'saturday', name: 'Суббота', mood: 'Радуга выходных', accent: '#ff4d4d', accent2: '#2a7bff', glow: '#ffe14d', confetti: ['#ff4d4d', '#ff8a1f', '#ffd21f', '#4cbf2a', '#2a7bff', '#8b3dff'] },
  { file: 'sunday', name: 'Воскресенье', mood: 'Спокойствие и отдых', accent: '#4fb3f2', accent2: '#ff9f7a', glow: '#bfe6ff', confetti: ['#ffe27a', '#ffb89a', '#9ad6ff', '#a8e6a0'] },
]

export const bgUrl = (i: number, tiny = false) => `/bg/${DAY_THEMES[i].file}${tiny ? '-tiny' : ''}.webp`

export const HABIT_COLORS = ['#ffc21a', '#ff8a1f', '#ff4d4d', '#ff3d9a', '#8b3dff', '#4f46e5', '#2a7bff', '#0fb3c9', '#0e9f7e', '#6ccb2f', '#a16207', '#6b7280']

export const HABIT_ICONS = [
  '💧', '📚', '🏃', '🧘', '🍎', '🥗', '💤', '🦷', '💊', '🚭', '🍷', '📵',
  '✍️', '🎨', '🎸', '🧠', '💻', '📝', '🧹', '🪴', '🐶', '💰', '🚶', '🚴',
  '🏋️', '🏊', '☀️', '🌙', '❤️', '😊', '🙏', '📞', '🧴', '🥛', '☕', '🎯',
]
