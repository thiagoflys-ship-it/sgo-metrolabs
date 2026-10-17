# Pente fino — Frota, Programa de conduta, Painel de qualidade e Integração Auvo (16/10/2026)

Escopo: `SGO_Frota_*`, `SGO_Conduta_*`, `SGO_Qualidade_*`, `SGO_Auvo_*` (backend e telas). Não publicado no Google.

## Como foi testado

- Cópia própria da base dev (`%TEMP%\sgo_frota\pglite`), servidor do `sgo_servidor` com `SGO_ENSAIO=1`, `SGO_AGENDADOR=0`, porta 8117 (a 8105 estava ocupada por outro processo). Nada saiu para Auvo, WhatsApp ou e-mail.
- Roteiro de chamadas reais às APIs pelo mesmo pool de workers do servidor (script em `%TEMP%\sgo_frota\h`), com usuários de teste ADMIN, GESTOR (2), TECNICO (2), METROLOGIA e CLIENTE, e carga sintética (40 pessoas, 120 ocorrências, 40 missões) para medir desempenho.
- Playwright clicando de verdade, computador (1366 px) e celular (390 px), com gestor, técnico e cliente.
- Funções de gatilho executadas diretamente: `Conduta_rotinaDiaria_`, `Conduta_rotinaImediata_`, `Conduta_gerarRelatorioSemanalAutomatico_`, `Auvo_dispararSincronizacaoIncremental_`, `Auvo_pendDispararDiario_` (as duas do Auvo param com a mensagem de credencial ausente, como esperado na base de teste).
- Base sem as abas da Frota (cópia limpa separada): situação da frota, avisos de qualidade e contexto da retirada rodam sem erro.

## Frota

| Página / função | Testado | Achado | Corrigido |
|---|---|---|---|
| Números (km, litros, valores) | sim | **Grave.** `SGO_UTILS.toNumber` apaga todo ponto: "350.90" virava R$ 35.090, "12345.5" km virava 123.455, multa "88.38" virava R$ 8.838. | `Frota_num_` (pt-BR com vírgula; ponto só é milhar no formato 1.234) em todas as 13 conversões. |
| Acesso | sim | **Grave.** Login de CLIENTE listava veículos e condutores (telefone e CNH). | `Frota_exigirEquipe_` em todas as APIs da Frota e do relatório. |
| Histórico do veículo | sim (clique) | O botão "Buscar" sempre falhava: `tplFrota_esc` não existia. | Função criada; km e valores em pt-BR. |
| Tela do computador para técnico | sim | Painéis de cadastro, manutenção, multas, abastecimento e relatório apareciam e o servidor recusava depois de preencher; inativar sem confirmação e sem mensagem de erro. | Classe `so-gestor` esconde para não gestor, aviso explicando quem faz o quê; confirmação ao inativar/excluir; erro sempre mostrado. |
| Retirada/devolução | sim (computador e celular) | Data/hora em texto livre ("15-10", "8h") passavam e sumiam do relatório e do cruzamento de multas; chegada antes da saída aceita. | Validação dd/mm/aaaa hh:mm (vazio = agora, Brasília) e chegada ≥ saída. Rótulo "Fotos (opcional)" corrigido (foto é obrigatória). |
| Inativar veículo em uso | sim | Permitido; a devolução reativava o veículo sozinha. | Bloqueado com mensagem; devolução mantém inativo. |
| Excluir abastecimento/documento/multa | sim | Apagava a linha (regra do dono). | Marca `EXCLUIDO_EM/EXCLUIDO_POR`; todas as leituras filtram. |
| Documentos | sim | CRLV/seguro renovado não apagava o aviso do vencido antigo. | Vale o de validade mais distante por veículo+tipo; o anterior aparece "substituído". |
| Avisos | sim | Multa com condutor ambíguo (MULTIPLOS) não virava pendência; última manutenção escolhida pela data de digitação. | Ambígua entra como "a conferir"; manutenção pela DATA/KM. Título "Avisos de vencimento". |
| Cruzamento de multa | sim | Devolução com data ilegível fazia o condutor aparecer em toda multa posterior. | Usa `FINALIZADO_EM`; sem fim legível a retirada não entra. |
| Relatório A4 | sim | Consumo da frota misturava km das retiradas com litros dos abastecimentos; pendência de multa saía como "Manutenção —"; horas de uso passavam do fim do período; sem PDF o relatório inteiro falhava; nova aba bloqueada perdia o relatório. | Todos corrigidos; PDF é secundário (aviso), link para abrir quando a aba é bloqueada; subtítulo sem "Drive" e sem "despesas". |
| Aba ausente (pedido do coordenador) | sim | `apiSituacaoFrota` e avisos de qualidade falhavam com "Aba não encontrada: CAD_CONDUTORES". | `Frota_lerSeExistir_`: aba ausente = lista vazia, sem criar aba em consulta periódica. |
| Diagnóstico de tempo | sim | Gravava em SYS_LOGS sem sessão. | Exige sessão válida. |
| Desempenho | medido | `Frota_bootstrap_` 1 ms; listas 10–50 ms. Sem regressão do bug antigo de formatação. | — |

