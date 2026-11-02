# SGO+ Licitações — Integrações e APIs das 33 plataformas (Especialista 04)

Data: 01/11/2026. Autor: Especialista 04 (Integrações e APIs). Fase: diagnóstico. Nenhum código de produção foi escrito, nada foi publicado e nada foi gravado em produção.

Documentos de entrada: `LICITACOES_00_MISSAO_DIRETORIA_20261101.md` (requisitos do dono) e `LICITACOES_01_DIAGNOSTICO_ARQUITETURA_20261101.md` (diagnóstico do arquiteto).

Convenção usada neste documento:
- **PROVADO** = chamada real feita desta máquina em 01/11/2026, com resposta registrada aqui.
- **DOCUMENTADO** = consta em documentação oficial da própria plataforma (URL citada), sem teste nosso.
- **INDÍCIO** = fonte secundária (notícia, manual de terceiro, página comercial). Precisa de confirmação com a plataforma.
- **NÃO ENCONTRADO** = pesquisado e não achado; os lugares pesquisados estão citados.

Tipos da missão: A API pública · B API autenticada · C API comercial de parceiro · D consulta automatizada permitida · E operação manual assistida.

---

## 1. Resumo para a Diretoria

1. **PNCP (consulta)** funciona sem credencial e foi testado de verdade: contratações por data de publicação, contratações com proposta em aberto, atas e contratos. Itens e arquivos de cada contratação vêm de outra API do PNCP (a de integração), por GET público documentado no Manual de Integração v2.6 — **essa parte não foi provada hoje**: respondeu HTTP 503 em todas as tentativas de domingo à noite; os itens foram obtidos pelo Compras.gov como contingência (provado). **A API de consulta não tem busca por texto**: para achar "calibração" é preciso baixar tudo por data e modalidade e filtrar no nosso servidor. Volume medido: cerca de 1.050 pregões eletrônicos publicados por dia e 17,7 mil pregões com proposta em aberto. Há limite de requisições (HTTP 429 depois de 38 chamadas seguidas em menos de 3 segundos, liberado em cerca de 26 segundos; e ainda 8 vezes em 256 chamadas feitas a 1 por 1,5 s). Uma varredura real achou 60 oportunidades aderentes com proposta aberta, entre elas NR-13 em vasos de pressão (IMBEL, `00444232000139-1-001311/2026`) e calibração de equipamentos de laboratório.
2. **Compras.gov.br dados abertos** funciona sem credencial e foi testado. É útil como complemento (catálogo CATMAT/CATSER, preços praticados, atas de registro de preços, contratos, itens com resultado), **mas não serve como radar principal**: no mesmo dia 30/10/2026 ele tinha 47 pregões eletrônicos contra 316 no PNCP (é um espelho com atraso), usa códigos de modalidade diferentes dos do PNCP e trata a data final como exclusiva.
3. **Portal de Compras Públicas (PUB-003)** tem API documentada e pública na forma (lista de processos, processos recebendo propostas, anexos, itens em disputa, **chat do processo**, situação, atas), mas exige uma chave `publicKey` pedida por formulário (resposta em até 7 dias úteis). É o único portal de disputa encontrado com API que poderia trazer mensagens do pregoeiro. Tipo B. Recomendo pedir a chave já.
4. **Petronect, Mercado Eletrônico, Bionexo, SmartCompras, Nimbi e SAP Ariba** têm integração de parceiro (tipo C): exigem cadastro, contrato ou taxa. Nenhuma foi testada (sem credencial). O dono precisa decidir se contrata.
5. **Os demais portais de disputa públicos (BLL, BNC, Licitanet, Licitações-e, BBMNET, Licitar Digital, Compras BR) e os 9 portais estaduais não têm API pública encontrada.** Para eles, a **publicação** chega pelo PNCP (obrigação da Lei 14.133/2021), e o campo `usuarioNome` do PNCP mostra qual sistema publicou (provado: BLL, BNC, Licitanet, Licitar Digital, BBMNET, Licitações-e, Compras.gov.br e portais estaduais aparecem com esse nome; sistemas municipais de gestão também aparecem, e aí a plataforma da sessão vem do edital). **A sessão, os lances e as mensagens do pregoeiro não passam pelo PNCP**: ficam em operação manual assistida (tipo E), com e-mail de aviso da própria plataforma como canal de alerta.
6. Nenhuma plataforma de disputa encontrada autoriza envio automático de lances por API para fornecedor. O modo "automático autorizado" da missão não tem, hoje, plataforma elegível comprovada.

---

## 2. Tabela das 33 plataformas

Legenda de prioridade: P1 primeira versão · P2 logo após (depende de pedido de credencial) · P3 depende de contrato/decisão comercial · P4 só operação assistida e e-mail.

"Coberto pelo PNCP" = a publicação do edital (aviso, itens, arquivos) chega pelo PNCP porque o comprador é ente público sujeito à Lei 14.133/2021. Sessão, lances, chat e convocações **não** são cobertos.

### 2.1 Públicos nacionais

