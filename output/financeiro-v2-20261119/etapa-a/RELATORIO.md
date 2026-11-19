# Financeiro v2 — Etapa (a): estrutura nova, painel, empresas e credenciais (19/11/2026)

**Base:** `output/financeiro-20261116/cand35`, conferida **igual à produção** antes da mudança: hash dos 571 arquivos de `/app/legado` = cand34 = cand35.
**Não foi feito:** publicação, commit, escrita no banco de produção, no Omie ou em banco financeiro, leitura de valor de chave, nada em `/opt/metrolabs/sgo/cofre`.
**Ensaio com dados reais:** duas rodadas só de leitura num processo à parte no contêiner (`/tmp/ensA`, apagado no fim):
- 64 páginas de `ListarMovimentos` (1,5 s entre elas), 2 leituras de contas e empresas e 3 consultas públicas de CNPJ;
- sem sessão, portanto sem registro de acesso;
- conferido depois que nenhuma tabela nova foi criada.

**Dados do dono incorporados durante o trabalho (mensagens do coordenador):**
- CNPJs das três empresas.
- As contas e integrações são da Matriz.
- Dois aplicativos Omie: Matriz e **Filial RJ**. A Prestadora não tem Omie próprio.
- A Caju fica no lugar de sempre.
- O Sicredi libera um produto por vez.

---

## 1. Resumo

| Pedido | Feito |
|---|---|
| Navegação nova | **17 páginas em 3 grupos no menu** (`fin_*`), com o de-para das 29 abas antigas (seção 3). Nenhuma aba sumiu: cada uma vive numa página e abre pela mesma função de antes. O endereço antigo `omie`, os avisos, o atalho do celular e `OmieTela_abrir_('aba')` de qualquer tela levam à página certa. Bancos e saldos, Transferências e Impostos e guias mostram "em construção" com **o quê / quando / enquanto isso** e um botão para a aba de hoje. As outras páginas com parte futura têm a faixa "Em construção nesta página". |
| Painel financeiro | **Visão da diretoria** (padrão do dono e do Charles) e **Meu dia** (padrão da Wanessa), com dados reais da fotografia diária, do `FIN_FOTO_MES`, das aprovações (`FIN_PAG_ITENS` e alçada), do fechamento, das contas fixas, de Compras/Caju e da régua. Gráficos em SVG próprio (previsão 30/60/90 dias e resultado por mês). Bloco sem fonte mostra o motivo, nunca número. Atualiza sozinho a cada 5 min sem mexer no que a pessoa faz; "Atualizar agora" pede nova fotografia. |
| Empresas e bancos | Tabelas `FIN_EMPRESAS`, `FIN_EMPRESAS_HIST` e `FIN_CONTAS_BANCO`. Detalhes na seção 1.1. |
| Seletores | `Fin_seletorEmpresa_` / `Fin_ligarSeletorEmpresa_` e `Fin_seletorPeriodo_` / `Fin_ligarSeletorPeriodo_` (escolha guardada no aparelho). Aplicados no Painel e em Contas a pagar e receber, que abre em A pagar na página Contas a pagar. Uma empresa = títulos das contas correntes ligadas a ela. A Filial RJ com chaves lê o Omie dela (`Omie_comEmpresa_`). Sem contas ou sem chave: o motivo, nunca a lista inteira. As abas que ainda não separam por empresa mostram uma nota no topo. |
| Credenciais (servidor) | Patch em `servidor/` (seção 6). Detalhes na seção 1.2. |
| Permissões | Ver o Financeiro: lista de sigilo (`Omie_exigirAcesso_` em toda chamada nova; menu escondido; o endereço mostra "O Financeiro é restrito"). Aprovar: dono/Charles, como antes. Alterar Empresas e bancos: só dono/Diretoria (`FinV2_ehDiretoria_`). As páginas `fin_*` entram no sigilo do assistente, das Atividades e do relatório diário. |
| Visual | Classes do Comercial (`cm-*`) e prefixo `fv-` (CSS do protótipo copiado sem mudança + encaixe no legado). Texto corrido justificado; sem rolagem lateral em 1366, 390 e 320 px (teste). |
| Ajuda e manual | Ajuda de cada uma das 17 páginas (`omie/fin_*` em `SGO_Ajuda_Financeiro.js`; o JS_Core mapeia `fin_*` → `omie/fin_*`). `docs/MANUAL_PAINEL_FINANCEIRO.md` ganhou a seção 0 (estrutura nova, seletores, painel, empresas, quem pode). `SGO_AssistenteManuais.js` regerado: só o manual do Financeiro mudou (conferido). |

