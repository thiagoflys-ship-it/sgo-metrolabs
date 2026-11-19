# QR Code do equipamento: só o que é dele, só o último gerado, e excluir documento da pasta (18/11/2026)

Pedido do dono (urgente, vazamento): "Nos equipamentos, quando lemos o QR code aparece 29 POP e PGT e mais 3 documentos, para todos os equipamentos repetidos [...] Nunca, jamais, dado de nenhum equipamento pode cruzar com outro [...] nas pastas do equipamento só pode ser visto o último documento gerado, que é o oficial."

Acréscimo (Matheus, extrema urgência): botão "Excluir" nas pastas do equipamento, para tirar documentos cadastrados em cliente a que não pertencem.

**Estado: PREPARADO e TESTADO em `output/financeiro-20261116/cand32` (cópia da produção cand31, conferida por hash antes de começar). NÃO publicado, sem commit. Nenhum dado de produção alterado: o banco foi só lido (consultas e ensaio em `/tmp/ensQ`, apagado no fim). Nenhum PGT/POP regenerado.**

## 1. Causa raiz (com dados reais)

Ensaio com a função real (`Docs_doEquipamento_`, a mesma que a página do QR chama por `documentosPastas`) em todos os 1.026 equipamentos.

1. **"29 PGT e POP + 3" em todo equipamento.** O prontuário do equipamento juntava, de propósito, os documentos da unidade (`pastasDaUnidadeNoEquipamento`, padrão PGT/POP e Registros operacionais, entrega de 17/11). Esses documentos não têm equipamento (são gerados pelo CNPJ). Resultado na cand31:
   - **Hospital Vitta** (unidade com 316 equipamentos): **293 equipamentos mostravam exatamente 32 documentos: 29 PGT/POP (lista do módulo PGT e POP) + 3 registros operacionais**, nenhum deles do equipamento. É o caso relatado.
   - **Plasticlinica Ele e Ela**: os 20 equipamentos (CME-AUT-01, cardioversor, monitor...) mostravam os mesmos 29 PGT/POP.
   - No total, **11.098 itens "da unidade"** apareciam nos QR dos equipamentos.
2. **Versão anterior de outro equipamento.** A chave que agrupa versões não tinha o vínculo: `QE:AUTOCLAVE:Ciclo 1 de 3 - Sem Carga` é o mesmo número em autoclaves diferentes. Na ficha do cliente e no Portal, o relatório de um equipamento virava "versão anterior" do outro: **213 casos reais** (ex.: planilha de dados HEF-0835 escondida dentro da HEF-0834).
3. **Substituição gravada pelo número, sem olhar o equipamento.** `SGO_QE_marcarSubstituidas_` (ensaios) e `SGO_DocRev_registrar_` (revisões, inclusive PGT/POP) marcavam SUBSTITUIDO todo registro com o mesmo número. Assim, o "Ciclo 1 de 3" de uma autoclave substituía o de outra, e o POP003 de um cliente substituía o POP003 de outro.
   - Efeito: o documento vigente de um equipamento aparecia como "versão anterior (substituída)".
   - A revisão também é contada pelo número: há ensaio na "Rev. 43", porque soma as emissões de vários equipamentos. Ver o item 7.
4. **Documento gerado mais de uma vez.** O mesmo certificado foi gerado várias vezes, cada vez com outro número. Exemplos:
   - TER-5: 202600269, 270, 271, 272 e 273, todos ATIVO, gerados em 10 minutos;
   - 85 grupos em 201 certificados com o mesmo equipamento e a mesma data de calibração.

   Todos apareciam como documentos diferentes.

   Os ensaios regerados com espaços diferentes no número ("Ciclo 4  de 4" e "Ciclo 4 de 4") também apareciam em dobro.
5. **Pasta de arquivos pelo nome.** O QR também abria a pasta "Cliente / Unidade / TAG - TIPO", achada pelo **nome**:
   - **169 equipamentos em 46 grupos** têm TAG e tipo iguais na mesma unidade (ex.: 31 "N/P - TERMOHIGRÔMETRO") e caíam na mesma pasta;
   - a pasta mostra cada arquivo gerado de novo (O.S. em dobro, por exemplo);
   - ela era aberta a qualquer um com o link.

