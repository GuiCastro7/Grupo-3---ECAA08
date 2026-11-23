# Etapa 03 — Estruturas em Árvores Aplicadas ao SCADA-Core

### Informações do Projeto

| Parâmetro | Detalhe |
| :--- | :--- |
| **Unidade Industrial** | Linha Automatizada de Envase e Inspeção de Bebidas (Módulos 1 a 6 — Grupo 3) |
| **Disciplina / Código** | ECAA08 — `ECAA08-SISTEMA-SCADA-GRUPO3` |
| **Escopo da Etapa** | Aplicação de Árvores em Otimização Topológica, Compressão de Dados, Decisão SIS, Historiador Temporal, Planejamento Cinodinâmico, Redes Ethernet Industriais e Redes de Petri |

---

## Visão Geral

Esta pasta reúne a documentação técnica (`.md`) e as implementações executáveis em Python/Google Colab (`.ipynb`) da **Etapa 03 (Árvores)**, aplicadas integralmente à **Linha Automatizada de Envase e Inspeção de Bebidas** do Grupo 3 — englobando os módulos de suprimento e pressurização (`TS1`, `BC1`, `AS1`, `VS1`), dosagem volumétrica (`VS2`, `SQ2`), inspeção de nível e tampagem (`VS3`/`SL1`, `VS4`/`AC1`) e vedação sobre a esteira transportadora (`VS5`/`SFC1`, `RC1`), sob os critérios das normas **ANSI/ISA-5.1** e **IEC 61508 / IEC 61511**.

---

## Índice das Aulas

| Aula | Tema / Algoritmo | Aplicação na Linha de Envase | Documentação | Código (Colab) |
| :---: | :--- | :--- | :---: | :---: |
| **19** | **Kruskal e Prim (MST)** | Dimensionamento mínimo ($72\text{ m}$) de eletrocalhas, *pipe racks* e barramento SCADA entre `TS1`, `BC1`, `AS1`, `VS2`, `AC1` e `SFC1` | [Ver `.md`](./Aula%2019%20-%20Algoritmo%20de%20Kruskal%20e%20Prim.md) | [Ver `.ipynb`](./Aula%2019%20-%20Algoritmo%20de%20Kruskal%20e%20Prim%20-%20code.ipynb) |
| **20** | **Algoritmo de Huffman** | Compressão *lossless* ($76{,}30\%$ de economia de banda) da telemetria dos 5 sensores primários (`SP1`, `SP2`, `SQ2`, `SL1`, `SFC1`) | [Ver `.md`](./Aula%2020%20-%20Algortimo%20de%20Huffman.md) | [Ver `.ipynb`](./Aula%2020%20-%20Algortimo%20de%20Huffman%20-%20code.ipynb) |
| **21** | **Árvores Binárias (BDT e AVL)** | Árvore Binária de Decisão para intertravamento SIS/qualidade (`PROD_APROV`/`DESCARTE_REJ`) e Árvore AVL para o Historiador temporal | [Ver `.md`](./Aula%2021%20-%20%C3%81rvores%20Bin%C3%A1rias.md) | [Ver `.ipynb`](./Aula%2021%20-%20%C3%81rvores%20Bin%C3%A1rias%20-%20code.ipynb) |
| **22** | **Rapidly-exploring Random Trees (RRT)** | Planejamento cinodinâmico de partida segura para pressurização de `AS1` desviando das barreiras booleanas $\Phi_{\text{SIS}}$ | [Ver `.md`](./Aula%2022%20-%20Rapidly-exploring%20Random%20Trees.md) | [Ver `.ipynb`](./Aula%2022%20-%20Rapidly-exploring%20Random%20Trees%20-%20code.ipynb) |
| **23** | **Protocolo de Árvore Geradora (STP / RSTP)** | Redundância de rede Ethernet L2 (IEEE 802.1w), prevenção de *Broadcast Storms* e reconvergência após falha no backbone `SW-CORE` $\leftrightarrow$ `SW-SUP` | [Ver `.md`](./Aula%2023%20-%20Protocolo%20de%20%C3%81rvore%20Geradora%20(STP%20-%20RSTP).md) | [Ver `.ipynb`](./Aula%2023%20-%20Protocolo%20de%20%C3%81rvore%20Geradora%20(STP%20-%20RSTP)%20-%20code.ipynb) |
| **24** | **Redes de Petri (Atingibilidade e Cobertura)** | Verificação formal do ciclo de envase (`AS1`/`VS2`), detecção de acúmulo ilimitado ($\omega$) na esteira `RC1` e controle por Lugar Complementar | [Ver `.md`](./Aula%2024%20-%20%C3%81rvore%20de%20Atingibilidade%20e%20Cobertura%20em%20Redes%20de%20Petri.md) | [Ver `.ipynb`](./Aula%2024%20-%20%C3%81rvore%20de%20Atingibilidade%20e%20Cobertura%20em%20Redes%20de%20Petri%20-%20code.ipynb) |

---

## Como Executar os Notebooks

1. Clique no link **Ver `.ipynb`** da aula desejada na tabela acima.
2. No topo do arquivo no GitHub, clique no botão **Open in Colab**.
3. No Google Colab, execute todas as células pelo menu **Ambiente de execução → Executar tudo** (`Ctrl + F9`).

### Principais Bibliotecas Utilizadas
* `numpy` e `pandas` — modelagem matricial, séries temporais e tabulação de estados.
* `networkx` — modelagem de grafos, RSTP e grafos de atingibilidade/cobertura.
* `matplotlib` — visualização de planos de fase, topologias de rede e árvores de estados.