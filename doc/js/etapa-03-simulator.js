/**
 * etapa-03-simulator.js
 * Simulador Interativo SCADA-Core — Linha de Engarrafamento e Inspeção de Bebidas
 * Grupo 3 — ECAA08 (UNIFEI)
 *
 * Integra:
 *  - Esteira Transportadora (RC1)
 *  - Suprimento & Bombeamento (TS1, SP1, SQ1, VS1, BC1, AS1, VALV_Alivio)
 *  - Dosagem / Envase (VS2, SP2, SQ2)
 *  - Inspeção de Nível (VS3, SL1 >= 95%)
 *  - Tampagem (VS4, AC1)
 *  - Inspeção de Vedação (VS5, SFC1)
 *  - Triagem por Árvore de Decisão (PROD_APROV / REINSPECAO / DESCARTE_REJ)
 *  - Arbitragem Reativa por Behavior Tree (P1..P5)
 */

(function () {
  'use strict';

  const W = 1120;
  const H = 430;
  const BELT_Y = 255;
  const BELT_H = 18;

  const X_ENTRY = 35;
  const X_FILL = 230;      // VS2 / SQ2 / SP2
  const X_LEVEL = 420;     // VS3 / SL1
  const X_CAP = 610;       // VS4 / AC1
  const X_SEAL = 790;      // VS5 / SFC1
  const X_SORT = 930;      // Desvio Triagem
  const X_EXIT = 1055;     // PROD_APROV

  const BW = 26;
  const BH = 54;

  const State = {
    ENTERING: 'ENTERING',
    TO_FILL: 'TO_FILL',
    FILLING: 'FILLING',
    TO_LEVEL: 'TO_LEVEL',
    LEVEL_CHECK: 'LEVEL_CHECK',
    TO_CAP: 'TO_CAP',
    CAPPING: 'CAPPING',
    TO_SEAL: 'TO_SEAL',
    SEAL_CHECK: 'SEAL_CHECK',
    TO_SORT: 'TO_SORT',
    TO_EXIT: 'TO_EXIT',
    TO_REINSPECT: 'TO_REINSPECT',
    TO_REJECT: 'TO_REJECT',
    DONE: 'DONE',
  };

  const Equip = {
    OFF: 'DESLIGADO',
    IDLE: 'AGUARDANDO',
    RUN: 'OPERANDO',
    BUSY: 'PROCESSANDO',
    FAULT: 'FALHA SIS',
  };

  class Bottle {
    static nextId = 1;
    constructor() {
      this.id = Bottle.nextId++;
      this.x = X_ENTRY;
      this.y = BELT_Y - BH;
      this.state = State.ENTERING;
      this.timer = 0;

      // Grandezas físicas da garrafa
      this.fillLevel = 0;       // 0..100 %
      this.targetLevel = 98;    // nominal >= 95%
      this.flowMeasured = 5.0;  // SQ2 L/min [2.0..8.0]
      this.pressMeasured = 3.8; // SP2 Barg [3.0..4.5]
      this.hasCap = false;
      this.capDefect = false;   // falha no rosqueamento AC1
      this.severeDefect = false;// fissura / subenchimento severo

      // Sinais discretos avaliados
      this.l_min = false;       // SL1 >= 95%
      this.x_fc = false;        // SFC1 == 1 (tampa vedada)
      this.q_ok = true;         // SQ2 in [2.0, 8.0]
      this.p_ok = true;         // SP2 in [3.0, 4.5]
      this.decision = null;     // 'PROD_APROV' | 'REINSPECAO' | 'DESCARTE_REJ'
      this.reason = '';
    }
  }

  class BottlingLineSimulator {
    constructor() {
      this.canvas = document.getElementById('envasamento-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.running = false;
      this.paused = false;
      this.speed = 1.0;
      this.anomalyRate = 0.18;
      this.autoInject = true;
      this.lastAuto = 0;
      this.lastFrame = 0;
      this.startTime = 0;
      this.rafId = null;
      this.beltOffset = 0;

      this.bottles = [];
      this.highlighted = null;

      // Contadores
      this.totalCreated = 0;
      this.processed = 0;
      this.approved = 0;
      this.reinspect = 0;
      this.rejected = 0;

      // Telemetria hidráulica (TS1 -> BC1 -> AS1 -> VS2)
      this.sp1 = 2.4; // Barg [1.0..3.5]
      this.sq1 = 24.0; // L/min [5.0..45.0]
      this.sp2 = 3.8; // Barg [3.0..4.5]
      this.sq2 = 5.2; // L/min [2.0..8.0]
      this.rc1Speed = 0.0; // m/s

      // Falha ativa
      this.fault = null; // null | 'estop' | 'sp1_low' | 'sp2_high' | 'vs2_clog' | 'rc1_fail'

      // Equipamentos
      this.eq = {
        rc1: Equip.OFF,
        bc1: Equip.OFF,
        vs2: Equip.OFF,
        sl1: Equip.OFF,
        ac1: Equip.OFF,
        sfc1: Equip.OFF,
      };
      this.busy = { fill: false, level: false, cap: false, seal: false };

      this.alarms = [];
      this.logs = [];
      this.activeBT = 'IDLE';

      this.setupCanvas();
      this.bindUI();
      this.render();
      this.updatePanels();
      this.log('SCADA-Core Etapa 03 pronto. Pressione "Iniciar Linha" para operar.', 'info');
    }

    setupCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const dispW = rect.width || W;
      const dispH = (dispW / W) * H;
      this.canvas.width = dispW * dpr;
      this.canvas.height = dispH * dpr;
      this.canvas.style.height = dispH + 'px';
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale((dispW * dpr) / W, (dispH * dpr) / H);
    }

    bindUI() {
      const on = (id, ev, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn.bind(this));
      };

      on('env-btn-start', 'click', this.start);
      on('env-btn-pause', 'click', this.togglePause);
      on('env-btn-reset', 'click', this.reset);
      on('env-btn-inject', 'click', this.injectBottle);

      const speedEl = document.getElementById('env-speed');
      if (speedEl) {
        speedEl.addEventListener('input', () => {
          this.speed = parseFloat(speedEl.value);
          this.setText('env-speed-val', this.speed.toFixed(1) + 'x');
        });
      }

      const anomEl = document.getElementById('env-defect-rate');
      if (anomEl) {
        anomEl.addEventListener('input', () => {
          this.anomalyRate = parseFloat(anomEl.value) / 100;
          this.setText('env-defect-rate-val', anomEl.value + '%');
        });
      }

      const autoEl = document.getElementById('env-auto-inject');
      if (autoEl) {
        autoEl.addEventListener('change', () => {
          this.autoInject = autoEl.checked;
        });
      }

      on('env-fault-estop', 'click', () => this.triggerFault('estop'));
      on('env-fault-sp1', 'click', () => this.triggerFault('sp1_low'));
      on('env-fault-sp2', 'click', () => this.triggerFault('sp2_high'));
      on('env-fault-vs2', 'click', () => this.triggerFault('vs2_clog'));
      on('env-fault-rc1', 'click', () => this.triggerFault('rc1_fail'));
      on('env-fault-clear', 'click', this.clearFault);

      window.addEventListener('resize', () => {
        this.setupCanvas();
        if (!this.running || this.paused) this.render();
      });
    }

    start() {
      if (this.running && !this.paused) return;
      if (this.paused) {
        this.paused = false;
        this.lastFrame = performance.now();
        this.updateButtons();
        this.log('Simulação retomada.', 'info');
        this.loop();
        return;
      }

      this.running = true;
      this.paused = false;
      this.startTime = Date.now();
      this.lastFrame = performance.now();
      this.lastAuto = Date.now() - 2800;

      if (!this.fault) {
        this.eq.rc1 = Equip.RUN;
        this.eq.bc1 = Equip.RUN;
        this.eq.vs2 = Equip.IDLE;
        this.eq.sl1 = Equip.IDLE;
        this.eq.ac1 = Equip.IDLE;
        this.eq.sfc1 = Equip.IDLE;
        this.rc1Speed = 0.4;
      }

      this.updateButtons();
      this.log('Linha iniciada: TS1 -> VS1 -> BC1 -> AS1 pressurizado. Esteira RC1 a 0,4 m/s.', 'info');
      this.addAlarm('Linha de envase operacional (SCADA-Core)', 'info');
      this.loop();
    }

    togglePause() {
      if (!this.running) return;
      this.paused = !this.paused;
      this.updateButtons();
      if (this.paused) {
        this.rc1Speed = 0.0;
        this.log('Simulação pausada pelo operador.', 'warn');
        this.updatePanels();
      } else {
        this.lastFrame = performance.now();
        this.rc1Speed = this.isBeltStopped() ? 0.0 : 0.4;
        this.log('Simulação retomada.', 'info');
        this.loop();
      }
    }

    reset() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.running = false;
      this.paused = false;
      this.bottles = [];
      this.highlighted = null;
      Bottle.nextId = 1;

      this.totalCreated = 0;
      this.processed = 0;
      this.approved = 0;
      this.reinspect = 0;
      this.rejected = 0;

      this.fault = null;
      this.sp1 = 2.4;
      this.sq1 = 24.0;
      this.sp2 = 3.8;
      this.sq2 = 5.2;
      this.rc1Speed = 0.0;
      this.beltOffset = 0;
      this.activeBT = 'IDLE';

      Object.keys(this.eq).forEach(k => (this.eq[k] = Equip.OFF));
      Object.keys(this.busy).forEach(k => (this.busy[k] = false));
      this.alarms = [];
      this.logs = [];

      this.updateButtons();
      this.render();
      this.updatePanels();
      this.log('Sistema reiniciado. Contadores e estados restaurados.', 'info');
    }

    injectBottle() {
      if (!this.running || this.paused) return;
      if (this.isBeltStopped()) {
        this.log('Bloqueado: esteira RC1 parada por intertravamento/falha.', 'alarm');
        return;
      }
      const blocked = this.bottles.some(b => b.x < X_ENTRY + 70);
      if (blocked) {
        this.log('Aguarde a garrafa anterior avançar na esteira RC1.', 'warn');
        return;
      }
      this.spawnBottle();
    }

    spawnBottle() {
      const b = new Bottle();
      this.totalCreated++;

      // Sorteia condições de qualidade conforme taxa configurada
      const r = Math.random();
      if (r < this.anomalyRate * 0.35) {
        // Defeito crítico severo (fissura / subenchimento < 85%) -> DESCARTE_REJ
        b.severeDefect = true;
        b.targetLevel = 62 + Math.random() * 18; // 62%..80%
      } else if (r < this.anomalyRate * 0.70) {
        // Nível marginal (espuma 86%..94%) -> REINSPECAO
        b.targetLevel = 86 + Math.random() * 8;
      } else if (r < this.anomalyRate) {
        // Falha apenas na tampagem AC1 (nível ok) -> REINSPECAO
        b.capDefect = true;
        b.targetLevel = 96 + Math.random() * 3;
      } else {
        // Garrafa nominal -> PROD_APROV
        b.targetLevel = 96 + Math.random() * 3.5;
      }

      this.bottles.push(b);
      this.log(`Garrafa #${b.id} inserida na esteira RC1.`, 'info');
      return b;
    }

    triggerFault(type) {
      if (!this.running) {
        this.log('Inicie a simulação antes de injetar falhas.', 'warn');
        return;
      }
      this.fault = type;
      const map = {
        estop: ['e_stop ACIONADO (Botão de Emergência)', 'critical', Equip.FAULT],
        sp1_low: ['Cavitação em BC1: SP1 <= 1,0 Barg (Trip SIS)', 'critical', Equip.FAULT],
        sp2_high: ['Sobrepressão em AS1: SP2 >= 4,5 Barg (VALV_Alivio aberta)', 'critical', Equip.FAULT],
        vs2_clog: ['Obstrução bico VS2: SQ2 <= 2,0 L/min (POP-SEC-02)', 'warning', Equip.FAULT],
        rc1_fail: ['Falha mecânica na Esteira RC1 (Motor parado)', 'critical', Equip.FAULT],
      };
      const [msg, sev] = map[type];

      if (type === 'sp1_low') this.sp1 = 0.8;
      if (type === 'sp2_high') this.sp2 = 4.8;
      if (type === 'vs2_clog') this.sq2 = 1.3;

      this.log(`ALARME: ${msg}`, 'alarm');
      this.addAlarm(msg, sev);
      this.evaluateBehaviorTree();
      this.updatePanels();
    }

    clearFault() {
      if (!this.fault) return;
      this.log(`Falha "${this.fault}" normalizada. Reset manual do SIS concluído.`, 'info');
      this.addAlarm('Falha normalizada — Operação nominal restabelecida', 'info');
      this.fault = null;
      this.sp1 = 2.4;
      this.sq1 = 24.0;
      this.sp2 = 3.8;
      this.sq2 = 5.2;

      if (this.running) {
        this.eq.rc1 = Equip.RUN;
        this.eq.bc1 = Equip.RUN;
        this.eq.vs2 = this.busy.fill ? Equip.BUSY : Equip.IDLE;
        this.eq.sl1 = this.busy.level ? Equip.BUSY : Equip.IDLE;
        this.eq.ac1 = this.busy.cap ? Equip.BUSY : Equip.IDLE;
        this.eq.sfc1 = this.busy.seal ? Equip.BUSY : Equip.IDLE;
        this.rc1Speed = this.paused ? 0.0 : 0.4;
      }
      this.evaluateBehaviorTree();
      this.updatePanels();
    }

    isSISFault() {
      return this.fault === 'estop' || this.fault === 'sp1_low' || this.fault === 'sp2_high';
    }

    isBeltStopped() {
      return this.isSISFault() || this.fault === 'vs2_clog' || this.fault === 'rc1_fail';
    }

    evaluateBehaviorTree() {
      if (!this.running) {
        this.activeBT = 'IDLE';
        return;
      }
      if (this.isSISFault()) {
        this.activeBT = 'P1';
        this.eq.bc1 = Equip.FAULT;
        this.eq.rc1 = Equip.FAULT;
        this.eq.vs2 = Equip.FAULT;
        this.rc1Speed = 0.0;
      } else if (this.fault === 'vs2_clog') {
        this.activeBT = 'P2';
        this.eq.vs2 = Equip.FAULT;
        this.eq.rc1 = Equip.IDLE;
        this.rc1Speed = 0.0;
      } else if (this.fault === 'rc1_fail') {
        this.activeBT = 'P1';
        this.eq.rc1 = Equip.FAULT;
        this.rc1Speed = 0.0;
      } else if (this.sp2 < 3.0) {
        this.activeBT = 'P3';
        this.rc1Speed = 0.1;
      } else if (this.bottles.some(b => b.state === State.TO_REINSPECT || b.state === State.TO_REJECT)) {
        this.activeBT = 'P4';
        this.rc1Speed = 0.3;
      } else {
        this.activeBT = 'P5';
        this.rc1Speed = this.paused ? 0.0 : 0.4;
      }
    }

    loop() {
      if (!this.running || this.paused) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000) * this.speed;
      this.lastFrame = now;

      if (this.autoInject && !this.isBeltStopped()) {
        if (Date.now() - this.lastAuto > 3200 / this.speed) {
          const near = this.bottles.some(b => b.x < X_ENTRY + 95);
          if (!near) {
            this.spawnBottle();
            this.lastAuto = Date.now();
          }
        }
      }

      this.evaluateBehaviorTree();
      this.step(dt);
      this.render();
      this.updatePanels();

      this.rafId = requestAnimationFrame(() => this.loop());
    }

    step(dt) {
      const stopped = this.isBeltStopped();
      if (!stopped) {
        this.beltOffset = (this.beltOffset + dt * 75) % 24;
        // Pequena oscilação realista nos sensores analógicos
        this.sp1 = 2.35 + Math.sin(Date.now() / 900) * 0.12;
        this.sp2 = 3.80 + Math.cos(Date.now() / 700) * 0.10;
        this.sq2 = this.busy.fill ? 5.2 + Math.sin(Date.now() / 300) * 0.25 : 0.0;
      }

      const vx = 85 * dt;

      for (const b of this.bottles) {
        switch (b.state) {
          case State.ENTERING:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_ENTRY + 35) b.state = State.TO_FILL;
            break;

          case State.TO_FILL:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_FILL) {
              b.x = X_FILL;
              if (!this.busy.fill) {
                b.state = State.FILLING;
                this.busy.fill = true;
                this.eq.vs2 = Equip.BUSY;
                b.pressMeasured = this.sp2;
                b.flowMeasured = 5.2;
              }
            }
            break;

          case State.FILLING:
            if (this.isSISFault() || this.fault === 'vs2_clog') break;
            b.fillLevel += dt * 75;
            if (b.fillLevel >= b.targetLevel) {
              b.fillLevel = b.targetLevel;
              this.busy.fill = false;
              this.eq.vs2 = Equip.IDLE;
              b.state = State.TO_LEVEL;
              this.log(`VS2 concluiu dosagem na Garrafa #${b.id} (SQ2=${b.flowMeasured.toFixed(1)} L/min).`, 'info');
            }
            break;

          case State.TO_LEVEL:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_LEVEL) {
              b.x = X_LEVEL;
              if (!this.busy.level) {
                b.state = State.LEVEL_CHECK;
                b.timer = 0;
                this.busy.level = true;
                this.eq.sl1 = Equip.BUSY;
              }
            }
            break;

          case State.LEVEL_CHECK:
            if (this.isSISFault()) break;
            b.timer += dt;
            if (b.timer >= 0.7) {
              b.l_min = b.fillLevel >= 95.0;
              this.busy.level = false;
              this.eq.sl1 = Equip.IDLE;
              b.state = State.TO_CAP;
              this.log(`SL1 Garrafa #${b.id}: Nível=${b.fillLevel.toFixed(1)}% (${b.l_min ? 'l_min=1 OK' : 'l_min=0 BAIXO'}).`, b.l_min ? 'info' : 'warn');
            }
            break;

          case State.TO_CAP:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_CAP) {
              b.x = X_CAP;
              if (!this.busy.cap) {
                b.state = State.CAPPING;
                b.timer = 0;
                this.busy.cap = true;
                this.eq.ac1 = Equip.BUSY;
              }
            }
            break;

          case State.CAPPING:
            if (this.isSISFault()) break;
            b.timer += dt;
            if (b.timer >= 0.65) {
              b.hasCap = !b.capDefect;
              this.busy.cap = false;
              this.eq.ac1 = Equip.IDLE;
              b.state = State.TO_SEAL;
            }
            break;

          case State.TO_SEAL:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_SEAL) {
              b.x = X_SEAL;
              if (!this.busy.seal) {
                b.state = State.SEAL_CHECK;
                b.timer = 0;
                this.busy.seal = true;
                this.eq.sfc1 = Equip.BUSY;
              }
            }
            break;

          case State.SEAL_CHECK:
            if (this.isSISFault()) break;
            b.timer += dt;
            if (b.timer >= 0.65) {
              b.x_fc = b.hasCap;
              b.q_ok = b.flowMeasured >= 2.0 && b.flowMeasured <= 8.0;
              b.p_ok = b.pressMeasured >= 3.0 && b.pressMeasured <= 4.5;
              this.busy.seal = false;
              this.eq.sfc1 = Equip.IDLE;

              // Árvore de Decisão Determinística (Aula 27)
              if (b.l_min && b.x_fc && b.q_ok && b.p_ok) {
                b.decision = 'PROD_APROV';
                b.reason = 'SL1 ≥ 95%, SFC1 = 1 e parâmetros hidráulicos nominais.';
              } else if (b.fillLevel < 85.0 || (b.fillLevel < 95.0 && !b.x_fc)) {
                b.decision = 'DESCARTE_REJ';
                b.reason = b.fillLevel < 85.0
                  ? `Subenchimento severo (${b.fillLevel.toFixed(1)}% < 85%).`
                  : 'Falha combinada de nível e vedação.';
              } else {
                b.decision = 'REINSPECAO';
                b.reason = !b.l_min
                  ? `Nível marginal (${b.fillLevel.toFixed(1)}% entre 85% e 95%) — decantação.`
                  : 'Tampa ausente/mal assentada (SFC1 = 0) com volume OK — recapping.';
              }

              b.state = State.TO_SORT;
              this.log(`SFC1 Garrafa #${b.id}: ${b.decision} (${b.reason})`, b.decision === 'PROD_APROV' ? 'info' : 'warn');
            }
            break;

          case State.TO_SORT:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_SORT) {
              this.processed++;
              if (b.decision === 'PROD_APROV') {
                this.approved++;
                b.state = State.TO_EXIT;
              } else if (b.decision === 'REINSPECAO') {
                this.reinspect++;
                b.state = State.TO_REINSPECT;
              } else {
                this.rejected++;
                b.state = State.TO_REJECT;
                this.addAlarm(`Garrafa #${b.id} -> DESCARTE_REJ`, 'warning');
              }
            }
            break;

          case State.TO_EXIT:
            if (stopped) break;
            b.x += vx;
            if (b.x >= X_EXIT) b.state = State.DONE;
            break;

          case State.TO_REINSPECT:
            if (stopped) break;
            b.y -= vx * 0.65;
            b.x += vx * 0.35;
            if (b.y <= 90) b.state = State.DONE;
            break;

          case State.TO_REJECT:
            if (stopped) break;
            b.y += vx * 0.75;
            b.x += vx * 0.25;
            if (b.y >= 365) b.state = State.DONE;
            break;
        }

        if (b.state !== State.DONE && b.state !== State.ENTERING) {
          this.highlighted = b;
        }
      }

      this.bottles = this.bottles.filter(b => b.state !== State.DONE);
    }

    // ========================================================
    //  RENDERIZAÇÃO NO CANVAS
    // ========================================================
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);

      // Fundo técnico
      ctx.fillStyle = '#060c18';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(0, 180, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Cabeçalho do Sinótico
      ctx.fillStyle = 'rgba(12, 22, 40, 0.92)';
      ctx.fillRect(0, 0, W, 32);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
      ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(W, 32); ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('SINÓTICO SCADA-CORE :: LINHA DE ENVASE E INSPEÇÃO (RC1 / TS1 / BC1 / AS1)', 14, 20);

      ctx.textAlign = 'right';
      if (!this.running) {
        ctx.fillStyle = '#8b9bb4';
        ctx.fillText('STANDBY', W - 14, 20);
      } else if (this.isBeltStopped()) {
        ctx.fillStyle = '#ff1744';
        ctx.fillText('● INTERTRAVAMENTO / PARADA', W - 14, 20);
      } else if (this.paused) {
        ctx.fillStyle = '#ffab00';
        ctx.fillText('⏸ PAUSADO', W - 14, 20);
      } else {
        ctx.fillStyle = '#00e676';
        ctx.fillText(`● ONLINE (${this.activeBT})`, W - 14, 20);
      }

      // Bloco Hidráulico Superior (TS1 -> VS1 -> BC1 -> AS1 -> VS2)
      this.drawHydraulics(ctx);

      // Esteira RC1
      const beltFault = this.isBeltStopped() && this.running;
      ctx.fillStyle = beltFault ? 'rgba(255, 23, 68, 0.18)' : '#10203a';
      ctx.fillRect(X_ENTRY - 10, BELT_Y, X_EXIT - X_ENTRY + 25, BELT_H);
      ctx.strokeStyle = beltFault ? '#ff1744' : '#00a8ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(X_ENTRY - 10, BELT_Y, X_EXIT - X_ENTRY + 25, BELT_H);

      ctx.fillStyle = '#00e5ff';
      for (let rx = X_ENTRY; rx < X_EXIT; rx += 24) {
        const px = rx + this.beltOffset;
        if (px < X_EXIT + 5) ctx.fillRect(px, BELT_Y + 4, 4, BELT_H - 8);
      }
      ctx.fillStyle = '#8b9bb4';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ESTEIRA RC1 (${this.rc1Speed.toFixed(1)} m/s)`, X_ENTRY, BELT_Y + 34);

      // Estações na esteira
      this.drawStation(ctx, X_FILL, 'VS2 / SQ2', 'Envase', this.eq.vs2, this.busy.fill);
      this.drawStation(ctx, X_LEVEL, 'VS3 / SL1', 'Nível ≥95%', this.eq.sl1, this.busy.level);
      this.drawStation(ctx, X_CAP, 'VS4 / AC1', 'Capping', this.eq.ac1, this.busy.cap);
      this.drawStation(ctx, X_SEAL, 'VS5 / SFC1', 'Vedação', this.eq.sfc1, this.busy.seal);

      // Desvios de saída (REINSPECAO acima, DESCARTE_REJ abaixo, PROD_APROV direita)
      this.drawOutputs(ctx);

      // Garrafas
      for (const b of this.bottles) {
        this.drawBottle(ctx, b);
      }
    }

    drawHydraulics(ctx) {
      // Caixa TS1 -> BC1 -> AS1 conectada à estação VS2
      const box = (x, y, w, h, title, sub, color) => {
        ctx.fillStyle = 'rgba(13, 25, 48, 0.85)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = color;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(title, x + w / 2, y + 16);
        ctx.fillStyle = '#f0f6fc';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(sub, x + w / 2, y + 30);
      };

      const bcColor = this.eq.bc1 === Equip.FAULT ? '#ff1744' : (this.eq.bc1 === Equip.RUN ? '#00e676' : '#546580');
      const asColor = this.fault === 'sp2_high' ? '#ff1744' : (this.running ? '#00f0ff' : '#546580');

      box(20, 48, 86, 40, 'TS1 + VS1', `SP1:${this.sp1.toFixed(1)}b`, '#00a8ff');
      box(124, 48, 86, 40, 'BC1 (Bomba)', `SQ1:${this.sq1.toFixed(0)}L/m`, bcColor);
      box(228, 48, 96, 40, 'AS1 (Pulmão)', `SP2:${this.sp2.toFixed(1)}b`, asColor);

      // Tubulações
      ctx.strokeStyle = this.running && !this.isSISFault() ? '#00f0ff' : '#546580';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(106, 68); ctx.lineTo(124, 68);
      ctx.moveTo(210, 68); ctx.lineTo(228, 68);
      ctx.moveTo(243, 88); ctx.lineTo(243, 125);
      ctx.stroke();

      if (this.fault === 'sp2_high') {
        ctx.fillStyle = '#ff1744';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('⚠ VALV_Alivio ABERTA -> TS1', 332, 72);
      }
    }

    drawStation(ctx, x, tag, desc, state, active) {
      const w = 88;
      const h = 66;
      const sx = x - w / 2 + BW / 2;
      const sy = 125;

      const color = state === Equip.FAULT ? '#ff1744' :
        state === Equip.BUSY ? '#ffab00' :
          state === Equip.RUN || state === Equip.IDLE ? '#00f0ff' : '#546580';

      ctx.fillStyle = active ? 'rgba(255, 171, 0, 0.14)' : 'rgba(13, 25, 48, 0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(sx, sy, w, h);
      ctx.strokeRect(sx, sy, w, h);

      ctx.fillStyle = color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tag, sx + w / 2, sy + 20);

      ctx.fillStyle = '#f0f6fc';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(desc, sx + w / 2, sy + 36);

      ctx.fillStyle = color;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(state, sx + w / 2, sy + 54);

      // Linha de atuação até a garrafa
      ctx.strokeStyle = active ? '#ffab00' : 'rgba(139, 155, 180, 0.3)';
      ctx.lineWidth = active ? 2.5 : 1;
      ctx.setLineDash(active ? [] : [3, 3]);
      ctx.beginPath();
      ctx.moveTo(x + BW / 2, sy + h);
      ctx.lineTo(x + BW / 2, BELT_Y - BH - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawOutputs(ctx) {
      // REINSPECAO (acima)
      ctx.fillStyle = 'rgba(255, 171, 0, 0.12)';
      ctx.strokeStyle = '#ffab00';
      ctx.lineWidth = 1.5;
      ctx.fillRect(X_SORT + 18, 48, 125, 38);
      ctx.strokeRect(X_SORT + 18, 48, 125, 38);
      ctx.fillStyle = '#ffab00';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REINSPEÇÃO', X_SORT + 80, 71);

      // DESCARTE_REJ (abaixo)
      ctx.fillStyle = 'rgba(255, 23, 68, 0.12)';
      ctx.strokeStyle = '#ff1744';
      ctx.fillRect(X_SORT + 18, 365, 125, 38);
      ctx.strokeRect(X_SORT + 18, 365, 125, 38);
      ctx.fillStyle = '#ff1744';
      ctx.fillText('DESCARTE_REJ', X_SORT + 80, 388);

      // PROD_APROV (direita)
      ctx.fillStyle = 'rgba(0, 230, 118, 0.12)';
      ctx.strokeStyle = '#00e676';
      ctx.fillRect(X_EXIT - 35, BELT_Y - 58, 92, 52);
      ctx.strokeRect(X_EXIT - 35, BELT_Y - 58, 92, 52);
      ctx.fillStyle = '#00e676';
      ctx.fillText('PROD_APROV', X_EXIT + 11, BELT_Y - 28);
    }

    drawBottle(ctx, b) {
      const x = b.x;
      const y = b.y;
      const stroke = b.decision === 'PROD_APROV' ? '#00e676' :
        b.decision === 'DESCARTE_REJ' ? '#ff1744' :
          b.decision === 'REINSPECAO' ? '#ffab00' : '#8b9bb4';

      ctx.fillStyle = 'rgba(16, 32, 58, 0.7)';
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.fillRect(x, y + 12, BW, BH - 12);
      ctx.strokeRect(x, y + 12, BW, BH - 12);
      // Gargalo
      ctx.strokeRect(x + 7, y, BW - 14, 12);

      // Líquido
      if (b.fillLevel > 0) {
        const lh = ((BH - 15) * Math.min(100, b.fillLevel)) / 100;
        ctx.fillStyle = b.fillLevel < 85 ? 'rgba(255, 23, 68, 0.7)' :
          b.fillLevel < 95 ? 'rgba(255, 171, 0, 0.7)' : 'rgba(0, 240, 255, 0.7)';
        ctx.fillRect(x + 2, y + BH - lh - 1, BW - 4, lh);
      }

      // Tampa
      if (b.hasCap) {
        ctx.fillStyle = '#00e676';
        ctx.fillRect(x + 6, y - 4, BW - 12, 5);
      }

      ctx.fillStyle = '#f0f6fc';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${b.id}`, x + BW / 2, y + BH + 12);
    }

    // ========================================================
    //  ATUALIZAÇÃO DOS PAINÉIS HTML
    // ========================================================
    updatePanels() {
      this.setText('env-total', this.totalCreated);
      this.setText('env-processed', this.processed);
      this.setText('env-approved', this.approved);
      this.setText('env-reinspect', this.reinspect);
      this.setText('env-rejected', this.rejected);

      const rate = this.processed > 0 ? ((this.approved / this.processed) * 100).toFixed(1) + '%' : '—';
      this.setText('env-approval-rate', rate);

      if (this.running && this.startTime > 0) {
        const mins = (Date.now() - this.startTime) / 60000;
        this.setText('env-prod-rate', mins > 0.01 ? (this.processed / mins).toFixed(1) + ' un/min' : '0.0 un/min');
      } else {
        this.setText('env-prod-rate', '—');
      }

      this.setText('env-sp1-val', this.sp1.toFixed(2) + ' Barg');
      this.setText('env-sp2-val', this.sp2.toFixed(2) + ' Barg');
      this.setText('env-sq2-val', this.sq2.toFixed(1) + ' L/min');
      this.setText('env-rc1-val', this.rc1Speed.toFixed(1) + ' m/s');

      this.setEquip('env-eq-rc1', this.eq.rc1);
      this.setEquip('env-eq-bc1', this.eq.bc1);
      this.setEquip('env-eq-vs2', this.eq.vs2);
      this.setEquip('env-eq-sl1', this.eq.sl1);
      this.setEquip('env-eq-ac1', this.eq.ac1);
      this.setEquip('env-eq-sfc1', this.eq.sfc1);

      this.updateBTPanel();
      this.updateLogicPanel();
    }

    updateBTPanel() {
      ['P1', 'P2', 'P3', 'P4', 'P5'].forEach(p => {
        const el = document.getElementById('bt-node-' + p);
        if (!el) return;
        const active = this.activeBT === p;
        el.style.borderColor = active ? (p === 'P1' ? '#ff1744' : p === 'P2' ? '#ffab00' : '#00e676') : 'rgba(255,255,255,0.1)';
        el.style.background = active ? 'rgba(0, 240, 255, 0.1)' : 'transparent';
        el.style.fontWeight = active ? '700' : '400';
      });
    }

    updateLogicPanel() {
      const el = document.getElementById('env-logic-panel-content');
      if (!el) return;
      const b = this.highlighted;
      if (!b) {
        el.innerHTML = '<p style="color: var(--text-muted); font-size: 0.88rem;">Inicie a linha para acompanhar a avaliação booleana e o caminho na Árvore de Decisão ($\mathcal{T}$) em tempo real.</p>';
        return;
      }
      const f = (v) => v ? '<span style="color:#00e676;font-weight:700;">1 (TRUE)</span>' : '<span style="color:#ff1744;font-weight:700;">0 (FALSE)</span>';
      const sisOk = !this.isSISFault();
      const aprov = b.l_min && b.x_fc && b.q_ok && b.p_ok && sisOk;

      el.innerHTML = `
        <div style="margin-bottom:0.5rem;">
          <strong style="color:#00f0ff;">Garrafa #${b.id}</strong>
          <span style="color:var(--text-muted); font-size:0.82rem;"> · Estado: ${b.state}</span>
        </div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:0.82rem; line-height:1.75;">
          <div><strong>l_min</strong> (SL1 ≥ 95%): ${f(b.l_min)} <span style="color:var(--text-muted);">(${b.fillLevel.toFixed(1)}%)</span></div>
          <div><strong>x_fc</strong> (SFC1 tampa vedada): ${f(b.x_fc)}</div>
          <div><strong>q_ok</strong> (SQ2 ∈ [2,0; 8,0] L/m): ${f(b.q_ok)}</div>
          <div><strong>p_ok</strong> (SP2 ∈ [3,0; 4,5] Barg): ${f(b.p_ok)}</div>
          <div><strong>¬F_SIS</strong> (Sem Trip SIS): ${f(sisOk)}</div>
          <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border-subtle);">
            <strong style="color:#ffab00;">PROD_APROV = l_min ∧ x_fc ∧ q_ok ∧ p_ok ∧ ¬F_SIS</strong><br>
            Resultado: ${f(aprov)}
          </div>
          ${b.decision ? `<div style="margin-top:0.5rem; padding:0.45rem; border-radius:6px; border:1px solid ${b.decision === 'PROD_APROV' ? '#00e676' : b.decision === 'REINSPECAO' ? '#ffab00' : '#ff1744'};">
            <strong>Folha da Árvore: ${b.decision}</strong><br>
            <span style="font-size:0.78rem; color:var(--text-muted);">${b.reason}</span>
          </div>` : ''}
        </div>
      `;
    }

    updateButtons() {
      const s = document.getElementById('env-btn-start');
      const p = document.getElementById('env-btn-pause');
      const i = document.getElementById('env-btn-inject');
      if (s) {
        s.disabled = this.running && !this.paused;
        s.textContent = this.paused ? '▶️ Retomar' : '▶️ Iniciar Linha';
      }
      if (p) {
        p.disabled = !this.running;
        p.textContent = this.paused ? '▶️ Retomar' : '⏸️ Pausar';
      }
      if (i) i.disabled = !this.running || this.paused;
    }

    setEquip(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val;
      el.style.color = val === Equip.FAULT ? '#ff1744' :
        val === Equip.BUSY ? '#ffab00' :
          val === Equip.RUN || val === Equip.IDLE ? '#00e676' : '#8b9bb4';
    }

    addAlarm(msg, sev) {
      const t = new Date().toTimeString().split(' ')[0];
      this.alarms.unshift({ t, msg, sev });
      if (this.alarms.length > 12) this.alarms.pop();
      const el = document.getElementById('env-alarm-list');
      if (!el) return;
      el.innerHTML = this.alarms.map(a => {
        const c = a.sev === 'critical' ? '#ff1744' : a.sev === 'warning' ? '#ffab00' : '#00f0ff';
        return `<div style="color:${c}; font-family:'JetBrains Mono',monospace; font-size:0.78rem; margin-bottom:0.2rem;">[${a.t}] ${a.msg}</div>`;
      }).join('');
    }

    log(msg, type) {
      const t = new Date().toTimeString().split(' ')[0];
      this.logs.unshift({ t, msg, type });
      if (this.logs.length > 35) this.logs.pop();
      const el = document.getElementById('env-console-log');
      if (!el) return;
      const colors = { info: '#00f0ff', warn: '#ffab00', alarm: '#ff1744' };
      el.innerHTML = this.logs.map(l =>
        `<div style="color:${colors[l.type] || '#00e676'}; font-family:'JetBrains Mono',monospace; font-size:0.78rem; margin-bottom:0.2rem;">[${l.t}] ${l.msg}</div>`
      ).join('');
    }

    setText(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.etapa03Simulator = new BottlingLineSimulator();
  });
})();