## 2. Decisões

- **PGT, POP e registros operacionais são da unidade**, não do equipamento. O código os gera pelo CNPJ, sem `EQUIPAMENTO_ID`; os dados confirmam: dos 144 PGT/POP, nenhum tem equipamento.
  - Eles saem do prontuário do equipamento (QR, ficha do equipamento e Portal).
  - Ficam nas pastas da unidade e do cliente e no Portal ("Por pastas").
  - A chave `pastasDaUnidadeNoEquipamento` do `DOCP_CFG` passou a ser ignorada.
- **Vínculo exato.**
  - Equipamento: só os documentos com aquele `EQUIPAMENTO_ID`.
  - Unidade: só os ligados àquela unidade; documento só do cliente fica na ficha do cliente. Hoje todo documento sem equipamento tem unidade, então nada muda nos dados atuais.
- **Chave de versão, sempre dentro do vínculo** (equipamento; sem ele, a unidade; sem ela, o cliente):

  | Documento | O que define "o mesmo documento" |
  |---|---|
  | Certificado de calibração | data da calibração + grandezas calibradas (títulos dos blocos do `DADOS_JSON`); dois manômetros calibrados no mesmo dia continuam dois certificados; sem data, vale o número |
  | Ensaios e revisões | número sem acento, com os espaços repetidos contando como um |
  | Demais documentos | número ou nome (como antes) |

- **Vale o último gerado:**
  - a ordem é a data de geração (`CRIADO_EM`, aprovação, emissão), depois a revisão;
  - o SUBSTITUIDO gravado pelo próprio módulo (CertCal, NR-13, ciclo da lavadora) é respeitado;
  - o SUBSTITUIDO gravado só pelo número (QUALIF_EMISSOES, DOC_REVISOES) é recalculado dentro do vínculo;
  - as minutas ficam à parte e nunca escondem o oficial.
- **Quem vê os substituídos:** só Admin e Diretoria, na ficha da equipe ("Substituídos"). Todos os outros veem só o oficial: QR (inclusive a equipe), Portal, conta de cliente e demais perfis. A equipe vê o aviso de quantos ficaram fora (não no QR). Nada é apagado.
- **Pasta do Drive no QR:** o link foi retirado (`acessarViaQR` não chama mais `obterLinkPastaEquipamento_`). A função continua no arquivo; nada foi apagado das pastas.
- **Exclusão (Matheus):**
  - É lógica: uma linha nova na aba `DOCP_EXCLUSOES`; nada é apagado.
  - Vale pelo arquivo, ou seja, todas as fontes do mesmo arquivo.
  - O documento sai do índice antes das versões: se o excluído era o mais novo, o anterior volta a ser o oficial.
  - O botão aparece na ficha do equipamento, como pedido, e também nas da unidade e do cliente, para os documentos sem equipamento registrados no cliente errado.
  - **Caixa nova `DOCP_EXCLUIR` «Excluir documento da pasta»**, registrada pelo próprio módulo em Acessos. Padrão: Administrador, Diretoria e gestores das áreas Técnica, Qualidade e Comercial.
  - O Matheus é GESTOR da área QUALIDADE e tem a caixa por padrão; para outros, Administração > Acessos.
  - Lista "Documentos excluídos" e "Restaurar": só Admin e Diretoria, no fim da aba.

## 3. O que mudou, arquivo por arquivo (cand31 → cand32; fim de linha conferido, igual ao original)

