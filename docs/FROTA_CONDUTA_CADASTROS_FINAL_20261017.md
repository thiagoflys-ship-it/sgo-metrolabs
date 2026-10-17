# Frota, Programa de conduta e cadastros — finalização (17/10/2026)

Não publicado no Google. Testado no servidor próprio em modo ensaio, com cópia da base dev e só dados de teste.

## 1. Relatórios A4 com análise

Moldura comum nova: `SGO_Documentos_RelatorioA4.js` (prefixo `RelA4_`), em cima do padrão `SGO_DocA4` (não editado):
logo embutida na primeira página, cabeçalho corrido nas demais (caixas de margem do `@page`), rodapé "Emitido pelo SGO+ em …"
e "Página X de Y", texto justificado, cabeçalho de tabela repetido, quebras de página, números pt-BR, gráficos em SVG
(o PDF não executa script), versão de tela que funciona a 390 px.

Análise pela IA: `RelA4_gemini_` (Gemini 2.5 com `thinkingConfig` ligado; modelos antigos da lista de reserva vão sem o campo),
sempre com o contexto calculado no servidor e regras de redação (números reais, sem inventar, sem markdown, sem emoji, sem
inglês, sem mencionar IA). Sem chave ou com falha: texto padrão montado com os mesmos números e faixa de aviso só de tela
("A chave da IA não está cadastrada…"). Gravação: HTML + PDF na pasta (`SGO_DocSalvar_salvarHtmlEPdf_`); falha de gravação
não impede o relatório e aparece como aviso.

| Relatório | Onde | Pasta |
|---|---|---|
| Frota geral e por veículo (10 blocos) | `SGO_Frota_Relatorio.js`, `SGO_Frota_IA.js` | Frota - Relatorios Gerados / placa ou "Frota completa" |
| Conduta: fechamento mensal | `SGO_Conduta_Relatorio.js`, `SGO_Conduta_IA.js` (gráficos agora SVG, sem biblioteca externa) | Programa de conduta - Relatórios / Fechamentos mensais |
| Conduta: semanal (IA nova; texto da geração guardado e reaproveitado ao reabrir) | `SGO_Conduta_RelatoriosGerenciais.js` | … / Relatórios semanais |
| Conduta: prestação de missões (com aprovação) | idem | … / Missões |
| Conduta: extrato do colaborador (novo) | `SGO_Conduta_Extrato.js`, aba "Relatórios e extratos" | … / Extratos / nome (sem link público) |
| Inventário de equipamentos (paisagem) | `SGO_Inventario_Main.js` (`inventarioGerarRelatorio`), botão "Relatório A4 com análise" | pasta do cliente do Inventário (a mesma de "Documentos já gerados") |

Extrato: cada pessoa gera o seu; a gestão gera o de qualquer um. Mês aberto sai como apuração parcial, avisando.

## 2. Decisões do dono

**(a) Missão com aprovação** (`SGO_Conduta_Missao.js`, `Setup`, `Fechamento`, `Ciencia`, tela Missões):
- Nova coluna `APROVACAO` (+ `_POR`, `_POR_NOME`, `_EM`, `_MOTIVO`). Missão que qualifica lançada pelo próprio colaborador
  (ou por quem não é da gestão) nasce `PENDENTE`; lançada pela gestão para outra pessoa nasce `APROVADA`; abaixo da distância
  mínima, `SEM_INCENTIVO`.
- `apiDecidirMissao`: Gestor, Diretoria (e Administrador) aprovam/recusam; recusa exige motivo; ninguém decide missão em
  que é executante; mês fechado recusado. Aviso (SGO, e-mail, WhatsApp) a quem lançou e aos executantes; aviso à gestão
  quando nasce pendente.
- Só aprovada ou legada conta no incentivo (`Conduta_qtdMissoesElegiveisColaborador_`, relatórios).
- Missão pendente trava o fechamento do mês (manual e automático), com mensagem do caminho; prévia lista as pendentes.
- Migração única (`CONDUTA_MISSAO_APROVACAO_V1`): missões existentes viram `LEGADA` com motivo; valor gravado não muda.

