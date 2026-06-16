# FIN Flash B47 - Validacao humana real em celular

Data: 2026-06-16

## Objetivo

Preparar o teste humano real do FIN Flash em celular e confirmar a liberacao
tecnica para um piloto financeiro controlado. Esta etapa nao libera operacao
geral, nao publica producao, nao importa extrato real, nao concilia extrato real,
nao gera pendencia real em massa e nao altera saldo.

Funcao principal:

- `VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR`

Retorno esperado para aprovacao:

- `success:true`
- `ok:true`
- `executado:false`
- `somenteLeitura:true`
- `bloqueios:[]`
- `prontoParaTesteHumanoReal:true`
- `prontoParaPilotoFinanceiroControlado:true`

## Como testar em celular real

1. Abrir o WebApp `/dev` em celular real.
2. Entrar no Financeiro / Prestacao Flash.
3. Testar em rede movel e em Wi-Fi.
4. Conferir se o colaborador piloto aparece corretamente.
5. Fazer lancamento controlado somente se houver ambiente seguro.
6. Anexar foto tirada na hora.
7. Anexar imagem existente da galeria.
8. Conferir pre-visualizacao do comprovante, quando disponivel.
9. Conferir historico do lancamento.
10. Conferir pendencias.
11. Conferir regularizacao apenas se existir massa controlada.
12. Validar mensagens de erro.
13. Confirmar se o colaborador entende o fluxo sem ajuda.

## Checklist colaborador piloto

- conseguiu acessar pelo celular;
- entendeu o botao correto para lancar gasto;
- entendeu valor, finalidade e OS;
- entendeu comprovante obrigatorio;
- conseguiu anexar foto;
- conseguiu ver historico;
- entendeu pendencias;
- entendeu que gasto sem comprovacao pode ser cobrado;
- confirmou que a tela e facil de usar.

## Checklist financeiro

- conseguiu localizar o lancamento;
- comprovante abriu corretamente;
- valor ficou claro;
- colaborador ficou claro;
- OS ficou clara quando informada;
- historico ficou rastreavel;
- pendencia ficou compreensivel;
- relatorio A4 ficou legivel;
- dashboard nao apresentou divergencia;
- massa de teste nao misturou com operacao real.

## Criterios para aprovar piloto controlado

O piloto controlado so pode avancar para nova etapa se:

- a funcao B47 retorna sem bloqueios;
- B46 continua implementada e somente leitura;
- prestacao mobile, pendencias mobile, A4 e dashboard estao disponiveis;
- DB_FIN_ID e pasta FIN estao configurados;
- teste em celular real foi aprovado pelo colaborador piloto;
- financeiro validou comprovante, historico, relatorio A4 e dashboard;
- massa de teste segue separada da operacao real.

## Riscos que impedem avanco

- tela mobile nao abre no celular real;
- colaborador piloto nao entende o fluxo sem ajuda;
- comprovante nao anexa pela camera;
- imagem da galeria nao faz upload;
- financeiro nao localiza o lancamento;
- relatorio A4 fica ilegivel;
- dashboard apresenta divergencia;
- massa de teste se mistura com operacao real;
- qualquer bloqueio B46 volta a aparecer.

## Protecoes B47

- sem deploy de producao;
- sem push forcado;
- sem dialogos interativos bloqueantes;
- sem rota publica temporaria permanente;
- sem importacao real Flash;
- sem conciliacao real;
- sem pendencia real em massa;
- sem cadastro automatico de varios cartoes;
- sem alteracao automatica de saldo;
- sem limpeza ou reset de abas FIN.
