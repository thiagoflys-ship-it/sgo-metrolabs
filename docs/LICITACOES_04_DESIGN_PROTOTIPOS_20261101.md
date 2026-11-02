# SGO+ Licitações — Design e protótipos (Especialistas 07 e 08)

Data: 01/11/2026. Papel: Designer UX/UI (08) e Frontend (07). Nada foi alterado no código do SGO+, nada foi publicado, nada foi gravado em produção.

Entradas: `LICITACOES_00` (missão e decisões do dono, inclusive as da noite de 01/11), `LICITACOES_01` (arquitetura), `LICITACOES_02` (APIs e varredura real), `LICITACOES_03` (regras de licitação, aderência e preço).

Protótipos: `docs/prototipos_licitacoes/` (abrir `index.html`). Capturas: `docs/prototipos_licitacoes/capturas/` (62 PNG, 1366 px e 390 px).

---

## 1. Como os protótipos foram feitos

- **Mesmo visual do sistema, sem identidade nova.** O CSS real do SGO+ foi copiado sem edição para `assets/`:
  - `sgo_ui_estilos.css` = `UI_Estilos.html` inteiro (casca, menu, botões, celular);
  - `sgo_comercial.css` = bloco `<style>` de `JS_Comercial.html` (`cm-*`, `cmk-*`, `cmg-*`);
  - `sgo_gestao.css` = bloco de `JS_Gestao.html` (Caixa de decisões, `gd-*`);
  - `sgo_atividades.css` = bloco de `JS_Atividades.html` (janelas `atv-overlay/atv-modal`, gaveta, `atv-barra-ind`);
  - `sgo_doca4.css` = regras de `SGO_DocA4_estilos_` (`SGO_DocA4.js`) e `logo_metrolabs.jpg` tirado de `SGO_DocA4_logoJpegBase64_`.
  - Só o que não existe foi criado em `licitacoes.css`, todo com prefixo `lic-` e apenas com os tokens `--bc-*`.
- `assets/casca.js` monta a casca igual ao `Index.html` (barra superior com busca Ctrl K, menu agrupado com os grupos reais, `mobile-topbar` com Voltar / título / busca / Ajuda / Conta, botões redondos do canto) e liga o modo celular como o sistema: `.app-shell.modo-mobile` até 900 px.
- **Dados reais.** Em 01/11/2026 (20:52 a 21:13) foram feitas consultas GET públicas, 1 a cada 3 s: 19 detalhes no PNCP (`/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq}`), todos HTTP 200, e itens pelo Compras.gov.br dados abertos (`2.1_consultarItensContratacoes_PNCP_14133_Id`). Daí vêm órgãos, objetos, valores, datas, modalidade, plataforma, "Suspensa", os 18 itens da Embrapa, o item da IMBEL e os hashes SHA-256 da rastreabilidade. A API de arquivos do PNCP respondeu **503 de novo às 21:12** (confirma o doc 02).
- **Exemplos marcados na tela** (selo "exemplo" ou "ilustrativo"): preços da Tabela de preços de licitação (só o custo do CAL-001, R$ 63,16, é real), validade de certidões e do registro Inmetro, lances, horários de ciência e escalonamento, execução prevista no Gantt, o cartão ilustrativo de item exclusivo ME/EPP (nenhum item real desta rodada tem esse benefício no PNCP).

## 2. Navegação proposta

A missão lista 14 submenus. A proposta tem **7 telas** e **2 atalhos** (Kanban e Gantt, que abrem Oportunidades no modo certo, igual ao Comercial de 01/11). Quem opera é a Diretoria (Charles e o segundo, a definir), e o alerta chega pelo WhatsApp com link que abre o item exato: a maior parte do trabalho começa **dentro da ficha**, não pelo menu. Por isso tudo que é "de uma licitação" virou aba da ficha.

| Entrada do menu (grupo "Licitações") | Abas internas |
|---|---|
| Hoje em Licitações | Hoje · Painel (Dashboard) · Central de alertas |
| Oportunidades | Lista (Para analisar / Travadas / Descartadas) · Kanban · Gantt · **ficha**: Resumo, Itens e preço (simulador), Análise, Documentos, Prazos, Decisão, Proposta, Histórico |
| Kanban (atalho) | Oportunidades no modo Kanban |
| Gantt (atalho) | Oportunidades no modo Gantt |
| Agenda e prazos | Hoje · 7 dias · 30 dias; filtros por prioridade, plataforma, responsável, situação da data |
| Disputas | Sessões · painel assistido |
| Habilitação e documentos | Documentos da empresa · Cadastros nas plataformas |
| Tabela de preços | Tabela própria de licitação, com versão e histórico |
| Portais e configurações | Portais e integrações · Regras do radar · Regras dos alertas · Permissões |

