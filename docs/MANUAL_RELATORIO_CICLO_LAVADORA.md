# Manual: relatório do ciclo da lavadora

Vale para o SGO+ a partir de 31/10/2026. Tela "Relatórios de ciclo" (menu Cadastros) e cartão "Relatório do ciclo" da página aberta pelo QR code da lavadora. Serve para a equipe da Metrolabs e para o cliente com o login dele, no computador e no celular.

## 1. Para que serve

A lavadora grava, a cada ciclo, um arquivo com o nome do lote e final .sgolav (por exemplo, LOT-20261030-6222.sgolav). O SGO+ lê esse arquivo e gera um relatório A4 de uma única folha, que fica salvo no histórico da lavadora. A folha traz:

- a fita impressa pela lavadora, reproduzida a partir do arquivo;
- o gráfico da temperatura ao longo do ciclo;
- os indicadores do ciclo;
- a conclusão do ciclo;
- o campo de aprovação com a assinatura do responsável pelo local, feita na tela, com nome, cargo, data e hora.

Ciclo cancelado ou reprovado também gera relatório, com a falha em destaque.

## 2. Antes de começar

- A lavadora precisa estar cadastrada no SGO+ e ligada ao cliente. Os dados do cliente (razão social, CNPJ, unidade e setor) e da lavadora (descrição, fabricante, modelo, número de série, patrimônio ou TAG) saem do cadastro, nunca do arquivo.
- Copie o arquivo do ciclo da lavadora pelo Wi-Fi da máquina ou pelo cartão. Use o arquivo com final .sgolav. Os arquivos .csv e .txt do mesmo lote não servem.
- Não abra nem edite o arquivo antes de importar. Arquivo alterado é recusado.

## 3. Gerar o relatório pelo QR code da lavadora

1. Leia o QR code da etiqueta da lavadora com a câmera do celular.
2. Entre com o seu e-mail e a sua senha, se o sistema pedir.
3. No cartão "Relatório do ciclo", toque em "Gerar relatório do ciclo".
4. Toque em "Escolher o arquivo do ciclo" e escolha o arquivo .sgolav.
5. Confira o lote, a data, o horário, a receita e o resultado. O arquivo não traz o número de série da máquina: a ligação com a lavadora vem do QR code.
6. Se estiver certo, toque em "Confirmar e gerar o relatório". Se não for o ciclo desta lavadora, toque em "Escolher outro arquivo".
7. Pronto: o relatório fica salvo. Toque em "Assinar agora", "Abrir o relatório" ou "Baixar PDF".

## 4. Gerar o relatório pela tela

1. No menu, toque em "Relatórios de ciclo" (no celular, no Início).
2. Abra a aba "Equipamentos". Aparecem só as lavadoras a que você tem acesso; o cliente vê só as da empresa dele.
3. Na lavadora certa, toque em "Gerar relatório do ciclo".
4. Siga os passos 4 a 7 do item 3.

## 5. Assinar na tela

1. Logo depois de gerar, toque em "Assinar agora". Para assinar depois, abra "Relatórios gerados" e toque em "Assinar" no relatório.
2. Toque em "Abrir o relatório para conferir" e leia a folha.
3. Assine no quadro com o dedo (celular) ou com o mouse (computador). Se errar, toque em "Limpar a assinatura".
4. Escreva o nome e o cargo de quem assina (o responsável pelo local, por exemplo a enfermeira da CME).
5. Marque "Conferi os dados do relatório".
6. Toque em "Assinar".

O documento assinado traz a imagem da assinatura, o nome, o cargo, a data e a hora, o usuário que estava no sistema e o resumo SHA-256 do documento conferido. Depois de assinado, o documento fica travado: uma correção só pela Metrolabs, em nova versão, e a versão anterior continua guardada.

## 6. Encontrar, abrir e baixar

