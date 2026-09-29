# Aula 17: Problemas Hamiltonianos e Roteamento Logístico de AGVs na Linha de Envase

## 1. Fundamentos Matemáticos: Ciclos Hamiltonianos e o Caixeiro-Viajante (TSP)

O **Problema do Caixeiro-Viajante (TSP — *Travelling Salesperson Problem*)** consiste em determinar o ciclo hamiltoniano de custo mínimo sobre um grafo ponderado completo $G = (V, E, W)$, visitando cada estação de amostragem e inspeção exatamente uma vez e retornando à base de recarga no Laboratório de Controlo de Qualidade (`Lab_CQ`).

Dado um conjunto finito de $n$ vértices e uma matriz simétrica de distâncias $D \in \mathbb{R}^{n \times n}$, a função objetivo visa encontrar a permutação $\pi \in \Pi_n$ que minimiza o comprimento total do ciclo fechado:

$$\min_{\pi \in \Pi_n} \left( \sum_{i=1}^{n-1} D[\pi(i), \pi(i+1)] + D[\pi(n), \pi(1)] \right)$$

Onde $\Pi_n$ é o espaço de todas as $(n-1)!$ permutações possíveis dos postos de paragem fixando-se a base de partida.

---

## 2. Aprofundamento Teórico

### 2.1. Ciclo Hamiltoniano vs. Circuito Euleriano — Contraste Fundamental

É indispensável não confundir os dois conceitos centrais de travessia fechada em grafos:

| Propriedade | Circuito Euleriano (Aula 16) | Ciclo Hamiltoniano / TSP (Aula 17) |
| :--- | :--- | :--- |
| **Elemento Percorrido** | Cada **aresta** (tubulação física) exatamente uma vez | Cada **vértice** (estação/equipamento) exatamente uma vez |
| **Repetição de Nós** | Permitida (desde que por tubos diferentes) | Estritamente proibida (exceto início e fim na base) |
| **Complexidade de Decisão** | Polinomial e simples: $\deg(v) \equiv 0 \pmod 2$ ($\mathcal{O}(\vert{}V\vert{} + \vert{}E\vert{})$) | **NP-completo**; não há critério estrutural simples conhecido |
| **Aplicação na Fábrica** | Robô *crawler* inspecionando espessura de parede nos tubos | Veículo AGV colhendo amostras físico-químicas nos skids |

### 2.2. Complexidade Computacional e Limitações da Força Bruta

O TSP pertence à classe **NP-difícil**. A estratégia de força bruta (avaliar todas as permutações viáveis) cresce a uma taxa fatorial $\mathcal{O}((n-1)!)$.
* Para a malha da nossa bancada ($n = 6$ locais), o espaço amostral tem $5! = 120$ trajetórias, sendo computacionalmente tratável.
* Para uma ampliação com $n = 20$ estações de recolha, o espaço atinge $19! \approx 1{,}2 \times 10^{17}$ permutações, tornando a busca exata inviável em tempo útil.

Embora algoritmos de programação dinâmica como o de **Held-Karp (1962)** reduzam a complexidade para $\mathcal{O}(n^2 2^n)$, a resposta rápida em sistemas de controlo e supervisão em tempo real (SCADA-Core) requer a aplicação de **heurísticas construtivas** combinadas com **métodos de busca local**.

### 2.3. Heurística Construtiva do Vizinho Mais Próximo (*Nearest Neighbor*)

A heurística implementada na função `vizinho_mais_proximo` toma decisões gulosas (*greedy*) iterativas com complexidade $\mathcal{O}(n^2)$:
1. Inicializa o percurso na base de operações `Lab_CQ`.
2. Em cada nó atual, identifica no conjunto de estações pendentes aquela que possui a menor distância física $D[atual, candidato]$.
3. Desloca o veículo para essa estação e remove-a do conjunto de nós pendentes.
4. Ao esgotar as estações, regressa à base inicial.

**Limitação Teórica:** Por não avaliar o impacto global das escolhas, a heurística com frequência deixa nós isolados para as últimas etapas, forçando um "salto cego" longo e dispendioso no encerramento do circuito.

### 2.4. Refinamento Local por Busca 2-Opt

O algoritmo **2-Opt (Croes, 1958)** corrige os defeitos da solução gulosa:
* Dada uma rota inicial, o algoritmo seleciona pares de arestas não adjacentes $(u, v)$ e $(x, y)$ e testa a sua inversão:
  $$\text{nova\_rota} = \text{rota}[:i] + \text{rota}[i:j+1][::-1] + \text{rota}[j+1:]$$
* A substituição só é confirmada se resultar em redução estrita da distância acumulada:
  $$D[u, x] + D[v, y] < D[u, v] + D[x, y]$$
* O processo repete-se em ciclos $\mathcal{O}(n^2)$ até a convergência para um **ótimo local** (onde nenhuma troca adicional reduz o custo).

