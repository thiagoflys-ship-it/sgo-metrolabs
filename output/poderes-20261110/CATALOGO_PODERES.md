# Catálogo de poderes do SGO+ — etapa 1 (inventário e desenho)

Levantamento de 10/11/2026, feito só por leitura. Nenhum código foi alterado, nada foi publicado e não houve acesso ao servidor.

- **Código analisado:** `output/poderes-20261110/base` (imagem `metrolabs/sgo:comercial-assinatura-20261110`; legado do commit `26914c8`, `base/legado/_ORIGEM.json`). Igual à cópia em `producao/` (conferido arquivo a arquivo).
- **Dados reais:** `cadastro-e-config.txt` (23 contas, `CMP_CONFIG`, `ATEC_CONFIG`, `COM_CONFIG`). Ponto de partida: `MAPA_PERMISSOES.md` e `matriz.json`.
- **Arquivos desta etapa:** `catalogo.json` (catálogo completo, com as travas de cada poder e o valor de hoje para cada conta), `INVENTARIO_TRAVAS.csv` (uma linha por ocorrência) e este documento. As ferramentas que geram e testam o catálogo estão em `ferramentas-catalogo/`.

---

## 1. Resumo

| Item | Quantidade |
|---|--:|
| Poderes (caixas) propostos | 150 |
| Travas de acesso no servidor | 1109 (1102 no legado Apps Script e 7 no servidor Node) |
| Linhas que definem as regras (dentro das funções-porteiro) | 183 |
| Travas só de tela (menu e botões) | 35 |
| Linhas de roteamento (quem recebe aviso ou decisão) | 58 |
| Linhas que ficam fora das caixas (dono, cliente, representada, modo personalizado) | 73 |
| Ocorrências que parecem trava mas não são (tipo de serviço, canal) | 15 |
| Divergências registradas | 13 |

Poderes por categoria: ver 21, operar 33, administrar 42, excluir 5, sigiloso 13, aprovar 27, valores 9.

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
const H = {
  dono: eu => CFG.donos.indexOf(eu.login) >= 0,                                   // Chaves_ehDonoUsuario_
  externo: eu => ['CLIENTE', 'REPRESENTADA', 'AUVO_SYNC', ''].indexOf(eu.perfil) >= 0,
  interno: eu => !H.externo(eu),                                                  // exigirSessao recusa REPRESENTADA; módulos recusam CLIENTE
  gestaoDecisoes: eu => ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0,  // isAdminPerfilAuth_ / isAdminSession
  rotina: eu => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].indexOf(eu.perfil) >= 0, // SGO_ehGestaoRotina_
  diretoria: eu => eu.perfil === 'DIRETORIA' || H.dono(eu),                       // perfil Diretoria ou dono
  equipeTecnica: eu => ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'].indexOf(eu.perfil) >= 0, // SGO_QEQ_PERFIS_EQUIPE / BAIXATEMP PERFIS_EQUIPE
  sigiloQualidade: eu => H.diretoria(eu) || (['GESTOR', 'ADMIN'].indexOf(eu.perfil) >= 0 && eu.area === 'QUALIDADE'), // Conduta_veIdentidade_ / Ges_veSigilo_
  gpa: (area) => (CFG.gestoresPorArea[area] || []),
  com: eu => { // Com_nivelDe_
    const dir = H.diretoria(eu);
    const gestao = eu.perfil === 'ADMIN' || dir || (eu.perfil === 'GESTOR' && eu.area === 'COMERCIAL') || ((CFG.comGestores.concat(H.gpa('COMERCIAL'))).indexOf(eu.id) >= 0 && eu.perfil !== 'CLIENTE');
    const vendedor = !gestao && (eu.perfil === 'COMERCIAL' || (eu.area === 'COMERCIAL' && eu.perfil !== 'CLIENTE' && eu.perfil !== 'RH'));
    const financeiro = !gestao && !vendedor && (eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO');
    const catalogo = gestao || financeiro;
    return { gestao, vendedor, financeiro, veValores: gestao || vendedor || financeiro, veCusto: catalogo, catalogo, catalogoVenda: vendedor && !catalogo, diretoria: dir };
  },
  cmp: eu => { // Cmp_nivelDe_
    if (H.externo(eu)) return { nivel: 'NENHUM' };
    const dir = H.diretoria(eu), admin = eu.perfil === 'ADMIN';
    const gestao = admin || dir || (eu.perfil === 'GESTOR' && eu.area === CFG.areaCompras);
    const lista = CFG.compradores.concat(CFG.substitutos).indexOf(eu.id) >= 0;
    const gestor = eu.perfil === 'GESTOR';
    const fin = eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO';
    const comprador = gestao || lista;
    return { nivel: 'INTERNO', gestao, comprador, gestor: gestor || gestao, financeiro: fin || dir || admin, veValores: comprador || gestor || fin, veFila: comprador || gestor,
      regras: admin || dir || H.rotina(eu), diretoria: dir, admin };
  },
  ast: eu => { // Ast_nivelDe_
    if (H.externo(eu)) return { interno: false };
    const dir = H.diretoria(eu), admin = eu.perfil === 'ADMIN';
    const gestao = admin || dir || (eu.perfil === 'GESTOR' && eu.area === 'TECNICA') || H.gpa('TECNICA').indexOf(eu.id) >= 0;
    const tecnico = eu.perfil === 'TECNICO' || eu.area === 'TECNICA';
    const comercial = eu.perfil === 'COMERCIAL' || eu.area === 'COMERCIAL';
    const fin = eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO';
    return { interno: true, gestao, tecnico, admin, diretoria: dir, comercial, regras: admin || dir || eu.perfil === 'GESTOR', excluir: admin || dir || eu.perfil === 'GESTOR',
      valores: gestao || comercial || fin || eu.perfil === 'GESTOR', triagem: CFG.triagem.indexOf(eu.id) >= 0 };
  },
  pto: eu => { // Ponto_eu_
    const admin = eu.perfil === 'ADMIN', dir = H.diretoria(eu);
    const rh = eu.perfil === 'RH' || eu.area === 'RH' || CFG.pontoRhIds.indexOf(eu.id) >= 0;
    const verTodos = admin || dir || rh;
    const areasGestor = verTodos ? [] : [].concat(eu.perfil === 'GESTOR' && eu.area ? [eu.area] : [], Object.keys(CFG.gestoresPorArea).filter(a => H.gpa(a).indexOf(eu.id) >= 0));
    return { configurar: admin || dir || rh || H.rotina(eu), verTodos, tratar: verTodos, gestor: !verTodos && areasGestor.length > 0 };
  },
  lic: eu => eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || (eu.perfil !== 'CLIENTE' && eu.perfil !== 'REPRESENTADA' && H.dono(eu)), // Lic_nivelDe_
  autAdministra: eu => eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || H.dono(eu) || eu.vinculo === 'DIRETORIA', // AutPred_administra_ (inclui VINCULO_TRABALHO = DIRETORIA)
  gestoresCompras: () => [],                                       // Cmp_gestoresCompras_: gestoresPorArea[LOGISTICA] ou GESTOR com área LOGISTICA (hoje nenhum)
};
```

---

## 3. Catálogo por lote

As colunas "Quem tem hoje" saem do `padrao` aplicado às 23 contas. As contas de cliente (hst, hcn, ndi) e de representada (qualidade, energiza2209) não aparecem porque não têm nenhum poder de equipe. "6 técnicos" = hidelbrandosampaio, paulohenrique, gabrielpereira, gabrieldias, joaopedro e rafael.marques. A lista de travas de cada poder (arquivo, linha, função, ação e regra) está no `catalogo.json` e no CSV.

### Lote 1 — Contas, senhas e acessos

17 poderes, 45 travas no servidor (mais 12 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `CONTAS_VER` | Contas e acessos | Ver a lista de contas | ver | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 6 |
| `CONTAS_CRIAR` | Contas e acessos | Criar conta | operar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 1 |
| `CONTAS_ALTERAR_OUTROS` | Contas e acessos | Alterar dados de outra pessoa | operar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 1 |
| `CONTAS_MUDAR_PERFIL` | Contas e acessos | Mudar o perfil de outra pessoa | administrar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |
| `CONTAS_REDEFINIR_SENHA` | Contas e acessos | Redefinir senha de outra pessoa | administrar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |
| `CONTAS_INATIVAR` | Contas e acessos | Inativar e reativar conta | excluir | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |
| `CONTAS_EXCLUIR` | Contas e acessos | Excluir conta de vez | excluir | `eu.perfil === 'ADMIN'` | admin | 3 |
| `CONTAS_GERIR_ADMINISTRADOR` | Contas e acessos | Gerir contas de Administrador | administrar | `eu.perfil === 'ADMIN'` | admin | 9 |
| `CONTAS_DAR_DIRETORIA` | Contas e acessos | Dar ou alterar o perfil Diretoria | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 8 |
| `AREAS_GERIR` | Contas e acessos | Cadastrar áreas | administrar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 4 |
| `AREAS_DEFINIR_PESSOA` | Contas e acessos | Mudar a área de uma pessoa | administrar | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 1 |
| `SEGURANCA_VER_REGISTRO` | Contas e acessos | Ver a Segurança do acesso e o registro de entradas | sigiloso | `eu.perfil === 'ADMIN' \|\| H.dono(eu) \|\| H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `SEGURANCA_ALTERAR` | Contas e acessos | Alterar a Segurança do acesso | administrar | `eu.perfil === 'ADMIN' \|\| H.dono(eu)` | admin | 6 |
| `SISTEMA_SEGREDOS_SERVIDOR` | Contas e acessos | Gravar chaves e senhas no servidor (/_sgo/segredos) | administrar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `SISTEMA_PAINEL_SERVIDOR` | Contas e acessos | Ver o painel do servidor (/_sgo/estado) | ver | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 1 |
| `MODO_PERSONALIZADO_DESIGNAR` | Contas e acessos | Designar responsáveis do modo personalizado | administrar | `eu.perfil === 'ADMIN' \|\| H.dono(eu)` | admin | 5 |
| `ACESSOS_GERIR` | Contas e acessos | Gerir os acessos (tela Acessos) *(NOVO)* | administrar | `H.dono(eu)` | admin | 0 |

