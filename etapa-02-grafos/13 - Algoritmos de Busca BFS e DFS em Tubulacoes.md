# Aula 13: Algoritmos de Busca (BFS e DFS) em Malhas de Tubulação da Linha de Envase

## 1. Fundamentos Matemáticos: Travessia em Grafos na Célula de Envase

1. **Busca em Largura (BFS):** Utiliza fila FIFO (*First-In, First-Out*). Encontra deterministicamente o caminho com o **menor número de arestas/válvulas intermediárias** ($O(|V| + |E|)$), minimizando a quantidade de comutações eletromecânicas e pontos de falha na dosagem.
2. **Busca em Profundidade (DFS):** Utiliza recursão/pilha LIFO (*Last-In, First-Out*). Permite detectar ciclos de recirculação e **enumerar todas as rotas alternativas de contingência** (linhas redundantes de bombeamento e desvios de dosagem).

---

## 2. Aprofundamento Teórico

### 2.1. Busca em Largura (BFS) — Definição Formal na Malha de Fluidos

O algoritmo BFS explora a rede hidráulica **por camadas**: a partir de um vértice de suprimento $s$ (como o Tanque de Bebidas `TS1_Suprimento`), visita primeiro todos os equipamentos a distância $1$ (medida em número de trechos de tubulação), depois todos a distância $2$, e assim sucessivamente até atingir o bico de envase na esteira transportadora (`EST_Envase`).

Formalmente, seja $d(s, v)$ a distância mínima (em quantidade de arestas/válvulas) de $s$ até $v$. O BFS assegura a seguinte propriedade invariante durante o processamento da fila:

$$\text{Se } v \text{ é retirado da fila antes de } u, \text{ então } d(s, v) \leq d(s, u).$$

Essa invariante garante que **o primeiro caminho descoberto até a garrafa na esteira é estritamente o mais curto em número de componentes atravessados**. Na automação da Linha de Envase (SCADA-Core), essa abordagem identifica a rota com menor número de válvulas solenoides a serem acionadas, reduzindo o risco de perda de carga localizada por conexões e o tempo total de resposta de abertura mecânica dos atuadores.

**Complexidade Computacional:** cada nó (tanque, bomba, acumulador, válvula, sensor) é enfileirado exatamente uma vez ($O(|V|)$) e cada duto de interconexão é examinado uma única vez ($O(|E|)$) ao expandir os vizinhos, totalizando $O(|V| + |E|)$ — complexidade linear e adequada para execução em tempo real em CLPs ou controladores industriais.

### 2.2. Busca em Profundidade (DFS) — Definição Formal e Classificação de Dutos

A DFS explora a infraestrutura de tubulações **aprofundando-se ao máximo** por uma linha de processo até alcançar a extremidade de descarga ou um nó sem saída, antes de retroceder (*backtracking*). Durante a execução da DFS sobre o dígrafo da linha de envase, cada duto $(u, v)$ é classificado em uma de quatro categorias topológicas segundo os instantes de descoberta e finalização dos nós:

| Tipo de aresta | Definição Estrutural | Interpretação Física na Linha de Envase |
| :--- | :--- | :--- |
| **Aresta de árvore** (*tree edge*) | Leva a um componente ainda não visitado na busca | Trecho primário de condução do fluido durante o percurso de envase |
| **Aresta de retorno** (*back edge*) | Leva a um equipamento ancestral na árvore de busca | Identifica um **ciclo de recirculação fechado** (ex.: linha de alívio `VALV_Alivio -> TS1_Suprimento`) |
| **Aresta de avanço** (*forward edge*) | Leva a um descendente já visitado por outro caminho | Rota direta ou atalho redundante (ex.: bypass `AS1 -> SQ2` contornando a válvula `VS2`) |
| **Aresta de cruzamento** (*cross edge*) | Leva a um vértice em outro ramo, sem relação de ancestralidade | Interconexão entre linhas secundárias de sanitização (CIP) ou ramais distintos |

A detecção de uma aresta de retorno pela DFS comprova formalmente a existência de ciclos. Na Linha de Envase do Grupo 3, a sub-rede direta de dosagem opera em fluxo unidirecional (DAG - Grafo Acíclico Dirigido), ao passo que a linha de recirculação de segurança e alívio de sobrepressão introduz intencionalmente uma aresta de retorno, assegurando que o excesso de pressão retorne ao tanque principal `TS1_Suprimento`.

**Complexidade Computacional:** idêntica à BFS, $O(|V| + |E|)$, com consumo de memória proporcional à altura da árvore de recursão ($O(\text{profundidade máxima})$).

### 2.3. BFS vs. DFS: Quando Usar Cada Um no SCADA-Core

| Critério | BFS (Busca em Largura) | DFS (Busca em Profundidade) |
| :--- | :--- | :--- |
| **Garantia de menor nº de arestas** | Sim (mínimo de válvulas/interconexões) | Não (retorna a rota explorada primeiro pelo ramo) |
| **Uso de memória no pior caso** | $O(|V|)$ (fronteira mantida na fila) | $O(\text{profundidade máxima})$, geralmente muito baixo |
| **Enumeração de todas as rotas** | Possível, porém com alto custo de memória | **Natural e ótima** (utilizada no notebook para listar as 4 rotas de contingência) |
| **Detecção de ciclos de recirculação** | Não direta (exige controle adicional de níveis) | **Direta e imediata**, via identificação de arestas de retorno |
| **Aplicação típica na planta de envase** | Rota com menor número de atuadores a comutar (menor risco de falha mecânica de vedação) | Análise global de contingência: mapear todas as alternativas viáveis antes de comutar a operação |