| Código | Plataforma | Endereço validado (01/11/2026) | Tipo | O que a API cobre | Autenticação | Coberto pelo PNCP | O que precisa do dono | Prioridade | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| PUB-001 | PNCP | https://pncp.gov.br (site exige navegador; a API responde em `https://pncp.gov.br/api/consulta` e `https://pncp.gov.br/api/pncp`) | A | Contratações por publicação, por atualização e com proposta em aberto; atas; contratos; PCA; detalhe da compra; itens, arquivos, resultados e histórico da compra (API de integração, GET público) | Nenhuma para GET | É a própria fonte | Nada | P1 | PROVADO a consulta (seção 3); itens/arquivos DOCUMENTADO, HTTP 503 hoje; https://pncp.gov.br/api/consulta/v3/api-docs ; https://pncp.gov.br/manual/pt-br/latest/singlehtml/ |
| PUB-002 | Compras.gov.br | https://www.gov.br/compras (sistema de disputa); dados abertos em https://dadosabertos.compras.gov.br | A (consulta) / E (sessão) | Espelho das contratações 14.133 do PNCP, itens, resultados, ARP, contratos, catálogo CATMAT/CATSER, preços praticados, legado 8.666 | Nenhuma para GET de consulta (a especificação também lista `/autenticacao/login` e `/usuarios/criar`, não necessários para consulta) | Sim (órgãos federais e os demais que usam o sistema publicam no PNCP) | Nada para consulta. Sessão: certificado/login gov.br do representante, manual | P1 (complemento) | PROVADO (seção 4); https://dadosabertos.compras.gov.br/v3/api-docs ; https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos/documentacao-interativa-da-api-de-dados-abertos |
| PUB-003 | Portal de Compras Públicas | https://www.portaldecompraspublicas.com.br ; API em https://apipcp.portaldecompraspublicas.com.br | B | `listarProcessos`, `obterProcessosPropostas`, `processosAbertos` (filtro UF), `obterProcesso`, `obteranexoslicitacao`, `obterItensEmDisputa`, `obterChat` (frases do chat do processo, com `idUltimaFrase`), `obterStatusProcesso`, `obterAtas`, `processosFornecedor`, `obterProcessosPoucaParticipacao` (versão 2.2.2) | `publicKey` por parâmetro; sem chave a API responde HTTP 400 (PROVADO) | Sim para a publicação; chat e disputa não | Abrir chamado no formulário do portal: setor "Relações Institucionais", área "ERP", assunto "solicitação de integração com ERP". Chave chega por e-mail em até 7 dias úteis. Confirmar por escrito que fornecedor pode usar a chave e quais limites valem | P2 (pedir já) | DOCUMENTADO: https://bibliotecapcp.zendesk.com/hc/pt-br/articles/4593549708570 ; https://bibliotecapcp.zendesk.com/hc/pt-br/articles/4593611793690 ; https://apipcp.portaldecompraspublicas.com.br/publico/apidoc/ |
| PUB-004 | BLL Compras | https://bllcompras.com (redireciona para `/Home/Login`, com reCAPTCHA) | E | NÃO ENCONTRADO (pesquisado no site, em buscas por "BLL API/integração/webservice" e no regulamento) | Login com reCAPTCHA | Sim (publicação); sessão não | Manter cadastro de fornecedor; ativar e-mails de aviso da plataforma; perguntar por escrito à BLL se há API para fornecedor | P4 | Página de login observada por curl; INDÍCIO de ausência de API: https://github.com/n4rch6pjt9-rgb/LicitaGym/issues/268 |
| PUB-005 | Licitanet | https://licitanet.com.br (responde HTTP 403 a cliente automatizado) | E | NÃO ENCONTRADO (site bloqueia acesso automatizado; buscas por "Licitanet API/integração") | — | Sim (publicação) | Idem BLL | P4 | HTTP 403 observado; busca sem resultado oficial |
| PUB-006 | Licitações-e (Banco do Brasil) | https://www.licitacoes-e.com.br (sistema em uso em 2026) e https://licitacoes-e2.bb.com.br (redireciona para `/aop-inter-estatico/`, protegido por desafio Cloudflare) | E | NÃO ENCONTRADO | Login; desafio Cloudflare no endereço novo | Sim (publicação) | Cadastro de fornecedor no BB; avisos por e-mail | P4 | Desafio Cloudflare observado por curl; uso em 2026: https://brde.com.br/wp-content/uploads/2026/04/Modelos-de-Documentos_IN-2026-002.pdf |
| PUB-007 | BNC Compras | https://bnccompras.com (mesma tela de login da BLL, com reCAPTCHA) | E | NÃO ENCONTRADO | Login com reCAPTCHA | Sim (publicação) | Idem BLL | P4 | Página de login observada por curl |
| PUB-008 | BBMNET | **Endereço corrigido: https://bbmnet.com.br** (o da lista, `www.bbmnetlicitacoes.com.br`, respondeu HTTP 404) | E (C a confirmar) | Os termos de uso citam "desenvolvimento e manutenção de APIs para integrações com ERPs e com órgãos de controle", sem documentação pública e sem dizer se vale para fornecedor | Login | Sim (os termos afirmam integração com o PNCP) | Perguntar à BBM se a API de ERP atende fornecedor e em que condições | P3 | DOCUMENTADO: termos de uso fev/2025, cláusulas 1.6, 3.12 e 7.3: https://bbmnet.com.br/wp-content/uploads/2025/02/TERMOS-E-CONDICOES-DE-USO-DO-BBMNET-LICITACOES-REGULAMENTO-GERAL-FINAL-Fevereiro-de-2025-1.pdf |
| PUB-009 | Licitar Digital | https://www.licitardigital.com.br (HTTP 403 a cliente automatizado) | E | NÃO ENCONTRADO | — | Sim (publicação) | Idem BLL | P4 | HTTP 403 observado; INDÍCIO de integração com terceiros: https://www.effecti.com.br/democratizacao-compras-publicas-licitar-digital |
| PUB-010 | Compras BR | **Endereço validado: https://comprasbr.com.br** (HTTP 200; área do fornecedor em `/fornecedor/`) | E | NÃO ENCONTRADO | — | Sim (publicação) | Idem BLL | P4 | https://comprasbr.com.br/ ; https://comprasbr.com.br/fornecedor/ |

### 2.2 Estaduais

Todos os portais estaduais são de entes públicos sujeitos à Lei 14.133/2021, que obriga a divulgação no PNCP (art. 54 para o edital; art. 94 para contratos; art. 174 cria o PNCP). Logo a publicação chega pelo conector PNCP com filtro `uf` e `cnpj`. Nenhum deles tem API pública de sessão/lances encontrada.

| Código | Plataforma | Endereço validado (01/11/2026) | Tipo | O que a API cobre | Autenticação | Coberto pelo PNCP | O que precisa do dono | Prioridade | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| EST-001 | Goiás (ComprasNet.GO / SISLOG) | https://www.comprasnet.go.gov.br (HTTP 200); editais de 2026 também indicam `sislog.go.gov.br` | E | NÃO ENCONTRADO | Cadastro de fornecedor estadual | Sim | Cadastro no ComprasNet.GO; e-mail de aviso | P4 | Decreto GO 9.666/2020 e avisos 2026: https://goias.gov.br/administracao/wp-content/uploads/sites/27/2026/05/aviso-de-licitacao.pdf |
| EST-002 | Rio de Janeiro (SIGA) | https://www.compras.rj.gov.br (HTTP 200) | E | NÃO ENCONTRADO | Cadastro estadual | Sim | Idem | P4 | Endereço testado por curl |
| EST-003 | Minas Gerais (Portal de Compras MG) | https://compras.mg.gov.br (HTTP 200) | E | NÃO ENCONTRADO (o portal de dados abertos do estado não traz API de licitações em andamento) | Cadastro (CAGEF) | Sim | Idem | P4 | Endereço testado; https://www.transparencia.mg.gov.br/dados-abertos |
| EST-004 | São Paulo (BEC/SP e sucessores) | https://www.bec.sp.gov.br (HTTP 200) | E | NÃO ENCONTRADO. Há órgãos paulistas usando o Compras.gov.br (ex.: Câmara Municipal de SP em 2026); não achei ato oficial de migração estadual | Cadastro CAUFESP | Sim | Confirmar com a SEFAZ-SP a plataforma vigente por órgão | P4 | https://www.saopaulo.sp.leg.br/licitacao/pregao-eletronico-n-13-2026/ |
| EST-005 | Rio Grande do Sul | https://www.compras.rs.gov.br (HTTP 200); CELIC em https://www.celic.rs.gov.br | E | NÃO ENCONTRADO | Cadastro CELIC | Sim | Idem | P4 | Endereços testados |
| EST-006 | Santa Catarina (e-LIC) | https://e-lic.sc.gov.br (HTTP 200) | E | NÃO ENCONTRADO. Editais 2025 da ALESC usam o Compras.gov.br; não achei ato de substituição do e-LIC | Cadastro estadual | Sim | Confirmar plataforma vigente por órgão | P4 | https://transparencia.alesc.sc.gov.br/licitacoes/download/672 |
| EST-007 | Mato Grosso (SIAG) | https://portalaquisicoes.seplag.mt.gov.br (o endereço `aquisicoes.seplag.mt.gov.br` redireciona para ele) | E | NÃO ENCONTRADO | Cadastro estadual | Sim | Idem | P4 | Endereço testado |
| EST-008 | Amazonas (e-Compras AM) | https://www.e-compras.am.gov.br (HTTP 200) | E | NÃO ENCONTRADO | Cadastro estadual | Sim. Atenção ao fuso: Amazonas usa America/Manaus (UTC−4) | Idem | P4 | Endereço testado |
| EST-009 | Pernambuco (PE-Integrado) | https://www.peintegrado.pe.gov.br (HTTP 200) | E | NÃO ENCONTRADO | Cadastro estadual | Sim | Idem | P4 | Endereço testado |

