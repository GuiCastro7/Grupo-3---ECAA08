# Aula 14: Menor Caminho — Algoritmo de Dijkstra e Roteamento Dinâmico na Linha de Envase

## 1. Fundamentos Matemáticos: Algoritmo Guloso de Dijkstra

Dado um dígrafo ponderado com pesos estritamente não-negativos $G = (V, E, W)$, representativo da malha de tubulações e equipamentos da linha de envase, o **Algoritmo de Dijkstra** computa deterministicamente o caminho de custo mínimo entre um vértice fonte $s$ (Reservatório Principal `TS1_Suprimento`) e os demais nós $v \in V$, culminando no bico de envase sobre a esteira transportadora (`EST_Envase`).

Utilizando uma fila de prioridade implementada via Min-Heap binário (`heapq`), a complexidade assintótica do algoritmo é:
$$O((|V| + |E|) \log |V|)$$

Onde a função de ponderação $W: E \rightarrow \mathbb{R}^+$ associa a cada trecho de duto a sua extensão física real em metros ($L\text{ [m]}$) ou, alternativamente, a sua perda de carga hidráulica distribuída ($\Delta P\text{ [Barg]}$).

---

## 2. Aprofundamento Teórico

### 2.1. O Princípio de Relaxação de Arestas na Rede de Envase

A operação elementar do algoritmo é a **relaxação de arestas**: para cada duto orientado $(u, v)$ com comprimento ou custo $w(u, v)$, avalia-se se a distância acumulada conhecida a partir da fonte até o nó $u$ somada ao custo do trecho $(u, v)$ é estritamente inferior à melhor estimativa provisória registrada até o nó $v$. Caso afirmativo, os parâmetros são atualizados:

$$\text{se } d[u] + w(u,v) < d[v] \implies d[v] \leftarrow d[u] + w(u,v), \quad \text{pred}[v] \leftarrow u$$

No código da classe `RoteadorDijkstra`, essa relação é expressa diretamente pela instrução condicional:
```python
if nova_d < dist[v]:
    dist[v] = nova_d
    pred[v] = u
    heapq.heappush(heap, (nova_d, v))
```
A aplicação iterativa e exaustiva dessa relaxação, partindo do vértice com menor distância provisória ainda não fechado na fila de prioridades, materializa a estratégia **gulosa** (*greedy*) do algoritmo.

### 2.2. Por Que a Estratégia Gulosa Funciona e a Hipótese de Pesos Não-Negativos

A correção matemática do algoritmo assenta-se sobre a premissa indispensável de que **não existem custos ou pesos negativos** ($w(u, v) \geq 0, \forall (u, v) \in E$).

A demonstração por indução baseia-se nos seguintes princípios:
* **Hipótese de indução:** para todo vértice $u$ extraído do heap binário (marcado como "finalizado"), a distância atribuída $d[u]$ coincide exatamente com a distância mínima global $\delta(s, u)$ a partir da origem.
* **Passo indutivo:** ao remover do heap o nó $u$ que exibe o menor $d[u]$ entre todos os vértices abertos, suponha por absurdo que exista uma rota alternativa mais curta conectando a fonte a $u$. Como essa rota se origina no conjunto de nós fechados e atinge os abertos, ela deveria transpor alguma fronteira através de uma aresta $(x, y)$, onde $x$ está finalizado e $y$ permanece em aberto. Sendo todas as arestas não-negativas ($w \geq 0$), tem-se:
$$d[y] \leq \delta(s, u) < d[u]$$
Contudo, isso contradiz a premissa de que $u$ foi selecionado como o elemento de valor mínimo no topo do Min-Heap. Portanto, $d[u] = \delta(s, u)$. $\blacksquare$

**Interpretação Física na Planta Industrial:** No escoamento de fluidos reais em tubulações industriais, o comprimento físico $L$ e a perda de carga distribuída ($\Delta P = f \frac{L}{D} \frac{\rho v^2}{2}$) são grandezas puramente dissipativas e estritamente positivas. Pesos negativos seriam fisicamente absurdos nesse contexto. Caso surgisse uma modelagem abstrata com pesos negativos (por exemplo, compensação de pressão com ganho estático de cota em tubulações verticais descendentes com balanço líquido negativo), o algoritmo de Dijkstra falharia, exigindo a substituição pelo **Algoritmo de Bellman-Ford**, cuja complexidade temporal é sensivelmente superior: $O(|V| \cdot |E|)$.

