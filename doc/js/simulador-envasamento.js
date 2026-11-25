/**
 * simulador-envasamento.js
 * Simulador Interativo do Sistema de Engarrafamento e Inspeção de Bebidas
 * 
 * Projeto: SCADA-Core Automática — Grupo 3
 * Disciplina: ECAA08 — Matemática Discreta / Automação
 * 
 * Implementa:
 *  - Máquina de estados finita para cada garrafa
 *  - Esteira transportadora animada
 *  - Estação de enchimento com controle de nível
 *  - Estação de inspeção com lógica booleana
 *  - Mecanismo de rejeição/aprovação
 *  - Painel de monitoramento em tempo real
 *  - Painel de lógica proposicional
 */

(function () {
  'use strict';

  // ============================================================
  //  CONSTANTES E CONFIGURAÇÃO
  // ============================================================
  const CANVAS_W = 1100;
  const CANVAS_H = 420;

  // Posições X das estações na esteira (em pixels no canvas)
  const ENTRY_X = 30;
  const SENSOR_X = 200;
  const FILL_X = 380;
  const INSPECT_X = 580;
  const REJECT_X = 720;
  const EXIT_APPROVED_X = 1000;
  const EXIT_REJECTED_Y = 370;
  const CONVEYOR_Y = 230;
  const CONVEYOR_HEIGHT = 16;

  // Configuração de garrafas
  const BOTTLE_WIDTH = 28;
  const BOTTLE_HEIGHT = 56;
  const BOTTLE_NECK_WIDTH = 12;
  const BOTTLE_NECK_HEIGHT = 14;

  // Cores SCADA
  const COLORS = {
    bgDark: '#050a17',
    conveyor: '#1e3a5f',
    conveyorBelt: '#2d4a6f',
    conveyorRollers: '#3b5998',
    stationOff: '#1e293b',
    stationOn: '#10b981',
    stationBusy: '#f59e0b',
    stationFail: '#ef4444',
    bottleEmpty: '#94a3b8',
    bottleFill: '#06b6d4',
    bottleFillBad: '#ef4444',
    bottleApproved: '#10b981',
    bottleRejected: '#ef4444',
    sensorBeam: '#f59e0b',
    sensorActive: '#10b981',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    accent: '#38bdf8',
    labelBg: 'rgba(9, 18, 36, 0.85)',
  };

  // Estados da garrafa (Máquina de Estados Finita)
  const BottleState = {
    ENTERING: 'ENTERING',
    DETECTED: 'DETECTED',
    MOVING_TO_FILL: 'MOVING_TO_FILL',
    WAITING_FILL: 'WAITING_FILL',
    FILLING: 'FILLING',
    FILLED: 'FILLED',
    MOVING_TO_INSPECT: 'MOVING_TO_INSPECT',
    INSPECTING: 'INSPECTING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    MOVING_TO_EXIT: 'MOVING_TO_EXIT',
    MOVING_TO_REJECT: 'MOVING_TO_REJECT',
    EXITED: 'EXITED',
  };

  // Estados dos equipamentos
  const EquipState = {
    OFF: 'OFF',
    IDLE: 'IDLE',
    ACTIVE: 'ACTIVE',
    BUSY: 'BUSY',
    FAULT: 'FAULT',
  };

  // ============================================================
  //  CLASSE BOTTLE (Garrafa)
  // ============================================================
  class Bottle {
    static nextId = 1;
    constructor(x, y) {
      this.id = Bottle.nextId++;
      this.x = x;
      this.y = y;
      this.state = BottleState.ENTERING;
      this.fillLevel = 0;        // 0 a 1
      this.targetFill = 0;
      this.hasDefect = false;
      this.defectType = null;
      this.fillOk = false;
      this.inspected = false;
      this.approved = false;
      this.stateTimer = 0;
      this.createdAt = Date.now();

      // Lógica booleana avaliada
      this.logic = {
        detected: false,
        filled: false,
        levelOk: false,
        noDefect: true,
        approved: false,
      };
    }
  }

  // ============================================================
  //  CLASSE PRINCIPAL — BottlingSimulator
  // ============================================================
  class BottlingSimulator {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.running = false;
      this.paused = false;
      this.speed = 1.0;
      this.lastTime = 0;
      this.animFrame = null;
      this.rollerOffset = 0;

      // Garrafas
      this.bottles = [];
      this.processedCount = 0;
      this.approvedCount = 0;
      this.rejectedCount = 0;
      this.totalBottlesCreated = 0;

      // Taxas
      this.startTime = 0;
      this.defectRate = 0.15; // 15% chance de defeito

      // Auto-inject
      this.autoInject = true;
      this.autoInjectInterval = 3500; // ms
      this.lastAutoInject = 0;

      // Estados dos equipamentos
      this.conveyor = { state: EquipState.OFF };
      this.sensor = { state: EquipState.OFF, detecting: false };
      this.filler = { state: EquipState.OFF, busy: false, currentBottle: null };
      this.inspector = { state: EquipState.OFF, busy: false, currentBottle: null };
      this.rejector = { state: EquipState.OFF, active: false };

      // Alarmes
      this.alarms = [];
      this.maxAlarms = 20;

      // Console log
      this.consoleEntries = [];
      this.maxConsoleEntries = 50;

      // Lógica da garrafa em destaque (para o painel de lógica)
      this.highlightedBottle = null;

      // Falha simulada
      this.simulatedFault = null; // null, 'conveyor', 'filler', 'inspector'

      this.init();
    }

    // ----------------------------------------------------------
    //  INICIALIZAÇÃO
    // ----------------------------------------------------------
    init() {
      this.canvas = document.getElementById('envasamento-canvas');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.setupCanvasResolution();
      this.bindControls();
      this.drawStaticState();
      this.logConsole('Sistema de Engarrafamento inicializado. Aguardando comando de início.', 'info');
    }

    setupCanvasResolution() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const displayWidth = rect.width || CANVAS_W;
      const displayHeight = (displayWidth / CANVAS_W) * CANVAS_H;

      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;
      this.canvas.style.height = displayHeight + 'px';

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale((displayWidth * dpr) / CANVAS_W, (displayHeight * dpr) / CANVAS_H);
    }

    // ----------------------------------------------------------
    //  BINDAGEM DE CONTROLES
    // ----------------------------------------------------------
    bindControls() {
      const btn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn.bind(this));
      };

      btn('env-btn-start', this.start);
      btn('env-btn-pause', this.togglePause);
      btn('env-btn-reset', this.reset);
      btn('env-btn-inject', this.injectBottle);

      // Speed slider
      const speedSlider = document.getElementById('env-speed');
      const speedVal = document.getElementById('env-speed-val');
      if (speedSlider) {
        speedSlider.addEventListener('input', () => {
          this.speed = parseFloat(speedSlider.value);
          if (speedVal) speedVal.textContent = this.speed.toFixed(1) + 'x';
        });
      }

      // Defect rate slider
      const defectSlider = document.getElementById('env-defect-rate');
      const defectVal = document.getElementById('env-defect-rate-val');
      if (defectSlider) {
        defectSlider.addEventListener('input', () => {
          this.defectRate = parseFloat(defectSlider.value) / 100;
          if (defectVal) defectVal.textContent = defectSlider.value + '%';
        });
      }

      // Auto inject toggle
      const autoChk = document.getElementById('env-auto-inject');
      if (autoChk) {
        autoChk.addEventListener('change', () => {
          this.autoInject = autoChk.checked;
        });
      }

      // Fault injection buttons
      btn('env-fault-conveyor', () => this.injectFault('conveyor'));
      btn('env-fault-filler', () => this.injectFault('filler'));
      btn('env-fault-inspector', () => this.injectFault('inspector'));
      btn('env-fault-clear', () => this.clearFault());

      // Canvas resize
      window.addEventListener('resize', () => {
        this.setupCanvasResolution();
        if (!this.running) this.drawStaticState();
      });
    }

    // ----------------------------------------------------------
    //  CONTROLES
    // ----------------------------------------------------------
    start() {
      if (this.running && !this.paused) return;
      if (this.paused) {
        this.paused = false;
        this.updateControlStates();
        this.logConsole('Simulação retomada.', 'info');
        return;
      }

      this.running = true;
      this.paused = false;
      this.startTime = Date.now();
      this.lastTime = performance.now();
      this.lastAutoInject = Date.now();

      // Ligar equipamentos
      this.conveyor.state = EquipState.ACTIVE;
      this.sensor.state = EquipState.IDLE;
      this.filler.state = EquipState.IDLE;
      this.inspector.state = EquipState.IDLE;
      this.rejector.state = EquipState.IDLE;

      this.updateControlStates();
      this.logConsole('🟢 Linha de engarrafamento INICIADA. Esteira, enchimento e inspeção operacionais.', 'info');
      this.addAlarm('Sistema iniciado — Linha operacional', 'info');

      this.loop();
    }

    togglePause() {
      if (!this.running) return;
      this.paused = !this.paused;
      if (this.paused) {
        this.logConsole('⏸️ Simulação PAUSADA.', 'warn');
      } else {
        this.lastTime = performance.now();
        this.logConsole('▶️ Simulação RETOMADA.', 'info');
        this.loop();
      }
      this.updateControlStates();
    }

    reset() {
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      this.running = false;
      this.paused = false;
      this.bottles = [];
      this.processedCount = 0;
      this.approvedCount = 0;
      this.rejectedCount = 0;
      this.totalBottlesCreated = 0;
      Bottle.nextId = 1;
      this.highlightedBottle = null;
      this.simulatedFault = null;
      this.rollerOffset = 0;

      this.conveyor.state = EquipState.OFF;
      this.sensor = { state: EquipState.OFF, detecting: false };
      this.filler = { state: EquipState.OFF, busy: false, currentBottle: null };
      this.inspector = { state: EquipState.OFF, busy: false, currentBottle: null };
      this.rejector = { state: EquipState.OFF, active: false };

      this.alarms = [];
      this.consoleEntries = [];

      this.updateControlStates();
      this.updateDashboard();
      this.updateLogicPanel(null);
      this.updateEquipmentStates();
      this.updateAlarmPanel();
      this.drawStaticState();
      this.logConsole('🔄 Sistema REINICIADO. Todos os contadores e estados restaurados.', 'info');
    }

    injectBottle() {
      if (!this.running || this.paused) return;
      if (this.simulatedFault === 'conveyor') {
        this.logConsole('⚠️ Não é possível injetar garrafa: esteira em falha.', 'alarm');
        return;
      }

      // Check if there is space at entry
      const nearEntry = this.bottles.some(b =>
        b.x < ENTRY_X + BOTTLE_WIDTH * 2 && b.state === BottleState.ENTERING
      );
      if (nearEntry) {
        this.logConsole('⚠️ Aguarde espaço na entrada para nova garrafa.', 'warn');
        return;
      }

      this.createBottle();
    }

    createBottle() {
      const bottle = new Bottle(ENTRY_X, CONVEYOR_Y - BOTTLE_HEIGHT);
      this.totalBottlesCreated++;

      // Determine if defective (random with configurable rate)
      if (Math.random() < this.defectRate) {
        bottle.hasDefect = true;
        const defects = ['crack', 'contamination', 'shape'];
        bottle.defectType = defects[Math.floor(Math.random() * defects.length)];
      }

      // Target fill level (slight random variation to test level check)
      bottle.targetFill = 0.85 + Math.random() * 0.15; // 85% to 100%
      if (Math.random() < 0.08) {
        bottle.targetFill = 0.4 + Math.random() * 0.3; // Under-fill 40-70%
      }

      this.bottles.push(bottle);
      this.logConsole(`🍾 Garrafa #${bottle.id} inserida na entrada da linha.${bottle.hasDefect ? ' [Defeito oculto: ' + bottle.defectType + ']' : ''}`, 'info');
      return bottle;
    }

    injectFault(type) {
      if (!this.running) return;
      this.simulatedFault = type;
      const names = { conveyor: 'Esteira', filler: 'Estação de Enchimento', inspector: 'Estação de Inspeção' };
      this.logConsole(`🚨 FALHA SIMULADA: ${names[type]} em estado de FALHA!`, 'alarm');
      this.addAlarm(`FALHA: ${names[type]} — Intervenção necessária`, 'critical');

      if (type === 'conveyor') this.conveyor.state = EquipState.FAULT;
      if (type === 'filler') this.filler.state = EquipState.FAULT;
      if (type === 'inspector') this.inspector.state = EquipState.FAULT;

      this.updateEquipmentStates();
    }

    clearFault() {
      if (!this.simulatedFault) return;
      const names = { conveyor: 'Esteira', filler: 'Estação de Enchimento', inspector: 'Estação de Inspeção' };
      this.logConsole(`✅ Falha em ${names[this.simulatedFault]} RESOLVIDA. Equipamento retornando ao modo operacional.`, 'info');
      this.addAlarm(`Falha resolvida: ${names[this.simulatedFault]}`, 'info');

      if (this.simulatedFault === 'conveyor') this.conveyor.state = EquipState.ACTIVE;
      if (this.simulatedFault === 'filler') this.filler.state = EquipState.IDLE;
      if (this.simulatedFault === 'inspector') this.inspector.state = EquipState.IDLE;
      this.simulatedFault = null;
      this.updateEquipmentStates();
    }

    updateControlStates() {
      const startBtn = document.getElementById('env-btn-start');
      const pauseBtn = document.getElementById('env-btn-pause');
      const injectBtn = document.getElementById('env-btn-inject');

      if (startBtn) {
        startBtn.disabled = this.running && !this.paused;
        startBtn.textContent = this.paused ? '▶️ Retomar' : '▶️ Iniciar';
      }
      if (pauseBtn) {
        pauseBtn.disabled = !this.running;
        pauseBtn.textContent = this.paused ? '▶️ Retomar' : '⏸️ Pausar';
      }
      if (injectBtn) {
        injectBtn.disabled = !this.running || this.paused;
      }
    }

    // ----------------------------------------------------------
    //  LOOP PRINCIPAL
    // ----------------------------------------------------------
    loop() {
      if (!this.running || this.paused) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000; // seconds
      const dt = rawDt * this.speed;
      this.lastTime = now;

      // Auto-inject
      if (this.autoInject && this.simulatedFault !== 'conveyor') {
        const elapsed = Date.now() - this.lastAutoInject;
        if (elapsed > this.autoInjectInterval / this.speed) {
          const nearEntry = this.bottles.some(b =>
            b.x < ENTRY_X + BOTTLE_WIDTH * 3 &&
            (b.state === BottleState.ENTERING || b.state === BottleState.DETECTED)
          );
          if (!nearEntry) {
            this.createBottle();
            this.lastAutoInject = Date.now();
          }
        }
      }

      this.update(dt);
      this.render();
      this.updateDashboard();
      this.updateEquipmentStates();

      this.animFrame = requestAnimationFrame(() => this.loop());
    }

    // ----------------------------------------------------------
    //  ATUALIZAÇÃO DA LÓGICA (MÁQUINA DE ESTADOS)
    // ----------------------------------------------------------
    update(dt) {
      // Rollers animation
      this.rollerOffset = (this.rollerOffset + dt * 60) % 20;

      // Sensor detection
      this.sensor.detecting = false;

      for (let i = this.bottles.length - 1; i >= 0; i--) {
        const b = this.bottles[i];
        const moveSpeed = 80 * dt; // pixels per tick

        switch (b.state) {
          case BottleState.ENTERING:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.x += moveSpeed;
            if (b.x >= SENSOR_X) {
              b.state = BottleState.DETECTED;
              b.logic.detected = true;
              this.sensor.detecting = true;
              this.sensor.state = EquipState.ACTIVE;
              this.logConsole(`📡 Sensor ativado: Garrafa #${b.id} detectada na posição do sensor.`, 'info');
            }
            break;

          case BottleState.DETECTED:
            if (this.conveyor.state === EquipState.FAULT) break;
            this.sensor.detecting = true;
            b.state = BottleState.MOVING_TO_FILL;
            break;

          case BottleState.MOVING_TO_FILL:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.x += moveSpeed;
            if (b.x >= FILL_X) {
              b.x = FILL_X;
              if (this.filler.state === EquipState.FAULT) {
                b.state = BottleState.WAITING_FILL;
                this.logConsole(`⚠️ Garrafa #${b.id} aguardando — Estação de enchimento em FALHA.`, 'warn');
              } else if (this.filler.busy) {
                b.state = BottleState.WAITING_FILL;
              } else {
                b.state = BottleState.FILLING;
                this.filler.busy = true;
                this.filler.currentBottle = b;
                this.filler.state = EquipState.BUSY;
                this.logConsole(`🚰 Garrafa #${b.id} em enchimento. Nível alvo: ${(b.targetFill * 100).toFixed(0)}%`, 'info');
              }
            }
            break;

          case BottleState.WAITING_FILL:
            if (this.filler.state === EquipState.FAULT) break;
            if (!this.filler.busy) {
              b.state = BottleState.FILLING;
              this.filler.busy = true;
              this.filler.currentBottle = b;
              this.filler.state = EquipState.BUSY;
              this.logConsole(`🚰 Garrafa #${b.id} em enchimento. Nível alvo: ${(b.targetFill * 100).toFixed(0)}%`, 'info');
            }
            break;

          case BottleState.FILLING:
            if (this.filler.state === EquipState.FAULT) {
              this.filler.busy = false;
              this.filler.currentBottle = null;
              b.state = BottleState.WAITING_FILL;
              break;
            }
            b.fillLevel += dt * 0.5; // Fill speed
            if (b.fillLevel >= b.targetFill) {
              b.fillLevel = b.targetFill;
              b.state = BottleState.FILLED;
              b.logic.filled = true;
              b.logic.levelOk = b.fillLevel >= 0.80;
              this.filler.busy = false;
              this.filler.currentBottle = null;
              this.filler.state = EquipState.IDLE;
              this.logConsole(`✅ Garrafa #${b.id} enchida. Nível: ${(b.fillLevel * 100).toFixed(1)}% ${b.logic.levelOk ? '(ADEQUADO)' : '(INSUFICIENTE ⚠️)'}`, b.logic.levelOk ? 'info' : 'warn');
            }
            break;

          case BottleState.FILLED:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.state = BottleState.MOVING_TO_INSPECT;
            break;

          case BottleState.MOVING_TO_INSPECT:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.x += moveSpeed;
            if (b.x >= INSPECT_X) {
              b.x = INSPECT_X;
              if (this.inspector.state === EquipState.FAULT) {
                // If inspector is broken, reject by default
                b.state = BottleState.REJECTED;
                b.logic.approved = false;
                b.approved = false;
                this.rejectedCount++;
                this.processedCount++;
                this.logConsole(`🚨 Garrafa #${b.id} REJEITADA (inspeção impossível — equipamento em falha).`, 'alarm');
                this.addAlarm(`Garrafa #${b.id} rejeitada — Inspetor em falha`, 'warning');
              } else if (this.inspector.busy) {
                // Wait
              } else {
                this.startInspection(b);
              }
            }
            break;

          case BottleState.INSPECTING:
            b.stateTimer += dt;
            if (b.stateTimer >= 1.2) { // 1.2 seconds inspection time
              this.completeInspection(b);
            }
            break;

          case BottleState.APPROVED:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.state = BottleState.MOVING_TO_EXIT;
            break;

          case BottleState.REJECTED:
            if (this.conveyor.state === EquipState.FAULT) break;
            b.state = BottleState.MOVING_TO_REJECT;
            this.rejector.active = true;
            this.rejector.state = EquipState.ACTIVE;
            break;

          case BottleState.MOVING_TO_EXIT:
            b.x += moveSpeed;
            if (b.x >= EXIT_APPROVED_X) {
              b.state = BottleState.EXITED;
            }
            break;

          case BottleState.MOVING_TO_REJECT:
            // Move down to rejection chute
            b.y += moveSpeed * 0.8;
            b.x += moveSpeed * 0.3;
            if (b.y >= EXIT_REJECTED_Y) {
              b.state = BottleState.EXITED;
              this.rejector.active = false;
              this.rejector.state = EquipState.IDLE;
            }
            break;

          case BottleState.EXITED:
            break;
        }

        // Update highlighted bottle for logic panel
        if (b.state !== BottleState.EXITED && b.state !== BottleState.ENTERING) {
          this.highlightedBottle = b;
        }
      }

      // Clean up exited bottles
      this.bottles = this.bottles.filter(b => b.state !== BottleState.EXITED);

      // Update sensor state
      if (!this.sensor.detecting && this.sensor.state === EquipState.ACTIVE) {
        this.sensor.state = EquipState.IDLE;
      }

      // Update logic panel for highlighted bottle
      this.updateLogicPanel(this.highlightedBottle);
    }

    startInspection(b) {
      b.state = BottleState.INSPECTING;
      b.stateTimer = 0;
      this.inspector.busy = true;
      this.inspector.currentBottle = b;
      this.inspector.state = EquipState.BUSY;
      this.logConsole(`🔍 Garrafa #${b.id} em INSPEÇÃO. Avaliando condições de qualidade...`, 'info');
    }

    completeInspection(b) {
      b.inspected = true;
      b.logic.noDefect = !b.hasDefect;

      // Boolean decision logic:
      // APPROVED = DETECTED AND FILLED AND LEVEL_OK AND NO_DEFECT
      const approved = b.logic.detected && b.logic.filled && b.logic.levelOk && b.logic.noDefect;
      b.logic.approved = approved;
      b.approved = approved;

      this.inspector.busy = false;
      this.inspector.currentBottle = null;
      this.inspector.state = EquipState.IDLE;
      this.processedCount++;

      if (approved) {
        b.state = BottleState.APPROVED;
        this.approvedCount++;
        this.logConsole(`✅ Garrafa #${b.id} APROVADA ✓ [Det:1 Enc:1 Nível:1 Def:0]`, 'info');
      } else {
        b.state = BottleState.REJECTED;
        this.rejectedCount++;
        const reasons = [];
        if (!b.logic.detected) reasons.push('Não detectada');
        if (!b.logic.filled) reasons.push('Não enchida');
        if (!b.logic.levelOk) reasons.push('Nível insuficiente (' + (b.fillLevel * 100).toFixed(1) + '%)');
        if (!b.logic.noDefect) reasons.push('Defeito: ' + b.defectType);
        this.logConsole(`❌ Garrafa #${b.id} REJEITADA ✗ — Motivo: ${reasons.join(', ')}`, 'alarm');
        this.addAlarm(`Garrafa #${b.id} rejeitada: ${reasons.join(', ')}`, 'warning');
      }
    }

    // ----------------------------------------------------------
    //  RENDERIZAÇÃO (CANVAS)
    // ----------------------------------------------------------
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid pattern
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y < CANVAS_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      this.drawConveyor(ctx);
      this.drawStations(ctx);
      this.drawBottles(ctx);
      this.drawLabels(ctx);
      this.drawRejectChute(ctx);
      this.drawExitArea(ctx);
    }

    drawConveyor(ctx) {
      const y = CONVEYOR_Y;
      const h = CONVEYOR_HEIGHT;

      // Main conveyor belt
      ctx.fillStyle = this.conveyor.state === EquipState.FAULT ? '#3b1111' : COLORS.conveyor;
      ctx.fillRect(ENTRY_X - 10, y, EXIT_APPROVED_X - ENTRY_X + 50, h);

      // Conveyor border
      ctx.strokeStyle = this.conveyor.state === EquipState.FAULT ? '#ef4444' : '#3b5998';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ENTRY_X - 10, y, EXIT_APPROVED_X - ENTRY_X + 50, h);

      // Rollers (animated)
      if (this.conveyor.state !== EquipState.FAULT && this.conveyor.state !== EquipState.OFF) {
        ctx.fillStyle = COLORS.conveyorRollers;
        for (let rx = ENTRY_X; rx < EXIT_APPROVED_X + 30; rx += 20) {
          const offset = (rx + this.rollerOffset) % 20;
          ctx.fillRect(rx + offset - 10, y + 2, 3, h - 4);
        }
      }

      // Entry arrow
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(ENTRY_X - 20, y + h / 2);
      ctx.lineTo(ENTRY_X - 5, y);
      ctx.lineTo(ENTRY_X - 5, y + h);
      ctx.closePath();
      ctx.fill();
    }

    drawRejectChute(ctx) {
      // Rejection chute from REJECT_X going down
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(REJECT_X + BOTTLE_WIDTH / 2, CONVEYOR_Y + CONVEYOR_HEIGHT);
      ctx.lineTo(REJECT_X + BOTTLE_WIDTH / 2 + 40, EXIT_REJECTED_Y + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Reject bin
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.fillRect(REJECT_X + 20, EXIT_REJECTED_Y, 70, 30);
      ctx.strokeRect(REJECT_X + 20, EXIT_REJECTED_Y, 70, 30);
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('REJEIÇÃO', REJECT_X + 55, EXIT_REJECTED_Y + 19);
    }

    drawExitArea(ctx) {
      // Approved exit
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.fillRect(EXIT_APPROVED_X - 10, CONVEYOR_Y - 60, 80, 60 + CONVEYOR_HEIGHT + 10);
      ctx.strokeRect(EXIT_APPROVED_X - 10, CONVEYOR_Y - 60, 80, 60 + CONVEYOR_HEIGHT + 10);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('SAÍDA', EXIT_APPROVED_X + 30, CONVEYOR_Y - 42);
      ctx.fillText('APROVADAS', EXIT_APPROVED_X + 30, CONVEYOR_Y - 28);
      ctx.font = '20px sans-serif';
      ctx.fillText('✓', EXIT_APPROVED_X + 30, CONVEYOR_Y - 5);
    }

    drawStations(ctx) {
      // 1. Sensor station
      this.drawStation(ctx, SENSOR_X, 'SENSOR', '📡', this.sensor.state, this.sensor.detecting);

      // Sensor beam
      if (this.sensor.detecting) {
        ctx.strokeStyle = COLORS.sensorBeam;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 150);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(SENSOR_X + BOTTLE_WIDTH / 2, CONVEYOR_Y - 70);
        ctx.lineTo(SENSOR_X + BOTTLE_WIDTH / 2, CONVEYOR_Y - 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // 2. Fill station
      this.drawStation(ctx, FILL_X, 'ENCHIMENTO', '🚰', this.filler.state, this.filler.busy);

      // Fill nozzle animation
      if (this.filler.busy) {
        ctx.fillStyle = COLORS.bottleFill;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 100);
        ctx.fillRect(FILL_X + BOTTLE_WIDTH / 2 - 3, CONVEYOR_Y - BOTTLE_HEIGHT - BOTTLE_NECK_HEIGHT - 5, 6, BOTTLE_NECK_HEIGHT + 5);
        ctx.globalAlpha = 1;
      }

      // 3. Inspection station
      this.drawStation(ctx, INSPECT_X, 'INSPEÇÃO', '🔍', this.inspector.state, this.inspector.busy);

      // Inspection scan effect
      if (this.inspector.busy) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 200));
        const scanY = CONVEYOR_Y - BOTTLE_HEIGHT + (BOTTLE_HEIGHT * ((Date.now() / 400) % 1));
        ctx.beginPath();
        ctx.moveTo(INSPECT_X - 5, scanY);
        ctx.lineTo(INSPECT_X + BOTTLE_WIDTH + 5, scanY);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 4. Rejection gate
      this.drawStation(ctx, REJECT_X, 'DESVIO', '⛔', this.rejector.state, this.rejector.active);
    }

    drawStation(ctx, x, label, emoji, state, active) {
      const stationY = CONVEYOR_Y - 85;
      const stationW = 65;
      const stationH = 70;
      const sx = x - (stationW - BOTTLE_WIDTH) / 2;

      // Station housing
      let bgColor, borderColor;
      switch (state) {
        case EquipState.FAULT:
          bgColor = 'rgba(239, 68, 68, 0.15)';
          borderColor = '#ef4444';
          break;
        case EquipState.BUSY:
          bgColor = 'rgba(245, 158, 11, 0.12)';
          borderColor = '#f59e0b';
          break;
        case EquipState.ACTIVE:
          bgColor = 'rgba(16, 185, 129, 0.12)';
          borderColor = '#10b981';
          break;
        case EquipState.IDLE:
          bgColor = 'rgba(56, 189, 248, 0.08)';
          borderColor = '#1e3a5f';
          break;
        default:
          bgColor = 'rgba(30, 41, 59, 0.3)';
          borderColor = '#334155';
      }

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;

      // Rounded rect
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(sx + r, stationY);
      ctx.lineTo(sx + stationW - r, stationY);
      ctx.quadraticCurveTo(sx + stationW, stationY, sx + stationW, stationY + r);
      ctx.lineTo(sx + stationW, stationY + stationH - r);
      ctx.quadraticCurveTo(sx + stationW, stationY + stationH, sx + stationW - r, stationY + stationH);
      ctx.lineTo(sx + r, stationY + stationH);
      ctx.quadraticCurveTo(sx, stationY + stationH, sx, stationY + stationH - r);
      ctx.lineTo(sx, stationY + r);
      ctx.quadraticCurveTo(sx, stationY, sx + r, stationY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Emoji
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(emoji, sx + stationW / 2, stationY + 28);

      // Label
      ctx.font = 'bold 8px "JetBrains Mono"';
      ctx.fillStyle = borderColor;
      ctx.fillText(label, sx + stationW / 2, stationY + 46);

      // Status indicator dot
      const dotColor = state === EquipState.FAULT ? '#ef4444' :
        state === EquipState.BUSY ? '#f59e0b' :
          state === EquipState.ACTIVE ? '#10b981' :
            state === EquipState.IDLE ? '#38bdf8' : '#475569';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(sx + stationW / 2, stationY + 60, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing glow for active/busy
      if (active || state === EquipState.FAULT) {
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 300);
        ctx.beginPath();
        ctx.arc(sx + stationW / 2, stationY + 60, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Connection line to conveyor
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x + BOTTLE_WIDTH / 2, stationY + stationH);
      ctx.lineTo(x + BOTTLE_WIDTH / 2, CONVEYOR_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawBottles(ctx) {
      for (const b of this.bottles) {
        this.drawBottle(ctx, b);
      }
    }

    drawBottle(ctx, b) {
      const x = b.x;
      const y = b.y;
      const w = BOTTLE_WIDTH;
      const h = BOTTLE_HEIGHT;
      const nw = BOTTLE_NECK_WIDTH;
      const nh = BOTTLE_NECK_HEIGHT;

      // Bottle body
      ctx.fillStyle = b.approved ? 'rgba(16, 185, 129, 0.15)' :
        b.state === BottleState.REJECTED || b.state === BottleState.MOVING_TO_REJECT
          ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.1)';
      ctx.strokeStyle = b.approved ? COLORS.bottleApproved :
        b.state === BottleState.REJECTED || b.state === BottleState.MOVING_TO_REJECT
          ? COLORS.bottleRejected : COLORS.bottleEmpty;
      ctx.lineWidth = 1.5;

      // Body
      const br = 4;
      ctx.beginPath();
      ctx.moveTo(x + br, y + nh);
      ctx.lineTo(x + (w - nw) / 2, y + nh);
      ctx.lineTo(x + (w - nw) / 2, y);
      ctx.lineTo(x + (w + nw) / 2, y);
      ctx.lineTo(x + (w + nw) / 2, y + nh);
      ctx.lineTo(x + w - br, y + nh);
      ctx.quadraticCurveTo(x + w, y + nh, x + w, y + nh + br);
      ctx.lineTo(x + w, y + h - br);
      ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      ctx.lineTo(x + br, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - br);
      ctx.lineTo(x, y + nh + br);
      ctx.quadraticCurveTo(x, y + nh, x + br, y + nh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fill level (liquid inside)
      if (b.fillLevel > 0) {
        const fillH = (h - nh) * b.fillLevel;
        const fillY = y + h - fillH;
        ctx.fillStyle = b.logic.levelOk === false && b.inspected
          ? COLORS.bottleFillBad
          : COLORS.bottleFill;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x + 2, fillY, w - 4, fillH - 2);
        ctx.globalAlpha = 1;
      }

      // Defect indicator (small red mark)
      if (b.hasDefect && b.inspected) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✗', x + w / 2, y + h / 2);
      }

      // ID label
      ctx.fillStyle = COLORS.text;
      ctx.font = '8px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(`#${b.id}`, x + w / 2, y + h + 12);

      // State label for highlighted bottle (most recent interesting bottle)
      if (this.highlightedBottle === b) {
        ctx.fillStyle = COLORS.labelBg;
        const stateText = this.getStateLabel(b.state);
        const tw = ctx.measureText(stateText).width + 10;
        ctx.fillRect(x + w / 2 - tw / 2, y - 18, tw, 14);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 8px "JetBrains Mono"';
        ctx.fillText(stateText, x + w / 2, y - 8);
      }
    }

    getStateLabel(state) {
      const labels = {
        [BottleState.ENTERING]: 'ENTRANDO',
        [BottleState.DETECTED]: 'DETECTADA',
        [BottleState.MOVING_TO_FILL]: 'INDO P/ ENCHIMENTO',
        [BottleState.WAITING_FILL]: 'AGUARDANDO',
        [BottleState.FILLING]: 'ENCHENDO',
        [BottleState.FILLED]: 'ENCHIDA',
        [BottleState.MOVING_TO_INSPECT]: 'INDO P/ INSPEÇÃO',
        [BottleState.INSPECTING]: 'INSPECIONANDO',
        [BottleState.APPROVED]: 'APROVADA ✓',
        [BottleState.REJECTED]: 'REJEITADA ✗',
        [BottleState.MOVING_TO_EXIT]: 'SAINDO',
        [BottleState.MOVING_TO_REJECT]: 'REJEITANDO',
        [BottleState.EXITED]: 'SAIU',
      };
      return labels[state] || state;
    }

    drawLabels(ctx) {
      // Title bar
      ctx.fillStyle = 'rgba(9, 18, 36, 0.9)';
      ctx.fillRect(0, 0, CANVAS_W, 28);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(CANVAS_W, 28); ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText('SINÓTICO — LINHA DE ENGARRAFAMENTO E INSPEÇÃO', 12, 18);

      // Live indicator
      if (this.running && !this.paused) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(CANVAS_W - 50, 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.font = '9px "JetBrains Mono"';
        ctx.textAlign = 'left';
        ctx.fillText('LIVE', CANVAS_W - 42, 17);
      } else if (this.paused) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '9px "JetBrains Mono"';
        ctx.textAlign = 'right';
        ctx.fillText('⏸ PAUSADO', CANVAS_W - 12, 17);
      }

      // Flow direction
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('ENTRADA →                                    → SAÍDA', CANVAS_W / 2, CONVEYOR_Y + CONVEYOR_HEIGHT + 30);
    }

    drawStaticState() {
      this.render();
    }

    // ----------------------------------------------------------
    //  PAINÉIS DE DASHBOARD
    // ----------------------------------------------------------
    updateDashboard() {
      this.setTextContent('env-total', this.totalBottlesCreated);
      this.setTextContent('env-processed', this.processedCount);
      this.setTextContent('env-approved', this.approvedCount);
      this.setTextContent('env-rejected', this.rejectedCount);

      const rate = this.processedCount > 0
        ? ((this.approvedCount / this.processedCount) * 100).toFixed(1) + '%'
        : '—';
      this.setTextContent('env-approval-rate', rate);

      // Production rate (bottles per minute)
      if (this.running && this.startTime > 0) {
        const elapsedMin = (Date.now() - this.startTime) / 60000;
        const bpm = elapsedMin > 0 ? (this.processedCount / elapsedMin).toFixed(1) : '0.0';
        this.setTextContent('env-prod-rate', bpm + ' un/min');
      } else {
        this.setTextContent('env-prod-rate', '—');
      }

      // Active bottles on line
      const activeBottles = this.bottles.filter(b => b.state !== BottleState.EXITED).length;
      this.setTextContent('env-active-bottles', activeBottles);
    }

    updateEquipmentStates() {
      this.setEquipBadge('env-equip-conveyor', this.conveyor.state);
      this.setEquipBadge('env-equip-sensor', this.sensor.state);
      this.setEquipBadge('env-equip-filler', this.filler.state);
      this.setEquipBadge('env-equip-inspector', this.inspector.state);
      this.setEquipBadge('env-equip-rejector', this.rejector.state);
    }

    setEquipBadge(id, state) {
      const el = document.getElementById(id);
      if (!el) return;
      const labels = {
        [EquipState.OFF]: ['DESLIGADO', '#475569'],
        [EquipState.IDLE]: ['AGUARDANDO', '#38bdf8'],
        [EquipState.ACTIVE]: ['OPERANDO', '#10b981'],
        [EquipState.BUSY]: ['PROCESSANDO', '#f59e0b'],
        [EquipState.FAULT]: ['FALHA ⚠️', '#ef4444'],
      };
      const [text, color] = labels[state] || ['—', '#475569'];
      el.textContent = text;
      el.style.color = color;
      el.style.borderColor = color;
    }

    updateLogicPanel(bottle) {
      const container = document.getElementById('env-logic-panel-content');
      if (!container) return;

      if (!bottle) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">Inicie a simulação para visualizar a lógica de decisão.</p>';
        return;
      }

      const b = bottle;
      const yes = '<span style="color:#10b981;font-weight:bold;">1 (TRUE)</span>';
      const no = '<span style="color:#ef4444;font-weight:bold;">0 (FALSE)</span>';

      const det = b.logic.detected ? yes : no;
      const filled = b.logic.filled ? yes : no;
      const levelOk = b.logic.levelOk ? yes : no;
      const noDefect = b.logic.noDefect ? yes : no;
      const approved = b.logic.approved ? yes : no;

      const stateLabel = this.getStateLabel(b.state);
      const stateColor = b.approved ? '#10b981' : (b.state === BottleState.REJECTED ? '#ef4444' : '#fbbf24');

      container.innerHTML = `
        <div style="margin-bottom: 0.6rem;">
          <strong style="color:#38bdf8;">Garrafa em Destaque: #${b.id}</strong>
          <span style="color:${stateColor}; margin-left: 0.5rem; font-size: 0.82rem;">[${stateLabel}]</span>
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.82rem; line-height: 1.8;">
          <div><strong>DETECTADA</strong> (Sensor de Presença): ${det}</div>
          <div><strong>ENCHIDA</strong> (Estação de Enchimento): ${filled}</div>
          <div><strong>NÍVEL_ADEQUADO</strong> (Nível ≥ 80%): ${levelOk}
            ${b.fillLevel > 0 ? ' <span style="color:#94a3b8;">(' + (b.fillLevel * 100).toFixed(1) + '%)</span>' : ''}</div>
          <div><strong>SEM_DEFEITO</strong> (Inspeção Visual): ${noDefect}
            ${b.hasDefect && b.inspected ? ' <span style="color:#ef4444;">(' + b.defectType + ')</span>' : ''}</div>
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #1e3a5f;">
            <strong style="color:#fbbf24;">APROVADA = DETECTADA ∧ ENCHIDA ∧ NÍVEL_OK ∧ SEM_DEFEITO</strong>
          </div>
          <div style="margin-top: 0.3rem;">
            <strong>Resultado:</strong> ${b.logic.detected ? '1' : '0'} ∧ ${b.logic.filled ? '1' : '0'} ∧ ${b.logic.levelOk ? '1' : '0'} ∧ ${b.logic.noDefect ? '1' : '0'} = ${approved}
          </div>
          ${b.inspected && !b.approved ? `
          <div style="margin-top: 0.4rem; padding: 0.4rem; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 4px;">
            <strong style="color:#ef4444;">Motivo da Rejeição:</strong>
            ${!b.logic.levelOk ? '<div style="color:#fca5a5;">• Nível insuficiente (' + (b.fillLevel * 100).toFixed(1) + '% < 80%)</div>' : ''}
            ${!b.logic.noDefect ? '<div style="color:#fca5a5;">• Defeito detectado: ' + b.defectType + '</div>' : ''}
          </div>` : ''}
          ${b.inspected && b.approved ? `
          <div style="margin-top: 0.4rem; padding: 0.4rem; background: rgba(16,185,129,0.1); border: 1px solid #10b981; border-radius: 4px;">
            <strong style="color:#10b981;">✓ Todas as condições satisfeitas — Garrafa aprovada para distribuição.</strong>
          </div>` : ''}
        </div>
      `;
    }

    // ----------------------------------------------------------
    //  ALARMES E CONSOLE
    // ----------------------------------------------------------
    addAlarm(message, severity) {
      const time = new Date().toTimeString().split(' ')[0];
      this.alarms.unshift({ time, message, severity });
      if (this.alarms.length > this.maxAlarms) this.alarms.pop();
      this.updateAlarmPanel();
    }

    updateAlarmPanel() {
      const container = document.getElementById('env-alarm-list');
      if (!container) return;

      if (this.alarms.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.82rem;">Nenhum alarme ativo.</div>';
        return;
      }

      container.innerHTML = this.alarms.map(a => {
        const color = a.severity === 'critical' ? '#ef4444' :
          a.severity === 'warning' ? '#f59e0b' : '#38bdf8';
        return `<div style="font-size:0.78rem; margin-bottom:0.25rem; color:${color}; font-family:var(--font-mono);">[${a.time}] ${a.message}</div>`;
      }).join('');
    }

    logConsole(msg, type) {
      const time = new Date().toTimeString().split(' ')[0] + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
      this.consoleEntries.unshift({ time, msg, type });
      if (this.consoleEntries.length > this.maxConsoleEntries) this.consoleEntries.pop();

      const consoleEl = document.getElementById('env-console-log');
      if (!consoleEl) return;

      const colorMap = { info: '#38bdf8', warn: '#fbbf24', alarm: '#f87171', expert: '#c084fc' };
      consoleEl.innerHTML = this.consoleEntries.map(e => {
        const color = colorMap[e.type] || '#10b981';
        return `<div style="margin-bottom:0.2rem;color:${color};font-size:0.78rem;">[${e.time}] ${e.msg}</div>`;
      }).join('');
    }

    // Utility
    setTextContent(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }
  }

  // ============================================================
  //  INICIALIZAÇÃO
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('envasamento-canvas')) {
      window.bottlingSimulator = new BottlingSimulator();
    }
  });

})();
