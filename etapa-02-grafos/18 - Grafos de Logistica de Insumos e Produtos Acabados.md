# Aula 18: Grafos de Logística de Insumos, Processo e Produtos Acabados na Linha de Envase

## 1. Situação-Problema

Nas aulas anteriores (Aulas 11 a 17), a planta do Grupo 3 (SCADA-Core) foi representada pela malha hidráulica de dosagem e envase: reservatório principal (`TS1_Suprimento`), válvula de sucção (`VS1_Succao`), bombas centrífugas (`BC1_Bomba` e `BC2_Bomba`), acumulador pressurizado (`AS1_Acumulador`), válvula de envase (`VS2_Envase`), medidor de vazão (`SQ2_Medicao`) e bico injetor na esteira (`EST_Envase`). A operação industrial completa exige modelar **como os insumos líquidos e embalagens chegam à linha de envase** e **como os lotes de bebidas acabadas alcançam as docas de expedição**.

A planta logística da fábrica de bebidas integra os seguintes setores operacionais:

* Portaria principal e balança rodoviária de entrada;
* Zona de Recebimento e Armazenamento de Insumos (Galpão A): tanques de xarope concentrado, reservatório de água tratada/filtrada, bateria de cilindros de CO2 para carbonatação, almoxarifado de garrafas PET vazias e estoque de tampas/rótulos;
* Célula de Preparação e Linha de Envase: misturador/carbonatador, tanque `TS1_Suprimento`, linha de recalque `BC1_Bomba -> AS1_Acumulador`, dosagem `VS2_Envase -> SQ2_Medicao` e enchimento na esteira transportadora `EST_Envase` (`RC1`);
* Zona de Acabamento e Armazenamento de Produtos Acabados (Galpão B): rotuladora/enfardadeira, paletização automatizada e posições de estoque segregadas por linha (Estoque Lote Refrigerante Cola, Estoque Lote Guaraná e Estoque Lote Água Gaseificada);
* Pátio de expedição com docas de carregamento, balança de saída e retorno à portaria.

O objetivo desta aula é construir grafos computacionais que conectem esses setores ao processo de envasamento sem misturar fluxos fisicamente distintos.

> **Nota metodológica:** Os comprimentos empregados nesta aula são estimativas didáticas em metros para comparação de rotas logísticas e industriais.

---

## 2. Fundamentos Teóricos: Redes Multicamada e Grafos Acíclicos Dirigidos

### 2.1. Por que a Cadeia Logística de Envase é um DAG

Diferente da malha hidráulica interna das Aulas 11 a 15 (que possui o ciclo fechado de recirculação e alívio de pressão via `VALV_Alivio -> TS1_Suprimento`), o fluxo global de materiais $G_M$ desta aula — do recebimento de insumos e vasilhames até a expedição do palete fechado — é, por definição de processo, um **Grafo Acíclico Dirigido (DAG — *Directed Acyclic Graph*)**: não existe caminho que retorne a um vértice já visitado, pois cada etapa produtiva (tratamento, xaroparia, carbonatação, envase na garrafa, tampa, rotulagem e paletização) é irreversível dentro do fluxo normal de fabricação.

* **Definição formal:** Um dígrafo $G=(V,E)$ é um DAG se não admite nenhum ciclo dirigido, ou seja, não existe sequência de vértices $v_0, v_1, \dots, v_k = v_0$ com $(v_{i-1}, v_i) \in E$ para todo $i$.
* **Propriedade fundamental (ordenação topológica):** Todo DAG admite pelo menos uma **ordenação topológica**, isto é, uma numeração dos vértices de $1$ a $n$ tal que, para toda aresta dirigida $(u,v) \in E$, a ordem de $u$ é estritamente anterior à ordem de $v$. Essa propriedade torna o grafo de processo auditável pelo supervisório SCADA: qualquer sequência produtiva pode ser validada verificando se respeita a ordenação topológica do DAG — por exemplo, o modelo impede que `Paletização Automatizada` ocorra antes de `EST_Envase`, pois não existe ordenação compatível com essa inversão.
* **Algoritmo de Kahn (1962):** Calcula uma ordenação topológica em tempo linear processando repetidamente vértices com grau de entrada zero, removendo-os do grafo e decrementando o grau de entrada de seus sucessores até que todos os vértices sejam processados. Se restarem vértices com grau de entrada positivo, o grafo contém ciclo e não é um DAG.

### 2.2. Redes Multicamada (*Multilayer Networks*)

A estratégia de modelar **três grafos distintos** ($G_M$, $G_V$, $G_E$) sobre a mesma fábrica de bebidas constitui uma **rede multicamada**: o mesmo conjunto de instalações físicas é representado por múltiplas camadas de conexão, cada uma descrevendo uma relação operacional específica (`materiais`, `veículos`, `estoque`).

