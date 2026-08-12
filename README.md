# SCADA-Core - Engarrafamento e Inspeção de Bebidas.
**Grupo 3 da disciplina de Automática (ECAA08)**   
Integrantes:  
Guilherme Narciso Castro Silva;  
Rafael Ribeiro Guedes;  
Matheus Felipe de Oliveira Agostinho;  
Nickolas Nicoleto Musico;

## Descrição do Processo
### título de vocês
### Envase das Garrafa

O sistema proposto tem como objetivo realizar o envase automatizado de garrafas, integrando elementos de processo, instrumentação, controle e supervisão. A bebida armazenada no tanque de suprimento é direcionada ao sistema de envase por meio de uma válvula de controle, cujo acionamento é realizado pelo CLP de acordo com a lógica de operação definida para o processo.
Após a primeira válvula, o fluido é conduzido por uma bomba centrífuga, responsável por promover o escoamento e fornecer as condições necessárias de vazão e pressão para o transporte da bebida. Na sequência, o produto passa por um acumulador, utilizado para contribuir com a estabilidade hidráulica do sistema e reduzir possíveis oscilações de pressão e vazão durante a operação.

Posteriormente, o fluido é direcionado para uma segunda válvula, também acionada pelo CLP, responsável por controlar a liberação da bebida para as garrafas posicionadas sobre a esteira transportadora. Dessa forma, o sistema de automação será responsável por coordenar o acionamento das válvulas e da esteira, estabelecendo uma sequência de operação adequada para que o processo de envase ocorra de forma controlada, segura e repetível.
A automação do processo será realizada por meio de um Controlador Lógico Programável (CLP), responsável pelo processamento dos sinais de entrada e pelo acionamento dos dispositivos de campo. A lógica de controle deverá considerar as condições de operação do sistema, como a presença e o posicionamento das garrafas, permitindo sincronizar o transporte pela esteira com a etapa de envase.
Além do controle sequencial, serão utilizados instrumentos para o monitoramento das principais variáveis do processo, incluindo nível, pressão e vazão. Os sinais provenientes dos sensores serão disponibilizados ao sistema de supervisão SCADA, permitindo o acompanhamento das condições de operação em tempo real, a visualização das variáveis de processo e a identificação de possíveis anormalidades.

Assim, o projeto integra o processo físico de envase ao sistema de controle e supervisão, utilizando o CLP como elemento central da automação e o SCADA como interface de monitoramento do processo.



## Diagrama do Processo
<img width="1600" height="1403" alt="image" src="https://github.com/user-attachments/assets/bdcb7233-5dc2-4afa-9070-5f4fa51626d4" />