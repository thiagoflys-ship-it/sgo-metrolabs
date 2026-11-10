# Comercial — Etapa 1: assinatura, aprovação, link e ordem de compra (10/11/2026)

Estado real: **implementado e testado localmente** sobre a cópia exata da produção em
`output/comercial-20261110/base`. **Nada foi publicado**, nenhum `ssh`, nenhum `git commit`.
Testes rodam no emulador do projeto (tabelas, Drive e MailApp em memória); não comprovam
envio real de e-mail nem a tela num navegador real.

## Arquivos alterados (somente em `base/`)

| Arquivo | Final de linha | O que mudou |
|---|---|---|
| `legado/SGO_Comercial_Config.js` | CRLF (preservado) | Colunas novas; `COM_TIPOS_ACEITE` e `COM_GANHA_VIA`; colunas de texto (datas e OC); chave do cache de abas `COM_ABAS_OK_V11_ASSINATURA` (garante as colunas novas na primeira chamada). |
| `legado/SGO_Comercial_Propostas.js` | LF | Núcleo comum `ComP_aplicarAprovacao_`; assinatura pelo link reescrita; envio do link reescrito; confirmação imediata; registro posterior; proteções; OC; D9; D13; D22. Detalhes abaixo. |
| `legado/SGO_Comercial_Oportunidades.js` | LF | `ganhaEm` com hora, `ganhaVia`/`ganhaViaNome` na tela; `ComOpo_ganhar_` grava `GANHA_VIA = MANUAL`; a perda é recusada quando há proposta assinada pelo cliente; a perda também encerra o aviso de vencimento. |
| `legado/SGO_Comercial_Painel.js` | LF | Ação `registrarAssinaturaCliente`. |
| `legado/SGO_Comercial_Quadro.js` | LF | `propostasEnviadas` do cartão inclui a proposta PRONTA com documento (para registrar OC/aceite pelo quadro) e traz `situacao`. |
| `legado/JS_Comercial.html` | LF | Janela do link (substitui o `window.prompt`); botão e aviso "Registrar a assinatura do cliente"; tipo do aceite e campos da OC na resposta e no "Ganhar" do quadro; resposta disponível na PRONTA (só aprovação); botões escondidos para proposta assinada; "Ganha em" com hora e via na ficha; link e assinatura do cliente na ficha da proposta. Textos corridos novos com `text-align:justify`. |
| `legado/SGO_Ajuda_Comercial.js` | LF | Ajuda/manual: assinatura pela Metrolab e link, cliente assinou pelo link, assinatura anterior a 10/11/2026, tipo do aceite e OC, proteções, quadro, ganho com data e hora, seção de manual "Assinatura eletrônica da proposta e ordem de compra". |
| `src/publico/orcamento/app.js` | LF | Na rota `/assinar-proposta/`, textos de "proposta" (título, validade, botões, concordância, topo da proposta assinada, link indisponível, rodapé, cabeçalho "Comercial"); contato do vendedor. A Assistência (`/orcamento/`) continua igual. |
| `tests/comercial-assinatura-aprovacao.test.cjs` (novo, fora de `base/`) | LF | 20 testes. |

Não tocados: `src/*.ts`, `dist/`, `legado/SGO_CadeiaFrioRel_*`, `sgo_servidor`, `apps-script-imports`.

## Colunas novas

- `COM_PROPOSTAS`: `LINK_EMAIL`, `LINK_ENVIADO_EM`, `ASSINADA_EM`, `ASSINADA_POR_NOME`, `ASSINADA_POR_CARGO`,
  `ASSINADA_POR_EMAIL`, `ASSINATURA_PDF_ID`, `ACEITE_TIPO` (PROPOSTA_ASSINADA, ORDEM_COMPRA, EMAIL_APROVACAO,
  ASSINATURA_ELETRONICA), `OC_NUMERO`, `OC_DATA`. Forçadas como texto: `LINK_ENVIADO_EM`, `ASSINADA_EM`, `OC_NUMERO`, `OC_DATA`.
- `COM_OPORTUNIDADES`: `GANHA_VIA` (MANUAL, ACEITE, ASSINATURA, OC).
- A evidência completa da assinatura continua em `COM_ASS_RESP_<id>` (Properties), agora com `linkEnviadoEm`,
  `linkEnviadoPorId`, `finalPdfNome`, `clienteEmailDiferente`.

## O que mudou, por item