### 2.3. Análise de Complexidade Detalhada

| Estrutura de Dados da Fila de Prioridade | Extração do Mínimo | Relaxação / Atualização | Complexidade Global | Aplicabilidade no Supervisório SCADA |
| :--- | :--- | :--- | :--- | :--- |
| **Busca Linear Vetorial (Sem Heap)** | $O(|V|)$ | $O(1)$ | $O(|V|^2)$ | Viável apenas para grafos densos onde $|E| \approx |V|^2$ |
| **Min-Heap Binário (`heapq`)** | $O(\log |V|)$ | $O(\log |V|)$ | $O((|V| + |E|) \log |V|)$ | **Padrão industrial ótimo** para redes esparsas de tubulação |
| **Heap de Fibonacci (Teórico)** | $O(\log |V|)$ amortizado | $O(1)$ amortizado | $O(|E| + |V| \log |V|)$ | Complexidade de implementação elevada; vantajoso apenas em malhas com milhões de nós |

Para a célula de dosagem e envase do Grupo 3 ($|V| = 9$, $|E| = 10$), o tempo de processamento do algoritmo com heap binário situa-se na escala de microssegundos ($< 0.1\text{ ms}$), permitindo que rotinas de recálculo dinâmico operem ciclicamente dentro do período de varredura do CLP (*scan cycle* típico de $10\text{ ms}$ a $50\text{ ms}$).

### 2.4. Reconstrução do Caminho via Vetor de Predecessores

Para manter a eficiência temporal e espacial, o algoritmo de Dijkstra não transporta as listas completas de caminhos durante a execução da fila. Ao invés disso, mantém um mapa unidirecional de rastreamento denominado `pred[v]`, que registra o antecessor imediato que viabilizou a última relaxação ótima do vértice $v$.

Uma vez atingido o nó de descarga na esteira (`EST_Envase`), a trajetória completa de dosagem é reconstruída por **retropropagação**:
1. Inicia-se no destino $v = \text{EST\_Envase}$.
2. Recupera-se recursivamente o nó anterior $u = \text{pred}[v]$.
3. O procedimento cessa quando a origem `TS1_Suprimento` é alcançada.
4. Inverte-se a sequência vetorial obtida para consolidar a rota orientada de fluxo.

### 2.5. Corretude com Bloqueios Dinâmicos de Válvulas e Equipamentos

O método `calcular_menor_caminho` aceita um conjunto opcional de `bloqueios: Set[str]`. Se um nó representativo de uma bomba (`BC1_Bomba`) ou de uma válvula solenoide (`VS2_Envase`) for bloqueado em decorrência de alarme de vazamento, falha de acionamento ou rotina de manutenção preventiva, o algoritmo simplesmente ignora as transições que incidem ou emanam desse nó.

Teoricamente, essa filtragem equivale a atribuir custo infinito às arestas correspondentes:
$$w(u, v) = \infty, \quad \forall u \in \text{bloqueios ou } v \in \text{bloqueios}$$
Como $\infty$ preserva o ordenamento monotônico frente a qualquer número real positivo, as propriedades fundamentais de terminação e convergência da estratégia gulosa mantêm-se estritamente válidas.

---

## 3. Exemplo Resolvido

**Pergunta:** Realize o rastreamento manual das iterações do Algoritmo de Dijkstra para a rede padrão da Linha de Envase, partindo de `TS1_Suprimento` em direção a `EST_Envase`, detalhando as relaxações ocorridas no Min-Heap e comprovando a rota ótima obtida.

**Resolução:**
1. **Inicialização:**
   * $d[\text{TS1\_Suprimento}] = 0.0\,\text{m}$; para todos os demais vértices, $d[v] = \infty$.
   * Vetor de predecessores: $\text{pred}[v] = \text{None}, \forall v \in V$.
   * Conteúdo inicial do Min-Heap: `[(0.0, 'TS1_Suprimento')]`.

