# Representação Simbólica das Regras de Processo e Intertravamentos

Com base no diagrama P&ID e no mapeamento de variáveis, as intertravas de segurança (*Safety Interlocks*) e permissivos operacionais da linha de envase são traduzidos em equações de lógica proposicional.

---

## A. Intertrava de Trip e Proteção de Pressão/Vazão na Linha de Alimentação

A bomba centrípeta ($y_{bomba}$) e a válvula de alimentação primária ($y_{válv1}$) devem ser imediatamente BLOQUEADAS/DESLIGADAS se a pressão de sucção no tanque TS1 for excessivamente baixa ($p_{mín1}$, risco de cavitação), se houver sobrepressão na saída ($p_{máx1}$) ou se a vazão de alimentação exceder o limite seguro ($q_{máx1}$).

* **Condição de Falha / Evento Crítico de Sucção ($F_1$):**

$$F_1 \equiv p_{mín1} \lor p_{máx1} \lor q_{máx1}$$

* **Equação Lógica de Intertravamento:**

$$F_1 \rightarrow (\neg y_{bomba} \land \neg y_{válv1})$$

---

## B. Permissivo de Operação da Bomba Centrípeta (BC1)

A bomba centrípeta ($y_{bomba}$) SÓ PODE operar se a válvula de sucção estiver aberta ($y_{válv1}$), a pressão no tanque TS1 for normal ($\neg p_{mín1} \land \neg p_{máx1}$) e o acumulador intermediário AS1 não estiver em sobrepressão ($\neg p_{máx2}$).

* **Condição de Permissivo da Bomba ($P_{bomba}$):**

$$P_{bomba} \equiv y_{válv1} \land \neg p_{mín1} \land \neg p_{máx1} \land \neg p_{máx2}$$

* **Regra Operacional:**

$$y_{bomba} \rightarrow P_{bomba}$$

---

## C. Permissivo de Dosagem / Enchimento (VS2)

A válvula de injeção de líquido ($y_{válv2}$) só pode abrir para encher a garrafa se a pressão e vazão a jusante da bomba estiverem dentro dos limites nominais ($\neg p_{mín2} \land \neg p_{máx2} \land \neg q_{mín2} \land \neg q_{máx2}$) e a esteira estiver operando na velocidade controlada ($\neg v_{máx} \land \neg v_{mín}$).

* **Condição de Permissivo de Dosagem ($P_{dose}$):**

$$P_{dose} \equiv \neg p_{mín2} \land \neg p_{máx2} \land \neg q_{mín2} \land \neg q_{máx2} \land \neg v_{máx} \land \neg v_{mín}$$

* **Regra Operacional:**

$$y_{válv2} \rightarrow P_{dose}$$

---

## D. Sequenciamento e Permissivo das Estações Pneumáticas (VS3, VS4 e VS5)

1. **Descida do Sensor de Nível ($y_{válv3}$):** Só é permitida com a esteira operando na faixa estável ($\neg v_{máx} \land \neg v_{mín}$).
   $$y_{válv3} \rightarrow (\neg v_{máx} \land \neg v_{mín})$$

2. **Atuação do Capping ($y_{válv4}$ e $y_{capp}$):** A válvula do pistão de capping ($y_{válv4}$) e o atuador de rosca ($y_{capp}$) só atuam se a garrafa atingiu o nível adequado ($l_{mín}$) e a velocidade da esteira for nominal:
   $$(y_{válv4} \land y_{capp}) \rightarrow (l_{mín} \land \neg v_{máx} \land \neg v_{mín})$$

3. **Descida da Inspeção Fim de Curso ($y_{válv5}$):** O atuador do sensor de inspeção ($y_{válv5}$) desce para verificação ($x_{fc}$) apenas se a garrafa passou pela etapa de envase ($l_{mín}$):
   $$y_{válv5} \rightarrow (l_{mín} \land \neg v_{máx})$$

---

# Validação Formal por Prova Lógica (Tautologia de Segurança)

Para demonstrar ao motor do SCADA/CLP que a planta nunca operará em risco de cavitação ou queima da bomba ($BC1$) ligada com a linha bloqueada ou em subpressão de sucção ($p_{mín1}$), constrói-se a prova formal do teorema de segurança.

* **Afirmação de Segurança:** "Não é possível ter subpressão crítica de sucção ($p_{mín1}$) E manter a bomba centrípeta ligada ($y_{bomba}$)."
* **Proposição do Estado de Risco ($S_{risco}$):**

$$S_{risco} \equiv p_{mín1} \land y_{bomba}$$

Dada a regra de intertravamento implementada no CLP:

$$p_{mín1} \rightarrow \neg y_{bomba}$$

Aplica-se a equivalência lógica do condicional ($\mathbf{A} \rightarrow \mathbf{B} \equiv \neg \mathbf{A} \lor \mathbf{B}$):

$$p_{mín1} \rightarrow \neg y_{bomba} \equiv \neg p_{mín1} \lor \neg y_{bomba}$$

Substituindo o estado de risco sob a premissa de que a regra de intertravamento é estritamente satisfeita no CLP:

$$S_{risco} \land (\neg p_{mín1} \lor \neg y_{bomba})$$

$$(p_{mín1} \land y_{bomba}) \land (\neg p_{mín1} \lor \neg y_{bomba})$$

Distribuindo $(p_{mín1} \land y_{bomba})$:

$$\big((p_{mín1} \land y_{bomba}) \land \neg p_{mín1}\big) \lor \big((p_{mín1} \land y_{bomba}) \land \neg y_{bomba}\big)$$

$$\big((p_{mín1} \land \neg p_{mín1}) \land y_{bomba}\big) \lor \big(p_{mín1} \land (y_{bomba} \land \neg y_{bomba})\big)$$

$$(\text{Falso} \land y_{bomba}) \lor (p_{mín1} \land \text{Falso})$$

$$\text{Falso} \lor \text{Falso} \equiv \textbf{FALSO}$$

> **Conclusão:** A conjunção do estado de risco com a regra de intertravamento avalia como **FALSO (Contradição $\bot$)**. Logo, sua garantia operacional $\neg [S_{risco} \land (p_{mín1} \rightarrow \neg y_{bomba})]$ é uma **Tautologia ($\top$)**, validando formalmente a segurança do sistema contra danos mecânicos à bomba centrípeta.