# Regras persistentes de trabalho

## Localizar a base RH vigente

- As entradas RH antigas abaixo são um histórico cronológico. Expressões como
  “base atual” nessas entradas valem para a data da própria publicação, não
  substituem uma publicação posterior. Não republicar versões antigas.
- Ponto de partida: `apps-script-imports/METROLABS_SGRH_360/server/ENTREGA_DOSSIE_ATUAL.json`.
  Conferir imagem e manifesto no contêiner em uso antes de preparar mudanças.
- Última publicação RH registrada nesta revisão: R81, imagem
  `sha256:6f5698b73f31b941cb2c7b2c015fdaaa44d0678b707ca4df6004244be4a19a1c`,
  tag `metrolabs/rh:secullum-previa-data-fuso-20261117-r81`.
  Evidência: `output/rh360-20261117-r81/PUBLICADO_RH360_R81_20261117.txt`.
  Preserva as entregas anteriores; 792 pins de fontes/metadados.
- A ausência de 18 declarações TypeScript relatada na R37 foi corrigida na R38.
  O typecheck ficou limpo sem alterar os arquivos executáveis. Não tratar o
  diagnóstico antigo como uma falha ainda aberta nem como aceite operacional.
- Preenchimento real agregado, sem exportar valores: 18 ativos, 18 cadastros sem setor e
  2 datas de admissão vazias, reconferidos em 17/11/2026, 16:36 BRT. Referência e roteiro:
  `output/rh360-jornada-20261111/CONSULTA_AGREGADA_ATUAL_20261117.json` e
  `output/rh360-jornada-20261111/PENDENCIAS_PREENCHIMENTO_EQUIPE_20261117.txt`.
  Não preencher lacunas com dados inventados. Aceite operacional real adiado.
- Critérios CCT e lacunas de software: `output/rh360-jornada-20261111/MATRIZ_ACEITE_CCT_20261117.txt`.
  Conferência de origens R69, decisão individual canônica R70 e portal R71 já publicados;
  critérios estruturados/manuais R73/R74 disponíveis. Não reimplementar como se faltassem.
  O `PLANO_VINCULO_JURIDICO_20261117.txt` é histórico R68, identificado como tal.
  Próximo roteiro: `output/rh360-jornada-20261111/ROTEIRO_EXECUCAO_FECHAMENTO_RH360_20261117.txt`.
  Decisões reais, cobertura jurídica, fatos reconciliados, motor/apuração, integrações e aceite continuam abertos.
  Referência administrativa ou confronto manual não equivale a decisão jurídica/fato verificado.
- Relatório total R81, 26 áreas e cadeia das 13 entregas R69–R81 desta janela:
  `output/rh360-jornada-20261111/RELATORIO_TOTAL_RH360_20261117.html` (também `.txt`).
  Imagem, 792 pins, saúde e GET públicos reconferidos em 17/11/2026, 16:50 BRT:
  `output/rh360-jornada-20261111/VERIFICACAO_ENCERRAMENTO_1700_20261117.json`.
  Quatro ativações Secullum permanecem desligadas; configuração salva rev.2, sem chamada real nesta jornada.
- Este resumo é do RH. As instruções e registros do SGO/Comercial abaixo
  pertencem a outra frente e não autorizam alterá-la durante a jornada RH.

## Retenção de cópias locais de versões encerradas — 12/11/2026

Compactação R13–R41 concluída: 29 cópias, 49.873 arquivos, cerca de 1,19 GB
liberados descontando ZIPs. Recibo: `output/rh360-jornada-20261111/COMPACTACAO_CANDIDATOS_20261112.json`.
R42/R43/R44 permanecem expandidas. O preparador agora trabalha em
`candidato-em-preparacao` e só expõe `candidato` no fim; aguardar PREPARED
terminal e `preparacao-concluida.json` antes de alterar uma candidata nova.

- Para reduzir espaço, cópias expandidas antigas em `output/rh360-*/candidato`
  podem ser compactadas somente após publicação/verificação, inventário de
  todos os arquivos, conferência dos pins e leitura integral do ZIP com hashes.
  Preservar ZIP, inventário e recibo `candidato-compactado.json` junto da versão.
- Não compactar a versão atual ou sua base imediata durante implementação.
  Não remover evidências, pacotes de entrega, imagens de reversão ou backups.
  Remover somente a junction local `node_modules`, nunca seu destino compartilhado.
- Utilitário: `output/rh360-jornada-20261111/compactar-candidatos.py`.
  O limite atual é R13–R41, com R42/R43 preservadas expandidas. Reavaliar limites
  conforme a base vigente; não usar o utilitário antigo como autorização genérica.
- Para consultar fontes históricas compactadas, restaurar primeiro:
  `python output/rh360-jornada-20261111/restaurar-candidato-compactado.py NOME_DA_PASTA`.
  O utilitário recusa sobrescrever um candidato existente. `--verify-only`
  restaura em pasta temporária, verifica todos os hashes e remove o temporário.
- A restauração integral da R13 foi comprovada; os fontes permanecem recuperáveis.
  Datas anteriores a 1980 são ajustadas ao limite do ZIP; a prova é dos conteúdos,
  não de identidade de todos os metadados do sistema de arquivos.

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

### Limpeza segura após testes — 11/11/2026

- Após encerrar os processos de cada teste, remover os temporários próprios
  descartáveis: bancos sintéticos, arquivos intermediários e caches gerados
  exclusivamente pelo ensaio. Não acumular cópias sem finalidade de entrega.
- Antes de excluir, conferir o caminho absoluto, a origem e o uso atual.
  Não atravessar junctions, links ou pontos de nova análise; não apagar
  dependências compartilhadas, dados reais, fontes, evidências úteis,
  backups ou arquivos necessários à reversão.
- Guardar relatório compacto do teste e recibo da limpeza, com caminhos e
  bytes removidos. Não é necessário guardar o banco sintético inteiro.
- Arquivos próprios de transporte/conversão de imagens podem ser descartados
  depois da importação e verificação, comprovando que as imagens imutáveis e
  os inventários continuam disponíveis. Preservar as imagens de reversão;
  esta regra não autoriza apagar backups de dados ou fontes únicas.
- Para bancos RH `qa-native-*` encerrados, usar
  `python output/rh360-jornada-20261111/limpar-temporarios.py --apply`.
  O utilitário recusa testes potencialmente ativos e árvores com links.
- Esta limpeza faz parte da conclusão da tarefa; não exige nova confirmação
  para os descartáveis identificados e autorizados pelo usuário.

### Prioridade de entrega e verificações proporcionais — 11/11/2026

- O usuário corrigiu expressamente a condução: ciclos repetitivos estavam
  atrasando a conclusão. Priorizar implementação e entrega, sem preencher
  o prazo de trabalho com repetição de testes ou monitoramento sem necessidade.
- Executar uma rodada de verificações adequada à mudança. Repetir apenas
  por alteração posterior, falha ou preocupação concreta ainda não resolvida.
- Ensaios prolongados não são requisito padrão nem motivo para adiar novas
  entregas. Exigem justificativa concreta e duração limitada ao necessário.
- Manter backup, reversão, verificação da publicação e preservação da base
  atual. Esta preferência reduz repetição; não permite inventar sucesso ou
  omitir falhas. Testes operacionais reais continuam adiados pelo usuário.
- Informar progresso por entregas e impedimentos relevantes, evitando relatos
  repetidos de contagem de ciclos. O horário até03:00 é janela de execução,
  não obrigação de manter ensaio rodando até esse horário.

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
SGO+ — 11/11/2026 ~02:35: base atual metrolabs/sgo:poderes-lote4-20261111 (sha256:aeae8028…). Lote 4 das caixas
ligado (aprovação de relatório técnico, espelho). Lotes 0,1,4 publicados; Lote 2 (Conduta) adiado por pedido do
dono; próximos: 3 Financeiro (tem trava no Node), 5 Compras, 6 Frota, 7–11. Evidência: PUBLICADO_LOTE4_20261111.txt.
SGO+ — 11/11/2026 ~02:52: base atual metrolabs/sgo:poderes-lote5-20261111 (sha256:7d954e75…). Lotes 0,1,4,5 ligados.
Pendências: Lote 2 Conduta (adiado pelo dono), 3 Financeiro (trava no Node), 6–11; teste compras-acesso-financeiro-
delegado falhava já antes desta noite (investigar). Evidência: PUBLICADO_LOTE5_20261111.txt.
SGO+ — 11/11/2026 ~03:07: base atual metrolabs/sgo:poderes-lote6-20261111 (sha256:fd7fe182…). Lotes 0,1,4,5,6 ligados (34 caixas).
SGO+ — 11/11/2026 ~10:50: base atual metrolabs/sgo:frota-sessao-20261111 (sha256:f58a719e…), sobre poderes-lote6.
"Não abasteci" com campo na tela (sem window.prompt) e aviso de sessão que não fica preso após novo login.
Fonte de trabalho: output/frota-sessao-20261111/cand (= produção). Evidência: PUBLICADO_FROTA_SESSAO_20261111.txt.
SGO+ — 11/11/2026 ~13:00: base atual metrolabs/sgo:aprovacao-chat-20261111 (sha256:704f2d9d…), sobre frota-sessao.
Pedido de aprovação do Comercial avisa na hora (GS04, e-mail+WhatsApp, dono incluído) + Voltar fixo no chat.
Fonte: output/frota-sessao-20261111/cand (= produção). Em andamento em cópias próprias: gestora-auto-20261111,
padroes-20261111, secadora-20261111 (especialistas) — ao publicar, mesclar sobre esta base, nunca sobre cópia antiga.
SGO+ — 11/11/2026 tarde: base atual metrolabs/sgo:frota-gestora-20261111 (sha256:c1d2b35a…), sobre aprovacao-chat.
Confirmação contra toque acidental na Frota + gestora automática do Comercial (seletor ligado). Fonte: output/lote-20261111c/cand (= produção).
SGO+ — 11/11/2026 fim da tarde: base atual metrolabs/sgo:padroes-secadora-20261111 (sha256:c5db52c7…), sobre frota-gestora.
Padrões: novo certificado + leitura IA + filtros; secadora: próximo passo claro. Fonte: output/lote-20261111d/cand (= produção).
Proposta do módulo depósito de viagem (só desenho, aguarda decisões do dono): output/deposito-viagem-20261111/PROPOSTA_DEPOSITO_VIAGEM.md


RH360 R13 publicada/verificada em 11/11/2026 14:02 BRT: base atual
sha256:bba83f4483865a0f90917744935e0ba544d9ece26596d2e9ffcff981568afc40, tag metrolabs/rh:cadastro-pendencias-20261111-r13.
Consulta de pendências dos campos básicos do colaborador. Delta incremental sobre a base real anterior.
71 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r13/PUBLICADO_RH360_R13_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
SGO+ — 11/11/2026 ~14:30: base atual metrolabs/sgo:decisao-aviso-20261111 (sha256:a08d73d3…), sobre padroes-secadora.
Vendedor recebe na hora alerta + e-mail (S80) da decisão da aprovação. Fonte: output/lote-20261111d/cand (= produção).
Depósito de viagem E1 em construção por especialista em output/deposito-viagem-20261111/cand (copiado ANTES desta publicação: mesclar só o diff dele).
Config 11/11 ~14:45 (pedido do dono "Matheus é o gerente, tudo aparece pra ele"): matheusgodoi responsável em todas as áreas da
Caixa de decisões menos DIRETORIA (gestoresPorArea; registro GESTAO_REGRAS). Mantidos os demais (charles, wanessa, bruna, elisa, admin).


RH360 R14 publicada/verificada em 11/11/2026 14:12 BRT: base atual
sha256:c47336e14852a5ba38a4ea478745508a64001a866cda0846b2a4a6f9a0fd1b10, tag metrolabs/rh:cadastro-retorno-20261111-r14.
Retorno da consulta e atalhos do resumo do dossiê. Delta incremental sobre a base real anterior.
76 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r14/PUBLICADO_RH360_R14_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.


RH360 R15 publicada/verificada em 11/11/2026 14:21 BRT: base atual
sha256:267e0e82ec86c29d6335af5ae4d4d8558bc87a4a8dd0153728140daab7b09989, tag metrolabs/rh:arquivo-organizacao-20261111-r15.
Organização e consulta das séries documentais autorizadas. Delta incremental sobre a base real anterior.
80 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r15/PUBLICADO_RH360_R15_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
Config 11/11 ~15:00: prazo de aceite da Representação (estudar o caso e agendar) = 3 dias úteis (aceiteMin 1710 min úteis,
expediente 08:00-17:30) nas representadas Brasmedical e Energiza (antes 240 = 4 h). Registro REPRESENTACAO_PRAZOS. Tela mostra "28 h 30 min úteis".
Dado 11/11 ~15:20: CH-2026-0030 (Brasmedical, P1) prazo 240 -> 1710 min úteis (3 dias úteis; SLA_FONTE REPRESENTACAO), registro ASSISTENCIA_PRAZO.
Especialista em andamento: output/representacao-20261111/cand (chamado de representada = 3 dias úteis; imagens/vídeos; Kanban/Gantt e A4 para os dois lados).
SGO+ — 11/11/2026 ~16:00: base atual metrolabs/sgo:deposito-viagem-e1-20261111 (sha256:63a284ea…), sobre decisao-aviso.
Depósito de viagem E1 publicado. Fonte: output/lote-20261111f/cand (= produção). Representação (especialista) copiou de lote d: mesclar só o diff dele.


