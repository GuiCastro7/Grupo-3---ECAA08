/**
 * SCADA-Core UNIFEI | Graph Theory Engine (Etapa 02)
 * Disciplina: ECAA08 - Automática
 * Grupo 3: Linha de Envasamento e Inspeção de Bebidas
 *
 * Implements:
 * 1. Directed Weighted Graph G = (V, E, W)
 * 2. Adjacency & Incidence Matrices (with Kirchhoff flow conservation check)
 * 3. Breadth-First Search (BFS) & Depth-First Search (DFS) with step tracking
 * 4. Dijkstra Shortest Path with step-by-step edge relaxation history
 * 5. Dynamic Fault Invalidation & Automatic Rerouting (Failover)
 * 6. Eulerian Inspection Routing (Hierholzer Algorithm)
 * 7. Hamiltonian / TSP AGV Sampling (Nearest Neighbor + 2-Opt refinement)
 * 8. Directed Acyclic Graph (DAG) validation & Kahn's Topological Sort
 */

(function (global) {
  'use strict';

  // --- MODELO TOPOLÓGICO DA LINHA DE ENVASE DO GRUPO 3 ---

  const PLANT_NODES = {
    // Malha Hidráulica e Dosagem (Aulas 11 a 15)
    'TS1': {
      id: 'TS1',
      tag: 'TS1',
      label: 'TS1 · Reservatório Principal',
      shortLabel: 'TS1',
      desc: 'Tanque principal de suprimento de xarope/bebida',
      type: 'tank',
      subsystem: 'suprimento',
      x: 80,
      y: 90,
      status: 'NORMAL' // 'NORMAL', 'FALHA', 'BLOQUEADO', 'MANUTENCAO'
    },
    'TS2': {
      id: 'TS2',
      tag: 'TS2',
      label: 'TS2 · Reservatório Reserva',
      shortLabel: 'TS2',
      desc: 'Tanque auxiliar de contingência para envase contínuo',
      type: 'tank',
      subsystem: 'suprimento',
      x: 80,
      y: 220,
      status: 'NORMAL'
    },
    'VS1': {
      id: 'VS1',
      tag: 'VS1',
      label: 'VS1 · Válvula de Sucção',
      shortLabel: 'VS1',
      desc: 'Válvula solenoide de bloqueio na sucção da bomba',
      type: 'valve',
      subsystem: 'suprimento',
      x: 200,
      y: 155,
      status: 'NORMAL'
    },
    'BC1': {
      id: 'BC1',
      tag: 'BC1',
      label: 'BC1 · Bomba Principal',
      shortLabel: 'BC1',
      desc: 'Bomba centrífuga primária de pressurização do fluido',
      type: 'pump',
      subsystem: 'bombeamento',
      x: 320,
      y: 90,
      status: 'NORMAL'
    },
    'BC2': {
      id: 'BC2',
      tag: 'BC2',
      label: 'BC2 · Bomba Reserva',
      shortLabel: 'BC2',
      desc: 'Bomba centrífuga de backup para alta disponibilidade',
      type: 'pump',
      subsystem: 'bombeamento',
      x: 320,
      y: 220,
      status: 'NORMAL'
    },
    'AS1': {
      id: 'AS1',
      tag: 'AS1',
      label: 'AS1 · Acumulador Pulmão',
      shortLabel: 'AS1',
      desc: 'Acumulador hidráulico de amortecimento e estabilização de pressão',
      type: 'accumulator',
      subsystem: 'pressurizacao',
      x: 450,
      y: 155,
      status: 'NORMAL'
    },
    'VALV_ALIVIO': {
      id: 'VALV_ALIVIO',
      tag: 'VALV_Alivio',
      label: 'VALV_Alívio · Reciclo',
      shortLabel: 'V_ALIV',
      desc: 'Válvula solenoide proporcional de retorno e segurança contra sobrepressão',
      type: 'valve',
      subsystem: 'seguranca',
      x: 270,
      y: 290,
      status: 'NORMAL'
    },
    'VS2': {
      id: 'VS2',
      tag: 'VS2',
      label: 'VS2 · Válvula de Envase',
      shortLabel: 'VS2',
      desc: 'Válvula de dosagem fina e corte rápido sobre a esteira',
      type: 'valve',
      subsystem: 'dosagem',
      x: 580,
      y: 90,
      status: 'NORMAL'
    },
    'XV_BYPASS': {
      id: 'XV_BYPASS',
      tag: 'XV_BYPASS',
      label: 'XV_BYPASS · Desvio Emergência',
      shortLabel: 'BYPASS',
      desc: 'Linha de bypass paralelo de dosagem para contingência de falha em VS2',
      type: 'bypass',
      subsystem: 'dosagem',
      x: 580,
      y: 220,
      status: 'NORMAL'
    },
    'SQ2': {
      id: 'SQ2',
      tag: 'SQ2',
      label: 'SQ2 · Medição de Vazão',
      shortLabel: 'SQ2',
      desc: 'Sensor de vazão eletromagnético de alta precisão (feedback de volume)',
      type: 'sensor',
      subsystem: 'dosagem',
      x: 690,
      y: 155,
      status: 'NORMAL'
    },
    'EST_ENVASE': {
      id: 'EST_ENVASE',
      tag: 'EST_Envase',
      label: 'EST_Envase · Bico Injetor',
      shortLabel: 'EST1',
      desc: 'Estação de injeção volumétrica sobre a garrafa na esteira RC1',
      type: 'station',
      subsystem: 'esteira',
      x: 800,
      y: 155,
      status: 'NORMAL'
    },

    // Linha de Transporte e Inspeções Sucessivas (Esteira RC1)
    'VS3_SL1': {
      id: 'VS3_SL1',
      tag: 'VS3/SL1',
      label: 'VS3/SL1 · Inspeção Nível',
      shortLabel: 'INSP_NIVEL',
      desc: 'Sensor óptico SL1 e solenoide VS3: validação de volume >= 95%',
      type: 'station',
      subsystem: 'esteira',
      x: 690,
      y: 350,
      status: 'NORMAL'
    },
    'VS4_AC1': {
      id: 'VS4_AC1',
      tag: 'VS4/AC1',
      label: 'VS4/AC1 · Tampagem Capping',
      shortLabel: 'CAPPING',
      desc: 'Atuador pneumático AC1 e solenoide VS4: rosqueamento de tampa',
      type: 'station',
      subsystem: 'esteira',
      x: 530,
      y: 350,
      status: 'NORMAL'
    },
    'VS5_SFC1': {
      id: 'VS5_SFC1',
      tag: 'VS5/SFC1',
      label: 'VS5/SFC1 · Inspeção Vedação',
      shortLabel: 'INSP_VED',
      desc: 'Sensor fim de curso SFC1 e solenoide VS5: detecção mecânica de vedação',
      type: 'station',
      subsystem: 'esteira',
      x: 370,
      y: 350,
      status: 'NORMAL'
    },
    'PROD_APROV': {
      id: 'PROD_APROV',
      tag: 'PROD_APROV',
      label: 'Linha Expedição (Aprovado)',
      shortLabel: 'EXPEDICAO',
      desc: 'Saída da garrafa aprovada para rotulagem, encaixotamento e paletes',
      type: 'product',
      subsystem: 'logistica',
      x: 210,
      y: 350,
      status: 'NORMAL'
    },
    'DESCARTE_REJ': {
      id: 'DESCARTE_REJ',
      tag: 'DESCARTE_REJ',
      label: 'Braço Rejeição (Reprovado)',
      shortLabel: 'REJEICAO',
      desc: 'Desvio automático por atuador pneumático de unidades não conformes',
      type: 'reject',
      subsystem: 'logistica',
      x: 370,
      y: 435,
      status: 'NORMAL'
    },

    // Suporte Logístico & Qualidade
    'LAB_CQ': {
      id: 'LAB_CQ',
      tag: 'Lab_CQ',
      label: 'Lab_CQ · Base AGV & CIP',
      shortLabel: 'BASE_CQ',
      desc: 'Laboratório de Qualidade, base de recarga do AGV e manutenção CIP',
      type: 'lab',
      subsystem: 'logistica',
      x: 80,
      y: 350,
      status: 'NORMAL'
    }
  };

  // ARESTAS DIRECIONADAS COM PESOS DIDÁTICOS (Comprimento em metros e tempo proporcional)
  const PLANT_EDGES = [
    // Suprimento e Sucção
    { id: 'e1', u: 'TS1', v: 'VS1', weight: 5.0, transitTime: 2.0, valve: 'VS1_IN', label: 'Sucção TS1', type: 'pipe', status: 'NORMAL' },
    { id: 'e2', u: 'TS2', v: 'VS1', weight: 6.0, transitTime: 2.4, valve: 'VS2_AUX', label: 'Sucção TS2 (Reserva)', type: 'pipe', status: 'NORMAL' },

    // Bombeamento (Ramais Paralelos para Redundância)
    { id: 'e3', u: 'VS1', v: 'BC1', weight: 3.0, transitTime: 1.2, valve: 'XV_P1', label: 'Entrada BC1 (Principal)', type: 'pipe', status: 'NORMAL' },
    { id: 'e4', u: 'VS1', v: 'BC2', weight: 4.0, transitTime: 1.6, valve: 'XV_P2', label: 'Entrada BC2 (Reserva)', type: 'pipe', status: 'NORMAL' },
    { id: 'e5', u: 'BC1', v: 'AS1', weight: 8.0, transitTime: 1.5, valve: 'XV_REC1', label: 'Recalque BC1', type: 'pipe', status: 'NORMAL' },
    { id: 'e6', u: 'BC2', v: 'AS1', weight: 10.0, transitTime: 1.9, valve: 'XV_REC2', label: 'Recalque BC2', type: 'pipe', status: 'NORMAL' },

    // Dosagem Nominal vs Bypass
    { id: 'e7', u: 'AS1', v: 'VS2', weight: 10.0, transitTime: 0.8, valve: 'VS2_IN', label: 'Alimentação VS2', type: 'pipe', status: 'NORMAL' },
    { id: 'e8', u: 'VS2', v: 'SQ2', weight: 2.0, transitTime: 0.2, valve: 'VS2_OUT', label: 'Descarga Dosadora', type: 'pipe', status: 'NORMAL' },
    { id: 'e9', u: 'AS1', v: 'SQ2', weight: 14.0, transitTime: 1.1, valve: 'XV_BYPASS', label: 'Bypass de Emergência', type: 'bypass', status: 'NORMAL' },

    // Linha de Alívio e Recirculação de Segurança (Gera Ciclo!)
    { id: 'e10', u: 'AS1', v: 'VALV_ALIVIO', weight: 6.0, transitTime: 0.9, valve: 'V_ALIVIO', label: 'Alívio Sobrepressão', type: 'pipe', status: 'NORMAL' },
    { id: 'e11', u: 'VALV_ALIVIO', v: 'TS1', weight: 12.0, transitTime: 3.0, valve: 'V_RETORNO', label: 'Linha Reciclo TS1', type: 'pipe', status: 'NORMAL' },

    // Injeção de Envase
    { id: 'e12', u: 'SQ2', v: 'EST_ENVASE', weight: 1.5, transitTime: 0.3, valve: 'BICO_INJ', label: 'Bico Injetor', type: 'pipe', status: 'NORMAL' },

    // Esteira Transportadora RC1 (Fluxo das Garrafas)
    { id: 'e13', u: 'EST_ENVASE', v: 'VS3_SL1', weight: 3.0, transitTime: 3.0, label: 'Esteira RC1 ➔ Inspeção Nível', type: 'conveyor', status: 'NORMAL' },
    { id: 'e14', u: 'VS3_SL1', v: 'VS4_AC1', weight: 3.0, transitTime: 3.0, label: 'Esteira RC1 ➔ Tampagem', type: 'conveyor', status: 'NORMAL' },
    { id: 'e15', u: 'VS4_AC1', v: 'VS5_SFC1', weight: 3.0, transitTime: 3.0, label: 'Esteira RC1 ➔ Inspeção Vedação', type: 'conveyor', status: 'NORMAL' },
    { id: 'e16', u: 'VS5_SFC1', v: 'PROD_APROV', weight: 4.0, transitTime: 4.0, label: 'Esteira ➔ Produto Aprovado', type: 'conveyor', status: 'NORMAL' },
    { id: 'e17', u: 'VS5_SFC1', v: 'DESCARTE_REJ', weight: 2.5, transitTime: 1.5, label: 'Braço Rejeição ➔ Descarte', type: 'reject', status: 'NORMAL' },
    { id: 'e18', u: 'DESCARTE_REJ', v: 'TS1', weight: 15.0, transitTime: 8.0, label: 'Linha de Expurgo/Retorno', type: 'rework', status: 'NORMAL' }
  ];

  // ARESTAS ADICIONAIS BIDIRECIONAIS PARA VARREDURA DE CIP / EULER (Aula 16)
  const EULER_EXTRA_EDGES = [
    { id: 'ec1', u: 'LAB_CQ', v: 'TS1', weight: 6.0, label: 'Ramal Sanitização LAB-TS1', type: 'cip' },
    { id: 'ec2', u: 'LAB_CQ', v: 'EST_ENVASE', weight: 4.0, label: 'Ramal Sanitização LAB-EST', type: 'cip' },
    { id: 'ec3', u: 'TS1', v: 'BC1', weight: 7.0, label: 'Bypass CIP Limpeza Bomba', type: 'cip' },
    { id: 'ec4', u: 'BC1', v: 'SQ2', weight: 9.0, label: 'Bypass CIP Limpeza Sensor', type: 'cip' }
  ];

  // MATRIZ DE DISTÂNCIAS GEOMÉTRICAS DO PÁTIO PARA O AGV (TSP / Hamilton - Aula 17)
  const AGV_STATIONS = ['LAB_CQ', 'TS1', 'BC1', 'AS1', 'VS2', 'EST_ENVASE', 'VS3_SL1', 'VS5_SFC1'];
  const AGV_DIST_MATRIX = {
    'LAB_CQ':     { 'LAB_CQ': 0,  'TS1': 45, 'BC1': 60, 'AS1': 75, 'VS2': 90, 'EST_ENVASE': 85, 'VS3_SL1': 50, 'VS5_SFC1': 30 },
    'TS1':        { 'LAB_CQ': 45, 'TS1': 0,  'BC1': 25, 'AS1': 50, 'VS2': 70, 'EST_ENVASE': 80, 'VS3_SL1': 65, 'VS5_SFC1': 55 },
    'BC1':        { 'LAB_CQ': 60, 'TS1': 25, 'BC1': 0,  'AS1': 30, 'VS2': 50, 'EST_ENVASE': 65, 'VS3_SL1': 60, 'VS5_SFC1': 50 },
    'AS1':        { 'LAB_CQ': 75, 'TS1': 50, 'BC1': 30, 'AS1': 0,  'VS2': 25, 'EST_ENVASE': 40, 'VS3_SL1': 45, 'VS5_SFC1': 45 },
    'VS2':        { 'LAB_CQ': 90, 'TS1': 70, 'BC1': 50, 'AS1': 25, 'VS2': 0,  'EST_ENVASE': 20, 'VS3_SL1': 35, 'VS5_SFC1': 55 },
    'EST_ENVASE': { 'LAB_CQ': 85, 'TS1': 80, 'BC1': 65, 'AS1': 40, 'VS2': 20, 'EST_ENVASE': 0,  'VS3_SL1': 20, 'VS5_SFC1': 50 },
    'VS3_SL1':    { 'LAB_CQ': 50, 'TS1': 65, 'BC1': 60, 'AS1': 45, 'VS2': 35, 'EST_ENVASE': 20, 'VS3_SL1': 0,  'VS5_SFC1': 30 },
    'VS5_SFC1':   { 'LAB_CQ': 30, 'TS1': 55, 'BC1': 50, 'AS1': 45, 'VS2': 55, 'EST_ENVASE': 50, 'VS3_SL1': 30, 'VS5_SFC1': 0 }
  };

  // --- CLASSE PRINCIPAL: GRAPH ---

  class GraphEngine {
    constructor() {
      this.nodes = JSON.parse(JSON.stringify(PLANT_NODES));
      this.edges = JSON.parse(JSON.stringify(PLANT_EDGES));
      this.blockedNodes = new Set();
      this.blockedEdges = new Set();
      this.listeners = [];
    }

    // Registra listener de alterações de estado
    subscribe(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    notify() {
      this.listeners.forEach(fn => fn(this));
    }

    // Reset para estado nominal
    resetDefaults() {
      this.nodes = JSON.parse(JSON.stringify(PLANT_NODES));
      this.edges = JSON.parse(JSON.stringify(PLANT_EDGES));
      this.blockedNodes.clear();
      this.blockedEdges.clear();
      this.notify();
    }

    // Gerenciamento de Bloqueios e Falhas
    toggleNodeFault(nodeId) {
      if (!this.nodes[nodeId]) return;
      if (this.blockedNodes.has(nodeId)) {
        this.blockedNodes.delete(nodeId);
        this.nodes[nodeId].status = 'NORMAL';
      } else {
        this.blockedNodes.add(nodeId);
        this.nodes[nodeId].status = 'FALHA';
      }
      this.notify();
      return this.nodes[nodeId].status;
    }

    setNodeStatus(nodeId, status) {
      if (!this.nodes[nodeId]) return;
      this.nodes[nodeId].status = status;
      if (status === 'FALHA' || status === 'BLOQUEADO') {
        this.blockedNodes.add(nodeId);
      } else {
        this.blockedNodes.delete(nodeId);
      }
      this.notify();
    }

    toggleEdgeFault(edgeId) {
      const edge = this.edges.find(e => e.id === edgeId);
      if (!edge) return;
      if (this.blockedEdges.has(edgeId)) {
        this.blockedEdges.delete(edgeId);
        edge.status = 'NORMAL';
      } else {
        this.blockedEdges.add(edgeId);
        edge.status = 'FALHA';
      }
      this.notify();
      return edge.status;
    }

    isNodeActive(nodeId) {
      return !this.blockedNodes.has(nodeId) && this.nodes[nodeId]?.status !== 'FALHA';
    }

    isEdgeActive(edgeId) {
      const edge = this.edges.find(e => e.id === edgeId);
      if (!edge) return false;
      if (this.blockedEdges.has(edgeId) || edge.status === 'FALHA') return false;
      return this.isNodeActive(edge.u) && this.isNodeActive(edge.v);
    }

    // Lista de adjacência direcionada considerando nós/arestas ativos
    getAdjacencyList(includeInactive = false) {
      const adj = {};
      Object.keys(this.nodes).forEach(id => { adj[id] = []; });

      this.edges.forEach(edge => {
        if (!includeInactive && !this.isEdgeActive(edge.id)) {
          return;
        }
        if (adj[edge.u]) {
          adj[edge.u].push({
            neighbor: edge.v,
            weight: edge.weight,
            transitTime: edge.transitTime,
            edgeId: edge.id,
            edge
          });
        }
      });
      return adj;
    }

    // --- ALGORITMO DE DIJKSTRA COM REGISTRO PASSO A PASSO ---
    /**
     * Calcula o menor caminho entre source e target.
     * Retorna { success, path, cost, transitTime, steps, visitedNodes, predecessors }
     */
    dijkstra(source, target) {
      const t0 = performance.now();
      const dist = {};
      const timeCost = {};
      const pred = {};
      const predEdge = {};
      const visited = new Set();
      const steps = [];

      Object.keys(this.nodes).forEach(id => {
        dist[id] = Infinity;
        timeCost[id] = Infinity;
        pred[id] = null;
        predEdge[id] = null;
      });

      if (!this.nodes[source] || !this.nodes[target]) {
        return { success: false, error: 'Vértice de origem ou destino inexistente.', steps: [] };
      }

      if (!this.isNodeActive(source)) {
        return { success: false, error: `Origem [${source}] está bloqueada ou em falha!`, steps: [] };
      }
      if (!this.isNodeActive(target)) {
        return { success: false, error: `Destino [${target}] está bloqueado ou em falha!`, steps: [] };
      }

      dist[source] = 0;
      timeCost[source] = 0;

      // Min-Heap simplificado (fila de prioridade via ordenação em JS)
      const priorityQueue = [{ node: source, cost: 0 }];

      steps.push({
        type: 'INIT',
        current: source,
        distSnapshot: { ...dist },
        predSnapshot: { ...pred },
        message: `Inicialização do Dijkstra: d[${source}] = 0.0m; todos os demais com distância ∞.`
      });

      while (priorityQueue.length > 0) {
        // Extrai o nó de menor custo ainda não visitado
        priorityQueue.sort((a, b) => a.cost - b.cost);
        const { node: u, cost: d_u } = priorityQueue.shift();

        if (visited.has(u)) continue;
        visited.add(u);

        steps.push({
          type: 'VISIT_NODE',
          current: u,
          cost: d_u,
          distSnapshot: { ...dist },
          predSnapshot: { ...pred },
          message: `Extraído do Min-Heap: [${u}] com distância acumulada provisória d = ${d_u.toFixed(1)}m.`
        });

        // Se atingiu o destino, podemos encerrar mais cedo (poda gulosa)
        if (u === target) {
          steps.push({
            type: 'TARGET_REACHED',
            current: u,
            message: `Destino [${target}] alcançado! Menor custo garantido pela propriedade gulosa.`
          });
          break;
        }

        const adj = this.getAdjacencyList(false)[u] || [];
        for (const { neighbor: v, weight, transitTime, edgeId } of adj) {
          if (visited.has(v)) continue;

          const newDist = dist[u] + weight;
          const newTime = timeCost[u] + (transitTime || (weight * 0.4));

          const oldDist = dist[v];
          const willRelax = newDist < oldDist;

          steps.push({
            type: 'EVALUATE_EDGE',
            from: u,
            to: v,
            edgeId,
            weight,
            currentDistU: dist[u],
            oldDistV: oldDist,
            newDist,
            willRelax,
            message: `Avaliando duto [${u} ➔ ${v}] (peso: ${weight}m). Teste: d[${u}] (${dist[u].toFixed(1)}) + w (${weight.toFixed(1)}) = ${newDist.toFixed(1)} < d[${v}] (${oldDist === Infinity ? '∞' : oldDist.toFixed(1)}m)?`
          });

          if (willRelax) {
            dist[v] = newDist;
            timeCost[v] = newTime;
            pred[v] = u;
            predEdge[v] = edgeId;
            priorityQueue.push({ node: v, cost: newDist });

            steps.push({
              type: 'RELAXATION',
              from: u,
              to: v,
              edgeId,
              newDist,
              distSnapshot: { ...dist },
              predSnapshot: { ...pred },
              message: `✔ RELAXAÇÃO EFETUADA: d[${v}] atualizada para ${newDist.toFixed(1)}m. Predecessor pred[${v}] = ${u}.`
            });
          }
        }
      }

      const t1 = performance.now();
      const decisionLatencyMs = Number((t1 - t0).toFixed(3));

      // Reconstrução do caminho por retropropagação
      if (dist[target] === Infinity) {
        return {
          success: false,
          source,
          target,
          cost: Infinity,
          transitTime: Infinity,
          path: [],
          edgesPath: [],
          visitedCount: visited.size,
          latencyMs: decisionLatencyMs,
          steps,
          message: `Nenhum caminho disponível entre [${source}] e [${target}]. O grafo está desconectado por bloqueio.`
        };
      }

      const path = [];
      const edgesPath = [];
      let curr = target;
      while (curr !== null) {
        path.unshift(curr);
        if (predEdge[curr]) {
          edgesPath.unshift(predEdge[curr]);
        }
        curr = pred[curr];
      }

      return {
        success: true,
        source,
        target,
        cost: Number(dist[target].toFixed(2)),
        transitTime: Number(timeCost[target].toFixed(2)),
        path,
        edgesPath,
        visitedCount: visited.size,
        visitedNodes: Array.from(visited),
        latencyMs: decisionLatencyMs,
        steps,
        message: `Rota ótima encontrada: ${path.join(' ➔ ')} (Custo: ${dist[target].toFixed(1)}m).`
      };
    }

    // --- BUSCA EM LARGURA (BFS) ---
    /**
     * Encontra o caminho com menor número de arestas/válvulas intermediárias.
     */
    bfs(source, target) {
      const t0 = performance.now();
      const queue = [source];
      const visited = new Set([source]);
      const pred = { [source]: null };
      const predEdge = {};
      const levels = { [source]: 0 };
      const steps = [];

      steps.push({
        type: 'BFS_INIT',
        queue: [...queue],
        visited: Array.from(visited),
        message: `BFS inicializado na fonte [${source}] (Camada 0).`
      });

      let found = false;
      while (queue.length > 0) {
        const u = queue.shift();

        steps.push({
          type: 'BFS_DEQUEUE',
          current: u,
          level: levels[u],
          queue: [...queue],
          message: `Desenfileirado [${u}] na Camada ${levels[u]}. Expandindo vizinhos imediatos...`
        });

        if (u === target) {
          found = true;
          break;
        }

        const adj = this.getAdjacencyList(false)[u] || [];
        for (const { neighbor: v, edgeId } of adj) {
          if (!visited.has(v)) {
            visited.add(v);
            pred[v] = u;
            predEdge[v] = edgeId;
            levels[v] = levels[u] + 1;
            queue.push(v);

            steps.push({
              type: 'BFS_DISCOVER',
              from: u,
              to: v,
              level: levels[v],
              queue: [...queue],
              message: `Descoberto nó [${v}] na Camada ${levels[v]} via aresta [${edgeId}]. Inserido na fila FIFO.`
            });

            if (v === target) {
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      const t1 = performance.now();

      if (!found) {
        return {
          success: false,
          source,
          target,
          hops: Infinity,
          path: [],
          visitedCount: visited.size,
          latencyMs: Number((t1 - t0).toFixed(3)),
          steps,
          message: `Destino [${target}] inacessível a partir de [${source}] via BFS.`
        };
      }

      const path = [];
      const edgesPath = [];
      let curr = target;
      while (curr !== null) {
        path.unshift(curr);
        if (predEdge[curr]) edgesPath.unshift(predEdge[curr]);
        curr = pred[curr];
      }

      return {
        success: true,
        source,
        target,
        hops: path.length - 1,
        path,
        edgesPath,
        levels,
        visitedCount: visited.size,
        visitedNodes: Array.from(visited),
        latencyMs: Number((t1 - t0).toFixed(3)),
        steps,
        message: `BFS encontrou a rota de menor número de saltos (${path.length - 1} arestas): ${path.join(' ➔ ')}.`
      };
    }

    // --- BUSCA EM PROFUNDIDADE (DFS) ---
    /**
     * Explora profundamente caminhos até o fim antes de retroceder (backtracking).
     */
    dfs(source, target) {
      const t0 = performance.now();
      const visited = new Set();
      const pathFound = [];
      const steps = [];
      const treeEdges = [];
      const backEdges = [];

      const dfsVisit = (u, currentPath) => {
        visited.add(u);
        currentPath.push(u);

        steps.push({
          type: 'DFS_VISIT',
          current: u,
          pathSoFar: [...currentPath],
          message: `DFS entrando em [${u}] (Profundidade: ${currentPath.length}).`
        });

        if (u === target && pathFound.length === 0) {
          pathFound.push(...currentPath);
          steps.push({
            type: 'DFS_TARGET_FOUND',
            current: u,
            message: `Alvo [${target}] encontrado pela primeira ramificação da DFS!`
          });
        }

        const adj = this.getAdjacencyList(false)[u] || [];
        for (const { neighbor: v, edgeId } of adj) {
          if (!visited.has(v)) {
            treeEdges.push(edgeId);
            steps.push({
              type: 'DFS_TREE_EDGE',
              from: u,
              to: v,
              edgeId,
              message: `Aresta de Árvore: explorando ramal não visitado [${u} ➔ ${v}].`
            });
            dfsVisit(v, currentPath);
          } else if (currentPath.includes(v)) {
            backEdges.push(edgeId);
            steps.push({
              type: 'DFS_BACK_EDGE',
              from: u,
              to: v,
              edgeId,
              message: `Aresta de Retorno detectada: [${u} ➔ ${v}] fecha um ciclo com ancestral!`
            });
          }
        }

        currentPath.pop();
        steps.push({
          type: 'DFS_BACKTRACK',
          current: u,
          message: `Backtracking saindo de [${u}] retornando para o nó anterior.`
        });
      };

      dfsVisit(source, []);
      const t1 = performance.now();

      return {
        success: pathFound.length > 0,
        source,
        target,
        path: pathFound,
        visitedCount: visited.size,
        visitedNodes: Array.from(visited),
        treeEdges,
        backEdges,
        latencyMs: Number((t1 - t0).toFixed(3)),
        steps,
        message: pathFound.length > 0
          ? `DFS explorou ${visited.size} nós e identificou o caminho: ${pathFound.join(' ➔ ')}.`
          : `Nenhum caminho encontrado até [${target}] via DFS.`
      };
    }

    // --- MATRIZ DE ADJACÊNCIA REAL ---
    getAdjacencyMatrix(nodeSubset = null) {
      const keys = nodeSubset || Object.keys(this.nodes);
      const n = keys.length;
      const indexMap = {};
      keys.forEach((k, idx) => { indexMap[k] = idx; });

      const binaryMatrix = Array.from({ length: n }, () => Array(n).fill(0));
      const weightMatrix = Array.from({ length: n }, () => Array(n).fill(Infinity));

      for (let i = 0; i < n; i++) {
        weightMatrix[i][i] = 0;
      }

      this.edges.forEach(edge => {
        if (!this.isEdgeActive(edge.id)) return;
        const uIdx = indexMap[edge.u];
        const vIdx = indexMap[edge.v];
        if (uIdx !== undefined && vIdx !== undefined) {
          binaryMatrix[uIdx][vIdx] = 1;
          weightMatrix[uIdx][vIdx] = edge.weight;
        }
      });

      return {
        labels: keys,
        binaryMatrix,
        weightMatrix
      };
    }

    // --- MATRIZ DE INCIDÊNCIA REAL COM VALIDAÇÃO DE SOMA NULA ---
    getIncidenceMatrix(nodeSubset = null, edgeSubset = null) {
      const nodeKeys = nodeSubset || Object.keys(this.nodes);
      const nodeKeySet = new Set(nodeKeys);
      const edgeList = edgeSubset || this.edges.filter(e => this.isEdgeActive(e.id) && nodeKeySet.has(e.u) && nodeKeySet.has(e.v));

      const n = nodeKeys.length;
      const m = edgeList.length;

      const nodeIndex = {};
      nodeKeys.forEach((k, idx) => { nodeIndex[k] = idx; });

      // Matriz n x m inicializada com 0
      const matrix = Array.from({ length: n }, () => Array(m).fill(0));
      const colSums = Array(m).fill(0);

      edgeList.forEach((edge, j) => {
        const uIdx = nodeIndex[edge.u];
        const vIdx = nodeIndex[edge.v];

        // Convenção orientada para escoamento:
        // -1 para nó de saída (origem)
        // +1 para nó de entrada (destino)
        if (uIdx !== undefined) {
          matrix[uIdx][j] = -1;
          colSums[j] += -1;
        }
        if (vIdx !== undefined) {
          matrix[vIdx][j] = +1;
          colSums[j] += +1;
        }
      });

      const allColsSumZero = colSums.every(s => s === 0);

      return {
        nodeLabels: nodeKeys,
        edgeLabels: edgeList.map(e => e.id),
        edgeTags: edgeList.map(e => `${e.u}➔${e.v}`),
        matrix,
        colSums,
        allColsSumZero,
        explanation: 'Convenção: -1 = saída (origem do fluxo), +1 = entrada (destino do fluxo), 0 = sem incidência. ' +
          'A soma por coluna identicamente nula prova a Primeira Lei de Kirchhoff (conservação da vazão mássica).'
      };
    }

    // --- ALGORITMO DE HIERHOLZER (CIRCUITO/TRILHA EULERIANA) ---
    /**
     * Aplica-se à malha não-dirigida de tubulações para inspeção total
     * sem repetição de dutos por crawler / robô autônomo.
     */
    runEulerianInspection(startNodeId = 'TS1') {
      // Cria conjunto de arestas para inspeção não-dirigida (incluindo ramais CIP da Aula 16)
      const inspectionEdges = [
        ...this.edges.filter(e => ['pipe', 'bypass'].includes(e.type) && this.isEdgeActive(e.id)),
        ...EULER_EXTRA_EDGES
      ];

      // Nós participantes da malha física de dutos
      const nodeSet = new Set();
      inspectionEdges.forEach(e => {
        nodeSet.add(e.u);
        nodeSet.add(e.v);
      });

      // Cálculo dos graus não-dirigidos
      const degrees = {};
      const adj = {};
      nodeSet.forEach(node => {
        degrees[node] = 0;
        adj[node] = [];
      });

      inspectionEdges.forEach(e => {
        degrees[e.u]++;
        degrees[e.v]++;
        adj[e.u].push({ neighbor: e.v, edgeId: e.id });
        adj[e.v].push({ neighbor: e.u, edgeId: e.id });
      });

      const oddNodes = Object.keys(degrees).filter(n => degrees[n] % 2 !== 0);

      let isEulerianCircuit = (oddNodes.length === 0);
      let isEulerianTrail = (oddNodes.length === 2);
      let canTraverse = isEulerianCircuit || isEulerianTrail;

      if (!canTraverse) {
        return {
          canTraverse: false,
          isCircuit: false,
          isTrail: false,
          oddNodes,
          degrees,
          message: `Inspeção euleriana estrita impossível: há ${oddNodes.length} vértices com grau ímpar (${oddNodes.join(', ')}). ` +
            `O Teorema de Euler exige 0 vértices ímpares para Circuito ou exatamente 2 para Trilha.`
        };
      }

      // Escolha do nó de início: se houver 2 ímpares, deve iniciar em um deles
      let actualStart = startNodeId;
      if (isEulerianTrail && !oddNodes.includes(startNodeId)) {
        actualStart = oddNodes[0];
      }

      // Algoritmo de Hierholzer com pilha explícita
      const adjCopy = {};
      Object.keys(adj).forEach(k => {
        adjCopy[k] = [...adj[k]];
      });

      const usedEdgeIds = new Set();
      const stack = [actualStart];
      const trail = [];

      while (stack.length > 0) {
        const u = stack[stack.length - 1];

        // Encontra uma aresta ainda não percorrida a partir de u
        let nextEdge = null;
        while (adjCopy[u].length > 0) {
          const cand = adjCopy[u].pop();
          if (!usedEdgeIds.has(cand.edgeId)) {
            nextEdge = cand;
            break;
          }
        }

        if (nextEdge) {
          usedEdgeIds.add(nextEdge.edgeId);
          stack.push(nextEdge.neighbor);
        } else {
          // Retrocesso: insere no percurso
          trail.push(stack.pop());
        }
      }

      trail.reverse();

      return {
        canTraverse: true,
        isCircuit: isEulerianCircuit,
        isTrail: isEulerianTrail,
        startNode: actualStart,
        oddNodes,
        degrees,
        trail,
        totalEdgesInspected: usedEdgeIds.size,
        message: isEulerianCircuit
          ? `Circuito Euleriano completo encontrado pelo Algoritmo de Hierholzer! ${trail.length - 1} trechos inspecionados sem repetição retornando à base.`
          : `Trilha Euleriana aberta encontrada iniciando em [${actualStart}] e finalizando no segundo nó ímpar.`
      };
    }

    // --- TSP / HAMILTON: ROTEAMENTO DE AGV (NEAREST NEIGHBOR + 2-OPT) ---
    /**
     * Resolve o TSP para visitas do AGV às estações de amostragem no pátio.
     */
    runAgvTSP(startStation = 'LAB_CQ') {
      const stations = AGV_STATIONS;
      const n = stations.length;

      // 1. Heurística Construtiva: Vizinho Mais Próximo (Nearest Neighbor)
      const unvisited = new Set(stations);
      unvisited.delete(startStation);

      const nnRoute = [startStation];
      let current = startStation;
      let nnCost = 0;

      while (unvisited.size > 0) {
        let nearest = null;
        let minDist = Infinity;

        unvisited.forEach(cand => {
          const d = AGV_DIST_MATRIX[current][cand];
          if (d < minDist) {
            minDist = d;
            nearest = cand;
          }
        });

        nnRoute.push(nearest);
        nnCost += minDist;
        unvisited.delete(nearest);
        current = nearest;
      }

      // Retorno à base
      const returnDist = AGV_DIST_MATRIX[current][startStation];
      nnRoute.push(startStation);
      nnCost += returnDist;

      // 2. Refinamento Local: Busca 2-Opt (Eliminação de cruzamentos)
      let optRoute = [...nnRoute];
      let optCost = nnCost;
      let improved = true;
      let iterations = 0;
      const MAX_ITER = 100;

      const calcRouteCost = (r) => {
        let c = 0;
        for (let i = 0; i < r.length - 1; i++) {
          c += AGV_DIST_MATRIX[r[i]][r[i + 1]];
        }
        return c;
      };

      while (improved && iterations < MAX_ITER) {
        improved = false;
        iterations++;

        for (let i = 1; i < optRoute.length - 2; i++) {
          for (let j = i + 1; j < optRoute.length - 1; j++) {
            // Inverte o segmento entre i e j
            const newRoute = [
              ...optRoute.slice(0, i),
              ...optRoute.slice(i, j + 1).reverse(),
              ...optRoute.slice(j + 1)
            ];
            const newCost = calcRouteCost(newRoute);

            if (newCost < optCost) {
              optRoute = newRoute;
              optCost = newCost;
              improved = true;
            }
          }
        }
      }

      const diffPct = Number((((nnCost - optCost) / nnCost) * 100).toFixed(1));

      return {
        startStation,
        stationsCount: n,
        nearestNeighbor: {
          route: nnRoute,
          cost: nnCost
        },
        twoOpt: {
          route: optRoute,
          cost: optCost,
          improvementPct: diffPct,
          iterations
        },
        message: `Roteamento AGV concluído: 2-Opt reduziu a distância de ${nnCost}m para ${optCost}m (economia de ${diffPct}% sem cruzamento de trajetos).`
      };
    }

    // --- VALIDAÇÃO DE DAG & ORDENAÇÃO TOPOLÓGICA (ALGORITMO DE KAHN) ---
    /**
     * Determina se o grafo atual é acíclico e gera a ordenação de precedência de fabricação.
     */
    validateDAG(excludeRecirculation = false) {
      // Filtra arestas de processo
      let activeEdges = this.edges.filter(e => this.isEdgeActive(e.id));
      if (excludeRecirculation) {
        // Exclui especificamente a linha de alívio e reciclo VALV_ALIVIO -> TS1
        activeEdges = activeEdges.filter(e => !(e.u === 'VALV_ALIVIO' && e.v === 'TS1') && !(e.u === 'DESCARTE_REJ' && e.v === 'TS1'));
      }

      const activeNodes = Object.keys(this.nodes).filter(id => this.isNodeActive(id));

      // Calcula graus de entrada
      const inDegree = {};
      const adj = {};
      activeNodes.forEach(id => {
        inDegree[id] = 0;
        adj[id] = [];
      });

      activeEdges.forEach(e => {
        if (inDegree[e.v] !== undefined && adj[e.u]) {
          inDegree[e.v]++;
          adj[e.u].push(e.v);
        }
      });

      // Algoritmo de Kahn: fila de nós com inDegree == 0
      const queue = [];
      activeNodes.forEach(id => {
        if (inDegree[id] === 0) {
          queue.push(id);
        }
      });

      const topologicalOrder = [];
      const inDegreeCopy = { ...inDegree };

      while (queue.length > 0) {
        const u = queue.shift();
        topologicalOrder.push(u);

        for (const v of adj[u]) {
          inDegreeCopy[v]--;
          if (inDegreeCopy[v] === 0) {
            queue.push(v);
          }
        }
      }

      const isDAG = (topologicalOrder.length === activeNodes.length);

      let cycleNodes = [];
      if (!isDAG) {
        cycleNodes = activeNodes.filter(id => inDegreeCopy[id] > 0);
      }

      return {
        isDAG,
        topologicalOrder: isDAG ? topologicalOrder : [],
        cycleNodes,
        recirculationExcluded: excludeRecirculation,
        message: isDAG
          ? `O processo é um Grafo Acíclico Dirigido (DAG)! Ordenação Topológica de Kahn: ${topologicalOrder.slice(0, 6).join(' ➔ ')}...`
          : `Ciclo detectado na rede hidráulica envolvendo [${cycleNodes.join(', ')}]. A linha de alívio de pressão (VALV_Alívio ➔ TS1) forma intencionalmente uma malha de recirculação fechada.`
      };
    }
  }

  // Exporta no escopo global
  global.GraphEngine = GraphEngine;
  global.PLANT_NODES = PLANT_NODES;
  global.PLANT_EDGES = PLANT_EDGES;

})(typeof window !== 'undefined' ? window : this);