### 2.3 Compras hospitalares (privadas)

Compras privadas **não** são publicadas no PNCP. Sem API ou e-mail da plataforma, não há como o SGO+ saber da cotação.

| Código | Plataforma | Endereço validado | Tipo | O que a integração cobre | Autenticação | Coberto pelo PNCP | O que precisa do dono | Prioridade | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| SAU-001 | Bionexo | https://bionexo.com (HTTP 200) | C | Integração do ERP do fornecedor para responder cotações ("Resposta Automática"); criação de cotações por webservice ou arquivo; exemplo documentado de download de cotação em layout XML por ERP (TOTVS Winthor). Documento institucional indica taxa para integração com ERPs. Sem documentação pública de endpoints | Credencial de integração fornecida pela Bionexo | Não | Contato comercial Bionexo (área de Vendas/Integrações): pedir documentação, custo e se aceita ERP próprio (SGO+) | P3 (primeira entre as privadas) | INDÍCIO/DOCUMENTADO comercial: https://bionexo.com/marketplace-vendas/ ; https://bionexo.com/marketplace-compras/ ; https://tdn.totvs.com/pages/viewpage.action?pageId=741839078 ; https://www-api-prod-institucionais-bionexo.azurewebsites.net/files/acc53d70-18bc-4658-a6dd-8441b61bd574.pdf |
| SAU-002 | Apoio Cotações | https://www.apoiocotacoes.com.br (HTTP 200, só tela de login) | E (C a confirmar) | NÃO ENCONTRADO documentação de API. A Apoio declara fazer parte do ecossistema MV | Login | Não | Perguntar à Apoio se há integração para fornecedor | P3 | https://jornaldobras.com.br/noticia/68806/comprador-inteligente-e-o-destaque-da-apoio-para-a-feira-hospitalar-2025 |
| SAU-003 | Huma | https://huma.com.br (HTTP 200) | E | NÃO ENCONTRADO (pesquisado no site e em buscas "Huma compras saúde/fornecedor/API"; a página inicial não descreve API) | — | Não | Confirmar com o dono qual é a plataforma (o nome é ambíguo nas buscas) e pedir contato | P3 | Página inicial lida por curl |
| SAU-004 | GTPLAN | https://gtplan.net (HTTP 200) | C a confirmar | Plataforma de planejamento e compras com "integração digital com fornecedores" e cadastro de fornecedor; sem documentação pública de API | — | Não | Contato comercial GTPLAN | P3 | Página inicial lida por curl |
| SAU-005 | UNIDAS Saúde (SIC) | https://www.portalunidas.com.br (HTTP 200) | E | NÃO ENCONTRADO. Portal com pré-cadastro de fornecedores para autogestões associadas | Login | Não | Pré-cadastro de fornecedor | P4 | Página inicial lida por curl |
| SAU-006 | SmartCompras | https://smartcompras.com.br (HTTP 200) | C | Página oficial de integração com ERP. Para fornecedores: importar catálogo, configurar cotações automáticas, baixar cotações aceitas e dados de pedido, sincronizar estoque. Sem documentação pública de endpoints | A combinar | Não | Contato comercial: pedir documentação e custo | P3 | https://smartcompras.com.br/integracao |
| SAU-007 | GC Cotações | https://www.gccotacoes.com.br (HTTP 200) | E | NÃO ENCONTRADO. Site declara custo zero para fornecedor | Login | Não | Cadastro de fornecedor | P4 | Página inicial lida por curl |
| SAU-008 | Gênesis Next | https://www.genesisnext.com.br (HTTP 200) | E | NÃO ENCONTRADO | — | Não | Contato comercial | P4 | Página inicial lida por curl |
| SAU-009 | Compra Ágil | https://www.compragil.com.br (HTTP 200) | E | NÃO ENCONTRADO | — | Não | Contato comercial | P4 | Página inicial lida por curl |

### 2.4 Corporativas e industriais

| Código | Plataforma | Endereço validado | Tipo | O que a integração cobre | Autenticação | Coberto pelo PNCP | O que precisa do dono | Prioridade | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| IND-001 | Petronect | https://www.petronect.com.br (redireciona para `/irj/portal/anonymous`) | C | "API Store" com APIs de Oportunidades Públicas Abertas e Concluídas da Petrobras, acessada pela área "Minha Petronect" | Cadastro ativo + adesão à taxa de acesso (valor não publicado) | Não (Petrobras segue a Lei 13.303/2016 e regulamento próprio) | Ter ou renovar cadastro na Petronect e contratar a taxa; pedir a documentação da API Store | P3 (primeira entre as industriais) | INDÍCIO (notícia de 31/03/2025): https://convergenciadigital.com.br/?p=39925 |
| IND-002 | Mercado Eletrônico (ME) | https://www.mercadoeletronico.com redireciona para https://institucional.me.com.br ; portal de desenvolvedor https://developer.me.com.br | C | Portal com referência de mais de 370 endpoints e mais de 30 tipos de webhook; guia para fornecedor aceitar/recusar pedido; credenciais no Partner's Portal | Chaves de API pelo Partner's Portal (https://partner.me.com.br) | Não | Confirmar com o ME se fornecedor (não só comprador) recebe credencial e se cotações/RFQ estão no escopo | P3 | DOCUMENTADO: https://developer.me.com.br/ |
| IND-003 | SAP Ariba (SAP Business Network) | https://www.ariba.com redireciona para https://www.sap.com/products/spend-management.html | C (API) / E (alertas) | Conta gratuita de fornecedor no SAP Business Network Discovery recebe por e-mail as publicações de compradores compatíveis com o perfil. As APIs de sourcing (api.sap.com) são do lado do comprador; não achei API de fornecedor para descobrir eventos | Conta SAP Business Network | Não | Criar/atualizar a conta gratuita de fornecedor e configurar categorias (alerta por e-mail) | P3 | https://learning.sap.com/courses/overview-of-sap-business-network/describing-the-sap-ariba-discovery-functionality_de47d9e6-98d2-415c-8844-d1e3148bd7cf |
| IND-004 | Nimbi | https://nimbi.com.br (HTTP 200) | C (lado comprador) / E (fornecedor) | API REST de parceiro (`/API/rest/Partner/v1/RFQ`, aprovação de pedido) documentada pela Senior para o ERP comprador; fornecedor se cadastra e responde no portal | ClientAPI_ID/ClientAPI_Key (do comprador) | Não | Cadastro de fornecedor no portal Nimbi dos clientes que usam a Nimbi (ex.: Vale) | P4 | https://documentacao.senior.com.br/seniorxplatform/manual-do-usuario/erp/Subsystems/index/backoffice/suprimentos/gestao-compras/cotacao-compra.htm ; https://www.vale.com/portal-nimbi |
| IND-005 | Senior Sistemas | https://www.senior.com.br (HTTP 200) | E | A Senior é fornecedora de ERP; o e-Procurement dela usa a Nimbi (IND-004) e o Cotei. Não achei API para o fornecedor descobrir cotações | — | Não | Cadastro de fornecedor nos clientes que usam Senior | P4 | https://www.senior.com.br/portal-de-fornecedores/ ; https://documentacao.senior.com.br/gestaoempresarialerp/5.10.4/integracoes/integracao-erp-cotei.htm |

