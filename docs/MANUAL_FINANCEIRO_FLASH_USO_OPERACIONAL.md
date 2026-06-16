# Manual operacional - Financeiro Flash

## 1. Visao geral

O Financeiro Flash controla cartoes corporativos, termos de responsabilidade,
prestacoes de contas, importacao de extrato Flash, conciliacao segura,
pendencias e relatorios.

O modulo foi homologado com massa modelo real do extrato Rafael. Essa massa nao
e cobranca real atual.

## 2. O que o modulo controla

- Cadastro de cartoes Flash.
- Vinculo de cartao com funcionario/portador.
- Termo online de responsabilidade.
- Lancamentos/prestacoes de contas.
- Importacao de extrato Flash.
- Separacao de despesas e creditos/depositos.
- Conciliacao segura por preview.
- Pendencias futuras.
- Relatorios e dashboards.

## 3. Perfis de usuario

- Financeiro/Admin: cadastra, importa, revisa, concilia e acompanha pendencias.
- Colaborador/portador: assina termo e presta contas.
- Gestor: acompanha status, pendencias e fechamento.

## 4. Fluxo completo do cartao

1. Cadastrar funcionario.
2. Cadastrar cartao.
3. Vincular cartao ao funcionario.
4. Gerar termo.
5. Colaborador assina termo.
6. Colaborador usa o cartao.
7. Colaborador registra prestacao/comprovante.
8. Financeiro importa extrato Flash.
9. Financeiro roda preview.
10. Financeiro confirma importacao controlada.
11. Financeiro roda preview de conciliacao.
12. Sistema mostra matches e pendencias.
13. Financeiro concilia apenas matches seguros.
14. Financeiro gera pendencias quando faltar prestacao.
15. Gestor acompanha fechamento.

## 5. Como cadastrar funcionario

Usar o cadastro financeiro/usuarios conforme a operacao definida no SGO+.
Campos minimos esperados:

- nome;
- CPF, se usado;
- telefone/WhatsApp;
- e-mail;
- filial;
- cargo/funcao;
- status;
- responsavel/gestor.

## 6. Como cadastrar cartao

Campos minimos esperados:

- `CARTAO_ID`;
- final do cartao;
- funcionario vinculado;
- status;
- data de entrega;
- limite/saldo, se aplicavel;
- termo vinculado;
- observacoes.

## 7. Como gerar termo

O financeiro gera o termo do cartao. O termo deve conter colaborador, cartao,
politica, aceite e rastreabilidade.

## 8. Como o colaborador assina o termo

O colaborador abre a URL publica do termo, le o documento, assina no quadro de
assinatura e confirma o aceite.

## 9. Como o colaborador lanca uma prestacao

Ponto pendente de go-live: o fluxo mobile completo de prestacao ainda precisa
ser finalizado/validado em B45.

Campos esperados:

- valor;
- data;
- finalidade;
- OS, se aplicavel;
- cliente/unidade/equipamento, se aplicavel;
- comprovante/foto;
- observacao;
- localizacao, se aplicavel.

## 10. Como anexar comprovante

O colaborador deve anexar foto ou arquivo do comprovante. Esse fluxo precisa
validacao final mobile antes do uso real.

## 11. Como importar extrato Flash

Sempre iniciar por preview. Nunca importar arquivo real sem auditoria previa e
confirmacao controlada.

## 12. Preview antes de importar

O preview valida periodo, valores, cartoes, duplicidades e impacto previsto.

## 13. Confirmar importacao

Confirmar somente quando o preview estiver aprovado e o responsavel financeiro
autorizar.

## 14. Preview de conciliacao

O preview separa:

- `MATCH_EXATO`;
- `MATCH_FORTE`;
- `MATCH_POSSIVEL`;
- `AMBIGUO`;
- `SEM_PRESTACAO`;
- `CREDITO_DEPOSITO_FLASH`.

## 15. Interpretacao dos status

- `MATCH_EXATO`: colaborador, valor e data batem.
- `MATCH_FORTE`: colaborador e valor batem, data ate 1 dia e descricao ajuda.
- `MATCH_POSSIVEL`: valor/colaborador batem, mas nao e seguro.
- `AMBIGUO`: mais de um candidato.
- `SEM_PRESTACAO`: nao ha lancamento/prestacao.
- `CREDITO_DEPOSITO_FLASH`: credito/deposito, nao e despesa.

## 16. Quando pode conciliar

Somente `MATCH_EXATO` e `MATCH_FORTE` sem ambiguidade, apos preview aprovado e
autorizacao controlada.

## 17. Quando nao pode conciliar

- Sem prestacao.
- Match possivel.
- Ambiguo.
- Credito/deposito.
- Massa modelo de homologacao.

## 18. Como gerar pendencias

B42 e ferramenta futura. Ela nao deve ser usada no lote Rafael modelo sem
autorizacao futura expressa.

## 19. Como cobrar colaborador

Usar mensagem profissional, clara e sem acusacao. Informar periodo, valor,
pendencias e o que precisa ser enviado.

## 20. Como imprimir relatorio

Relatorios A4 finais ainda precisam ser completados/validados antes do go-live.

## 21. Dashboard

O dashboard deve separar massa modelo de operacao real para nao confundir
indicadores.

## 22. Creditos/depositos

Creditos e depositos nao sao despesas e nao devem ser conciliados como gasto do
colaborador.

## 23. Divergencias

Divergencias devem gerar revisao ou pendencia, nunca conciliacao automatica
forcada.

## 24. O que nunca fazer

- Nao apagar extrato.
- Nao reimportar sem auditoria.
- Nao conciliar credito/deposito.
- Nao executar funcao real sem preview.
- Nao registrar pendencia real contra massa modelo.

## 25. Massa modelo Rafael

O lote Rafael e massa modelo/homologacao. Nao e cobranca real atual. Nao apagar
nem usar para cobranca sem autorizacao formal futura.

## 26. Checklist de go-live

- Funcionarios cadastrados.
- Cartoes cadastrados e vinculados.
- Termos gerados e assinados.
- Fluxo mobile de prestacao validado.
- Relatorios A4 validados.
- Rotina de importacao definida.
- Regra de pendencias definida.
- Massa modelo tratada formalmente.

## 27. FAQ

**Posso conciliar sem prestacao?**
Nao.

**Credito/deposito vira despesa?**
Nao.

**B42 deve ser executada para Rafael agora?**
Nao. Rafael e massa modelo.

**O modulo esta pronto para go-live?**
Tecnicamente a importacao/classificacao/preview estao homologados. O go-live
operacional ainda depende de B45 para prestacao mobile e relatorios.

## 28. Glossario

- Extrato Flash: arquivo ou dados importados da operadora Flash.
- Prestacao: registro do colaborador justificando a despesa.
- Conciliacao: vinculo seguro entre extrato e prestacao.
- Pendencia: item sem comprovacao ou com divergencia.
- Massa modelo: dados reais usados apenas para homologacao.