RH360 R16 publicada/verificada em 11/11/2026 14:44 BRT: base atual
sha256:1eda7bac150d9e0376073610cff7dc88ad05ad8a45b9f5db53ed8bd05dc4d2b5, tag metrolabs/rh:arquivo-conferencia-20261111-r16.
Conferência da seleção e integridade do arquivo privado. Delta incremental sobre a base real anterior.
86 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r16/PUBLICADO_RH360_R16_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.


RH360 R17 publicada/verificada em 11/11/2026 15:02 BRT: base atual
sha256:1234e06f6c57076a20a510b8b5131813afae764623722d15b571ca521658f70b, tag metrolabs/rh:arquivo-acessos-20261111-r17.
Revisão das permissões registradas e revogação por conta. Delta incremental sobre a base real anterior.
90 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r17/PUBLICADO_RH360_R17_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
SGO+ — 11/11/2026 ~17:00: base atual metrolabs/sgo:representacao-midia-20261111 (sha256:f6f9dcb9…), sobre deposito-viagem-e1.
Representação: prazo da representada, imagens/vídeos (rota Node própria), A4. Fonte: output/lote-20261111g/cand (= produção).
Em andamento: depósito de viagem organização/design em output/deposito-viagem-org (copiado de lote f: mesclar só o diff).


RH360 R18 publicada/verificada em 11/11/2026 15:23 BRT: base atual
sha256:72cd3d811c77c3c8118ab5946b0f7425fba27af2873c5288d5c97513f1338aac, tag metrolabs/rh:arquivo-historico-20261111-r18.
Histórico autorizado por tipo e retorno ao dossiê. Delta incremental sobre a base real anterior.
99 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r18/PUBLICADO_RH360_R18_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.


RH360 R19 publicada/verificada em 11/11/2026 15:39 BRT: base atual
sha256:7698624b2e1a2b4a4566bdf3edba1b1754d14f73b20a09fb029f69fed8c976c2, tag metrolabs/rh:consulta-mobile-20261111-r19.
Consulta móvel legível e controles documentais compactos. Delta incremental sobre a base real anterior.
99 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r19/PUBLICADO_RH360_R19_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.


RH360 R20 publicada/verificada em 11/11/2026 15:48 BRT: base atual
sha256:d4fcc9b51d5f7d4c6910e1e64ef529db5b75e9df52ba10e6f631daabcfadffd4, tag metrolabs/rh:arquivo-fila-assistida-20261111-r20.
Seleção local assistida de documentos com confirmação por arquivo. Delta incremental sobre a base real anterior.
102 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r20/PUBLICADO_RH360_R20_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
SGO+ — 11/11/2026 ~18:00: base atual metrolabs/sgo:deposito-viagem-org-20261111 (sha256:437b6345…), sobre representacao-midia.
Depósito de viagem organizado (Kanban/Gantt/A4/guia). Fonte: output/lote-20261111h/cand (= produção). Régua da Representação em andamento (output/representacao-prazos, copiada de lote g: mesclar só o diff).


RH360 R21 publicada/verificada em 11/11/2026 16:11 BRT: base atual
sha256:5cbd627e4b1628f1189b6bdb71ca9e05069a93cdd903909ce8c638312e115466, tag metrolabs/rh:arquivo-consulta-paginada-20261111-r21.
Consulta paginada de arquivos extensos preservando filtros e posição. Delta incremental sobre a base real anterior.
105 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r21/PUBLICADO_RH360_R21_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
SGO+ — 11/11/2026 ~19:00: base atual metrolabs/sgo:representacao-regua-20261111 (sha256:6963a7dd…), sobre deposito-viagem-org.
Régua de prazos da Representação publicada. Fonte: output/lote-20261111i/cand (= produção). Nenhum especialista em andamento.


RH360 R22 publicada/verificada em 11/11/2026 16:26 BRT: base atual
sha256:9bb74a72399169695c30befbea4b6aa1f6f595f9d5c28b83ed54db56769e32c8, tag metrolabs/rh:arquivos-visao-autorizada-20261111-r22.
Visão autorizada dos arquivos por colaborador, com consulta explícita e pausa. Delta incremental sobre a base real anterior.
109 testes na imagem, página completa/backup restaurado/693 hashes/saúde
conferidos. Evidências e limites: output/rh360-20261111-r22/PUBLICADO_RH360_R22_20261111.txt.
Teste operacional real adiado por pedido do usuário; sem dados inventados,
sem efeitos financeiros/disciplinários/ponto nem aprovação ou vínculo CCT.
Preservar módulos anteriores e alterações posteriores; não republicar releases
históricas como atualização. Missão CCT integral/Financeiro permanecem abertos.
Achado 11/11 ~17:20: modelo Meta sgo_gestao_acao (avisos da gestão) e sgo_aviso_geral estão na categoria MARKETING -> Meta aceita
e pode não entregar (limite de marketing). Sem webhook de status (META_WA_VERIFY_TOKEN vazio). Correção em curso: modelo UTILITY novo (especialista diretoria-avisos).
Enviados 11/11 17:13 por script: GS04 dos 5 preços pendentes da Mônica a admin+charles (e-mail OK; WhatsApp aceito, entrega não confirmada).
SGO+ — 11/11/2026 ~18:30: base atual metrolabs/sgo:diretoria-avisos-20261111 (sha256:f9062889…), sobre deposito-viagem-e2.
Depósito E2 publicado; avisos na hora para a Diretoria (GS06) + janela do preço + modelo sgo_gestao_item (Meta PENDING/UTILITY).
Fonte: output/lote-20261111k/cand (= produção). Nenhum especialista em andamento. Conciliação Caju aguarda acesso a docs.caju.com.br.
Config 11/11 ~19:00 (dono: "dono é informado, não cobrado"): admin e charles fora das áreas operacionais da Caixa; só DIRETORIA.
Responsáveis: RH elisa+matheus; TECNICA bruna+matheus; METROLOGIA bruna+matheus; FINANCEIRO e ADMINISTRATIVO wanessa+matheus; COMERCIAL, QUALIDADE, LOGISTICA matheus.
SGO+ — 11/11/2026 ~19:15: base atual metrolabs/sgo:topo-regras-20261111 (sha256:3de6f3f8…). Fonte: output/lote-20261111k/cand (= produção).
Em andamento: diretoria-resumo (resumo diário GS03 + Diretoria sem trava em atividades), copiado de lote k já com este pacote.
Caju 11/11: API estudada (output/deposito-viagem-20261111/ESTUDO_API_CAJU.md). Dono: pagamento pelo saldo da conta Caju; categoria a definir com a Wanessa.
Em andamento: output/conciliacao-caju (módulo Conciliação + cliente API Caju simulado; credenciais de homologação a pedir pelo formulário do Caju).
Caju 11/11 ~20h: pedido de homologação enviado pelo formulário (Thiago, CNPJ 32.487.278/0001-21, engenharia@metrolabs.com.br),
com as perguntas: tipo TRIP na criação, categoria (FLEXIBLE/CASHEW), extrato CSV/OFX e layout, webhook. Aguardar retorno.
SGO+ — 11/11/2026 ~20:30: base atual metrolabs/sgo:diretoria-resumo-20261111 (sha256:871fa7c2…). Fonte: output/diretoria-resumo/cand (= produção).
Em andamento: conciliacao-caju (copiado de lote k ANTES deste pacote: mesclar só o diff dele; conflitos prováveis em JS_Core, Index, Poderes, AssistenteManuais).


RH360 R23 publicada/verificada em 11/11/2026 19:40 BRT: base atual
sha256:fb4c633243c75f6c9f55bc735b58bdf8dc95dd73510ab663502d7882642de0d3, tag metrolabs/rh:pendencias-cadastrais-20261111-r23.
Central de pendências cadastrais, estrutura e contrato declarado. Duas interfaces alteradas sobreR22,backendinalterado.
Verificacao proporcional:5testes direcionados e pagina completa nativa,
320/390/1440px,backup restaurado,693hashes/health/GET e readonlyPASS.
Sem ensaio prolongado ou repeticao de suites backend ja aprovadas.
Evidencias/limites: output/rh360-20261111-r23/PUBLICADO_RH360_R23_20261111.txt.
PreservarR22/R21 e modulosanteriores; nao republicarreleaseshistoricas.
Aceiteoperacional real adiado,sem dados/aprovacoes/vinculosinventados ou
efeitos financeiros/disciplinarios/ponto. CCTintegral/Financeiropendentes.
Caju 11/11 resposta (protocolo 02527150, Lucas A.): API = colaboradores + pedidos de benefícios; NÃO cobre Despesas;
TRIP/categorias/extrato/webhooks a responder; credenciais encaminhadas. Pergunta à Wanessa: carga hoje por Despesas ou benefício?


RH360 R24 publicada/verificada em 11/11/2026 19:58 BRT: base atual
sha256:313ec033c87eb65adc9e39d0aa59d491276ed78e895c9692a2ed1bdd29a339ee, tag metrolabs/rh:cadastro-csv-assistido-20261111-r24.
Preenchimento assistido por CSV com revisão e salvamento no editor existente. Duas interfaces alteradas sobreR23,backendinalterado.
Verificacao proporcional:11testes direcionados e pagina completa nativa,
320/390/1440px,backup restaurado,693hashes/health/GET e readonlyPASS.
Sem ensaio prolongado ou repeticao de suites backend ja aprovadas.
Evidencias/limites: output/rh360-20261111-r24/PUBLICADO_RH360_R24_20261111.txt.
PreservarR22/R21 e modulosanteriores; nao republicarreleaseshistoricas.
Aceiteoperacional real adiado,sem dados/aprovacoes/vinculosinventados ou
efeitos financeiros/disciplinarios/ponto. CCTintegral/Financeiropendentes.
SGO+ — 11/11/2026 noite: base atual metrolabs/sgo:conciliacao-caju-20261111 (sha256:243767b8…), sobre diretoria-resumo.
Conciliação Caju (API simulada até credenciais de homologação). Fonte: output/lote-20261111n/cand (= produção).
Em andamento: desempenho-gestao (copiado de diretoria-resumo ANTES deste pacote: mesclar só o diff dele) e Missão 01 (auditoria só leitura, output/missao01-auditoria).


RH360 R25 publicada/verificada em 11/11/2026 20:21 BRT: base atual
sha256:341395040d2069e46d7d9b4aeb3c0b6813d1555fa612bb79c3f502dfd8a9f37c, tag metrolabs/rh:documentos-prioridades-datas-20261111-r25.
Prioridades de datas nos documentos autorizados e atalhos para a consulta atual. Uma interface alterada sobreR24,backendinalterado.
Verificacao proporcional:6testes direcionados e pagina completa nativa,
320/390/1440px,backup restaurado,693hashes/health/GET e readonlyPASS.
Sem ensaio prolongado ou repeticao de suites backend ja aprovadas.
Evidencias/limites: output/rh360-20261111-r25/PUBLICADO_RH360_R25_20261111.txt.
PreservarR22/R21 e modulosanteriores; nao republicarreleaseshistoricas.
Aceiteoperacional real adiado,sem dados/aprovacoes/vinculosinventados ou
efeitos financeiros/disciplinarios/ponto. CCTintegral/Financeiropendentes.
SGO+ — 11/11/2026 ~20:20: metrolabs/sgo:desempenho-gestao-20261111 (sha256:03da8f0b…): Desempenho da gestão e Caixa refeitos (saneamento fora da nota).
SGO+ — 11/11/2026 20:25: base atual metrolabs/sgo:trava-despacho-20261111 (sha256:98801bfe…): /api/run recusa destinos de despacho
sem chamada pelas telas (achado D-01 da Missão 01, confirmado e corrigido). Fonte: output/lote-20261111p/cand (= produção).
Missão 01 (auditoria): output/missao01-auditoria (partes A, B, C + relatório consolidado). Nenhum especialista em andamento.
Caju 11/11 20:29 (Wanessa): a viagem é carregada no Caju como ADIANTAMENTO DE DESPESAS (Caju Despesas), classificado por plano de contas
e combustível. A API do Caju não cobre Despesas: modo de carga MANUAL (padrão do módulo) é o correto; credenciais de API deixam de ser
necessárias para a carga. Pedido à Wanessa: lista do plano de contas do Caju Despesas, um extrato exportado de um mês e se o combustível
da viagem vai no Caju ou no cartão da Frota — para mapear categorias e ajustar a importação.
DECISÃO DO DONO 11/11 ~20:45 (Missão 01): o Omie deixa de ser usado pelas pessoas; TUDO o que hoje é feito no Omie passa a ser
feito no SGO+, que grava/lê no Omie pela API (Omie = motor de fundo: nota fiscal e contabilidade). Módulo Financeiro do SGO+ =
interface única (receber, pagar, cobrança, conciliação, emissão de nota pela API do Omie). Antes de construir: reconciliar as duas
implementações Omie (rota /financeiro publicada x módulo local output/omie-financeiro não publicado) e fazer a segurança (sim do dono).
Segurança 11/11 ~20:40 (sim do dono): backups protegidos (D-03): 10.233 arquivos de /opt/metrolabs/backup fechados (o-rwx), pasta 711,
vigia.sh reaplica a cada 5 min (cópia vigia.sh.antes-protecao-20261111); SGO+ lê só status/vigia/restauro. Disco 85%->77%
(docker builder prune, sem apagar imagens/dados). Próximos: chaves cifradas (D-04), senhas antigas (D-05).


