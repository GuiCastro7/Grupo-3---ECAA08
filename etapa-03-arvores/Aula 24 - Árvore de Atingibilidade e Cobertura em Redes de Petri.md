# Redes de Petri: Árvore de Atingibilidade e Árvore de Cobertura no SCADA-Core da Linha de Envase

### Informações do Projeto

| Parâmetro | Detalhe |
| ----- | ----- |
| **Unidade Industrial** | Linha Automatizada de Envase e Inspeção de Bebidas (Módulos 1 a 6 — Grupo 3) |
| **Aplicação** | Verificação Formal do Ciclo de Pressurização (`AS1`), Dosagem (`VS2`/`SQ2`), Intertravamento SIS e Acúmulo de Garrafas na Esteira `RC1` |
| **Método Formulado** | Redes de Petri Marcadas, Árvore de Atingibilidade e Árvore de Cobertura (Algoritmo de Karp-Miller) |
| **Código do Projeto** | ECAA08-SISTEMA-SCADA-GRUPO3 |

---

## 1. Analogia Intuitiva — O Jogo de Tabuleiro da Linha de Envase

Imagine a linha de envase funcionando como um **jogo de tabuleiro com peças (fichas)** que se movem de casa em casa conforme as ações do CLP acontecem:

* **Lugares ($P$ — Círculos):** São as "casas" do tabuleiro. Representam condições da planta (ex.: *"estação pronta"*, *"acumulador `AS1` pressurizado"*, *"garrafas acumuladas na esteira `RC1`"*).
* **Fichas (*Tokens* — Pontos dentro dos círculos):** Indicam quantas unidades daquela condição estão ativas no momento (ex.: $1$ ficha em $p_2$ significa que `AS1` está pressurizado; $3$ fichas em $p_4$ significam $3$ garrafas esperando na esteira `RC1`).
* **Transições ($T$ — Barras):** São as "jogadas" ou eventos do CLP (ex.: *abrir `VS1` e ligar `BC1`*, *abrir `VS2`*, *disparar trip do SIS*).

Antes de escrever uma única linha de lógica no CLP, as **Redes de Petri** permitem simular **todos os caminhos possíveis** do sistema para responder a três perguntas críticas de engenharia:
1. **A esteira vai transbordar?** (*Limitação / Boundedness*)
2. **A linha pode travar esperando algo que nunca chega?** (*Ausência de Deadlock*)
3. **É possível dosar bebida enquanto um alarme de emergência está ativo?** (*Segurança / Exclusão Mútua*)

---

## 2. Como Funciona a Matemática da Rede (Sem Complicação)

Formalmente, uma Rede de Petri marcada é definida por $N = (P, T, Pre, Post, M_0)$:

* **$M$ (Marcação):** É a "foto" instantânea do sistema — um vetor que diz quantas fichas existem em cada lugar naquele momento. $M_0$ é a foto inicial.
* **$Pre$ (Pré-condições):** Quantas fichas precisam existir nos lugares de entrada para que uma transição $t_j$ possa disparar.
* **$Post$ (Pós-condições):** Quantas fichas são criadas nos lugares de saída depois que $t_j$ dispara.

**Regra de Disparo:** Uma transição $t_j$ só pode acontecer se todos os seus lugares de entrada tiverem fichas suficientes ($M(p_i) \ge Pre(p_i, t_j)$). Quando ela dispara, o novo estado $M'$ é calculado pela **Equação de Estado**:

$$M' = M + C \cdot \vec{e}_j \quad \text{onde } C = Post - Pre \text{ (Matriz de Incidência)}$$

Na prática: **tira-se** as fichas consumidas ($Pre$) e **coloca-se** as fichas produzidas ($Post$).

---

## 3. Modelagem da Linha de Envase (Módulos de Suprimento, Envase e Esteira `RC1`)

Modelamos o ciclo integrado de pressurização do acumulador `AS1`, dosagem em `VS2`/`SQ2`, proteção do SIS (`R-03`, `R-04`, `R-05` e `e_stop`) e acúmulo de garrafas na esteira `RC1`:

### Lugares ($P$)

| Lugar | Significado na Linha de Envase | O que representam as fichas |
| :---: | :--- | :--- |
| **$p_1$** | Estação de Envase Ociosa / Pronta | $1$ ficha = `VS2` fechada, linha livre para iniciar novo ciclo. |
| **$p_2$** | Acumulador `AS1` Pressurizado | $1$ ficha = `VS1` aberta, `BC1` ligada e `SP2` $\in [3{,}0;\, 4{,}5]\text{ Barg}$. |
| **$p_3$** | Dosagem Volumétrica em Curso | $1$ ficha = `VS2` aberta enchendo garrafa com `SQ2` $\in [2{,}0;\, 8{,}0]\text{ L/min}$. |
| **$p_4$** | Pulmão de Garrafas na Esteira `RC1` | $k$ fichas = garrafas envasadas aguardando nível (`SL1`), tampagem (`AC1`) e vedação (`SFC1`). |
| **$p_5$** | Intertravamento SIS Ativo | $1$ ficha = parada de segurança (`SP2` $\ge 4{,}5$, `SP1` $\le 1{,}0$, `SQ2` $\le 2{,}0$ ou `e_stop`). |

### Transições ($T$)

| Transição | Evento / Comando do CLP | Consome ($Pre$) | Produz ($Post$) |
| :---: | :--- | :---: | :---: |
| **$t_1$** | **Pressurizar `AS1`** (Abrir `VS1`, ligar `BC1`) | $p_1$ ($1$) | $p_2$ ($1$) |
| **$t_2$** | **Iniciar Envase** (Abrir `VS2`) | $p_2$ ($1$) | $p_3$ ($1$) |
| **$t_3$** | **Concluir Envase e Liberar na `RC1`** (Fechar `VS2`) | $p_3$ ($1$) | $p_1$ ($1$), $p_4$ ($1$) |
| **$t_4$** | **Disparar Trip do SIS** (`POP-SST-08` / `POP-ESD-01`) | $p_3$ ($1$) | $p_5$ ($1$) |
| **$t_5$** | **Reset Manual após Alívio (`VALV_Alivio`)** | $p_5$ ($1$) | $p_1$ ($1$) |

---

## 4. Parte A: Árvore de Atingibilidade (Subsistema Limitado)

Primeiro, analisamos apenas o ciclo interno da estação de envase e segurança $\{p_1, p_2, p_3, p_5\}$ (sem contar ainda o acúmulo de garrafas em $p_4$).

* **Estado Inicial:** $M_0 = [1, 0, 0, 0]^T$ (Estação pronta).

### Passo a Passo da Expansão

1. De $M_0 = [1, 0, 0, 0]$: só **$t_1$** está habilitada $\to$ gera $M_1 = [0, 1, 0, 0]$ (`AS1` pressurizado).
2. De $M_1 = [0, 1, 0, 0]$: só **$t_2$** está habilitada $\to$ gera $M_2 = [0, 0, 1, 0]$ (`VS2` dosando).
3. De $M_2 = [0, 0, 1, 0]$ (**Bifurcação / Conflito**): duas coisas podem acontecer:
   * Operação normal (**$t_3$**): volta para $[1, 0, 0, 0] = M_0$. Como esse estado já existe na árvore, marcamos como **Duplicado** e