---

## 3. Testes reais — PNCP

Todos os testes foram GET públicos, sem credencial, feitos desta máquina (Windows, rede do escritório) em 01/11/2026 entre 20h e 22h (horário de Brasília).

### 3.1 Especificação oficial lida

- `GET https://pncp.gov.br/api/consulta/v3/api-docs` → HTTP 200, 37.943 bytes, título "API PNCP CONSULTA", contato Serpro. Rotas encontradas:

| Rota | Obrigatórios | Opcionais | `tamanhoPagina` |
|---|---|---|---|
| `/v1/contratacoes/publicacao` | `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`, `pagina` | `codigoModoDisputa`, `uf`, `codigoMunicipioIbge`, `cnpj`, `codigoUnidadeAdministrativa`, `idUsuario` | 10 a 50 |
| `/v1/contratacoes/proposta` | `dataFinal`, `pagina` | `codigoModalidadeContratacao`, `uf`, `codigoMunicipioIbge`, `cnpj`, `codigoUnidadeAdministrativa`, `idUsuario` | 10 a 50 |
| `/v1/contratacoes/atualizacao` | `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`, `pagina` | como em publicação | 10 a 50 |
| `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` | os três | — | — |
| `/v1/atas`, `/v1/atas/atualizacao` | `dataInicial`, `dataFinal`, `pagina` | `idUsuario`, `cnpj`, `codigoUnidadeAdministrativa` | 10 a 500 |
| `/v1/contratos`, `/v1/contratos/atualizacao` | `dataInicial`, `dataFinal`, `pagina` | `cnpjOrgao`, `codigoUnidadeAdministrativa`, `usuarioId` | 10 a 500 |
| `/v1/pca/...`, `/v1/instrumentoscobranca/inclusao` | — | — | 10 a 500 / 10 a 100 |

- **A API de consulta não tem parâmetro de texto livre** (objeto, palavra-chave). Nenhuma rota da especificação aceita texto.
- **Itens e arquivos não estão na API de consulta.** Estão na API de integração do PNCP, documentada no Manual de Integração v2.6 (`https://pncp.gov.br/manual/pt-br/latest/singlehtml/`, seção 11.13 "Consultar Itens de uma Contratação"), com base `https://pncp.gov.br/api/pncp` e rotas GET:
  - `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens` (com `pagina` e `tamanhoPagina`)
  - `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens/{numeroItem}/resultados`
  - `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos` e `/arquivos/{sequencialDocumento}` (download)
  - `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico`
  O exemplo do manual não usa cabeçalho de autenticação para esses GET. **Não foi possível provar hoje**: a especificação dessa API (`/api/pncp/v3/api-docs`, swagger) e as próprias rotas (`.../compras/2026/1311/itens`, `.../arquivos`, e o detalhe `.../compras/2026/1311`) responderam **HTTP 503 "No server is available to handle this request"** em todas as tentativas (01/11/2026, domingo, entre 21h e 22h), com e sem `User-Agent` de navegador. Enquanto isso, a API de consulta no mesmo domínio respondia HTTP 200. Pendência: repetir em dia útil antes de codar. Contingência provada: os itens da mesma contratação vieram pelo Compras.gov (`2.1_consultarItensContratacoes_PNCP_14133_Id?tipo=numeroControlePNCPCompra` ou `tipo=idCompra`, seção 3.5). Para arquivos (edital e anexos) não há contingência por API além do PNCP.

### 3.2 Contratações publicadas por data e modalidade

```
curl "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=20261030&dataFinal=20261030&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=50"
HTTP 200, 90.914 bytes, 0,35 s
{ "totalRegistros": 316, "totalPaginas": 7, "numeroPagina": 1, "paginasRestantes": 6, "empty": false, "data": [ ... ] }
```

Primeiro registro (órgão público; sem dado pessoal):

```
"numeroControlePNCP": "80881915000192-1-000105/2026",
"orgaoEntidade": { "cnpj": "80881915000192", "razaoSocial": "MUNICIPIO DE LINDOESTE", "poderId": "N", "esferaId": "M" },
"unidadeOrgao": { "ufSigla": "PR", "municipioNome": "Lindoeste", "codigoIbge": "4113452", "nomeUnidade": "Prefeitura Municipal de Lindoeste", "codigoUnidade": "2" },
"anoCompra": 2026, "sequencialCompra": 105, "numeroCompra": "PR70", "processo": "PR70/2026",
"modalidadeId": 6, "modalidadeNome": "Pregão - Eletrônico", "modoDisputaId": 1, "modoDisputaNome": "Aberto",
"amparoLegal": { "codigo": 1, "nome": "Lei 14.133/2021, Art. 28, I" },
"srp": false, "valorTotalEstimado": 46579.84, "valorTotalHomologado": null,
"dataAberturaProposta": "2026-10-29T08:00:01", "dataEncerramentoProposta": "2026-11-17T13:00:01",
"dataPublicacaoPncp": "2026-10-30T00:00:04", "dataInclusao": "...", "dataAtualizacao": "...", "dataAtualizacaoGlobal": "...",
"situacaoCompraId": 1, "situacaoCompraNome": "Divulgada no PNCP",
"tipoInstrumentoConvocatorioCodigo": 1, "tipoInstrumentoConvocatorioNome": "Edital",
"linkSistemaOrigem": null, "linkProcessoEletronico": null, "informacaoComplementar": null,
"usuarioNome": "Pública Tecnologia Ltda."
```

### 3.3 Contratações com proposta em aberto

```
curl "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=20261231&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=50"
HTTP 200, 0,43 s → totalRegistros 17.727, totalPaginas 355
curl ".../proposta?dataFinal=20261231&codigoModalidadeContratacao=8&pagina=1&tamanhoPagina=50"
HTTP 200, 25,1 s (lento) → totalRegistros 3.367, totalPaginas 68
curl ".../proposta?dataFinal=20261231&codigoModalidadeContratacao=6&uf=GO&pagina=1&tamanhoPagina=10"
HTTP 200, 0,83 s
```