RH360 R26 publicada/verificada em 11/11/2026 20:52 BRT: base atual
sha256:9f7b136eb00e42bfea72604f8d6bfdd508c44b852e47704c3f37bfa93f49bc92, tag metrolabs/rh:historico-profissional-paginado-20261111-r26.
Hist?ricos profissionais paginados, com busca, per?odo e consulta consistente. Quatro arquivos sobreR25, dois servi?os e duas interfaces.
9testes na imagem e p?gina completa nativa com ambas consultas:PASS.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evid?ncias/limites: output/rh360-20261111-r26/PUBLICADO_RH360_R26_20261111.txt.
Preservar m?dulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplin?rios/ponto ou aprova??o/v?nculo inventado.


RH360 R27 publicada/verificada em 11/11/2026 20:59 BRT: base atual
sha256:f1f49e0b99f682d9af09625bbf648a768ba0d4846194ad10ae380a80eae641af, tag metrolabs/rh:tipos-documentais-assistidos-20261111-r27.
Sugestões opcionais de tipos documentais no envio individual e em fila. Uma interface alterada sobreR26; backend intacto.
6testes na imagem + página nativa completa/envio individual/fila:PASS.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidências/limites: output/rh360-20261111-r27/PUBLICADO_RH360_R27_20261111.txt.
Preservar módulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplinários/ponto ou aprovação/vínculo inventado.


RH360 R28 publicada/verificada em 11/11/2026 21:07 BRT: base atual
sha256:2eae083fc52b1c968395642e79f1db7d10ef6ef891766f5a2b6b6f99ed84208d, tag metrolabs/rh:csv-novos-colaboradores-20261111-r28.
Cadastro assistido de novos colaboradores pelo CSV existente. Uma interface CSV alterada sobreR27; editor e backend intactos.
18testes na imagem + pagina nativa/criacao/conflito/reconciliacao:PASS.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidências/limites: output/rh360-20261111-r28/PUBLICADO_RH360_R28_20261111.txt.
Preservar módulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplinários/ponto ou aprovação/vínculo inventado.


RH360 R29 publicada/verificada em 11/11/2026 21:14 BRT: base atual
sha256:3e9e7ba3048048d60a15e1427e9aa17375e3f675b625e20b78521ceb4028aca9, tag metrolabs/rh:historicos-sob-consulta-20261111-r29.
Historicos profissionais recolhiveis e consultados somente ao abrir. Uma interface sobreR28; backend/consulta original intactos.
Pagina nativa completa,11verificacoes focadas:PASS. Sem suites repetidas.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r29/PUBLICADO_RH360_R29_20261111.txt.
Preservar modulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplinarios/ponto ou aprovacao/vinculo inventado.
SGO+ — 11/11/2026 ~21:00: base atual metrolabs/sgo:segredos-cofre-20261111 (sha256:41744f00…): chaves e sessões cifradas (D-04),
146 itens, 0 em claro. Fonte: output/lote-20261111q/cand (= produção). Chave do cofre: cópia no PC do dono (%USERPROFILE%\.metrolabs_cofre).
SEM a chave do cofre as integrações não abrem: nunca recriar /opt/metrolabs/sgo/cofre/chave. Ver PUBLICADO_SEGREDOS_COFRE_20261111.txt.


RH360 R30 publicada/verificada em 11/11/2026 21:23 BRT: base atual
sha256:1da447f3e9e2b5f78cabd5533e6d9d24a92f83946dd44d050be44e384ebc9d7a, tag metrolabs/rh:recuperacao-local-dossie-20261111-r30.
Recuperacao local do resumo, estrutura e documentos privados. Quatro interfaces sobreR29; backend e gravacoes intactos.
Pagina nativa completa,10cenarios focados e botoes44px:PASS. Backend nao repetido.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r30/PUBLICADO_RH360_R30_20261111.txt.
Preservar modulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplinarios/ponto ou aprovacao/vinculo inventado.
Catálogo 11/11 ~21:30 (dono): QUA-001 autoclave R$ 4.500; QUA-002 termo R$ 4.800; 33 itens antigos do CRM de qualificação arquivados
(output/catalogo-20261111). Custos de viagem por estado (GO 2,50/150/100; RJ 3,00/200/100; km pela origem, hotel/alimentação pelo destino),
banco de rotas com km+pedágio automático, trava de dados completos e escopo por IA validado pelo vendedor: especialista em
output/comercial-dados-completos/cand (copiado de lote-20261111q = produção). Não publicado ainda.


RH360 R31 publicada/verificada em 11/11/2026 21:42 BRT: base atual
sha256:842daf1a3d198532e186c206c30199d886e0cf11de4479e90130fc8b1c4b9fcf, tag metrolabs/rh:fluxo-preparacao-equipe-20261111-r31.
Roteiro integrado de preparacao da equipe e atalhos documentais. Uma interface da central sobreR30; backend e modulos existentes intactos.
Pagina nativa completa,9verificacoes focadas:PASS. Sem suites repetidas.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r31/PUBLICADO_RH360_R31_20261111.txt.
Preservar modulos anteriores. Aceite operacional real adiado.
Sem efeitos financeiros/disciplinarios/ponto ou aprovacao/vinculo inventado.
SGO+ — 11/11/2026 ~22:15: base atual metrolabs/sgo:caixa-diretoria-20261111 (sha256:7ea7a01b…): pedido de aprovação que só a Diretoria
aprova vai para a Diretoria na Caixa. Fonte: output/lote-20261111r/cand (= produção). O especialista do Comercial (output/comercial-dados-completos)
copiou de lote q: ao publicar, mesclar só o diff dele sobre lote r (atenção SGO_Comercial_Painel.js).


RH360 R32 publicada/verificada em 11/11/2026 22:08 BRT: base atual
sha256:abc000dbeb78d751e55877847eaab60a4897a34f971e1991803b4f1e2e08e504, tag metrolabs/rh:estrutura-csv-assistida-20261111-r32.
Preenchimento assistido dos catalogos da estrutura por CSV. Tres interfaces sobreR31; backend e gravacao existentes intactos.
14testes na imagem +12verificacoes de pagina nativa:PASS.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r32/PUBLICADO_RH360_R32_20261111.txt.
Preservar modulos anteriores.18pessoas e0catalogos reais preservados.
Aceite real adiado. Sem efeitos financeiros/disciplinarios/ponto/CCT.
SGO+ — 11/11/2026 ~23:00: base atual metrolabs/sgo:comercial-dados-completos-20261111 (sha256:84c5c993…): trava de dados completos,
pedido ao cliente (/dados-cliente/), escopo por IA validado, viagem por UF + banco de rotas, intermediário. Fonte: output/lote-20261111s/cand
(= produção). Etapa 2 (assistente em etapas e IA de plaqueta/insumos) em output/comercial-etapa2 (copiado de lote s).


RH360 R33 publicada/verificada em 11/11/2026 22:42 BRT: base atual
sha256:531979e7cbdb0f79a2d293247ec9870352dfeffed3dd9562845ce880ba54dc53, tag metrolabs/rh:vinculos-csv-assistidos-20261111-r33.
Vinculos organizacionais assistidos por CSV para colaboradores existentes. Quatro interfaces sobreR32; backend intacto.
33testes na imagem +16cenarios nativos:PASS; temporarios removidos.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r33/PUBLICADO_RH360_R33_20261111.txt.
18pessoas e0catalogos/vinculos reais preservados. Aceite real adiado.
Preservar modulos anteriores; sem efeitos financeiros/disciplinares/ponto/CCT.


RH360 R34 publicada/verificada em 11/11/2026 22:52 BRT: base atual
sha256:ca301845e4e02f56c93be423550bfd81fa4b02391c49642fdc4dac4bd4fd3acb, tag metrolabs/rh:modelos-identificados-equipe-20261111-r34.
Modelos CSV identificados dos colaboradores autorizados. Duas interfaces sobreR33; backend intacto.
12testes na imagem +14cenarios nativos:PASS; temporarios/downloads removidos.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r34/PUBLICADO_RH360_R34_20261111.txt.
18pessoas e0catalogos/vinculos reais preservados. Aceite real adiado.
Preservar modulos anteriores; sem efeitos financeiros/disciplinares/ponto/CCT.


RH360 R35 publicada/verificada em 11/11/2026 23:04 BRT: base atual
sha256:5290481859681adf0fb98ab1b84dd8a75a70b1e788624aafac2a61d35e81a72d, tag metrolabs/rh:conferencia-conteudo-documental-20261111-r35.
Conferencia local de conteudo documental repetido. UmHTML sobreR34; submit/backend intactos.
11testes na imagem +15cenarios nativos:PASS; temporarios removidos.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r35/PUBLICADO_RH360_R35_20261111.txt.
18pessoas e0documentos reais preservados. Aceite real adiado.
Preservar modulos anteriores; sem efeitos financeiros/disciplinares/ponto/CCT.


RH360 R36 publicada/verificada em 11/11/2026 23:18 BRT: base atual
sha256:b24eeae8e640921b9ea5100a719c8964b49441aec194f8209ac45f5491f19e88, tag metrolabs/rh:contexto-colaborador-documentos-20261111-r36.
Contexto do colaborador nas telas documentais. UmHTML sobreR35; payload/backend intactos.
8testes na imagem +15cenarios nativos:PASS; temporarios removidos.
Backup restaurado,693hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r36/PUBLICADO_RH360_R36_20261111.txt.
18pessoas e0documentos reais preservados. Aceite real adiado.
Preservar modulos anteriores; sem efeitos financeiros/disciplinares/ponto/CCT.
SGO+ — 11/11/2026 ~23:22: base atual metrolabs/sgo:comercial-proposta-guiada-20261112 (sha256:cc6877c4…): proposta guiada (etapa 2).
Fonte: output/lote-20261111t/cand (= produção). Pente fino em produção 46/47 OK. Relatório da noite: output/RELATORIO_NOITE_20261111.md.
Nenhum especialista em andamento.


RH360 R37 publicada/verificada em 12/11/2026 00:05 BRT: base atual
sha256:0872439516c6ac4aee69f2013089578a9fbcedbf2c68f39b75f62fed1b842fa1, tag metrolabs/rh:cadastro-pessoal-privado-20261111-r37.
Cadastro pessoal privado estruturado com concessoes nominais independentes.7fontes sobreR36:4alteradas+3novas.
20testes na imagem +21cenarios nativos:PASS; temporarios removidos.
Backup restaurado,696hashes/health/GET/readonly:PASS. Sem ensaio prolongado.
Evidencias/limites: output/rh360-20261111-r37/PUBLICADO_RH360_R37_20261112.txt.
18pessoas preservadas;0registros/grants pessoais reais. Aceite real adiado.
Typecheck global nao limpo:18declaracoesMJS ja ausentes na baseR36;
servidorTS/JS/map inalterados. Ver typescript-baseline.json.
Preservar modulos anteriores; sem efeitos financeiros/disciplinares/ponto/CCT.


RH360 R38 publicada/verificada: sha256:d6f96cf1146e7599e0b9b0e721d28e576fc403fe19243ead6026e64f9d521215
Tag metrolabs/rh:contratos-tipos-nativos-20261112-r38
38declaracoes de tipos novas;696pins anteriores inalterados;734pins atuais.
Typecheck sem erros,53JS compilados em temporario removido,18exports conferidos.
Sem mudanca funcional nem dados/grants reais. Base atual preservaR37 e anteriores.
Evidencias:output/rh360-20261112-r38/PUBLICADO_RH360_R38_20261112.txt
Aceite real adiado;CCT/Financeiro/projeto integral abertos.