1. **Assinatura aprova e ganha.** `ComP_aplicarAprovacao_(p, quem, op)` é o núcleo usado pelo registro manual
   (`ComP_registrarResposta_`) e pela assinatura (`ComP_aplicarAssinatura_`). Grava APROVADA, `RESPOSTA_*`,
   `ACEITE_ARQUIVO_*` (na assinatura = PDF com as duas assinaturas), `ACEITE_TIPO`, `PEDIDO_SITUACAO = SEM_PASSAGEM`;
   banco de preços (`ComBP_registrarProposta_`); conclui `RETORNO_ATIVIDADE_ID` e `VENCIMENTO_ATIVIDADE_ID` (D9);
   histórico na proposta e na oportunidade; contato registrado; oportunidade GANHA com `GANHA_EM` (data e hora),
   `GANHA_VIA` e etapa movida para a de 100% do funil (ENG_5/PRO_5) com histórico de etapa; avisos à gestão (com
   e-mail no expediente) e ao responsável (só no sistema na assinatura, porque o e-mail imediato já saiu).
   Proposta PRONTA: `ComP_aoEnviar_` antes, com a opção nova `semRetorno` (não cria "Retorno sobre a proposta").
   PDF assinado gerado fora da trava (`ComP_gerarPdfAssinado_`, D22); dentro da trava tudo é conferido de novo.
   A assinatura é gravada primeiro; se a aprovação falhar, fica histórico "ASSINATURA_SEM_APROVACAO" e aviso ao
   vendedor para usar "Registrar a assinatura do cliente". Idempotente (testado: nada se repete).
2. **Confirmação imediata** (`ComP_confirmarAssinatura_`, via `Com_depois_`): para o vendedor, cópia ao e-mail
   digitado e ao convidado (se diferente), `replyTo` e `name` do vendedor, assunto
   "Proposta <rótulo> assinada por <nome> (<cliente>)", texto e HTML (número, cliente, total, data e hora, signatário,
   próximos passos, contato do vendedor), PDF assinado anexado. Falha: histórico "não saiu" + aviso `CONFIRMACAO_NAO_SAIU`.
3. **E-mail diferente do convidado** não bloqueia; os dois ficam registrados; histórico, ficha e e-mail destacam
   "assinado com e-mail diferente do convidado (<convidado>)". Formato continua validado (`AstL_validar_`).
4. **Envio do link** (`ComP_linkAssinatura_`): só o responsável; `d.substituir` obrigatório quando já há link ativo;
   ordem segura (D11): grava o link novo, envia, só então apaga o anterior; se o MailApp lançar, desfaz o novo e
   o anterior continua valendo. Grava `LINK_EMAIL`/`LINK_ENVIADO_EM` e Properties; histórico (com aviso de e-mail fora
   dos contatos e do link cancelado); contato registrado; PRONTA conta como envio (`ComP_aoEnviar_`, D15). E-mail com
   `name` "<Vendedor> — Metrolabs", `replyTo` e `bcc` do vendedor, saudação ao contato, número, título, cliente, total,
   validade, o que o cliente fará, botão do link, contato do vendedor e o PDF da proposta anexado.
   Tela: janela com e-mail do contato da proposta pré-preenchido (`ComP_emailSugerido_`), contatos do cliente para
   escolher, aviso quando o e-mail não é de contato do cliente, "Último link: … — será cancelado ao gerar outro" com
   confirmação obrigatória e `autocomplete="off"`. O link continua exibido para copiar (WhatsApp).
5. **Ordem de compra**: "Tipo do aceite" na resposta e no Ganhar do quadro; OC exige número, data (não futura) e
   arquivo; grava `ACEITE_TIPO`, `OC_NUMERO`, `OC_DATA`; `GANHA_VIA` OC ou ACEITE; arquivo salvo como
   "Ordem de compra <nº> - …" em Aceites; número no histórico, na mensagem e na atividade de cada setor da passagem.
   Aprovação também na PRONTA (com documento gerado), para qualquer cliente; antes vira ENVIADA com
   "Aceite por ordem de compra (nº … de …)". Chamada sem o tipo (telas antigas) continua aceita.
6. **Proteções** (`ComP_assinadaCliente_`, `ComP_msgAssinada_`): assinada pelo cliente não volta a rascunho, não
   ganha nova revisão, não é cancelada, não é excluída (`ComP_podeExcluir_`), não recebe recusa, não vence nem gera
   aviso de vencimento na rotina; a perda da oportunidade é recusada enquanto houver proposta assinada em andamento.
   `ComP_foiEnviada_` considera o link (coluna e Properties da versão anterior). D13: o link assinado continua
   abrindo e baixando o PDF assinado depois de vencida/aprovada (proposta não assinada e vencida continua fechada).
7. **Assinaturas anteriores**: sem migração automática. Ficha mostra aviso e botão "Registrar a assinatura do cliente"
   (responsável ou gestão; `ComP_registrarAssinaturaCliente_`), aplica o item 1 com `GANHA_EM` = hora da assinatura,
   histórico "Registro posterior … feito por …", confirmação só ao vendedor (sem cópia ao cliente).
8. **Página pública**: corrigido em `app.js` (estático). Ver "Não feito" para o que está em `.ts`.
9. **Ficha**: "Ganha em dd/mm/aaaa hh:mm · <via>".
10. **Ajuda/manual** atualizada no mesmo pacote.

Também: `ComP_cancelar_`, `ComP_excluir_` e a perda passam a encerrar o aviso de vencimento (D9); a recusa também.
Cabeçalho do arquivo de propostas atualizado (D21).

## Testes

Comando: `FASE=candidato node --require ./output/comercial-20261110/fontes-locais.cjs --test tests/<arquivo>`.