Observação: sem `codigoModalidadeContratacao`, a rota `proposta` aceitou e devolveu registros antigos (credenciamento de 2023 ainda com prazo aberto). O filtro de modalidade deve ser sempre informado.

### 3.4 Limites, erros e comportamento observados

| Teste | Resultado |
|---|---|
| `tamanhoPagina=51` em `publicacao` | HTTP 400 `{"message":"Tamanho de página inválido"}` → máximo 50 |
| `tamanhoPagina=5` | HTTP 400 `must be greater than or equal to 10` → mínimo 10 |
| Sem `codigoModalidadeContratacao` em `publicacao` | HTTP 400 `Required request parameter 'codigoModalidadeContratacao' ... is not present` |
| Data `2026-10-30` (com hífen) | HTTP 422 `Data Inicial inválida, deve estar no formato yyyyMMdd.` |
| Janela longa (`20260101` a `20261030`, pregão) | HTTP 200 em 5,7 s (aceita; a lentidão cresce com a janela) |
| Rajada sem pausa | HTTP 429 na 38ª chamada, após 2,8 s; página HTML "Limite de requisições excedido" com "Support ID"; **liberou em cerca de 26 s**. Em outra rodada, 40 chamadas seguidas passaram após 30 s de descanso. Não há cabeçalho `Retry-After` nem `X-RateLimit-*` |
| Tempo de resposta | Mediana entre 0,2 s e 0,5 s por página; casos de 2,6 s a 25 s (rota `proposta` com dispensa) |
| Cabeçalhos | `access-control-allow-origin: *`, `cache-control: no-cache`, sem ETag |
| Site `https://pncp.gov.br/` sem cabeçalho de navegador | conexão encerrada sem resposta (HTTP 000); com `User-Agent` de navegador, HTTP 200. A API `/api/consulta` respondeu também sem `User-Agent`. O conector deve sempre enviar um `User-Agent` identificado |
| Fuso das datas | As datas de negócio vêm **sem fuso** (`2026-11-17T13:00:01`). As mensagens de erro do próprio servidor vêm em `-03:00`. Conclusão: tratar como horário de Brasília **declarado pela fonte**, gravar o texto original e marcar o fuso como presumido (para AM, MT, MS, RO, RR, AC, o edital pode usar horário local; confirmar no edital) |

Regra de taxa recomendada para o coletor (ver também 3.6, onde 1 req/1,5 s ainda gerou 429): no máximo 1 requisição a cada 3 s, uma fila única por host, espera de 30 s ao receber 429 (corpo HTML), depois 60 s, 120 s, e alerta à sentinela após 5 falhas seguidas.

### 3.5 Exemplo real de oportunidade ligada aos serviços da Metrolabs

Oportunidade encontrada pela varredura (seção 3.6) e confirmada pelo detalhe:

```
curl "https://pncp.gov.br/api/consulta/v1/orgaos/00444232000139/compras/2026/1311"
HTTP 200, 2.359 bytes, 0,19 s
"numeroControlePNCP": "00444232000139-1-001311/2026",
"orgaoEntidade": { "cnpj": "00444232000139", "razaoSocial": "INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL", "esferaId": "N" },
"unidadeOrgao": { "ufSigla": "RJ", "municipioNome": "Magé", "codigoUnidade": "168008", "nomeUnidade": "INDUSTRIA DE MATERIAL BELICO DO BRASIL/FE" },
"objetoCompra": "Contratação de empresa especializada em Inspeção de Segurança, NR-13, em vasos de Pressão instalados na dependências da IMBEL - Fábrica da Estrela, conforme condições, quantidades e exigências deste instrumento.",
"modalidadeId": 6, "modalidadeNome": "Pregão - Eletrônico", "modoDisputaNome": "Aberto", "srp": true,
"amparoLegal": { "codigo": 113, "nome": "Lei 13.303/2016, Art. 32, IV" },
"valorTotalEstimado": 100553.73, "orcamentoSigilosoDescricao": "Compra sem sigilo",
"dataPublicacaoPncp": "2026-10-19T04:00:13", "dataAberturaProposta": "2026-10-20T08:00:00",
"dataEncerramentoProposta": "2026-11-13T08:00:00", "situacaoCompraNome": "Divulgada no PNCP",
"linkSistemaOrigem": "https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=16800805002352026",
"usuarioNome": "Compras.gov.br", "dataAtualizacaoGlobal": "2026-10-19T04:01:00"
```

Observações: (1) o detalhe traz campos que a listagem não traz (`orcamentoSigilosoCodigo`, `existeResultado`) e o `linkSistemaOrigem` aponta para o Compras.gov com o mesmo número `16800805002352026` que o Compras.gov usa como `idCompra` — isso prova a ligação entre os dois sistemas; (2) é estatal (IMBEL), por isso o amparo é a Lei 13.303/2016, não a 14.133; o conector não pode presumir a lei pela modalidade.

Item da mesma contratação, pelo Compras.gov (contingência, PROVADO):
```
curl "https://dadosabertos.compras.gov.br/modulo-contratacoes/2.1_consultarItensContratacoes_PNCP_14133_Id?tipo=idCompra&codigo=16800805002352026"
HTTP 200, 0,30 s
"idContratacaoPNCP": "00444232000139-1-001311/2026", "numeroItemPncp": 1,
"descricaoResumida": "Inspeção de Segurança Contratação de empresa especializada em Inspeção de Segurança, NR-13, em vasos de Pressão ...",
"materialOuServico": "S", "criterioJulgamentoNome": "Menor preço", "situacaoCompraItemNome": "Em andamento",
"tipoBeneficioNome": "Sem benefício", "quantidade": 1.0, "valorUnitarioEstimado": 100553.73, "unidadeMedida": "UNIDADE",
"codItemCatalogo": null, "itemCategoriaNome": "Informática (TIC)"
```
Qualidade de dado: o item de NR-13 veio sem código CATSER (`codItemCatalogo: null`) e com categoria "Informática (TIC)". A classificação não pode depender de catálogo nem de categoria da fonte; precisa ler objeto, itens e edital (papel do Especialista 05 e validação do Especialista 03).

### 3.6 Varredura real (radar de teste)

Script `node` com fetch nativo, uma fila, pausa de 1,5 s entre chamadas, espera de 30 s em 429, `tamanhoPagina=50`, rota `contratacoes/publicacao`:

| Modalidade | Janela de publicação | Total na fonte | Páginas lidas |
|---|---|---|---|
| 6 Pregão eletrônico | 18/10 a 31/10/2026 | 14.734 | 120 de 295 (limite do teste) |
| 4 Concorrência eletrônica | 18/10 a 31/10/2026 | 2.572 | 52 de 52 |
| 8 Dispensa | 29/10 a 31/10/2026 | 3.771 | 76 de 76 |

