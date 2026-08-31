# SCADA-Core - Engarrafamento e Inspeção de Bebidas.
**Grupo 3 da disciplina de Automática (ECAA08)**   
Integrantes:  
Guilherme Narciso Castro Silva;  
Rafael Ribeiro Guedes;  
Matheus Felipe de Oliveira Agostinho;  
Nickolas Nicoleto Musico;

### Site do Projeto

## Descrição do Processo

### Logística de Transporte

O transporte das unidades (garrafas) ao longo de todas as etapas é realizado pela Esteira Transportadora (RC1). Este ativo é controlado de forma intermitente pelo motor do sistema, garantindo o posicionamento preciso das garrafas sob os módulos de enchimento, tampagem e inspeção.

### Sistema de Suprimento e Envasamento de Precisão

Este módulo gerencia a extração do fluido do Reservatório Principal (TS1) e sua distribuição controlada.

Os sensores de pressão (SP1) e vazão (SQ1) monitoram as condições do fluido na saída do reservatório, permitindo verificar a disponibilidade e as condições adequadas para o bombeamento.

A Bomba Centrífuga (BC1) realiza o transporte do fluido até o sistema de envase. O fluxo para a bomba é condicionado pela Válvula Solenoide de Sucção (VS1), que controla a passagem do fluido conforme as condições do processo.

Após o bombeamento, o fluido é direcionado para o Acumulador de Suprimento (AS1), que atua como um pulmão hidráulico, contribuindo para estabilizar a pressão e o fornecimento durante o processo de envase.

O enchimento das garrafas é realizado pela Válvula de Enchimento (VS2). A abertura da válvula é controlada pelo sistema de automação, utilizando o Sensor de Vazão (SQ2) como feedback para monitorar a quantidade de fluido fornecida e garantir maior uniformidade entre as garrafas.

### Módulo de Inspeção de Nível

Após o envase, o sistema realiza a verificação do nível de preenchimento das garrafas. A Válvula Solenoide (VS3) controla o acionamento do mecanismo responsável por posicionar o Sensor de Nível (SL1) na região de inspeção.

O sensor verifica se o líquido atingiu o nível esperado, permitindo identificar garrafas que não foram preenchidas adequadamente. O resultado da inspeção é utilizado pelo sistema de controle para determinar se a unidade está aprovada ou deve ser rejeitada.

### Sistema de Tampagem

Após a aprovação do nível de enchimento, a garrafa segue para a etapa de tampagem. A Válvula Solenoide (VS4) controla o acionamento do Atuador de Capping (AC1), responsável por realizar a aplicação da tampa na garrafa.

O acionamento do atuador é realizado conforme a sequência definida pelo sistema de automação, garantindo que a tampa seja posicionada e fixada corretamente antes que a garrafa avance para a próxima etapa.

### Inspeção de Integridade da Vedação

Na etapa final, o sistema verifica a presença da tampa na garrafa. A Válvula Solenoide (VS5) controla o mecanismo responsável por posicionar o Sensor de Fim de Curso (SFC1) para realizar a inspeção.

A detecção é baseada na presença ou ausência de uma barreira física. Caso o sensor detecte a presença da tampa, a garrafa é considerada aprovada. Caso o sensor complete o curso sem detectar a tampa, o sistema registra uma falha e classifica a garrafa como reprovada.

## Diagrama do Processo
<img width="1600" height="1240" alt="image" src="https://github.com/user-attachments/assets/2660427f-9ae6-4b10-84b9-61a965b0749f" />
