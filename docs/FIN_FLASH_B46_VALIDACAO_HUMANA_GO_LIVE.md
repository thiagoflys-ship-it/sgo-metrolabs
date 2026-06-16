# FIN Flash B46 - Validacao humana mobile e preparacao do go-live controlado

Data: 2026-06-16

## Objetivo

Preparar a validacao humana do modulo FIN Flash em celular real e organizar o
piloto controlado. Esta etapa e somente leitura: nao importa extrato real, nao
concilia, nao gera pendencia real, nao cadastra cartao automaticamente, nao
altera saldo, nao altera colaborador e nao limpa abas FIN.

Funcao principal:

- `ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR`

Retorno obrigatorio esperado:

- `success:true`
- `ok:true`
- `executado:false`
- `somenteLeitura:true`
- `bloqueios:[]`
- `prontoParaValidacaoHumanaMobile:true`
- `prontoParaPilotoControlado:true`

## Manual rapido do colaborador Flash

1. Abrir a tela mobile do Financeiro/Prestacao Flash no celular.
2. Conferir se o nome e o cartao exibidos pertencem ao colaborador correto.
3. Informar data, valor e estabelecimento do gasto.
4. Descrever a finalidade de forma clara.
5. Vincular a OS quando o gasto estiver ligado a uma ordem de servico.
6. Quando nao houver OS, justificar o motivo no campo apropriado.
7. Anexar foto ou comprovante salvo no celular.
8. Testar camera pelo celular e upload de imagem da galeria.
9. Conferir historico de prestacoes enviadas.
10. Conferir pendencias e entender como regularizar em ambiente controlado.

Confirmacoes do colaborador:

- conseguiu acessar pelo celular;
- entendeu o que deve lancar;
- entendeu quando anexar comprovante;
- entendeu como justificar gasto;
- entendeu como vincular OS;
- entendeu o que e pendencia;
- entendeu prazo de regularizacao;
- entendeu que o cartao e corporativo;
- entendeu que gasto sem comprovante pode gerar cobranca;
- aprovou a usabilidade mobile.

## Manual rapido do financeiro Flash

1. Conferir se o cartao piloto esta cadastrado corretamente.
2. Conferir se o colaborador esta vinculado ao cartao correto.
3. Conferir termo assinado.
4. Conferir limite ou saldo inicial antes do piloto.
5. Receber a prestacao enviada pelo colaborador.
6. Abrir e validar se o comprovante esta visivel.
7. Validar se extrato Flash e importavel em pre-validacao.
8. Conferir se a conciliacao aparece somente como previa.
9. Conferir se a pendencia aparece corretamente.
10. Gerar relatorios A4 de prestacao, pendencias, conciliacao e gerencial.
11. Conferir dashboard.
12. Confirmar que nenhuma massa de teste foi misturada com operacao real.

## Plano de cadastro inicial controlado

- comecar com 1 a 3 colaboradores;
- escolher colaboradores faceis de acompanhar;
- validar por 3 a 7 dias;
- expandir somente apos aprovacao humana;
- registrar duvidas operacionais;
- manter conferencia diaria do financeiro durante o piloto.

## Plano de treinamento rapido

Duracao sugerida: 15 a 30 minutos.

1. Explicar o objetivo do Flash.
2. Explicar regra de comprovante.
3. Mostrar lancamento pelo celular.
4. Mostrar historico.
5. Mostrar pendencia.
6. Mostrar o que nao pode ser lancado.
7. Explicar prazo e responsabilidade.
8. Confirmar entendimento do colaborador.

## Plano de go-live controlado

- Fase 1: validacao interna sem operacao ampla.
- Fase 2: piloto com poucos cartoes reais.
- Fase 3: conferencia diaria do financeiro.
- Fase 4: expansao gradual.
- Fase 5: fechamento mensal com relatorio.

## Criterios para liberar piloto real

O piloto real controlado so pode ser liberado por nova etapa e autorizacao
explicita depois que todos os pontos abaixo estiverem aprovados:

- funcao B46 retorna `executado:false` e `somenteLeitura:true`;
- bloqueios da auditoria B46 estao vazios;
- colaborador piloto validou o fluxo no celular real;
- upload de comprovante foi validado;
- financeiro conferiu a prestacao;
- relatorio A4 foi revisado;
- dashboard foi conferido;
- cartao piloto tem responsavel claro;
- termo esta assinado;
- nao ha massa de teste misturada com operacao real.

## Riscos que impedem go-live

- colaborador nao consegue anexar comprovante;
- financeiro nao consegue conferir;
- relatorio A4 falha;
- dashboard diverge;
- pendencias nao aparecem;
- conciliacao apresenta inconsistencia;
- dados de teste misturados com real;
- termo nao assinado;
- cartao sem responsavel claro.

## Proximas acoes humanas

- escolher colaborador piloto;
- testar em celular real;
- validar upload de comprovante;
- financeiro conferir lancamento;
- revisar relatorio A4;
- decidir se libera piloto real controlado em nova etapa.

## Protecoes B46

- nao usa dialogos interativos bloqueantes do Apps Script;
- nao usa `clasp push --force`;
- nao faz deploy de producao;
- nao chama rotinas reais de importacao, conciliacao, pendencia ou saldo;
- gera apenas roteiro, checklist, auditoria read-only e documentacao interna.
