/**
 * SCADA-CORE UNIFEI | Client-Side Controller & Theme Manager
 * Grupo 3 - ECAA08 - Linha de Envasamento e Inspeção de Bebidas
 */

(function () {
  'use strict';

  // Gerenciamento de Tema (Dark / Light)
  const THEME_KEY = 'scada_theme_preference';

  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'dark'); // Padrão Dark SCADA

    applyTheme(theme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
      });
    });
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      updateThemeButtons('☀️ Modo Claro', '🌙 Alternar para Escuro');
    } else {
      document.documentElement.removeAttribute('data-theme');
      updateThemeButtons('🌙 Modo Escuro', '☀️ Alternar para Claro');
    }
  }

  function updateThemeButtons(currentLabel, titleText) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const iconSpan = btn.querySelector('.theme-btn-text');
      if (iconSpan) {
        iconSpan.textContent = currentLabel;
      }
      btn.setAttribute('title', titleText);
    });
  }

  // Mobile Menu Toggle
  function initMobileMenu() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (toggleBtn && navMenu) {
      toggleBtn.addEventListener('click', () => {
        navMenu.classList.toggle('open');
      });
    }
  }

  // Inicialização quando DOM estiver carregado
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
  });
})();