RH360 R39 publicada/verificada: sha256:1566d6c14148c51c9c92c19a23ec5e7f226283195f840c7be90ce2a0924b3b7e
Tag metrolabs/rh:preenchimento-pessoal-assistido-20261112-r39
Resumo opcional de identificacao/emergencia somente apos consulta autorizada.
AtalhosWRITE abrem editor/focam primeiro vazio; nenhuma consulta adicional.
UmaHTML,6modelos+8checks nativos;734pins/backup/readonly verificados.
Temporarios removidos. Evidencias:output/rh360-20261112-r39/PUBLICADO_RH360_R39_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R40 publicada/verificada: sha256:0c5582c889119781b3ad4ae2d27e618977c57cb5a3581fe3e705b5832fdc0f44
Tag metrolabs/rh:comparacao-revisoes-pessoais-20261112-r40
Comparacao de campos historicos com referencia nominal ja consultada.
Revisao/identidade divergente exige atualizar;semRPCextra ou restauracao.
UmaHTML,7modelos+8checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r40/PUBLICADO_RH360_R40_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R41 publicada/verificada: sha256:cf64cebe2561cb53fb42d7bddac84e99d1d3083a383959620c89a70204c570d3
Tag metrolabs/rh:previa-local-imagem-documental-20261112-r41
PreviaPNG/JPEGlocal opcional no editor documental,semRPCou upload.
Troca/ocultar/fechar revogamBlobURL;individual/versao/fila preservados.
UmaHTML,3modelos+9checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r41/PUBLICADO_RH360_R41_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R42 publicada/verificada: sha256:5c37f76cd0667be320aaf80625e83990079efa3c3dc7e79d6871cb7fcbf5f74d
Tag metrolabs/rh:atualizacao-lista-pendencias-20261112-r42
Atualizacao explicita da lista de pendencias preserva filtros e limpa
conferencias anteriores somente no sucesso.Falha preserva snapshot comaviso.
UmaHTML,3modelos+9checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r42/PUBLICADO_RH360_R42_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R43 publicada/verificada: sha256:8f63b69d6d5077cecebfed1562a0e4c241a18aa3cc0961106b5a001fd84da69d
Tag metrolabs/rh:roteiro-cadastro-pessoal-20261112-r43
Cadastro pessoal integrado a navegacao,atalhos e roteiro da equipe.
Atalhos apenas focamsecao,semconsulta pessoal ou concessao.
UmaHTML,7checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r43/PUBLICADO_RH360_R43_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R44 publicada/verificada: sha256:8ef56368818464e9e3f4129a3e2ba6de4f305c530de3f724eb157f39a94c48c2
Tag metrolabs/rh:identificacao-pendencias-cadastro-20261112-r44
Cards e busca da central de pendencias incluemID/email ja autorizados.
Homonimos abrem dossie peloIDestavel;nenhumRPCextra por busca.
UmaHTML,3modelos+8checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r44/PUBLICADO_RH360_R44_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R45 publicada/verificada: sha256:ff3a5795652f397f42a93d012b6a4b07dd670d56fe85e04a6d294883581afba3
Tag metrolabs/rh:carregamento-isolado-sessao-20261112-r45
Contador de loadingporgeracao de sessao;clear/troca nao aguardapedidoantigo,
respostaantiga naodesconta operacaoatual.Escritasatuais/guardas preservadas.
2HTML,7modelos+8checks nativos;734pins/backup/readonly conferidos.
Preparacaoatomicaexercitada.Temporarios removidos.Evidencias:output/rh360-20261112-r45/PUBLICADO_RH360_R45_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.


RH360 R46 publicada/verificada: sha256:309f9ae8325ead944685ed5d8296355b69c0c65f0de170d8bea56597180a6fb8
Tag metrolabs/rh:identificacao-arquivos-equipe-20261112-r46
Arquivos dos colaboradores mostra/buscaID/email ja autorizados.
Homonimos distinguiveis;semconsultaprivadaautomatica ougrant.
UmaHTML,8checks nativos;734pins/backup/readonly conferidos.
Temporarios removidos. Evidencias:output/rh360-20261112-r46/PUBLICADO_RH360_R46_20261112.txt
18pessoas preservadas;nenhum dado/grant real. Aceite real adiado.
SGO+ — 12/11/2026 ~15:20: base atual metrolabs/sgo:vinculos-chamados-20261112 (sha256:186b3410…), sobre comercial-proposta-guiada.
Vínculos: chamado/O.S. cancelado, encerrado ou excluído não trava mais a transferência de equipamento (caso Matheus, IMED -> Guima).
Fonte: lote-20261111t/cand + 2 arquivos de output/vinculos-chamados-20261112/cand. Evidência: PUBLICADO_VINCULOS_CHAMADOS_20261112.txt.
SGO+ — 12/11/2026 ~15:50: base atual metrolabs/sgo:orcamento-pagador-20261112 (sha256:60f5f627…), sobre vinculos-chamados.
Assistência: "Faturar para" no orçamento (outro CNPJ paga; equipamento fica no dono). Evidência: output/orcamento-pagador-20261112/PUBLICADO_ORCAMENTO_PAGADOR_20261112.txt.
Publicação em camada: conferir permissão de /app/legado na imagem (app roda como pwuser) antes do up; usar build --no-cache se mudar permissão.
SGO+ — 12/11/2026 ~16:30: base atual metrolabs/sgo:comercial-equip-item-20261112 (sha256:34f6decb…), sobre orcamento-pagador.
Comercial: equipamento do item não some mais e itens com equipamentos identificados diferentes não são "repetidos" (caso Ricardo).
SGO+ — 12/11/2026 ~17:35: base atual metrolabs/sgo:campo-os-20261112 (sha256:6a82126d…), sobre comercial-equip-item.
Campo: abrir O.S. em campo voltou a funcionar (hora is not defined) e fica com quem abriu; Meu dia com abas Em aberto/Agenda/Kanban/Concluídas.
SGO+ — 12/11/2026 ~17:48: base atual metrolabs/sgo:campo-excluir-20261112 (sha256:8da3b617…), sobre campo-os. Técnico exclui O.S. que abriu (antes de começar); aviso de O.S. em dobro na mesma unidade.
SGO+ — 12/11/2026 ~18:05: base atual metrolabs/sgo:campo-fotos-20261112 (sha256:86c32d30…), sobre campo-excluir. Campo: fotos do celular (várias de uma vez) também nas perguntas do checklist.
SGO+ — 12/11/2026 ~19:08: base atual metrolabs/sgo:pente-assistencia-20261112 (sha256:f0000e6e…), sobre campo-fotos. Pente fino Assistência/Campo (18 correções) + aviso de versão nova (SGO_VersaoTelas.js).
Em seguida: especialista do painel de ganhos dos vendedores (comissão: valor recebido, faixa cheia, mensal, vendedor/Financeiro/Diretoria).
SGO+ — 12/11/2026 ~19:42: base atual metrolabs/sgo:ganhos-vendedores-20261112 (sha256:1ab843bd…), sobre pente-assistencia. Ganhos dos vendedores etapa 1 (Financeiro lança recebimento; Omie automático = próxima etapa).
SGO+ — 13/11/2026 ~00:15: base atual metrolabs/sgo:orcamento-termos-20261113 (sha256:41c2cca8…), sobre ganhos-vendedores. Orçamento da Assistência (OA) com as condições, responsabilidades e Termos e condições da Proposta comercial, congelados na emissão. Fonte: output/orcamento-termos-20261113/cand (= produção).
SGO+ — 13/11/2026 ~00:18: base atual metrolabs/sgo:orcamento-termos2-20261113 (sha256:9a8ba7a6…), sobre orcamento-termos. OA: "proposta"->"orçamento" fora das cláusulas (termos intactos). Fonte: output/orcamento-termos2-20261113/cand (= produção).
SGO+ — 13/11/2026 ~01:21: base atual metrolabs/sgo:relatorio-campo-20261113 (sha256:a0927812…), sobre orcamento-termos2. Relatório da O.S. e app de campo: resultado/liberação obrigatórios, medições, rastreabilidade enxuta, revisar português com IA. Fonte: output/relatorio-campo-20261113/cand (= produção). Em andamento: output/comercial-viagem-20261113 (copiado de orcamento-termos2 ANTES deste pacote: arquivos Comercial, sem sobreposição).
SGO+ — 13/11/2026 ~01:35: base atual metrolabs/sgo:comercial-viagem-20261113 (sha256:f6b20318…), sobre relatorio-campo. Comercial: dicas da viagem pela regra do estado, motivo para valor abaixo da regra, conferência do km, "Aguardando aprovação: motivo". Fonte: relatorio-campo cand + 9 arquivos de output/comercial-viagem-20261113/cand.
SGO+ — 13/11/2026 ~14:20: base atual metrolabs/sgo:padroes-filtros-20261113 (sha256:30aa2819…), sobre comercial-viagem. Padrões: filtros travavam com TAG numérica (2 padrões); revisão do módulo inteiro. Fonte: comercial-viagem cand + 6 arquivos de output/padroes-filtro-20261113/cand. Evidência: PUBLICADO_PADROES_FILTROS_20261113.txt.
Frota 13/11 ~13:00 (dono): bloqueio da partida e integração iTracker DESLIGADOS (RASTREADOR_BLOQUEIO_LIGADO=0, RASTREADOR_LIGADO=0, 4 veículos em DESLIGADO). Não religar sem pedido. output/frota-bloqueio-20261113/.
SGO+ — 13/11/2026 ~15:25: base atual metrolabs/sgo:comercial-deslocamento-20261113 (sha256:b2e48d26…), sobre padroes-filtros. Comercial: diluído não some mais com o deslocamento (PROP-0071). Fonte: output/comercial-deslocamento-20261113/cand (= produção). Etapas 2 (incentivo por O.S.) e 3 (legendas) em seguida, na mesma linha.
SGO+ — 13/11/2026 ~15:58: base atual metrolabs/sgo:comercial-incentivo-20261113 (sha256:96a1e194…), sobre comercial-deslocamento. Incentivo por O.S. na proposta + conferência na Conduta. Fonte: output/comercial-incentivo-20261113/cand (= produção). Em andamento: padrões com várias faixas (output/padroes-faixas-20261113, copiado de comercial-deslocamento: mesclar só o diff dele). Etapa 3 do Comercial (legendas) depois.
SGO+ — 13/11/2026 ~16:47: base atual metrolabs/sgo:padroes-faixas-20261113 (sha256:7f7f7c36…), sobre comercial-incentivo. Padrões com tabela de pontos (PONTOS_JSON) usada no certificado. Fonte: comercial-incentivo cand + 13 arquivos de output/padroes-faixas-20261113/cand.
SGO+ — 13/11/2026 ~17:20: base atual metrolabs/sgo:comercial-legendas-20261113 (sha256:b91108a6…), sobre padroes-faixas. Legendas, cenários e guia da viagem na proposta. Fonte: output/comercial-legendas-20261113/cand (= produção). Nenhum especialista em andamento.
SGO+ — 13/11/2026 ~18:33: base atual metrolabs/sgo:comercial-diaria-20261113 (sha256:5677582c…), sobre comercial-legendas. Sem diária a colaboradores (linha sempre "não se aplica"; PROP-0071 perde os R$ 1.760 ao recalcular) e veículo locado como "hoje não usado". Fonte: output/comercial-diaria-20261113/cand (= produção). Nenhum especialista em andamento.
SGO+ — 13/11/2026 ~21:45: base atual metrolabs/sgo:comercial-guia-tela-20261113 (sha256:9c97e155…), sobre comercial-diaria. Aba "Guia da viagem: o que significa cada linha e o que fazer" no fim do bloco da viagem da proposta. Fonte: output/comercial-guia-tela-20261113/cand (= produção).
SGO+ — 13/11/2026 ~22:50: base atual metrolabs/sgo:pgtpop-redesenho-20261113 (sha256:b99497f6…), sobre comercial-guia-tela. PGT e POP redesenhado (5 etapas, guia na tela). Fonte: output/pgtpop-redesenho-20261113/cand (= produção).
SGO+ — 14/11/2026 madrugada: base atual metrolabs/sgo:conduta-foto-20261114 (sha256:45e8eb0a…), sobre pgtpop-redesenho. Ocorrência da Conduta no celular: câmera ou galeria. Em andamento: output/pgtpop-correcoes-20261114 (copiado de pgtpop-redesenho ANTES: levar JS_Core.html e SGO_Ajuda_Conduta.js desta publicação).
SGO+ — 14/11/2026 ~00:35: base atual metrolabs/sgo:pgtpop-correcoes-20261114 (sha256:3c979043…), sobre conduta-foto. PGT/POP: busca de documentos, motivo de revisão, trava, limpeza do texto da IA, título do catálogo. Fonte: output/pgtpop-correcoes-20261114/cand (= produção). Auditoria: output/pgtpop-auditoria-20261113.
SGO+ — 14/11/2026 ~09:21: base atual metrolabs/sgo:pgtpop-suspensos-20261114 (sha256:91285ae2…), sobre pgtpop-correcoes. Dono: todos os PGT/POP existentes serão refeitos; suspensos (selo, sem envio, fora do PGT novo) até PGTPOP_GERACAO_NOVA_DESDE (vazio = tudo). Ao publicar a geração revisada, gravar o instante nessa variável. Fonte: output/pgtpop-refacao-20261114/cand (= produção). Em andamento: especialista técnico (output/pgtpop-refacao-20261114/especialista, só leitura); depois desenvolvedor na mesma cand.
SGO+ — 14/11/2026 ~10:38: base atual metrolabs/sgo:pgtpop-fichas-20261114 (sha256:c2993c3d…), sobre pgtpop-suspensos. Geração do PGT/POP refeita pelas fichas do especialista (SGO_PgtPop_Fichas.js novo; perguntas do estabelecimento; normas por documento). Corte PGTPOP_GERACAO_NOVA_DESDE='2026-11-14T10:48:00': antes = suspenso. Ensaio com IA real sem gravar: POP018, POP022, PGTS ok. Fonte: output/pgtpop-refacao-20261114/cand (= produção). Evidência: PUBLICADO_PGTPOP_FICHAS_20261114.txt.
SGO+ — 14/11/2026 ~10:58: base atual metrolabs/sgo:conduta-motivo-20261114 (sha256:81e112c1…), sobre pgtpop-fichas. Conduta no celular mostra o motivo da recusa do servidor (prazo vencido) em vez de 'Verifique a conexão'. Fonte: output/conduta-motivo-20261114/cand (= produção; inclui o PGT/POP de pgtpop-refacao).
SGO+ — 14/11/2026 ~23:21: base atual metrolabs/sgo:financeiro-omie-20261114 (sha256:3330c214…), sobre conduta-motivo. Painel financeiro (Omie pela API): consultas reais OK; caixas FIN_OMIE_* (lote 3); GRAVAÇÃO NO OMIE DESLIGADA (OMIE_GRAVACAO_LIGADA, Chaves e senhas > Omie, só o dono) até a 1ª operação acompanhada. Limites do Omie tratados (memória 60 s, 5 s entre chamadas do mesmo método, sem repetição automática). Fonte: output/financeiro-20261114/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_OMIE_20261114.txt.
SGO+ — 14/11/2026 ~23:30: base atual metrolabs/sgo:financeiro-agenda-20261115 (sha256:945c2b26…), sobre financeiro-omie. Agenda de vencimentos (7/15/30 dias, nomes do Omie) na Visão geral do Painel financeiro; gravação no Omie segue desligada. Fonte: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_AGENDA_20261115.txt.
SGO+ — 14/11/2026 23:36: base atual metrolabs/sgo:ganhos-omie-20261115 (sha256:fa003bf6…), sobre financeiro-agenda. Ganhos dos vendedores: recebimentos do Omie como sugestões (CNPJ -> cliente -> proposta aprovada), lançamento pelo formulário com origem OMIE e sem duplicar. Fonte: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_GANHOS_OMIE_20261115.txt.
SGO+ — 14/11/2026 23:39: base atual metrolabs/sgo:financeiro-pagina-antiga-20261115 (sha256:65b6e961…), sobre ganhos-omie. /financeiro antigo virou aviso (410 na consulta). Legado igual a ganhos-omie (output/financeiro-20261115/cand); servidor: node/dist e node/src. Evidência: PUBLICADO_PAGINA_ANTIGA_20261115.txt.
SGO+ — 14/11/2026 23:45: base atual metrolabs/sgo:financeiro-pedidos-20261115 (sha256:c4470129…), sobre financeiro-pagina-antiga. Painel financeiro > Pedidos aprovados: prepara a conta a receber no Omie a partir da proposta (cliente pelo CNPJ, referência SGO-<proposta>); gravação segue desligada. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_PEDIDOS_20261115.txt.
SGO+ — 14/11/2026 23:48: base atual metrolabs/sgo:financeiro-vencidos-20261115 (sha256:29fc3df1…), sobre financeiro-pedidos. Vencidos a receber por cliente na Visão geral. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_VENCIDOS_20261115.txt.
SGO+ — 14/11/2026 23:53: base atual metrolabs/sgo:financeiro-posicao-20261115 (sha256:52e704ff…), sobre financeiro-vencidos. Posição de hoje (saldo das contas + fluxo 10 dias do Omie) e vencidos por cliente pelo SALDO EM ABERTO. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_POSICAO_20261115.txt.
SGO+ — 14/11/2026 23:56: base atual metrolabs/sgo:financeiro-ordem-20261115 (sha256:015919f9…), sobre financeiro-posicao. Visão geral: agenda depois do resumo (o Omie recusa ListarMovimentos simultâneo). Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_ORDEM_20261115.txt.
SGO+ — 15/11/2026 00:00: base atual metrolabs/sgo:financeiro-nomes-20261115 (sha256:1e1a198b…), sobre financeiro-ordem. Nomes de cliente/fornecedor nas listas do Painel financeiro. Manual: docs/MANUAL_PAINEL_FINANCEIRO.md; roteiro da 1ª gravação: output/financeiro-20261115/ROTEIRO_PRIMEIRA_GRAVACAO_OMIE.md. Fonte legado: output/financeiro-20261115/cand (= produção).
SGO+ — 15/11/2026 00:04: base atual metrolabs/sgo:financeiro-vinculo-20261115 (sha256:deb3ff21…), sobre financeiro-nomes. Pedidos aprovados registra/mostra a conta a receber criada pelo SGO+ (aba FIN_OMIE_PEDIDOS; só com a gravação ligada). Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_VINCULO_20261115.txt.
SGO+ — 15/11/2026 00:07: base atual metrolabs/sgo:financeiro-abas-20261115 (sha256:ac60b5cb…), sobre financeiro-vinculo. Varredura das 12 abas: Provisões sem randomUUID em http; aba aberta destacada. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_ABAS_20261115.txt.
SGO+ — 15/11/2026 00:14: base atual metrolabs/sgo:poderes-lote3-20261115 (sha256:1b61228f…), sobre financeiro-abas. Acessos por caixas LOTE 3 (Financeiro em Compras) ligado, espelho, 0 divergências em 23 contas; FIN_VER_CONTAS/FIN_CONCILIAR_BANCO desligadas. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_LOTE3_20261115.txt e LOTE3_IMPLEMENTACAO.md.
SGO+ — 15/11/2026 00:26: base atual metrolabs/sgo:financeiro-revisao-20261115 (sha256:e1fd4afa…), sobre poderes-lote3. Correções da revisão (Ganhos ref por pagamento, espera de 1 min na confirmação, vínculo exato). Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_REVISAO_20261115.txt.
SGO+ — 15/11/2026 00:31: base atual metrolabs/sgo:financeiro-fila-20261115 (sha256:a63fc9fa…), sobre financeiro-revisao. Fila na tela para consultas de movimentos do Omie. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_FILA_20261115.txt.
SGO+ — 15/11/2026 00:35: base atual metrolabs/sgo:financeiro-resultado-20261115 (sha256:0b482e9a…), sobre financeiro-fila. Aba Resultado do mês (regime de caixa por categoria do Omie). Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_RESULTADO_20261115.txt.
SGO+ — 15/11/2026 00:38: base atual metrolabs/sgo:financeiro-faixas-20261115 (sha256:f810538b…), sobre financeiro-resultado. Faixas de atraso e CSV no Painel financeiro. Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_FAIXAS_20261115.txt.
SGO+ — 15/11/2026 00:54: base atual metrolabs/sgo:financeiro-revisao2-20261115 (sha256:3ed18d84…), sobre financeiro-faixas. Correções da 2ª revisão (fila, CSV, Ganhos ref antiga, 1 min após ocupado). Fonte legado: output/financeiro-20261115/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_REVISAO2_20261115.txt.
SGO+ — 16/11/2026 ~11:13: base atual metrolabs/sgo:financeiro-sigilo-20261116 (sha256:4b9604c6…), sobre financeiro-revisao2. SIGILO do Financeiro (dono): só admin, charles e wanessa (lista OMIE_SIGILO_CONTAS; só o dono altera, na aba Sigilo e acessos); trava acima das caixas (exceção em Acessos não abre); registro FIN_OMIE_ACESSOS sem valores; tela some ao sair/10 min. Fonte legado: output/financeiro-20261116/cand (= produção). Evidência: PUBLICADO_FINANCEIRO_SIGILO_20261116.txt.
SGO+ — 16/11/2026 ~11:29: base atual metrolabs/sgo:financeiro-ficha-cliente-20261116 (sha256:1d1d2e2a…), sobre financeiro-sigilo. Painel financeiro > Ficha do cliente (cobrança, só leitura; cliente inativo no Omie pelo valor do documento). Fonte legado: output/financeiro-20261116/cand2 (= produção). Evidência: PUBLICADO_FINANCEIRO_FICHA_CLIENTE_20261116.txt.

