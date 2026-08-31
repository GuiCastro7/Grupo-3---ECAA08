/**
 * SCADA-CORE UNIFEI | Interactive Simulator, Slide Deck & Inference Engine (Etapa 01)
 * Grupo 3 - ECAA08 - Linha de Envasamento e Inspeção de Bebidas
 */

(function () {
  'use strict';

  // --- 1. APRESENTAÇÃO EXECUTIVA EM 15 SLIDES ---
  let currentSlide = 1;
  const TOTAL_SLIDES = 15;

  function initSlideDeck() {
    const prevBtn = document.getElementById('btn-slide-prev');
    const nextBtn = document.getElementById('btn-slide-next');

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => changeSlide(-1));
      nextBtn.addEventListener('click', () => changeSlide(1));
    }

    // Atalhos de teclado (setas esquerda e direita)
    document.addEventListener('keydown', (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        changeSlide(-1);
      } else if (e.key === 'ArrowRight') {
        changeSlide(1);
      }
    });

    updateSlideUI();
  }

  function changeSlide(direction) {
    const newSlide = currentSlide + direction;
    if (newSlide >= 1 && newSlide <= TOTAL_SLIDES) {
      currentSlide = newSlide;
      updateSlideUI();
    }
  }

  function updateSlideUI() {
    const slideItems = document.querySelectorAll('.slide-item');
    slideItems.forEach(item => {
      const num = parseInt(item.getAttribute('data-slide'), 10);
      item.classList.toggle('active', num === currentSlide);
    });

    const counterDisplay = document.getElementById('slide-counter-display');
    if (counterDisplay) {
      counterDisplay.textContent = `Slide ${currentSlide} de ${TOTAL_SLIDES}`;
    }

    const progressFill = document.getElementById('slide-progress-fill');
    if (progressFill) {
      const percentage = (currentSlide / TOTAL_SLIDES) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    const prevBtn = document.getElementById('btn-slide-prev');
    const nextBtn = document.getElementById('btn-slide-next');

    if (prevBtn) prevBtn.disabled = (currentSlide === 1);
    if (nextBtn) nextBtn.disabled = (currentSlide === TOTAL_SLIDES);
  }

  // --- 2. CONTROLE DE ABAS TÉCNICAS ---
  function initTabs() {
    const tabBtns = document.querySelectorAll('.scada-tab-btn');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        activateTab(targetId);
      });
    });
  }

  function activateTab(tabId) {
    const tabBtns = document.querySelectorAll('.scada-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-target') === tabId);
    });

    tabPanes.forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });
  }

  // --- 3. INTEGRAÇÃO DOS BOTÕES CTA DA HERO SECTION ---
  function initHeroCTA() {
    const btnSlides = document.getElementById('cta-btn-slides');
    const btnSim = document.getElementById('cta-btn-sim');
    const btnDocs = document.getElementById('cta-btn-docs');

    if (btnSlides) {
      btnSlides.addEventListener('click', () => {
        const slideSec = document.getElementById('section-slides');
        if (slideSec) {
          slideSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (btnSim) {
      btnSim.addEventListener('click', () => {
        activateTab('tab-simulador');
        const simPane = document.getElementById('tab-simulador');
        if (simPane) {
          simPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (btnDocs) {
      btnDocs.addEventListener('click', () => {
        activateTab('tab-memorial-consolidado');
        const docsPane = document.getElementById('tab-memorial-consolidado');
        if (docsPane) {
          docsPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  // --- 4. BASE DE CONHECIMENTO & REGRAS (CLÁUSULAS DE HORN) ---
  const KNOWLEDGE_BASE = [
    {
      id: 'R-01',
      antecedents: ['p_max1', 'q_max1'],
      consequent: 'SOBRECARGA_LINHA_ALIMENTACAO',
      desc: 'Sobrecarga de Pressão e Vazão na Entrada da Linha',
      severity: 'CRÍTICA',
      pop: 'POP-SIS-01: Cortar alimentação, parar bomba BC1 e fechar VS1'
    },
    {
      id: 'R-02',
      antecedents: ['SOBRECARGA_LINHA_ALIMENTACAO', 'y_valv1'],
      consequent: 'TRIP_BLOQUEIO_EMERGENCIA',
      desc: 'Falha de Alívio com Válvula Principal VS1 Aberta sob Sobrecarga',
      severity: 'CRÍTICA',
      pop: 'POP-SIS-02: Interromper contator da bomba BC1 e forçar fechamento de VS1'
    },
    {
      id: 'R-03',
      antecedents: ['p_min1', 'y_bomba'],
      consequent: 'CAVITACAO_BOMBA_BC1',
      desc: 'Risco Crítico de Cavitação e Falha Mecânica na Bomba BC1',
      severity: 'ALTA',
      pop: 'POP-MA-04: Desligar bomba BC1 e verificar nível do tanque TS1'
    },
    {
      id: 'R-04',
      antecedents: ['p_max2'],
      consequent: 'SOBREPRESSAO_ACUMULADOR_AS1',
      desc: 'Sobrepressão Acima do Limite de Projeto no Acumulador AS1',
      severity: 'CRÍTICA',
      pop: 'POP-SST-08: Acionar alívio pneumático e cortar fluxo para AS1'
    },
    {
      id: 'R-05',
      antecedents: ['q_min2', 'y_valv2'],
      consequent: 'OBSTRUCAO_BICO_ENVASE',
      desc: 'Bloqueio ou Entupimento Mecânico no Bico de Envase VS2',
      severity: 'ALTA',
      pop: 'POP-SEC-02: Parar esteira RC1 e realizar retrolavagem'
    },
    {
      id: 'R-06',
      antecedents: ['p_max2', 'y_valv3'],
      consequent: 'SOBREPRESSAO_SISTEMA_CAPPING',
      desc: 'Pressão Pneumática Excessiva no Atuador de Tampamento AC1',
      severity: 'CRÍTICA',
      pop: 'POP-CRIO-01: Fechar válvula VS3 e aliviar ar residual'
    },
    {
      id: 'R-07',
      antecedents: ['CAVITACAO_BOMBA_BC1', 'l_min_ts1'],
      consequent: 'DESARME_TERMICO_BOMBA',
      desc: 'Esgotamento do Tanque TS1 com Bomba a Seco',
      severity: 'CRÍTICA',
      pop: 'POP-MA-05: Bloqueio do circuito elétrico de BC1'
    },
    {
      id: 'R-09',
      antecedents: ['TRIP_BLOQUEIO_EMERGENCIA'],
      consequent: 'PARADA_TOTAL_LINHA',
      desc: 'Desarme de Emergência Geral por Falha Crítica de Alimentação',
      severity: 'CRÍTICA',
      pop: 'POP-ESD-01: Desabilitar saídas do CLP e acionar alarme geral'
    },
    {
      id: 'R-10',
      antecedents: ['DESARME_TERMICO_BOMBA'],
      consequent: 'PARADA_TOTAL_LINHA',
      desc: 'Desarme Geral por Perda Crítica do Grupo de Bombeamento',
      severity: 'CRÍTICA',
      pop: 'POP-ESD-01: Desabilitar saídas do CLP e acionar alarme geral'
    }
  ];

  // --- 5. ESTADO DO SIMULADOR ---
  const state = {
    sp1: 2.5,
    sq1: 25.0,
    sp2: 3.8,
    sq2: 5.0,
    e_stop: false,
    ts1_ok: true,
    garrafa_pos: true,
    garrafa_cheia: false,
    cycleCount: 140
  };

  function forwardChaining(initialFacts) {
    let facts = new Set(initialFacts);
    let triggeredRules = [];
    let addedNewFact = true;

    while (addedNewFact) {
      addedNewFact = false;
      for (const rule of KNOWLEDGE_BASE) {
        const canTrigger = rule.antecedents.every(ant => facts.has(ant));
        if (canTrigger && !facts.has(rule.consequent)) {
          facts.add(rule.consequent);
          triggeredRules.push(rule);
          addedNewFact = true;
        }
      }
    }

    return { facts: Array.from(facts), triggeredRules };
  }

  function evaluateSystem() {
    state.cycleCount++;
    const cycleElem = document.getElementById('inference-cycle-counter');
    if (cycleElem) cycleElem.textContent = `Ciclo CLP: #${state.cycleCount}`;

    const rawFacts = [];

    const p_max1 = state.sp1 > 3.5;
    const p_min1 = state.sp1 < 1.0;
    const q_max1 = state.sq1 > 45.0;
    const q_min1 = state.sq1 < 5.0;
    const p_max2 = state.sp2 > 4.5;
    const p_min2 = state.sp2 < 3.0;
    const q_max2 = state.sq2 > 8.0;
    const q_min2 = state.sq2 < 2.0;

    if (p_max1) rawFacts.push('p_max1');
    if (p_min1) rawFacts.push('p_min1');
    if (q_max1) rawFacts.push('q_max1');
    if (q_min1) rawFacts.push('q_min1');
    if (p_max2) rawFacts.push('p_max2');
    if (p_min2) rawFacts.push('p_min2');
    if (q_max2) rawFacts.push('q_max2');
    if (q_min2) rawFacts.push('q_min2');

    if (!state.ts1_ok) rawFacts.push('l_min_ts1');
    if (state.garrafa_pos) rawFacts.push('presenca_garrafa');
    if (state.garrafa_cheia) rawFacts.push('l_min');

    let y_valv1 = !p_max1 && !state.e_stop;
    let y_bomba = y_valv1 && !p_min1 && !p_max1 && !p_max2 && state.ts1_ok && !state.e_stop;

    if (y_valv1) rawFacts.push('y_valv1');
    if (y_bomba) rawFacts.push('y_bomba');

    const inference = forwardChaining(rawFacts);
    const inferredFacts = new Set(inference.facts);

    let tripEmergency = inferredFacts.has('TRIP_BLOQUEIO_EMERGENCIA') || 
                        inferredFacts.has('PARADA_TOTAL_LINHA') || 
                        inferredFacts.has('DESARME_TERMICO_BOMBA') ||
                        state.e_stop;

    let cavitacao = inferredFacts.has('CAVITACAO_BOMBA_BC1');

    if (tripEmergency || cavitacao) {
      y_bomba = false;
    }
    if (tripEmergency) {
      y_valv1 = false;
    }

    let V_dose = !state.e_stop && state.ts1_ok && state.garrafa_pos && !state.garrafa_cheia && !tripEmergency && !inferredFacts.has('OBSTRUCAO_BICO_ENVASE');
    let M_esteira = !state.e_stop && !tripEmergency && (!state.garrafa_pos || state.garrafa_cheia) && !V_dose;
    let AC1_capping = !state.e_stop && !tripEmergency && state.garrafa_pos && state.garrafa_cheia && !inferredFacts.has('SOBREPRESSAO_SISTEMA_CAPPING');
    let SFC1_status = AC1_capping;

    updatePill('pill-bc1', y_bomba, 'LIGADA', 'DESLIGADA / TRIP');
    updatePill('pill-vs1', y_valv1, 'ABERTA', 'FECHADA');
    updatePill('pill-rc1', M_esteira, 'AVANÇANDO', V_dose ? 'PARADA (ENVASE)' : 'PARADA (STOP)');
    updatePill('pill-vs2', V_dose, 'ABERTA (DOSANDO)', 'FECHADA');
    updatePill('pill-ac1', AC1_capping, 'ATIVO (TAMPANDO)', state.garrafa_cheia ? 'PRONTO' : 'AGUARDANDO NÍVEL');
    updatePill('pill-sfc1', SFC1_status, 'CONFIRMANDO', 'DESATIVADO');

    const statusInd = document.getElementById('system-status-indicator');
    if (statusInd) {
      if (tripEmergency) {
        statusInd.textContent = '🚨 TRIP DE SEGURANÇA ATIVO';
        statusInd.style.color = 'var(--crimson-alarm)';
      } else if (cavitacao || inferredFacts.has('OBSTRUCAO_BICO_ENVASE')) {
        statusInd.textContent = '⚠️ ALERTA OPERACIONAL';
        statusInd.style.color = 'var(--amber-warn)';
      } else {
        statusInd.textContent = '● SISTEMA OPERACIONAL (NOMINAL)';
        statusInd.style.color = 'var(--emerald-ok)';
      }
    }

    logCycle(rawFacts, inference.triggeredRules);
  }

  function updatePill(id, isActive, onText, offText) {
    const pill = document.getElementById(id);
    if (!pill) return;
    if (isActive) {
      pill.className = 'actuator-pill on';
      pill.textContent = onText;
    } else {
      pill.className = 'actuator-pill off';
      pill.textContent = offText;
    }
  }

  function logCycle(rawFacts, triggeredRules) {
    const terminal = document.getElementById('sim-terminal');
    if (!terminal) return;

    if (triggeredRules.length > 0) {
      triggeredRules.forEach(rule => {
        const entry = document.createElement('div');
        entry.className = rule.severity === 'CRÍTICA' ? 'terminal-entry danger' : 'terminal-entry warn';
        const now = new Date().toTimeString().split(' ')[0];
        entry.innerHTML = `[${now}] <strong>[${rule.id}] ${rule.consequent}:</strong> ${rule.desc} &rarr; <em>${rule.pop}</em>`;
        terminal.appendChild(entry);
      });
    } else {
      const entry = document.createElement('div');
      entry.className = 'terminal-entry';
      const now = new Date().toTimeString().split(' ')[0];
      entry.textContent = `[${now}] Varredura nominal. Fatos ativos: [${rawFacts.join(', ') || 'Nenhum'}]. Intertravas OK.`;
      terminal.appendChild(entry);
    }

    while (terminal.children.length > 40) {
      terminal.removeChild(terminal.firstChild);
    }
    terminal.scrollTop = terminal.scrollHeight;
  }

  function initControls() {
    const sSp1 = document.getElementById('slider-sp1');
    const vSp1 = document.getElementById('val-sp1');
    if (sSp1 && vSp1) {
      sSp1.addEventListener('input', (e) => {
        state.sp1 = parseFloat(e.target.value);
        vSp1.textContent = `${state.sp1.toFixed(1)} Barg`;
        evaluateSystem();
      });
    }

    const sSq1 = document.getElementById('slider-sq1');
    const vSq1 = document.getElementById('val-sq1');
    if (sSq1 && vSq1) {
      sSq1.addEventListener('input', (e) => {
        state.sq1 = parseFloat(e.target.value);
        vSq1.textContent = `${state.sq1.toFixed(1)} L/min`;
        evaluateSystem();
      });
    }

    const sSp2 = document.getElementById('slider-sp2');
    const vSp2 = document.getElementById('val-sp2');
    if (sSp2 && vSp2) {
      sSp2.addEventListener('input', (e) => {
        state.sp2 = parseFloat(e.target.value);
        vSp2.textContent = `${state.sp2.toFixed(1)} Barg`;
        evaluateSystem();
      });
    }

    const sSq2 = document.getElementById('slider-sq2');
    const vSq2 = document.getElementById('val-sq2');
    if (sSq2 && vSq2) {
      sSq2.addEventListener('input', (e) => {
        state.sq2 = parseFloat(e.target.value);
        vSq2.textContent = `${state.sq2.toFixed(1)} L/min`;
        evaluateSystem();
      });
    }

    const btnEstop = document.getElementById('btn-estop');
    if (btnEstop) {
      btnEstop.addEventListener('click', () => {
        state.e_stop = !state.e_stop;
        btnEstop.classList.toggle('active', !state.e_stop);
        btnEstop.querySelector('.toggle-status').textContent = state.e_stop ? 'PRESSIONADO (STOP)' : 'INATIVO (OK)';
        evaluateSystem();
      });
    }

    const btnTs1 = document.getElementById('btn-ts1-level');
    if (btnTs1) {
      btnTs1.addEventListener('click', () => {
        state.ts1_ok = !state.ts1_ok;
        btnTs1.classList.toggle('active', state.ts1_ok);
        btnTs1.querySelector('.toggle-status').textContent = state.ts1_ok ? 'OK (> MÍN)' : 'ESGOTADO / VAZIO';
        evaluateSystem();
      });
    }

    const btnGarrafa = document.getElementById('btn-garrafa-pos');
    if (btnGarrafa) {
      btnGarrafa.addEventListener('click', () => {
        state.garrafa_pos = !state.garrafa_pos;
        btnGarrafa.classList.toggle('active', state.garrafa_pos);
        btnGarrafa.querySelector('.toggle-status').textContent = state.garrafa_pos ? 'PRESENTE' : 'AUSENTE';
        evaluateSystem();
      });
    }

    const btnNivel = document.getElementById('btn-garrafa-cheia');
    if (btnNivel) {
      btnNivel.addEventListener('click', () => {
        state.garrafa_cheia = !state.garrafa_cheia;
        btnNivel.classList.toggle('active', state.garrafa_cheia);
        btnNivel.querySelector('.toggle-status').textContent = state.garrafa_cheia ? 'CHEIA (≥95%)' : 'VAZIA (<95%)';
        evaluateSystem();
      });
    }

    const btnReset = document.getElementById('btn-reset-sim');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.sp1 = 2.5;
        state.sq1 = 25.0;
        state.sp2 = 3.8;
        state.sq2 = 5.0;
        state.e_stop = false;
        state.ts1_ok = true;
        state.garrafa_pos = true;
        state.garrafa_cheia = false;

        if (sSp1) { sSp1.value = 2.5; vSp1.textContent = '2.5 Barg'; }
        if (sSq1) { sSq1.value = 25.0; vSq1.textContent = '25.0 L/min'; }
        if (sSp2) { sSp2.value = 3.8; vSp2.textContent = '3.8 Barg'; }
        if (sSq2) { sSq2.value = 5.0; vSq2.textContent = '5.0 L/min'; }

        if (btnEstop) { btnEstop.classList.add('active'); btnEstop.querySelector('.toggle-status').textContent = 'INATIVO (OK)'; }
        if (btnTs1) { btnTs1.classList.add('active'); btnTs1.querySelector('.toggle-status').textContent = 'OK (> MÍN)'; }
        if (btnGarrafa) { btnGarrafa.classList.add('active'); btnGarrafa.querySelector('.toggle-status').textContent = 'PRESENTE'; }
        if (btnNivel) { btnNivel.classList.remove('active'); btnNivel.querySelector('.toggle-status').textContent = 'VAZIA (<95%)'; }

        evaluateSystem();
      });
    }

    const btnCav = document.getElementById('btn-inject-cav');
    if (btnCav) {
      btnCav.addEventListener('click', () => {
        state.sp1 = 0.6;
        if (sSp1) { sSp1.value = 0.6; vSp1.textContent = '0.6 Barg'; }
        evaluateSystem();
      });
    }

    const btnTrip = document.getElementById('btn-inject-trip');
    if (btnTrip) {
      btnTrip.addEventListener('click', () => {
        state.sp1 = 4.2;
        state.sq1 = 52.0;
        if (sSp1) { sSp1.value = 4.2; vSp1.textContent = '4.2 Barg'; }
        if (sSq1) { sSq1.value = 52.0; vSq1.textContent = '52.0 L/min'; }
        evaluateSystem();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSlideDeck();
    initTabs();
    initHeroCTA();
    initControls();
    evaluateSystem();
  });
})();