## Programa de conduta

| Página / função | Testado | Achado | Corrigido |
|---|---|---|---|
| Ciência dos avisos | sim (API e clique) | Funciona: confirmado não volta em novo login, nem ao contestar, julgar ou ficar firme; "fechar sem confirmar" continua pendente; painel da gestão mostra CIENTE. | — |
| "Aplicar agora" (pedido do coordenador, P1) | sim | Fechava e congelava meses sem confirmação. | `apiPreverRotina` (lista de meses e texto de confirmação) e `apiRodarRotinaAgora` só fecha com `confirmar:true` e a mesma lista; sem isso recusa dizendo quais meses. Ajuste pendente no JS_Core (abaixo). |
| Recorrer | sim (celular) | Botão "Recorrer" aparecia depois do recurso já julgado. | `PODE_RECORRER`/`PODE_CONTESTAR` consideram status e `RECURSO_EM`. |
| Remover missão/ausência | sim | Apagava a linha; missão de mês fechado podia ser removida. | Exclusão marcada (`EXCLUIDA_EM/POR`), log, bloqueio em mês congelado. |
| Farol / apuração | medido | 575 ms com 40 pessoas (tela inicial de todos). | Leitura única por aba durante a apuração: 95 ms (apuração 423 → 60 ms). Cálculo conferido (D 172, n 40 → ICO 78,5, amarelo). |
| Mês anterior no farol | sim | Mês fechado sumia se fosse anterior à data dos parâmetros. | Corrigido. |
| Relatórios sem chave da IA | sim | Relatório mensal não era gerado (nem no fechamento) sem `GEMINI_API_KEY`. | Sai com aviso no lugar da interpretação. |
| Números | sim | ICO "98.5" e competência "2026-09" crus no farol, fechamentos, prévia, relatórios semanal/mensal/missões. | pt-BR em todos. |
| Mensagens | sim | Mês congelado: "exige tratamento formal" sem dizer o que fazer. | Mensagem diz o mês, o que não é permitido e o caminho. |
| Gatilhos | executados | Rotina diária, imediata e relatório semanal rodam sem erro. | — |

## Painel de qualidade

| Página / função | Testado | Achado | Corrigido |
|---|---|---|---|
| Painel (pedido do coordenador, P1) | sim | "0 itens / OK" com CNH vencida; bloco da Frota sumia sem retiradas. | CNH entra nas pendências e tem bloco próprio; documentos/multas aparecem mesmo sem retirada. |
| Saúde das integrações | sim | "OK" com o Auvo sem chaves. | "Auvo: conexão não configurada — peça ao administrador (Chaves e senhas)". |
| Técnico abrindo o painel | sim | Tela com botões e "Erro: acesso restrito". | Texto explicando que o painel é da gestão. |
| Cobrança para quem não tem login | sim | Salva, mas a pessoa nunca vê; gestor não sabia. | Aviso ao gestor na hora de salvar. |
| Avisos ao entrar / ciência | sim | Funciona; cliente não marca ciência alheia. | — |
| Relatório sem chave da IA | sim | Falhava. | Sai com aviso. |
| Números | sim | `toFixed` cru, km/L com ponto. | pt-BR. |