- 16/11/2026 ~13:30: PENTE FINO do sigilo do Financeiro publicado (metrolabs/sgo:financeiro-pente-fino-20261116, fonte output/financeiro-20261116/cand3): lista de sigilo vale também para Conferência do Financeiro em Compras, faturas, A pagar, cartões (limite), Caju, carga/conferência de viagem e relatório diário (só contagem); guia por aba e explicação de cada campo no Painel (JS_Omie_Ajuda.html); GRAVAÇÃO NO OMIE LIGADA por ordem do dono. Ver output/financeiro-20261116/PUBLICADO_FINANCEIRO_PENTE_FINO_20261116.txt.

- 16/11/2026 ~19h: CONDUTA "Ver relato" publicado (metrolabs/sgo:conduta-relato-20261116, base financeiro-pente-fino-20261116, fonte output/conduta-20261116/cand): botão em toda linha, ficha com relato/quem registrou/foto/histórico; envolvido não recebe quem registrou nem o histórico na lista (CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU=SIM muda; entra em Chaves com a publicação do Financeiro). Verificado: admin, charles, matheusgodoi abrem 15/15 relatos. Relatório: output/conduta-20261116/RELATORIO_CONDUTA_RELATO.md.

- 16/11/2026 noite: FINANCEIRO COMPLETO publicado (metrolabs/sgo:financeiro-completo-20261116, fonte output/financeiro-20261116/cand4): B1-B9, cadastro cliente/fornecedor no Omie, NF-e compra/NFS-e -> contas a pagar, explicações em Compras/Caju, marca d agua, design, configurações (Regras do Financeiro, alçadas, retenções, destino NF-e, Conduta). CNPJ da empresa gravado. Ver PUBLICADO_FINANCEIRO_COMPLETO_20261116.txt. Próximo: onda 2 (ESPEC_ONDA2_FINANCEIRO.md).

- 16/11/2026 ~21h: ONDA 2 E1-E5 publicada (metrolabs/sgo:financeiro-onda2-indicadores-20261116, fonte output/financeiro-20261116/cand5): atividades do Financeiro só para a lista de sigilo; assistente geral sem manuais do Financeiro; foto diária 06:00 (FIN_FOTO_*); aba Indicadores (20 cartões, 8 gráficos); nota de saúde 0-100 (FIN_SAUDE_*); aprovação do Painel só dono+Diretoria. Suíte 2245/71. Verificado: wanessa abre (sem foto até a 1a rotina), bruna recusada. Relatório: especialistas/RELATORIO_ONDA2_E1E5.md.

- 16/11/2026 ~22h: APROVAÇÃO SÓ DIRETORIA publicada (metrolabs/sgo:financeiro-aprovacao-diretoria-20261116, fonte cand6): APROVACAO_SO_DIRETORIA padrão SIM em Compras, Depósito de viagem e Painel. Suíte 2252/71. ONDE PARAMOS: output/financeiro-20261116/ONDE_PARAMOS_20261116_NOITE.md.

- 16/11/2026 ~23h: ENVIAR ACESSO AO CLIENTE + PDF NO BATE-PAPO publicado (metrolabs/sgo:acesso-cliente-chat-pdf-20261116, fonte output/financeiro-20261116/cand7): convite com link de uso único (72 h) reaproveitando o "Esqueci minha senha"; caixa USUARIOS_CLIENTES_ENVIAR_ACESSO (dono, Admin, Diretoria, Gestor — Bruna pode); registro SYS_ACESSO_CLIENTE_ENVIOS; bate-papo aceita PDF/DOCX/XLSX até 5 MB (RH360 não mexido). Verificado: URL_PUBLICA=https://sgo.metrolabs.com.br, cota de e-mail 1000, bruna/charles podem, técnico não. Relatório: output/acesso-cliente-20261116/RELATORIO.md. Piloto do Portal do Cliente: CENTRAL DE REPROCESSAMENTO DE MATERIAIS LTDA (CNPJ 01129614000130).

RH360 R47 publicada em 16/11/2026 21:20 BRT: sha256:a5af35d7897552a9f324581a3fd79045baa37223fc4e0b0d998bde9c287bcbcd; metrolabs/rh:atualizacao-lista-arquivos-20261112-r47. Atualiza??o expl?cita da lista de arquivos da equipe, sem consulta privada autom?tica. 2 testes e 9 checks da página completa PASS; backup real restaurado, 734 pins/saúde/GET conferidos. Evid?ncia: output/rh360-20261112-r47/PUBLICADO_RH360_R47_20261116.txt. Nova jornada autorizada at? 17/11/2026 05:00 BRT. Preservar base; aceite operacional real continua adiado.

RH360 R48 publicada/verificada em 16/11/2026 21:36 BRT: sha256:a250b313977230e7e3e419d6386d280da4be3279f785447879b26bda9ce8b2d8; metrolabs/rh:formacao-declarada-20261116-r48. Formação declarada administrativa no dossiê com sess?o SGO, permissões RH, histórico privado/CAS/recibo. Typecheck, 13 checks página completa e PostgreSQL/restaura??o PASS; 742 pins. Sem diploma validado ou efeitos legais. Evid?ncia: output/rh360-20261116-r48/PUBLICADO_RH360_R48_20261116.txt. Aceite operacional real adiado. Próxima frente: per?odo informado D08; não remover guardas do fluxo sintético antigo.