Resultado: 256 chamadas, 12.343 registros lidos, **8 respostas 429 mesmo com pausa de 1,5 s** (uma a cada 30 chamadas, aproximadamente), mediana de 501 ms, máximo de 2,0 s, nenhum outro erro. Conclusão de taxa: o ritmo sustentável fica abaixo de 1 chamada a cada 2 s; recomendo 1 a cada 3 s no coletor (a varredura completa de 355 páginas de propostas abertas leva cerca de 18 minutos, aceitável à noite).

Filtro por expressão regular no objeto (calibração, qualificação/validação térmica, autoclave, termodesinfecção, ultrassônica, NR-13, vasos de pressão, engenharia clínica, metrologia, esterilização, datalogger, osmose reversa): **76 achados, 60 com proposta ainda aberta**. Exemplos aderentes (proposta aberta em 01/11/2026):

| numeroControlePNCP | UF | Modalidade | Encerra propostas | Plataforma que publicou (`usuarioNome`) | Objeto (resumo) |
|---|---|---|---|---|---|
| 00444232000139-1-001311/2026 | RJ | Pregão eletrônico | 13/11/2026 08:00 | Compras.gov.br | Inspeção de segurança NR-13 em vasos de pressão (IMBEL) |
| 00348003000110-1-001347/2026 | RJ | Pregão eletrônico | 05/11/2026 14:00 | Compras.gov.br | Calibração e manutenção preventiva e corretiva de equipamentos de laboratório |
| 11806275000133-1-000075/2026 | PR | Pregão eletrônico | 09/11/2026 09:01 | Compras.gov.br | Manutenção preventiva, corretiva e calibração de equipamentos de laboratórios |
| 78680337000770-1-000431/2026 | PR | Pregão eletrônico | 05/11/2026 08:30 | Compras.gov.br | Manutenção preventiva com calibração de equipamentos laboratoriais e de armazenamento de leite |
| 78680337000770-1-000430/2026 | PR | Pregão eletrônico | 04/11/2026 08:30 | SEAP-PR | Manutenção preventiva com certificado de calibração e ajuste |
| 08109444000171-1-000139/2026 | PA | Pregão eletrônico | 06/11/2026 09:00 | Compras.gov.br | Engenharia clínica com dedicação exclusiva de mão de obra |
| 00394429000100-1-002721/2026 | PA | Pregão eletrônico | 06/11/2026 09:00 | Compras.gov.br | Engenharia biomédica/clínica com software dedicado |
| 62759595000110-1-000048/2026 | RJ | Dispensa | 09/11/2026 08:00 | Compras.gov.br | Calibração de balanças por laboratório da RBC |

Falsos positivos reais na mesma varredura (provam que palavra-chave não basta, como a missão exige): "esterilização cirúrgica de cães e gatos" (vários municípios de SP), "soluções de calibração" (reagentes de laboratório), "embalagem para esterilização" (material de consumo), "autoclave horizontal de mesa" dentro de compra de equipamentos odontológicos. A triagem final é do Especialista 05 (IA) com validação do Especialista 03.

**Plataforma de origem (`usuarioNome`) — distribuição real nos 12.343 registros:** Compras.gov.br 3.182; ECustomize Consultoria em Software S.A. 1.035 (objetos com prefixo "[Portal de Compras Públicas]"); BLL Compras 625; IPM Sistemas 536; Bolsa Nacional de Compras – BNC 432; Licitanet 423; Betha Sistemas 397; Licitar Digital 370; SMARAPD 304; Governançabrasil 283; AZ Informática 248; Novo BBMNET Licitações 247; Fiorilli 241; Tecnosweb 232; Elotech 199; Megasoft 183; Licitações-E BB 173; Secretaria da Administração da Bahia 169; SEAP-PR 163; BR Conectado 141; PROCERGS (RS) 108; Portal de Compras do Estado de Minas Gerais 107; Secretaria do Planejamento e Gestão do Ceará 73; Compras Pará (presente).

Leitura correta: `usuarioNome` é **o sistema que enviou a publicação ao PNCP**. Quando é um portal de disputa (Compras.gov.br, BLL, BNC, Licitanet, Licitar Digital, BBMNET, Licitações-e, portais estaduais), ele indica onde a sessão acontece. Quando é um sistema de gestão municipal (IPM, Betha, Fiorilli, Elotech etc.) ou um integrador (ECustomize publica pelo Portal de Compras Públicas), a plataforma da sessão precisa vir do edital ou do `linkSistemaOrigem`. O conector deve manter uma tabela de correspondência `usuarioNome → código do portal` revisada por pessoa, nunca presumida. Isso também prova que BLL, BNC, Licitanet, Licitar Digital, BBMNET, Licitações-e, Compras.gov.br e os portais estaduais de MG, RS (PROCERGS) e outros publicam no PNCP.

### 3.7 Busca textual usada pelo site do PNCP

O site do PNCP usa `https://pncp.gov.br/api/search/?q=...&tipos_documento=edital&status=recebendo_proposta&pagina=1&tam_pagina=10`. Uma chamada única de verificação respondeu HTTP 200 (com `User-Agent` de navegador) e `total: 811` para `q=calibracao`, com campos próprios (`numero_controle_pncp`, `description`, `data_fim_vigencia`, `modalidade_licitacao_nome`, `usuario_nome` etc.). **Essa rota não aparece na especificação da API de consulta nem no Manual de Integração v2.6** (busca por "api/search" no manual: zero ocorrências). Classificação: **não documentada — não usar sem validação** formal com o PNCP/Serpro. Além disso, o resultado é por semelhança (o primeiro resultado para "calibracao" era uma compra de dispositivos médicos), o que reforça que a triagem deve ser nossa.

### 3.8 Conferência dos campos supostos pelo arquiteto (doc 01, item 3.3)