### 1.1 Empresas e bancos em detalhe

- **CNPJs.** Matriz 32.487.278/0001-21, Filial RJ 32.487.278/0002-02, Metrolabs prestadora 62.909.375/0001-26: informados pelo dono, dígitos conferidos, marcados como valor inicial.
- **Razão social e inscrições.** Vazias para o dono. A tela sugere a razão pela consulta de CNPJ do SGO+ (`SGO_CNPJ_consultarDados_`) e pelo Omie da matriz (`ListarEmpresas`), marcada "conferir".
- **Modo do Omie.** Matriz e Filial RJ com Omie próprio. A Filial ainda está sem chave: "Falta credencial OMIE_APP_KEY_FILIAL, OMIE_APP_SECRET_FILIAL". A Prestadora fica "Dentro do Omie da matriz".
- **Contas correntes.** As 16 contas ativas do Omie são da Matriz por padrão (decisão do dono). As que citam outra empresa no nome levam o selo "conferir: o nome cita a Filial/Prestadora".
- **Estado de cada banco, produto a produto.** Saldo e extrato, Pix, Boletos e Pagamentos, cada um com o NOME das chaves que faltam. Cada produto depende só das próprias chaves. Extrato e Multipag aceitam o certificado próprio ou o do Pix.
- **"Credencial gravada" não é "Ligado".** Os conectores dos bancos são das etapas c e e.
- **Caju.** Lê as chaves de sempre e mostra Produção ou Homologação.
- **Gravação.** Motivo de 15 letras, histórico com antes e depois, registro em `FIN_OMIE_ACESSOS`.

### 1.2 Credenciais em detalhe

- **Tela /_sgo/segredos.** Agrupada (IA, Omie, Sistema, WhatsApp, Omie da filial e da prestadora, Sicredi/Sicoob/Itaú por empresa, SERPRO). Campo de várias linhas para PEM e "Escolher arquivo" (.pem/.crt/.key como texto; .pfx convertido em base64 no navegador). Filtro pelo endereço (`#omie`, `#bancos`, `#sicredi`…).
- **Caju fora da lista nova.** Ela já tem grupo em Administração > Chaves e senhas (um lugar só por chave).
- **Cofre.** `propSegredas` passa a cifrar `CHAVE_PRIVADA`, `_PFX`, `CODIGO_ACESSO` e `CONSUMER_KEY`.

## 2. Arquivo por arquivo (cand34 → cand35)

**Novos (LF):**
- `SGO_Financeiro_V2.js`: empresas, contas, catálogo dos bancos produto a produto, estado das credenciais (só presença), painel (`Fin_apiPainel`), empresas (`Fin_apiEmpresas`), filtro por empresa, riscos, "Meu dia". A base do painel fica guardada 5 min por empresa, fotografia, configuração e chaves.
- `JS_Financeiro_V2_Componentes.html`: CSS do protótipo + encaixe, `Fin_*` e `Graf_*`. O CSV passa pelo registro do sigilo (`OmieGest_csv_`).
- `JS_Financeiro_V2.html`: as 17 páginas (`FIN_V2_PAGINAS`, de-para), a casca (`id=omieTela`/`omieCorpo` de sempre), a barra do celular, as abas, o estado "em construção" e o menu.
- `JS_Financeiro_V2_Painel.html`: as duas visões.
- `JS_Financeiro_V2_Empresas.html`: Empresas e bancos e a lista de Bancos e saldos.