RH360 R49 publicada/verificada em 16/11/2026 21:47 BRT: sha256:8b3a26f3211d01b18b70a5382ca53fb0450876a0b67b7c08b39addc5548f904f; metrolabs/rh:periodos-informados-20261116-r49. Períodos informados administrativos no dossiê; sem concessão/efeito legal/médico. Typecheck, 12 checks página completa e PostgreSQL/restauração PASS; 750 pins. Evidência: output/rh360-20261116-r49/PUBLICADO_RH360_R49_20261116.txt. Aceite operacional real adiado. Refinar novo episódio em branco antes de avançar ADM-14.

- 16/11/2026 ~22h20: FLUXO NOVO DA REPRESENTAÇÃO publicado (metrolabs/sgo:representacao-fluxo-20261116, fonte output/financeiro-20261116/cand9 = produção + fluxo; base corrigida com 6 arquivos da Assistência de produção via merge 3 vias). CH-2026-0030 REGULARIZADO: Aguardando orientação/decisão da Brasmedical (prazo 24/11 17:30), equipamento na oficina desde 11/11 17:30 (aproximado, sem termo). Suíte 2294/63 (relatorio-campo voltou a 8/0). Dossiê/termos em andamento (cand10).

RH360 R50 publicada/verificada em 16/11/2026 22:15 BRT: sha256:5fc458cd675fac0c6f67604b0da71418b2c4bab11a95185f2f9e907eb1ca454e; metrolabs/rh:solicitacao-local-trabalho-20261116-r50. ADM-14 administrativo e novo período em branco; oito rotas pessoais exatas SGO com vínculo e configuração exigidos. 14 checks página completa, 3 testes de acesso e PostgreSQL/restauração PASS; 750 pins. Portal real continua desabilitado, sem dados inventados. Evidência: output/rh360-20261116-r50/PUBLICADO_RH360_R50_20261116.txt. Próximo: contato pessoal SGO; não liberar apply antigo de e-mail, que altera EMP.email usado na identidade.

RH360 R51 publicada/verificada em 16/11/2026 22:43 BRT: sha256:0efdb46d21d29bcd2b3f1ed0b2d6cfa5c8f90fb6881210ffdb200f736b2ae08f; metrolabs/rh:email-contato-privado-sgo-20261116-r51. E-mail de contato privado por solicitação ADM-04 com identidade SGO preservada, análise RH e recibos; quatro rotas pessoais exatas; estados antigos preservados sem migração automática. Evidência: output/rh360-20261116-r51/PUBLICADO_RH360_R51_20261116.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

- 17/11/2026 ~00h: DOSSIÊ + TERMOS + OPÇÃO B publicados (metrolabs/sgo:representacao-dossie-20261116, fonte output/financeiro-20261116/cand10 + app do campo em output/representacao-fluxo-20261116/dossie/app-campo): dossiê único Metrolabs/Brasmedical (15 seções, código de verificação, QR de vídeo), hospital RSV (resumo 1 pág + termo retirada + termo entrega, sem representada), declaração do termo de entrega na tela de assinatura do app (mesmo texto do PDF; hash no evento). App campo versão c3cf721587c3. Suíte 2305/63. publicar.sh desta camada também confere /app/dist/publico/campo.

RH360 R52 publicada/verificada em 16/11/2026 23:54 BRT: sha256:7566544a10ee81405cd14dca9f288c143e4074b1469da8454173f63b63d4f2b8; metrolabs/rh:contatos-comprovantes-sgo-20261116-r52. Compatibilidade SGO das rotas pessoais existentes de endereÃ§o, telefone e comprovantes, com concessÃµes nominais/polÃ­tica e vÃ­nculo prÃ³prios preservados; sem alterar identidade ou conceder acesso real; preservar rascunho do editor apÃ³s envio de comprovante. Evidência: output/rh360-20261116-r52/PUBLICADO_RH360_R52_20261116.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R53 publicada/verificada em 17/11/2026 00:06 BRT: sha256:c090d81726048c6b841ac3f471686292ea47d56b3f840c6058a781f2c70a5cae; metrolabs/rh:declaracoes-portal-sgo-20261117-r53. Consulta pessoal das declarações administrativas existentes sob SGO; lista compatível com pedidos ADM-14, sem emissão ou assinatura automática. Evidência: output/rh360-20261116-r53/PUBLICADO_RH360_R53_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R54 publicada/verificada em 17/11/2026 00:16 BRT: sha256:95aeb093f4e875d7188954f74af677ee896338a3a21a7e10442bb7278e72d7f4; metrolabs/rh:ciencia-politicas-sgo-20261117-r54. Compatibilidade da ciência institucional existente com sessão SGO, vínculo pessoal e políticas aprovadas/vigentes; sem aprovar ou ativar política real. Evidência: output/rh360-20261117-r54/PUBLICADO_RH360_R54_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R55 publicada/verificada em 17/11/2026 00:26 BRT: sha256:30ad369365486021f486e125310345579cc65849b4cc8458b4c3fc98923bf7de; metrolabs/rh:consultas-contato-portal-20261117-r55. Consultas próprias de endereço e telefone no menu existente; menu e navegação compartilham as mesmas páginas condicionais, sem alterar permissões ou dados. Evidência: output/rh360-20261117-r55/PUBLICADO_RH360_R55_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R56 publicada/verificada em 17/11/2026 00:37 BRT: sha256:a547b0aa36a73a84e834a35db82cf0d66d496367c1b0264a73c601b5d297ae66; metrolabs/rh:referencia-coletiva-sessao-sgo-20261117-r56. Compatibilidade SGO das referências coletivas administrativas existentes, mantendo revisão jurídica obrigatória e nenhuma execução de regras. Evidência: output/rh360-20261117-r56/PUBLICADO_RH360_R56_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R57 publicada/verificada em 17/11/2026 00:50 BRT: sha256:8f78222a0f4c63d829938f76ea5097448d597012b037262b852bbc037ab268ff; metrolabs/rh:saldo-declarado-sessao-sgo-20261117-r57. Compatibilidade SGO do registro administrativo de saldos declarados existente; preservar desconhecido versus zero e nenhuma apuração, reserva ou débito de direitos. Evidência: output/rh360-20261117-r57/PUBLICADO_RH360_R57_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R58 publicada/verificada em 17/11/2026 01:24 BRT: sha256:f93a080cb4a823f7674a012a32ad10c580b4bb020cb1b3dfd8ad6bb41d67081b; metrolabs/rh:dossie-consulta-pos-gravacao-20261117-r58. Distinguir gravaÃ§Ã£o confirmada de consulta posterior nÃ£o atualizada em formaÃ§Ã£o/perÃ­odos; atualizaÃ§Ã£o explÃ­cita com rascunho preservado e reconfirmaÃ§Ã£o apÃ³s mudanÃ§a de versÃ£o; leituras explÃ­citas sem overlay global. Evidência: output/rh360-20261117-r58/PUBLICADO_RH360_R58_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R59 publicada/verificada em 17/11/2026 01:44 BRT: sha256:690b93ac47132147b2441db951ffd0ca1183dee13666fb51de3d2ab2fba743f1; metrolabs/rh:contabilidade-rh-sessao-sgo-20261117-r59. Compatibilidade SGO da autoridade nominal RH-Contabilidade existente, sem conceder capacidades ou ampliar escopo de empregados, sem cálculos ou eventos financeiros. Evidência: output/rh360-20261117-r59/PUBLICADO_RH360_R59_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R60 publicada/verificada em 17/11/2026 02:03 BRT: sha256:7ff24ad49b94be6fad25c0fc94a38965ceb59e01ae76e9c70bf5e5471ae50151; metrolabs/rh:cct-conferencia-condicoes-20261117-r60. Consulta das condicoes e excecoes ja registradas nas minutas CCT e protecao contra erro atrasado de consulta, sem alterar regras, aprovacoes ou efeitos. Evidência: output/rh360-20261117-r60/PUBLICADO_RH360_R60_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R61 publicada/verificada em 17/11/2026 02:10 BRT: sha256:291402d899d81717692224b89b34cb5ff8e5897f078d30110a54c0b79b71b3e8; metrolabs/rh:cct-fonte-minuta-20261117-r61. Origem documental da minuta CCT com identificacao/hash e download explicitamente solicitado, vinculado ao hash registrado e protegido contra resposta tardia. Evidência: output/rh360-20261117-r61/PUBLICADO_RH360_R61_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R62 publicada/verificada em 17/11/2026 02:20 BRT: sha256:b9f15cda44e2f09ccb1790650d7b6100e06103bcdaf94edf2a5cdf508e21a4a1; metrolabs/rh:cct-historico-decisoes-20261117-r62. Consulta paginada de todo historico autorizado da governanca CCT e detalhes dos pareceres/aprovacoes ja registrados, sem novos atos ou permissoes. Evidência: output/rh360-20261117-r62/PUBLICADO_RH360_R62_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R63 publicada/verificada em 17/11/2026 02:33 BRT: sha256:f15fd4e0038f114e7b5174af9abf5417e4d5ad83b567cbac4c11c9b7c6560c8d; metrolabs/rh:cct-pendencias-unidade-20261117-r63. Consulta administrativa de referencias CCT por unidade declarada, sem inferir enquadramento juridico ou efeitos trabalhistas. Evidência: output/rh360-20261117-r63/PUBLICADO_RH360_R63_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R64 publicada/verificada em 17/11/2026 02:45 BRT: sha256:883226b64120bbac2d2377c74664de07635b7afef4c6287e30281d8b925adad1; metrolabs/rh:cct-biblioteca-consulta-20261117-r64. Biblioteca de minutas CCT com busca/filtros/paginas locais e pendencias moveis com acoes visiveis, sem alterar dados ou aprovacoes. Evidência: output/rh360-20261117-r64/PUBLICADO_RH360_R64_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R65 publicada/verificada em 17/11/2026 03:32 BRT: sha256:ffc26f2fedfdbae74d854924d397c9e0db0f5983e10a8cfbfb1b6c7c41021a53; metrolabs/rh:cct-referencia-atualizacao-20261117-r65. Atualizacao explicita da referencia CCT existente com revisao/origem conferidas, confirmacao e reconciliacao sem repetir escrita; sem aprovacao juridica ou efeitos. Evidência: output/rh360-20261117-r65/PUBLICADO_RH360_R65_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R66 publicada/verificada em 17/11/2026 04:05 BRT: sha256:f279a714d32a2316e40dd8d8a42f1a6b9e1aae64ff3ce1304c751c304684d215; metrolabs/rh:cct-portal-origem-20261117-r66. Guarda da origem cadastral para procedimentos CCT e restauracao dos paineis autorizados na rota real Meu cadastro, sem aprovacoes ou efeitos. Evidência: output/rh360-20261117-r66/PUBLICADO_RH360_R66_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R67 publicada/verificada em 17/11/2026 04:12 BRT: sha256:8914835ab2cad597182cd398e1dbc2ebc2f235fce0afbd14a0a3d5627fb40c43; metrolabs/rh:cct-consultas-tardias-20261117-r67. Integridade e contexto da biblioteca CCT e retorno de previa manual, sem novas regras ou gravacoes. Evidência: output/rh360-20261117-r67/PUBLICADO_RH360_R67_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R68 publicada/verificada em 17/11/2026 04:18 BRT: sha256:f369a3305f268fc87dc33828a7ba3fe9b8658dc7edb46bf4e2355cf77bba4436; metrolabs/rh:cct-condicoes-portal-20261117-r68. Portal apresenta condicoes e excecoes do procedimento e distingue consulta de avaliacao individual, sem motor juridico ou efeitos. Evidência: output/rh360-20261117-r68/PUBLICADO_RH360_R68_20261117.txt. 752 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 — JORNADA CONTÍNUA DE 16 PARA 17/11/2026
R47–R68 publicadas/verificadas, 22 incrementos sobre R46. Base vigente R68,
conforme marcador no início deste arquivo; 752 pins. Cadeia local de imagens,
deltas, fontes e backups restaurados PASS em
output/rh360-jornada-20261111/CADEIA_ENTREGAS_20261117.json.
Entrega consolidada: output/rh360-jornada-20261111/ENTREGA_ATE_0500_20261117.txt.
Ciclo administrativo contábil R59 e governança CCT R68 passaram isoladamente;
ambos com decisões/dados exclusivamente sintéticos, sem aprovação de vínculo
individual ou efeito financeiro real. Interoperação completa RH/SGO foi
ensaiada na R64; nove fontes da ponte permanecem iguais até R68, com recibo
HERANCA_R64_R68_20261117.json; não declarar reensaio completo do par na R68.
Solicitações reais continuam DISABLED (não significa todo o portal legado).
18 pessoas sem referência CCT; estrutura oficial/contratos/concessões privadas
reais continuam pendentes. Critérios 1–15 e lacunas de software reconciliados
na MATRIZ_ACEITE_CCT_20261117.txt. Próxima implementação em
PLANO_VINCULO_JURIDICO_20261117.txt e PROXIMA_IMPLEMENTACAO_CCT_20261117.json.
Não ativar resolvedor DEV nem forçar legalApproval; não inferir regras de
condições textuais. Aceite real adiado; missão CCT integral permanece aberta.
Sem candidata de produto pendente nesta jornada; preservar R68 e conferir
contêiner/manifesto antes de novas alterações. SGO/Comercial/Financeiro não alterados.