| Arquivo | Fim de linha | Mudança |
|---|---|---|
| `SGO_DocumentosPastas.js` | LF | vínculo exato no equipamento e na unidade; pastas PGT/registros não aparecem vazias no equipamento; chave de versão com vínculo (`Docs_vinculo_`); `Docs_numChave_` e `Docs_blocosCert_`; `Docs_resolverVersoes_` (o último gerado vale; SUBSTITUIDO por número recalculado); minuta à parte; substituídos só para Admin/Diretoria (`Docs_veSubstituidos_`, `substituidosOcultos`); exclusão lógica (`DOCP_EXCLUSOES`, `Docs_exclusoes_`, `Docs_arquivoExcluido_`, `documentosPastasAcao` excluir/restaurar/excluidos, caixa `DOCP_EXCLUIR`) |
| `JS_DocumentosPastas.html` | LF | sem os selos "Da unidade"/"Deste tipo"; "Substituídos (só Admin e Diretoria)"; aviso dos gerados de novo (fora do QR); botão Excluir com confirmação no próprio documento (o quê, de qual equipamento/cliente, some do QR, motivo obrigatório, sem `alert`/`confirm`); "Documentos excluídos" com Restaurar; guias "Como fazer" revistas |
| `JS_Core.html` | LF | só o comentário do prontuário do QR |
| `SGO_QRCode.js` | CRLF | `acessarViaQR` não procura nem compartilha mais a pasta pelo nome (`redirectUrl` vazio) |
| `SGO_QualifEmissao.js` | CRLF | `SGO_QE_marcarSubstituidas_` só substitui o do mesmo equipamento (sem equipamento, o mesmo CNPJ): `SGO_QE_mesmoAlvo_` |
| `SGO_DocRevisao.js` | CRLF | `SGO_DocRev_registrar_` só substitui o do mesmo equipamento/CNPJ: `SGO_DocRev_mesmoAlvo_` |
| `SGO_QualifEquipamento.js` | CRLF | QR e conta de cliente sem versão substituída; documento excluído fora da lista e da abertura |
| `SGO_PortalCliente_Documentos.js` | LF | Portal sem SUBSTITUIDO e sem "anteriores" |
| `SGO_PortalCliente_Seguranca.js` | CRLF | trava de arquivo nega o excluído |
| `SGO_PortalCliente_Config.js` | LF | Arquivo de documentos antigo do cliente esconde o excluído; **`PCl_dia_`: instante em UTC (`...Z`) vira o dia de Brasília** (ver o placar) |
| `SGO_Ajuda_Cadastros.js`, `SGO_Ajuda_PortalCliente.js` | LF | ajuda: o que o QR mostra, só o último gerado, PGT/POP na unidade, "Excluir documento da pasta" |
| `SGO_AssistenteManuais.js` | LF | base do assistente regerada (`_tools/gerar_base_assistente.cjs`; diferenças só nos 3 manuais abaixo) |

Repositório:
- **Teste novo:** `tests/qr-equipamento-documentos-20261118.test.cjs`, com 9 testes. Falha 7/7 na cand31 (os 2 da exclusão nem existiam nela) e passa 9/9 na cand32.
- **Teste ajustado:** `tests/documentos-pastas-20261117.test.cjs`. Ele exigia o comportamento antigo: PGT/POP no QR e "Versões anteriores" no QR. Passou a exigir a regra nova; o dia do teste passou a ser o de Brasília.
- **Mais três testes ajustados à regra nova.** Cada um exigia ver a versão substituída e passou a exigir só o oficial; a mudança está comentada no próprio teste:
  - `tests/portal-cliente-etapa3-20261118.test.cjs` (T3.7): "versão anterior também abre" virou "a versão anterior não aparece nem abre pela lista do Portal";
  - `tests/qualificacao-integrada.test.cjs`: o QR mostrava as Rev. 00 e 01 e agora mostra só a Rev. 01; o PDF da 00 continua guardado, como o teste confere;
  - `tests/assistente-manuais-acesso-20261117.test.cjs` (teste 6): os três parágrafos reescritos do manual de vínculos entraram na lista de justificados.
- **Manuais:** `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md` ganhou as seções novas "Cada equipamento só com o que é dele" e "Excluir documento da pasta". `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` e `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md` foram ajustados.

Patch: `patch-cand31-cand32.diff` (legado) e `patch-repositorio.diff` (tests/ e docs/).

