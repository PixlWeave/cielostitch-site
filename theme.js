/**
 * theme.js — Dark / Light mode toggle
 *
 * Strategy:
 *  1. On load, read saved preference from localStorage.
 *  2. If none saved, honour the OS `prefers-color-scheme` setting.
 *  3. Set `data-theme` attribute on <html> accordingly.
 *  4. Every toggle click flips the theme and persists the choice.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'cielostitch-theme';
  const DARK  = 'dark';
  const LIGHT = 'light';

  /** Read the stored preference, or fall back to the OS default. */
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  /** Apply a theme to <html> and update every toggle button on the page. */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const isDark = theme === DARK;

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
    });

    // Update the large demo label if present
    const label = document.getElementById('demo-theme-name');
    if (label) {
      label.textContent = isDark ? 'Dark' : 'Light';
    }
  }

  /** Toggle between dark and light, then persist. */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === DARK ? LIGHT : DARK;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  // Apply theme immediately (before paint) to avoid a flash of wrong theme.
  applyTheme(getInitialTheme());

  // Wire up all toggle buttons once the DOM is ready.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);

      // Also allow keyboard activation via Space / Enter (already default for
      // <button>, but kept explicit for any non-button elements that might use
      // the same attribute).
      btn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleTheme();
        }
      });
    });
  });

  // ── Respect OS theme changes at runtime ──────────────────────────────────
  // Only follow the OS if the user hasn't made an explicit choice this session.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? DARK : LIGHT);
    }
  });
}());
