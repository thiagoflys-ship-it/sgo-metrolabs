# Catálogo de poderes do SGO+ — etapa 1 (inventário e desenho)

Levantamento de 10/11/2026, feito só por leitura. Nenhum código foi alterado, nada foi publicado e não houve acesso ao servidor.

- **Código analisado:** `output/poderes-20261110/base` (imagem `metrolabs/sgo:comercial-assinatura-20261110`; legado do commit `26914c8`, `base/legado/_ORIGEM.json`). Igual à cópia em `producao/` (conferido arquivo a arquivo).
- **Dados reais:** `cadastro-e-config.txt` (23 contas, `CMP_CONFIG`, `ATEC_CONFIG`, `COM_CONFIG`). Ponto de partida: `MAPA_PERMISSOES.md` e `matriz.json`.
- **Arquivos desta etapa:** `catalogo.json` (catálogo completo, com as travas de cada poder e o valor de hoje para cada conta), `INVENTARIO_TRAVAS.csv` (uma linha por ocorrência) e este documento. As ferramentas que geram e testam o catálogo estão em `ferramentas-catalogo/`.

---

## 1. Resumo

| Item | Quantidade |
|---|--:|
| Poderes (caixas) propostos | {{NPODERES}} |
| Travas de acesso no servidor | {{NTRAVAS}} ({{NLEG}} no legado Apps Script e {{NNODE}} no servidor Node) |
| Linhas que definem as regras (dentro das funções-porteiro) | {{NDEF}} |
| Travas só de tela (menu e botões) | {{NTELA}} |
| Linhas de roteamento (quem recebe aviso ou decisão) | {{NROT}} |
| Linhas que ficam fora das caixas (dono, cliente, representada, modo personalizado) | {{NFORA}} |
| Ocorrências que parecem trava mas não são (tipo de serviço, canal) | {{NNAO}} |
| Divergências registradas | {{NDIV}} |

Poderes por categoria: {{PORCAT}}.

**Teste de equivalência (feito nesta etapa).** As funções de produção que decidem o acesso (36 funções: `isAdminPerfilAuth_`, `SGO_ehGestaoRotina_`, `Com_nivelDe_`, `Cmp_nivelDe_`, `Ast_nivelDe_`, `Conduta_veIdentidadeUsuario_`, `Ges_veSigilo_`, `Lic_nivelDe_`, `AstO_podeGerirFila_`, `CmpCart_podeVer_` e outras) foram carregadas do legado **sem alteração** e comparadas com a regra padrão de 50 poderes, nas 23 contas reais: **1.150 comparações, 0 divergências** (`ferramentas-catalogo/teste-equivalencia.cjs`). Os outros 100 poderes usam as mesmas regras-base (rotina, gestão de decisões, Diretoria, dono, perfis fixos) já cobertas pelo teste.

**O que mais pede atenção (detalhes na seção 7):**

1. **Chaves e senhas abertas a qualquer gestor no servidor Node** (`/_sgo/segredos` usa `isAdminSession`). Elisa, Bruna, Priscilla, Matheus e Ricardo podem sobrescrever a chave da IA, do Omie, do Auvo, do e-mail, da Meta e as senhas do simulador e do modo personalizado. No legado, Chaves e senhas é só do dono. (D-02)
2. **Relatório interno (dados reconstituídos):** a tela libera só ADMIN e Bento; o servidor confere só a senha. Somado ao item 1, quem regravar a senha passa a usar o relatório. (D-01)
3. **A área e o vínculo do cadastro dão poderes** (Qualidade = nomes do Conduta; Comercial = gestão comercial; RH = ponto de todos; vínculo Diretoria = administra a automação predial) e são alterados por toda a rotina (8 pessoas, incluindo o Financeiro). (D-11)
4. **A configuração `GES_CONFIG.gestoresPorArea` não foi extraída.** Ela concede poderes na Assistência, Comercial, Compras e Ponto. O "hoje" supõe vazio; extrair antes de migrar.
5. **"Dono sempre tudo" muda 3 caixas do admin:** hoje o admin NÃO tem `FROTA_BLOQUEIO_ROUBO` (só perfil DIRETORIA), `COM_CATALOGO_EDITAR_VENDA` (ele já tem o catálogo completo) e `REP_ABRIR_EM_NOME` (lista). É a única diferença prevista em relação ao espelho; decidir.

