# Padrões de referência — redesenho da página (17/10/2026)

Não publicado. Feito e testado só na cópia de ensaio do servidor próprio, com dados de teste.

## O que mudou para quem usa

**Aba Padrões**
- **Resumo em números no topo:** Ativos, Vencidos, Vencem em 30 dias, Vigentes, Sem validade (só aparece quando há), Sem PDF e Inativos. Clicar num número filtra a lista. Clicar de novo volta para Ativos.
- **Faixa curta no lugar do aviso vermelho com 76 TAGs.** Exemplo: "31 padrões vencidos ou com data inválida não podem ser usados em certificado. Ver vencidos · 11 vencem em até 30 dias. Programar recalibração". Os dois links aplicam o filtro.
- **Barra de ferramentas:**
  - busca por TAG, descrição, série, marca, modelo ou nº do certificado;
  - filtros de Situação, Local e Grandeza;
  - Ordenar: situação, validade, TAG ou local;
  - botões Atualizar lista e Ler certificados com IA (este só para quem edita);
  - "Cadastrar padrão" como ação principal.
  
  A linha de baixo mostra a contagem ("75 padrões em 60 linhas"), o link "Limpar filtros", a opção "Agrupar canais e grandezas" e "Como funciona", uma ajuda curta que abre e fecha.
- **Agrupamento:** cadastros com a mesma TAG base ficam numa linha-mãe expansível, por exemplo REG-001 (CANAL1) a (CANAL8) ou THM-002 (T)/(U). A linha-mãe mostra:
  - a TAG base e "8 canais" ou "2 grandezas";
  - a descrição comum, o equipamento e o local;
  - a validade comum, ou o intervalo com o selo "Validade divergente";
  - o nº do certificado.
  
  Ao expandir, cada canal mostra U95, k e νeff. O canal com validade diferente dos outros fica destacado: "diferente dos outros canais".
- **Linhas compactas e alinhadas.** Colunas: Padrão (TAG e descrição), Equipamento (marca e modelo, e a série embaixo), Local, Validade (data e selo), Certificado (PDF) e Ações.
- **Ações:** "Editar" fica visível. O resto vai para o menu "Mais" (⋯):
  - Ver detalhes;
  - Substituir PDF ou Anexar PDF;
  - Dados, localização e foto;
  - Ver foto;
  - Abrir o PDF;
  - Inativar, em vermelho e com confirmação, ou Reativar.
- **Seleção múltipla mantida.** Ela serve para gerar inventário e orçamento. A barra "N padrões selecionados · Inventário e orçamento · Marcar todos da lista · Limpar seleção" só aparece quando há algo marcado. A caixa da linha-mãe marca o grupo inteiro.
- **Painel lateral de detalhe**, com três abas:
  - **Resumo:** certificado, validade, U95, k, νeff, laboratório, PDF, equipamento, local, conferência, foto, outros canais do grupo, pontos e resultados, e o histórico dos PDFs anexados;
  - **Cadastro e validade:** editar ou cadastrar;
  - **Dados, localização e foto:** leitura por IA, campos complementares, foto e conferência.
  
  Fechar com algo digitado pede confirmação. Esc fecha o painel. A linha-mãe abre o painel do grupo, com a tabela dos canais e a opção "Selecionar o grupo para inventário".

**Celular**
- A mesma página abre em cartões: TAG, selo, descrição, validade, local, PDF, e os botões Editar e Mais.
- Os grupos expandem dentro do cartão.
- Os filtros ficam recolhidos no botão "Filtros".
- O painel de detalhe ocupa a tela inteira.
- Campos com 16 px e toques de 44 px.
- A consulta antiga, só de leitura (`renderMobilePadroes_`), deixou de ser usada.
- "Ler certificados com IA" fica só no computador: é uma tarefa longa, em lote.

**Inventário e orçamento** foi reorganizado em três cartões:
- **Padrões selecionados:** as TAGs aparecem em etiquetas e o número aparece na própria aba;
- **Dados do documento:** gerar inventário ou orçamento;
- **Documentos e rascunhos salvos:** em tabela.

As mensagens aparecem na própria aba.

**Relatórios gerenciais** ficou com dois cartões lado a lado: Plano de renovação e auditoria, e Relatório de desempenho com o período.

**Perfis:** Comercial e Financeiro só consultam. Não veem Editar, Cadastrar nem as ações de edição do menu, e o painel abre só no Resumo. O servidor continua recusando as gravações como antes.

## O que não mudou

As regras e os dados gravados continuam os mesmos:
- validade e classificação;
- bloqueio do padrão vencido no certificado (conferido: o certificado com REG-001 (CANAL1) vencido foi recusado e o certificado com um padrão vigente foi emitido);
- TAG única;
- um cadastro por canal ou grandeza;
- perfis que só consultam;
- central e balão de alertas.

As chamadas ao servidor e os campos enviados também são os mesmos: `apiCriarPadrao`, `apiAtualizarPadrao`, `apiAnexarCertificadoPadrao`, `apiInativarPadrao`, `apiReativarPadrao`, `apiSalvarControlePadrao`, `apiExtrairControlePadrao`, `apiFotoControlePadrao`, além dos documentos e relatórios. A tela de emissão do certificado continua igual.

Uma diferença pequena e de propósito: em "Dados, localização e foto", o nº do certificado e a validade agora são editados só em "Cadastro e validade". A gravação continua enviando os valores atuais. Se a IA ler um número ou uma validade diferentes, ela avisa, mas não troca sozinha.

## Correção encontrada no teste

**"Substituir PDF" não funcionava (já não funcionava antes).** `CertCal_apiAnexarCertificadoPadrao` chamava `SGO_PADROES.validar` sem o `padraoId`. A conferência de TAG única de 16/10 encontrava o próprio padrão e recusava com "Já existe um padrão com a TAG …". Agora ela passa o `padraoId`: a edição do próprio padrão é permitida, como em `apiAtualizarPadrao`.

