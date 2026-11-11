# Regras persistentes de trabalho

## Concluir as solicitações sem exigir insistência

Preferência explícita do usuário, registrada em 06/11/2026:

- Conduzir cada solicitação até a entrega completa e sua verificação. Continuar o trabalho autorizado de forma autônoma, sem encerrar a tarefa em etapas intermediárias ou exigir que o usuário repita "continue".
- Em implementações, concluir análise, alterações, testes, publicação quando autorizada e verificação após a publicação. Preparação de arquivos e testes locais são etapas intermediárias, não a entrega em produção.
- Respeitar as autorizações já dadas na conversa. Não pedir novamente uma confirmação já concedida. Esta regra não autoriza, por si só, publicar qualquer mudança futura ou executar ações destrutivas.
- Se faltar uma informação indispensável ou existir um impedimento real, explicar precisamente o que está bloqueado, continuar as partes independentes e pedir apenas o necessário para resolver o impedimento.
- Informar claramente o estado real: preparado, testado, publicado e verificado. Não apresentar sucesso em testes simulados como comprovação de funcionamento completo em produção.
- Preservar funcionalidades já entregues. Antes de publicar, conferir a versão em uso e as alterações posteriores; aplicar somente as mudanças necessárias, manter backup e reversão e verificar o resultado. Não substituir produção por um espelho local desatualizado.
- Durante trabalhos longos, manter atualizações curtas em português, sem usá-las como substituto da execução.

## Continuidade atual

As melhorias do Comercial e a recuperação do botão de investimento foram
publicadas em 06/11/2026. Evidências e limites da verificação estão em
`output/auditoria-sgo-20261106/PUBLICADO_COMERCIAL_20261106.txt`.
A auditoria completa do sistema e a validação do Financeiro permanecem
pendentes; não devem ser tratadas como concluídas por causa dessa publicação.

RH360: integração de chat/avisos do SGO, navegação e correção do aparelho
confiado foram publicadas em 06/11/2026 na imagem
`sha256:41e838533d90523bc518fd6fdf691bfe4225650176a28aa574773d8b9e9dc29f` (R3).
R2 corrigiu o include aninhado que impedia exibir o chat, adicionou botão
Bate-papo e removeu barra/rótulo de desenvolvimento sem ativar automações.
Evidências e limites em `output/rh360-20261106/PUBLICADO_RH360_R2_20261106.txt`.
R3 removeu o overlay global das atualizações do chat: registros e evidências em
`output/rh360-20261106/PUBLICADO_RH360_R3_20261106.txt`.
Atualizações periódicas em segundo plano não devem escurecer a tela, bloquear
o operador, roubar foco ou apagar digitação. Testar respostas atrasadas e
concorrência com operações do usuário; preservar controles de gravação.
Em testes de interface, verificar a página completa renderizada pelo servidor;
testar componentes isolados não comprova que foram incluídos na página final.
Preservar essa base e os módulos anteriores; não republicar releases RH antigos.

Missão atual CCT/direitos/deveres: instruções do anexo de 06/11/2026 exigem
diagnóstico antes de alterações significativas e implementação incremental
no módulo existente. Diagnóstico e estado em
`output/cct-missao-20261106/RELATORIO_TECNICO_FASE_1.txt` e
`output/cct-missao-20261106/CONTINUIDADE.txt`. Usuário confirmou validação pela
Diretoria com assessoria jurídica. Sem regras financeiras ou disciplinares
em produção sem aprovação. Não considerar a missão integral concluída.

CCT R4 publicada e verificada em 06/11/2026: imagem
`sha256:3f0f8180cb8dc9c94aa0004ae3871a55a721d1775bd47570c5e516df4e793143`,
tag `metrolabs/rh:cct-governanca-20261106-r4`. Esta é a base RH atual;
preserva R2/R3/chat/login. Governança administrativa no cadastro existente,
sem efeitos financeiros/disciplinários/ponto. Evidências e limites em
`output/cct-missao-20261106/PUBLICADO_CCT_R4_20261106.txt`.
Não executar novamente os publicadores R1/R2/R3/R4 como se fossem atualização.
Missão integral permanece aberta; nenhuma aprovação ou vínculo foi inventado.

CCT R5 publicada e verificada em 06/11/2026 é a base RH mais recente:
`sha256:23f77de317b38200f6db985e78a0c50e45e7d538dd6ffc8f470f9c9d2e86f40d`,
tag `metrolabs/rh:cct-conferencia-portal-20261106-r5`. Acrescenta simulador
MANUAL sem pessoa dos cenários A-H e portal Meus direitos e deveres, somente
com procedimentos aprovados/íntegros/vigentes e vínculo próprio validado.
Hoje há 0 vínculos: o portal informa pendência. Simulação não é integração
real, motor jurídico homologado ou concessão de prêmio. Evidências e limites:
`output/cct-missao-20261106/PUBLICADO_CCT_R5_20261106.txt` e continuidade
atualizada. Preservar R4/R3/chat/login. Não republicar fontes ou releases antigos.

