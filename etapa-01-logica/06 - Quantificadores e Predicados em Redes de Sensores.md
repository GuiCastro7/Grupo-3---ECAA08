# Aula 06: Lógica de Predicados e Quantificadores em Redes de Sensores

## 1. Fundamentos Matemáticos: Lógica de Primeira Ordem (FOL)

Enquanto a lógica proposicional trata sentenças atômicas discretas, a **Lógica de Predicados** permite parametrizar propriedades sobre domínios e conjuntos finitos de ativos industriais:

1. **Predicado $P(x)$:** Função booleana $P: U \rightarrow \{0, 1\}$ onde $U$ é o universo de discurso (conjunto de instrumentos da planta $\mathcal{S}$, subconjunto de transmissores de pressão $\mathcal{S}_P$ ou subconjunto de sensores de vazão $\mathcal{S}_Q$).
2. **Quantificador Universal ($\forall x \in U, \; P(x)$):**
   * "Para todo $x$ em $U$, $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
     $$\forall x P(x) \equiv P(x_1) \land P(x_2) \land \dots \land P(x_n)$$
3. **Quantificador Existencial ($\exists x \in U, \; P(x)$):**
   * "Existe ao menos um $x$ em $U$ tal que $P(x)$ é Verdadeiro".
   * Expansão em domínio finito:
     $$\exists x P(x) \equiv P(x_1) \lor P(x_2) \lor \dots \lor P(x_n)$$

---

## 2. Aplicação na Linha de Envase e Tampamento

Na instrumentação da linha de envase, os quantificadores são aplicados para diagnóstico contínuo e intertravamento em tempo real:

1. **Integridade da Comunicação da Rede ($\forall x \in \mathcal{S}, \; \neg \text{FalhaCom}(x)$):**  
   O sistema só autoriza operação automática se **todos** os instrumentos da planta ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) estiverem com link de comunicação ativo com o CLP/SCADA.
2. **Detecção de Sobrepressão na Linha ($\exists x \in \mathcal{S}_P, \; \text{Sobrepressao}(x)$):**  
   Se **existe pelo menos um** sensor de pressão com leitura acima do limite superior ($p > 3,5\text{ barg}$ no $SP1$ ou $p > 4,5\text{ barg}$ no $SP2$), o trip de emergência é disparado.
3. **Detecção de Subpressão Crítica na Sucção ($\exists x \in \mathcal{S}_{P1}, \; \text{Subpressao}(x)$):**  
   Se a pressão na sucção da bomba $BC1$ cair abaixo do limite operacional ($p < 1,0\text{ barg}$ no $SP1$), o motor é desligado para evitar cavitação.
4. **Validação de Vazão nas Faixas Operacionais ($\forall x \in \mathcal{S}_Q, \; \text{VazaoNominal}(x)$):**  
   Verifica se **todos** os medidores de vazão estão dentro das suas respectivas faixas de trabalho ($5,0 \le SQ1 \le 45,0\text{ L/min}$ e $2,0 \le SQ2 \le 8,0\text{ L/min}$).
5. **Conformidade nas Estações de Inspeção ($\forall x \in \mathcal{S}_{qualidade}, \; \text{Aprovado}(x)$):**  
   Avalia se os sensores de controle de processo na garrafa ($SL1$ para nível $\ge 95\%$ e $SFC1$ para selagem física) confirmam a peça conforme.

---

## 3. Entregável da Aula 06

* **Motor de Varredura de Predicados em Redes de Sensores:** Módulo em Python que implementa operadores `FORALL` e `EXISTS` sobre a malha de instrumentos da linha de envase ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) com injeção dinâmica de falhas operacionais e de comunicação.


# Aula 06: Lógica de Predicados e Quantificadores em Redes de Sensores

## 1. Fundamentos Matemáticos: Lógica de Primeira Ordem (FOL)

Enquanto a lógica proposicional trata sentenças atômicas discretas, a **Lógica de Predicados** permite parametrizar propriedades sobre domínios e conjuntos finitos de ativos industriais:

1. **Predicado $P(x)$:** Função booleana $P: U \to \{0, 1\}$, onde $U$ é o universo de discurso (conjunto de instrumentos da planta $\mathcal{S}$, subconjunto de transmissores de pressão $\mathcal{S}_P$ ou subconjunto de medidores de vazão $\mathcal{S}_Q$).

2. **Quantificador Universal ($\forall x \in U, P(x)$):**
   * "Para todo $x$ em $U$, $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\forall x P(x) \equiv P(x_1) \land P(x_2) \land \dots \land P(x_n)$$

