/**
 * SCADA-Core UNIFEI | Interactive Simulator, Game Engine & SVG Synoptic (Etapa 02)
 * Grupo 3 - ECAA08 - Linha de Envasamento e Inspeção de Bebidas
 *
 * Integrates:
 * 1. Dynamic SVG Synoptic with flow markers and live equipment states
 * 2. Dijkstra Step-by-Step Interactive Player (Relaxation Panel)
 * 3. Dynamic Adjacency & Incidence Matrix Viewer (Kirchhoff Conservation)
 * 4. Automatic Fault Injection & Rerouting Comparator
 * 5. Gamification: "Desafio do Operador SCADA" (5 Progressive Missions)
 * 6. Eulerian Crawler Inspection & Hamiltonian AGV Sampling (TSP)
 * 7. "Modo Aula" (Pedagogical Callouts with LaTeX/Math and Exact Complexities)
 * 8. 10-Slide Executive Presentation Deck
 */

(function () {
  'use strict';

  // Instância do motor topológico
  const engine = new window.GraphEngine();

  // Estado da interface do simulador
  const uiState = {
    activeTab: 'dijkstra', // 'dijkstra', 'bfs_dfs', 'matrices', 'euler', 'tsp', 'dag', 'game'
    sourceNode: 'TS1',
    targetNode: 'EST_ENVASE',
    currentRoute: null,
    dijkstraSteps: [],
    currentStepIndex: 0,
    isPlayingSteps: false,
    stepPlayTimer: null,
    aulaMode: false,
    selectedElement: null,

    // Histórico de reroteamento
    lastNominalRoute: null,
    lastNominalCost: null,

    // Estado do Jogo do Operador
    game: {
      active: false,
      currentMissionIndex: 0,
      score: 1000,
      timerSec: 60,
      timerInterval: null,
      selectedNodes: [],
      history: []
    }
  };

  // MISSÕES DO DESAFIO DO OPERADOR
  const GAME_MISSIONS = [
    {
      id: 1,
      title: 'Missão 1 · Rota Simples de Envase',
      subtitle: 'Partida a Frio da Célula de Dosagem',
      briefing: 'A esteira RC1 acabou de ser energizada. Como operador, trace uma rota hidráulica válida do Tanque Principal (TS1) até o Bico Injetor (EST_Envase) utilizando a Bomba Principal (BC1) e a Válvula de Envase (VS2).',
      source: 'TS1',
      target: 'EST_ENVASE',
      blockedNodes: [],
      targetRoute: ['TS1', 'VS1', 'BC1', 'AS1', 'VS2', 'SQ2', 'EST_ENVASE'],
      optimalCost: 29.5,
      hint: 'Selecione TS1 como origem, EST_ENVASE como destino e clique em "⚡ Executar Rota".'
    },
    {
      id: 2,
      title: 'Missão 2 · Otimização de Perda de Carga',
      subtitle: 'Seleção do Menor Caminho entre Múltiplos Ramais',
      briefing: 'Ambos os reservatórios (TS1 e TS2) e ambas as bombas (BC1 e BC2) estão disponíveis. Encontre a rota de menor comprimento linear e menor perda de carga até a Estação de Envase.',
      source: 'TS1',
      target: 'EST_ENVASE',
      blockedNodes: [],
      targetRoute: ['TS1', 'VS1', 'BC1', 'AS1', 'VS2', 'SQ2', 'EST_ENVASE'],
      optimalCost: 29.5,
      hint: 'O ramal عبر TS1 e BC1 possui comprimento menor que a sucção auxiliar عبر TS2 ou BC2.'
    },
    {
      id: 3,
      title: 'Missão 3 · Alarme de Sobreaquecimento na Bomba BC1',
      subtitle: 'Comutação de Emergência para Bomba Reserva (Failover)',
      briefing: '⚠️ ALARME SIL-2: O sensor térmico da Bomba Principal BC1 desarmou o inversor por sobrecorrente! Isole BC1 e recalcule a rota para manter a esteira em produção através da bomba de backup BC2.',
      source: 'TS1',
      target: 'EST_ENVASE',
      blockedNodes: ['BC1'],
      targetRoute: ['TS1', 'VS1', 'BC2', 'AS1', 'VS2', 'SQ2', 'EST_ENVASE'],
      optimalCost: 32.5,
      hint: 'Bloqueie BC1 (clicando no nó ou usando a falha) e observe o Dijkstra comutar automaticamente para BC2.'
    },
    {
      id: 4,
      title: 'Missão 4 · Falha Crítica na Válvula de Envase VS2',
      subtitle: 'Ativação do Bypass de Emergência XV_BYPASS',
      briefing: '🚨 EMERGÊNCIA: A válvula dosadora VS2 travou na posição FECHADA devido a incrustação mecânica. Estabeleça um desvio seguro através da linha de bypass XV_BYPASS para abastecer a câmara SQ2 sem despressurizar o acumulador.',
      source: 'TS1',
      target: 'EST_ENVASE',
      blockedNodes: ['VS2'],
      targetRoute: ['TS1', 'VS1', 'BC1', 'AS1', 'XV_BYPASS', 'SQ2', 'EST_ENVASE'],
      optimalCost: 31.5,
      hint: 'Com VS2 bloqueada, a linha de bypass AS1 ➔ XV_BYPASS ➔ SQ2 absorve o fluxo com apenas +2.0m de perda.'
    },
    {
      id: 5,
      title: 'Missão 5 · Falha Catastrófica de Articulação (AS1)',
      subtitle: 'Diagnóstico de Vértice de Corte e Intertravamento SIL',
      briefing: '🛑 BLOQUEIO CRÍTICO: O transmissor de pressão do Pulmão AS1 detectou rompimento do diafragma! Avalie deterministicamente se ainda existe qualquer rota alternativa viável até o envase ou se o supervisório deve ordenar PARADA DE EMERGÊNCIA (ESD).',
      source: 'TS1',
      target: 'EST_ENVASE',
      blockedNodes: ['AS1'],
      targetRoute: null,
      optimalCost: Infinity,
      hint: 'AS1 é um Vértice de Articulação (ponto de corte). Sua remoção desconecta a rede, confirmando que o envase deve parar.'
    }
  ];

  // --- 1. RENDERIZADOR SVG DINÂMICO DO MAPA TOPOLÓGICO ---

  function renderSynopticSVG() {
    const svg = document.getElementById('scada-graph-svg');
    if (!svg) return;

    svg.innerHTML = '';

    // Definições de Marcadores e Filtros
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00e5ff" />
      </marker>
      <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00e676" />
      </marker>
      <marker id="arrow-fail" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ff1744" />
      </marker>
      <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="pipe-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f0ff" />
        <stop offset="50%" stop-color="#00e676" />
        <stop offset="100%" stop-color="#00f0ff" />
      </linearGradient>
    `;
    svg.appendChild(defs);

    // Camada de Fundo (Esteira Transportadora RC1)
    const conveyorG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    conveyorG.setAttribute('id', 'conveyor-layer');
    conveyorG.innerHTML = `
      <rect x="180" y="335" width="650" height="30" rx="6" fill="#0b172a" stroke="#0077ff" stroke-width="2" stroke-dasharray="8 6" opacity="0.8" />
      <text x="505" y="385" font-family="'JetBrains Mono', monospace" font-size="10" fill="#8b9bb4" text-anchor="middle" letter-spacing="2">
        ◀ ESTEIRA TRANSPORTADORA RC1 (SENTIDO DO FLUXO DE GARRAFAS) ◀
      </text>
    `;
    svg.appendChild(conveyorG);

    // Camada de Arestas (Tubulações e Conexões)
    const edgesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesG.setAttribute('id', 'edges-layer');

    const activeRouteEdges = uiState.currentRoute?.edgesPath || [];

    engine.edges.forEach(edge => {
      const uNode = engine.nodes[edge.u];
      const vNode = engine.nodes[edge.v];
      if (!uNode || !vNode) return;

      const isRouteActive = activeRouteEdges.includes(edge.id);
      const isFailed = !engine.isEdgeActive(edge.id);

      // Traçado do duto (reta ou curva para reciclo/bypass)
      let d = '';
      if (edge.u === 'VALV_ALIVIO' && edge.v === 'TS1') {
        // Curva inferior de retorno para o tanque principal
        d = `M ${uNode.x} ${uNode.y} C ${uNode.x - 60} ${uNode.y + 40}, ${vNode.x - 40} ${vNode.y + 70}, ${vNode.x} ${vNode.y + 20}`;
      } else if (edge.u === 'DESCARTE_REJ' && edge.v === 'TS1') {
        d = `M ${uNode.x} ${uNode.y} C ${uNode.x - 120} ${uNode.y + 20}, ${vNode.x - 60} ${vNode.y + 120}, ${vNode.x} ${vNode.y + 25}`;
      } else if (edge.u === 'AS1' && edge.v === 'SQ2') {
        // Linha de bypass passando por baixo de VS2
        d = `M ${uNode.x} ${uNode.y} L ${engine.nodes['XV_BYPASS'].x} ${engine.nodes['XV_BYPASS'].y} L ${vNode.x} ${vNode.y}`;
      } else {
        d = `M ${uNode.x} ${uNode.y} L ${vNode.x} ${vNode.y}`;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('id', `edge-path-${edge.id}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', isRouteActive ? '4.5' : '2.5');

      if (isFailed) {
        path.setAttribute('stroke', '#ff1744');
        path.setAttribute('stroke-dasharray', '5 4');
        path.setAttribute('marker-end', 'url(#arrow-fail)');
      } else if (isRouteActive) {
        path.setAttribute('stroke', '#00e676');
        path.setAttribute('filter', 'url(#glow-emerald)');
        path.setAttribute('marker-end', 'url(#arrow-active)');
      } else {
        path.setAttribute('stroke', edge.type === 'conveyor' ? '#0077ff' : '#00a8ff');
        path.setAttribute('opacity', '0.65');
        path.setAttribute('marker-end', 'url(#arrow)');
      }

      // Interatividade: clique na tubulação para injetar falha/vazamento
      path.style.cursor = 'pointer';
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEdgeFaultInteractive(edge.id);
      });

      edgesG.appendChild(path);

      // Rótulo com peso da aresta (metros)
      const midX = (uNode.x + vNode.x) / 2;
      const midY = (uNode.y + vNode.y) / 2 - 6;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', midY);
      text.setAttribute('font-family', "'JetBrains Mono', monospace");
      text.setAttribute('font-size', '9');
      text.setAttribute('fill', isFailed ? '#ff5252' : isRouteActive ? '#00e676' : '#8b9bb4');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-weight', isRouteActive ? 'bold' : 'normal');
      text.textContent = `${edge.weight}m`;
      edgesG.appendChild(text);
    });

    svg.appendChild(edgesG);

    // Camada de Vértices (Equipamentos e Estações)
    const nodesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesG.setAttribute('id', 'nodes-layer');

    const activeRouteNodes = uiState.currentRoute?.path || [];

    Object.values(engine.nodes).forEach(node => {
      const isRouteActive = activeRouteNodes.includes(node.id);
      const isFailed = !engine.isNodeActive(node.id);
      const isSource = (uiState.sourceNode === node.id);
      const isTarget = (uiState.targetNode === node.id);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node-group');
      g.setAttribute('id', `node-group-${node.id}`);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.style.cursor = 'pointer';

      // Ícone e formato por tipo de nó
      let shape;
      if (node.type === 'tank' || node.type === 'accumulator') {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shape.setAttribute('x', '-22');
        shape.setAttribute('y', '-22');
        shape.setAttribute('width', '44');
        shape.setAttribute('height', '44');
        shape.setAttribute('rx', '8');
      } else if (node.type === 'pump') {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('r', '22');
      } else {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('r', '18');
      }

      shape.setAttribute('fill', isFailed ? '#2a0808' : isRouteActive ? '#0a2b1e' : '#07162c');
      shape.setAttribute('stroke-width', (isSource || isTarget || isRouteActive) ? '3' : '1.8');

      if (isFailed) {
        shape.setAttribute('stroke', '#ff1744');
      } else if (isSource) {
        shape.setAttribute('stroke', '#00f0ff');
        shape.setAttribute('filter', 'url(#glow-cyan)');
      } else if (isTarget) {
        shape.setAttribute('stroke', '#ffab00');
      } else if (isRouteActive) {
        shape.setAttribute('stroke', '#00e676');
        shape.setAttribute('filter', 'url(#glow-emerald)');
      } else {
        shape.setAttribute('stroke', '#0077ff');
      }

      g.appendChild(shape);

      // Texto do Nó (Tag ISA-5.1)
      const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tagText.setAttribute('y', '4');
      tagText.setAttribute('font-family', "'JetBrains Mono', monospace");
      tagText.setAttribute('font-size', '10');
      tagText.setAttribute('font-weight', '700');
      tagText.setAttribute('text-anchor', 'middle');
      tagText.setAttribute('fill', isFailed ? '#ff8a80' : isRouteActive ? '#e8f5e9' : '#e0f2fe');
      tagText.textContent = node.shortLabel;
      g.appendChild(tagText);

      // Badge de Status (FALHA / ON / SRC / TGT)
      const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badgeText.setAttribute('y', '-26');
      badgeText.setAttribute('font-family', "'JetBrains Mono', monospace");
      badgeText.setAttribute('font-size', '8');
      badgeText.setAttribute('font-weight', '700');
      badgeText.setAttribute('text-anchor', 'middle');

      if (isFailed) {
        badgeText.setAttribute('fill', '#ff1744');
        badgeText.textContent = '🔴 FALHA';
      } else if (isSource) {
        badgeText.setAttribute('fill', '#00f0ff');
        badgeText.textContent = '● ORIGEM';
      } else if (isTarget) {
        badgeText.setAttribute('fill', '#ffab00');
        badgeText.textContent = '★ DESTINO';
      } else if (isRouteActive) {
        badgeText.setAttribute('fill', '#00e676');
        badgeText.textContent = '✔ ATIVO';
      } else {
        badgeText.setAttribute('fill', '#546580');
        badgeText.textContent = 'STANDBY';
      }
      g.appendChild(badgeText);

      // Evento de clique no nó
      g.addEventListener('click', () => {
        handleNodeClick(node.id);
      });

      nodesG.appendChild(g);
    });

    svg.appendChild(nodesG);
  }

  // --- 2. CONTROLE DE INTERAÇÃO COM O MAPA E NÓS ---

  function handleNodeClick(nodeId) {
    uiState.selectedElement = { type: 'node', id: nodeId, data: engine.nodes[nodeId] };

    // Se estiver no jogo, gerencia escolha
    if (uiState.game.active) {
      handleGameNodeClick(nodeId);
      return;
    }

    // Modal/Painel Rápido de Seleção de Origem ou Destino
    showNodeActionDialog(nodeId);
  }

  function showNodeActionDialog(nodeId) {
    const node = engine.nodes[nodeId];
    if (!node) return;

    const banner = document.getElementById('scada-status-banner');
    if (banner) {
      banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong>Equipamento Selecionado:</strong> <code class="mono-font" style="color: var(--cyan-neon);">${node.label}</code> ·
            Status: <span style="color: ${engine.isNodeActive(nodeId) ? 'var(--emerald-ok)' : 'var(--crimson-alarm)'}; font-weight: bold;">
              ${engine.isNodeActive(nodeId) ? 'OPERACIONAL (OK)' : '🔴 EM FALHA / ISOLADO'}
            </span>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button id="btn-set-src" class="btn-micro" style="border: 1px solid var(--cyan-neon); color: var(--cyan-neon);">Definir Origem</button>
            <button id="btn-set-tgt" class="btn-micro" style="border: 1px solid var(--amber-warn); color: var(--amber-warn);">Definir Destino</button>
            <button id="btn-toggle-fault" class="btn-micro" style="border: 1px solid var(--crimson-alarm); color: var(--crimson-alarm);">
              ${engine.isNodeActive(nodeId) ? '⚠️ Injetar Falha' : '🔄 Normalizar'}
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-set-src')?.addEventListener('click', () => {
        uiState.sourceNode = nodeId;
        logSCADA(`Origem de fluxo definida para [${nodeId}].`, 'info');
        updateSelects();
        executeDijkstra();
      });

      document.getElementById('btn-set-tgt')?.addEventListener('click', () => {
        uiState.targetNode = nodeId;
        logSCADA(`Destino de fluxo definido para [${nodeId}].`, 'info');
        updateSelects();
        executeDijkstra();
      });

      document.getElementById('btn-toggle-fault')?.addEventListener('click', () => {
        const newStatus = engine.toggleNodeFault(nodeId);
        logSCADA(`Operador alternou estado do equipamento [${nodeId}] para: ${newStatus}.`, newStatus === 'FALHA' ? 'alarm' : 'success');
        executeDijkstraWithFailover();
        renderSynopticSVG();
        updateMatricesView();
      });
    }
  }

  function toggleEdgeFaultInteractive(edgeId) {
    const edge = engine.edges.find(e => e.id === edgeId);
    if (!edge) return;

    const newStatus = engine.toggleEdgeFault(edgeId);
    logSCADA(`Tubulação [${edge.u} ➔ ${edge.v}] (${edge.label}) comutada para ${newStatus}.`, newStatus === 'FALHA' ? 'alarm' : 'success');
    executeDijkstraWithFailover();
    renderSynopticSVG();
    updateMatricesView();
  }

  // --- 3. EXECUÇÃO DO ALGORITMO DE DIJKSTRA COM REROTEAMENTO ---

  function executeDijkstra() {
    const res = engine.dijkstra(uiState.sourceNode, uiState.targetNode);
    uiState.currentRoute = res;
    uiState.dijkstraSteps = res.steps || [];
    uiState.currentStepIndex = 0;

    if (res.success) {
      uiState.lastNominalRoute = res.path;
      uiState.lastNominalCost = res.cost;
      updateKPIs(res.cost, res.latencyMs, res.path.join(' ➔ '), 'success');
      logSCADA(`Dijkstra: rota ótima [${res.path.join(' ➔ ')}] com custo ${res.cost}m (${res.transitTime}s).`, 'success');
    } else {
      updateKPIs('∞ (Inacessível)', res.latencyMs, 'SEM ROTA DISPONÍVEL', 'alarm');
      logSCADA(`ALERTA: ${res.message}`, 'alarm');
    }

    renderSynopticSVG();
    updateDijkstraStepUI();
  }

  function executeDijkstraWithFailover() {
    const previousCost = uiState.lastNominalCost;
    const previousRoute = uiState.lastNominalRoute;

    const res = engine.dijkstra(uiState.sourceNode, uiState.targetNode);
    uiState.currentRoute = res;
    uiState.dijkstraSteps = res.steps || [];
    uiState.currentStepIndex = 0;

    const rerouteBox = document.getElementById('reroute-comparison-panel');
    if (rerouteBox) {
      if (res.success) {
        const diffCost = (res.cost - (previousCost || res.cost));
        const diffPct = previousCost ? ((diffCost / previousCost) * 100).toFixed(1) : '0.0';

        rerouteBox.style.display = 'block';
        rerouteBox.innerHTML = `
          <div style="background: rgba(0, 230, 118, 0.08); border: 1px solid var(--emerald-ok); border-radius: var(--radius-sm); padding: 0.75rem;">
            <strong style="color: var(--emerald-ok);">🔄 ROTA ALTERNATIVA ENCONTRADA (FAILOVER SIS):</strong>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.4rem; font-size: 0.85rem;">
              <div><span>Rota Anterior:</span> <code class="mono-font">${previousRoute ? previousRoute.join('➔') : '—'}</code> (${previousCost || '—'}m)</div>
              <div><span>Nova Rota Ativa:</span> <code class="mono-font" style="color: var(--cyan-neon);">${res.path.join('➔')}</code> (${res.cost}m)</div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">
              Variação de Extensão Hidráulica: <strong>+${diffCost.toFixed(1)}m (+${diffPct}%)</strong> · Tempo de Decisão: <strong>${res.latencyMs} ms</strong>
            </div>
          </div>
        `;
        updateKPIs(res.cost, res.latencyMs, res.path.join(' ➔ '), 'success');
      } else {
        rerouteBox.style.display = 'block';
        rerouteBox.innerHTML = `
          <div style="background: rgba(255, 23, 68, 0.1); border: 1px solid var(--crimson-alarm); border-radius: var(--radius-sm); padding: 0.75rem;">
            <strong style="color: var(--crimson-alarm);">🛑 SEM ROTA DISPONÍVEL (BLOQUEIO CRÍTICO):</strong>
            <p style="font-size: 0.85rem; color: var(--text-main); margin-top: 0.3rem;">
              A desconexão isolou o destino [${uiState.targetNode}]. Elemento afetado é um <strong>Vértice de Articulação</strong> ou todos os ramais redundantes de bombeamento estão obstruídos.
            </p>
          </div>
        `;
        updateKPIs('∞ (Desconectado)', res.latencyMs, 'PARADA DE EMERGÊNCIA (ESD)', 'alarm');
      }
    }

    renderSynopticSVG();
    updateDijkstraStepUI();
  }

  // --- 4. VISUALIZADOR PASSO A PASSO DO DIJKSTRA (RELAXAÇÃO) ---

  function updateDijkstraStepUI() {
    const stepBox = document.getElementById('dijkstra-step-explanation');
    const stepCounter = document.getElementById('step-counter-label');
    const tableBody = document.getElementById('dijkstra-table-body');
    const steps = uiState.dijkstraSteps;

    if (!steps || steps.length === 0) {
      if (stepBox) stepBox.textContent = 'Execute o Dijkstra para visualizar o rastreamento das relaxações de arestas.';
      if (stepCounter) stepCounter.textContent = 'Passo 0 de 0';
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">Aguardando execução...</td></tr>';
      return;
    }

    const currentStep = steps[uiState.currentStepIndex];

    if (stepCounter) {
      stepCounter.textContent = `Passo ${uiState.currentStepIndex + 1} de ${steps.length}`;
    }

    if (stepBox && currentStep) {
      stepBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
          <span class="status-chip chip-available">${currentStep.type}</span>
          <strong>${currentStep.current ? `Nó Atual: [${currentStep.current}]` : ''}</strong>
        </div>
        <p style="margin:0; font-size:0.88rem; color:var(--text-main); line-height:1.4;">${currentStep.message}</p>
      `;
    }

    if (tableBody && currentStep && currentStep.distSnapshot) {
      let rowsHtml = '';
      const relevantNodes = ['TS1', 'TS2', 'VS1', 'BC1', 'BC2', 'AS1', 'VALV_ALIVIO', 'VS2', 'XV_BYPASS', 'SQ2', 'EST_ENVASE'];

      relevantNodes.forEach(nodeId => {
        const d = currentStep.distSnapshot[nodeId];
        const p = currentStep.predSnapshot ? currentStep.predSnapshot[nodeId] : '—';
        const isCurrent = (currentStep.current === nodeId);

        rowsHtml += `
          <tr style="${isCurrent ? 'background: rgba(0, 240, 255, 0.12);' : ''}">
            <td><strong class="mono-font" style="color:${isCurrent ? 'var(--cyan-neon)' : 'var(--text-main)'};">${nodeId}</strong></td>
            <td class="mono-font">${d === Infinity ? '∞' : `${d.toFixed(1)}m`}</td>
            <td class="mono-font">${p || '—'}</td>
            <td><span style="font-size:0.75rem; color:${d < Infinity ? 'var(--emerald-ok)' : 'var(--text-dim)'};">${d < Infinity ? 'Atualizado' : 'Infinito'}</span></td>
          </tr>
        `;
      });
      tableBody.innerHTML = rowsHtml;
    }
  }

  function nextDijkstraStep() {
    if (uiState.currentStepIndex < uiState.dijkstraSteps.length - 1) {
      uiState.currentStepIndex++;
      updateDijkstraStepUI();
    }
  }

  function prevDijkstraStep() {
    if (uiState.currentStepIndex > 0) {
      uiState.currentStepIndex--;
      updateDijkstraStepUI();
    }
  }

  function togglePlayDijkstraSteps() {
    const playBtn = document.getElementById('btn-play-steps');
    if (uiState.isPlayingSteps) {
      clearInterval(uiState.stepPlayTimer);
      uiState.isPlayingSteps = false;
      if (playBtn) playBtn.textContent = '▶ Reproduzir Passos';
    } else {
      uiState.isPlayingSteps = true;
      if (playBtn) playBtn.textContent = '⏸ Pausar';
      uiState.stepPlayTimer = setInterval(() => {
        if (uiState.currentStepIndex < uiState.dijkstraSteps.length - 1) {
          nextDijkstraStep();
        } else {
          clearInterval(uiState.stepPlayTimer);
          uiState.isPlayingSteps = false;
          if (playBtn) playBtn.textContent = '▶ Reproduzir Passos';
        }
      }, 1000);
    }
  }

  // --- 5. RENDERIZADOR DINÂMICO DE MATRIZES (ADJACÊNCIA E INCIDÊNCIA) ---

  function updateMatricesView() {
    const adjContainer = document.getElementById('adjacency-matrix-container');
    const incContainer = document.getElementById('incidence-matrix-container');

    // Subconjunto chave para visualização concisa
    const primaryNodes = ['TS1', 'TS2', 'VS1', 'BC1', 'BC2', 'AS1', 'VALV_ALIVIO', 'VS2', 'XV_BYPASS', 'SQ2', 'EST_ENVASE'];

    // 1. Matriz de Adjacência Ponderada / Binária
    if (adjContainer) {
      const adjData = engine.getAdjacencyMatrix(primaryNodes);
      let html = '<div class="table-responsive"><table class="matrix-table">';
      html += '<thead><tr><th>Nó</th>';
      adjData.labels.forEach(l => { html += `<th>${l}</th>`; });
      html += '</tr></thead><tbody>';

      adjData.labels.forEach((u, i) => {
        html += `<tr><th>${u}</th>`;
        adjData.labels.forEach((v, j) => {
          const w = adjData.weightMatrix[i][j];
          const hasEdge = adjData.binaryMatrix[i][j] === 1;
          const isDiagonal = (i === j);

          html += `
            <td class="${hasEdge ? 'has-edge' : isDiagonal ? 'diag' : ''}" title="${u} ➔ ${v}: ${w}m">
              ${w === Infinity ? '0' : w.toFixed(1)}
            </td>
          `;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      adjContainer.innerHTML = html;
    }

    // 2. Matriz de Incidência Vértice-Aresta com Balanço de Kirchhoff
    if (incContainer) {
      const incData = engine.getIncidenceMatrix(primaryNodes);
      let html = '<div class="table-responsive"><table class="matrix-table">';
      html += '<thead><tr><th>Vértice</th>';
      incData.edgeLabels.forEach((edgeId, idx) => {
        html += `<th title="${incData.edgeTags[idx]}">${edgeId}</th>`;
      });
      html += '</tr></thead><tbody>';

      incData.nodeLabels.forEach((nodeId, i) => {
        html += `<tr><th>${nodeId}</th>`;
        incData.edgeLabels.forEach((_, j) => {
          const val = incData.matrix[i][j];
          const cls = val === -1 ? 'inc-neg' : val === 1 ? 'inc-pos' : '';
          html += `<td class="${cls}">${val > 0 ? `+${val}` : val}</td>`;
        });
        html += '</tr>';
      });

      // Linha de Soma por Coluna (Validação Kirchhoff: Σ = 0)
      html += '<tr class="sum-row"><th>Σ Coluna</th>';
      incData.colSums.forEach(sum => {
        html += `<td class="kirchhoff-sum">${sum}</td>`;
      });
      html += '</tr></tbody></table></div>';

      html += `
        <div style="margin-top: 0.75rem; font-size: 0.82rem; color: var(--emerald-ok); font-family: 'JetBrains Mono', monospace;">
          ✔ Conservação de Fluxo Validada: Todas as ${incData.colSums.length} colunas totalizam estritamente 0 (Primeira Lei de Kirchhoff Hidráulica).
        </div>
      `;
      incContainer.innerHTML = html;
    }
  }

  // --- 6. MODO JOGO: DESAFIO DO OPERADOR SCADA ---

  function initGameMode() {
    uiState.game.active = true;
    uiState.game.score = 1000;
    uiState.game.currentMissionIndex = 0;
    startMission(0);
  }

  function startMission(missionIndex) {
    const mission = GAME_MISSIONS[missionIndex];
    if (!mission) return;

    uiState.game.currentMissionIndex = missionIndex;
    uiState.game.timerSec = 60;
    uiState.sourceNode = mission.source;
    uiState.targetNode = mission.target;

    // Aplica bloqueios da missão
    engine.resetDefaults();
    mission.blockedNodes.forEach(n => engine.setNodeStatus(n, 'FALHA'));

    updateGameMissionUI(mission);
    executeDijkstra();
    renderSynopticSVG();

    // Inicia cronômetro do jogo
    clearInterval(uiState.game.timerInterval);
    uiState.game.timerInterval = setInterval(() => {
      uiState.game.timerSec--;
      const timerEl = document.getElementById('game-timer-display');
      if (timerEl) {
        timerEl.textContent = `${uiState.game.timerSec}s`;
        if (uiState.game.timerSec <= 15) {
          timerEl.style.color = 'var(--crimson-alarm)';
        } else {
          timerEl.style.color = 'var(--cyan-neon)';
        }
      }

      if (uiState.game.timerSec <= 0) {
        clearInterval(uiState.game.timerInterval);
        logSCADA(`Tempo esgotado para a Missão ${mission.id}!`, 'alarm');
        uiState.game.score = Math.max(0, uiState.game.score - 50);
        updateGameScoreUI();
      }
    }, 1000);
  }

  function updateGameMissionUI(mission) {
    const titleEl = document.getElementById('game-mission-title');
    const briefingEl = document.getElementById('game-mission-briefing');
    const hintEl = document.getElementById('game-mission-hint');
    const progressEl = document.getElementById('game-mission-progress');

    if (titleEl) titleEl.textContent = mission.title;
    if (briefingEl) briefingEl.textContent = mission.briefing;
    if (hintEl) hintEl.textContent = `Dica Técnica: ${mission.hint}`;
    if (progressEl) progressEl.textContent = `Missão ${mission.id} de ${GAME_MISSIONS.length}`;

    updateGameScoreUI();
  }

  function updateGameScoreUI() {
    const scoreEl = document.getElementById('game-score-display');
    if (scoreEl) scoreEl.textContent = `${uiState.game.score} pts`;
  }

  function validateMissionSolution() {
    const mission = GAME_MISSIONS[uiState.game.currentMissionIndex];
    const route = uiState.currentRoute;

    if (!mission || !route) return;

    let success = false;
    let earned = 0;
    let feedback = '';

    if (mission.optimalCost === Infinity) {
      // Caso de missão onde não existe caminho (Corte/Articulação em AS1)
      if (!route.success || route.cost === Infinity) {
        success = true;
        earned = 150;
        feedback = 'Correto! Você diagnosticou com precisão que AS1 é um Vértice de Articulação e a planta deve ser parada com segurança.';
      } else {
        earned = -50;
        feedback = 'Incorreto! AS1 está quebrado, não é permitido tentar rotear através de equipamento danificado.';
      }
    } else {
      if (route.success && route.cost <= mission.optimalCost + 0.1) {
        success = true;
        earned = 150;
        if (uiState.game.timerSec > 30) earned += 50; // Bônus de rapidez
        feedback = `Excelente manobra! Rota ótima implementada (${route.cost}m) com intertravamentos de segurança respeitados.`;
      } else if (route.success) {
        earned = 70;
        feedback = `Rota válida, porém subótima (${route.cost}m contra o ótimo de ${mission.optimalCost}m). Perda de eficiência operacional.`;
      } else {
        earned = -50;
        feedback = 'Falha operacional: a rota selecionada está bloqueada ou não atinge o bico injetor.';
      }
    }

    uiState.game.score = Math.max(0, uiState.game.score + earned);
    updateGameScoreUI();
    logSCADA(`[JOGO SCADA] ${feedback} Pontuação alterada em: ${earned > 0 ? `+${earned}` : earned} pts.`, success ? 'success' : 'alarm');

    const resultBox = document.getElementById('game-mission-result');
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.className = success ? 'callout callout-info' : 'callout callout-danger';
      resultBox.innerHTML = `
        <strong>${success ? '✔ MISSÃO CONCLUÍDA COM SUCESSO!' : '❌ MANOBRA INSEGURA / INCORRETA'}</strong>
        <p style="margin-top: 0.35rem; font-size: 0.88rem;">${feedback}</p>
        <div style="margin-top: 0.5rem;">
          ${success && uiState.game.currentMissionIndex < GAME_MISSIONS.length - 1
            ? '<button id="btn-next-mission" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.82rem;">Avançar para Próxima Missão ➔</button>'
            : success
            ? '<strong style="color: var(--emerald-ok);">🏆 PARABÉNS! Você completou todas as missões do SCADA-Graph!</strong>'
            : '<button id="btn-retry-mission" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.82rem;">Tentar Novamente ⟲</button>'}
        </div>
      `;

      document.getElementById('btn-next-mission')?.addEventListener('click', () => {
        resultBox.style.display = 'none';
        startMission(uiState.game.currentMissionIndex + 1);
      });

      document.getElementById('btn-retry-mission')?.addEventListener('click', () => {
        resultBox.style.display = 'none';
        startMission(uiState.game.currentMissionIndex);
      });
    }
  }

  function handleGameNodeClick(nodeId) {
    // Permite ao jogador interagir durante a missão
    logSCADA(`[JOGO] Operador inspecionou equipamento: ${nodeId}.`, 'info');
  }

  // --- 7. TELEMETRIA E LOG SCADA ---

  function updateKPIs(dist, latency, route, statusLevel) {
    const distEl = document.getElementById('kpi-distance');
    const latencyEl = document.getElementById('kpi-latency');
    const routeEl = document.getElementById('kpi-route');
    const banner = document.getElementById('scada-status-banner');

    if (distEl) distEl.textContent = typeof dist === 'number' ? `${dist} m` : dist;
    if (latencyEl) latencyEl.textContent = `${latency} ms`;
    if (routeEl) routeEl.textContent = route;

    if (banner && statusLevel === 'alarm') {
      banner.className = 'callout callout-danger';
    } else if (banner && statusLevel === 'success') {
      banner.className = 'callout callout-info';
    }
  }

  function logSCADA(msg, type = 'info') {
    const consoleEl = document.getElementById('scada-console-output');
    if (!consoleEl) return;

    const time = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    const div = document.createElement('div');
    div.className = `terminal-entry ${type}`;

    let icon = 'ℹ️';
    if (type === 'alarm') icon = '🚨';
    if (type === 'success') icon = '✔';
    if (type === 'warn') icon = '⚠️';

    div.innerHTML = `<span style="color: var(--text-dim);">[${time}]</span> ${icon} ${msg}`;
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  // --- 8. GERENCIAMENTO DE MODO AULA & APRESENTAÇÃO ---

  function toggleAulaMode() {
    uiState.aulaMode = !uiState.aulaMode;
    const btn = document.getElementById('btn-toggle-aula');
    const callouts = document.querySelectorAll('.aula-mode-callout');

    if (btn) {
      btn.textContent = uiState.aulaMode ? '🎓 Modo Aula: ATIVO' : '🎓 Modo Aula: Desativado';
      btn.classList.toggle('active', uiState.aulaMode);
    }

    callouts.forEach(c => {
      c.style.display = uiState.aulaMode ? 'block' : 'none';
    });

    logSCADA(`Modo Didático / Explicar para o Professor: ${uiState.aulaMode ? 'ATIVADO' : 'DESATIVADO'}.`, 'info');
  }

  // Apresentação em Slides (Etapa 02)
  let currentSlide = 1;
  const TOTAL_SLIDES = 10;

  function initSlideDeck() {
    const prevBtn = document.getElementById('pres-prev-btn');
    const nextBtn = document.getElementById('pres-next-btn');

    prevBtn?.addEventListener('click', () => changeSlide(-1));
    nextBtn?.addEventListener('click', () => changeSlide(1));

    document.addEventListener('keydown', (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return;
      if (e.key === 'ArrowLeft') changeSlide(-1);
      if (e.key === 'ArrowRight') changeSlide(1);
    });

    updateSlideUI();
  }

  function changeSlide(dir) {
    const next = currentSlide + dir;
    if (next >= 1 && next <= TOTAL_SLIDES) {
      currentSlide = next;
      updateSlideUI();
    }
  }

  function updateSlideUI() {
    const slides = document.querySelectorAll('.presentation-viewport .slide');
    slides.forEach((s, idx) => {
      s.classList.toggle('active', (idx + 1) === currentSlide);
    });

    const counter = document.getElementById('pres-slide-counter');
    if (counter) counter.textContent = `Slide ${currentSlide} de ${TOTAL_SLIDES}`;

    const prevBtn = document.getElementById('pres-prev-btn');
    const nextBtn = document.getElementById('pres-next-btn');
    if (prevBtn) prevBtn.disabled = (currentSlide === 1);
    if (nextBtn) nextBtn.disabled = (currentSlide === TOTAL_SLIDES);
  }

  // --- 9. INICIALIZAÇÃO E EVENT LISTENERS ---

  function updateSelects() {
    const srcSelect = document.getElementById('select-source-node');
    const tgtSelect = document.getElementById('select-target-node');

    if (srcSelect) srcSelect.value = uiState.sourceNode;
    if (tgtSelect) tgtSelect.value = uiState.targetNode;
  }

  function initEventListeners() {
    // Seletores de Origem e Destino
    const srcSelect = document.getElementById('select-source-node');
    const tgtSelect = document.getElementById('select-target-node');

    srcSelect?.addEventListener('change', (e) => {
      uiState.sourceNode = e.target.value;
      executeDijkstra();
    });

    tgtSelect?.addEventListener('change', (e) => {
      uiState.targetNode = e.target.value;
      executeDijkstra();
    });

    // Botões de Ação Direta
    document.getElementById('btn-run-dijkstra')?.addEventListener('click', () => executeDijkstra());

    document.getElementById('btn-bfs')?.addEventListener('click', () => {
      const res = engine.bfs(uiState.sourceNode, uiState.targetNode);
      uiState.currentRoute = res;
      renderSynopticSVG();
      updateKPIs(res.hops !== Infinity ? `${res.hops} saltos` : 'Inacessível', res.latencyMs, res.path.join(' ➔ '), res.success ? 'success' : 'alarm');
      logSCADA(res.message, res.success ? 'success' : 'alarm');
    });

    document.getElementById('btn-dfs')?.addEventListener('click', () => {
      const res = engine.dfs(uiState.sourceNode, uiState.targetNode);
      uiState.currentRoute = res;
      renderSynopticSVG();
      updateKPIs(res.path.length ? `${res.path.length - 1} saltos` : 'Inacessível', res.latencyMs, res.path.join(' ➔ '), res.success ? 'success' : 'alarm');
      logSCADA(res.message, res.success ? 'success' : 'alarm');
    });

    document.getElementById('btn-euler')?.addEventListener('click', () => {
      const res = engine.runEulerianInspection('TS1');
      logSCADA(res.message, res.canTraverse ? 'success' : 'alarm');
      alert(`[TEOREMA DE EULER]\n${res.message}\n\nGraus dos nós:\n${Object.entries(res.degrees).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    });

    document.getElementById('btn-tsp')?.addEventListener('click', () => {
      const res = engine.runAgvTSP('LAB_CQ');
      logSCADA(res.message, 'success');
      alert(`[ROTEAMENTO AGV / TSP]\n${res.message}\n\nRota NN: ${res.nearestNeighbor.route.join('➔')} (${res.nearestNeighbor.cost}m)\nRota 2-Opt: ${res.twoOpt.route.join('➔')} (${res.twoOpt.cost}m)\nMelhoria: ${res.twoOpt.improvementPct}%`);
    });

    document.getElementById('btn-dag')?.addEventListener('click', () => {
      const res = engine.validateDAG(false);
      logSCADA(res.message, res.isDAG ? 'success' : 'warn');
      alert(`[VALIDAÇÃO DE PROCESSO - DAG]\n${res.message}`);
    });

    document.getElementById('btn-reset-sim')?.addEventListener('click', () => {
      engine.resetDefaults();
      uiState.sourceNode = 'TS1';
      uiState.targetNode = 'EST_ENVASE';
      updateSelects();
      executeDijkstra();
      updateMatricesView();
      logSCADA('Simulador e malha de fluidos redefinidos para parâmetros nominais.', 'info');
    });

    // Passo a passo Dijkstra
    document.getElementById('btn-next-step')?.addEventListener('click', nextDijkstraStep);
    document.getElementById('btn-prev-step')?.addEventListener('click', prevDijkstraStep);
    document.getElementById('btn-play-steps')?.addEventListener('click', togglePlayDijkstraSteps);

    // Modo Aula
    document.getElementById('btn-toggle-aula')?.addEventListener('click', toggleAulaMode);

    // Cenários Pré-programados
    document.getElementById('preset-nominal')?.addEventListener('click', () => {
      engine.resetDefaults();
      uiState.sourceNode = 'TS1';
      uiState.targetNode = 'EST_ENVASE';
      updateSelects();
      executeDijkstra();
      logSCADA('Cenário Carregado: Operação Nominal TS1 ➔ EST_Envase.', 'info');
    });

    document.getElementById('preset-pump-fail')?.addEventListener('click', () => {
      engine.resetDefaults();
      engine.setNodeStatus('BC1', 'FALHA');
      uiState.sourceNode = 'TS1';
      uiState.targetNode = 'EST_ENVASE';
      updateSelects();
      executeDijkstraWithFailover();
      logSCADA('Cenário Carregado: Falha Térmica em BC1 (Failover para BC2).', 'alarm');
    });

    document.getElementById('preset-valve-leak')?.addEventListener('click', () => {
      engine.resetDefaults();
      engine.setNodeStatus('VS2', 'FALHA');
      uiState.sourceNode = 'TS1';
      uiState.targetNode = 'EST_ENVASE';
      updateSelects();
      executeDijkstraWithFailover();
      logSCADA('Cenário Carregado: Válvula VS2 Bloqueada (Desvio automático por XV_BYPASS).', 'alarm');
    });

    document.getElementById('preset-articulation')?.addEventListener('click', () => {
      engine.resetDefaults();
      engine.setNodeStatus('AS1', 'FALHA');
      uiState.sourceNode = 'TS1';
      uiState.targetNode = 'EST_ENVASE';
      updateSelects();
      executeDijkstraWithFailover();
      logSCADA('Cenário Carregado: Ruptura em AS1 (Vértice de Articulação -> Linha Interrompida).', 'alarm');
    });

    // Modo Jogo
  }

  // Inicialização no carregamento da página
  document.addEventListener('DOMContentLoaded', () => {
    initSlideDeck();
    initEventListeners();
    updateSelects();
    renderSynopticSVG();
    updateMatricesView();
    executeDijkstra();
    logSCADA('SCADA-Graph Core Inicializado: Topologia da Linha de Envase carregada com sucesso.', 'info');
  });

})();