Janela RH360 encerrada em 17/11/2026 05:00:25 BRT; R68 publicada/verificada. Recibo: output/rh360-jornada-20261111/ENCERRAMENTO_JANELA_20261117.json. Missão CCT integral e aceite real permanecem abertos.
- 17/11/2026 09:06 — PUBLICADO portal-cliente-etapa0-20261117 (sha ff1b7324…; base representacao-dossie-20261116; backup /opt/metrolabs/backup/portal-cliente-etapa0-20261117). Antes, por ordem do dono, vigência da Brasmedical gravada até 2027-12-31 pelo cadastro da representada (era 2025-12-09). Conferido: Brasmedical e Energiza entram; contas hst/hcn/ndi em CONSULTA (continuam usando). Patch do servidor (lista fechada) AINDA NÃO aplicado. Próximo: contratos (IA, régua de vencimento, reajuste por índices, provisória 31/12/2026 para os demais clientes) na cand12.
- 17/11/2026 — PUBLICADO contratos-reajuste-20261117 (sha 4feecbeb…; base portal-cliente-etapa0-20261117; cand12). Contratos: IA (Gemini) lê o PDF e sugere campos com trecho; régua de vencimento 120/90/60/30/15/7/0 + aviso prévio (equipe e-mail; cliente só e-mail a partir de 90 dias; provisória NÃO avisa cliente); reajuste por índices BCB (IPCA 433, IGP-M 189, INPC 188, IPCA-E 10764) proposto 45 dias antes, aprovado só pela Diretoria, aba Painel financeiro > Reajustes de contratos; vigência provisória até 31/12/2026 para clientes sem contrato (hst/hcn/ndi agora PLENO provisório). Suíte 2326/63, nada piorou. BCB responde do servidor (conferido). Relatório: output/portal-cliente-20261116/contratos/RELATORIO.md. Falta: 1º PDF real pela IA, cadastrar contratos reais, patch do servidor (lista fechada), etapas 1-6 do portal com o piloto.
- 17/11/2026 ~10:30 — PUBLICADO cookie-sessao-20261117 (sha 8ca46681…; base contratos-reajuste-20261117). Causa do "Este arquivo é interno da Metrolabs" (Mônica ao visualizar orçamento): cookie sgo_sessao (para /arquivos, /planilhas, /pastas) tinha Max-Age 24 h a partir do login, mas a sessão do legado desliza (6 h desde o último uso) — quem fica logado > 24 h perde os arquivos. Correção no /api/run (dist/servidor.js e src/servidor.ts do CONTÊINER): sessão válida do pedido (perfil, sem troca de senha pendente) renova o cookie quando ausente/diferente ou a cada 1 h. Testado no ar: sem cookie → recebe; repetido → não regrava; inválida → nada. Fonte em output/cookie-sessao-20261117 (repo sgo_servidor NÃO recebeu: diverge da produção).

RH360 R69 publicada/verificada em 17/11/2026 10:54 BRT: sha256:2adfb07f08d9106477a1282a3014ad8a8456fc052dd280c736ab456ef4ca2537; metrolabs/rh:cct-conferencia-origens-20261117-r69. Conferencia autorizada da origem cadastral, estrutura oficial e contrato declarado para revisao CCT, sem aprovacoes ou efeitos. Evidência: output/rh360-20261117-r69/PUBLICADO_RH360_R69_20261117.txt. 753 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — PUBLICADO pendencias-memo-rep-20261117 (sha e1ae1bcb…; candF = cand12 + SGO_Alertas_Central.js). Aviso falso "A Brasmedical não recebe avisos: nenhuma conta ativa": Pend_comMemoria_ memorizava CAD_USUARIOS sem olhar SGO_DATA_REP_VISIVEL. Chave agora separa a leitura com contas de representada. Teste tests/pendencias-memo-representada-20261117.test.cjs. ATENÇÃO: cand13 (e-mail) nasceu da cand12 — copiar SGO_Alertas_Central.js da candF para a cand13 antes de publicar o e-mail. E-mails do CH-0030 à Brasmedical de 17/11 01:20 ficaram NO_RESUMO (fora do expediente), WhatsApp PULADO (vínculo REPRESENTANTE fora da lista do WhatsApp).
- 17/11/2026 — PUBLICADO email-outlook-20261117 (sha dd871191…; base pendencias-memo-rep-20261117; cand13 = candF + JS_Email.html, SGO_Email.js, SGO_Ajuda_Email.js). E-mail estilo Outlook: × e bandeira na linha, pula para a próxima ao excluir, desfazer 7 s, lote, arrastar, atalhos, pílulas com sugestão ao digitar (Para/Cc/Cco), aba Contatos (pessoais + catálogo da empresa sem Financeiro), rascunho automático. Patch opcional do servidor (filtro Sinalizadas na caixa toda) NÃO aplicado: output/email-melhorias-20261117/servidor-sinalizadas.patch. Relatório: output/email-melhorias-20261117/RELATORIO.md.

RH360 R70 publicada/verificada em 17/11/2026 12:04 BRT: sha256:0bd415dd9d5e67bc1315ac70817ae0b45e71916d12541f2e0cd29437dcd20033; metrolabs/rh:cct-validacao-individual-20261117-r70. Fluxo individual CCT com origem oficial/contratual conferida, parecer, aprovacao nominal da Diretoria, suspensao e historico privado, sem regras financeiras. Evidência: output/rh360-20261117-r70/PUBLICADO_RH360_R70_20261117.txt. 762 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R71 publicada/verificada em 17/11/2026 12:15 BRT: sha256:5c526300cccb62325079a10e3d3df5c0c801ce80a455e31d6715ff5d7187fb35; metrolabs/rh:cct-portal-validacao-20261117-r71. Consulta propria dos procedimentos aprovados com decisao individual canonica atual, provas integras e bloqueio de origem alterada, sem efeitos financeiros. Evidência: output/rh360-20261117-r71/PUBLICADO_RH360_R71_20261117.txt. 764 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — PUBLICADO estufa-simulador-20261117 (sha 23c201c0…; base email-outlook-20261117; candG). Falhas antigas: 63 → 2 (suíte 2402/2, nada piorou). Defeito real corrigido: simulador Estufa/Banho-maria ("Forçar Aprovado/Reprovado", secadora e Anexo E) tinha regredido à versão anterior a 04/11. Restam: assistente-duvidas (base do assistente desatualizada; trechos só na produção — precisa trazer os manuais da produção antes de regerar) e atividades-equipe-avisos (regra "só o dono lança atividade para si" foi retirada do código antes de 06/11 — AGUARDA DONO). Pergunta também: Elisa/Matheus delegados do Financeiro nas Regras de compras (ignorados pelo código). Relatório: output/falhas-20261117/RELATORIO.md.

RH360 R72 publicada/verificada em 17/11/2026 12:33 BRT: sha256:dcc0ba4d13f23937179c2fe8ff8d25c7747c1c61a844f672c09064df35b5d6cb; metrolabs/rh:cct-mapa-clausulas-20261117-r72. Mapa administrativo das clausulas, minutas e decisoes de POPs para RH e colaborador, com pendencias e preparacao explicita por fonte. Evidência: output/rh360-20261117-r72/PUBLICADO_RH360_R72_20261117.txt. 766 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R73 publicada/verificada em 17/11/2026 12:57 BRT: sha256:8f85920d68513e30107318b807a44fd17f4ecaf1796b7c36b5f1a685030593b0; metrolabs/rh:cct-criterios-estruturados-20261117-r73. Criterios estruturados incluidos na revisao dos procedimentos e conferencia manual explicavel de declaracoes, sem pessoa ou efeitos financeiros. Evidência: output/rh360-20261117-r73/PUBLICADO_RH360_R73_20261117.txt. 768 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — Decisões do dono: (1) regra "só o dono lança atividade para si" NÃO vale mais (tirar da ajuda/teste); (2) Elisa/Matheus NÃO são delegados do Financeiro em Compras — Regras de compras v4 gravada em produção sem a lista "financeiros" (motivo registrado; demais regras iguais, conferido); (3) corrigir ordem da centrífuga no catálogo oficial; (4) IA do "Tire sua dúvida" mais eficaz (entender erro e orientar). Especialista trabalhando na candH (output/assistente-20261117).

RH360 R74 publicada/verificada em 17/11/2026 13:17 BRT: sha256:80b1b2af3fd7c2f1a4ad16444e5f4072509d809bde39faf58dfbbe9e60f45975; metrolabs/rh:cct-conferencia-individual-20261117-r74. Conferencia manual de criterios no contexto individual e data declarada, com origem canonica atual e bloqueio de alteracao, sem apuracao ou gravacao de fatos. Evidência: output/rh360-20261117-r74/PUBLICADO_RH360_R74_20261117.txt. 770 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — Ordem do dono: Priscilla (priscilla) com o mesmo acesso da Bruna: incluída em Ges_cfg gestoresPorArea TECNICA e METROLOGIA (log GESTAO_REGRAS). Conferido: 87 caixas iguais às da Bruna. FILA: especialista de documentos organizados em pastas (QR/prontuário do equipamento no celular, ficha do cliente, portal: PGT/POP, O.S., Qualificação, Certificados, Relatórios) — pedido da Priscilla 16/11 — começa após o especialista do assistente (candH).

RH360 R75 publicada/verificada em 17/11/2026 14:17 BRT: sha256:019f6ecb412915337c333606e32c375cd2ff89c67bc284ff1cac27b9e57da5d4; metrolabs/rh:secullum-captura-fonte-20261117-r75. Captura manual privada e recuperavel de paginas originais Secullum, sem sincronizacao, normalizacao de horas ou mudanca de autorizacoes reais. Evidência: output/rh360-20261117-r75/PUBLICADO_RH360_R75_20261117.txt. 775 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R76 publicada/verificada em 17/11/2026 14:29 BRT: sha256:8e754d563a661ee064430b1b5b6bc6df8fbdf538018c2486fe996df70050a228; metrolabs/rh:secullum-conferencia-originais-20261117-r76. Conferencia privada entre duas paginas originais do mesmo banco com repeticoes, mutacoes e IDs ambiguos, sem importacao, exclusao ou cobertura presumida. Evidência: output/rh360-20261117-r76/PUBLICADO_RH360_R76_20261117.txt. 777 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — PUBLICADO assistente-ia-20261117 (sha 0e9d992d…; base estufa-simulador-20261117; candH). "Tire sua dúvida": base = docs/ + 88 parágrafos que só existiam na produção (devolvidos a docs/ com origem); índice de 3.676 mensagens de erro lidas do código (SGO_AssistenteErros.js), botão "Perguntar ao assistente sobre este erro", busca tolerante e por sinônimos, sigilo do Financeiro. Regra antiga das atividades retirada da ajuda; CAL-011 reposicionada no catálogo. Suíte 2417/0. ATENÇÃO: base dos manuais precisa do docs/ deste trabalho e do gerador novo (output/assistente-20261117). Decisões pendentes: quem lê manuais Painel financeiro/Ganhos dos vendedores/Portal interno; parágrafos em duas versões a conferir.
- 17/11/2026 — Decisão do dono sobre o assistente: (1) os 3 manuais fora da base (Painel financeiro, Ganhos dos vendedores, Portal do cliente interno) entram, cada um só para quem tem acesso à tela correspondente (Painel financeiro = lista de sigilo; Ganhos = quem vê Ganhos, sem o contrato individual de vendedor para os demais; Portal = caixa PORTAL_CLIENTE_CONTRATOS_VER, parte do reajuste só na lista de sigilo); (2) parágrafos em duas versões (output/assistente-20261117/RELATORIO.md, decisão 2): conferir no CÓDIGO qual descreve a tela atual e apagar a outra — quem decide somos nós. FILA: depois do especialista dos documentos em pastas (candI), porque mexe nos mesmos manuais de docs/.

RH360 R77 publicada/verificada em 17/11/2026 14:46 BRT: sha256:13808ceed9af3ea91acdda97e4309de5ea8f44f11d5e0f034f256b7be53e3b0d; metrolabs/rh:secullum-associacao-revisada-20261117-r77. Registro privado revisado de associacao declarada entre identidade externa observada e colaborador/estrutura oficial, com periodo, origem, revogacao e sem liberar importacao de ponto. Evidência: output/rh360-20261117-r77/PUBLICADO_RH360_R77_20261117.txt. 782 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R78 publicada/verificada em 17/11/2026 15:00 BRT: sha256:2ef61e9afc1e228f1cb1429a54d05c0bf63b2ed6476c49e45c244936093691ae; metrolabs/rh:secullum-cadastro-original-20261117-r78. Captura privada manual do cadastro original de funcionarios Secullum, em namespace separado da fonte de ponto, com campos documentados e sem associacao automatica. Evidência: output/rh360-20261117-r78/PUBLICADO_RH360_R78_20261117.txt. 785 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R79 publicada/verificada em 17/11/2026 15:20 BRT: sha256:4519b227afa33aba80234a2b13f7a9b2abd80f7e2b895cf626cb1beaa7960439; metrolabs/rh:secullum-confronto-declaracoes-20261117-r79. Confronto somente leitura entre associacao declarada e linha explicitamente escolhida do cadastro original, com divergencias mascaradas e sem autenticar pessoa ou liberar importacao. Evidência: output/rh360-20261117-r79/PUBLICADO_RH360_R79_20261117.txt. 788 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — PUBLICADO documentos-pastas-20261117 (sha 215a897f…; base assistente-ia-20261117; candI). Documentos em 11 pastas (SGO_DocumentosPastas.js + JS_DocumentosPastas.html) no QR/prontuário, ficha de cliente/unidade/equipamento e conta de cliente. Dono aprovou: conta de cliente abre documentos emitidos do próprio prontuário (DOCP_CFG.clienteAbreProntuario). Conferido em produção: Hospital Santa Lúcia 57 docs (25 certificados, 29 PGT/POP, 3 registros), 0,4 s; 21 equipamentos com documentos. Suíte 2426/0.

