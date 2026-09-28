# Aula 12: Matrizes de Incidência, Adjacência e Balanço de Massa Matricial na Linha de Envase

## 1. Fundamentos Matemáticos: A Matriz de Incidência Vértice-Aresta ($B$)

Seja um dígrafo $G = (V, E)$ representando a malha hidráulica da linha de envase com $|V| = n = 8$ vértices (componentes discretos) e $|E| = m = 9$ arestas dirigidas (tubulações). A **Matriz de Incidência Vértice-Aresta** $B \in \{-1, 0, 1\}^{n \times m}$ é formalmente definida por:

$$B[i, j] = \begin{cases} -1, & \text{se a tubulação } e_j \text{ sai do componente } v_i \text{ (origem do fluxo)} \\ +1, & \text{se a tubulação } e_j \text{ entra no componente } v_i \text{ (destino do fluxo)} \\ 0, & \text{se o componente } v_i \text{ não incide na tubulação } e_j \end{cases}$$

### Propriedades Formais:
1. **Soma por Coluna Nula:** Para toda tubulação $j \in \{1, \dots, m\}$, a conservação topológica impõe:
   $$\sum_{i=1}^n B[i, j] = 0$$
2. **Balanço de Vazão Volumétrica / Conservação de Massa em Regime Permanente:**
   $$B \cdot \vec{Q} = \vec{S}$$
   Onde $\vec{Q} \in \mathbb{R}^m$ é o vetor de vazões em cada tubulação ($\text{L/min}$) e $\vec{S} \in \mathbb{R}^n$ é o vetor de injeção/extração líquida nos nós.

---

## 2. Aprofundamento Teórico

### 2.1. Interpretação Física da Propriedade da Soma Nula

A propriedade $\sum_{i=1}^n B[i, j] = 0$ decorre diretamente da continuidade do fluxo: cada tubulação $e_j = (u, v)$ conecta exatamente dois equipamentos, gerando um valor $-1$ na linha de origem $u$ (saída) e um valor $+1$ na linha de destino $v$ (entrada). Essa é a formulação discreta da **Primeira Lei de Kirchhoff (Conservação de Massa/Vazão)** aplicada a malhas hidráulicas de dosagem industrial.

### 2.2. Matriz de Incidência vs. Matriz de Adjacência

| Aspecto | Matriz de Incidência $B$ | Matriz de Adjacência $A$ |
| --- | --- | --- |
| **Dimensão** | $n \times m$ ($8 \times 9$, vértices × arestas) | $n \times n$ ($8 \times 8$, vértices × vértices) |
| **Entradas** | $\{-1, 0, +1\}$ (topologia estrutural de fluxo) | Pesos reais ($\mathbb{R}^+$) ou $\{0, 1\}$ |
| **Uso Principal** | Balanço de massa/vazão, espaço de ciclos e conservação | Busca de caminhos mínimos, conectividade e roteamento |
| **Relação Algébrica** | $B B^T = L$ (**Matriz Laplaciana** do grafo) | $A$ mapeia conexões diretas nó a nó |

A matriz Laplaciana $L = B B^T$ desempenha um papel central na análise de conectividade e estabilidade da rede. Seus autovalores determinam a robustez hidráulica do sistema de envase frente a bloqueios mecânicos.

### 2.3. Posto (Rank) da Matriz de Incidência e o Espaço de Ciclos

Para um grafo conexo com $n$ vértices e $m$ arestas, o posto (*rank*) da matriz de incidência $B$ sobre $\mathbb{R}$ é:
$$\text{rank}(B) = n - 1 = 8 - 1 = 7$$

A dimensão do **núcleo (espaço nulo)** de $B$, denominado **Espaço de Ciclos**, é dada pela fórmula fundamental:
$$\dim(\text{Null}(B)) = m - (n - 1) = m - n + 1$$

Para a rede da linha de envase ($n = 8, m = 9$):
$$\dim(\text{Null}(B)) = 9 - 8 + 1 = 2$$

Essa dimensão igual a $2$ prova matematicamente a existência de **2 ciclos independentes** na infraestrutura hidráulica:
1. **Ciclo de Recirculação e Alívio de Segurança:** `TS1 -> VS1 -> BC1 -> AS1 -> VALV_Alivio -> TS1`.
2. **Ciclo de Redundância e Bypass de Dosagem:** `AS1 -> VS2 -> SQ2 <- AS1` (formado pelas rotas paralelas via `VS2` e via `XV_BYPASS`).