Chat em ordem cronológica publicado em 09/11/2026 (mensagens antigas apareciam
no meio ao reabrir a conversa). Bases atuais: SGO+/COMMAND
`metrolabs/sgo:chat-ordem-20261109` (sha256:53b46f7d…) e RH360
`metrolabs/rh:chat-ordem-20261109-r6` (sha256:2bdae25f…), ambas em camada
sobre a anterior (só ComunicacaoWidget.html trocado; R5 preservada).
Evidências e reversão: `output/chat-ordem-20261109/PUBLICADO_CHAT_ORDEM_20261109.txt`.
Próxima publicação parte destas imagens, não das anteriores.

RH360 — BASE OBSERVADA EM 09/11/2026, 22:28 BRT
Produção mudou externamente durante o trabalho do dossiê para R6:
sha256:2bdae25f9f4c80c6a526dc889c1b636ed7dedce68cdef03ab62cbee43764cb0b,
tag metrolabs/rh:chat-ordem-20261109-r6. Preservar esta base mais recente.
O manifesto interno ainda é o da R5: a conferência dos arquivos reais detectou
legado/ComunicacaoWidget.html alterado, hash
05f0b623d3c5cd717ac9e90ec55094a8d8de008a1eb02d0cc8421a838906ad91.
Reconciliação sem conflito em output/rh360-20261109/reconciliacao-r6-real.json;
base e hashes reais em base-r6/. Não substituir o chat pela cópia R5.
O trabalho do dossiê ainda está em candidato, sem publicação por esta tarefa.

RH360 — R7 PUBLICADA EM 10/11/2026 ÀS 00:04 BRT
Base atual: metrolabs/rh:dossie-profissional-20261110-r7,
sha256:9b55b9ec829e1a256593dafe0fdbae2a65f96ff2d68a4a26d41976cf580b7f48.
Preserva R6/chat/R5/login/CCT. Dossiê privado cifrado com permissões explícitas,
versões e histórico; resumo profissional e campos organizacionais declarados.
Diretoria confirmada nas duas contas informadas, sem alterar perfis RH/SGO ou
inventar decisões jurídicas/documentais. Não há acesso médico implícito.
Backup real restaurado antes de publicar; fontes e saúde verificadas depois.
Evidências e limites: output/rh360-20261109/PUBLICADO_RH360_R7_20261110.txt.
Login autenticado de operador real permanece não testado; testes funcionais
autenticados são sintéticos. Missão CCT integral e Financeiro permanecem abertos.
Não reexecutar publicador R7 como nova atualização nem usar fontes antigas.

RH360 R8 publicada/verificada em 10/11/2026 às 00:13 BRT: base atual
metrolabs/rh:dossie-consulta-20261110-r8,
sha256:4ce9594157240e38f1328fb2c1c3c0a8f27c563cedaba6eb3920e7f3579f0ae6.
Um arquivo de interface sobre R7: busca/classificação/versões do arquivo privado;
backend, permissões, Diretoria e dados preservados. Backup restaurado incluindo
autoridade da Diretoria. Evidências: output/rh360-20261110-r8/PUBLICADO_RH360_R8_20261110.txt.
Não usar publicadores ou fontes R7 e anteriores como atualização da base R8.

RH360 R9 publicada/verificada em 10/11/2026 às 00:25 BRT: base atual
metrolabs/rh:dossie-navegacao-20261110-r9,
sha256:ec71b4f085c1878bbcbfdab0ce63bece105b252e3ab4dfb61e63271bae082d0c.
Preserva R8/R7/R6/R5. Índice local das seções visíveis do perfil e conferência
somente da presença de campos básicos; não declara completude jurídica.
Produção/backup/fontes conferidos. Browser público real sem login passou.
Evidências/limites: output/rh360-20261110-r9/PUBLICADO_RH360_R9_20261110.txt.
Ensaio prolongado sintético da imagem exata está em andamento em soak-browser/;
não tratá-lo como concluído sem resultado PASS final. Operador real não testado.
Não republicar fontes ou publicadores R8 e anteriores sobre a R9.