## Acréscimo no servidor (só leitura)

`apiHistoricoCertificadosPadrao`, no arquivo SGO_Padroes_Documentos.js e liberada em `CertCal_apiDispatch`:
- lista os PDFs da pasta "Padroes de Referencia/<TAG>", onde cada anexo é gravado; os anteriores nunca são apagados;
- marca qual PDF é o atual;
- não cria pasta nem altera nada;
- se houver falha, devolve uma lista vazia com um aviso.

## Componentes para a outra página (cadastros e administração)

As classes estão no próprio arquivo da tela (JS_Padroes_Documentos.html › `pdrEstilos_`), e não no UI_Estilos.html. Só os tokens `--bc-*` são usados.

| Componente | Classes |
|---|---|
| Resumo em números que filtra | `bc-resumo` › `bc-resumo-item` (`bc-tom-erro`, `bc-tom-aviso`, `bc-tom-ok`, `bc-tom-neutro`, `bc-ativo`, `bc-zero`), `bc-resumo-num`, `bc-resumo-rot` |
| Faixa curta | `bc-faixa`, `bc-faixa-erro`, `bc-faixa-aviso` |
| Barra de busca e filtros | `bc-ferramentas`, `bc-busca`, `bc-ferr-campos` (`bc-aberto` no celular), `bc-ferr-acoes`, `bc-ferr-filtros`, `bc-campo` |
| Menu "Mais" | `bc-mais-menu` com `[role=menuitem]` e `bc-perigo` |
| Painel lateral | `bc-painel-fundo`, `bc-painel`, `bc-painel-cab`, `bc-painel-tit`, `bc-painel-abas`, `bc-painel-corpo`, `bc-painel-rodape` |
| Selo de situação | `bc-selo` com `bc-selo-ok`, `bc-selo-aviso`, `bc-selo-erro`, `bc-selo-neutro` |
| Ações em lote | `bc-lote` |
| Cartão, tabela, vazio, ajuda, status | `bc-cartao` e `bc-cartao-cab`, `bc-tabela`, `bc-vazio`, `bc-ajuda`, `bc-status` e `bc-status-erro` |

## Arquivos

- `apps-script-imports/portal_sgo_versao_cnpj_db/JS_Padroes_Documentos.html`: a tela; o arquivo é anexado ao script do módulo por `CertCal_obterConteudoModulo`.
- `JS_Core.html`:
  - "Padrões de referência" no celular abre a mesma página;
  - subtítulo curto.
- `SGO_CertCal_Main.js`:
  - correção do anexo de PDF;
  - liberação de `apiHistoricoCertificadosPadrao`.
- `SGO_Padroes_Documentos.js`: `CertCal_apiHistoricoCertificadosPadrao`.
- `SGO_CertCal_ConteudoModulo.js` não foi alterado.

## Como foi testado

- **Ambiente:** cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_padroes`, servidor com `SGO_ENSAIO=1 SGO_AGENDADOR=0 PORTA=8190 WORKERS=2`. O servidor foi parado no fim.
- **Dados de teste:** 80 padrões:
  - REG-001 com 8 canais, todos vencidos;
  - REG-002 com 4 canais, um deles com validade divergente;
  - TER-001 com 4 canais;
  - THM-002 e THM-003 com T e U;
  - DTL-01 a DTL-20, PS-01.01 a PS-01.12, PT100-001 a PT100-014, MAN-001 a MAN-010, TIV, CRN e BAL;
  - entre eles, vencidos, vencendo, vigentes, sem validade, sem PDF e inativos.
  
  Usuários de teste: metro.teste, tecnico.teste, comercial.teste e gestor.teste.
- **Playwright, 133 verificações sem falha.** Telas: 1366, 1920 e iPhone 13 (isMobile). Perfis: ADMIN, METROLOGIA, TÉCNICO e COMERCIAL. O que foi verificado:
  - os números filtram e a faixa leva aos vencidos;
  - busca, local, grandeza e ordenação funcionam;
  - os grupos e a validade divergente aparecem;
  - o painel do grupo abre;
  - desagrupar mostra uma linha por cadastro;
  - menu Mais;
  - substituir PDF, com o histórico mostrando 2 PDFs;
  - editar a validade;
  - dados, local e foto;
  - cadastrar com PDF;
  - TAG repetida recusada com mensagem;
  - confirmação ao fechar com algo digitado;
  - inativar: cancelar e depois confirmar;
  - reativar;
  - seleção em lote, aba inventário e histórico de documentos;
  - relatórios;
  - Comercial só consulta;
  - sem rolagem lateral nas três abas;
  - no celular: cartões, painel em tela cheia, toques de 44 px e campos de 16 px;
  - sem erros de JS.
  
  O único erro de console é um 404 de recurso que já aparecia antes da mudança.
- **Certificado:** padrão vencido bloqueado e padrão vigente emitido. A tela de emissão abre sem a gestão de padrões e com os padrões carregados.
- **Testes do servidor:** `npx vitest run` no sgo_servidor deu 21 arquivos e 102 testes, todos verdes. Na primeira rodada houve tempo esgotado em 3 arquivos porque o servidor de ensaio ainda estava ligado. Com ele parado, tudo passou.
- **Capturas** (só dados de teste):
  - antes: `%TEMP%\sgo_padroes\capturas\antes`;
  - depois: `%TEMP%\sgo_padroes\capturas\depois`.
  
  Scripts em `%TEMP%\sgo_padroes\t` (`seed.mjs`, `seed2.mjs`, `e2e.mjs`, `cert.mjs`).