Onde ficou cada um dos 14 itens:

| Item da missão | Onde ficou |
|---|---|
| Visão Geral | Hoje em Licitações (Hoje + Painel) |
| Radar de Oportunidades | Oportunidades › Lista |
| Análise por IA | Ficha › Análise |
| Editais e Documentos | Ficha › Documentos |
| Propostas | Ficha › Proposta; Kanban › coluna Proposta |
| Simulador de Preços | Ficha › Itens e preço |
| Central de Disputas | Disputas |
| Agenda e Prazos | Agenda e prazos; Gantt |
| Cadastro de Fornecedores | Habilitação › Cadastros nas plataformas |
| Contratos Conquistados | Kanban › Contrato; Painel (até existir o módulo Contratos) |
| Inteligência de Mercado | Painel e Relatório de desempenho; preços vencedores continuam no Banco de preços do Comercial (sem cópia) |
| Notificações e Alertas | Hoje › Central de alertas |
| Portais e Integrações | Portais e configurações › Portais |
| Configurações e Permissões | Portais e configurações (Radar, Alertas, Permissões) + Tabela de preços |

No celular o menu lateral some (regra real) e uma barra de pílulas `cm-nav-mob` no topo da tela leva às 9 entradas, como no Comercial.

## 3. Fluxo principal, do alerta ao contrato (cliques)

Contagem de toques do Charles a partir do WhatsApp, sem contar digitação e o que é feito dentro do portal da disputa.

| # | Passo | Onde | Cliques |
|---|---|---|---|
| 1 | Toca "Confirmar ciência" no WhatsApp (estado 6) | WhatsApp | 1 |
| 2 | Toca "Abrir no SGO+": abre a ficha da licitação (`?aviso=<código>`; login se a sessão expirou) | WhatsApp → ficha | 1 |
| 3 | Lê a Análise (fato × inferência × pendente, com trecho da fonte) | aba Análise | 1 |
| 4 | Abre Itens e preço, marca/desmarca itens, escolhe quem executa | aba Itens e preço | 1 + ajustes |
| 5 | "Aprovar preço mínimo" e confirma na janela (piso congelado com a versão da tabela) | simulador | 2 |
| 6 | Decisão "Participar" com motivo e "Registrar decisão"; confirma o cadastro do órgão pelo CNPJ | aba Decisão | 3 |
| 7 | "Gerar proposta com IA", confere o A4 (nova aba) e "Aprovar (Diretoria)" | aba Proposta | 3 |
| 8 | Envia no portal (fora do SGO+) e "Registrar envio" com o recibo | aba Documentos | 2 |
| 9 | Na sessão: abre Disputas pelo alerta e registra os lances que deu | Disputas | 1 + 1 por lance |
| 10 | "Registrar resultado do item" (ganhou) | Disputas | 1 |
| 11 | Mover para "Contrato" no Kanban (vira oportunidade ganha no Comercial e atividades por setor) | Kanban | 2 |
| | **Total** | | **cerca de 18 toques** |

Com os 14 submenus da lista original, o mesmo caminho passaria por 7 telas diferentes (Notificações, Radar, Análise, Simulador, Propostas, Editais, Disputas, Contratos), com uma busca da licitação em cada uma: estimativa de 30 a 35 toques. O ganho vem de três decisões: o link do alerta abre a ficha certa; tudo da licitação é aba da ficha; ciência pelo botão do próprio WhatsApp.

## 4. Telas e o que cada uma mostra