## 4. Antes e depois, com dados reais (ensaio só de leitura, `ensaio/`)

QR Code de **todos os 1.026 equipamentos** (perfil Admin pelo QR; a visão do cliente dá o mesmo número):

| | cand31 (antes) | cand32 (depois) |
|---|---|---|
| Equipamentos com algum documento no QR | 769 | 442 |
| Documentos mostrados (soma) | 11.880 | **660** |
| Versões anteriores mostradas no QR | 8.988 | **0** |
| PGT/POP/registros da unidade no QR | 11.098 | **0** |
| Itens com outro equipamento (ou nenhum) | **19.780** | **0** |
| Mesmo, na visão da conta de cliente | 1.264 | **0** |
| Maior QR | 37 | 25 |
| Versão anterior de outro equipamento/unidade na ficha do cliente | **213** | **0** |

Exemplos:

| Equipamento | Antes | Depois |
|---|---|---|
| Hospital Vitta (293 equipamentos) | 32 cada (29 PGT/POP + 3 registros) | 0 (os 32 ficam na unidade) |
| Plasticlinica CME-AUT-01, cardioversor e monitor | 29 PGT/POP cada | 0 |
| TER-5 (Astec) | 5 certificados (269 a 273) | 1 (o 202600273, o último gerado); o Admin vê os 4 em "Substituídos" |
| 29deda82 (Hospital Santa Teresa) | 33 relatórios (ciclos regerados) | 13 |

Pastas dos 501 clientes, contando oficiais e substituídos:

| Visão | Antes | Depois |
|---|---|---|
| Admin | 867 oficiais + 429 anteriores = 1.296 | 798 + 498 = 1.296 (nenhum documento perdido) |
| Gestor | 867 + 429 anteriores visíveis | 796 + 0 |
| Portal | 750 + 364 | 678 + 0 |

**Tempo de uma consulta do QR:** de 56 a 72 ms antes e de 67 a 79 ms depois. A primeira chamada leva cerca de 265 ms nas duas.

## 5. Documentos que parecem estar no cliente ou equipamento errado (para o Matheus revisar; dados reais, só leitura)

Lista completa em `ensaio/documentos-suspeitos-dados-reais.txt`.

| Documento | Registrado em | Indício |
|---|---|---|
| Arquivo de documentos "RELATORIO DE QUALIFICAÇÃO" (ID ac8a4682…, 14/04/2026) | cliente HOSPITAL UNIMED | o equipamento ligado (AUT-01) é do cliente HOSPITAL W A |
| Certificado **202600346** | cliente IMED - FORMOSA | o equipamento (TAG "TESTE") é do IMED - TRINDADE e o conteúdo diz HEF - Hospital Estadual de Formosa |
| Certificados **202600258, 259, 260, 261** | HOSPITAL VITTA, equipamento CCTHI-01 | o certificado diz TER-01 (4 gerações do mesmo dia) |
| Certificado **202600396** (e o registro de revisão 202600397) | HONCORD, equipamento HON-0496 | o certificado diz TER-001; o CNPJ do registro de revisão não é o do HONCORD nem de unidade dele |
| Certificados **202600391, 399, 401** | IMED - FORMOSA | TAG do certificado (TER-01, THI-01, THI-02) diferente do cadastro (TER-001, THI-001, THI-002); provavelmente só a TAG renomeada |
| Certificado **202600024** | HOSPITAL SANTA TERESA, equipamento MANOVAC-02 | o certificado diz MANOVAC-01 |

**Sem achados:**
- ensaios e qualificações com cliente, CNPJ ou TAG diferentes do equipamento;
- NR-13, O.S., ciclo da lavadora e Representação com cliente diferente do equipamento;
- nome de arquivo citando o CNPJ ou o nome de outro cliente.

## 6. Placar da suíte

**Placar final** (`suite-final.txt`, rodado às 00h de 19/11 em Brasília): 296 arquivos, **2.674 aprovados e 0 falhas**, nenhum arquivo com saída diferente de zero.