RH360 R10 publicada/verificada em 10/11/2026 às 00:43 BRT: base atual
metrolabs/rh:dossie-historico-20261110-r10,
sha256:a5212a3dc4d5dee4c056fc74e7209588524100e0a3f5ec6879282509a9d3ac19.
Corrige paginação do histórico privado para eventos autorizados, preservando
R9/R8/R7/R6/R5. 61 testes na imagem passaram; recuperação em outro processo
preservou duas versões, 5 MiB, recibos e histórico. Backup real restaurado.
Evidências/limites: output/rh360-20261110-r10/PUBLICADO_RH360_R10_20261110.txt.
Ensaio prolongado da imagem exata até 02:50 BRT segue em andamento; consultar
soak-browser/resultado.json e não afirmar PASS final enquanto estiver RUNNING.
Operador real não testado: acesso às abas indisponível e Chrome minimizado.
Dados reais e missão CCT integral/Financeiro continuam pendentes.
Não reexecutar publicadores históricos nem substituir esta base por R9/anteriores.

Verificação adicional da R10 em PostgreSQL 16 isolado (mesma imagem do banco
de produção) passou em 10/11/2026: baseline e dados privados restaurados,
13 tabelas comparadas, três processos da aplicação, 5 MiB/versões/recibos/
histórico/concorrência íntegros. Dados e SGO inteiramente sintéticos, rede none.
Resultado: output/rh360-20261110-r10/postgres-final.json. Não confundir com
login autenticado real nem declarar o ensaio prolongado concluído antes do PASS.


RH360 R11 publicada/verificada em 10/11/2026, 02:08 BRT: imagem
sha256:1983c6ffda311c53ccccc04b021b9fe3f792d9d8a9e1f5387233c6dd46daa240,
tag metrolabs/rh:dossie-concorrencia-20261110-r11. Esta é a base atual.
Corrige corrida de liberação da trava compartilhada e evita apagar sessão
válida por BUSY/indisponibilidade, mantendo negação e revogação reais.
Preserva R10/R9/R8/R7/CCT/chat/login; não republicar imagens anteriores.
63 testes na imagem, backup real restaurado, 693 hashes e saúde conferidos.
Evidências: output/rh360-20261110-r11/PUBLICADO_RH360_R11_20261110.txt.
R10 PostgreSQL prolongado falhou e motivou a correção; não declarar PASS.
R10 embutido foi parcial por limite da fixture. R11 PostgreSQL prolongado
está em andamento até 02:50 BRT; consultar ENSAIOS_CONTINUOS_FINAL.json
quando existir. Não inferir conclusão apenas desta anotação.
Operador autenticado real/dados reais/CCT integral permanecem pendentes.


ENCERRAMENTO DOS ENSAIOS — 2026-11-10T05:50:36.835850+00:00
R9 chat/digitação: PASS, 8614 segundos, 407 ciclos.
R11 PostgreSQL: PASS, 2883 segundos, 448 ciclos,
2689 consultas de histórico, seis concorrentes por ciclo,
liberação de trava artificialmente atrasada em 10 ms. Sem erros, overlay ou
perda de digitação/sessão. Arquivo de 5 MiB enviado/baixado pela página completa.
Conferência física: 3 chunks de auditoria,
2689 leituras registradas, revisão semântica 2,
arquivo íntegro, tabelas genéricas vazias e travas livres.
Dump/restore final de 13 tabelas + arquivos/chave idênticos; novo processo da
imagem R11 abriu o banco recuperado e confirmou os mesmos bytes/histórico.
Ambientes sintéticos sem rede, nenhuma chamada a dados reais nesses ensaios.
Produção reconferida após os testes: 693 hashes, duas contas de Diretoria,
18 colaboradores e nenhum documento/vínculo/aprovação fictício.
R10 parcial e R10 PostgreSQL falho continuam documentados, não contam PASS.
Evidências consolidadas: output/rh360-20261110-r11/ENSAIOS_CONTINUOS_FINAL.json.
Aceite de operador real e preenchimento com dados reais permanecem pendentes.

Período contínuo encerrado às 03:00 BRT de 10/11/2026 conforme solicitado. Entrega e limites: output/rh360-20261110-r11/ENTREGA_ATE_0300.txt. Missão CCT integral permanece aberta.


