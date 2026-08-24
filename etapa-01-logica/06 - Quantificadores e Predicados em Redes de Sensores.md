# Aula 06: Lógica de Predicados e Quantificadores em Redes de Sensores

## 1. Fundamentos Matemáticos: Lógica de Primeira Ordem (FOL)

Enquanto a lógica proposicional trata sentenças atômicas indivisíveis, a **Lógica de Predicados** permite parametrizar propriedades sobre domínios e conjuntos finitos de ativos industriais:

1. **Predicado $P(x)$:** Função booleana $P: U \rightarrow \{0, 1\}$ onde $U$ é o universo de discurso (ex: conjunto de sensores de pressão $\mathcal{S}_P$, conjunto de medidores de vazão $\mathcal{S}_Q$, conjunto de estações da esteira $\mathcal{E}$).
2. **Quantificador Universal ($\forall x \in U, \; P(x)$):**
   - "Para todo $x$ em $U$, $P(x)$ é Verdadeiro".
   - Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
     $$\forall x P(x) \equiv P(x_1) \land P(x_2) \land \dots \land P(x_n)$$
3. **Quantificador Existencial ($\exists x \in U, \; P(x)$):**
   - "Existe ao menos um $x$ em $U$ tal que $P(x)$ é Verdadeiro".
   - Expansão em domínio finito:
     $$\exists x P(x) \equiv P(x_1) \lor P(x_2) \lor \dots \lor P(x_n)$$
     //variaveis

---

## 2. Aplicação na Linha de Envase e Tampamento

Na linha de envase, os quantificadores são aplicados para verificação em tempo real da malha de instrumentação:

1. **Integridade da Comunicação ($\forall x \in \mathcal{S}, \; \neg \text{FalhaCom}(x)$):**  
   O sistema só opera se **todos** os sensores estiverem comunicando sem falhas com o CLP/SCADA.
2. **Detecção de Alarme Crítico de Pressão ($\exists x \in \mathcal{S}_P, \; \text{Sobrepressao}(x)$):**  
   Se **existe pelo menos um** transmissor de pressão acima do limite operacional seguro ($p > 3,5\text{ barg}$ no $SP1$ ou $p > 4,5\text{ barg}$ no $SP2$), o trip de segurança é acionado.
3. **Detecção de Subpressão na Sucção ($\exists x \in \mathcal{S}_{P,suc}, \; \text{Subpressao}(x)$):**  
   Se a pressão na entrada da bomba estiver abaixo de $1,0\text{ barg}$, bloqueia-se o acionamento para evitar cavitação.
4. **Inspeção de Qualidade no Envasamento ($\forall x \in \mathcal{G}, \; \text{NivelConforme}(x)$):**  
   Verifica se todas as garrafas posicionadas nas estações de inspeção atingiram o nível nominal exigido ($\ge 95\%$).

---

## 3. Entregável da Aula 06

* **Motor de Varredura de Predicados em Redes de Sensores:** Módulo em Python que implementa operadores `FORALL` e `EXISTS` sobre a malha de instrumentos da linha de envase (SP1, SQ1, SP2, SQ2, SL1, SFC1) com injeção dinâmica de falhas operacionais e de comunicação.