---

## 2. Desenho adotado

### 2.1 O poder (a caixa)

Cada poder fica no catálogo do código (futuro `SGO_Poderes.js`) com: `codigo` (MAIÚSCULAS_COM_UNDERLINE), `modulo`, `nome` (para o dono), `descricao` ("o que esta caixa libera"), `categoria` (ver, operar, aprovar, excluir, administrar, valores, sigiloso) e `padrao(eu)`, a regra que reproduz a de hoje. Alguns têm ainda `escopo` (o alcance: próprio, área, todos), `limite` (faixa em dinheiro) ou `lista` (a lista de configuração que hoje concede o poder).

### 2.2 Como o servidor decide (`SGO_pode_`)

```js
// esboço — a implementar na etapa 2
function SGO_pode_(sessao, codigo, alvo) {
  var eu = SGO_euDaSessao_(sessao);                    // { id, login, perfil, area, vinculo }
  if (!eu || eu.perfil === 'REPRESENTADA') return false;  // fixo: a representada só usa o módulo dela
  if (eu.perfil === 'CLIENTE') return false;              // fixo: o cliente só usa o portal (escopo próprio)
  if (SGO_ehDono_(eu)) return true;                       // fixo: dono do sistema = tudo
  var poder = SGO_PODERES[codigo];
  if (!poder) throw new Error('poder desconhecido: ' + codigo);
  var exc = SGO_excecaoDe_(eu.id, codigo);                // 'SIM' | 'NAO' | ''
  if (exc === 'SIM') return true;
  if (exc === 'NAO') return false;
  return !!poder.padrao(eu, SGO_cfgAcessos_());           // regra de hoje (espelho)
}
// Depois da caixa continuam as proteções fixas: quem pediu não aprova, quem elaborou não aprova,
// envolvido não decide, ninguém mexe nas próprias caixas, escopo do registro (seção 5).
```

A tela recebe uma vez a lista dos poderes efetivos da pessoa (`SGO_poderesEfetivos_`) e só mostra o que ela pode. O servidor confere sempre; a tela nunca é a trava.

### 2.3 Exceções por pessoa

Uma aba nova (sugestão: `CAD_PODERES_EXCECOES`: `USUARIO_ID`, `CODIGO`, `VALOR` SIM/NÃO, `MOTIVO`, `POR`, `EM`) e o histórico em `ACESSOS_HISTORICO`. Exceção sobrepõe o padrão. Só quem tem `ACESSOS_GERIR` grava; ninguém grava para si.

### 2.4 Migração espelho (dia 1)

1. O `padrao(eu)` de cada poder lê **os mesmos perfis, áreas e listas de hoje** (inclusive compradores, triagem e os dois IDs fixos das O.S.). Sem nenhuma exceção gravada, todo mundo fica exatamente como está: é o que o teste de equivalência confere.
2. Num segundo passo, cada lista de configuração e cada ID no código vira exceção SIM na tela Acessos, e o padrão deixa de ler a lista. O teste de equivalência roda de novo antes de publicar.
3. A área continua no padrão no dia 1 (para ninguém perder nada). A recomendação é que, depois, o poder venha só da caixa, e `AREAS_DEFINIR_PESSOA` e `CONTAS_ALTERAR_OUTROS` fiquem mais restritos (seção 7).

### 2.5 Regras-base usadas nos padrões

As expressões `padrao` do catálogo usam estas funções, que espelham o código (referências nos comentários):

```js
{{REGRAS_BASE}}
```

---

## 3. Catálogo por lote

As colunas "Quem tem hoje" saem do `padrao` aplicado às 23 contas. As contas de cliente (hst, hcn, ndi) e de representada (qualidade, energiza2209) não aparecem porque não têm nenhum poder de equipe. "6 técnicos" = hidelbrandosampaio, paulohenrique, gabrielpereira, gabrieldias, joaopedro e rafael.marques. A lista de travas de cada poder (arquivo, linha, função, ação e regra) está no `catalogo.json` e no CSV.
{{TABELAS}}

---

## 4. Poderes por pessoa (hoje, migração espelho)

{{MATRIZ}}
O detalhe (SIM/NÃO por poder e por pessoa) está em `catalogo.json`, campo `hoje` de cada poder.