Geometricamente no plano da fábrica, a operação 2-Opt elimina **cruzamentos de trajetórias físicas**, pois, pela desigualdade triangular, a soma dos lados opostos de um quadrilátero convexo é estritamente menor que a soma das suas diagonais cruzadas.

### 2.5. Cotas Inferiores via Árvore Geradora Mínima (MST)

Para certificar a qualidade da solução heurística em relação ao ótimo absoluto, utiliza-se a **Árvore Geradora Mínima (MST — *Minimum Spanning Tree*)**. Ao remover qualquer aresta de um ciclo hamiltoniano válido, obtém-se uma árvore geradora do grafo. Como a MST é a árvore conexa de menor peso possível sobre o conjunto de nós, o seu custo atua como uma cota inferior estrita:

$$\text{Custo}(\text{MST}) \le \text{Custo}(\text{Ciclo Hamiltoniano Ótimo})$$

---

## 3. Exemplo Resolvido

**Pergunta:** Por que motivo a rota otimizada via 2-Opt (`Lab_CQ -> TS1 -> BC1 -> AS1 -> EST_Envase -> VS2_Envase -> Lab_CQ`, custo $260{,}0\,\text{m}$) é superior à rota construída pelo Vizinho Mais Próximo (`Lab_CQ -> TS1 -> BC1 -> AS1 -> VS2_Envase -> EST_Envase -> Lab_CQ`, custo $280{,}0\,\text{m}$)?

**Resolução:**
1. Ambos os métodos partilham o mesmo segmento inicial:
   $$\text{Lab\_CQ} \xrightarrow{45.0} \text{TS1\_Suprimento} \xrightarrow{20.0} \text{BC1\_Bomba} \xrightarrow{45.0} \text{AS1\_Acumulador} \quad (\text{Subtotal} = 110{,}0\,\text{m})$$
2. Na rota gulosa (NN), a partir de `AS1_Acumulador`:
   * Entre `VS2_Envase` ($25.0\,\text{m}$) e `EST_Envase` ($40.0\,\text{m}$), o algoritmo escolhe `VS2_Envase` por ser o vizinho imediato mais próximo.
   * Em seguida, desloca-se obrigatoriamente para o nó restante `EST_Envase` ($35.0\,\text{m}$).
   * Estando em `EST_Envase`, o AGV é obrigado a retornar à base: $D[\text{EST\_Envase}, \text{Lab\_CQ}] = 110.0\,\text{m}$.
   * Custo do trecho final: $25.0 + 35.0 + 110.0 = 170.0\,\text{m}$. Custo global: $110.0 + 170.0 = \mathbf{280{,}0\,\text{m}}$.
3. Na rota refinada (2-Opt), inverte-se a ordem de recolha entre `VS2_Envase` e `EST_Envase`:
   * O AGV ruma de `AS1_Acumulador` a `EST_Envase` ($40.0\,\text{m}$) e depois a `VS2_Envase` ($35.0\,\text{m}$).
   * A partir de `VS2_Envase`, o retorno ao laboratório custa apenas $75.0\,\text{m}$.
   * Custo do trecho final: $40.0 + 35.0 + 75.0 = 150.0\,\text{m}$. Custo global: $110.0 + 150.0 = \mathbf{260{,}0\,\text{m}}$.
4. Conclusão: A busca local 2-Opt evitou o salto final crítico de $110.0\,\text{m}$, economizando $20.0\,\text{m}$ por ciclo ($7{,}14\%$ de economia energética e desgaste mecânico).

---

## 4. Atividades de Investigação

1. **Enumeração Exaustiva (Força Bruta):** Implemente uma rotina recursiva ou iterativa via `itertools.permutations` em Python que calcule o custo de todas as 120 permutações de ciclo possíveis com início no `Lab_CQ`, comprovando que $260{,}0\,\text{m}$ é de facto o mínimo global da instância.
2. **Sensibilidade ao Ponto de Partida:** Execute o algoritmo do Vizinho Mais Próximo iniciando a exploração em `EST_Envase` (índice 5) e verifique se a trajetória preliminar diverge da obtida a partir do laboratório.
3. **Cálculo da Cota via MST:** Construa a Árvore Geradora Mínima (usando o Algoritmo de Prim ou Kruskal) a partir da matriz de adjacência e comprove que $\text{Custo}(\text{MST}) \le 260{,}0\,\text{m}$.
4. **Algoritmo de Christofides (1976):** Pesquise o funcionamento do algoritmo de Christofides e sintetize como a associação de uma MST com um emparelhamento perfeito de peso mínimo sobre vértices de grau ímpar garante uma aproximação de no máximo $1{,}5\times$ em relação ao ótimo.

---

## 5. Entregável da Aula 17

* **Módulo de Otimização de Rota de AGV (`17 - Problemas Hamiltonianos e Roteamento de AGV.ipynb`):** Código orientado a objetos em Python com a classe `RoteadorAGV_TSP`, matriz de distâncias reais dos skids de bebidas, tabelas ASCII comparativas e asserções formais de validação do ciclo ótimo.
