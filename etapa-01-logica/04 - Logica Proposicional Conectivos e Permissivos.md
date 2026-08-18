# Aula 04: Lógica Proposicional — Conectivos e Blocos de Permissivos

## 1. Fundamentos Matemáticos: Conectivos Lógicos

Na matemática discreta, uma proposição é uma sentença declarativa que assume um e apenas um valor-verdade: Verdadeiro ($1$) ou Falso ($0$).

Na automação de processos, esses valores correspondem diretamente a níveis lógicos em Controladores Lógicos Programáveis (CLP), contatos normalmente abertos/fechados (NA/NF) e estados de
variáveis digitais.
As operações sobre variáveis proposicionais são definidas por operadores lógicos fundamentais:
1. **Negação ($\neg A$ ou $\bar{A}$): Inverte o valor-verdade da proposição. Em circuitos de
controle, modela contatos normalmente fechados (NF), estados de alarme e falhas ativas em nível lógico zero (fail-safe).Conjunção ($A \land B$): Verdadeira se e somente se ambos os 
operandos forem verdadeiros. Em automação, modela circuitos e condições em série (cadeias de permissivos de segurança e intertravamentos de partida).Disjunção ($A \lor B$): Verdadeira se ao 
menos um dos operandos for verdadeiro. Em automação, modela circuitos em paralelo, caminhos redundantes de segurança ou múltiplas condições de desligamento de emergência (Trips).Disjunção 
Exclusiva ($A \oplus B$): Verdadeira se exatamente um dos operandos for verdadeiro ($\neg(A \leftrightarrow B)$). Utilizada obrigatoriamente na validação de seletores de modo operacional 
($\text{Auto} \oplus \text{Manual}$).Implicação / Condicional ($A \rightarrow B$): $\neg A \lor B$. Modela regras operacionais do tipo "SE condição $A$ for atendida, ENTÃO a ação $B$ é
autorizada".Bicondicional ($A \leftrightarrow B$): $(A \rightarrow B) \land (B \rightarrow A)$. Modela equivalência e sincronismo estrito entre comandos de atuadores e confirmações de 
sensores de fim de curso.

---

## 2. Aplicação em Engenharia: Permissivos e Intertravamentos do Sistema de Envasamento e EmbalagemEm sistemas automatizados de controle e supervisão (CLP), um 
permissivo de partida (Start Permissive) é uma condição booleana que deve ser estritamente satisfeita para que uma ação de comando (energização de bomba, acionamento de esteira ou disparo
de atuadores pneumáticos) seja executada.A planta é composta pelos seguintes ativos e instrumentos principais:Logística: Esteira Transportadora ($\text{RC1}$).Suprimento e Envase: 
Reservatório Principal ($\text{TS1}$), Sensores de Pressão ($\text{SP1}$) e Vazão ($\text{SQ1}$), Válvula de Sucção ($\text{VS1}$), Bomba Centrífuga ($\text{BC1}$), Acumulador de
Suprimento ($\text{AS1}$), Sensores pós-acumulador ($\text{SP2}$, $\text{SQ2}$) e Válvula de Enchimento ($\text{VS2}$).Inspeção de Nível: Válvula Solenoide ($\text{VS3}$) e Sensor de 
Nível ($\text{SL1}$).Tampagem: Válvula Solenoide ($\text{VS4}$) e Atuador de Capping ($\text{AC1}$).Inspeção de Vedação: Válvula Solenoide ($\text{VS5}$) e Sensor de Fim de Curso ($\text
{SFC1}$).2.1. Permissivo da Bomba Centrífuga de Alimentação ($P_{\text{BC1}}$)A bomba centrífuga $\text{BC1}$ é responsável por transferir o fluido do reservatório principal $\text{TS1}$
para o acumulador hidráulico $\text{AS1}$. Seu comando de partida ($cmd_{\text{BC1}}$) requer o atendimento conjunto das seguintes condições:Pressão na saída de $\text{TS1}$ dentro da 
faixa operacional: $sp_{1\_ok}$Vazão/disponibilidade de fluido na linha de sucção confirmada: $sq_{1\_ok}$Válvula solenoide de sucção totalmente aberta e confirmada: $ls_{\text
{VS1\_open}}$Sem alarme de sobrepressão no acumulador $\text{AS1}$: $\neg p_{\text{AS1\_high}}$Botão de parada de emergência inativo: $\neg e_{\text{stop}}$Seleção exclusiva de modo
operacional: $\text{Auto} \oplus \text{Manual}$$$P_{\text{BC1}} \equiv sp_{1\_ok} \land sq_{1\_ok} \land ls_{\text{VS1\_open}} \land \neg p_{\text{AS1\_high}} \land \neg e_{\text{stop}} 
\land (\text{Auto} \oplus \text{Manual})$$

graph LR
    L1["sp1_ok (Pressão TS1 OK)"] --> AND["Bloco AND (Conjunção)"]
    L2["sq1_ok (Vazão Sucção OK)"] --> AND
    L3["ls_VS1_open (Válvula VS1 Aberta)"] --> AND
    L4["¬ p_AS1_high (Sem Sobrepressão em AS1)"] --> AND
    L5["¬ e_stop (Emergência Inativa)"] --> AND
    L6["Auto XOR Manual (Modo Válido)"] --> AND
    AND --> Permissivo["Permissivo Bomba BC1 (True/False)"]