### 2.4. Balanço de Massa como Sistema Linear

A equação matricial $B \cdot \vec{Q} = \vec{S}$ governa o regime permanente de dosagem:
* $\vec{Q} = [Q_1, Q_2, \dots, Q_9]^T \in \mathbb{R}^9$: vetor com as vazões instantâneas em cada duto.
* $\vec{S} = [S_1, S_2, \dots, S_8]^T \in \mathbb{R}^8$: vetor de balanço líquido nos nós.
  * Para o Tanque de Suprimento `TS1` (fonte pura): $S_{\text{TS1}} = -Q_{\text{envase}} < 0$.
  * Para a Estação de Envase `EST_Envase` (sumidouro final): $S_{\text{EST}} = +Q_{\text{envase}} > 0$.
  * Para todos os nós intermediários (`VS1`, `BC1`, `AS1`, `VS2`, `SQ2`, `VALV_Alivio`): $S_i = 0.0$ $\text{L/min}$ (conservação perfeita, sem acúmulo contínuo).

### 2.5. Matriz de Custos (Adjacência Ponderada) Revisitada

A matriz de custos $W \in (\mathbb{R}^+ \cup \{\infty\})^{n \times n}$ substitui conexões inexistentes por $\infty$ e o custo de um nó para ele mesmo por $0.0$. Essa matriz é a entrada primordial para os algoritmos de menor caminho (Dijkstra, Aula 14) e todos os pares de caminhos mínimos (Floyd-Warshall, com complexidade $O(n^3)$).

---

## 3. Exemplo Resolvido

**Problema:** Considere um vetor de vazões $\vec{Q} = [15.0, 15.0, 15.0, 12.0, 3.0, 3.0, 12.0, 12.0, 0.0]^T\text{ L/min}$. Verifique o balanço líquido no nó `AS1` (Acumulador) e no nó `VALV_Alivio`.

**Resolução:**
* No nó `AS1` (linha correspondente da matriz $B$):
  $S_{\text{AS1}} = B[\text{AS1}, \cdot] \cdot \vec{Q} = (+1) \cdot Q_3 + (-1) \cdot Q_4 + (-1) \cdot Q_5 + (-1) \cdot Q_9$
  $S_{\text{AS1}} = (+1 \times 15.0) - (1 \times 12.0) - (1 \times 3.0) - (1 \times 0.0) = 15.0 - 15.0 = 0.0\text{ L/min}$. (Balanço nulo em regime permanente ✓)
* No nó `VALV_Alivio`:
  $S_{\text{AL}} = (+1) \cdot Q_5 + (-1) \cdot Q_6 = (+1 \times 3.0) - (1 \times 3.0) = 0.0\text{ L/min}$. (Balanço nulo ✓)

---

## 4. Atividades de Investigação

1. **Balanço em Obstrução de Válvula:** Calcule $B \cdot \vec{Q}$ quando a válvula `VS2` é fechada repentinamente ($Q_4 = 0.0\text{ L/min}$), mas a bomba `BC1` continua injetando $15.0\text{ L/min}$ sem desvio pelo alívio ($Q_5 = 0.0$). Qual o valor de $S_{\text{AS1}}$ e o que ele acarreta fisicamente na pressão do acumulador?
2. **Propriedade da Matriz Laplaciana:** Mostre que para o grafo não-dirigido subjacente da linha de envase, os elementos da diagonal principal de $L = B B^T$ correspondem exatamente aos graus totais ($\deg^+ + \deg^-$) de cada nó.
3. **Cálculo de Ciclos Fundamentais:** Suponha a instalação de uma segunda linha de reciclo conectando a Estação de Envase `EST_Envase` de volta ao Tanque `TS1` ($m = 10$). Qual será a nova dimensão do espaço de ciclos?
4. **Análise Comparativa Dijkstra vs. Floyd-Warshall:** Explique em quais cenários operacionais da linha de envase é mais eficiente aplicar o algoritmo de Dijkstra individualmente versus computar previamente a matriz de caminhos mínimos de Floyd-Warshall.

---

## 5. Entregável da Aula 12

* **Motor Matricial de Balanço Hidráulico:** Código Python no Jupyter Notebook demonstrando a construção da Matriz de Incidência $B \in \mathbb{R}^{8 \times 9}$, a validação automatizada da soma nula de colunas e a solução do sistema de conservação $B \cdot \vec{Q} = \vec{S}$.
