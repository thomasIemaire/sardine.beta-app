import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'app:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.loadTheme());

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.applyTheme(this.theme());
    this.mediaQuery.addEventListener('change', () => {
      if (this.theme() === 'system') this.applyToDom(this.mediaQuery.matches);
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const dark = theme === 'dark' || (theme === 'system' && this.mediaQuery.matches);
    this.applyToDom(dark);
  }

  private applyToDom(dark: boolean): void {
    document.documentElement.classList.toggle('dark-mode', dark);
  }

  private loadTheme(): Theme {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark';
  }
}