| Campo do arquiteto | Campo real no PNCP (consulta) | Situação |
|---|---|---|
| numero_controle_pncp | `numeroControlePNCP` | Confere (formato `<cnpj>-1-<sequencial>/<ano>` confirmado) |
| orgao_cnpj, orgao_nome, esfera, poder | `orgaoEntidade.cnpj`, `.razaoSocial`, `.esferaId` (F/E/M/D), `.poderId` (E/L/J/N) | Confere, com objeto aninhado |
| uf, municipio, codigo_ibge, unidade_codigo, unidade_nome | `unidadeOrgao.ufSigla`, `.municipioNome`, `.codigoIbge`, `.codigoUnidade`, `.nomeUnidade` | Confere |
| modalidade_codigo/nome | `modalidadeId`, `modalidadeNome` | Confere (no Compras.gov os códigos são outros; ver 4.3) |
| modo_disputa | `modoDisputaId`, `modoDisputaNome` | Confere |
| criterio_julgamento | **não existe na contratação**; aparece por item (`criterioJulgamentoId/Nome`) na API de itens | Ajustar: vai para o item |
| srp | `srp` | Confere |
| objeto, informacao_complementar | `objetoCompra`, `informacaoComplementar` | Confere |
| valor_estimado, valor_sigiloso | `valorTotalEstimado`; sigilo só por item ou no Compras.gov (`orcamentoSigilosoCodigo`) | Ajustar |
| situacao_fonte | `situacaoCompraId`, `situacaoCompraNome` | Confere |
| data_publicacao, abertura/encerramento de propostas | `dataPublicacaoPncp`, `dataAberturaProposta`, `dataEncerramentoProposta` | Confere |
| fuso_informado | **não existe** | Ajustar: o fuso é presumido (ver 3.4) |
| link_sistema_origem | `linkSistemaOrigem` (frequentemente `null`) e `linkProcessoEletronico` | Confere, mas não confiar nele para ligar ao portal de disputa; usar também `usuarioNome` |
| amparo_legal | `amparoLegal.codigo/nome/descricao` | Confere |
| ultima_alteracao_fonte_em | `dataAtualizacao` e `dataAtualizacaoGlobal` | Usar `dataAtualizacaoGlobal` (inclui itens/arquivos) para detectar retificação |
| (não previsto) | `usuarioNome` (sistema que publicou: ex. "Pública Tecnologia Ltda.", "Portal de Compras Públicas", "Compras.gov.br") | **Acrescentar**: indica em qual plataforma a sessão vai acontecer |
| (não previsto) | `tipoInstrumentoConvocatorioNome`, `orgaoSubRogado`, `unidadeSubRogada`, `fontesOrcamentarias`, `emendaParlamentar` | Acrescentar |
| Chave Compras.gov `CGOV:<uasg>-<modalidade>-<numero>/<ano>` | O Compras.gov devolve `idCompra` (ex. `78432006000072026`) **e o próprio `numeroControlePNCP`** | Simplificar: ligar pelo `numeroControlePNCP` que vem no Compras.gov; guardar `idCompra` como chave alternativa |

---

## 4. Testes reais — Compras.gov.br dados abertos

### 4.1 Especificação oficial lida

- `GET https://dadosabertos.compras.gov.br/v3/api-docs` → HTTP 200, 148.511 bytes, "API Compras.gov.br 1.0.0". Módulos: 01 Catálogo Material, 02 Catálogo Serviço, 03 Pesquisa de Preço, 04 PGC, 05 UASG, 06 Legado (8.666), 07 Contratações (14.133, espelho do PNCP), 08 ARP, 09 Contratos, 10 Fornecedor, 11 OCDS, 97 Indicadores.
- Rotas de contratação: `/modulo-contratacoes/1_consultarContratacoes_PNCP_14133` (obrigatórios `dataPublicacaoPncpInicial`, `dataPublicacaoPncpFinal` no formato `YYYY-MM-DD`, `codigoModalidade`; opcionais `unidadeOrgaoUfSigla`, `orgaoEntidadeCnpj`, `unidadeOrgaoCodigoIbge`, `amparoLegalCodigoPncp`, `contratacaoExcluida` etc.), `/2_consultarItensContratacoes_PNCP_14133` (filtros por `materialOuServico`, `codigoClasse`, `codigoGrupo`, `codItemCatalogo`, `codigoPdm`, `temResultado`), `/3_consultarResultadoItensContratacoes_PNCP_14133`. Tamanho de página: 10 a 500.
- **Também sem busca por texto** nas rotas 14.133. Só o legado RDC (`/modulo-legado/7_consultarRdc`) tem parâmetro `objeto`, irrelevante para a Lei 14.133. O caminho para "serviço de calibração" é o código CATSER do item (`codItemCatalogo`).

### 4.2 Chamadas

```
curl "https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133?pagina=1&tamanhoPagina=10&dataPublicacaoPncpInicial=2026-10-30&dataPublicacaoPncpFinal=2026-10-30&codigoModalidade=6"
HTTP 200, 0,25 s → {"resultado":[],"totalRegistros":0,"totalPaginas":0,"paginasRestantes":0}
```
Mesmo dia inicial e final devolve zero. Com final no dia seguinte:
```
...dataPublicacaoPncpInicial=2026-10-30&dataPublicacaoPncpFinal=2026-10-31&codigoModalidade=5 → totalRegistros 47 (pregão eletrônico)
...dataPublicacaoPncpInicial=2026-10-29&dataPublicacaoPncpFinal=2026-10-30&codigoModalidade=6 → totalRegistros 742 (dispensa)
```
Registro devolvido (órgão federal; sem dado pessoal):
```
"idCompra": "78432006000072026", "numeroControlePNCP": "00394502000144-1-014943/2026",
"orgaoEntidadeRazaoSocial": "COMANDO DA MARINHA", "unidadeOrgaoCodigoUnidade": "784320", "unidadeOrgaoUfSigla": "MA",
"codigoModalidade": 6, "modalidadeIdPncp": 8, "modalidadeNome": "Dispensa",
"modoDisputaNomePncp": "Dispensa Com Disputa", "amparoLegalNome": "Lei 14.133/2021, Art. 75, II",
"valorTotalEstimado": 24300.48, "orcamentoSigilosoDescricao": "Compra sem sigilo",
"dataPublicacaoPncp": "2026-10-31T00:05:52", "dataAberturaPropostaPncp": "2026-11-03T08:00:00",
"dataEncerramentoPropostaPncp": "2026-11-06T08:00:00", "existeResultado": false, "contratacaoExcluida": false
```
Itens:
```
curl ".../modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133?pagina=1&tamanhoPagina=10&dataInclusaoPncpInicial=2026-10-30&dataInclusaoPncpFinal=2026-10-31&materialOuServico=S"
HTTP 200, 5,2 s → totalRegistros 408; campos: idCompraItem, idContratacaoPNCP, numeroItemPncp, descricaoResumida, materialOuServico,
codItemCatalogo, unidadeMedida, quantidade, valorUnitarioEstimado, valorTotal, criterioJulgamentoNome, situacaoCompraItemNome,
temResultado, valorUnitarioResultado, dataResultado, numeroControlePNCPCompra ...
```
Atenção LGPD: os itens com resultado trazem `codFornecedor` e `nomeFornecedor`, que podem ser CPF e nome de pessoa física. O conector deve tratar esses campos como dado pessoal (não exibir CPF; guardar só o necessário para inteligência de mercado).

### 4.3 Códigos de modalidade (diferentes do PNCP)

Teste de `codigoModalidade` 1 a 14 na janela 27/10 a 31/10/2026:

| `codigoModalidade` (Compras.gov) | `modalidadeIdPncp` | Nome | Registros |
|---|---|---|---|
| 3 | 4 | Concorrência - Eletrônica | 147 |
| 5 | 6 | Pregão - Eletrônico | 1.284 |
| 6 | 8 | Dispensa | 2.229 |
| 7 | 9 | Inexigibilidade | 933 |
| 1, 2, 4, 8 a 14 | — | — | 0 |

Todas as esferas aparecem (F, E, M, D, N), ou seja, é um espelho do PNCP, não só do governo federal.

### 4.4 Limites e atraso

| Teste | Resultado |
|---|---|
| 60 chamadas seguidas sem pausa | 60 × HTTP 200 em 5,3 s; mediana 74 ms; máximo 624 ms. Nenhum 429 |
| Atraso em relação ao PNCP | 30/10/2026, pregão eletrônico: PNCP 316 × Compras.gov 47. O indicador oficial (`/modulo-indicadores/1_consultarIndicadoresConsolidados`) informa `ultimaAtualizacao: 2026-10-31` |
| Data final | Exclusiva (mesmo dia → zero) |
| Formato de data | `YYYY-MM-DD` (o PNCP usa `yyyyMMdd`) |