### Lote 2 — Programa de conduta (só travas de acesso)

10 poderes, 105 travas no servidor (mais 13 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `CONDUTA_PARTICIPAR` | Programa de conduta | Participar do Programa de conduta | operar | `H.interno(eu)` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 32 |
| `CONDUTA_CONSULTAR_EQUIPE` | Programa de conduta | Consultar o Conduta de toda a equipe | ver | `H.gestaoDecisoes(eu) \|\| eu.perfil === "RH"` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 5 |
| `CONDUTA_VER_NOMES` | Programa de conduta | Ver quem é o envolvido (sigilo) | sigiloso | `H.gestaoDecisoes(eu) && H.sigiloQualidade(eu)` | admin, matheusgodoi, charles | 30 |
| `CONDUTA_DECIDIR` | Programa de conduta | Decidir ocorrências | aprovar | `H.gestaoDecisoes(eu) && H.sigiloQualidade(eu)` | admin, matheusgodoi, charles | 8 |
| `CONDUTA_DECIDIR_COMO_DIRETORIA` | Programa de conduta | Decidir como Diretoria (casos próprios e de gestores) | aprovar | `H.diretoria(eu)` | admin, charles | 11 |
| `CONDUTA_MISSAO_DECIDIR` | Programa de conduta | Aprovar e remover missões (incentivo em R$) | valores | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `CONDUTA_AUSENCIA_GERIR` | Programa de conduta | Lançar e remover ausências | sigiloso | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `CONDUTA_FECHAR_MES` | Programa de conduta | Fechar o mês do Conduta | aprovar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `CONDUTA_PAINEIS_GESTAO` | Programa de conduta | Painéis e relatórios da gestão do programa | ver | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 4 |
| `CONDUTA_CONFIGURAR` | Programa de conduta | Configurar rotinas do programa | administrar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 9 |

### Lote 3 — Financeiro

8 poderes, 19 travas no servidor (mais 1 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `FIN_VER_CONTAS` | Financeiro | Ver contas a pagar, a receber, caixa e extrato (Omie) | valores | `eu.perfil === "ADMIN" \|\| eu.perfil === "DIRETORIA" \|\| eu.perfil === "FINANCEIRO"` | admin, wanessa, charles | 2 |
| `FIN_CONCILIAR_BANCO` | Financeiro | Conciliar o extrato bancário (OFX) | operar | `eu.perfil === "ADMIN" \|\| eu.perfil === "DIRETORIA" \|\| eu.perfil === "FINANCEIRO"` | admin, wanessa, charles | 1 |
| `FIN_CONFERIR_COMPRAS` | Financeiro | Conferir compras (Financeiro) | aprovar | `H.cmp(eu).financeiro === true` | admin, wanessa, charles | 3 |
| `FIN_FATURAS_CONCILIAR` | Financeiro | Conciliar faturas de cartão | operar | `H.cmp(eu).financeiro === true \|\| H.cmp(eu).gestao === true` | admin, wanessa, charles | 4 |
| `FIN_A_PAGAR` | Financeiro | Ver e baixar o que há a pagar | valores | `H.cmp(eu).financeiro === true \|\| H.cmp(eu).gestao === true` | admin, wanessa, charles | 2 |
| `FIN_FATURA_REABRIR` | Financeiro | Reabrir fatura fechada | administrar | `H.cmp(eu).diretoria === true \|\| eu.perfil === "ADMIN"` | admin, charles | 1 |
| `FIN_CARTOES_VER` | Financeiro | Ver os cartões da empresa | valores | `H.cmp(eu).financeiro === true \|\| H.cmp(eu).comprador === true \|\| H.cmp(eu).gestao === true \|\| H.cmp(eu).ges…` | admin, matheusgodoi, elisa, wanessa, guilherme, ricardo, charles, priscilla, bruna, monica | 4 |
| `FIN_CARTOES_EDITAR` | Financeiro | Cadastrar e alterar cartões | administrar | `H.cmp(eu).financeiro === true \|\| H.cmp(eu).diretoria === true \|\| eu.perfil === "ADMIN"` | admin, wanessa, charles | 2 |

### Lote 4 — Aprovação de relatório técnico

4 poderes, 75 travas no servidor (mais 15 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `RELATORIO_TECNICO_APROVAR` | Documentos técnicos | Aprovar relatório técnico de qualificação | aprovar | `['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, beatriz, ricardo, charles, priscilla, bruna | 59 |
| `RELATORIO_BAIXATEMP_APROVAR` | Documentos técnicos | Aprovar ensaio de baixa temperatura | aprovar | `['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 3 |
| `RELATORIO_MODELO_ESCOLHER` | Documentos técnicos | Escolher o modelo dos relatórios oficiais | administrar | `eu.perfil === 'ADMIN'` | admin | 6 |
| `RELATORIO_INTERNO_SIMULADO` | Documentos técnicos | Usar o relatório interno (dados reconstituídos) | sigiloso | `eu.perfil === 'ADMIN' \|\| (eu.id === CFG.relatorioInterno.id && eu.login === CFG.relatorioInterno.login)` | bento, admin | 11 |

### Lote 5 — Compras

10 poderes, 45 travas no servidor (mais 6 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `COMPRAS_PEDIR` | Compras | Pedir compra e informar compra feita *(escopo: PROPRIO (pedidos de que é solicitante ou vendedor))* | operar | `H.cmp(eu).nivel !== 'NENHUM'` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 7 |
| `COMPRAS_VER_FILA` | Compras | Ver a fila e o painel de compras | ver | `H.cmp(eu).veFila === true` | admin, matheusgodoi, elisa, guilherme, ricardo, charles, priscilla, bruna, monica | 4 |
| `COMPRAS_VER_VALORES` | Compras | Ver valores de compras e fornecedores | valores | `H.cmp(eu).veValores === true` | admin, matheusgodoi, elisa, wanessa, guilherme, ricardo, charles, priscilla, bruna, monica | 4 |
| `COMPRAS_COMPRAR` | Compras | Cotar e comprar | operar | `H.cmp(eu).comprador === true` | admin, matheusgodoi, guilherme, ricardo, charles, monica | 19 |
| `COMPRAS_APROVAR_ATE_LIMITE` | Compras | Aprovar compra até o limite do comprador *(limite: faixa 1 de CMP_CONFIG.REGRAS.faixas (hoje R$ 1.000,00))* | aprovar | `CFG.compradores.concat(CFG.substitutos).indexOf(eu.id) >= 0 \|\| H.gestoresCompras().indexOf(eu.id) >= 0 \|\| H…` | admin, matheusgodoi, guilherme, ricardo, charles, monica | 3 |
| `COMPRAS_APROVAR_DA_AREA` | Compras | Aprovar compra da própria área (faixa do gestor) *(escopo: AREA (área de quem pediu); Diretoria = todas; limite: faixa 2 (hoje R$ 10.000,00))* | aprovar | `(eu.perfil === 'GESTOR' && !!eu.area) \|\| Object.keys(CFG.gestoresPorArea).some(a => H.gpa(a).indexOf(eu.id)…` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 5 |
| `COMPRAS_APROVAR_SEM_LIMITE` | Compras | Aprovar compra acima de todas as faixas | aprovar | `H.diretoria(eu)` | admin, charles | 6 |
| `COMPRAS_GESTAO` | Compras | Gestão de Compras | administrar | `H.cmp(eu).gestao === true` | admin, charles | 1 |
| `COMPRAS_REGRAS_EDITAR` | Compras | Alterar as regras de compras | administrar | `H.cmp(eu).regras === true` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |
| `COMPRAS_CIENCIA_GESTAO` | Compras | Dar ciência de compra fora do fluxo | aprovar | `H.cmp(eu).gestor === true \|\| H.cmp(eu).diretoria === true \|\| eu.perfil === "ADMIN"` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 1 |

### Lote 6 — Frota: localização e bloqueio

6 poderes, 42 travas no servidor (mais 9 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `FROTA_LOCALIZAR` | Frota | Ver localização, mapa e rotas dos veículos | sigiloso | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 17 |
| `FROTA_RASTREADOR_CONFIGURAR` | Frota | Configurar rastreador e alertas | administrar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 4 |
| `FROTA_BLOQUEAR_PARTIDA` | Frota | Bloqueio da partida | aprovar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 14 |
| `FROTA_LIBERAR_PARTIDA` | Frota | Liberar a partida agora | operar | `(H.gestaoDecisoes(eu) \|\| H.rotina(eu)) && ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 5 |
| `FROTA_BLOQUEIO_ROUBO` | Frota | Bloqueio de roubo | administrar | `(H.gestaoDecisoes(eu) \|\| H.rotina(eu)) && eu.perfil === 'DIRETORIA'` | charles | 4 |
| `FROTA_ODOMETRO_CORRIGIR` | Frota | Corrigir o hodômetro do bloqueio | operar | `(H.gestaoDecisoes(eu) \|\| H.rotina(eu)) && ['ADMIN', 'GESTOR'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, ricardo, priscilla, bruna | 4 |

### Lote 7 — Comercial

14 poderes, 181 travas no servidor (mais 13 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `COM_USAR` | Comercial | Trabalhar no Comercial *(escopo: PROPRIO para vendedor (oportunidades e propostas de que é responsável); TODOS com COM_TODAS_AS_VENDAS)* | operar | `H.com(eu).gestao \|\| H.com(eu).vendedor` | admin, ricardo, charles, monica | 56 |
| `COM_TODAS_AS_VENDAS` | Comercial | Ver e mexer nas vendas de todos | ver | `H.com(eu).gestao` | admin, ricardo, charles | 25 |
| `COM_GESTAO_COMERCIAL` | Comercial | Gestão comercial | aprovar | `H.com(eu).gestao` | admin, ricardo, charles | 23 |
| `COM_DECIDIR_DESCONTO` | Comercial | Decidir desconto acima da alçada | aprovar | `H.com(eu).gestao` | admin, ricardo, charles | 2 |
| `COM_DESCONTO_DIRETORIA` | Comercial | Aprovar desconto da faixa da Diretoria | aprovar | `H.com(eu).diretoria \|\| eu.perfil === "ADMIN"` | admin, charles | 6 |
| `COM_PEDIDOS_APROVADOS` | Comercial | Ver os pedidos aprovados *(escopo: Financeiro: só propostas APROVADAS; vendedor: as próprias)* | ver | `H.com(eu).gestao \|\| H.com(eu).vendedor \|\| H.com(eu).financeiro` | admin, wanessa, ricardo, charles, monica | 9 |
| `COM_VER_VALORES` | Comercial | Ver valores de venda | valores | `H.com(eu).veValores` | admin, wanessa, ricardo, charles, monica | 15 |
| `COM_VER_CUSTO` | Comercial | Ver custo e margem | valores | `H.com(eu).veCusto` | admin, wanessa, ricardo, charles | 4 |
| `COM_CATALOGO_EDITAR` | Comercial | Manter o catálogo (preço e custo) | operar | `H.com(eu).catalogo` | admin, wanessa, ricardo, charles | 9 |
| `COM_CATALOGO_EDITAR_VENDA` | Comercial | Cadastrar item e preço de venda (vendedor) | operar | `H.com(eu).catalogoVenda` | monica | 5 |
| `COM_POLITICA_PRECOS` | Comercial | Política de preços e termos | administrar | `H.com(eu).diretoria \|\| eu.perfil === "ADMIN"` | admin, charles | 19 |
| `COM_BANCO_PRECOS_GERIR` | Comercial | Gerir o banco de preços | administrar | `H.com(eu).gestao` | admin, ricardo, charles | 6 |
| `COM_CONTATOS_CLIENTES` | Comercial | Ver e editar contatos dos clientes | sigiloso | `H.com(eu).gestao \|\| H.com(eu).vendedor \|\| ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna, monica | 3 |
| `COM_EXCLUIR` | Comercial | Excluir oportunidade ou proposta *(escopo: PROPRIO para vendedor; TODOS para a gestão comercial)* | excluir | `H.com(eu).gestao \|\| H.com(eu).vendedor` | admin, ricardo, charles, monica | 10 |

### Lote 8 — Assistência técnica e Representação

19 poderes, 141 travas no servidor (mais 24 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `RONDA_SUGESTAO_DECIDIR` | Comercial | Decidir sugestão da ronda ao Comercial | aprovar | `H.ast(eu).comercial \|\| H.ast(eu).diretoria \|\| H.ast(eu).admin` | admin, ricardo, charles, monica | 5 |
| `AST_USAR` | Assistência técnica | Usar a Assistência técnica | operar | `H.ast(eu).interno === true` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 29 |
| `AST_VER_TODOS_CHAMADOS` | Assistência técnica | Ver todos os chamados *(escopo: TODOS; técnico: os próprios)* | ver | `H.ast(eu).interno === true && (H.ast(eu).gestao \|\| !H.ast(eu).tecnico)` | admin, matheusgodoi, elisa, wanessa, beatriz, ricardo, charles, priscilla, bruna, monica | 16 |
| `AST_TRIAGEM` | Assistência técnica | Fazer a triagem dos chamados novos *(lista: ATEC_CONFIG.REGRAS.triagem.responsaveis)* | operar | `H.ast(eu).gestao \|\| H.ast(eu).triagem` | bento, admin, matheusgodoi, ricardo, charles, bruna | 7 |
| `AST_GESTAO` | Assistência técnica | Gestão da Assistência técnica | aprovar | `H.ast(eu).gestao === true` | admin, charles | 31 |
| `AST_EXECUTAR_OS_DE_OUTROS` | Assistência técnica | Registrar atendimento em O.S. de outro técnico *(escopo: PROPRIO sempre (técnico responsável, fora das caixas); a caixa dá TODOS)* | operar | `H.ast(eu).gestao === true` | admin, charles | 8 |
| `AST_TRANSFERIR_OS` | Assistência técnica | Transferir O.S. para outro técnico | aprovar | `H.ast(eu).interno === true && (H.ast(eu).gestao \|\| CFG.idsTransferirOS.indexOf(eu.id) >= 0)` | admin, matheusgodoi, charles, bruna | 2 |
| `AST_GERIR_FILA_SETOR` | Assistência técnica | Gerir a fila do setor *(escopo: SETOR: o da própria área; Administrador e Diretoria = todos; Bruna e Matheus = Técnica)* | aprovar | `H.ast(eu).interno === true && (H.ast(eu).admin \|\| H.ast(eu).diretoria \|\| CFG.idsTransferirOS.indexOf(eu.id)…` | admin, matheusgodoi, ricardo, charles, priscilla, bruna | 7 |
| `AST_REGRAS` | Assistência técnica | Alterar as regras da Assistência | administrar | `H.ast(eu).regras === true` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 6 |
| `AST_VER_VALORES` | Assistência técnica | Ver e preencher valores de orçamento | valores | `H.ast(eu).valores === true` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna, monica | 5 |
| `AST_EXCLUIR` | Assistência técnica | Excluir e restaurar chamado | excluir | `H.ast(eu).excluir === true` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 4 |
| `AST_DESLIGAR_AUVO` | Assistência técnica | Marcar o Auvo como desligado | administrar | `eu.perfil === 'ADMIN'` | admin | 2 |
| `AST_ACEITAR_FALTAS_ACERVO` | Assistência técnica | Aceitar faltas do acervo do Auvo | aprovar | `H.ast(eu).diretoria === true` | admin, charles | 1 |
| `REP_USAR` | Representação | Abrir o módulo Representação (equipe) | operar | `H.ast(eu).interno === true` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 1 |
| `REP_ADMINISTRAR` | Representação | Administrar representadas | administrar | `['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0 \|\| H.diretoria(eu) \|\| CFG.repResponsaveis.indexOf(…` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 5 |
| `REP_ABRIR_EM_NOME` | Representação | Abrir pedido em nome da representada *(lista: Rep_emNomeCfg_ (não extraída))* | operar | `H.interno(eu) && CFG.repEmNome.indexOf(eu.id) >= 0` | — (ninguém) | 6 |
| `REP_CONFIGURAR` | Representação | Configurar quem abre em nome e desligar chamado | administrar | `eu.perfil === 'ADMIN'` | admin | 4 |
| `REP_RECEBER_ALERTAS` | Representação | Receber aviso de pedido novo da representada | operar | `H.ast(eu).gestao \|\| CFG.repResponsaveis.indexOf(eu.id) >= 0 \|\| H.ast(eu).triagem` | bento, admin, matheusgodoi, ricardo, charles, bruna | 2 |
| `REP_LIBERAR_FOTO` | Representação | Liberar foto à representada | aprovar | `H.ast(eu).gestao \|\| CFG.repResponsaveis.indexOf(eu.id) >= 0` | admin, charles | 1 |

### Lote 9 — Frota (uso e gestão), Caixa de decisões, Assistente do ponto

22 poderes, 186 travas no servidor (mais 35 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `FROTA_USAR` | Frota | Usar a Frota | operar | `H.interno(eu)` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 64 |
| `FROTA_OPERAR_PELOS_OUTROS` | Frota | Operar a Frota por outra pessoa | operar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 11 |
| `FROTA_VEICULOS_CADASTRAR` | Frota | Cadastrar veículos e documentos | operar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 14 |
| `FROTA_CONDUTORES_E_MULTAS` | Frota | Condutores, CNH e multas | sigiloso | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 11 |
| `FROTA_ABASTECIMENTO_CONFERIR` | Frota | Conferir abastecimentos | aprovar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 10 |
| `FROTA_GASTOS_VER` | Frota | Ver gastos e relatórios da Frota | valores | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 7 |
| `FROTA_MANUTENCAO_GERIR` | Frota | Manutenção da Frota | operar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 10 |
| `FROTA_GESTAO_MELHORIA` | Frota | Gestão e melhoria da Frota | aprovar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 8 |
| `FROTA_RESERVAS_GERIR` | Frota | Gerir reservas dos outros *(escopo: PROPRIO sempre (dono da reserva, fora das caixas))* | aprovar | `['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0 \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 7 |
| `FROTA_VALORES_SUSPEITOS` | Frota | Levantamento de valores suspeitos da Frota | administrar | `eu.perfil === 'ADMIN'` | admin | 1 |
| `GESTAO_CAIXA_DECISOES` | Caixa de decisões e desempenho | Usar a Caixa de decisões *(escopo: itens de que é responsável)* | aprovar | `['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0 \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 6 |
| `GESTAO_CAIXA_VER_TODAS` | Caixa de decisões e desempenho | Ver as decisões de todas as áreas | ver | `['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `GESTAO_VER_SIGILO` | Caixa de decisões e desempenho | Ver itens sigilosos (Conduta) na gestão | sigiloso | `H.sigiloQualidade(eu)` | admin, matheusgodoi, charles | 6 |
| `GESTAO_AVALIACAO_GESTORES` | Caixa de decisões e desempenho | Avaliação dos gestores (Diretoria) | sigiloso | `H.diretoria(eu)` | admin, charles | 5 |
| `GESTAO_AVALIACAO_REGRAS` | Caixa de decisões e desempenho | Regras da avaliação dos gestores | administrar | `H.diretoria(eu)` | admin, charles | 1 |
| `GESTAO_CONFIGURAR` | Caixa de decisões e desempenho | Regras e responsáveis da Caixa de decisões | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA' \|\| H.dono(eu)` | admin, charles | 7 |
| `GESTAO_RELATORIOS_EMPRESA` | Caixa de decisões e desempenho | Relatórios da empresa | ver | `H.diretoria(eu) \|\| eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 1 |
| `GESTAO_RESUMO_DIARIO` | Caixa de decisões e desempenho | Resumo diário da gestão (início) | ver | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |
| `PONTO_CONFIGURAR` | Assistente do ponto | Configurar o Assistente do ponto | administrar | `H.pto(eu).configurar` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 8 |
| `PONTO_VER_TODOS` | Assistente do ponto | Ver o ponto de todos | sigiloso | `H.pto(eu).verTodos` | admin, elisa, charles | 2 |
| `PONTO_TRATAR_AJUSTES` | Assistente do ponto | Tratar pedidos de ajuste do ponto | aprovar | `H.pto(eu).tratar` | admin, elisa, charles | 1 |
| `PONTO_VER_EQUIPE_AREA` | Assistente do ponto | Acompanhar o ponto da própria área *(escopo: AREA)* | sigiloso | `H.pto(eu).verTodos \|\| H.pto(eu).gestor` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |

### Lote 10 — Atividades, avisos, Início e comunicação

18 poderes, 59 travas no servidor (mais 24 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `ATIVIDADES_GERIR_EQUIPE` | Atividades e avisos | Gerir atividades da equipe *(escopo: PROPRIO sempre (atividade própria/envolvido, fora das caixas))* | aprovar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 19 |
| `ATIVIDADES_VER_RESTRITAS` | Atividades e avisos | Ver atividades restritas de outros | sigiloso | `H.gestaoDecisoes(eu) \|\| eu.perfil === "RH"` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 0 |
| `ATIVIDADES_AVISOS_HORARIOS` | Atividades e avisos | Avisos e horários (expediente) | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 3 |
| `AVISOS_PUBLICAR` | Atividades e avisos | Publicar avisos com ciência | operar | `H.gestaoDecisoes(eu) \|\| eu.perfil === "RH" \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 7 |
| `AVISOS_MATRIZ` | Atividades e avisos | Matriz de avisos | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA' \|\| H.dono(eu)` | admin, charles | 1 |
| `AVISOS_ABRIR_DE_OUTROS` | Atividades e avisos | Abrir aviso da gestão de outra pessoa | ver | `H.diretoria(eu) \|\| H.gestaoDecisoes(eu) \|\| (H.rotina(eu) && Object.keys(CFG.gestoresPorArea).some(a => H.gp…` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 1 |
| `CHAT_GESTAO` | Comunicação | Gestão no bate-papo | operar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `CHAT_ADMINISTRAR` | Comunicação | Administrar o bate-papo | administrar | `eu.perfil === 'ADMIN'` | admin | 2 |
| `CHAT_IMAGENS_CONFIGURAR` | Comunicação | Ligar o envio de imagens no bate-papo | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 2 |
| `EMAIL_CAIXAS_COMPARTILHADAS` | Comunicação | Caixas de e-mail compartilhadas | administrar | `eu.perfil === 'ADMIN'` | admin | 6 |
| `WHATSAPP_PILOTO_GERIR` | Comunicação | Piloto do WhatsApp | administrar | `['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 1 |
| `WHATSAPP_PILOTO_LIGAR` | Comunicação | Ligar e desligar o piloto do WhatsApp | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 1 |
| `WHATSAPP_VER_TELEFONES` | Comunicação | Ver telefones completos no piloto | sigiloso | `eu.perfil === 'ADMIN'` | admin | 0 |
| `ASSISTENTE_PAINEL_PERGUNTAS` | Comunicação | Painel de perguntas ao assistente | ver | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA'` | admin, charles | 3 |
| `INICIO_PENDENCIAS_GESTAO` | Início | Ver pendências da gestão no Início *(escopo: AREA (matriz de avisos); sem matriz, todas)* | ver | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 7 |
| `INICIO_PENDENCIAS_TECNICAS` | Início | Ver pendências técnicas e de clientes no Início | ver | `H.gestaoDecisoes(eu) \|\| eu.perfil === 'METROLOGIA'` | admin, matheusgodoi, elisa, beatriz, ricardo, charles, priscilla, bruna | 1 |
| `INICIO_PENDENCIAS_ADMIN` | Início | Ver pendências do Administrador no Início | ver | `eu.perfil === 'ADMIN'` | admin | 2 |
| `INICIO_PENDENCIAS_ROTINA` | Início | Ver pendências de rotina da Frota no Início | ver | `H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 2 |

### Lote 11 — Cadastros, documentos técnicos, Auvo e qualidade, Licitações, automação predial

22 poderes, 211 travas no servidor (mais 19 linhas de definição de regra).

| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |
|---|---|---|---|---|---|:-:|
| `DOCTEC_GERAR` | Documentos técnicos | Gerar documentos técnicos | operar | `H.interno(eu) && eu.perfil !== "RH"` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 15 |
| `DOCTEC_EMITIR_OFICIAL` | Documentos técnicos | Emitir certificado, laudo e relatório oficial | operar | `H.equipeTecnica(eu)` | bento, admin, matheusgodoi, elisa, beatriz, guilherme, ricardo, charles, priscilla, bruna, 6 técnicos | 12 |
| `CALIBRACAO_GESTAO` | Documentos técnicos | Relatórios de gestão da calibração | ver | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 3 |
| `PADROES_ATUALIZAR_ACERVO` | Documentos técnicos | Atualizar o acervo de padrões pelos certificados | administrar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 1 |
| `LAVCICLO_CONFIRMAR_REFERENCIA` | Documentos técnicos | Confirmar referência do ciclo da lavadora | aprovar | `eu.perfil === 'METROLOGIA' \|\| ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0` | admin, matheusgodoi, elisa, beatriz, ricardo, charles, priscilla, bruna | 1 |
| `ALERTAS_PADROES_CONFIGURAR` | Documentos técnicos | Configurar alertas de vencimento de padrões | administrar | `eu.perfil === 'ADMIN'` | admin | 2 |
| `CADASTROS_EDITAR` | Cadastros e documentos | Cadastrar clientes, unidades e equipamentos | operar | `H.interno(eu)` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 15 |
| `CADASTROS_EXCLUIR` | Cadastros e documentos | Excluir cadastro de vez | excluir | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 9 |
| `CADASTROS_ROTINA_GESTAO` | Cadastros e documentos | Rotina de cadastros da gestão | operar | `H.gestaoDecisoes(eu) \|\| H.rotina(eu)` | admin, matheusgodoi, elisa, wanessa, ricardo, charles, priscilla, bruna | 10 |
| `CADASTROS_JUNTAR_DUPLICADOS` | Cadastros e documentos | Juntar cadastros repetidos | administrar | `eu.perfil === 'ADMIN' \|\| eu.perfil === 'DIRETORIA' \|\| H.dono(eu)` | admin, charles | 7 |
| `EQUIPAMENTO_QR_COMPLETO` | Cadastros e documentos | Ver tudo pelo QR do equipamento | ver | `H.equipeTecnica(eu)` | bento, admin, matheusgodoi, elisa, beatriz, guilherme, ricardo, charles, priscilla, bruna, 6 técnicos | 1 |
| `AUVO_INTEGRACAO` | Integração Auvo e painel de qualidade | Usar a integração com o Auvo | operar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 35 |
| `AUVO_IMPLANTACAO` | Integração Auvo e painel de qualidade | Ferramentas de implantação do Auvo | administrar | `eu.perfil === 'ADMIN'` | admin | 1 |
| `AUVO_ACERVO` | Integração Auvo e painel de qualidade | Acervo do Auvo | ver | `['ADMIN', 'DIRETORIA'].indexOf(eu.perfil) >= 0` | admin, charles | 3 |
| `QUALIDADE_VER_PAINEL` | Integração Auvo e painel de qualidade | Painel de qualidade | ver | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 3 |
| `QUALIDADE_REGISTRAR` | Integração Auvo e painel de qualidade | Registrar e resolver ocorrência de qualidade | operar | `H.gestaoDecisoes(eu)` | admin, matheusgodoi, elisa, ricardo, charles, priscilla, bruna | 2 |
| `LIC_USAR` | Licitações | Trabalhar em Licitações | operar | `H.lic(eu)` | admin, charles | 17 |
| `LIC_ALCADAS` | Licitações | Alterar alçadas dos pareceres | administrar | `eu.perfil === 'ADMIN' \|\| H.dono(eu)` | admin | 2 |
| `LIC_ATOS_EXCEPCIONAIS` | Licitações | Atos excepcionais em Licitações | administrar | `eu.perfil === 'ADMIN'` | admin | 3 |
| `AUT_PORTOES` | Automação predial | Abrir e fechar portões | operar | `H.interno(eu)` | bento, admin, matheusgodoi, elisa, wanessa, beatriz, guilherme, ricardo, charles, priscilla, bruna, monica, 6 técnicos | 14 |
| `AUT_PORTA_DIRETORIA` | Automação predial | Destravar a porta da Diretoria | operar | `H.dono(eu) \|\| ((eu.perfil === 'DIRETORIA' \|\| eu.vinculo === 'DIRETORIA') && CFG.autPermissoesAcionar.indexO…` | admin | 31 |
| `AUT_ADMINISTRAR` | Automação predial | Administrar a automação predial | administrar | `H.autAdministra(eu)` | admin, charles | 34 |


---

## 4. Poderes por pessoa (hoje, migração espelho)

| Pessoa | Perfil / área | Poderes hoje |
|---|---|:-:|
| bento | TECNICO / METROLOGIA | 13 |
| admin | ADMIN / DIRETORIA | 147 |
| matheusgodoi | GESTOR / QUALIDADE | 85 |
| hidelbrandosampaio | TECNICO / TECNICA | 10 |
| paulohenrique | TECNICO / TECNICA | 10 |
| gabrielpereira | TECNICO / TECNICA | 10 |
| elisa | GESTOR / RH | 78 |
| wanessa | FINANCEIRO / FINANCEIRO | 50 |
| beatriz | METROLOGIA / METROLOGIA | 14 |
| guilherme | TECNICO / LOGISTICA | 15 |
| hst | CLIENTE / — | 0 |
| hcn | CLIENTE / — | 0 |
| ndi | CLIENTE / — | 0 |
| ricardo | GESTOR / COMERCIAL | 92 |
| gabrieldias | TECNICO / TECNICA | 10 |
| charles | DIRETORIA / DIRETORIA | 128 |
| joaopedro | TECNICO / TECNICA | 10 |
| energiza2209 | REPRESENTADA / — | 0 |
| priscilla | GESTOR / METROLOGIA | 77 |
| bruna | GESTOR / METROLOGIA | 80 |
| monica | COMERCIAL / COMERCIAL | 22 |
| rafael.marques | TECNICO / TECNICA | 10 |
| qualidade | REPRESENTADA / — | 0 |

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
| Dono do sistema (SGO_DONOS) | login admin: Chaves e senhas, porta da Diretoria por padrão, tratado como Diretoria | SGO_Chaves.js:32, 135-150 | Proteção fixa: dono = todos os poderes, sempre. Chaves e senhas (legado e Z-API) continuam exclusivas do dono, fora das caixas. |
| Ninguém concede a si mesmo / ninguém muda o próprio perfil | exigirNaoMudarProprioPerfil_ | SGO_Usuarios.js:103-107 | Proteção fixa na tela Acessos e no servidor: SGO_pode_(eu, "ACESSOS_GERIR") e alvo !== eu. |
| Sistema nunca fica sem Administrador ativo | ehUltimoAdminAtivo_ | SGO_Usuarios.js:262-266, 377, 449, 513 | Proteção fixa. |
| Conta do dono não é excluída | Usuarios_ehDonoConta_ | SGO_Usuarios.js:969-973 | Proteção fixa. |
| Escopo do registro: "o que é meu" | responsável da proposta/oportunidade, técnico da O.S., solicitante da compra, dono da reserva, envolvido da atividade, envolvido e fiscal da ocorrência | ComOpo_podeVer_, ComP_podeVer_, AstO_exigirCampo_, CmpR_podeVer_, FrotaRes_ehDono_, Atividades_envolvido_, Conduta_podeVerOcorrencia_ | Fica fora das caixas: o próprio registro é sempre permitido a quem é dono dele. A caixa "…_TODAS/…_DE_OUTROS" estende para todos (escopo TODOS); quando houver, escopo AREA. |
| Segregação de funções | quem pediu não aprova a compra; quem cotou não aprova acima do comprador; quem elaborou não aprova o ensaio; envolvido não decide a própria ocorrência/missão; vendedor não decide o próprio desconto; fiscal que registrou não decide | CmpC_podeAprovar_; BaixaTemp_exigirAprovador_; Conduta (regras 12 e 15/10); ComP_decidirDesconto_ | Proteções fixas, conferidas depois da caixa. Não são marcáveis. |
| Limites em dinheiro (Compras) | faixas em CMP_CONFIG.REGRAS.faixas: até 1.000 comprador; até 10.000 gestor da área; acima Diretoria | SGO_Compras_Cotacoes.js:129-166 | Os valores das faixas continuam na configuração. As caixas dizem QUEM aprova em cada faixa: COMPRAS_APROVAR_ATE_LIMITE, COMPRAS_APROVAR_DA_AREA (escopo AREA), COMPRAS_APROVAR_SEM_LIMITE. Opcional depois: limite por pessoa como parâmetro da caixa. |
| Alçadas de desconto (Comercial) | descontoMaxPct 15, alcadaGerentePct 10, alcadaDiretoriaPct 13,75, margem mínima 35 | COM_CONFIG.METODOLOGIA.politica | Valores ficam na política; caixas: COM_DECIDIR_DESCONTO e COM_DESCONTO_DIRETORIA. |
| Listas de configuração (compradores, triagem, responsáveis da representação, quem abre em nome) | listas de IDs nas abas *_CONFIG | CMP_CONFIG, ATEC_CONFIG, Rep_emNomeCfg_ | Migram como exceções SIM do poder correspondente (COMPRAS_COMPRAR + COMPRAS_APROVAR_ATE_LIMITE; AST_TRIAGEM; REP_ADMINISTRAR; REP_ABRIR_EM_NOME). A lista antiga vira só leitura e depois sai. |
| Responsáveis por área (gestoresPorArea) | Caixa de decisões > Regras e responsáveis | SGO_Gestao_Decisoes.js:310-312, 870-911 | Continua como roteamento (quem recebe o quê). Deixa de conceder poder sozinho: cada efeito vira caixa. Extrair o valor de produção antes. |
| Papel na representada (ATENDENTE, ADMIN da empresa) | Rep_exigirPerm_ por papel | SGO_Representacao.js:36-39 | Fora das caixas: é permissão da empresa externa, gerida pelo administrador da representada. |
| Cliente do portal | perfil CLIENTE + CLIENTE_ID: vê só a própria empresa | AstC_podeVer_, CertCal_exigirAcessoCliente_, SGO_QEQ_ehCliente_, Inventário, LavCiclo | Fora das caixas (escopo fixo do cliente). |
| Modo personalizado (responsáveis técnicos) | lista de responsáveis + senha própria + modo aberto por 30 min | SGO_ModoPersonalizado.js:272-354, 503-521 | A lista pode virar caixa MODO_PERSONALIZADO_APROVAR no futuro; a senha e o tempo aberto continuam como proteção fixa. |
| Exportação para migração | só o dono do projeto no editor do Apps Script | SGO_MigracaoExportar.js:26-33 | Fora das caixas (ferramenta do editor). |
| Rotinas automáticas internas | SGO_execucaoInterna_ (gatilhos), ponte do COMMAND | SGO_Gestao_Escada.js:81; SGO_PonteCommand.js | Fora das caixas (não há pessoa). |

---

## 6. Divergências e travas só de tela

### 6.1 Divergências

| Id | O que acontece | Onde | Efeito e tratamento |
|---|---|---|---|
| D-01 | Relatório interno (dados reconstituídos): a tela restringe, o servidor não | SGO_*_ConteudoModulo.js (SGO_podeRelatorioInterno_); SGO_AutoRel_Simulador.js:7-11 e 313; SGO_LavRel_Simulador.js:5; SGO_CadeiaFrioRel_Simulador.js:259; SGO_EstufaBanhoRel_Simulador.js:216 | Quem tiver a senha gera dados "aprovado/reprovado" chamando a função direto. O poder RELATORIO_INTERNO_SIMULADO passa a valer também no servidor. |
| D-02 | Chaves e senhas: legado só o dono; servidor Node aceita qualquer gestor | SGO_Chaves.js:142-150 × base/src/servicos/segredos.ts:34, estado.ts:19, servidor.ts:299 | Elisa, Bruna, Priscilla, Matheus e Ricardo conseguem gravar ou apagar a chave da IA, Omie, Auvo, SMTP, Z-API, Meta e as senhas do simulador e do modo personalizado (não leem, mas sobrescrevem). Ao sobrescrever a senha do simulador, quem gravou passa a conhecê-la (ver D-01). |
| D-03 | Menu mostra Comercial, Compras e Licitações e o servidor recusa | JS_Comercial.html:344, JS_Compras.html:191, JS_Licitacoes.html:255 | Não é falha de segurança; confunde. A lista de poderes efetivos resolve. |
| D-04 | Conduta no celular oferece telas que o servidor nega | JS_Core.html:5709-5712, 5612-5616 × SGO_Conduta_Qualidade.js:135-142 | Gestores sem sigilo veem o botão e recebem erro (detalhes em CONDUTA_VISIBILIDADE.md). |
| D-05 | Cadastros: tela e servidor com regras diferentes | JS_Cadastros.html:56-62 × SGO_Clientes.js:77,142,206; SGO_CadastroQualidade.js:265-269 | A tela esconde de técnicos o que o servidor aceita, e mostra a gestores o "juntar" que o servidor recusa. |
| D-06 | Contatos de clientes abertos a qualquer GESTOR | SGO_Comercial_Contatos.js:22 × SGO_Comercial_Config.js:856-862 | Gestores fora do Comercial leem dados pessoais dos contatos. |
| D-07 | Documentos técnicos: Comercial e Financeiro emitem em uns e não em outros | SGO_CertCal_Main.js (CertCal_perfilSoConsulta_); SGO_NR13_Main.js:73 × SGO_AutoRel_Main.js:29 | Separados em DOCTEC_GERAR × DOCTEC_EMITIR_OFICIAL para manter o espelho. |
| D-08 | Frota: a "gestão" tem exceções escondidas | SGO_Frota_Bloqueio.js:1260, 1288, 1323 | Ficam caixas separadas. Com a proteção "dono sempre tudo", o admin passa a ter o bloqueio de roubo e o hodômetro: decidir. |
| D-09 | Comunicados do bate-papo × avisos com ciência | SGO_Avisos.js:94 × SGO_ComunicacaoAdaptador.js:102, Comunicacao.js:1058 | Wanessa publica aviso com ciência, mas não comunicado no bate-papo. |
| D-10 | Assistência: mensagem diz "gestão da área Técnica", regra aceita qualquer GESTOR | SGO_Assistencia_Config.js:958-964 × mensagens em 982-990 | Elisa (RH) altera prazos e regras da Assistência e exclui chamados. |
| D-11 | Escalada pelo cadastro: área e vínculo dão poderes | SGO_Areas.js:291-307; SGO_Usuarios.js:331-421; SGO_Automacao_Predial.js:87-107 | Quem tem CONTAS_ALTERAR_OUTROS ou AREAS_DEFINIR_PESSOA (hoje toda a rotina, inclusive o próprio cadastro de área) pode se dar acesso. Na migração, a área deixa de conceder sozinha: o poder passa a ser a caixa. |
| D-12 | Lista "financeiros" de Compras gravada e ignorada | CMP_CONFIG.REGRAS.financeiros (elisa, matheusgodoi); SGO_Compras_Config.js:425-447 | Sem efeito hoje; não migrar como poder. |
| D-13 | Caixa de decisões: aprovação de compra por área do pedido | SGO_Compras_Cotacoes.js:149-165 | Elisa aprova compras de até R$ 10.000 pedidas pela área RH; Ricardo, as do Comercial; etc. Vira COMPRAS_APROVAR_DA_AREA com escopo AREA. |

### 6.2 Travas só de tela

A tela só esconde; quem decide é o servidor. Estas são as checagens de perfil na tela que precisam passar a ler a lista de poderes efetivos:

| Arquivo:linha | Função | O que esconde ou mostra | Regra na tela | Poder | Servidor |
|---|---|---|---|---|---|
| JS_Core.html:831 | aplicarRegrasDeAcesso_ | esconde seções técnica, operação, admin, calibração, documentos, planejamento, gestão, vínculos, correções, inventário | perfil === "CLIENTE" | (perfil de cliente: fora das caixas) | cada módulo recusa CLIENTE |
| JS_Core.html:856 | aplicarRegrasDeAcesso_ | mostra Integração Auvo e Painel de qualidade no menu | perfil ADMIN, GESTOR ou DIRETORIA | AUVO_INTEGRACAO / QUALIDADE_VER_PAINEL | igual (Auvo_exigirAdmin_, Qualidade_exigirGestor_) |
| JS_Core.html:862 | aplicarRegrasDeAcesso_ | mostra Usuários no menu | SGO_ehRotina_ (JS_Core.html:818) | CONTAS_VER | igual (verificarPermissaoConsulta_) |
| JS_Core.html:866 | aplicarRegrasDeAcesso_ | representada vê só o grupo Representação | perfil REPRESENTADA | (fora das caixas) | servidor.ts:427 e exigirSessao |
| JS_Core.html:875 | aplicarRegrasDeAcesso_ | perfil RH vê só SGO_TELAS_RH | perfil === "RH" (ninguém usa) | vários | SGO_bloquearRH_ nos módulos técnicos |
| JS_Core.html:5015 | atalhos do celular | atalho Usuários | SGO_ehRotina_ | CONTAS_VER | igual |
| JS_Core.html:5709 | mobileCondutaEhGestao_ | celular: botões de sugestões e missões da equipe | perfil ADMIN, GESTOR ou DIRETORIA | CONDUTA_VER_NOMES / CONDUTA_CONSULTAR_EQUIPE | diverge: sugestões exigem Conduta_veIdentidade_ |
| JS_Core.html:6064 | renderMobileFormClientes_ | botão Excluir cliente no celular | perfil ADMIN, DIRETORIA ou GESTOR | CADASTROS_EXCLUIR | igual (isAdminSession) |
| JS_Core.html:6232 | renderMobileFormUnidades_ | botão Excluir unidade no celular | perfil ADMIN, DIRETORIA ou GESTOR | CADASTROS_EXCLUIR | igual (isAdminSession) |
| JS_Core.html:6897 | monitor do Auvo | consulta periódica de eventos do Auvo | perfil ADMIN, GESTOR ou DIRETORIA | AUVO_INTEGRACAO | igual |
| JS_Core.html:2492 | frotaSouGestao_ | botões de gestão da Frota | rotina (ADMIN, GESTOR, DIRETORIA, RH, FINANCEIRO) | FROTA_* de gestão | igual (Frota_ehGestao_) |
| JS_Core.html:7004 | tela de rotina | carrega dados de rotina | SGO_ehRotina_ | vários de rotina | conferir |
| JS_Admin.html:837 | Configurações | bloco Alertas de calibração | perfil === "ADMIN" | ALERTAS_PADROES_CONFIGURAR | igual (AlertasPadroes_exigirAdmin_) |
| JS_Admin.html:855 | Configurações | bloco Responsáveis do modo personalizado | perfil ADMIN \|\| dono | MODO_PERSONALIZADO_DESIGNAR | igual (SGO_MP_exigirAdmin_) |
| JS_Admin.html:869 | Configurações | botões Usuários (gestão) e Chaves e senhas (dono) | gestão / dono | CONTAS_VER / (dono) | igual |
| JS_Atividades.html:269 | Atividades_ehGestor_ / podeEditar_ / podeAlterar_ | botões de gestão das atividades | rotina; o servidor também manda PODE_EDITAR e PODE_ALTERAR | ATIVIDADES_GERIR_EQUIPE | igual |
| JS_Avisos.html:75 | AvisosTela_ehGestor_ | aba de publicação de avisos | rotina | AVISOS_PUBLICAR | igual |
| JS_Gestao.html:94 | Gestao_ehGestao_ / Gestao_ehGestaoDecisao_ | Caixa de decisões (rotina) e Desempenho da gestão (ADMIN, GESTOR, DIRETORIA) | rotina / gestão de decisões | GESTAO_CAIXA_DECISOES / GESTAO_CAIXA_VER_TODAS | igual |
| JS_Gestao.html:196 | item da caixa | botão Registrar providência | item meu \|\| Diretoria \|\| ADMIN | GESTAO_CAIXA_DECISOES | igual (Gestao_apiProvidencia) |
| JS_Cadastros.html:60 | CadUI_gestao_ / CadUI_rotina_ | criar, editar, inativar, juntar repetidos, transferir e corrigir vínculos | rotina | CADASTROS_ROTINA_GESTAO / CADASTROS_JUNTAR_DUPLICADOS | diverge: juntar repetidos no servidor é só ADMIN, DIRETORIA, dono; criar e editar cliente no servidor é qualquer interno |
| JS_Cadastros.html:62 | CadUI_podeExcluir_ | botão Excluir de vez | perfil ADMIN, GESTOR ou DIRETORIA | CADASTROS_EXCLUIR | igual (isAdminSession) |
| JS_SegurancaAcesso.html:601 | SegAcessoTela_pode_ | abre a tela Segurança do acesso | perfil ADMIN, DIRETORIA ou GESTOR | SEGURANCA_VER_REGISTRO | igual (SegAcesso_podeVer_) |
| JS_WhatsappPiloto.html:46 | WaPiloto_pode_ | tela Piloto do WhatsApp | rotina | WHATSAPP_PILOTO_GERIR | igual |
| JS_Comercial.html:344 | Comercial_iniciar_ | menu do Comercial | esconde para CLIENTE e RH; o resto pergunta ao servidor (acesso) | COM_USAR | servidor decide |
| JS_Compras.html:191 | Compras_iniciar_ | menu de Compras | esconde para CLIENTE; o resto pergunta ao servidor | COMPRAS_PEDIR | servidor decide |
| JS_Ponto.html:198 | Ponto_iniciar_ | menu do Assistente do ponto | esconde para CLIENTE; o resto pergunta ao servidor | PONTO_* | servidor decide |
| JS_Licitacoes.html:255 | Licitacoes_iniciar_ | menu de Licitações | esconde para CLIENTE, RH e REPRESENTADA; o resto pergunta ao servidor | LIC_USAR | servidor decide |
| JS_Licitacoes_Disputa.html:195 | LicDp_ehAdmin_ | botão de reconhecer quebra do registro de lances | perfil === "ADMIN" | LIC_ATOS_EXCEPCIONAIS | igual |
| JS_Licitacoes_Contratos.html:314 | tipos de versão do contrato | opção REABERTURA | perfil === "ADMIN" | LIC_ATOS_EXCEPCIONAIS | igual |
| JS_Representacao.html:789 | alertas de pedido | liga a escuta de pedidos novos | não CLIENTE, não AUVO_SYNC, não representada | REP_RECEBER_ALERTAS | servidor filtra (RepAl_podeReceber_) |
| SGO_AutoRel_ConteudoModulo.js:1 | SGO_podeRelatorioInterno_ | botão do relatório interno (dados reconstituídos) | perfil ADMIN \|\| (userId b36756b2… && login bento) | RELATORIO_INTERNO_SIMULADO | diverge: servidor só confere a senha |
| SGO_LavRel_ConteudoModulo.js:1 | SGO_podeRelatorioInterno_ | idem (Lavadora) | ADMIN \|\| bento (ID e login fixos) | RELATORIO_INTERNO_SIMULADO | diverge |
| SGO_CadeiaFrioRel_ConteudoModulo.js:1 | SGO_podeRelatorioInterno_ | idem (Cadeia de frio) | ADMIN \|\| bento (ID e login fixos) | RELATORIO_INTERNO_SIMULADO | diverge |
| SGO_EstufaBanhoRel_ConteudoModulo.js:1 | SGO_podeRelatorioInterno_ | idem (Estufa/Banho-maria) | ADMIN \|\| bento (ID e login fixos) | RELATORIO_INTERNO_SIMULADO | diverge |
| SGO_Auvo_ConteudoModulo.js:1198 | tplAuvo_ehAdmin_ | ferramentas de implantação do Auvo | perfil === "ADMIN" | AUVO_IMPLANTACAO | igual (Auvo_apiDispatch soAdmin) |

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
| 1 | Contas, senhas e acessos | 17 | 45 |
| 2 | Programa de conduta (só travas de acesso) | 10 | 105 |
| 3 | Financeiro | 8 | 19 |
| 4 | Aprovação de relatório técnico | 4 | 75 |
| 5 | Compras | 10 | 45 |
| 6 | Frota: localização e bloqueio | 6 | 42 |
| 7 | Comercial | 14 | 181 |
| 8 | Assistência técnica e Representação | 19 | 141 |
| 9 | Frota (uso e gestão), Caixa de decisões, Assistente do ponto | 22 | 186 |
| 10 | Atividades, avisos, Início e comunicação | 18 | 59 |
| 11 | Cadastros, documentos técnicos, Auvo e qualidade, Licitações, automação predial | 22 | 211 |

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

- GES_CONFIG.gestoresPorArea (Caixa de decisões > Regras e responsáveis) NÃO foi extraído: o cálculo de "hoje" supõe vazio. Se houver responsáveis, eles ganham poderes na Assistência (TECNICA), Comercial (COMERCIAL), Compras (área do pedido), Ponto e Caixa. Extrair antes da migração.
- Lista "Quem pode abrir pedido em nome da representada" (Rep_emNomeCfg_) não extraída: suposta vazia (REP_ABRIR_EM_NOME = NÃO para todos).
- Responsáveis técnicos do modo personalizado (SGO_MP_responsaveis_) não extraídos: ficam fora das caixas (lista + senha própria).
- Assistente do ponto: rhIds da configuração não extraídos (suposto vazio). Elisa já é RH pela área.
- AUT_PERMISSOES vazia em produção (MAPA_PERMISSOES.md 2.3).
- Caixas de e-mail compartilhadas e quem acessa cada uma: não extraídas (o acesso a cada caixa é por pessoa, fora das caixas).
- Conta REPRESENTADA: exigirSessao recusa fora do módulo Representação (SGO_Auth.js:670-672) e o servidor também (servidor.ts:427); por isso "hoje" = NÃO em todos os poderes.
- O inventário foi feito por leitura do código com busca de padrões (chamadas às funções-porteiro, comparações de perfil, listas, IDs fixos e sinalizadores `eu.*`), conferida linha a linha nos módulos sensíveis. Checagens escritas de forma diferente podem ter escapado; o teste de equivalência do lote correspondente pega o que faltar.
- No servidor Node só foram avaliadas as rotas com trava própria (segredos, estado, financeiro, caixas de e-mail e o filtro de representada); o resto repassa ao legado, que é onde as travas estão.
- O RH360 (imagens `metrolabs/rh`) é outro sistema e não faz parte deste levantamento.
- O CSV usa ";" como separador; nos trechos de código, ";" foi trocado por ",".