| Tela | Arquivo | Pontos de UX |
|---|---|---|
| Índice | `index.html` | mapa dos 14 itens; o que é real e o que é exemplo |
| Hoje | `hoje.html` | faixa vermelha do alerta sem ciência com "Confirmar ciência"; feriado de 02/11; 4 KPIs; "o que precisa de ação hoje"; prazos até 09/11; estado vazio honesto para "nota 75 ou mais" (nenhuma real chegou: a melhor é 64); decisões da Diretoria no padrão da Caixa (`gd-card DIRETORIA`) |
| Painel | `painel.html` | indicadores pedidos pelo dono (aderência, prazos, sessões, taxa de vitória "—" sem base, valor em disputa R$ 231.540,27, alertas sem ciência, portais com falha) com `gd-kpi`, `cm-kpi` e `atv-barra-ind`; relatório do período em A4 |
| Oportunidades | `radar.html` | nota 0–100 com classe; selos; objeto com o termo destacado; motivo com FATO/PENDENTE; travas (RBC, dedicação exclusiva, software, suspensa) e descartadas (castração, reagente, borracharia, terceirização de CME, produto, nobreak); descartar com motivo obrigatório; enviar para análise; legenda de EPP, empate ficto, Inmetro e RBC; filtros; estados carregando/vazio/erro/sucesso |
| Kanban | `kanban.html` | 7 colunas (radar → contrato), `cmk-*` do Comercial, "Mover" com `cmk-lista-mover`, trava ao pular etapa dizendo o que falta |
| Gantt | `gantt.html` | SVG no molde de `Comercial_ganttHtml_`: barra publicação → limite, sessão, prazo calculado, execução prevista tracejada, fins de semana e feriados, linha "hoje"; no celular, lista abaixo |
| Ficha (IMBEL) | `ficha.html` | cabeçalho com nota, selos e números; nota explicada por critério (B6 do doc 03, total 55,5); análise por especialista (L, T, F, IA consolidada) em `cm-esp-plano`, cada afirmação com classe e trecho da fonte; documentos (503 real); prazos com alertas programados; decisão com motivo; proposta bloqueada dizendo o que falta; histórico com hash; relatório A4 |
| Simulador (Embrapa) | `simulador.html` | 18 itens reais × Tabela de preços de licitação; 10 "Não atendemos" com motivo; selo Autorizada Inmetro nas balanças; orçamento sigiloso; quem executa (Goiânia de avião × filial do Rio, pergunta ao dono); piso por item com deslocamento rateado; linha vermelha "tabela abaixo do piso" e "referência do edital abaixo do piso" (C4); quadro de totais fixo (`cm-quadro-preco`); visão Analista sem custo |
| Tabela de preços | `tabela_precos.html` | preço próprio de licitação (decisão do dono), referência do catálogo só como código e custo, piso sem viagem, sobra, vigência, quem alterou, histórico, versão nova com motivo obrigatório; serviços sem preço (NR-13 vaso, óxido de etileno) bloqueiam o simulador |
| Agenda | `agenda.html` | dias com cabeçalho; hora com fuso; fonte (FATO/INFERÊNCIA); "Pendente de confirmação" com "Confirmar data" (data, fuso, onde conferiu); sessão suspensa riscada com histórico; data incoerente da fonte; estado vazio de "Hoje" |
| Central de alertas | `alertas.html` | estados 1 a 10 por alerta, linha do tempo, ciência de quem e quando, escalonamento, falha com canal alternativo, programados e cancelados; aviso de que Entregue/Lido dependem do webhook; aviso do segundo responsável não definido; celular com a mensagem e os botões "Confirmar ciência" e "Abrir no SGO+" |
| Disputas | `disputas.html` | sessões; sem piso aprovado não há disputa; painel com melhor lance, nosso lance, sugestão e piso; empate ficto (EPP); conferência do valor final mínimo do Compras.gov.br; lance abaixo do piso recusado com motivo; "Parar sugestões" |
| Habilitação | `habilitacao.html` | EPP, registro Inmetro com validade, RBC "Não possui" (rastreável), padrões já no SGO+, certidões com vencido/a vencer antes da sessão e licitações afetadas; cadastros por plataforma |
| Portais e configurações | `portais.html` | 33 portais com tipo A–E, situação, ligado/desligado, último teste; Acessar (nova aba), Parametrizar (ligado, palavras, UFs, valor mínimo, frequência, credencial por nome, responsável, motivo), Testar conexão com resultado no registro; regras do radar com pesos; regras dos alertas; permissões |
| Proposta com IA (A4) | `proposta_ia.html` | selo "RASCUNHO — APROVAR ANTES DE USAR"; conferência interna que não imprime (fabricante, RBC, números, pendências); figura de rastreabilidade; quadro técnico por serviço; imagens escolhidas do cadastro; preços da tabela; declarações EPP; assinatura da Diretoria |
| Relatórios (A4) | `relatorio_licitacao.html`, `relatorio_desempenho.html` | padrão `SGO_DocA4`; no computador abrem em nova aba; tabela de rastreabilidade com quando, quem, o quê, versão, fonte e SHA-256 real |

