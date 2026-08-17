## Tabela de Mapeamento: Variáveis de Processo para Proposições Lógicas

### Tabela de proposições
**A proposição lógica só é verdadeira, quando a condição lógica for verdadeira!**

| **Tag - Instrumento** | **Proposição Lógica** |                                Condição Lógica                                 |
| :-------------------: | :-------------------: | :----------------------------------------------------------------------------: |
|        **SP1**        |      $p_{máx1}$       |                           Pressão maior que 3,5 Barg                           |
|        **SP1**        |      $p_{mín1}$       |                           Pressão menor que 1,0 Barg                           |
|        **SP2**        |      $p_{máx2}$       |                           Pressão maior que 4,5 Barg                           |
|        **SP2**        |      $p_{mín2}$       |                            Pressão menor que 3 Barg                            |
|        **SQ1**        |      $q_{máx1}$       |                           Vazão maior que 45,0 L/min                           |
|        **SQ1**        |      $q_{mín1}$       |                           Vazão menor que 5,0 L/min                            |
|        **SQ2**        |      $q_{máx2}$       |                           Vazão maior que 8,0 L/min                            |
|        **SQ2**        |      $q_{mín2}$       |                           Vazão menor que 2,0 L/min                            |
|        **SL1**        |       $l_{mín}$       |                   Nível de líquido na garrafa maior que 95%                    |
|        **RC1**        |       $v_{máx}$       |                    Velocidade da esteira maior que 0,4 m/s                     |
|        **RC1**        |       $v_{mín}$       |                    Velocidade da esteira menor que 0,1 m/s                     |
|        **BC1**        |      $y_{bomba}$      |           Bomba centrípeta ligada/funcionando (estado lógico = TRUE)           |
|        **VS1**        |      $y_{válv1}$      |             Válvula solenoide 1 aberta (permite fluxo de líquido)              |
|        **VS2**        |      $y_{válv2}$      |             Válvula solenoide 2 aberta (permite fluxo de líquido)              |
|        **VS3**        |      $y_{válv3}$      |             Válvula solenoide 3 aberta (permite fluxo de líquido)              |
|        **VS4**        |      $y_{válv4}$      |             Válvula solenoide 4 aberta (permite fluxo de líquido)              |
|        **VS5**        |      $y_{válv5}$      |             Válvula solenoide 5 aberta (permite fluxo de líquido)              |
|        **AC1**        |      $y_{capp}$       |                Atuador de capping ligado (tampando as garrafas)                |
|       **SFC1**        |       $x_{fc}$        | Sensor fim de curso ao detectar se uma garrafa realmente foi selada e tampada! |

<img width="1600" height="1240" alt="image" src="https://github.com/user-attachments/assets/334cf68c-0975-4158-8a47-c0ad7f6d98a8" />

### Tabela: Sigla/Componente

| Tag      | Descrição do Componente    |
| -------- | -------------------------- |
| **SP1**  | Sensor de Pressão 1        |
| **SQ1**  | Sensor de Vazão 1          |
| **SP2**  | Sensor de Pressão 2        |
| **SQ2**  | Sensor de Vazão 2          |
| **SL1**  | Sensor de Nível 1          |
| **SFC1** | Sensor Fim de Curso 1      |
| **RC1**  | Motor da Esteira           |
| **VS1**  | Válvula Solenoide 1        |
| **BC1**  | Bomba Centrípeta 1         |
| **VS2**  | Válvula Solenoide 2        |
| **VS3**  | Válvula Solenoide 3        |
| **VS4**  | Válvula Solenoide 4        |
| **AC1**  | Atuador de Capping         |
| **VS5**  | Válvula Solenoide 5        |
| **TS1**  | Tanque de Suprimento 1     |
| **AS1**  | Acumulador de Suprimento 1 |