A referência era 2.663 aprovados e 2 falhas de horário. A diferença de +11 vem do teste novo (9) e dos aprovados a mais nos testes existentes.

**Primeira rodada** (`suite.txt`, às 23h34 de Brasília, dentro da janela de 21h a 24h): 2.671 aprovados e 3 falhas.
- Os dois testes de horário já passaram nessa rodada.
- As 3 falhas eram testes que exigiam ver a versão substituída (T3.7 do Portal, QR da qualificação integrada, parágrafos do manual). Os três foram ajustados à regra nova (item 3).

**Os dois testes que dependiam do horário:**

| Teste | Onde estava o problema | Correção |
|---|---|---|
| `documentos-pastas-20261117`, "Vence em 26 dias" | **No teste.** O servidor conta o dia em Brasília (`Docs_hoje_`), e o teste calculava a validade "daqui a 25 dias" com o dia em UTC. Entre 21h e 24h, o UTC já está no dia seguinte. | o teste passou a usar o dia de Brasília (`Intl`, `America/Sao_Paulo`) |
| `portal-cliente-etapa1-20261118`, T1.8 | **No código.** `PCl_dia_` lia um instante em UTC ("2026-11-19T02:07Z", a entrada de uma pessoa às 23h07 de Brasília) como o dia 19. Com isso, a base de inatividade ficava um dia à frente da marca do aviso, e o aviso de inatividade se repetia. | `PCl_dia_` converte instantes com `Z` ou com fuso para o dia de Brasília (`SGO_PortalCliente_Config.js`) |

## 7. Riscos e limites

- **Exclusão:** a caixa `DOCP_EXCLUIR` entra pelo registro de módulos de Acessos (`SGO_PODERES_MODULOS`), como as do Portal do cliente. Depois de publicar, confira em Administração > Acessos se ela aparece e se o Matheus a tem.
  - A aba `DOCP_EXCLUSOES` é criada na primeira exclusão (`CertCal_garantirTabela_`).
  - A tela de excluir foi conferida por teste de servidor e por leitura do código. Não houve clique real no navegador: no primeiro uso, confira o fluxo Excluir → Confirmar → some → Restaurar com um documento de teste.
- **Marcas SUBSTITUIDO erradas já gravadas:** continuam no banco (nada foi mexido). Só a lista recalcula. As telas dos próprios módulos (Qualificações do equipamento, "Abrir para corrigir") ainda leem a marca gravada.
- **Numeração da revisão:** a próxima revisão do ensaio e do registro de revisões ainda é contada pelo número, em todos os equipamentos (por isso "Rev. 43"). Corrigir isso muda o número impresso nos próximos documentos: precisa da decisão do dono. Não foi mexido.
- **Certificado gerado de novo com outra data de calibração ou outras grandezas:** continua como documento separado (regra conservadora). Para tirar, use o "Excluir".
- **QR sem a pasta do Drive:** arquivos guardados à mão só na pasta (sem registro no Arquivo de documentos) deixam de abrir pelo QR. Hoje há 150 arquivos nessas pastas; os dos módulos já estão nas pastas por ID. Se algum precisar aparecer, registre-o no Arquivo de documentos, ligado ao equipamento.
- **Trava de arquivo:** a versão substituída, quando o cliente já tem o link, ainda abre pela trava (as outras regras da trava a aceitam). Ela só não aparece mais em nenhuma lista. O documento excluído não abre.

## 8. Ao publicar (coordenador)

1. Publicar os 13 arquivos do legado da cand32 (lista acima), juntos.
2. Depois de publicar:
   - abrir o QR de um equipamento do Hospital Vitta: deve vir sem PGT/POP;
   - abrir o do TER-5: deve vir só o 202600273;
   - abrir a ficha da unidade Hospital Vitta: os 29 PGT/POP e os 3 registros continuam lá.
3. Conferir em Administração > Acessos a caixa «Excluir documento da pasta» e se o Matheus a tem.
4. Avisar o Matheus da lista do item 5.
5. Não há migração nem script a rodar.