## 5. Componentes reutilizados do SGO+ (nomes reais)

- Casca: `app-shell`, `modo-mobile`, `topbar`, `busca-gatilho`, `sidebar`, `menu-grupo`, `menu-grupo-cab`, `menu-btn`, `menu-badge`, `mobile-topbar` (`mobile-topbar-voltar`, `-titulo`, `-busca`, `-ajuda`, `-conta`), `content-panel`, `module-shell`, `module-header`, `content-title`, `content-subtitle`, `btn-primary`, `btn-secondary`. Funções a usar na implementação: `abrir(mod)`, `atualizarTituloMobile_`, `ehMobileModo_`, `SGO_NAV.empilhar` (abas da ficha como passo do Voltar), `SGO_iniciarCarregamento_`/`SGO_finalizarCarregamento_`, `Ajuda_abrir_`, `escapeHtml_`.
- Comercial: `cm-tabs/cm-tab`, `cm-modos/cm-modo` (Lista · Kanban · Gantt), `cm-modo-dica`, `cm-nav-mob/cm-nav-mob-btn`, `cm-faixa` (aviso/erro/ok), `cm-kpis/cm-kpi`, `cm-card` (p1–p4), `cm-card-tit`, `cm-meta`, `cm-txt`, `cm-selo` (vermelho/laranja/verde/azul/cinza), `cm-acoes`, `cm-filtros`, `cm-caixa`, `cm-grade2/3/4`, `cm-campo`, `cm-ajuda-campo`, `cm-det`, `cm-hist`, `cm-tabela` (com `data-r` no celular), `cm-vazio`, `cm-sec`, `cm-entrada`, `cm-entrada-grade`, `cm-caminho` (alerta/aviso), `cm-vence-l`, `cm-mini`, `cm-quadro-preco`, `cm-qp-sobra`, `cm-preco-grade`, `cm-esp-plano`, `cm-esp-cab`, `cm-esp-letra`, `cm-lista-simples`, `cm-check-grande`, `cm-ruim`; Kanban `cmk-area`, `cmk-quadro`, `cmk-col`, `cmk-col-cab`, `cmk-col-corpo`, `cmk-card` (risco/atencao), `cmk-l`, `cmk-bts`, `cmk-lista-mover`; Gantt `cmg-wrap`, `cmg-legenda` e o desenho de `Comercial_ganttHtml_`.
- Gestão: `gd-kpis/gd-kpi`, `gd-card` + `gd-selo` (DIRETORIA), `gd-card-tit`, `gd-meta`, `gd-acoes`, `gd-lista`, `gd-msg` (erro/ok).
- Atividades: `atv-overlay`, `atv-modal`, `atv-modal-cab`, `atv-modal-corpo`, `atv-modal-rod empilha`, `atv-fechar`, `atv-ind-grade`, `atv-barra-ind`.
- Documentos A4: `SGO_DocA4_estilos_` (`folha`, `barra-tela`, `cab-tela`, `so-tela`, `table.t`, `ident`, `resultado`, `aviso-simulado`, `fotos/foto`, `assinaturas`, `figure/figcaption`), logo de `SGO_DocA4_logoDataUri_`, visualizador de documento do celular de `JS_Navegacao` (`window.open("")` vira tela cheia com Voltar e Imprimir).

## 6. Componentes novos (prefixo `lic-`, em `licitacoes.css`)