**Alterados (fim de linha conferido; os mistos continuam mistos com as mesmas linhas LF):**
- `Index.html`: 3 grupos e 17 botões; o Painel mantém `id=menu-btn-omie`; badge de Aprovações; as 4 inclusões depois do Comercial.
- `JS_Core.html`: `omie` → `fin_painel`; roteamento `fin_*`; ajuda `omie/fin_*`.
- `JS_Omie.html` (misto): menu com os 3 grupos (`FinV2_mostrarMenu_`).
- `JS_Omie_Gestao.html` (CRLF): `OmieTela_render_` desenha a página nova. `OmieTela_abrir_` roteia para a página da aba; o desenho antigo virou `OmieTela_abrirAba_`, sem mudança. Rótulo "Empresas e bancos" no registro de acessos.
- `JS_Financeiro_Contas.html`: seletor de período comum (substitui os atalhos), tipo A pagar na página Contas a pagar, empresa no pedido e o aviso.
- `JS_Atividades.html`: o botão "Atividades do módulo" das páginas `fin_*` abre as atividades do módulo `omie` (sigiloso).
- `SGO_Financeiro_Contas.js`: conta corrente na linha (`cc`), filtro por empresa, leitura do Omie próprio da empresa.
- `SGO_Omie.js`: `Omie_credenciais_(empresa)` (sem empresa = as chaves de sempre), `Omie_comEmpresa_`, `diretoria` em `Omie_apiIniciar`.
- `SGO_Financeiro_Foto.js`: a lista de títulos guarda `nCodCC` no índice 11. Conferido no Omie real: 3192 de 3192 títulos têm conta. Os índices 0 a 10 ficam iguais.
- `SGO_Omie_Sigilo.js`: nomes das 2 APIs novas.
- `SGO_Assistente.js` (CRLF), `SGO_Atividades.js`, `SGO_Gestao_RelatorioDiario.js`: `fin_*` tratado como sigiloso.
- `SGO_AssistenteErros.js`: arquivos e prefixos novos → `omie`.
- `SGO_Ajuda_Financeiro.js` (misto): 17 ajudas.
- `SGO_AssistenteManuais.js`: regerado.

**Fora do legado:**
- `tests/financeiro-v2-etapa-a-20261119.test.cjs` (8 testes).
- `docs/MANUAL_PAINEL_FINANCEIRO.md` (CRLF).
- Patches: `legado-cand34-cand35.patch` e `tests-docs.patch`.

## 3. De-para aplicado (29 abas → 17 páginas)

| Página | Abas (rótulo novo ← aba antiga) |
|---|---|
| Painel financeiro | Visão da diretoria, Meu dia (novas); Posição no Omie ← `resumo`; Indicadores e saúde ← `indicadores` |
| Aprovações | Pagamentos do dia ← `pagamentos`; Acima da alçada e regras ← `regras` |
| Contas a receber | Contas por período ← `contas` (A receber); Reajustes de contratos ← `reajustes` |
| Contas a pagar | `contas` (A pagar), `lancamentos`, `fixas`, `espelho`, `comissoes` |
| Conciliação | `conciliacao` |
| Cobrança | Régua ← `regua`; Boletos pelo Omie ← `cobrancas` |
| Bancos e saldos | em construção + contas e conectores |
| Transferências | em construção (atalho: Lançamento avulso, tipo Transferência) |
| Notas fiscais | `pedidos`, `servicos`, `produtos`, `notas` |
| Fornecedores e clientes | `cliente` |
| Impostos e guias | em construção |
| Caju | `recarga` |
| Orçamento | `orcamento`, `provisoes` |
| Fechamento do mês | `fechamento` |
| Relatórios | `relatorios`, `resultado`, `fluxo`, `agenda` (não estava no de-para do design), `especialista` (também no botão do Painel) |
| Empresas e bancos | nova |
| Trilha | `trilha`, `sigilo` |

