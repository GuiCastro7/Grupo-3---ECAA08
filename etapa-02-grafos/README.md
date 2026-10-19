# Etapa 02: Teoria dos Grafos & Roteamento Logístico — SCADA-Core

**Grupo 3 da disciplina ECAA08 (Automática / Matemática Discreta)**  
**Universidade Federal de Itajubá (UNIFEI)**  

Integrantes:
* Guilherme Narciso Castro Silva
* Rafael Ribeiro Guedes
* Matheus Felipe de Oliveira Agostinho
* Nickolas Nicoleto Musico

---

## 1. Visão Geral da Etapa 02

A Etapa 02 tem como objetivo central transformar a infraestrutura de tubulações, bombas, acumuladores, válvulas e esteiras da **Linha de Envasamento e Inspeção de Bebidas** em uma estrutura de dados formal e computável: um **Grafo Dirigido e Ponderado (Dígrafo)**:

$$G = (V, E, W)$$

Com essa modelagem integrada à lógica em tempo real do sistema supervisório SCADA:
1. As decisões de roteamento deixam de ser sequências rígidas e passam a ser resolvidas deterministicamente por algoritmos de redes.
2. Anomalias mecânicas (bloqueios de válvulas solenoides ou desarme térmico de bombas) são tratadas por **desvio dinâmico de rota (failover)** em conformidade com as normas IEC 61508 / IEC 61511 (SIL-2).
3. A integridade física das tubulações é inspecionada de forma ótima através de **Circuitos Eulerianos (Algoritmo de Hierholzer)**, sem repetição de dutos.
4. O deslocamento do veículo autônomo (AGV) para coleta de amostras de qualidade é otimizado via **Problema do Caixeiro-Viajante (TSP com 2-Opt)**.
5. A sequência das etapas produtivas e rastreabilidade de bateladas é auditada via **Grafo Acíclico Dirigido (DAG)** e ordenação topológica de Kahn.

---

## 2. Modelagem da Planta Industrial

### 2.1. Conjunto de Vértices ($V$)
Os vértices representam equipamentos discretos, estações de trabalho e pontos de junção instrumentados com tags ISA-5.1:
* `TS1`: Reservatório Principal de Bebidas / Suprimento (Fonte primária).
* `TS2`: Reservatório Auxiliar de Suprimento (Contingência).
* `VS1`: Válvula Solenoide de Sucção da bomba.
* `BC1`: Bomba Centrífuga Principal de pressurização do fluido.
* `BC2`: Bomba Centrífuga Reserva de alta disponibilidade.
* `AS1`: Acumulador de Suprimento (Pulmão hidráulico de amortecimento).
* `VALV_Alivio`: Válvula de alívio de sobrepressão e retorno de reciclo.
* `VS2`: Válvula Solenoide de Dosagem / Enchimento rápido.
* `XV_BYPASS`: Válvula de desvio de emergência contornando VS2.
* `SQ2`: Sensor e câmara de medição de vazão volumétrica.
* `EST_Envase`: Bico injetor e posicionamento sobre a esteira RC1 (Sumidouro do fluido).
* `VS3_SL1`: Estação de inspeção óptica do nível de preenchimento ($\ge 95\%$).
* `VS4_AC1`: Estação de aplicação mecânica da tampa (Atuador de Capping).
* `VS5_SFC1`: Estação de inspeção tátil de vedação (Sensor de fim de curso).
* `PROD_APROV`: Saída para esteira de embalagem e paletização de produto aprovado.
* `DESCARTE_REJ`: Braço mecânico desviador de garrafas reprovadas.
* `Lab_CQ`: Laboratório de Controle de Qualidade e base de recarga do AGV / CIP.

### 2.2. Conjunto de Arestas Dirigidas ($E$) e Sentido Operacional
Cada aresta orientada $(u, v) \in E$ representa uma tubulação de aço inox com sentido de escoamento unidirecional imposto pelo gradiente de pressão da bomba centrífuga e válvulas de retenção, ou um trecho de transporte da esteira transportadora `RC1`.

### 2.3. Função de Ponderação ($W$)
Cada conexão recebe um custo numérico estritamente não-negativo $W: E \rightarrow \mathbb{R}^+$ correspondente à extensão linear da tubulação em metros lineares ($L\text{ [m]}$) ou ao tempo proporcional de trânsito hidráulico ($t\text{ [s]}$).
* Rota Nominal Ótima: `TS1 ➔ VS1 ➔ BC1 ➔ AS1 ➔ VS2 ➔ SQ2 ➔ EST_Envase` = **29.5 metros** (~5.8s de trânsito).
* Rota Alternativa via Bypass (Falha em VS2): `TS1 ➔ VS1 ➔ BC1 ➔ AS1 ➔ XV_BYPASS ➔ SQ2 ➔ EST_Envase` = **31.5 metros** (+6.8%).
* Rota Alternativa via Bomba Reserva (Falha em BC1): `TS1 ➔ VS1 ➔ BC2 ➔ AS1 ➔ VS2 ➔ SQ2 ➔ EST_Envase` = **32.5 metros** (+10.2%).

---

## 3. Sumário das Aulas e Cadernos Jupyter