### 2.4. Bloqueio Dinâmico de Nós como Simulação de Falha de Equipamentos

A classe `NavegadorGrafos` recebe um parâmetro opcional `nos_bloqueados: Set[str]`. Quando um instrumento ou equipamento sofre uma anomalia — por exemplo, desarme térmico da Bomba Centrífuga Principal `BC1_Bomba` ou travamento mecânico da Válvula Solenoide de Dosagem `VS2_Envase` —, o supervisório inclui a respectiva tag no conjunto de bloqueios.

Do ponto de vista algorítmico, os nós bloqueados são simplesmente desconsiderados durante a expansão de vizinhos. A verificação `v_nome not in nos_bloqueados` opera em custo amortizado $O(1)$ via tabela hash (`set` em Python), preservando rigorosamente a complexidade $O(|V| + |E|)$ da travessia e permitindo recálculos ultrarrápidos em tempo de execução sem corromper a malha cadastral estática da fábrica.

---

## 3. Exemplo Resolvido

**Pergunta:** Por que a busca BFS retorna a rota `TS1_Suprimento -> VS1_Succao -> BC1_Bomba -> AS1_Acumulador -> SQ2_Medicao -> EST_Envase` (5 arestas) como a solução prioritária de menor número de válvulas, em detrimento da rota nominal via `VS2_Envase` (6 arestas), mesmo sabendo que a rota nominal possui um comprimento físico linear menor ($29.5\,\text{m}$ contra $31.5\,\text{m}$ da linha de bypass)?

**Resolução:** A BFS opera estritamente sobre a **métrica de saltos topológicos (contagem de arestas)**, sendo indiferente aos pesos métricos atribuídos aos dutos. 

Na arquitetura da Linha de Envase:
* Rota via bypass: `TS1` $\rightarrow$ `VS1` $\rightarrow$ `BC1` $\rightarrow$ `AS1` $\rightarrow$ `SQ2` $\rightarrow$ `EST` (5 arestas: atravessa a sucção, recalque da bomba, conexão do acumulador, bypass direto e bico injetor).
* Rota nominal dosadora: `TS1` $\rightarrow$ `VS1` $\rightarrow$ `BC1` $\rightarrow$ `AS1` $\rightarrow$ `VS2` $\rightarrow$ `SQ2` $\rightarrow$ `EST` (6 arestas: passa adicionalmente pela câmara da válvula solenoide de dosagem `VS2_Envase`).

Sob a ótica de **confiabilidade e disponibilidade de sistemas críticos (NBR ISO 13849 / NR-12)**, minimizar o número de componentes em série reduz a taxa combinada de falhas ($\lambda_{\text{total}} = \sum \lambda_i$). A BFS seleciona a trajetória que exige acionar um menor número de válvulas e sensores intermediários. Já a determinação da menor extensão física ou perda de carga distribuída é uma decisão de engenharia de fluidos resolvida pelo Algoritmo de Dijkstra (Aula 14). Ambas as métricas são essenciais e complementares no supervisório SCADA-Core.

---

## 4. Atividades de Investigação

1. **Varredura por Camadas:** Execute manualmente o rastreamento da BFS a partir do reservatório de reserva `TS2_Auxiliar` até o bico de envase na esteira `EST_Envase`. Registre a distância em camadas (número de arestas) para cada nó visitado (`VS1_Succao`, `BC1_Bomba`, `BC2_Bomba`, `AS1_Acumulador`, etc.).
2. **Classificação de Arestas e Ciclos:** Analise a linha de reciclo `VALV_Alivio -> TS1_Suprimento`. Se executarmos uma DFS completa a partir de `TS1_Suprimento`, classifique essa aresta segundo a Seção 2.2. Por que a sub-rede que atende diretamente ao envase (excluindo a linha de alívio) pode ser classificada como um DAG?
3. **Isolamento Total de Bombeamento:** Simule uma falha catastrófica simultânea em ambas as bombas centrífugas bloqueando o conjunto `nos_bloqueados = {"BC1_Bomba", "BC2_Bomba"}` e invoque a BFS de `TS1_Suprimento` até `EST_Envase`. Explique por que o retorno é `None` e qual sinal de intertravamento de segurança (SIL) o supervisório deve enviar para a esteira transportadora `RC1`.
4. **Poda de Enumeração na DFS:** Em sistemas supervisórios com centenas de ramais, enumerar todas as rotas pode causar degradação temporal. Modifique a implementação da DFS para aplicar uma poda (*early stopping*) assim que encontrar $K=2$ rotas viáveis e compare analiticamente o ganho de desempenho em relação à enumeração exaustiva.

---

## 5. Entregável da Aula 13

* **Motor de Busca Topológica em Python:** Implementação robusta no Jupyter Notebook correspondente contendo a classe `NavegadorGrafos` com métodos de busca em largura (`bfs_menor_numero_valvulas`) e busca em profundidade (`dfs_todos_os_caminhos`), com suporte dinâmico a nós bloqueados e validação automatizada de rotas de contingência na Linha de Envase.