O motivo de **não colapsar tudo em um único grafo** é evitar um erro clássico de modelagem: aplicar um algoritmo de uma camada (como Dijkstra sobre as tubulações e esteiras de $G_M$) para responder a uma pergunta que pertence a outra camada (como a rota de tráfego de uma carreta ou empilhadeira em $G_V$). Vértices com nomes semelhantes em camadas diferentes (`Galpão A`, por exemplo) representam o mesmo espaço físico sob óticas distintas (transferência de bebida/insumos vs. manobra de veículos), possuindo restrições e arestas completamente independentes.

### 2.3. Cadeia de Suprimentos como Composição de Grafos

A cadeia logística completa da fábrica de bebidas pode ser decomposta em subproblemas resolvidos pelas ferramentas desenvolvidas pelo Grupo 3 ao longo da Etapa 02:

| Subproblema na Planta de Bebidas | Ferramenta da Etapa 02 Aplicável |
| :--- | :--- |
| Menor rota entre recebimento de insumos e bico de envase | Algoritmo de Dijkstra com Min-Heap (Aula 14) |
| Desvio automático em caso de bloqueio de válvula ou esteira | Reponderação dinâmica de arestas (Aula 15) |
| Inspeção sanitária (CIP) de 100% dos dutos sem repetição | Circuito Euleriano via Hierholzer (Aula 16) |
| Roteamento do AGV coletando amostras de qualidade nos skids | TSP com heurística NN + refinamento 2-Opt (Aula 17) |
| Auditar se a sequência de envase e embalagem respeita a ordem física | Ordenação topológica em DAG (Aula 18) |

### 2.4. Limitações do Modelo com Peso Único

Os grafos $G_M$ e $G_V$ implementados nesta aula utilizam um único escalar de peso (distância estimada em metros). Em uma modelagem industrial avançada, cada aresta pode carregar um **vetor de custos** contendo distância, tempo de retenção, perda de carga hidráulica, consumo energético e risco sanitário, convertendo o problema de menor caminho em uma **otimização multiobjetivo** baseada em fronteira de Pareto.

---

## 3. Três Grafos para o Layout da Planta de Envase

Modelamos três redes complementares para separar as regras de negócio do supervisório:

| Grafo | Vértices | Arestas Dirigidas | Peso | Pergunta Respondida |
| :--- | :--- | :--- | :--- | :--- |
| **$G_M$ — Fluxo de Materiais** | Tanques, silos, linha de envase (`TS1` a `EST`), paletização e docas | Transferência física via dutos inox e esteiras | Distância interna estimada (m) | Como o insumo chega à doca como fardo de bebida paletizado? |
| **$G_V$ — Circulação de Veículos** | Portaria, balanças, pátios, galpões e docas | Vias autorizadas para caminhões e empilhadeiras | Distância de circulação (m) | Qual rota viária interna o veículo deve percorrer? |
| **$G_E$ — Alocação de Estoque** | Paletização, endereços de porta-paletes e docas | Endereçamento FIFO/FEFO e separação de pedidos | Movimentações ou tempo de manuseio | Onde armazenar e de onde expedir cada lote de bebida? |

---

## 4. Grafo Dirigido do Fluxo de Materiais ($G_M$)

Definimos o dígrafo ponderado do fluxo produtivo com pesos não negativos. O conjunto de vértices conecta o recebimento de matérias-primas à malha de envase do Grupo 3:

```mermaid
flowchart LR
    P["Portaria"] --> B["Balança de Entrada"]
    B --> A["Recebimento / Galpão A"]
    
    A --> X["Tanque: Xarope Concentrado"]
    A --> W["Reservatório: Água Tratada"]
    A --> C["Bateria: CO2 Líquido"]
    A --> G["Almoxarifado: Garrafas PET"]
    A --> T["Almoxarifado: Tampas e Rótulos"]
    
    X --> M["Misturador / Xaroparia"]
    W --> M
    M --> TS1["TS1_Suprimento"]
    C --> TS1
    
    TS1 --> BC1["VS1 / BC1_Bomba / AS1"]
    BC1 --> EST["VS2 / SQ2 / EST_Envase"]
    
    G --> L["Lavadora / Rinser de Garrafas"]
    L --> EST
    T --> EST
    
    EST --> R["Rotuladora e Enfardadeira"]
    R --> PAL["Paletização Automatizada"]
    
    PAL --> E1["Estoque: Refrigerante Cola"]
    PAL --> E2["Estoque: Refrigerante Guaraná"]
    PAL --> E3["Estoque: Água Gaseificada"]
    
    E1 --> D["Docas de Expedição"]
    E2 --> D
    E3 --> D