| Aula | Título do Memorial & Caderno | Arquivos |
| :--- | :--- | :--- |
| **Aula 11** | Modelagem da Tubulação e Instrumentos como Grafo Dirigido Ponderado | [`11 - Modelagem da Tubulacao e Instrumentos como Grafo.ipynb`](11%20-%20Modelagem%20da%20Tubulacao%20e%20Instrumentos%20como%20Grafo.ipynb) <br> [`11 - Modelagem da Tubulacao e Instrumentos como Grafo.md`](11%20-%20Modelagem%20da%20Tubulacao%20e%20Instrumentos%20como%20Grafo.md) |
| **Aula 12** | Matrizes de Incidência, Adjacência e Balanço de Massa Matricial de Kirchhoff | [`12 - Matrizes de Incidencia Adjacencia e Custos.ipynb`](12%20-%20Matrizes%20de%20Incidencia%20Adjacencia%20e%20Custos.ipynb) <br> [`12 - Matrizes de Incidencia Adjacencia e Custos.md`](12%20-%20Matrizes%20de%20Incidencia%20Adjacencia%20e%20Custos.md) |
| **Aula 13** | Algoritmos de Busca em Largura (BFS) e Profundidade (DFS) em Tubulações | [`13 - Algoritmos de Busca BFS e DFS em Tubulacoes.ipynb`](13%20-%20Algoritmos%20de%20Busca%20BFS%20e%20DFS%20em%20Tubulacoes.ipynb) <br> [`13 - Algoritmos de Busca BFS e DFS em Tubulacoes.md`](13%20-%20Algoritmos%20de%20Busca%20BFS%20e%20DFS%20em%20Tubulacoes.md) |
| **Aula 14** | Menor Caminho — Algoritmo de Dijkstra e Roteamento Dinâmico | [`14 - Menor Caminho Dijkstra e Roteamento Dinamico.ipynb`](14%20-%20Menor%20Caminho%20Dijkstra%20e%20Roteamento%20Dinamico.ipynb) <br> [`14 - Menor Caminho Dijkstra e Roteamento Dinamico.md`](14%20-%20Menor%20Caminho%20Dijkstra%20e%20Roteamento%20Dinamico.md) |
| **Aula 15** | Simulação de Vazamentos, Vértices de Articulação e Desvio Automático SIS | [`15 - Simulação de Vazamentos e Desvio Automático.ipynb`](15%20-%20Simulao%20de%20Vazamentos%20e%20Desvio%20Automtico.ipynb) <br> [`15 - Simulação de Vazamentos e Desvio Automático.md`](15%20-%20Simulao%20de%20Vazamentos%20e%20Desvio%20Automtico.md) |
| **Aula 16** | Problemas Eulerianos e Inspeção Autônoma da Infraestrutura Física (Hierholzer) | [`16 - Problemas Eulerianos e Inspeção de Infraestrutura.ipynb`](16%20-%20Problemas%20Eulerianos%20e%20Inspeo%20de%20Infraestrutura.ipynb) <br> [`16 - Problemas Eulerianos e Inspeção de Infraestrutura.md`](16%20-%20Problemas%20Eulerianos%20e%20Inspeo%20de%20Infraestrutura.md) |
| **Aula 17** | Problemas Hamiltonianos e Roteamento Logístico de AGV (TSP Nearest Neighbor + 2-Opt) | [`17 - Problemas Hamiltonianos e Roteamento de AGV.ipynb`](17%20-%20Problemas%20Hamiltonianos%20e%20Roteamento%20de%20AGV.ipynb) <br> [`17 - Problemas Hamiltonianos e Roteamento de AGV.md`](17%20-%20Problemas%20Hamiltonianos%20e%20Roteamento%20de%20AGV.md) |
| **Aula 18** | Redes Multicamada e Fluxo Produtivo em Grafo Acíclico Dirigido (Kahn DAG) | [`18 - Grafos de Logistica de Insumos e Produtos Acabados.ipynb`](18%20-%20Grafos%20de%20Logistica%20de%20Insumos%20e%20Produtos%20Acabados.ipynb) <br> [`18 - Grafos de Logistica de Insumos e Produtos Acabados.md`](18%20-%20Grafos%20de%20Logistica%20de%20Insumos%20e%20Produtos%20Acabados.md) |

---

## 4. Aplicação Web Interativa

A aplicação web interativa desenvolvida para a Etapa 02 está disponível em:
👉 **[`doc/etapa-02-grafos.html`](../doc/etapa-02-grafos.html)**

### Funcionalidades Disponíveis:
1. **Sinótico SVG em Tempo Real:** Representação visual vetorial e responsiva da linha de envase com marcadores direcionais de fluxo, tags ISA-5.1 e estados de equipamentos (`NORMAL`, `FALHA`, `BLOQUEADO`).
2. **Visualizador Passo a Passo de Dijkstra:** Exibe o "Passo Atual", o nó extraído da fila de prioridade, a tabela de distâncias provisórias $d[v]$ e a explicação detalhada da relaxação de arestas.
3. **Matrizes Dinâmicas de Incidência e Adjacência:** Gera em tempo de execução a matriz $A$ ponderada e a matriz $B \in \{-1, 0, 1\}^{n \times m}$, exibindo a conservação de vazão com $\sum_i B[i, j] = 0$.
4. **Desvio Dinâmico de Falhas (Failover):** Injeção de bloqueios por clique com recomputação automática do Dijkstra e comparação visual de rotas.
5. **Modo Jogo "Desafio do Operador":** 5 missões de controle industrial com pontuação técnica baseada em eficiência e segurança.
6. **Modo Aula:** Botão didático para exibição de formalismos matemáticos, lemas e complexidades assintóticas para defesa perante o docente.