## Integração Auvo

| Página / função | Testado | Achado | Corrigido |
|---|---|---|---|
| Sincronização incremental | lógica testada | **Grave (a validar com dados reais).** O filtro do Auvo é pela data agendada: O.S. agendada ontem e finalizada hoje não era relida — ficava "não finalizada" e o aviso de conclusão não saía. | Janela recua até a O.S. aberta mais antiga dos últimos 7 dias (mais antigas ficam com Pendências). |
| Gravação da tarefa | sim | Vínculo resolvido nesta rodada vazio apagava o vínculo anterior (cliente/técnico/equipamentos). | Merge: vazio não sobrescreve. |
| Equipamento sem cadastro útil | revisado | Consultado no Auvo uma vez por tarefa. | Uma vez por rodada. |
| Antes da 1ª sincronização | sim | Relatório, colaboradores, eventos e O.S. falhavam com "Aba não encontrada: AUVO_TAREFAS". | Bootstrap nessas APIs. |
| Mensagens de credencial | sim | Apontavam "Propriedades do script" (Google). | "Chaves e senhas", também no manual. |
| Avisos de O.S. | lógica testada | Abertura/fechamento/histórico corretos; chave continua desligada. | — |
| Lote para o Auvo | revisado | Enviava sem confirmação. | Confirmação. |
| Texto | revisado | "pro Portal", "dashboard principal", "testado e confirmado", "Rodar agora (manual)". | Trocados; datas em pt-BR. |
| Técnico abrindo a tela | sim | Cada painel com erro de acesso. | Texto explicando que a tela é da gestão. |
| Relatório sem chave da IA | sim | Falhava. | Sai com aviso. |

## Pendências e pedidos a outros agentes

- **JS_Core › `Conduta_aplicarRotinaAgora_` (núcleo):** chamar primeiro `apiPreverRotina`, mostrar `mensagemConfirmacao` em `confirm()`, e só então `apiRodarRotinaAgora` com `{confirmar:true, meses: previa.mesesAFechar}`. Sem esse ajuste o botão passa a mostrar "A rotina falhou: Confirmação necessária…" quando houver mês a fechar (seguro, mas sem caminho para confirmar). Ideal: levar o botão para a faixa "o que depende de você hoje" (auditoria de design 1.4).
- **JS_Core (celular):** alerta de multa sem condutor aparece como "…vencida"; a categoria QUALIDADE pede texto próprio ("conferir condutor").
- **Menu (design):** Painel de qualidade e Integração Auvo devem ficar só para ADMIN/GESTOR/DIRETORIA (as telas já explicam, mas o menu oferece).
- **Programa de conduta:** qualquer pessoa da equipe registra missão para si mesma (incentivo de R$ 300). É a regra atual; recomendo decisão do dono sobre aprovação da gestão.
- **Avisos de conduta:** cada exibição grava 1 linha por aviso pendente (≈1 s com 120 avisos pendentes); com o volume real (poucos por mês) é aceitável.
- **Auvo:** validar a janela de O.S. abertas com a conta real (consumo de API); itens de design ainda abertos: ferramentas de implantação só para ADMIN, status da importação parada com data e motivo, manual (5b, 5c, 6), seleção de colaboradores por caixas.
- **Frota (design):** abas, título duplicado, caixa alta, separar "Situação da frota" de "Retiradas em andamento", seletor de arquivo em português.
- **Painel de qualidade (design):** vocabulário "Cobranças e elogios de campo", plurais, grade.
- `Frota_apiDiagLogTempoCliente` (instrumentação de 09/09) continua ativa no celular; pode ser desligada quando a investigação de lentidão for encerrada.