## 4. Tempos medidos (ensaio com dados reais)

| O quê | Tempo |
|---|---|
| Base do painel (fotografia, meses, previsão de 90 dias, aging, nomes) | **0,37 s** com a lista de títulos na memória; 0,43 s sem ela. Fica guardada 5 min. |
| Aprovações + "Meu dia" (lidos a cada pedido) | 0,05 s a 0,07 s |
| Empresas e bancos, 1ª abertura (contas e empresa do Omie + 3 consultas de CNPJ) | 1,5 s a 2,7 s; depois, tudo guardado 6 horas |
| Lista de títulos da fotografia (só no ensaio, que não tem a memória da produção) | 64 páginas, 149 s. Em produção ela já está na memória: a rotina diária a faz e a refaz sozinha depois de reinício. |

Na página (teste com dados simulados), o painel abre e desenha em menos de 1 s.

## 5. Placar

Suíte completa (`DEST=output/financeiro-20261116/cand35 ... rodar-suite-dest.cjs candidato`, 19/11/2026 14:39): **299 arquivos, 2706 passam, 0 falham, nenhum arquivo com saída diferente de zero**. A referência era 2698 em 297 arquivos: entram os 8 testes novos e mais um arquivo novo de outra frente. Detalhe em `suite.txt`.

A primeira rodada (`suite-1a-rodada.txt`) teve 1 falha, no teste antigo da Visão geral (ajuste na seção 7); depois do ajuste, 0.

## 6. Publicação

**Legado (fora de 06:00 a 08:30):**
1. Publicar a `cand35` inteira: 5 arquivos novos e 16 alterados (21 no patch).
2. Não há tabela a criar à mão: `FIN_EMPRESAS`, `FIN_EMPRESAS_HIST` e `FIN_CONTAS_BANCO` nascem na primeira gravação. Nenhuma chave nova é obrigatória.
3. Depois de publicar, abrir com o dono:
   - Painel (Visão da diretoria): conferir que o saldo e os vencidos batem com Indicadores e saúde.
   - Empresas e bancos: conferir as sugestões de razão social e gravar as empresas e os vínculos (motivo).
   - Contas a pagar: a aba Contas por período.
4. A primeira fotografia depois da publicação passa a guardar a conta corrente de cada título. Até ela, o Painel por empresa diz "a fotografia de hoje ainda não guarda a conta corrente".
5. Commit de `tests/` e `docs/` junto.

**Servidor (`servidor/`, independente do legado; pode ir antes ou depois):**
1. Copiar a pasta para `/tmp/pub-segredos-fin` e rodar `sh /tmp/pub-segredos-fin/publicar.sh`.
2. O script faz, nesta ordem:
   - lê a imagem atual do compose e confere os 4 arquivos pelo `base.txt`; se mudaram, para;
   - faz o backup do compose e do banco;
   - monta a imagem `metrolabs/sgo:segredos-financeiro-v2-20261119` com os 4 arquivos;
   - troca a imagem, espera ficar saudável (se não ficar, reverte) e confere `GET /_sgo/segredos`.
3. **Se a publicação do legado também trocar a imagem, rode este script depois**, para a base ser a imagem nova; o hash dos 4 arquivos é conferido de novo.
4. `montar.cjs` refaz `novo/` a partir de `prod/` e `fontes/`.
5. Para reverter: `cp /opt/metrolabs/backup/segredos-financeiro-v2-20261119/compose.antes.yml /opt/metrolabs/sgo/docker-compose.yml && docker compose -f /opt/metrolabs/sgo/docker-compose.yml up -d app`.

## 7. Riscos e pendências