3. **Quantificador Existencial ($\exists x \in U, P(x)$):**
   * "Existe ao menos um $x$ em $U$ tal que $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\exists x P(x) \equiv P(x_1) \lor P(x_2) \lor \dots \lor P(x_n)$$

---

## 2. Aplicação na Linha de Envase e Tampamento

Na instrumentação da linha de envase, os quantificadores são aplicados para diagnóstico contínuo e intertravamento em tempo real:

1. **Integridade da Comunicação da Rede ($\forall x \in \mathcal{S}, \neg \text{FalhaCom}(x)$):**  
   O sistema só autoriza operação automática se **todos** os instrumentos da planta ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) estiverem com link de comunicação ativo com o CLP/SCADA.

2. **Detecção de Sobrepressão na Linha ($\exists x \in \mathcal{S}_P, \text{Sobrepressao}(x)$):**  
   Se **existe pelo menos um** sensor de pressão com leitura acima do limite superior ($p > 3,5\text{ barg}$ no $SP1$ ou $p > 4,5\text{ barg}$ no $SP2$), o trip de emergência é disparado.

3. **Detecção de Subpressão Crítica na Sucção ($\exists x \in \mathcal{S}_{P1}, \text{Subpressao}(x)$):**  
   Se a pressão na sucção da bomba $BC1$ cair abaixo do limite operacional ($p < 1,0\text{ barg}$ no $SP1$), o motor é desligado para evitar cavitação.

4. **Validação de Vazão nas Faixas Operacionais ($\forall x \in \mathcal{S}_Q, \text{VazaoNominal}(x)$):**  
   Verifica se **todos** os medidores de vazão estão dentro das suas respectivas faixas de trabalho ($5,0 \le SQ1 \le 45,0\text{ L/min}$ e $2,0 \le SQ2 \le 8,0\text{ L/min}$).

5. **Conformidade nas Estações de Inspeção ($\forall x \in \mathcal{S}_{\text{qualidade}}, \text{Aprovado}(x)$):**  
   Avalia se os sensores de controle de processo na garrafa ($SL1$ para nível $\ge 95\%$ e $SFC1$ para selagem física) confirmam a peça conforme.

---

## 3. Entregável da Aula 06

* **Motor de Varredura de Predicados em Redes de Sensores:** Módulo em Python que implementa operadores `FORALL` e `EXISTS` sobre a malha de instrumentos da linha de envase ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) com injeção dinâmica de falhas operacionais e de comunicação.

# Aula 06: Lógica de Predicados e Quantificadores em Redes de Sensores

## 1. Fundamentos Matemáticos: Lógica de Primeira Ordem (FOL)

Enquanto a lógica proposicional trata sentenças atômicas discretas, a **Lógica de Predicados** permite parametrizar propriedades sobre domínios e conjuntos finitos de ativos industriais:

1. **Predicado $P(x)$:** Função booleana $P: U \to \{0, 1\}$, onde $U$ é o universo de discurso (conjunto de instrumentos da planta $\mathcal{S}$, subconjunto de transmissores de pressão $\mathcal{S}_P$ ou subconjunto de medidores de vazão $\mathcal{S}_Q$).

2. **Quantificador Universal ($\forall x \in U, P(x)$):**
   * "Para todo $x$ em $U$, $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\forall x P(x) \equiv P(x_1) \land P(x_2) \land \dots \land P(x_n)$$

3. **Quantificador Existencial ($\exists x \in U, P(x)$):**
   * "Existe ao menos um $x$ em $U$ tal que $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\exists x P(x) \equiv P(x_1) \lor P(x_2) \lor \dots \lor P(x_n)$$

---

## 2. Aplicação na Linha de Envase e Tampamento

Na instrumentação da linha de envase, os quantificadores são aplicados para diagnóstico contínuo e intertravamento em tempo real:

1. **Integridade da Comunicação da Rede ($\forall x \in \mathcal{S}, \neg \text{FalhaCom}(x)$):**  
   O sistema só autoriza operação automática se **todos** os instrumentos da planta ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) estiverem com link de comunicação ativo com o CLP/SCADA.

2. **Detecção de Sobrepressão na Linha ($\exists x \in \mathcal{S}_P, \text{Sobrepressao}(x)$):**  
   Se **existe pelo menos um** sensor de pressão com leitura acima do limite superior ($p > 3,5\text{ barg}$ no $SP1$ ou $p > 4,5\text{ barg}$ no $SP2$), o trip de emergência é disparado.

3. **Detecção de Subpressão Crítica na Sucção ($\exists x \in \mathcal{S}_{P1}, \text{Subpressao}(x)$):**  
   Se a pressão na sucção da bomba $BC1$ cair abaixo do limite operacional ($p < 1,0\text{ barg}$ no $SP1$), o motor é desligado para evitar cavitação.

