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

Na B45 o colaborador pode usar a rota publica de prestacao:

`?fin_prestacao=TOKEN`

Tambem e aceita a rota:

`?page=fin_prestacao&token=TOKEN`

Campos esperados:

- valor;
- data;
- finalidade;
- OS, se aplicavel;
- cliente/unidade/equipamento, se aplicavel;
- comprovante/foto;
- observacao;
- localizacao, se aplicavel.

Ao enviar, o sistema registra a prestacao em `FIN_CARTOES_LANCAMENTOS` com
status `ENVIADO` e mantem o comprovante vinculado ao lancamento.

## 10. Como anexar comprovante

O colaborador anexa foto ou arquivo do comprovante na tela mobile de prestacao.
O arquivo e salvo na pasta financeira configurada e referenciado em
`FIN_CARTOES_ANEXOS`.

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

Os relatorios A4 B45 retornam HTML imprimivel para conferencia:

- comprovante de entrega do cartao;
- prestacao por colaborador;
- pendencias por colaborador;
- conciliacao por periodo;
- extrato importado;
- relatorio gerencial.

## 21. Dashboard

O dashboard deve separar massa modelo de operacao real para nao confundir
indicadores. O lote Rafael permanece identificado como massa modelo de
homologacao e nao deve ser tratado como cobranca real.

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
B45 finaliza a base operacional de prestacao mobile, comprovante, historico,
regularizacao de pendencias e relatorios A4. Antes de uso real, executar as
auditorias B45 e validar a tela em celular real.

## 28. Validacao humana e go-live controlado

Antes do go-live geral, executar a B46 como teste humano e piloto controlado.

### Teste no celular

1. Abrir `?fin_prestacao=TOKEN` em celular real.
2. Validar abertura da tela, tamanho dos botoes e clareza dos textos.
3. Preencher valor, data, finalidade, OS e observacao.
4. Testar foto ou anexo do comprovante.
5. Enviar uma prestacao controlada usando colaborador/cartao piloto.
6. Confirmar mensagem de sucesso e protocolo/ID.
7. Confirmar historico e pendencias do mesmo token.
8. Confirmar que nao aparece dado de outro colaborador.
9. Confirmar que nao ha botao de cobranca, importacao ou conciliacao para o colaborador.

### Cadastro piloto

1. Cadastrar 1 funcionario piloto.
2. Cadastrar 1 cartao piloto.
3. Vincular cartao ao funcionario.
4. Gerar e assinar termo.
5. Testar prestacao mobile.
6. Validar comprovante, relatorios e dashboard no financeiro.
7. So depois expandir para demais funcionarios/cartoes.

### Treinamento rapido

Colaborador: explicar responsabilidade de prestar contas, link mobile, campos
obrigatorios, foto do comprovante, envio, historico, pendencias e o que nao fazer.

Financeiro: revisar cadastro, termo, prestacoes, extrato Flash, preview,
conciliacao segura, pendencias, relatorios, dashboard e protecoes B41/B42/B38.

### Go-live controlado

- Fase 1: piloto interno com 1 ou 2 colaboradores e validacao diaria.
- Fase 2: financeiro confere prestacoes, relatorios e dashboard.
- Fase 3: expansao para demais cartoes apos treinamento.
- Fase 4: operacao real com preview obrigatorio, token e autorizacao.

### Se der erro

- Parar expansao.
- Registrar o problema com print, horario, token usado e aparelho.
- Nao improvisar cobranca, conciliacao ou importacao.
- Corrigir em etapa controlada e repetir o teste humano.

### O que nunca fazer na B46

- Nao executar B41 real.
- Nao executar B42 real.
- Nao executar B38 real.
- Nao importar extrato real novo.
- Nao apagar ou reimportar lote Rafael.
- Nao cobrar Rafael.
- Nao conciliar.
- Nao limpar planilha.

### Massa modelo Rafael

Rafael continua sendo massa modelo de homologacao. Ela serve para validar
separacao tecnica e comunicacao visual, nao para cobranca real.

## 29. Glossario

- Extrato Flash: arquivo ou dados importados da operadora Flash.
- Prestacao: registro do colaborador justificando a despesa.
- Conciliacao: vinculo seguro entre extrato e prestacao.
- Pendencia: item sem comprovacao ou com divergencia.
- Massa modelo: dados reais usados apenas para homologacao.
