# Manual de Uso — FIN Flash V2 (DEV)

**Versão:** V2.13  
**Ambiente:** DEV exclusivo  
**Atualizado em:** 2026-06-30

---

## Portal Colaborador

### 1. Registrar Gasto

1. Acesse o módulo FIN Flash V2 pelo menu DEV.
2. Na aba **Registrar Gasto**, preencha:
   - Valor (R$)
   - Data do gasto
   - Categoria
   - Comprovante (obrigatório — foto, PDF ou imagem)
   - Justificativa
3. Clique em **Enviar Prestação**.
4. O sistema confirma o registro com um ID de prestação.

> O comprovante é obrigatório. Sem ele, a prestação é bloqueada.

---

### 2. Minhas Pendências

- Exibe pendências em aberto com valor, tipo, severidade e status.
- Pendências surgem quando o financeiro não consegue conciliar um gasto.
- Para resolver: envie o comprovante ou aguarde contato do financeiro.

---

### 3. Meus Comprovantes

- Lista todos os gastos registrados com status do comprovante (Enviado / Ausente).
- Status possíveis: `PENDENTE`, `CONCILIADO`, `AGUARDANDO`, `REPROVADO`.

---

### 4. Termo de Uso

1. Clique em **Ver Termo de Uso** para ler o texto completo.
2. Clique em **Li e Aceito o Termo** para registrar o aceite com CPF e e-mail.
3. O aceite fica gravado com data/hora para auditoria.

---

## Portal Financeiro

### Aba: Dashboard

- Exibe cards visuais por colaborador com:
  - Nome, CPF
  - Última recarga
  - Saldo estimado
  - Total de pendências
  - Situação (JUSTIFICADO, BLOQUEADO_POR_PENDENCIA, VALOR_DIVERGENTE, etc.)

---

### Aba: Colaboradores e Cartões

- Lista todos os colaboradores cadastrados.
- Botão **Cadastrar** para adicionar novo colaborador (nome, CPF, e-mail, WhatsApp, perfil).
- Botão **Cartões** para gerenciar cartões de cada colaborador:
  - Adicionar cartão (final 4 dígitos + tipo físico/virtual)
  - Inativar cartão

---

### Aba: Importar Extrato Flash — Fluxo em 7 Etapas

Esta é a aba principal de operação financeira com o Cartão Flash.

#### Etapa 0 — Selecionar Colaborador

1. A lista de colaboradores ativos (com CPF normalizado e cartões ativos) carrega automaticamente.
2. Selecione o colaborador dono do extrato que será importado.
3. As etapas seguintes (prévia e confirmação) ficam bloqueadas até que um colaborador seja selecionado.
4. O CPF selecionado é enviado ao backend junto com a prévia e a confirmação, garantindo que cada linha do extrato seja vinculada ao colaborador correto (em vez de ao lote).

> Erro se nenhum colaborador for selecionado: "Selecione o colaborador antes de pré-visualizar."

#### Etapa 1 — Selecionar Período

- Preencha **Período início** e **Período fim**.

#### Etapa 2 — Selecionar Arquivo do Extrato

1. Clique em **Selecionar Arquivo**.
2. Escolha o arquivo baixado da plataforma Flash (`.xlsx`, `.xls` ou `.csv`).
3. O nome e tamanho do arquivo aparecem confirmados.
4. Use **Limpar** para remover o arquivo selecionado e escolher outro.

> Como baixar o extrato na Flash:  
> App Flash → Relatórios → Extrato por período → Download CSV

#### Etapa 3 — Pré-visualizar Extrato (vinculado ao colaborador da Etapa 0)

1. Clique em **Pré-visualizar Extrato**.
2. O sistema valida:
   - Período preenchido
   - Arquivo selecionado
   - Extensão válida (xlsx/xls/csv)
   - Colunas Flash obrigatórias: `Data`, `Movimentação`, `Valor`, `Pessoa`, `Pagamento`, `Prestação de contas`
3. A prévia exibe:
   - Badge verde "✅ Prévia calculada diretamente do arquivo enviado."
   - Nome do arquivo e período
   - Total de linhas reais, gastos, recargas
   - Valores totais gasto e recarregado (reais do arquivo)
   - Colaborador selecionado na Etapa 0 (nome e CPF) — cada linha do extrato é vinculada a ele, não ao lote
   - Cartões encontrados com finais (ex: Final 0546, Final 881)
   - Status encontrados com contagem (ex: Pendente: 19 | Finalizada: 7 | -: 2)
   - Linhas inválidas
   - Colunas Flash identificadas

> **XLSX/XLS:** o sistema converte o arquivo para Google Sheets temporariamente, lê os dados reais e apaga os temporários automaticamente.  
> **Se o arquivo não puder ser lido:** erro "Não foi possível ler o arquivo real. A importação foi bloqueada para evitar dados incorretos."  
> **Sem arquivo selecionado:** erro "Selecione o arquivo do extrato Flash antes de pré-visualizar."  
> **Sem período:** erro "Preencha o período início e fim antes de pré-visualizar."

#### Ver Lotes Importados (sob demanda)

- Clique em **Ver Lotes Importados** para listar importações anteriores.
- Lotes não carregam automaticamente para evitar chamadas desnecessárias.