1. Abra a aba "Relatórios gerados".
2. Para achar um ciclo, escreva o lote em "Buscar" ou escolha o período em "De" e "Até".
3. Use "Resultado" para ver só os aprovados ou só os cancelados, e "Assinatura" para ver os que faltam assinar.
4. Toque em "Abrir o relatório" para ver a folha A4, ou em "Baixar PDF".
5. "Versões e histórico" mostra quem gerou, quem assinou e as versões anteriores.

## 7. O que cada parte da folha mostra

| Parte | O que é |
|---|---|
| Identificação | Cliente, CNPJ, unidade, setor, lavadora, fabricante, modelo, série, patrimônio ou TAG (do cadastro); lote, receita, início, término e operador (do arquivo). Campo que falta no cadastro sai com um traço. |
| Resultado | O resultado que a lavadora registrou. Ciclo não aprovado sai em vermelho, com a falha. |
| Fita impressa pela lavadora | Reprodução do comprovante impresso, montada a partir do arquivo, na mesma ordem. Como no papel, só os 8 últimos eventos. |
| Indicadores | Resultado, temperatura máxima e duração da desinfecção térmica, tempo total, temperatura no término, falha, manutenção preventiva, fases e pausas. |
| Gráfico | A temperatura máxima registrada em cada fase, sobre a duração da fase. O arquivo não traz a leitura contínua do sensor. |
| Conclusão | Texto do ciclo. A folha diz se a redação foi assistida por inteligência artificial e conferida com os números do arquivo, ou escrita por regra fixa do sistema. |
| Aprovação | Assinatura, nome, cargo, data e hora, usuário e resumo do documento conferido. |

O relatório não usa critério de norma nem valor A0, porque o arquivo não traz a curva contínua do sensor. Quando a receita tem valor de referência cadastrado pela Metrolabs, a folha compara a temperatura máxima e a duração da desinfecção com ele e escreve "a confirmar pelo responsável técnico" até a confirmação.

## 8. Cores e selos

| Selo | Significado |
|---|---|
| Verde "APROVADO" | A lavadora concluiu o ciclo sem falha registrada. |
| Vermelho "CANCELADO" ou "REPROVADO" | O ciclo não chegou ao fim; a carga não deve ser liberada com base nele. |
| Laranja "Aguardando assinatura" | Gerado e ainda não assinado. |
| Verde "Assinado" | Assinado na tela; documento travado. |
| Cinza "Substituída pela versão nova" | Versão antiga guardada; vale a mais nova. |
| Faixa laranja "O cadastro desta lavadora está sem..." | Falta dado no cadastro; o relatório sai assim mesmo. |

## 9. Problemas comuns

| Mensagem | O que fazer |
|---|---|
| "Este arquivo não é o arquivo de ciclo da lavadora (.sgolav)" | Escolha o arquivo do mesmo lote com final .sgolav. |
| "O conteúdo do arquivo está corrompido, incompleto ou foi alterado" | Copie o arquivo de novo direto da lavadora e escolha sem abrir. Se repetir, avise a Metrolabs. |
| "Este lote já tem relatório para esta lavadora" | O mesmo ciclo não é importado duas vezes. Toque em "Abrir o relatório que já existe". |
| "Este arquivo é de outro equipamento" | O arquivo informa a série de outra máquina. Importe pelo QR code da máquina de onde o arquivo saiu. |
| "Acesso negado: este equipamento não pertence à sua empresa" | Confira o QR code. Se a máquina for sua, peça à Metrolabs para corrigir o cadastro. |
| "já foi assinado" | Documento travado. Peça à Metrolabs uma nova versão, com o motivo. |
| Nenhuma lavadora na aba "Equipamentos" | Peça à Metrolabs para cadastrar a lavadora e ligar ao seu cliente. |

## 10. Quem pode

| Perfil | O que faz |
|---|---|
| Cliente | Gera, assina e baixa os relatórios das lavadoras da própria empresa. |
| Equipe da Metrolabs | Gera, assina e baixa os relatórios de qualquer lavadora, completa o cadastro do equipamento e gera nova versão com motivo. |
