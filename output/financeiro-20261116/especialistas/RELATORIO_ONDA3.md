# Relatório — Onda 3 do Financeiro (16/11/2026)

Base: `output/financeiro-20261116/cand6` (produção atual, com a onda 2). Nada foi publicado. Não houve acesso à produção, ao banco nem ao Omie, Caju ou Gemini reais, e nenhum commit. Um relatório por bloco.

---

## Bloco A — "No começo somente eu e o Charles aprovam" (todas as aprovações financeiras)

### Configuração

`APROVACAO_SO_DIRETORIA` em Administração > Chaves e senhas > **Regras do Financeiro** (`SGO_Chaves.js`).
- Opções Sim e Não.
- Vazio ou Sim = só o dono do sistema e a Diretoria aprovam. É o padrão: a decisão do dono vale sem ninguém gravar nada.
- Não = voltam as regras de antes de cada módulo.
- A validação aceita "nao", "Não" e "sim".

Funções comuns (`SGO_Utilis.js`, CRLF mantido):
- `SGO_aprovacaoSoDiretoria_()`.
- `SGO_ehDonoOuDiretoria_(u)`: dono por `Chaves_ehDonoUsuario_`, ou perfil/área DIRETORIA.
- `SGO_MSG_SO_DIRETORIA_APROVA`: o texto da recusa.

A aba Regras do Financeiro mostra em "Configurações em vigor" a linha "Quem aprova".

### Compras (`SGO_Compras_Config.js`, `SGO_Compras_Cotacoes.js`)

Funções novas: `Cmp_soDiretoria_()`, `Cmp_ehDonoOuDiretoria_()` e `Cmp_donoDiretoria_(us, excluir)`.

Com SIM:
- **`CmpC_rota_`:** em qualquer faixa, a rota é "Dono e Diretoria (decisão do dono)".
  - Ficam de fora quem pediu e quem cotou. Se isso esvaziar a lista, fica de fora só quem pediu.
  - A rota vai com `soDiretoria` para a Caixa de decisões.
  - As compras que já aguardavam o gestor passam a aparecer para o dono e a Diretoria, porque a rota é calculada na hora.
- **`CmpC_podeAprovar_`:** as caixas COMPRAS_APROVAR_* e as faixas não valem. Aprova quem está na rota.
  - A recusa diz: "Você não aprova esta compra: por decisão do dono, no começo só o dono do sistema e a Diretoria aprovam (…). Quem aprova: …; a compra está na Caixa de decisões deles."
  - "Quem pediu não aprova a própria compra" continua: se o pedido for de um diretor, aprova o outro.
- **`CmpC_escolher_`:** a aprovação automática do comprador na faixa dele não acontece. A compra fica "Aguardando aprovação".
- **Pendência de aprovação:** público DIRETORIA, então o gestor e o comprador não a recebem. O "o que fazer" ganha a frase da decisão do dono.

As faixas em R$, as listas de compradores e as caixas não foram apagadas. Com NAO, tudo volta a ser como antes.

### Depósito de viagem (`SGO_Viagem.js`)

Funções novas: `Via_soDiretoria_()`, `Via_ehDonoOuDiretoria_()` e `Via_aprovadoresSoDir_(impedidos)`.

Com SIM:
- **Conferência:** não chama a gerência. Vai direto a "Aguardando a Diretoria", com o motivo "por decisão do dono…". Os aprovadores são o dono e a Diretoria, menos quem pede e quem viaja.
- **`Via_acoes_`:** decide quem é dono ou Diretoria e não pediu nem viaja. A recusa diz: "Você não aprova esta solicitação: por decisão do dono, no começo só o dono e a Diretoria aprovam (…). Ela está com o dono e a Diretoria; acompanhe por aqui."
- **`Via_decidir_`:** uma etapa só. Aprovar leva direto a APROVADA, mesmo com EXIGE_DIRETORIA, e a etapa gravada é DIRETORIA.
- **Pendências:** o que estava "aguardando a gerência" vira item `viagem_diretoria` para o dono e a Diretoria.
- **Separação de funções mantida:** quem pede ou viaja não aprova, e quem aprova não registra a carga.