RH360 R12 publicada/verificada em 10/11/2026 14:29 BRT: base atual
sha256:3c150e7bbae4088d4dfdf65ee2e52777fb19b216af741c62ffa0ec3f565246e1, tag metrolabs/rh:dossie-validade-20261110-r12.
Uma tela alterada: filtros locais de validade informada por versão, referência
São Paulo, combinados com busca/classificação/versões e sem ampliar acesso.
Preserva R11/trava/sessão/chat/login/CCT; nenhuma notificação ou automação
financeira/disciplinar/ponto. 67/67 testes da imagem e páginas completas PASS.
Backup real restaurado, 693 hashes/saúde/GET conferidos. Evidências/limites:
output/rh360-20261110-r12/PUBLICADO_RH360_R12_20261110.txt.
Usuário explicitamente adiou o teste operacional real para outro momento;
isso não é aceite executado. Dados reais/CCT integral/Financeiro pendentes.
Não republicar R11 ou anteriores como atualização; conferir produção real.

SGO+ — COMERCIAL + CADEIA DE FRIO PUBLICADO EM 10/11/2026 ~15:05 BRT
Base SGO+ atual: metrolabs/sgo:comercial-assinatura-20261110,
sha256:0ffe1e9b14ebebba26bfbe2382785ad4fa4b824f14376bf7f102dc11d0f57599
(camada de 18 arquivos sobre chat-ordem-20261109). ATENÇÃO: o repositório local
sgo_servidor diverge da produção em 28+ arquivos; a fonte da verdade é o código do
contêiner (cópia em output/comercial-20261110/base). Publicar sempre em camada.
Assinatura do cliente aprova a proposta e dá ganho; link profissional; OC; exclusão
lógica de oportunidade; atividades da gestão; assinatura do vendedor; repetidos;
Cadeia de Frio apara até 2 linhas de borda por registrador.
Evidências, decisões e limites: output/comercial-20261110/PUBLICADO_COMERCIAL_CADEIAFRIO_20261110.txt.
Pendente: conferir criação das colunas (V12) após 1º uso, e-mail real, operador real,
PROP-2026-0042 aguarda "Registrar a assinatura do cliente" pelo responsável.

SGO+ — 10/11/2026 (noite): base atual metrolabs/sgo:poderes-lote0-20261110
(sha256:ad471a8a…), sobre seguranca-segredos-20261110 (sha256:1f270f5f…: gravar chaves
em /_sgo/segredos só o dono). Lote 0 de "Acessos por caixas": tela Acessos, SGO_Poderes.js,
abas SYS_PODERES_EXCECOES/LOG, 150 poderes em espelho (nenhuma trava ligada ainda).
Fonte de trabalho: output/poderes-20261110/base (= produção). Evidências na mesma pasta.
Em andamento: auditoria/correção das brechas de preço do Comercial (caso PROP-2026-0028).
Pendentes combinados: simulação didática com marca em todos os módulos + código por
WhatsApp para dados reconstituídos (dono aprovou o modelo; NÃO emitir oficial com dados
reconstituídos; SEM faixa vermelha no rodapé (dono pediu 11/11): só marca d'água diagonal discreta com o texto "SIMULAÇÃO DIDÁTICA" (só isso) + número SIM- + fora de ficha/QR/envio); tela da qualificação dizendo o que falta. Conduta/avaliação por setor: só discutir.

SGO+ — 11/11/2026 00:53 BRT: base atual metrolabs/sgo:comercial-precos-custos-20261111
(sha256:f02de011…), sobre poderes-lote0. Brechas de preço fechadas (item sem custo/avulso,
preço do vendedor pendente, reconferência antes de documento/envio/link/aceite), custo com
cotação obrigatória e validade (90 dias; custo antigo sem cotação vale até 11/12/2026 — LEGADO),
preço sugerido e opções ao vendedor. Evidências: output/poderes-20261110/PUBLICADO_PRECOS_CUSTOS_20261111.txt.
Mensagem para a equipe: output/poderes-20261110/MENSAGEM_EQUIPE_COMERCIAL.txt (dono envia).

SGO+ — 11/11/2026 ~01:51 BRT: base atual metrolabs/sgo:qualif-simulacao-20261111 (sha256:5136d1a3…).
Qualificação diz o que falta; simulação didática (marca "SIMULAÇÃO DIDÁTICA", SIM-, fora de ficha/QR/envio);
código WhatsApp do dono para dados reconstituídos; /api/run bloqueia funções internas com sessão-objeto
(126) — achado crítico corrigido. Evidências: output/poderes-20261110/PUBLICADO_QUALIF_SIMULACAO_SEGURANCA_20261111.txt.
Ao publicar a partir daqui, src/servidor.ts e dist/servidor.js da base já têm a trava (manter).
SGO+ — 11/11/2026 ~02:20: base atual metrolabs/sgo:poderes-lote1-20261111 (sha256:820f35b3…). Lote 1 das caixas
ligado (contas/senhas/acessos, espelho). Evidência: output/poderes-20261110/PUBLICADO_LOTE1_20261111.txt.
