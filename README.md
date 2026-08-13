# SCADA-Core - Engarrafamento e Inspeção de Bebidas.
**Grupo 3 da disciplina de Automática (ECAA08)**   
Integrantes:  
Guilherme Narciso Castro Silva;  
Rafael Ribeiro Guedes;  
Matheus Felipe de Oliveira Agostinho;  
Nickolas Nicoleto Musico;

## Descrição do Processo

### Sistema de Suprimento e Envasamento de Precisão

Este módulo gerencia a extração do fluido do Reservatório Principal (TS1) e sua distribuição controlada.

Os sensores de pressão (SP1) e vazão (SQ1) monitoram as condições do fluido na saída do reservatório, permitindo verificar a disponibilidade e as condições adequadas para o bombeamento.

A Bomba Centrífuga (BC1) realiza o transporte do fluido até o sistema de envase. O fluxo para a bomba é condicionado pela Válvula Solenoide de Sucção (VS1), que controla a passagem do fluido conforme as condições do processo.

Após o bombeamento, o fluido é direcionado para o Acumulador de Suprimento (AS1), que atua como um pulmão hidráulico, contribuindo para estabilizar a pressão e o fornecimento durante o processo de envase.

O enchimento das garrafas é realizado pela Válvula de Enchimento (VS2). A abertura da válvula é controlada pelo sistema de automação, utilizando o Sensor de Vazão (SQ2) como feedback para monitorar a quantidade de fluido fornecida e garantir maior uniformidade entre as garrafas.

### Módulo de Inspeção de Nível

### Sistema de Tampagem

### Inspeção de Integridade da Vedação

## Diagrama do Processo
<img width="1600" height="1240" alt="image" src="https://github.com/user-attachments/assets/2660427f-9ae6-4b10-84b9-61a965b0749f" />