A lista de aprovadores da política fica guardada. Com NAO, o Matheus aprova como antes.

### Alçada do Omie (`SGO_Omie_Regras.js`)

`OmieRegras_podeAprovar_` segue a mesma configuração.
- Com SIM: só o dono e a Diretoria, como na onda 2.
- Com NAO: qualquer outra pessoa da lista de sigilo, a regra anterior.

### Ajuda e manuais

- `SGO_Ajuda_Compras.js` (CRLF): item novo no passo "Aprovar ou reprovar" e problema novo com a recusa.
- `SGO_Ajuda_DepositoViagem.js`: item novo em "Enviar para aprovação".
- `docs/MANUAL_MODULO_COMPRAS.md`: parágrafo da decisão do dono em "Escolha e aprovação por valor".
- `docs/MANUAL_DEPOSITO_VIAGEM.md`: parágrafo na seção 9.
- `docs/MANUAL_PAINEL_FINANCEIRO.md`: linha nova na tabela da seção 8c.

### Testes

`tests/financeiro-onda3-a.test.cjs` (novo): **7 passam, 0 falham**. Cobre:
- **A configuração:** padrão Sim e validação.
- **Compras com SIM:**
  - a faixa do comprador não é aprovada na escolha;
  - comprador, substituto, gestores e Financeiro são recusados com a mensagem;
  - a pendência e a Caixa vão só para a Diretoria;
  - a Diretoria aprova;
  - o pedido da Diretoria é aprovado pelo outro diretor;
  - a compra que aguardava o gestor passa à Diretoria;
  - as caixas marcadas não valem;
  - com NAO, volta ao gestor e a faixa do comprador volta a ser aprovada na escolha.
- **Viagem com SIM:**
  - uma etapa só, direto à Diretoria;
  - o Matheus e a Wanessa são recusados;
  - a Diretoria que viaja não aprova;
  - o que aguardava a gerência passa à Diretoria;
  - com NAO, o Matheus aprova.
- **Omie:** com NAO, o Financeiro volta a aprovar.

**Ambientes de teste ajustados de propósito:**
- Os antigos rodam com as regras de antes (`APROVACAO_SO_DIRETORIA: 'NAO'`), e isso prova que com NAO nada mudou: `_compras_ambiente.cjs`, `_poderes_ambiente.cjs`, `_viagem_ambiente.cjs` e `_assistencia_ambiente.cjs`.
- `_financeiro_simulado.cjs` roda com o padrão de produção (SIM).
- Resultados: compras 17/0, poderes-lote5 5/0, deposito-viagem 21/1 (a mesma falha antiga), deposito-viagem-prestacao 13/0, conciliacao-caju 14/0, assistencia-compras-retorno 6/0.

Não há página nova neste bloco; as telas de Compras e da viagem só mostram as mensagens do servidor.

**Suíte completa** (`output/financeiro-20261116/suite-onda3-a.txt`): **244 arquivos, pass 2252 / fail 71**, com 27 arquivos de saída diferente de zero. Referência `suite-onda2.txt`: 2245 / 71.

Comparação arquivo a arquivo: **nenhum arquivo piorou**. A única diferença é o arquivo novo `financeiro-onda3-a` (+7).

### Arquivos do bloco A

**cand6:**
- `SGO_Utilis.js` (CRLF)
- `SGO_Chaves.js`
- `SGO_Compras_Config.js`
- `SGO_Compras_Cotacoes.js`
- `SGO_Viagem.js`
- `SGO_Omie_Regras.js`
- `JS_Omie_Regras.html`
- `SGO_Ajuda_Compras.js` (CRLF)
- `SGO_Ajuda_DepositoViagem.js`

**tests/:**
- `financeiro-onda3-a.test.cjs` (novo)
- `_compras_ambiente.cjs`
- `_poderes_ambiente.cjs`
- `_viagem_ambiente.cjs`
- `_assistencia_ambiente.cjs`
- `_financeiro_simulado.cjs`

**docs/:** `MANUAL_MODULO_COMPRAS.md`, `MANUAL_DEPOSITO_VIAGEM.md`, `MANUAL_PAINEL_FINANCEIRO.md`.