| Arquivo | Produção (antes) | Candidato (depois) |
|---|---|---|
| comercial-assinatura-aprovacao (novo) | 1 passa / 19 falham (comportamento novo ausente) | **20 / 0** |
| comercial-atividade-gestao | 5 / 0 | 5 / 0 |
| comercial-busca | 6 / 0 | 6 / 0 |
| comercial-c2-precos | 10 / 0 | 10 / 0 |
| comercial-c2-revisao | 7 / 0 | 7 / 0 |
| comercial-c3-orcamentista | 10 / 0 | 10 / 0 |
| comercial-c3-revisao | 12 / 0 | 12 / 0 |
| comercial-c4-entrada-mercado | 8 / 1 | 8 / 1 (mesma falha: o teste exige CRLF em JS_Comercial.html; a produção é LF) |
| comercial-catalogo-equipe-exclusao | 8 / 0 | 8 / 0 |
| comercial-catalogo-oficial | 14 / 3 | 14 / 3 (os mesmos três testes) |
| comercial-celular | 3 / 0 | 3 / 0 |
| comercial-decisao-dono | 13 / 0 | 13 / 0 |
| comercial-especialista | 16 / 0 | 16 / 0 |
| comercial-importar-crm | 2 / 0 | 2 / 0 |
| comercial-investimento | 9 / 0 | 9 / 0 |
| comercial-modelo-orcamento | 7 / 0 | 7 / 0 |
| comercial-precificacao | 13 / 0 | 13 / 0 |
| comercial-quadro | 8 / 0 | 8 / 0 |
| comercial-termos-catalogo | 7 / 0 | 7 / 0 |
| comercial | 16 / 0 | 16 / 0 |

Nenhuma falha nova. `node --check` em todos os `.js` alterados; o `<script>` de `JS_Comercial.html` compila e é
executado nos testes de tela (desenho da proposta com o retorno real do servidor, cliques na janela do link, no
registro posterior e na resposta, com DOM mínimo).

Os 20 testes novos cobrem: aprovação e ganho pela assinatura (etapa 100%, hora, banco de preços, retorno e
vencimento encerrados, avisos sem R$); confirmação (destinatários, cópia, `replyTo`, `name`, anexo, destaque);
mesmo e-mail; formato inválido; idempotência; link antigo em PRONTA; falha da confirmação; envio do link (conteúdo,
colunas, histórico, contato, PRONTA→ENVIADA); substituição com confirmação e D11; recusas do envio (outro vendedor,
gestão, sem assinatura Metrolab, e-mail inválido, já assinada, e-mail fora dos contatos); OC (obrigatórios, data
futura, tipo inválido, recusa em PRONTA); OC em PRONTA até a passagem aos setores; aceite por e-mail e D9; chamada
sem tipo; PRONTA sem documento; ganho manual com hora e quadro; proteções; D13; registro posterior (permissões,
e-mail só ao vendedor, idempotência); tela, página pública e ajuda.

## Limites e o que não foi feito

- **Não publicado.** Na publicação: `src/publico/orcamento/app.js` precisa ir também para
  `dist/publico/orcamento/app.js` (o `build` copia `src/publico`; aqui nada foi recompilado). Os `.js`/`.html` de
  `legado/` são lidos direto.
- **Textos em `.ts` não alterados** (relato): `src/servicos/orcamentoPublico.ts:35-38` (`INDISPONIVEL`: "Este link de
  orçamento…"), título e descrição de `index.html` antes do JavaScript rodar e o `noscript` ("Orçamento | Metrolabs",
  "Para ver e responder o orçamento"). Na rota `/assinar-proposta/` o `app.js` troca a mensagem de link indisponível,
  o título, o cabeçalho e o rodapé; o `noscript` e o título inicial continuam com "orçamento".
- **Escolhas de interpretação**: (a) a aprovação na PRONTA vale para qualquer tipo de aceite (não só OC), sempre com o
  documento gerado; a recusa continua só em ENVIADA/VENCIDA; (b) a perda da oportunidade é **recusada** quando há
  proposta assinada em andamento (em vez de perder sem cancelar a proposta); (c) a etapa de 100% também é aplicada no
  registro manual da aprovação (mesmo núcleo); (d) o botão "Assinar pela Metrolab" some depois da assinatura (o
  servidor não reassina o mesmo documento) e o botão do link aparece também na ENVIADA assinada pela Metrolab.
- Gestão continua vendo o botão do link e recebendo a recusa clara do servidor (D16; decisão 10 do dono pendente).
- Fora desta etapa: D5 (troca de responsável), D6 ("Marcar como ganha" sem exigência; só passou a gravar
  `GANHA_VIA = MANUAL`), D7/D8 (atividade da gestão), D14, D17-D19, pedidos a, b, g, h; Gestora/Painel para propostas
  assinadas antes desta versão ainda não registradas (deixam de existir depois do registro posterior).
- Corrida rara: duas assinaturas simultâneas do mesmo link geram dois PDFs; só o primeiro é registrado (o segundo
  arquivo fica órfão na pasta, privado).
- A proposta real assinada antes desta versão só muda quando o responsável ou a gestão tocar no botão.
- Envio real de e-mail (SMTP, filtro de spam, aparência do HTML em clientes de e-mail) e a tela num navegador real
  não foram verificados.