Conclusão: o Compras.gov dados abertos **não substitui o PNCP no radar**. Uso recomendado: catálogo CATSER/CATMAT para classificar itens; preços praticados e resultados para o Simulador e a Inteligência de Mercado; ARP e contratos para "Contratos Conquistados" e adesões.

---

## 5. Recomendação de conectores

### 5.1 Primeira versão (sem depender de ninguém)

1. **PNCP consulta + itens/arquivos** (tipo A). Rotinas:
   - Radar incremental: `contratacoes/publicacao` do dia anterior e do dia corrente, modalidades 6 (pregão eletrônico), 4 (concorrência eletrônica), 8 (dispensa), 9 (inexigibilidade, só para inteligência) e 12 (credenciamento), a cada 30 min no horário comercial.
   - Retificações: `contratacoes/atualizacao` com janela de 2 dias, comparando `dataAtualizacaoGlobal` e hash.
   - Reconciliação noturna: `contratacoes/proposta` completa (cerca de 355 + 68 páginas) para não perder nada que tenha escapado.
   - Para as que passarem na triagem: `/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens` e `/arquivos` (download com SHA-256).
   - Resultado e vencedor: `/itens/{numeroItem}/resultados` depois da homologação.
   Volume medido (3.6): cerca de 1.050 pregões eletrônicos, 180 concorrências eletrônicas e 1.250 dispensas publicados por dia (média das janelas testadas) → cerca de 50 páginas por dia no incremental, folgado a 1 req/3 s.
2. **Compras.gov dados abertos** (tipo A): catálogo e preços praticados, uma vez por dia; nunca como radar.
3. **Mapa de plataforma pela publicação**: tabela `usuarioNome → portal` revisada por pessoa (seção 3.6) para indicar em qual portal de disputa a sessão ocorre e abrir a tarefa assistida correta; quando o `usuarioNome` for sistema de gestão municipal, a plataforma vem do edital (extração pela IA, confirmada por pessoa).

### 5.2 Ordem para os demais

| Ordem | Plataforma | Condição |
|---|---|---|
| 1 | Portal de Compras Públicas (B) | Dono pede a `publicKey` agora (até 7 dias úteis). Ganho: itens em disputa e chat do pregoeiro, base para os alertas prioritários |
| 2 | Petronect (C) | Dono confirma cadastro ativo e taxa de acesso; pedir documentação da API Store |
| 3 | Bionexo (C) | Contato comercial; custo da integração de ERP |
| 4 | SmartCompras (C) | Contato comercial |
| 5 | Mercado Eletrônico (C) | Confirmar se fornecedor recebe credencial |
| 6 | SAP Ariba Discovery (E com e-mail) | Conta gratuita de fornecedor e categorias |
| 7 | BBMNET (C a confirmar) | Perguntar se a API de ERP atende fornecedor |
| 8 | Demais (E) | Cadastro de fornecedor + e-mail de aviso da plataforma lido por caixa dedicada (ex.: licitacoes@...), com regra de leitura no SGO+ |

Caminho alternativo para os portais tipo E (pedido do dono "onde não houver, declarar o caminho"): (a) a publicação vem pelo PNCP; (b) a plataforma envia e-mail de aviso (convocação, mensagem do pregoeiro, mudança de fase) para uma caixa dedicada; o SGO+ lê essa caixa e gera o alerta; (c) o operador acompanha a sessão no portal e registra no SGO+. Nada de robô navegando em tela com login, CAPTCHA ou desafio Cloudflare.

---

## 6. Riscos e plano de monitoramento

### 6.1 Riscos

| Risco | Evidência | Mitigação |
|---|---|---|
| Bloqueio por excesso (429) no PNCP | PROVADO: 429 após 38 chamadas em 2,8 s; e 8 vezes em 256 chamadas a 1 req/1,5 s | Fila única por host, 1 req/1,5 s, espera progressiva, registro em `lic_conexoes_log` |
| Bloqueio por cliente sem identificação | PROVADO: site do PNCP fecha conexão sem `User-Agent` de navegador | Enviar `User-Agent` fixo e identificado ("Metrolabs-SGO/1.0 (+contato)"), sem fingir navegador para a API |
| IP do servidor bloqueado | Não observado, mas o servidor Hostinger é IP único | Medir a primeira semana; se houver bloqueio, contato com Serpro (css.serpro@serpro.gov.br, contato oficial da especificação) |
| Mudança de API (versão, campos) | Spec do PNCP integração em 503 hoje; manual mudou de 2.2.x para 2.6 | Teste diário de contrato: baixar `v3/api-docs`, comparar hash e lista de campos; alerta se mudar |
| Instabilidade e lentidão | PROVADO: 25 s numa página de dispensa; 503 na spec | Tempo limite de 60 s, 3 tentativas, sem travar a fila |
| Espelho atrasado tratado como verdade | PROVADO: Compras.gov com 47 contra 316 | Fonte de verdade = PNCP |
| Rota não documentada (`/api/search`) | PROVADO: existe e responde, mas sem documentação | Não usar em produção sem validação formal |
| Termos de uso das plataformas privadas e portais de disputa | Login com reCAPTCHA (BLL, BNC), Cloudflare (Licitações-e), 403 (Licitanet, Licitar Digital) | Nenhuma raspagem; só API autorizada ou e-mail de aviso |
| Dado pessoal em resultados | PROVADO: `nomeFornecedor`/CPF em itens do Compras.gov | Minimização e mascaramento (LGPD) |
| Fuso presumido | PROVADO: datas sem fuso | Guardar texto original, fuso presumido e confirmação pelo edital |

### 6.2 Monitoramento

- `lic_conexoes_log` por chamada (rota, parâmetros, HTTP, tempo, bytes, itens, erro).
- Painel em "Portais e Integrações": última sincronização, último sucesso, taxa de 429, tempo médio, páginas lidas, registros novos por dia.
- Alarmes para a sentinela existente: nenhum registro novo em dia útil até as 10h; 5 falhas seguidas; mudança no hash da especificação; queda de mais de 50% no volume diário em relação à média de 7 dias úteis.
- Teste diário de contrato com uma `numeroControlePNCP` conhecida (detalhe, itens, arquivos) para provar que o caminho completo continua funcionando.

---

## 7. Comandos e arquivos de prova

Os testes foram feitos com `curl` e `node` (fetch nativo). Arquivos brutos em `C:\Users\venda\AppData\Local\Temp\claude\lic\` (temporários, fora do repositório): `pncp_consulta.json` (spec PNCP), `cgov.json` (spec Compras.gov), `pub.json` (página de publicação), `scan2_out.json` (varredura), `pcp_api_data.js` (documentação da API do Portal de Compras Públicas), `manual.html` (Manual PNCP v2.6), `busca.json` (verificação da rota não documentada).