**(b) Documentos acompanham** (`SGO_Vinculos.js`, `JS_Vinculos.html`): Transferir unidade/equipamento e Consolidar
cliente/unidade atualizam `CLIENTE_ID`/`UNIDADE_ID` dos documentos do Arquivo ligados. A prévia lista cada documento (de onde,
para onde); a confirmação grava cada troca em `SYS_VINCULOS_AUDITORIA` (quem, quando, motivo, antes, depois) e um resumo em
`SYS_LOGS`. Nada é apagado; o arquivo fica na mesma pasta e o link não muda. Desvincular não mexe nos documentos.
Certificados, laudos NR-13 e atendimentos do Auvo continuam no cadastro original.

**(c) Permissões**: Técnico e Comercial seguem criando e editando. Excluir (clientes, unidades, equipamentos, documentos) e a
Gestão de vínculos ficam com a gestão — o servidor já recusava; mensagens novas dizem o caminho e os botões Excluir somem
para quem não é gestão. Novo: trocar cliente/unidade/equipamento de um documento já vinculado é recusado para não gestão
(completar vínculo vazio continua liberado).

**(d) Despesas da Frota**: aba "Despesas" (só gestão) com consulta por veículo, período e categoria: abastecimentos,
manutenções, multas e despesas avulsas antigas, totais por categoria e por veículo (`Frota_apiConsultarDespesas`,
`SGO_Frota_Consultas.js`).

## 3. Levantamento de valores suspeitos (somente leitura)

`Frota_apiLevantamentoValoresSuspeitos` (aba Despesas, só ADMIN; Gestor recebe recusa). Não cria aba/coluna, não grava log,
não altera nada (conferido: hash das tabelas igual antes e depois). Critérios: valor inteiro e alto (o defeito só gera
inteiros), comparado à mediana do próprio veículo (ou da frota; ou faixa usual), preço por litro do abastecimento, km de
chegada com milhares de km numa retirada. Sugere o divisor (10/100/1000) que devolve o valor ao padrão, com motivo e
confiança. No teste achou os 5 casos plantados (R$ 35.090 → 350,90; 405 L → 40,5; R$ 38.990 → 389,90; 126.500 km → 12.650;
multa R$ 8.838 → 88,38).

## 4. Pedidos da coordenação (atendidos)

- Farol e avisos: "ICO" trocado por "Índice de conduta" nos textos do servidor.
- `Frota_bootstrap_` com `LockService` e nova conferência dentro da trava (fim do "Já existe uma página chamada CAD_CONDUTORES").
- Nome do condutor gravado como digitado (sem forçar maiúsculas); existentes não mudam.
- Equipamentos: mensagens com a TAG; "Número de série".
- Medidor de tempo provisório (09/09) removido: `Frota_apiDiagLogTempoCliente` e as chamadas no `JS_Core` (só o trecho da Frota).
- Regra única com a central de alertas: vencido ou vence hoje = Vencido; até 30 dias = Vencendo.
- Após gravações da Frota e do Conduta, `SGO_Pendencias_invalidar_()` (com `typeof`).

## 5. Como foi testado

- Cópia de `dados/dev/pglite` em `%TEMP%\sgo_frotafim`; dados de teste (Hospital Modelo de Teste, Clínica Exemplo de Teste,
  veículos TST1A11/TST2B22/TST3C33, usuários gestor1/dir1/tec1/tec2/com1, ocorrências e missões fictícias).
- Roteiro pelo pool do legado: 40 verificações (permissões por perfil, fluxo de missão, fechamento travado e liberado,
  valores congelados, vínculos com documentos conferidos numa execução seguinte, levantamento sem alteração).
- Servidor `SGO_ENSAIO=1`, porta 8124, Playwright em 1440 e 390 px com ADMIN, GESTOR, TÉCNICO e COMERCIAL; relatórios
  gerados pela tela e impressos em A4 com `page.pdf` (Frota geral e por veículo, mensal, semanal, missões, dois extratos,
  inventário); PDFs renderizados e conferidos página a página. Nenhuma chave de IA usada. Servidor parado no fim.

## 6. Pendências e notas

- Nomes de documentos continuam gravados em maiúsculas pela normalização antiga do Arquivo de documentos (decisão do dono).
- Os ramos de diagnóstico no `doGet` do `SGO_Main.js` (`diagPerfFrotaMinimo` etc.) não são meus; podem sair junto com o medidor.
- Celular: registro de missão e exclusão de cadastros no `JS_Core` não foram revistos (o servidor já aplica as regras).
- Revisão da TST3C33 aparece "Vencido" com data futura porque venceu pelo km; o aviso não diz o critério (sugestão: mostrar "por km").