RH360 R80 publicada/verificada em 17/11/2026 15:59 BRT: sha256:1de44fe1cecf5e8cbf043de43db525fda294d903f0d91ef12a37fa7f8b1010e5; metrolabs/rh:secullum-confronto-pessoal-autorizado-20261117-r80. Confronto opcional e auditado de declaracoes CPF/PIS do RH com originais Secullum, somente com concessao pessoal nominal atual e sem autenticar identidade ou liberar importacao. Evidência: output/rh360-20261117-r80/PUBLICADO_RH360_R80_20261117.txt. 790 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.

RH360 R81 publicada/verificada em 17/11/2026 16:13 BRT: sha256:6f5698b73f31b941cb2c7b2c015fdaaa44d0678b707ca4df6004244be4a19a1c; metrolabs/rh:secullum-previa-data-fuso-20261117-r81. Previa privada de data e hora da fonte com formato e fuso declarados, detectando ambiguidade e horarios inexistentes sem importar ou apurar ponto. Evidência: output/rh360-20261117-r81/PUBLICADO_RH360_R81_20261117.txt. 792 pins; backup restaurado, verificações proporcionais e pós-publicação PASS. Testes sintéticos; aceite operacional real adiado e CCT integral aberta.
- 17/11/2026 — PUBLICADO assistente-manuais-20261117 (sha a01e5841…; base documentos-pastas-20261117; candJ). Manuais Painel financeiro (só lista de sigilo), Ganhos dos vendedores (quem vê a tela, GV_veTela_; contrato da Mônica e Omie só sigilo/Diretoria/dono) e Portal do cliente interno (caixa PORTAL_CLIENTE_CONTRATOS_VER; reajuste só sigilo) no assistente. 11 pares de parágrafos resolvidos pelo código. Ajuda da tela de Ganhos sem as faixas da Mônica. Suíte 2432/0. PENDENTE: mensagens de registrador vencido ainda dizem "clique em Editar" (Cadeia de Frio, Autoclave, Estufa, Lavadora + 1 ajuda) — o certo é "Novo certificado"; ver output/assistente-manuais-20261117/RELATORIO.md.
- 17/11/2026 — PUBLICADO registrador-novo-certificado-20261117 (sha 70a47b56…; base assistente-manuais-20261117; candK). Mensagens de registrador vencido (Cadeia de Frio, Autoclave, Estufa, Lavadora) e ajuda da Qualificação: "abra o padrão e use Novo certificado" no lugar de "clique em Editar". Teste cadeiafrio-abas-horarios atualizado. Produção atual = candK.
- 18/11/2026 — PUBLICADO portal-cliente-portao-20261117 (sha 20606951…; base registrador-novo-certificado-20261117). SERVIDOR: portão da sessão CLIENTE no /api/run (dist/src servidor + sistemas), aplicado por âncoras sobre os arquivos do contêiner (output/portal-servidor-20261117/aplicar.cjs). Legado decide (PortalCliente_portaoFuncao_), modo OBSERVAR (nada recusado até a Diretoria ligar a recusa em Portal do cliente > Contratos > Segurança). Testes servidor: 3 novos verdes; 6 falhas iguais à referência sem a mudança (repo × produção). Legado inalterado (= candK). Etapa 1 do Portal em andamento na cand14.
- 18/11/2026 — PUBLICADO portal-cliente-acessos-20261118 (sha 07c76ad4…; base portal-cliente-portao-20261117; cand14). Portal do cliente ETAPA 1 (Acessos): várias pessoas por cliente, papéis GESTOR/SOLICITANTE/CONSULTA + unidades, escopo por unidade (ESCOPO_RECUSADO), convite só com contrato vigente/carência, telas Acessos de clientes (interna) e Minha conta e equipe (cliente), termo de uso versionado (IP/navegador do servidor), desligamento derruba sessões, rotina 90/120 dias, PC09/PI02/PI04 só e-mail. Contas antigas (Santa Teresa, HCN, Notre Dame) = GESTOR 'papel não revisado'; nenhuma seria inativada (conferido em produção, só leitura). Encarregado LGPD em branco (configurável em Regras do portal). Suíte 2443/0. Relatório: output/portal-cliente-20261116/etapa1/RELATORIO.md. Produção atual = cand14.
- 18/11/2026 — PUBLICADO portal-cliente-chamados-20261118 (sha 567df93b…; base portal-cliente-acessos-20261118; cand15). Portal do cliente ETAPA 2 (Chamados): abrir chamado em 5 passos (escopo por unidade, pedido repetido, avulso em consulta, sem prioridade do cliente, limites), 8 etapas com lista/Kanban/Gantt, ficha com prazo do contrato, galeria, linha do tempo e conversa (nota interna nunca vai ao cliente), cancelar antes da visita, aceite (confirmar / problema continua / prazo 5 dias úteis, só chamados encerrados após a publicação), aba interna Conversas do portal (caixa PORTAL_CLIENTE_CONVERSAR). PC01 na hora, PC02 em horário comercial; resumo de conversa por e-mail = etapa 4. Colunas novas conferidas no banco real após a publicação. Plantão em branco (configurável). Suíte 2458/0. Relatório: output/portal-cliente-20261116/etapa2/RELATORIO.md. Produção atual = cand15.
- 18/11/2026 — PUBLICADO portal-cliente-documentos-20261118 (sha 78960d66…; base portal-cliente-chamados-20261118; cand16). Portal do cliente ETAPA 3: Documentos técnicos (índice de Documentos em pastas, tipos visíveis da decisão 17 + coluna PORTAL OCULTO/VISIVEL, DOCUMENTO_ABERTO), Meus equipamentos (farol por categoria via Pend_vencimentosBase_, histórico só encerrado sem técnico), Vencimentos e cronograma (Agendado × Previsto × Documento). Aba interna Documentos no portal (caixa PORTAL_CLIENTE_DOC_LIBERAR). Filtro por unidade fechado em QR Code, ciclos da lavadora e vencimentos. Conferido em produção: central de pendências 744=744 por tipo; Documentos 0,4 s / Cronograma 0,1 s / Equipamentos <0,05 s com as 3 contas reais. PGT/POP fora da tela nova (decisão 17), segue no Arquivo e QR. Suíte 2472/0. Relatório: output/portal-cliente-20261116/etapa3/RELATORIO.md. Produção atual = cand16.
- 18/11/2026 — PUBLICADO portal-cliente-avisos-20261118 (sha 9bd988dc…; base portal-cliente-documentos-20261118; cand17). Portal do cliente ETAPA 4 (avisos ao cliente só por e-mail): assunto 'Metrolabs — <número>', remetente Metrolabs, dedup por endereço (PCL_AVISOS_ENVIOS), horário comercial 08–18 dias úteis com fila; PC03/PC04/PC05/PC06 (resumo 2 h úteis)/PC07 (diário 08:30)/PC08 (semanal)/PC10 (neutro) + PI05; substitui Ast_avisarCliente_ para cliente com portal. TRANSIÇÃO (decisão recomendada): cópia ao e-mail do cadastro LIGADA por padrão; PC08 só leva vencidos de até 30 dias antes do início dos avisos (configurável 0–365). Preferências PC06/07/08 em Minha conta. Suíte 2485/0. Relatório: output/portal-cliente-20261116/etapa4/RELATORIO.md. Produção atual = cand17.
- 18/11/2026 — PUBLICADO portal-cliente-indicadores-20261118 (base portal-cliente-avisos-20261118; cand18). Portal do cliente ETAPA 5: Indicadores do cliente (8 índices, período 30/90/180/365, escopo por unidade, Consulta sem acesso, 'como é contado' sempre visível, horas úteis Ast_minUteisEntre_, PDF do período filtrado pelas unidades — coluna UNIDADES_JSON), aba interna Uso do portal (caixa PORTAL_CLIENTE_USO_VER: por cliente, avisos enviados, linha do tempo por pessoa, CSV), cache 2 min. 'Avisos que voltaram' = só falhas registradas (sem leitura de devoluções). Suíte 2493/0. Relatório: output/portal-cliente-20261116/etapa5/RELATORIO.md. Produção atual = cand18.
- 18/11/2026 — PUBLICADO portal-cliente-troca-20261118 (sha c99081ea…; base portal-cliente-indicadores-20261118; cand19). Portal do cliente ETAPA 6 (troca definitiva, parte de software): menu do cliente = só grupo Portal do cliente (itens antigos redirecionam; Início do Portal novo; Unidades/Equipamentos → Meus equipamentos; Arquivo → Documentos técnicos > Por pastas; QR Code e ciclos mantidos; PGT/POP/O.S./qualificação acessíveis por pastas/QR — pedido da Priscilla). Trava do legado SGO_PCL_MODULO e lista fechada mínima PRONTAS e DESLIGADAS; painel 'Pronto para ligar?' na aba Segurança (ligar após 7 dias de observação, ~25/11). Manual do cliente (docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md/.html/.pdf, capturas reais) + roteiro do piloto CRM (output/portal-cliente-20261116/etapa6/ROTEIRO_PILOTO.md) aguardando dados do dono (contrato real, 3 pessoas, data). 8 etapas não substituem as 5 dentro dos A4/Representação (não seguro). Suíte 2502/0. Produção atual = cand19.
- 18/11/2026 — PUBLICADO financeiro-cobranca-agenda-relatorio-20261118 (sha 8810df65…; base portal-cliente-troca-20261118; cand20). Financeiro onda 3 BLOCO B: E6 Régua de cobrança (Kanban 8 colunas, ações, protesto/negativação/jurídico/perda só dono+Diretoria, pendências só sigilo por contagem, caixa FIN_COBRANCA_REGISTRAR, régua externa desligada), E7 Agenda financeira (Gantt 30/60/90, previsão 90 dias otimista/realista; saldo mínimo vazio = só alerta de negativo), E8/E9 relatório semanal A4 (seg 07:00, só link, dono e Charles — conferido em produção: admin e charles Diretoria com e-mail; IA Gemini pseudonimizada com conferência de números; caixa FIN_RELATORIO_GERAR). 1º relatório: seg 23/11 07:00 (semana 16–22/11). Suíte 2517/0. Relatório: output/financeiro-20261118-bloco-b/RELATORIO.md. Produção atual = cand20.
- 18/11/2026 — PUBLICADO financeiro-recarga-caju-20261118 (sha aefa525a…; base financeiro-cobranca-agenda-relatorio-20261118; cand21). Financeiro onda 3 BLOCO C — Recarga Caju da rotina (R1–R6): pedido avulso + prestação no celular (foto, IA) + devolução; política com teto/fundo/limites VAZIOS (decisão do dono: solicitado e devolvido); só dono+Diretoria aprovam, Wanessa carrega/confere; conciliação com 8 divergências RCJ_*; régua por sistema+e-mail em expediente, WhatsApp desligado; trava conjunta recarga+viagem após 10 dias úteis (só Diretoria libera); aba Recarga Caju no Painel (só sigilo), A4 individual/geral/pendências, seção 7 do relatório semanal. Termo do portador: revisar com RH/contador antes de habilitar o 1º técnico. Suíte 2529/0. 1 linha 'Error' no log pós-troca = recusa normal de permissão do Conduta. Relatório: output/financeiro-20261118-bloco-c/RELATORIO.md. Produção atual = cand21.
- 18/11/2026 — PUBLICADO financeiro-especialista-ia-20261118 (sha bb169f5e…; base financeiro-recarga-caju-20261118; cand22). Financeiro E10/E11 — Especialista financeiro (aba + botão no Painel, só lista de sigilo): modos Como fazer (manual), Regra financeira (base de 10 regras, revisar com contador) e Analisar (fotografia pseudonimizada); conferência de números (inclui valores pequenos); atividades só com toque e só para a lista de sigilo; registro FIN_IA_USO com guarda 12 meses (FIN_IA_USO_GUARDA_MESES); sem chave = manual/base/texto padrão. E10: assistente geral já sem manuais do Financeiro fora do sigilo (testado). Suíte 2541/0. Relatório: output/financeiro-20261118-especialista/RELATORIO.md. Produção atual = cand22. ESPEC_ONDA2 (itens 1–4, E1–E11, R1–R6) CONCLUÍDA; ondas A–D dependem de decisões do dono/contador.