---

## 5. Casos que não cabem em caixa simples

### 5.1 Escopo: "só o que é meu", "a minha área", "todos"

Regra prática:

- **O próprio registro fica fora das caixas.** O vendedor sempre mexe nas próprias propostas; o técnico, nas próprias O.S.; quem pediu a compra, no próprio pedido; o dono da reserva, na própria reserva; o envolvido e o fiscal, na própria ocorrência. Isso não se desmarca.
- **"Todos" é uma caixa.** `COM_TODAS_AS_VENDAS`, `AST_VER_TODOS_CHAMADOS`, `AST_EXECUTAR_OS_DE_OUTROS`, `COMPRAS_VER_FILA`, `FROTA_RESERVAS_GERIR`, `ATIVIDADES_GERIR_EQUIPE`, `GESTAO_CAIXA_VER_TODAS`, `PONTO_VER_TODOS`.
- **"A minha área" é uma caixa com escopo AREA**, onde o alcance vem da área do cadastro: `COMPRAS_APROVAR_DA_AREA`, `PONTO_VER_EQUIPE_AREA`, `AST_GERIR_FILA_SETOR`, `INICIO_PENDENCIAS_GESTAO`. Para isso não virar porta de entrada, a área de cada pessoa passa a ser alterada só por quem tem `AREAS_DEFINIR_PESSOA` (recomendado: dono e Diretoria).

Na implementação: `SGO_pode_(sessao, 'COMPRAS_APROVAR_DA_AREA', { area: pedido.SOLICITANTE_AREA })` confere a caixa e, quando o poder tem escopo AREA, compara a área do alvo com a da pessoa (Diretoria e dono = todas).

### 5.2 Limites em dinheiro

Os valores continuam na configuração de cada módulo (`CMP_CONFIG.REGRAS.faixas`: até R$ 1.000,00 comprador; até R$ 10.000,00 gestor da área; acima, Diretoria. Política comercial: desconto até 15%, alçadas de 10% e 13,75%, margem mínima de 35%). As caixas dizem **quem** decide em cada faixa: `COMPRAS_APROVAR_ATE_LIMITE`, `COMPRAS_APROVAR_DA_AREA`, `COMPRAS_APROVAR_SEM_LIMITE`, `COM_DECIDIR_DESCONTO`, `COM_DESCONTO_DIRETORIA`. Se um dia o dono quiser um limite diferente por pessoa, a exceção pode guardar um valor (ex.: "SIM até R$ 3.000"), sem mudar o catálogo.

### 5.3 Listas de configuração

Compradores, triagem, responsáveis da representação, quem abre pedido em nome da representada e o RH do ponto continuam valendo no dia 1 (o padrão lê a lista). No segundo passo viram exceções SIM das caixas correspondentes (`COMPRAS_COMPRAR` + `COMPRAS_APROVAR_ATE_LIMITE`, `AST_TRIAGEM`, `REP_ADMINISTRAR`, `REP_ABRIR_EM_NOME`, `PONTO_VER_TODOS`) e a lista sai da tela de regras. A chave "financeiros" de Compras não é lida pelo código e não deve virar poder (D-12).

### 5.4 Exceções escritas no código

| Exceção | Onde | Vira |
|---|---|---|
| Bruna e Matheus transferem O.S. (IDs fixos) | `SGO_Assistencia_OS.js:628-633` | exceção SIM em `AST_TRANSFERIR_OS` (e `AST_GERIR_FILA_SETOR` na Técnica) |
| Bento usa o relatório interno (ID e login fixos) | `SGO_*_ConteudoModulo.js` (`bentoAutorizado`, 4 arquivos) | exceção SIM em `RELATORIO_INTERNO_SIMULADO`, conferida também no servidor |
| `SGO_DONOS = ['admin']` | `SGO_Chaves.js:32` | proteção fixa "dono" |

### 5.5 O que fica fora das caixas

| Caso | Regra de hoje | Onde | Proposta |
|---|---|---|---|
{{FORA}}

---

## 6. Divergências e travas só de tela

### 6.1 Divergências

| Id | O que acontece | Onde | Efeito e tratamento |
|---|---|---|---|
{{DIV}}

### 6.2 Travas só de tela

A tela só esconde; quem decide é o servidor. Estas são as checagens de perfil na tela que precisam passar a ler a lista de poderes efetivos:

| Arquivo:linha | Função | O que esconde ou mostra | Regra na tela | Poder | Servidor |
|---|---|---|---|---|---|
{{TELA}}

---

## 7. Pontos de atenção (para decidir antes ou durante a migração)

1. **Segredos do servidor (D-02).** Proposta: `/_sgo/segredos` e `/_sgo/estado` passam a exigir `SISTEMA_SEGREDOS_SERVIDOR` / `SISTEMA_PAINEL_SERVIDOR`, e o padrão desses dois deixa de ser "qualquer gestor" e vira "dono". É a única correção de segurança que recomendo fazer **antes** do espelho, por ser grave e isolada (2 linhas no Node).
2. **Escalada pelo cadastro (D-11).** Toda a rotina (ADMIN, DIRETORIA, GESTOR, RH, FINANCEIRO) altera área, e-mail e vínculo de outras pessoas, e a área concede poderes. Trocar o e-mail de alguém e pedir o link de senha dá acesso à conta. Depois do espelho: `CONTAS_ALTERAR_OUTROS` (e-mail), `CONTAS_MUDAR_PERFIL`, `CONTAS_REDEFINIR_SENHA` e `AREAS_DEFINIR_PESSOA` só para o dono e a Diretoria.
3. **Relatório interno (D-01).** O servidor passa a conferir `RELATORIO_INTERNO_SIMULADO` além da senha.
4. **`GES_CONFIG.gestoresPorArea` não extraído.** Extrair e rodar o teste de equivalência de novo com o valor real antes do lote 5 (Compras) e do lote 8 (Assistência).
5. **Programa de conduta.** O lote 2 troca só as travas de acesso. As regras do programa (envolvido não decide, Diretoria decide caso próprio com fundamentação, fiscal que registrou não decide, sigilo do envolvido) continuam iguais e ficam como proteções fixas; `CONDUTA_DECIDIR_COMO_DIRETORIA` deve ficar travada para a Diretoria.
6. **Frota (D-08).** Bloqueio de roubo hoje é só do perfil Diretoria (o admin não tem); hodômetro só ADMIN e GESTOR (a Diretoria não tem); "liberar agora" sem o Financeiro. O espelho mantém isso; a proteção "dono sempre tudo" dá ao admin o bloqueio de roubo.
7. **Gestor = administrador.** O espelho mantém que os 5 gestores (de RH, Metrologia, Qualidade e Comercial) têm quase os mesmos poderes (ex.: Elisa aprova relatório técnico, exclui chamados e altera regras da Assistência). Com as caixas, o dono corrige isso pessoa a pessoa, sem programar.
8. **Contas sem uso e conta de teste.** `energiza2209` (segunda conta do Matheus, administradora de outra representada) e hst, hcn, ndi, rafael.marques sem entradas: rever no cadastro (não depende do catálogo).

---

## 8. Ordem de migração por lotes

| Lote | Assunto | Poderes | Travas no servidor |
|:-:|---|:-:|:-:|
| 0 | Infraestrutura: `SGO_Poderes.js`, `SGO_pode_`, `SGO_poderesEfetivos_`, aba de exceções, histórico, tela Acessos em modo consulta (o poder `ACESSOS_GERIR` está no lote 1) | — | 0 |
{{LOTES_RESUMO}}

Contagem: cada trava conta uma vez, no lote do primeiro poder que a substitui. Os números incluem as travas do servidor Node (segredos, estado, financeiro).

**Em cada lote:** (1) acrescentar os poderes ao catálogo com o `padrao` deste documento; (2) trocar cada trava listada por `SGO_pode_`; (3) trocar as travas só de tela do módulo pela lista de poderes efetivos; (4) rodar o teste de equivalência (as funções antigas × `SGO_pode_` nas 23 contas) e os testes do módulo, com código de saída zero; (5) conferir a versão em produção, guardar backup e reversão, publicar; (6) verificar com "ver como a pessoa vê" para uma conta de cada perfil. Atualizar a ajuda e o manual de cada tela no mesmo pacote.

**Por que esta ordem:** lotes 1 a 6 cobrem o que é sensível (contas e senhas, sigilo do Conduta, dinheiro, aprovação técnica, compras e localização das pessoas). Lote 1 primeiro também porque a tela Acessos depende dele. Os lotes 7 a 11 são de rotina e podem ir em paralelo depois que o mecanismo estiver provado.

