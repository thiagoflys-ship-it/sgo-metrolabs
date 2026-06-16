# FIN Flash B46 - Validacao humana mobile e go-live controlado

Data: 2026-06-16

## Objetivo

Preparar a liberacao real controlada do Financeiro Flash com validacao humana em
celular real, cadastro piloto e treinamento rapido. Esta etapa nao executa
cobranca, conciliacao, pendencia real, importacao real, limpeza ou reimportacao.

## Roteiro de teste em celular real

1. Abrir o link de prestacao mobile: `?fin_prestacao=TOKEN`.
2. Validar se a tela abre no celular.
3. Validar se os botoes estao grandes e faceis de tocar.
4. Validar se os textos estao claros.
5. Validar se o colaborador entende o que fazer.
6. Simular preenchimento de valor, data, finalidade, OS e observacao.
7. Testar captura ou anexo de foto.
8. Testar visualizacao do comprovante antes do envio, quando o navegador permitir.
9. Testar envio de uma prestacao controlada.
10. Confirmar mensagem de sucesso.
11. Confirmar geracao de protocolo/ID.
12. Confirmar se a prestacao aparece no historico.
13. Confirmar se pendencias aparecem somente do colaborador/token.
14. Testar regularizacao de pendencia controlada, se houver ambiente seguro.
15. Confirmar que nao aparecem dados de outros colaboradores.
16. Confirmar que nao ha botao de conciliacao, cobranca ou importacao para colaborador.

Se o teste exigir gravacao, usar colaborador/cartao piloto controlado. Nunca usar
a massa modelo Rafael como cobranca real.

## Checklist humano do colaborador

Responder cada item com `SIM`, `NAO` ou `AJUSTE`:

- A tela abriu no celular?
- O texto ficou facil de entender?
- O botao de enviar esta visivel?
- O campo valor funciona?
- O campo data funciona?
- O campo finalidade esta claro?
- O campo OS esta claro?
- A foto abre camera ou galeria?
- O envio da mensagem clara?
- O historico aparece?
- O colaborador consegue regularizar pendencia?
- O colaborador ficou com duvida em algum ponto?
- O fluxo e rapido para usar em campo?

Resultado: `APROVADO`, `APROVADO_COM_AJUSTES` ou `REPROVADO`.

## Checklist humano do financeiro

1. Cadastrar funcionario/portador piloto.
2. Cadastrar cartao piloto.
3. Vincular cartao ao funcionario.
4. Gerar termo.
5. Enviar ou abrir termo.
6. Ver assinatura do termo.
7. Abrir tela de prestacoes.
8. Ver prestacao enviada pelo colaborador.
9. Abrir comprovante.
10. Conferir valor, data, finalidade e OS.
11. Marcar situacao conforme fluxo disponivel.
12. Ver relatorio A4 de prestacao.
13. Ver relatorio A4 de pendencias.
14. Ver dashboard.
15. Confirmar que massa modelo Rafael aparece como homologacao, nao cobranca.
16. Confirmar que B42 real nao esta exposta como botao facil.
17. Confirmar que conciliacao real nao acontece sem preview/token.

Resultado: `APROVADO`, `APROVADO_COM_AJUSTES` ou `REPROVADO`.

## Plano de cadastro inicial

Campos minimos para funcionarios:

- nome;
- CPF;
- telefone/WhatsApp;
- e-mail;
- filial;
- funcao/cargo;
- status;
- observacao;
- responsavel pelo cadastro.

Campos minimos para cartao:

- numero/final do cartao;
- portador/funcionario;
- data de entrega;
- status;
- limite/saldo, se aplicavel;
- termo vinculado;
- observacao.

Sequencia segura:

1. Cadastrar 1 funcionario piloto.
2. Cadastrar 1 cartao piloto.
3. Gerar termo.
4. Assinar termo.
5. Testar prestacao mobile.
6. Validar financeiro.
7. So depois cadastrar demais funcionarios/cartoes.

## Plano de treinamento rapido

Colaborador:

- o que e o cartao Flash;
- responsabilidade de prestar contas;
- como acessar o link;
- como lancar gasto;
- como tirar foto;
- como enviar;
- como corrigir pendencia;
- o que nao fazer.

Financeiro:

- cadastro cartao/funcionario;
- termo;
- prestacoes;
- extrato Flash;
- preview;
- conciliacao segura;
- pendencias;
- relatorios;
- dashboard;
- massa modelo Rafael;
- o que nunca executar sem validacao.

## Plano de go-live controlado

Fase 1 - Piloto interno:

- 1 ou 2 colaboradores;
- 1 ou 2 cartoes;
- periodo curto;
- validacao diaria;
- sem automatizar cobranca.

Fase 2 - Financeiro validando:

- financeiro confere prestacoes;
- testa relatorios;
- testa dashboard;
- registra ajustes.

Fase 3 - Expansao:

- cadastrar demais cartoes;
- treinar equipe;
- definir rotina semanal/mensal.

Fase 4 - Operacao real:

- importacao real de extrato Flash;
- preview obrigatorio;
- conciliacao somente com preview/token;
- pendencias apenas quando autorizado.

## Auditorias B46

Executar em ordem:

1. `ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR`
2. `CHECKLIST_CADASTRO_INICIAL_FLASH_B46_SEM_GRAVAR`
3. `PLANO_TREINAMENTO_FLASH_B46_SEM_GRAVAR`
4. `PLANO_GO_LIVE_CONTROLADO_FLASH_B46_SEM_GRAVAR`
5. `CHECKLIST_FINAL_PRE_GO_LIVE_FLASH_B46_SEM_GRAVAR`

## Protecoes

- Nao executar B41 real.
- Nao executar B42 real.
- Nao executar B38 real.
- Nao importar novo extrato real.
- Nao reimportar lote Rafael.
- Nao apagar massa modelo.
- Nao registrar pendencia real.
- Nao cobrar Rafael.
- Nao conciliar.
- Nao limpar planilha.
