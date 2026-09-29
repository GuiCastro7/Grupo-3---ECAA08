# Aula 18: Grafos de Logística de Insumos, Processo e Produtos Acabados

## 1. Situação-Problema

Nas aulas anteriores, a fábrica foi representada pela malha de tubulações e equipamentos de processo. A operação industrial completa também exige decidir **como os insumos chegam à produção** e **como o produto acabado alcança as docas de expedição**.

A imagem `Grafo_Logitica.jpeg` apresenta o layout esquemático da planta industrial. Nela identificam-se os seguintes setores e fluxos principais:

* Portaria e balança rodoviária de entrada;
* Zona de Recebimento e Armazenamento de Insumos (Galpão A), com boxes de matérias sólidas (ureia, fosfato, cloreto de potássio, orgânicos/micronutrientes) e tanques de líquidos;
* Área de processamento: moega de recepção, silos de dosagem, moinho/misturador, granulação e secador rotativo com classificação;
* Zona de Armazenamento de Produtos Acabados (Galpão B): ensacamento/paletização e posições segregadas de estoque (NPK 04-14-08, NPK 10-10-10 e Organomineral Premium);
* Pátio de expedição com docas de carregamento e balança de saída.

O objetivo desta aula é construir grafos computacionais que conectem esses setores sem misturar fluxos físicos de naturezas distintas.

> **Nota metodológica:** As distâncias adotadas nesta aula são estimativas didáticas em metros para fins de roteamento e comparação de trajetórias operacionais.

---

## 2. Fundamentos Teóricos: Redes Multicamada e Grafos Acíclicos Dirigidos

### 2.1. A Cadeia de Materiais como um Grafo Acíclico Dirigido (DAG)

Diferente da malha interna de tubulações (que admite recirculação e linhas de retorno de segurança), o fluxo produtivo de materiais $G_M$ — do descarregamento de matérias-primas à paletização do produto acabado — é, por definição termodinâmica e operacional, um **Grafo Acíclico Dirigido (DAG — *Directed Acyclic Graph*)**: não existem caminhos orientados que retornem a um nó já processado, pois cada etapa de beneficiamento físico-químico é irreversível na rotina nominal de fabricação.

* **Definição formal:** Um dígrafo $G=(V,E)$ é um DAG se não admite nenhum ciclo dirigido, ou seja, não existe sequência de vértices $v_0, v_1, \dots, v_k = v_0$ com $(v_{i-1}, v_i) \in E$.
* **Ordenação Topológica:** Todo DAG admite uma ordenação topológica dos vértices $\text{ord}: V \rightarrow \{1, \dots, n\}$ tal que, para toda aresta $(u,v) \in E$, tem-se $\text{ord}(u) < \text{ord}(v)$. Essa propriedade permite ao sistema supervisório auditar a rastreabilidade do lote: nenhuma expedição pode ocorrer sem antecedência estrita das fases de dosagem, mistura e embalagem.
* **Algoritmo de Kahn (1962):** Avalia a aciclicidade e gera a ordenação topológica em tempo linear $O(\vert{}V\vert{}+\vert{}E\vert{})$ removendo sucessivamente vértices com grau de entrada nulo.

### 2.2. Redes Multicamada (*Multilayer Networks*)

A modelagem de plantas industriais completas sobrepõe diferentes relações sobre o mesmo espaço geográfico. Formalizamos a infraestrutura como uma rede de duas camadas desacopladas:
1. Camada de Fluxo de Materiais ($G_M$): transportadores de correia, dutos de dosagem e linhas de envase/ensaque.
2. Camada de Circulação Viária ($G_V$): arruamento interno, balanças e pátios de manobra autorizados para caminhões e veículos industriais.

O desacoplamento impede um erro comum de automação: utilizar rotinas de menor caminho de materiais para orientar a logística viária de frotas rodoviárias. Vértices com denominações homônimas (`Galpão A`, por exemplo) representam entidades com restrições e conexões distintas em cada camada.

### 2.3. Composição de Algoritmos na Cadeia de Suprimentos

A tabela a seguir consolida a correspondência entre os desafios logísticos da planta e os métodos algorítmicos implementados ao longo da Etapa 02:

| Subproblema Logístico | Algoritmo Aplicável |
| :--- | :--- |
| Rota de menor distância/custo entre recebimento e expedição | Dijkstra com Min-Heap (Aula 14) |
| Desvio dinâmico de rota por bloqueio de via ou manutenção | Reponderação topológica (Aula 15) |
| Inspeção de corredores e anéis viários sem repetição de vias | Algoritmo de Hierholzer (Aula 16) |
| Otimização de roteiro de coleta multiponto de amostras (AGV) | Heurística NN combinada com 2-Opt (Aula 17) |
| Auditoria de precedência e fluxo unidirecional de insumos | Ordenação Topológica em DAG (Aula 18) |

---

## 3. Especificação das Redes Logísticas da Planta

| Rede | Vértices | Arestas Dirigidas | Peso | Escopo de Decisão |
| :--- | :--- | :--- | :--- | :--- |
| **$G_M$ (Materiais)** | Setores, silos, reatores, tanques e estoques | Transferência física permitida de massa | Extensão linear estimada (m) | Trajetória do insumo até a expedição final |
| **$G_V$ (Veículos)** | Portaria, balanças, pátios e docas | Trechos de arruamento e manobra | Comprimento da pista (m) | Rota segura de circulação rodoviária |

---

## 4. Grafo Dirigido do Fluxo de Materiais ($G_M$)

O fluxo de transformação e beneficiamento de insumos é representado pelo diagrama:

```mermaid
flowchart LR
    P["Portaria"] --> B["Balança de Entrada"]
    B --> A["Recebimento / Galpão A"]
    A --> U["Box: Ureia"]
    A --> F["Box: Fosfato"]
    A --> K["Box: KCl"]
    A --> O["Box: Orgânicos/Micronutrientes"]
    A --> T["Tanques Líquidos"]
    U --> M["Moega de Recepção"]
    F --> M
    K --> M
    O --> M
    T --> D["Silos de Dosagem"]
    M --> D
    D --> X["Moinho / Misturador"]
    X --> G["Granulação"]
    G --> S["Secador / Classificação"]
    S --> E["Ensacamento / Paletização"]
    E --> N1["Estoque NPK 04-14-08"]
    E --> N2["Estoque NPK 10-10-10"]
    E --> N3["Estoque Organomineral"]
    N1 --> C["Docas de Expedição"]
    N2 --> C
    N3 --> C