---

## 9. Esboço da tela "Acessos"

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Administração › Acessos                                   [Histórico] [Ajuda] │
├───────────────────────────────────────────────────────────────────────────────┤
│ Pessoa: [ Elisa Camargos Rezende            ▼]   Perfil: Gestor · Área: RH    │
│         Vínculo: CLT · 76 caixas marcadas (2 alteradas para esta pessoa)      │
│                                                                               │
│ [Copiar de outra pessoa ▼] [Aplicar modelo ▼] [Ver como a Elisa vê] [Desfazer]│
│ Buscar caixa: [______________]   Mostrar: (•) todas ( ) só alteradas ( ) SIM  │
├───────────────────────────────────────────────────────────────────────────────┤
│ ▼ Contas e acessos                                           10 de 17 marcadas │
│   [x] Ver a lista de contas                               padrão do perfil    │
│       Abre Administração > Usuários: nomes, e-mails, perfis e situação.       │
│   [ ] Alterar dados de outra pessoa                ⚠ alterado: NÃO (era SIM)  │
│       Muda nome, e-mail e celular de outra conta. O e-mail recebe o link de   │
│       nova senha.            motivo: "e-mail só pelo Administrador" · Thiago  │
│   [ ] Excluir conta de vez                                padrão do perfil    │
│ ▶ Programa de conduta                                        7 de 10 marcadas │
│ ▶ Financeiro                                                 1 de 8 marcadas  │
│ ▼ Documentos técnicos                                                         │
│   [ ] Aprovar relatório técnico de qualificação   ⚠ alterado: NÃO (era SIM)   │
│       Responsável técnico: confere, aprova, emite ou devolve o relatório.     │
│ ▶ Compras  ▶ Frota  ▶ Comercial  ▶ Assistência técnica  ▶ …                   │
├───────────────────────────────────────────────────────────────────────────────┤
│ Legenda: sem marca = padrão do perfil · ⚠ = alterado só para esta pessoa       │
│ 🔒 = proteção fixa (não se marca): dono do sistema, as próprias caixas         │
│ Motivo da alteração: [________________________________]   [Salvar alterações]  │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Escolher a pessoa:** lista das contas ativas da equipe (cliente e representada não aparecem). A conta logada aparece bloqueada ("você não altera as próprias caixas").
- **Grupos por módulo**, recolhidos, com a contagem "x de y marcadas". Dentro do grupo, as caixas na ordem ver → operar → aprovar → excluir → administrar → valores → sigiloso; as sigilosas têm um selo.
- **Cada caixa** mostra o nome e a descrição ("o que esta caixa libera") e a origem: *padrão do perfil* ou *alterado para esta pessoa* (com quem alterou, quando e o motivo). Voltar ao padrão apaga a exceção.
- **Copiar de outra pessoa:** copia as exceções (não o perfil) e mostra a prévia do que muda antes de salvar.
- **Aplicar modelo:** modelos guardados pelo dono (ex.: "Gestor da Metrologia", "Vendedor", "Financeiro", "Técnico de campo"), com prévia.
- **Ver como a pessoa vê:** abre o menu e o Início simulados com os poderes efetivos dela, só leitura.
- **Histórico:** quem mudou o quê, para quem, quando e por quê (também por pessoa e por caixa); exportável.
- **Salvar** exige motivo; mudanças em caixas sigilosas ou de contas pedem confirmação.

---

## 10. Premissas e limites

{{PREMISSAS}}
- O inventário foi feito por leitura do código com busca de padrões (chamadas às funções-porteiro, comparações de perfil, listas, IDs fixos e sinalizadores `eu.*`), conferida linha a linha nos módulos sensíveis. Checagens escritas de forma diferente podem ter escapado; o teste de equivalência do lote correspondente pega o que faltar.
- No servidor Node só foram avaliadas as rotas com trava própria (segredos, estado, financeiro, caixas de e-mail e o filtro de representada); o resto repassa ao legado, que é onde as travas estão.
- O RH360 (imagens `metrolabs/rh`) é outro sistema e não faz parte deste levantamento.
- O CSV usa ";" como separador; nos trechos de código, ";" foi trocado por ",".
