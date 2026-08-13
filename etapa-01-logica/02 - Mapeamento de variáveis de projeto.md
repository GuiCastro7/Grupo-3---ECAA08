## Tabela de Mapeamento: Variáveis de Processo para Proposições Lógicas

| Tag      | Descrição do Componente | Proposição Lógica (Estado Verdadeiro)                       | Tipo         |
| -------- | ----------------------- | ----------------------------------------------------------- | ------------ |
| **SP1**  | Sensor de Pressão 1     | A pressão de saída do reservatório TS1 está normal.         | Entrada (DI) |
| **SQ1**  | Sensor de Vazão 1       | Há fluxo de líquido saindo do reservatório TS1.             | Entrada (DI) |
| **SP2**  | Sensor de Pressão 2     | A pressão no acumulador AS1 é suficiente para o enchimento. | Entrada (DI) |
| **SQ2**  | Sensor de Vazão 2       | Há fluxo de líquido direcionado para a garrafa.             | Entrada (DI) |
| **SL1**  | Sensor de Nível 1       | A garrafa atingiu o nível máximo de preenchimento.          | Entrada (DI) |
| **SFC1** | Sensor Fim de Curso 1   | A presença da tampa foi detectada (Inspeção OK).            | Entrada (DI) |
| **RC1**  | Motor da Esteira        | O motor de transporte das garrafas está ligado.             | Saída (DO)   |
| **VS1**  | Válvula Solenoide 1     | A válvula de alimentação da bomba BC1 está aberta.          | Saída (DO)   |
| **BC1**  | Bomba Centrípeta 1      | A bomba de recalque de fluido está em operação.             | Saída (DO)   |
| **VS2**  | Válvula Solenoide 2     | A válvula de enchimento de garrafas está aberta.            | Saída (DO)   |
| **VS3**  | Válvula Solenoide 3     | O sensor de nível SL1 está inserido na garrafa.             | Saída (DO)   |
| **VS4**  | Válvula Solenoide 4     | A ferramenta de tampar (Capping) está posicionada.          | Saída (DO)   |
| **AC1**  | Atuador de Capping      | O cabeçote está rosqueando/pressionando a tampa.            | Saída (DO)   |
| **VS5**  | Válvula Solenoide 5     | O sensor SFC1 está posicionado para inspeção.               | Saída (DO)   |

___
<img width="1600" height="1240" alt="image" src="https://github.com/user-attachments/assets/334cf68c-0975-4158-8a47-c0ad7f6d98a8" />