#### Etapa 4 — Confirmar Importação

1. Após prévia válida, clique em **Confirmar Importação**.
2. O sistema grava o lote com CHAVE_LOTE e CHAVE_EXTRATO únicos.
3. Duplicidades são detectadas e bloqueadas automaticamente.
4. O ID do lote é exibido com o total de linhas importadas.

#### Etapa 5 — Conciliar Agora

1. Após importação confirmada, clique em **Conciliar Agora**.
2. O sistema cruza os extratos com as prestações de contas.
3. Exibe preview com KPIs: conciliados e pendências geradas.

#### Etapa 6 — Gerar Relatório de Conciliação

1. Clique em **Gerar Relatório da Conciliação**.
2. O relatório A4 abre no modal com cabeçalho, totais e tabela resumida.
3. Use **Imprimir** para imprimir ou salvar como PDF.
4. Use **Visualizar A4** para rever o relatório a qualquer momento.

---

### Aba: Dashboard

- Carrega automaticamente ao abrir o portal (versão resumida — cache de 3 min).
- Use o botão **Atualizar** para forçar recarregamento com dados frescos.
- Para ver saldo completo e extrato: use a aba **Extrato por Colaborador**.

---

### Aba: Conferência de Gastos

- Preencha os filtros (CPF, status, período) e clique em **Filtrar** para buscar.
- Não carrega automaticamente para evitar buscas desnecessárias.
- Status: `PENDENTE`, `CONCILIADO`, `AGUARDANDO`, `REPROVADO`.
- Score IA exibido por conciliação (apoio apenas — não aprova sozinha).
- Ações financeiras (clique no botão **Ações Financeiras**):
  - **Conciliar Manualmente**: informar ID da conciliação e motivo.
  - **Reprovar**: rejeitar comprovante com motivo.
  - **Solicitar Correção**: pedir nova prestação ao colaborador.
  - **Ver Comprovante**: visualizar imagem/PDF do comprovante enviado.

---

### Aba: Extrato por Colaborador

1. Informe o CPF.
2. Filtre por período e tipo (todos / gastos / recargas).
3. Clique em **Buscar**.
4. KPIs: recarregado, gasto, pendente, saldo estimado.
5. Botão **Gerar Extrato A4** para preview e impressão.

---

### Aba: Pendências

- Cards por colaborador com:
  - Quantidade e valor total de pendências
  - Pendência mais antiga
  - Situação e ação recomendada
- Lista detalhada de todas as pendências abaixo dos cards.

---

### Aba: Alertas e Cobranças

> Envio real de e-mail/WhatsApp permanece **BLOQUEADO** no DEV. Apenas simulação.

- **Preparar Cobranças do Dia**: cria alertas para pendências abertas.
- **Simular Envio**: exibe quantas mensagens seriam enviadas (simulado).
- **Configurar Cobrança Diária**: define hora e severidade mínima.
- **Carregar Histórico**: exibe cobranças anteriores com status de envio simulado.

---

### Aba: Documentos e Relatórios

Tipos de documentos gerados:

| Tipo | Descrição |
|---|---|
| Relatório Positivo | Colaboradores sem pendências no período |
| Relatório Negativo | Colaboradores com pendências identificadas |
| Relatório de Pendências | Lista completa de pendências por colaborador |

Para cada tipo:
1. **Pré-visualizar**: abre preview A4 no modal sem gravar.
2. **Gerar**: grava o documento e abre preview A4 com botão Imprimir.

---

### Aba: Termos de Uso

- **Termo Vigente**: clique em "Ver Termo" para ler.
- **Registrar Aceite**: informe CPF e e-mail do colaborador para registrar aceite em nome do financeiro.
- **Situação dos colaboradores**: carrega lista com quem aceitou e quem ainda não aceitou.
- Preview A4 do termo assinado disponível por colaborador.

---

### Aba: Auditoria

- Exibe os últimos 80 registros de ações operacionais.
- Logs técnicos internos são filtrados — apenas ações de negócio.
- Colunas: Data/Hora, Ação, Entidade, ID, Executado por, Detalhe.

---

### Aba: Manual de Uso

- Carrega este manual dinamicamente do backend.
- Inclui guia de status com legenda de cores.

---

## Guia de Status

| Status | Significado |
|---|---|
| `PENDENTE` | Aguardando ação do colaborador ou financeiro |
| `CONCILIADO` | Gasto conferido e aprovado |
| `AGUARDANDO` | Em análise pelo financeiro |
| `AGUARDANDO_CORRECAO` | Colaborador precisa corrigir |
| `REPROVADO` | Comprovante ou prestação rejeitada |
| `IMPORTADO` | Linha de extrato importada, aguardando conciliação |

---

## Regras do DEV

- AMBIENTE_TESTE = SIM em todos os registros
- Envio real de e-mail/WhatsApp: **BLOQUEADO**
- IA não aprova gasto sozinha (`iaAprovaSozinha: false`)
- Todo comprovante é obrigatório
- Toda ação gera log de auditoria
- Menu visível apenas no ambiente DEV
- PRODUCAO_V2 e Flash antigo: **intocados**