| Componente | Para quê |
|---|---|
| `lic-nota` (alta/media/baixa/trava/descartada) e `lic-barra-nota` | nota 0–100 e a conta por critério |
| `lic-op`, `lic-op-acoes`, `lic-objeto`, `lic-motivo` (forte/pend) | cartão do radar com motivo e trecho |
| `lic-tempo` (critico/aviso/ok) | tempo restante |
| `lic-ficha-cab`, `lic-ficha-num`, `lic-abas` | cabeçalho e abas da ficha (rolagem lateral no celular) |
| `lic-evid` + `lic-classe` (FATO/INFERENCIA/PENDENTE/IMPEDITIVO), `lic-trecho`, `lic-verif` | evidência com fonte |
| `lic-item` | item do edital × tabela |
| `lic-sim`, `lic-total`, `lic-dir`, `lic-ver-analista` | simulador; colunas que só a Diretoria vê |
| `lic-dia`, `lic-ev` (critico/importante/retificado), `lic-ev-acoes` | agenda |
| `lic-estados`, `lic-est` (feito/atual/falha/escalado/espera), `lic-linha-tempo` | estados 1 a 10 do alerta |
| `lic-cel`, `lic-wa-*` | prévia da mensagem do WhatsApp (só na Central de alertas e no manual) |
| `lic-disp-grade`, `lic-disp-num`, `lic-cronometro`, `lic-parar` | disputa assistida e botão de interrupção |
| `lic-tipo` (A–E), `lic-log` | portais e registro de chamadas |
| `lic-esq` | esqueleto de carregamento (respeita `prefers-reduced-motion`) |
| `lic-rodape` | ações fixas no rodapé do celular (botões de 48 px, folga de 76 px para os dois botões redondos do canto) |
| `lic-toast` | aviso de sucesso ou erro |
| `lic-proto`, `lic-exemplo` | só do protótipo (não vão para o sistema) |

## 7. Estados mostrados

- Carregando: `radar.html?estado=carregando` (esqueleto + texto para leitor de tela); "Testar conexão" com ícone girando.
- Vazio: `radar.html?estado=vazio`; "nota 75 ou mais" em Hoje; "Hoje" da Agenda (domingo); colunas vazias do Kanban; versões de proposta; sessões de hoje.
- Erro: `radar.html?estado=erro` (mensagem no padrão "o que houve, nada foi alterado, tente de novo" + botão); motivo obrigatório faltando no descarte (captura 03g); lance abaixo do piso (11b); Portal de Compras Públicas sem chave (HTTP 400); mover no Kanban sem decisão.
- Sucesso: enviar para análise (03h), decisão registrada, data confirmada, preço mínimo aprovado, nova versão de preço.

## 8. Decisões de UX

1. **Ficha como centro.** O alerta abre a ficha; tudo da licitação é aba dela; o menu tem 7 telas.
2. **Nunca no limbo.** Botão travado sempre diz o que falta e leva para lá (proposta sem decisão e sem preço; Kanban sem decisão; disputa sem piso).
3. **Nota honesta.** A pendência conta metade ou zero; a tela mostra a conta. Nenhuma oportunidade real chegou a 75 hoje e a tela diz isso, em vez de inventar uma "alta".
4. **Fato separado de conclusão.** Cores e selos fixos: verde FATO, azul INFERÊNCIA, âmbar PENDENTE, vermelho IMPEDITIVO; todo fato com o trecho literal e o endereço da fonte.
5. **Datas com fonte e fuso.** Nenhuma data calculada ou tirada pela IA aparece como confirmada; confirmar é ato de pessoa, com onde conferiu. Suspensão risca a data e guarda o histórico.
6. **Dinheiro só para quem decide.** Custo, piso e sobra ficam em colunas `lic-dir`, escondidas no nível Analista; o servidor também não manda esses campos.
7. **Preço próprio de licitação** (decisão do dono): a tela de Tabela de preços é a única origem do preço; o catálogo do Comercial aparece só como código e custo.
8. **EPP** (decisão do dono): item exclusivo ME/EPP ganha selo "Exclusivo ME/EPP — podemos participar"; empate ficto aparece na ficha, no simulador e na disputa.
9. **RBC** (decisão do dono): "Exige acreditação RBC — não atendemos" é impeditivo com a pendência "aceita rastreabilidade ou subcontratação?"; o texto do sistema nunca declara acreditação. **Inmetro**: selo "Autorizada Inmetro" em balanças e esfigmomanômetros; registro com validade na Habilitação.
10. **WhatsApp curto, sem valor.** A mensagem segue o modelo da missão; o valor estimado não vai.
11. **Celular**: 390 px sem rolagem lateral (conferido nas 62 capturas pela largura do PNG); botões de 44 px; campos de 16 px; tabelas viram cartões (`data-r`); Kanban e Gantt rolam dentro do quadro; ações principais fixas no rodapé.
12. **Acessibilidade**: contraste dos tokens do SGO+; rótulo em todo campo; `role="tab"`/`aria-selected`; `aria-live` nas listas e mensagens; `role="alert"` nos erros; foco visível de 3 px; Esc fecha a janela e o foco volta ao botão de origem.