2. **Iteração 1:**
   * Extrai do heap o vértice de menor custo: `TS1_Suprimento` ($d = 0.0\,\text{m}$).
   * Examina os vizinhos de saída: duto para `VS1_Succao` com peso $5.0\,\text{m}$.
   * Relaxação: $d[\text{VS1}] = 0.0 + 5.0 = 5.0\,\text{m} < \infty$. Registra $\text{pred}[\text{VS1}] = \text{TS1}$.
   * Conteúdo do Heap: `[(5.0, 'VS1_Succao')]`.

3. **Iteração 2:**
   * Extrai do heap: `VS1_Succao` ($d = 5.0\,\text{m}$).
   * Vizinhos de saída (ramificação para linha de bombeamento dupla):
     * Duto para `BC1_Bomba` (peso $3.0\,\text{m}$): $5.0 + 3.0 = 8.0\,\text{m} < \infty$. Registra $\text{pred}[\text{BC1}] = \text{VS1}$.
     * Duto para `BC2_Bomba` (peso $4.0\,\text{m}$): $5.0 + 4.0 = 9.0\,\text{m} < \infty$. Registra $\text{pred}[\text{BC2}] = \text{VS1}$.
   * Conteúdo do Heap: `[(8.0, 'BC1_Bomba'), (9.0, 'BC2_Bomba')]`.

4. **Iteração 3:**
   * Extrai do heap o menor elemento: `BC1_Bomba` ($d = 8.0\,\text{m}$).
   * Vizinho de saída: duto para `AS1_Acumulador` (peso $8.0\,\text{m}$).
   * Relaxação: $d[\text{AS1}] = 8.0 + 8.0 = 16.0\,\text{m} < \infty$. Registra $\text{pred}[\text{AS1}] = \text{BC1}$.
   * Conteúdo do Heap: `[(9.0, 'BC2_Bomba'), (16.0, 'AS1_Acumulador')]`.

5. **Iteração 4:**
   * Extrai do heap: `BC2_Bomba` ($d = 9.0\,\text{m}$).
   * Vizinho de saída: duto para `AS1_Acumulador` (peso $10.0\,\text{m}$).
   * Avaliação de relaxação: $9.0 + 10.0 = 19.0\,\text{m}$.
   * Como $19.0\,\text{m} > d[\text{AS1}] = 16.0\,\text{m}$, a relaxação **não ocorre** (o caminho عبر a bomba principal BC1 é comprovadamente mais curto!).
   * Conteúdo do Heap: `[(16.0, 'AS1_Acumulador')]`.

6. **Iteração 5:**
   * Extrai do heap: `AS1_Acumulador` ($d = 16.0\,\text{m}$).
   * Vizinhos de saída:
     * Duto nominal para `VS2_Envase` (peso $10.0\,\text{m}$): $16.0 + 10.0 = 26.0\,\text{m} < \infty$. Registra $\text{pred}[\text{VS2}] = \text{AS1}$.
     * Duto de bypass direto para `SQ2_Medicao` via `XV_BYPASS` (peso $14.0\,\text{m}$): $16.0 + 14.0 = 30.0\,\text{m} < \infty$. Registra $\text{pred}[\text{SQ2}] = \text{AS1}$.
   * Conteúdo do Heap: `[(26.0, 'VS2_Envase'), (30.0, 'SQ2_Medicao')]`.

7. **Iteração 6:**
   * Extrai do heap: `VS2_Envase` ($d = 26.0\,\text{m}$).
   * Vizinho de saída: duto para `SQ2_Medicao` (peso $2.0\,\text{m}$).
   * Avaliação de relaxação: $26.0 + 2.0 = 28.0\,\text{m}$.
   * Como $28.0\,\text{m} < d[\text{SQ2}] = 30.0\,\text{m}$, **a relaxação é bem-sucedida!**
   * Atualiza-se: $d[\text{SQ2}] \leftarrow 28.0\,\text{m}$ e $\text{pred}[\text{SQ2}] \leftarrow \text{VS2\_Envase}$.
   * Conteúdo do Heap: `[(28.0, 'SQ2_Medicao'), (30.0, 'SQ2_Medicao')]`.