4. **Validação de Vazão nas Faixas Operacionais ($\forall x \in \mathcal{S}_Q, \text{VazaoNominal}(x)$):**  
   Verifica se **todos** os medidores de vazão estão dentro das suas respectivas faixas de trabalho ($5,0 \le SQ1 \le 45,0\text{ L/min}$ e $2,0 \le SQ2 \le 8,0\text{ L/min}$).

5. **Conformidade nas Estações de Inspeção ($\forall x \in \mathcal{S}_{\text{qualidade}}, \text{Aprovado}(x)$):**  
   Avalia se os sensores de controle de processo na garrafa ($SL1$ para nível $\ge 95\%$ e $SFC1$ para selagem física) confirmam a peça conforme.

---

## 3. Entregável da Aula 06

* **Motor de Varredura de Predicados em Redes de Sensores:** Módulo em Python que implementa operadores `FORALL` e `EXISTS` sobre a malha de instrumentos da linha de envase ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) com injeção dinâmica de falhas operacionais e de comunicação.

# Aula 06: Lógica de Predicados e Quantificadores em Redes de Sensores

## 1. Fundamentos Matemáticos: Lógica de Primeira Ordem (FOL)

Enquanto a lógica proposicional trata sentenças atômicas discretas, a **Lógica de Predicados** permite parametrizar propriedades sobre domínios e conjuntos finitos de ativos industriais:

1. **Predicado $P(x)$:** Função booleana $P: U \to \{0, 1\}$, onde $U$ é o universo de discurso (conjunto de instrumentos da planta $\mathcal{S}$, subconjunto de transmissores de pressão $\mathcal{S}_P$ ou subconjunto de medidores de vazão $\mathcal{S}_Q$).

2. **Quantificador Universal ($\forall x \in U, P(x)$):**
   * "Para todo $x$ em $U$, $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\forall x P(x) \equiv P(x_1) \land P(x_2) \land \dots \land P(x_n)$$

3. **Quantificador Existencial ($\exists x \in U, P(x)$):**
   * "Existe ao menos um $x$ em $U$ tal que $P(x)$ é Verdadeiro".
   * Expansão em domínio finito $U = \{x_1, x_2, \dots, x_n\}$:
   $$\exists x P(x) \equiv P(x_1) \lor P(x_2) \lor \dots \lor P(x_n)$$

---

## 2. Aplicação na Linha de Envase e Tampamento

Na instrumentação da linha de envase, os quantificadores são aplicados para diagnóstico contínuo e intertravamento em tempo real:

1. **Integridade da Comunicação da Rede ($\forall x \in \mathcal{S}, \neg \text{FalhaCom}(x)$):**  
   O sistema só autoriza operação automática se **todos** os instrumentos da planta ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) estiverem com link de comunicação ativo com o CLP/SCADA.

2. **Detecção de Sobrepressão na Linha ($\exists x \in \mathcal{S}_P, \text{Sobrepressao}(x)$):**  
   Se **existe pelo menos um** sensor de pressão com leitura acima do limite superior ($p > 3,5\text{ barg}$ no $SP1$ ou $p > 4,5\text{ barg}$ no $SP2$), o trip de emergência é disparado.

3. **Detecção de Subpressão Crítica na Sucção ($\exists x \in \mathcal{S}_{P1}, \text{Subpressao}(x)$):**  
   Se a pressão na sucção da bomba $BC1$ cair abaixo do limite operacional ($p < 1,0\text{ barg}$ no $SP1$), o motor é desligado para evitar cavitação.

4. **Validação de Vazão nas Faixas Operacionais ($\forall x \in \mathcal{S}_Q, \text{VazaoNominal}(x)$):**  
   Verifica se **todos** os medidores de vazão estão dentro das suas respectivas faixas de trabalho ($5,0 \le SQ1 \le 45,0\text{ L/min}$ e $2,0 \le SQ2 \le 8,0\text{ L/min}$).

5. **Conformidade nas Estações de Inspeção ($\forall x \in \mathcal{S}_{\text{qualidade}}, \text{Aprovado}(x)$):**  
   Avalia se os sensores de controle de processo na garrafa ($SL1$ para nível $\ge 95\%$ e $SFC1$ para selagem física) confirmam a peça conforme.

---

## 3. Entregável da Aula 06

* **Motor de Varredura de Predicados em Redes de Sensores:** Módulo em Python que implementa operadores `FORALL` e `EXISTS` sobre a malha de instrumentos da linha de envase ($SP1, SQ1, SP2, SQ2, SL1, SFC1$) com injeção dinâmica de falhas operacionais e de comunicação.