- **Previsão de caixa.** A curva realista põe o vencido a pagar (R$ 126.620,27, "deveria ser zero") como saída hoje. Por isso o aviso diz que o saldo fica negativo hoje: é o modelo da Agenda financeira de antes, não um número novo. Enquanto a Wanessa não baixar as contas pagas, o aviso aparece.
- **Painel por empresa.** Só separa a receber, a pagar, vencidos, idade e devedores. Saldo, previsão, resultado, despesas, orçamento e DRE são "só no consolidado" até a fotografia por empresa.
- **Filial RJ.** O painel da Filial RJ (Omie próprio) vem quando a fotografia ler o Omie dela (próxima entrega). Contas por período já lê.
- **Nomes de clientes.** O cache de nomes de Contas por período (`FIN_CON_NOMES`, 6 h) é um só para os dois Omies. Um código de cliente igual nos dois daria o nome errado (improvável; vale separar quando a fotografia por empresa entrar).
- **Chaves repetidas.** As que já estavam nos dois lugares antes desta etapa continuam assim: Gemini, SMTP, WhatsApp/Meta/Z-API, simulador e ponte aparecem em Chaves e senhas do legado e em `/_sgo/segredos` (não mexi). As chaves novas do Financeiro ficam só em `/_sgo/segredos`; as da Caju, só no legado.
- **Testes antigos ajustados de propósito:** um só, `tests/financeiro-omie-20261114.test.cjs` ("página completa: menu Financeiro..."): o endereço antigo agora abre o Painel novo, então o teste abre a aba "Posição no Omie" (a antiga Visão geral, igual) antes de conferir a visão geral. Comentário datado no próprio teste. Nenhum outro teste antigo precisou mudar.
- **Decisões do dono que continuam abertas:**
  - Regime, inscrições e razão de cada empresa (a tela pede).
  - Categoria de mútuo (etapa b).
  - Gravar as chaves dos produtos do Sicredi já liberados e OMIE_APP_KEY_FILIAL/SECRET.

## 7a. Regras da Wanessa (FORM-FIN-001, chegaram com a suíte final rodando)

Para não abrir outra rodada longa da suíte, só entrou o que já estava pronto. O resto fica registrado:

- **Prestadora: já aplicado.** A Prestadora está "dentro do Omie da matriz", não mais "a definir". **Pendência da etapa b:** a conta "Sicredi prestadora" e a "Itaú Unibanco Prestadora" continuam da Matriz por padrão, com o selo "conferir: o nome cita a Prestadora". O dono ou o Charles passam para a Prestadora em Empresas e bancos (um toque e o motivo), ou a etapa b muda o padrão depois de conferir com a Wanessa qual é a conta dela. Também na etapa b: INSS, FGTS e DAS "METROLAB(S) SERVIÇOS" como despesa da Prestadora.
- **Saldo mínimo de R$ 30.000,00: ajuste de configuração, sem código.** A regra já existe (`FIN_SALDO_MINIMO`, Chaves e senhas > Regras do Financeiro > Saldo mínimo de segurança). Com o valor gravado, a previsão do Painel e a Agenda passam a dizer o dia em que a curva realista cruza o mínimo. **O dono grava 30000**; não gravei em produção. **Pendência da etapa b:** um aviso próprio na faixa de riscos do Painel quando o saldo de hoje ficar abaixo do mínimo; hoje o aviso sai só pela previsão.
- **Relatório semanal para o Charles: ajuste do dono, já configurável.** O destinatário fica em `FIN_RELATORIO_DESTINOS` (Chaves e senhas > Regras do Financeiro). O dono inclui o Charles; não gravei em produção.

## 8. Capturas

Em `capturas/`, 1366 e 390 px:
- **Dados reais** (`*-real-01..03`: painel diretoria, Meu dia, Empresas e bancos; faixa azul "DADOS REAIS · ensaio só leitura").
- **Simulados** do teste (`*-01..09`, faixa "DADOS SIMULADOS").
- **Tela de chaves nova** (`*-10-chaves-*`).

Gerar de novo:
- Teste: `tests/financeiro-v2-etapa-a-20261119.test.cjs`.
- Dados reais: `capturas-reais.cjs`, com o JSON do ensaio.
- Tela de chaves: `capturas-segredos.cjs`.