8. **Iteração 7:**
   * Extrai do heap o topo ótimo: `SQ2_Medicao` ($d = 28.0\,\text{m}$).
   * Vizinho de saída: bico injetor de dosagem para `EST_Envase` (peso $1.5\,\text{m}$).
   * Relaxação: $d[\text{EST\_Envase}] = 28.0 + 1.5 = 29.5\,\text{m} < \infty$. Registra $\text{pred}[\text{EST}] = \text{SQ2}$.
   * Conteúdo do Heap: `[(29.5, 'EST_Envase'), (30.0, 'SQ2_Medicao')]`.

9. **Iteração 8:**
   * Extrai do heap o destino: `EST_Envase` ($d = 29.5\,\text{m}$). Como $u = \text{destino}$, o laço é encerrado com sucesso!

**Reconstrução por Retropropagação:**
$$\text{EST\_Envase} \leftarrow \text{SQ2\_Medicao} \leftarrow \text{VS2\_Envase} \leftarrow \text{AS1\_Acumulador} \leftarrow \text{BC1\_Bomba} \leftarrow \text{VS1\_Succao} \leftarrow \text{TS1\_Suprimento}$$

Invertendo a lista, consolida-se a **Rota Nominal Ótima**:
$$\text{TS1\_Suprimento} \rightarrow \text{VS1\_Succao} \rightarrow \text{BC1\_Bomba} \rightarrow \text{AS1\_Acumulador} \rightarrow \text{VS2\_Envase} \rightarrow \text{SQ2\_Medicao} \rightarrow \text{EST\_Envase}$$
Comprimento total linear: **$29.5\,\text{m}$**.

---

## 4. Atividades de Investigação

1. **Roteamento Dinâmico em Vazamento de Válvula:** Suponha que o sensor de vazão `SQ2` e o transmissor de pressão `SP2` detectem uma perda de estanqueidade catastrófica na válvula solenoide `VS2_Envase`, inserindo-a no conjunto de bloqueios (`bloqueios = {"VS2_Envase"}`). Execute o traçado manual de Dijkstra sob essa contingência e calcule o novo comprimento físico da rota desviada pelo bypass `XV_BYPASS`.
2. **Ponderação por Perda de Carga ($\Delta P$) vs. Distância Linear:** Em sistemas industriais com alta vazão, dutos de menor diâmetro provocam perdas de carga localizadas expressivas. Se a aresta `AS1_Acumulador -> VS2_Envase` (diâmetro de $2.0''$) possuir perda de carga $\Delta P = 0.85\,\text{Barg}$ e o bypass `AS1_Acumulador -> SQ2_Medicao` possuir diâmetro maior com $\Delta P = 0.30\,\text{Barg}$, mostre como a função objetivo do algoritmo pode inverter a rota preferencial quando ponderada por energia dissipada em vez de comprimento métrico.
3. **Escalabilidade Computacional: Dijkstra vs. Floyd-Warshall:** Na eventual expansão da planta para uma fábrica com 20 células de envase interligadas ($|V| = 200$, $|E| = 450$), analise comparativamente o custo computacional de invocar o Dijkstra sob demanda para requisições pontuais de dosagem versus manter uma matriz completa pré-calculada via Floyd-Warshall ($O(|V|^3)$).
4. **Ponto Crítico de Vulnerabilidade (Articulação):** Bloqueie o Acumulador de Suprimento `AS1_Acumulador` (`bloqueios = {"AS1_Acumulador"}`). O algoritmo retorna custo infinito ($\infty$) e rota vazia. O que esse resultado revela sobre o papel topológico do acumulador na linha de envase (ele é um vértice de corte / nó de articulação)?

---

## 5. Entregável da Aula 14

* **Módulo `RoteadorDijkstra` em Python:** Implementação orientada a objetos no Jupyter Notebook correspondente utilizando `heapq` com suporte a recálculo dinâmico sob contingência, vetor de predecessores e retorno estruturado da tupla `(custo_total, rota_equipamentos)` para a Linha de Envasamento de Bebidas (SCADA-Core).