## 9. O que precisa de validação com o backend

1. Link do alerta `?aviso=<código>` abrindo a ficha certa depois do login (hoje o link existe para a gestão; falta o destino `licitacoes` e a aba).
2. Botão de resposta rápida "Confirmar ciência" no modelo `sgo_licitacao_prazo` (aprovação na Meta) e o retorno de status (webhook) para Entregue, Lido e a resposta do botão. Sem o webhook, a ciência só vale pelo link autenticado.
3. Segundo responsável da Diretoria: sem ele o escalonamento não tem destino humano (a tela avisa).
4. `Lic_nivelDe_` mandando ou não custo/piso/sobra conforme o nível (a tela só esconde).
5. Tabela de preços de licitação: aba própria (`LIC_PRECOS` com versão, vigência, motivo, autor) e congelamento da versão no preço mínimo aprovado (`LIC_DECISOES`).
6. Cálculo do piso por item com o deslocamento rateado (mesmo resultado de `ComPr_pisoItem_` e `ComPr_calcularViagem_`), cenários de execução (Goiânia × filial do Rio) e o caso de registro de preços (menor pedido plausível).
7. Itens com `orcamentoSigiloso` (valor zero na fonte) tratados como "sigiloso", não como R$ 0,00.
8. Agenda: confirmação de data com fuso e fonte; retificação/suspensão gerando versão e cancelando alertas com motivo.
9. Kanban: etapas mapeadas para `LIC_OPORTUNIDADES.SITUACAO` e regras de passagem (Proposta exige decisão e piso).
10. Portais: `LIC_PORTAIS` com ligado/desligado, palavras, UFs, valor mínimo, frequência, credencial por nome (Chaves e senhas ou cofre), responsável, versão; "Testar conexão" como tarefa na fila do Node com resultado em `lic_conexoes_log`.
11. Proposta com IA: geração no servidor, verificador (sem fabricante, sem RBC como qualidade, números conferidos com a tabela e o edital), escolha de imagens do cadastro (padrões, equipamentos), aprovação com versão congelada e SHA-256; o A4 emitido não muda.
12. Relatórios A4: emissão com revisão e hash; no computador nova aba, no celular o visualizador de `JS_Navegacao`.
13. Histórico: `LIC_HISTORICO` com quem, quando, o quê, versão, fonte e hash do arquivo (`lic_bruto`, `lic_anexos`).
14. Disputa: registro de lances, conferência do valor final mínimo ≥ piso, empate ficto calculado com o porte do melhor lance (dado digitado pelo operador; não vem por API).

## 10. Limites desta entrega

- Os protótipos são HTML estático; nenhum botão grava nada. Os estados de outras telas também podem ser vistos pelos botões do controle "Protótipo".
- Nas capturas de página inteira, a barra fixa do rodapé e os botões redondos aparecem na altura da primeira tela (efeito da captura; no aparelho ficam presos embaixo).
- Fontes e ícones vêm da internet (Google Fonts e Font Awesome 6.5.2, os mesmos do `Index.html`).
- Valores marcados como exemplo precisam ser trocados pelos reais da Diretoria antes de qualquer uso.

## Capturas

Pasta `docs/prototipos_licitacoes/capturas/`, cada tela em `_1366.png` e `_390.png`: 00 índice · 01 hoje · 02 painel · 03 radar (03b carregando, 03c vazio, 03d erro, 03e travadas, 03f descartadas, 03g erro de validação, 03h sucesso) · 04 Kanban · 05 Gantt · 06 ficha resumo (06b análise, 06c histórico, 06d proposta, 06e prazos) · 07 simulador (07b analista com filial do Rio) · 08 tabela de preços · 09 agenda · 10 central de alertas · 11 disputas (11b lance abaixo do piso) · 12 habilitação · 13 portais (13b parametrizar) · 14 proposta com IA A4 · 15 relatório da licitação A4 · 16 relatório de desempenho A4.
