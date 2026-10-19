/**
 * SCADA-Core UNIFEI | Desafio do Operador SCADA (Etapa 02)
 * Jogo interativo: o jogador monta a rota clicando nos equipamentos do mapa.
 * Usa o GraphEngine (graph-engine.js) para validar arestas e calcular o ótimo (Dijkstra).
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const engine = new window.GraphEngine();

  // Nós que aparecem no tabuleiro (rede hidráulica até o envase)
  const BOARD_NODES = ['TS1', 'TS2', 'VS1', 'BC1', 'BC2', 'AS1', 'VALV_ALIVIO', 'VS2', 'SQ2', 'EST_ENVASE'];

  const MISSIONS = [
    {
      id: 1, title: 'Missão 1 · Rota Simples de Envase',
      subtitle: 'Partida a Frio da Célula de Dosagem',
      briefing: 'A esteira RC1 acabou de ser energizada. Trace uma rota hidráulica válida do Tanque Principal (TS1) até o Bico Injetor (EST_ENVASE), passando pela Bomba BC1 e pela Válvula de Envase VS2.',
      source: 'TS1', target: 'EST_ENVASE', failed: [], esd: false,
      hint: 'Clique em TS1 e siga as tubulações: TS1 ➔ VS1 ➔ BC1 ➔ AS1 ➔ VS2 ➔ SQ2 ➔ EST_ENVASE.'
    },
    {
      id: 2, title: 'Missão 2 · Otimização de Perda de Carga',
      subtitle: 'Menor caminho partindo do reservatório reserva',
      briefing: 'O operador precisa alimentar o envase a partir do Reservatório Reserva (TS2). Existem dois ramais de bombeamento (BC1 e BC2): escolha o de menor comprimento total.',
      source: 'TS2', target: 'EST_ENVASE', failed: [], esd: false,
      hint: 'BC1 tem recalque de 8 m e BC2 de 10 m. Compare os pesos das tubulações antes de escolher.'
    },
    {
      id: 3, title: 'Missão 3 · Alarme de Sobreaquecimento na Bomba BC1',
      subtitle: 'Comutação de emergência para a bomba reserva (failover)',
      briefing: '⚠️ ALARME SIL-2: o inversor da bomba BC1 desarmou por sobrecorrente! BC1 está isolada. Monte uma rota de TS1 até o envase usando a bomba de backup BC2.',
      source: 'TS1', target: 'EST_ENVASE', failed: ['BC1'], esd: false,
      hint: 'Com BC1 em falha, o caminho passa por VS1 ➔ BC2 ➔ AS1.'
    },
    {
      id: 4, title: 'Missão 4 · Falha Crítica na Válvula de Envase VS2',
      subtitle: 'Ativação do bypass de emergência XV_BYPASS',
      briefing: '🚨 EMERGÊNCIA: a válvula dosadora VS2 travou FECHADA por incrustação. Estabeleça um desvio seguro pela tubulação de bypass de emergência para abastecer a câmara SQ2.',
      source: 'TS1', target: 'EST_ENVASE', failed: ['VS2'], esd: false,
      hint: 'O bypass (linha tracejada amarela) liga AS1 direto a SQ2, com 14 m.'
    },
    {
      id: 5, title: 'Missão 5 · Falha Catastrófica de Articulação (AS1)',
      subtitle: 'Diagnóstico de vértice de corte e intertravamento SIL',
      briefing: '🛑 BLOQUEIO CRÍTICO: o diafragma do Pulmão AS1 rompeu! Avalie se ainda existe alguma rota viável até o envase. Se não existir, declare PARADA DE EMERGÊNCIA (ESD); se existir, monte a rota.',
      source: 'TS1', target: 'EST_ENVASE', failed: ['AS1'], esd: true,
      hint: 'AS1 é um vértice de articulação: sem ele não há caminho até o envase.'
    }
  ];

  const state = { active: false, idx: 0, score: 1000, timer: 60, interval: null, path: [], done: false };

  const $ = (id) => document.getElementById(id);
  const mission = () => MISSIONS[state.idx];

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function edgeBetween(u, v) {
    return engine.edges.find(e => e.u === u && e.v === v && engine.isEdgeActive(e.id));
  }

  function nodeColor(id) {
    const m = mission();
    if (!engine.isNodeActive(id)) return '#ff1744';
    if (state.path.includes(id)) return '#00e676';
    if (id === m.source) return '#00f0ff';
    if (id === m.target) return '#ffab00';
    return '#3a5578';
  }

  // ---------- Renderização ----------
  function render() {
    const svg = $('game-board-svg');
    if (!svg) return;
    svg.innerHTML = '';

    const defs = svgEl('defs');
    defs.innerHTML = '<marker id="g-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1.5L8 5 0 8.5z" fill="#00e5ff"/></marker>' +
      '<marker id="g-arrow-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1.5L8 5 0 8.5z" fill="#00e676"/></marker>';
    svg.appendChild(defs);

    const set = new Set(BOARD_NODES);
    const used = new Set();
    for (let i = 0; i < state.path.length - 1; i++) {
      const e = edgeBetween(state.path[i], state.path[i + 1]);
      if (e) used.add(e.id);
    }

    // Arestas
    engine.edges.filter(e => set.has(e.u) && set.has(e.v)).forEach(e => {
      const a = engine.nodes[e.u], b = engine.nodes[e.v];
      const active = engine.isEdgeActive(e.id);
      const isUsed = used.has(e.id);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const r = 22;
      const x1 = a.x + dx / len * r, y1 = a.y + dy / len * r;
      const x2 = b.x - dx / len * (r + 4), y2 = b.y - dy / len * (r + 4);
      svg.appendChild(svgEl('line', {
        x1, y1, x2, y2,
        stroke: !active ? '#ff1744' : isUsed ? '#00e676' : e.type === 'bypass' ? '#ffab00' : '#1d6f8a',
        'stroke-width': isUsed ? 4 : 2,
        'stroke-dasharray': (!active || e.type === 'bypass') ? '6 4' : '0',
        'marker-end': isUsed ? 'url(#g-arrow-ok)' : 'url(#g-arrow)',
        opacity: active ? 1 : 0.5
      }));
      const t = svgEl('text', {
        x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 5, 'text-anchor': 'middle',
        'font-size': 10, fill: isUsed ? '#00e676' : '#7fa6c4', 'font-family': 'JetBrains Mono, monospace'
      });
      t.textContent = e.weight + 'm';
      svg.appendChild(t);
    });

    // Nós
    BOARD_NODES.forEach(id => {
      const n = engine.nodes[id];
      const g = svgEl('g', { transform: `translate(${n.x},${n.y})`, style: 'cursor:pointer' });
      const col = nodeColor(id);
      g.appendChild(svgEl('circle', { r: 22, fill: '#071324', stroke: col, 'stroke-width': 3 }));
      const idx = state.path.indexOf(id);
      const label = svgEl('text', {
        'text-anchor': 'middle', y: 4, 'font-size': 10, 'font-weight': 700,
        fill: '#e0f2fe', 'font-family': 'JetBrains Mono, monospace'
      });
      label.textContent = n.shortLabel;
      g.appendChild(label);
      if (!engine.isNodeActive(id)) {
        const b = svgEl('text', { 'text-anchor': 'middle', y: -29, 'font-size': 9, fill: '#ff1744', 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' });
        b.textContent = '🔴 FALHA';
        g.appendChild(b);
      } else if (idx >= 0) {
        g.appendChild(svgEl('circle', { cx: 18, cy: -18, r: 9, fill: '#00e676' }));
        const nn = svgEl('text', { x: 18, y: -14.5, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#000' });
        nn.textContent = idx + 1;
        g.appendChild(nn);
      } else if (id === mission().source || id === mission().target) {
        const b = svgEl('text', { 'text-anchor': 'middle', y: -29, 'font-size': 9, 'font-weight': 700, fill: col, 'font-family': 'JetBrains Mono, monospace' });
        b.textContent = id === mission().source ? '● ORIGEM' : '★ DESTINO';
        g.appendChild(b);
      }
      const title = svgEl('title');
      title.textContent = n.label;
      g.appendChild(title);
      g.addEventListener('click', () => onNodeClick(id));
      svg.appendChild(g);
    });

    const live = $('game-route-live');
    if (live) live.textContent = 'Rota: ' + (state.path.length ? state.path.join(' ➔ ') : '—') + (state.path.length > 1 ? `  (${pathCost(state.path)} m)` : '');
  }

  function pathCost(path) {
    let c = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const e = edgeBetween(path[i], path[i + 1]);
      if (e) c += e.weight;
    }
    return Number(c.toFixed(1));
  }

  function msg(text, color) {
    const el = $('game-board-msg');
    if (el) { el.textContent = text; el.style.color = color || 'var(--text-dim)'; }
  }

  // ---------- Interação ----------
  function onNodeClick(id) {
    if (!state.active || state.done) { msg('Clique em ▶ Iniciar / Reiniciar Jogo para começar.', 'var(--amber-warn)'); return; }
    const m = mission();

    if (!engine.isNodeActive(id)) {
      penalize(50, `${id} está em FALHA! Equipamento isolado não pode ser usado (-50 pts).`);
      return;
    }
    if (state.path.length === 0) {
      if (id !== m.source) { msg(`A rota deve começar na origem: ${m.source}.`, 'var(--amber-warn)'); return; }
      state.path.push(id);
      msg(`Origem ${id} selecionada. Agora clique no próximo equipamento conectado.`, 'var(--emerald-ok)');
    } else {
      const last = state.path[state.path.length - 1];
      if (state.path.includes(id)) { msg(`${id} já está na rota. Use "Desfazer" para voltar.`, 'var(--amber-warn)'); return; }
      if (!edgeBetween(last, id)) { msg(`Não existe tubulação ativa de ${last} ➔ ${id}.`, 'var(--amber-warn)'); return; }
      state.path.push(id);
      msg(`${last} ➔ ${id} ✔`, 'var(--emerald-ok)');
    }
    render();
  }

  function penalize(pts, text) {
    state.score = Math.max(0, state.score - pts);
    updateHud();
    msg(text, 'var(--crimson-alarm)');
  }

  function updateHud() {
    const m = mission();
    if ($('game-score-display')) $('game-score-display').textContent = state.score + ' pts';
    if ($('game-mission-progress')) $('game-mission-progress').textContent = `Missão ${m.id} de ${MISSIONS.length}`;
    if ($('game-mission-title')) $('game-mission-title').textContent = m.title;
    if ($('game-mission-subtitle')) $('game-mission-subtitle').textContent = m.subtitle;
    if ($('game-mission-briefing')) $('game-mission-briefing').textContent = m.briefing;
    if ($('game-mission-hint')) $('game-mission-hint').textContent = 'Dica Técnica: ' + m.hint;
    if ($('game-timer-display')) $('game-timer-display').textContent = state.timer + 's';
  }

  function startMission(i) {
    state.idx = i;
    state.path = [];
    state.done = false;
    state.timer = 60;
    engine.resetDefaults();
    mission().failed.forEach(n => engine.setNodeStatus(n, 'FALHA'));
    const box = $('game-mission-result');
    if (box) box.style.display = 'none';
    updateHud();
    render();
    msg(`Clique em ${mission().source} para iniciar a rota.`, 'var(--cyan-neon)');

    clearInterval(state.interval);
    state.interval = setInterval(() => {
      if (state.done) return;
      state.timer--;
      const t = $('game-timer-display');
      if (t) {
        t.textContent = Math.max(0, state.timer) + 's';
        t.style.color = state.timer <= 15 ? 'var(--crimson-alarm)' : 'var(--amber-warn)';
      }
      if (state.timer <= 0) {
        clearInterval(state.interval);
        state.timer = 0;
        penalize(50, 'Tempo esgotado! (-50 pts). Você ainda pode validar a manobra.');
      }
    }, 1000);
  }

  function showResult(success, feedback, earned) {
    const box = $('game-mission-result');
    if (!box) return;
    const last = state.idx === MISSIONS.length - 1;
    box.style.display = 'block';
    box.className = success ? 'callout callout-info' : 'callout callout-danger';
    box.innerHTML = `
      <strong>${success ? '✔ MISSÃO CONCLUÍDA!' : '❌ MANOBRA INCORRETA'}</strong>
      <p style="margin-top:0.35rem; font-size:0.88rem;">${feedback} <em>(${earned >= 0 ? '+' : ''}${earned} pts)</em></p>
      <div style="margin-top:0.5rem;">
        ${success && !last ? '<button id="btn-next-mission" class="btn-micro" style="border-color: var(--emerald-ok); color: var(--emerald-ok);">Próxima Missão ➔</button>' : ''}
        ${success && last ? `<strong style="color: var(--emerald-ok);">🏆 PARABÉNS! Você concluiu todas as missões com ${state.score} pontos!</strong>` : ''}
        ${!success ? '<button id="btn-retry-mission" class="btn-micro" style="border-color: var(--amber-warn); color: var(--amber-warn);">Tentar Novamente ⟲</button>' : ''}
      </div>`;
    $('btn-next-mission')?.addEventListener('click', () => startMission(state.idx + 1));
    $('btn-retry-mission')?.addEventListener('click', () => startMission(state.idx));
  }

  function validate() {
    if (!state.active) { msg('Clique em ▶ Iniciar / Reiniciar Jogo primeiro.', 'var(--amber-warn)'); return; }
    if (state.done) return;
    const m = mission();
    const best = engine.dijkstra(m.source, m.target);

    if (!state.path.length || state.path[state.path.length - 1] !== m.target) {
      penalize(20, `A rota ainda não chegou ao destino ${m.target}. Continue clicando nos equipamentos (-20 pts).`);
      return;
    }

    const cost = pathCost(state.path);
    let earned, success;
    if (!best.success) {
      // Não deveria acontecer: rota montada mesmo sem caminho
      earned = -50; success = false;
    } else if (cost <= best.cost + 0.01) {
      earned = 150 + (state.timer > 30 ? 50 : 0); success = true;
    } else {
      earned = 70; success = true;
    }
    state.score = Math.max(0, state.score + earned);
    state.done = true;
    clearInterval(state.interval);
    updateHud();
    const fb = cost <= best.cost + 0.01
      ? `Rota ótima! ${cost} m, igual ao menor caminho do Dijkstra.`
      : `Rota válida, porém subótima: ${cost} m contra o ótimo de ${best.cost} m (${best.path.join(' ➔ ')}).`;
    showResult(true, fb, earned);
    render();
  }

  function declareESD() {
    if (!state.active) { msg('Clique em ▶ Iniciar / Reiniciar Jogo primeiro.', 'var(--amber-warn)'); return; }
    if (state.done) return;
    const m = mission();
    const best = engine.dijkstra(m.source, m.target);
    if (!best.success) {
      state.score += 150;
      state.done = true;
      clearInterval(state.interval);
      updateHud();
      showResult(true, `Correto! ${m.failed.join(', ')} é vértice de articulação: não há rota até ${m.target}, então a parada de emergência (ESD) é a decisão segura.`, 150);
    } else {
      penalize(50, `ESD desnecessária: ainda existe rota (${best.path.join(' ➔ ')}). Procure-a (-50 pts).`);
    }
  }

  function start() {
    state.active = true;
    state.score = 1000;
    startMission(0);
  }

  function init() {
    if (!$('game-board-svg')) return;
    // Estado inicial visível mesmo antes de iniciar
    engine.resetDefaults();
    render();
    $('btn-start-game')?.addEventListener('click', start);
    $('btn-validate-mission')?.addEventListener('click', validate);
    $('btn-game-esd')?.addEventListener('click', declareESD);
    $('btn-game-undo')?.addEventListener('click', () => {
      if (!state.active || state.done) return;
      state.path.pop();
      render();
    });
    $('btn-game-clear')?.addEventListener('click', () => {
      if (!state.active || state.done) return;
      state.path = [];
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
