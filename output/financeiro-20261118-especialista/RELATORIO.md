# Relatório — Especialista financeiro por IA no Painel financeiro (etapas E10 e E11, 18/11/2026)

Base: `output/financeiro-20261116/cand22`. Antes da mudança, era idêntica à `cand21` (produção atual, `diff -rq` vazio). Especificação:
`output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md`, seção 2 inteira, linhas E10 e E11 da seção 6 e itens 3 a 6 da seção 7.

Nada foi publicado e não houve commit. Não houve acesso à produção, ao banco nem ao `/opt/metrolabs/sgo/cofre`. Gemini, Omie e Caju reais não
foram chamados, e não saiu nenhum e-mail real: nos testes, o Omie e a IA são simulados (`tests/_financeiro_bloco_b.cjs`). O servidor Node, a
Frota/rastreador, o chat do RH360, os PGT/POP gerados e o Portal do cliente não foram tocados.

## 1. O que foi feito

### Aba "Especialista financeiro" (só para a lista de sigilo)

- **Onde fica.** Aba nova no Painel financeiro e botão fixo "Perguntar ao especialista" no canto superior do Painel, visível em todas as abas.
- **Trava.** `Omie_exigirAcesso_` roda antes de tudo. Quem está fora da lista é recusado antes de qualquer busca ou chamada à IA, e a recusa fica
  como NEGADO em `FIN_OMIE_ACESSOS` (consulta "Especialista financeiro").
- **Três modos.** "Automático" escolhe pela pergunta (`FinEsp_modo_`); a pessoa pode forçar o modo.

| Modo | Fonte | Dado da empresa à IA |
|---|---|---|
| Como fazer no sistema (E10) | Ajuda das telas e manuais do Financeiro (`FinIa_base_`, com o núcleo `ASN_indexar_`/`ASN_buscar_`/`ASN_conferir_`) | Nenhum |
| Regra financeira (E10) | Base de regras `FIN_BASE_REGRAS`, mais conhecimento geral; cita a regra usada e avisa quando é assunto do contador ou do jurídico | Nenhum |
| Analisar a situação (E11) | Fotografia do dia, pseudonimizada | O mínimo, em códigos |

- **Sem a chave da IA.** O código funciona igual: "Como fazer" mostra os trechos do manual, "Regra" mostra a regra mais próxima e a análise
  mostra o texto padrão do sistema (`FinRel_padrao_`). A faixa no topo da aba explica o que está ligado.
- **Tela.**
  - conversa só na memória da página (some ao sair, ao trocar de conta e quando o sigilo oculta os dados);
  - três sugestões rápidas;
  - fontes, "Texto de apoio; confira os números nos quadros do Painel", "Resolveu" e "Não resolveu";
  - cartões de proposta editáveis;
  - botões "Abrir <aba>" já filtrados (Régua de cobrança no cliente, Ficha do cliente);
  - "Base de regras financeiras" no fim da aba.

### Dados ao provedor (análise)

O contexto reaproveita `FinIa_contexto_` e `FinRel_dados_` do relatório semanal, sem duplicar código, e acrescenta três blocos:
- os 15 maiores títulos vencidos (T01..T15, com cliente em código, saldo em reais inteiros, dias de atraso e etapa da régua; sem número de
  documento);
- os responsáveis possíveis, em código ("Responsável 3 (Financeiro)");
- as abas que podem ser abertas.

Na pergunta:
- os nomes de clientes viram códigos;
- os nomes de colegas viram `[colaborador]`;
- o documento conhecido vira T;
- CNPJ, CPF e e-mail passam pela máscara `ASN_mascarar_`.

Outros cuidados:
- o que vem do Omie fica entre `<<<DADOS … DADOS>>>`, com a instrução de ignorar ordens escritas lá dentro;
- a chave vai só no cabeçalho;
- o exemplo exato do envio está em `exemplo-envio-ia.json`.

### Conferência de números

- **Contra o quê.** Toda resposta (análise, regra e "como fazer" com IA) é conferida frase a frase contra o que foi enviado.
- **Como.** Usa `FinRel_conferirNumeros_` (reaproveitada) e mais uma conferência própria, `FinEsp_numerosOk_`, para valores pequenos em R$ e %
  (ex.: "2 %"), que a do relatório deixa passar.
- **Nomes.** Na análise, a frase com nome que não veio dos dados também sai (`FinRel_nomesEstranhos_`).
- **O que a tela mostra.** A frase retirada some e a tela avisa "Foram retirados N trecho(s)". Se nada sobrar, entra o texto padrão.
- **Nomes reais.** Os códigos só viram nomes reais depois da conferência, e só na tela.

### Propostas e atividades (E11)

- **Esquema fixo.** A IA responde num esquema fixo (`responseSchema`), com até 3 propostas.
- **O que o servidor recusa:**
  - responsável fora da lista de sigilo;
  - prazo fora de 1 a 30 dias úteis;
  - aba inexistente;
  - número ou nome fora dos dados.

  A tela diz quantas propostas foram descartadas e por quê.
- **Prazo.** Conta N dias úteis pelo calendário do expediente (feriados cadastrados incluídos) e termina no fim do expediente.
- **Prioridade.** Sobe para Alta quando o atraso passa de 60 dias ou o título está entre os 3 maiores vencidos. Nunca desce.
- **Validade.** A proposta fica 30 minutos no servidor (`FIN_IA_PROP_<id>`).
- **Criação.** `FinIa_apiCriarAtividade` exige uma proposta válida, não expirada, da própria pessoa, e o responsável na lista de sigilo. Ela chama
  `Atividades_apiCriar` com `modulo: 'financeiro'` e `restrita: true`, com o 5W2H preenchido. Uma proposta não cria duas atividades.

### Registro de uso e guarda

- **Tabela `FIN_IA_USO`** (colunas da especificação). A resposta é guardada com os códigos, nunca reidratada.
- **`FIN_OMIE_ACESSOS`.** Recebe "PERGUNTA", "ATIVIDADE" e "REGRAS_ALTERADAS", sem valores.
- **Limites.** 30 perguntas por hora e 15 análises com dados por dia, por pessoa.
- **Leitura.** A Diretoria lê o registro em Sigilo e acessos (últimos 100 usos).
- **Guarda.** 12 meses (decisão do dono), configurável na chave nova `FIN_IA_USO_GUARDA_MESES` (1 a 60). A limpeza `FinIa_limparUso_` roda uma
  vez por dia em `Ges_rodada_`: apaga só a pergunta e a resposta e mantém as demais colunas (atualização campo a campo).

### Base de regras (`SGO_Financeiro_BaseRegras.js`)

- **Conteúdo.** 10 regras em texto padrão profissional:
  - regimes de caixa e competência;
  - juros, multa e desconto na baixa;
  - retenções;
  - conciliação;
  - política de cobrança;
  - previsão, provisão e saldo mínimo;
  - inadimplência e prazo médio;
  - aprovação e separação de funções;
  - prestação de contas;
  - notas recebidas.
- **Marcação.** O texto fica marcado "revisar com a contabilidade" até uma versão revisada. As regras de imposto e de cobrança judicial levam
  "confirmar com o contador" ou "com o jurídico".
- **Versões.** A tabela `FIN_BASE_REGRAS` guarda cada versão, com motivo; nada é sobrescrito.
- **Quem altera.** Só o dono do sistema e a Diretoria (`OmieSig_ehDiretoria_`). A lista de sigilo lê.

### E10: assistente geral

- **Já estava fechado.** Conferido pelo teste: para quem está fora da lista (níveis geral e Diretoria fora da lista), a base do "Tire sua dúvida"
  não tem nenhum trecho da ajuda nem dos manuais do Financeiro (Painel, Conciliação Caju, Compras financeiro, gestão da Recarga Caju). Não foi
  preciso mudar o código do assistente geral.
- **Lista de sigilo.** Continua com o manual do Painel (decisão de 17/11), agora com a seção 8j.
- **Base regenerada.** `SGO_AssistenteManuais.js` foi regenerado; só o manual do Painel mudou (74 para 82 seções).

## 2. Arquivos (relativos à cand22)

**Novos:**
- `SGO_Financeiro_Especialista.js`
- `SGO_Financeiro_BaseRegras.js`
- `JS_Financeiro_Especialista.html`

**Alterados** (fim de linha conferido arquivo a arquivo, igual ao original):
- `Index.html` (LF): include da tela.
- `JS_Omie_Gestao.html` (CRLF):
  - aba e rota;
  - botão "Perguntar ao especialista";
  - uso do especialista e rótulos novos em Sigilo e acessos.
- `JS_Omie_Ajuda.html` (CRLF): `OMIE_GUIAS.especialista` e 14 `OMIE_DICAS` `finIa*`.
- `SGO_Ajuda_Financeiro.js` (misto; a linha 37 continua só LF): passo "Especialista financeiro" e 4 problemas.
- `SGO_AssistenteManuais.js` (gerado por `_tools/gerar_base_assistente.cjs --docs docs --saida …`).
- `SGO_AssistenteErros.js`: `JS_Financeiro_Especialista` → `omie`.
- `SGO_Chaves.js`: `FIN_IA_USO_GUARDA_MESES` com validação; ajuda de `FIN_IA_AUTORIZADA`.
- `SGO_Gestao_Escada.js`: `FinIa_limparUso_` na rodada; sem cron novo.
- `SGO_Omie_Sigilo.js`: nomes `FinIa_api` e `FinIa_apiCriarAtividade`; `usoIa` para a Diretoria em `Omie_apiSigilo`.

**Fora da cand22:**
- `docs/MANUAL_PAINEL_FINANCEIRO.md` (misto, preservado):
  - aba na tabela;
  - seção nova 8j;
  - parágrafo da 8d;
  - 4 problemas;
  - seções 10 e 11 com o texto igual ao da tela.
- `tests/financeiro-especialista.test.cjs` (novo).
- `tests/_financeiro_bloco_b.cjs`: `FinIa_api` liberado no ensaio da página.
- `tests/financeiro-omie-20261114.test.cjs`: ajustado de propósito, de 22 para 23 abas.

Diff completo: `legado-especialista.patch` (cand21 → cand22).

## 3. Testes

**`financeiro-especialista` — 12 passam, 0 falham.**

| Teste | O que prova |
|---|---|
| 2.8-1 | Conta fora da lista é recusada nas 6 ações, com zero chamada à IA, zero registro de uso e NEGADO registrado |
| E10 | Bases do assistente geral sem o Financeiro; a lista de sigilo com a 8j; o RH não recebe trecho do Financeiro; a base do especialista é só do Financeiro |
| 2.8-2 | Com Não, ou sem a chave: texto padrão e nenhuma chamada à IA. "Como fazer" e "Regra" funcionam sem a chave. "Como fazer" com IA não leva dado da empresa |
| 2.8-3 | Varredura do envio: sem nomes, CNPJ, CPF, e-mail, documentos, colaboradores nem a chave; pergunta pseudonimizada; registro com códigos; exemplo gravado |
| 2.8-4 | Número e nome inventados são retirados com aviso; tudo inventado vira o texto padrão; "2 %" fora da base sai da resposta de regra; regra inexistente é descartada; aviso do contador |
| 2.8-5 | Responsável fora da lista ("Responsável 9" ou nome de técnico) recusado; aba inexistente removida; prazo de 45 dias recusado; reidratação; prioridade Alta; feriado no prazo |
| 2.8-6 | Sem proposta, proposta inexistente, de outra pessoa, responsável fora da lista, reuso e mais de 30 minutos: nada é criado. Com a confirmação: `MODULO financeiro`, `RESTRITA SIM`, 5W2H, registro da atividade |
| 2.8-7 | RH, gestores e técnico não veem a atividade criada (lista e detalhe); a lista de sigilo vê |
| 2.8-8 | Lista estática de funções proibidas nos dois arquivos novos; um único `Atividades_apiCriar`, dentro da criação confirmada; só grava em `FIN_IA_USO` |
| 2.8-9 | Instrução escondida no nome de categoria fica dentro de `<<<DADOS`; a frase que obedece e lista CNPJ é retirada; o pedido de CNPJ ou de "ignore as regras" é recusado sem chamar a IA |
| Extras | Modo automático; limites de 15 por dia e 30 por hora; avaliação só da própria pessoa; Sigilo e acessos só para a Diretoria; guarda de 12 meses; chave nova; base de regras com versões e quem altera |
| Tela | 1366 e 390 px: guia e explicações; resposta; proposta; atividade criada pela tela; avaliação; base de regras; sem chave; a conversa some com o sigilo; sem rolagem lateral nem erro de JS |

**Regressão** (`rodar-lista.sh`), todas sem falha:

| Arquivo | Passam | Falham |
|---|---|---|
| financeiro-omie-20261114 | 25 | 0 |
| financeiro-relatorio-semanal | 8 | 0 |
| financeiro-cobranca-agenda | 7 | 0 |
| financeiro-onda2-e1e5 | 12 | 0 |
| assistente-duvidas | 12 | 0 |
| assistente-manuais-acesso-20261117 | 6 | 0 |
| assistente-ia-eficaz-20261117 | 12 | 0 |

**Suíte completa:** ver a seção 7.

**Capturas (`capturas/`):**
- `1366-` e `390-especialista-resposta.png`
- `1366-` e `390-especialista-atividade-regras.png`
- `1366-especialista-sem-chave.png`

## 4. Decisões adotadas (do dono, sem perguntar)

- **Gemini pago**, com a mesma chave. `FIN_IA_AUTORIZADA` vazio = Sim, como no bloco B.

  Por isso, o teste 2.8-2 da especificação ("vazio = texto padrão") foi aplicado com o valor Não e com a falta da chave.
- **Só a lista de sigilo usa.** A IA não grava no Omie e não aprova nada.
- **Atividade sugerida para quem está fora da lista: não.** É recusada pelo especialista e também por `Atividades_apiCriar`.
- **Guarda de 12 meses**, configurável.
- **Base de regras:** texto padrão marcado "revisar com a contabilidade", configurável com versões; a IA cita a regra e avisa do contador.
- **Número que não bate** é removido e a tela avisa.

Escolhas técnicas:
- **Valor alto.** Sem valor dado pelo dono, "valor alto" = estar entre os 3 maiores vencidos da fotografia.
- **Responsáveis em código** no envio ("Responsável N"), para nenhum nome de colaborador sair.
- **Sem caixa nova.** Vale a `FIN_OMIE_CONSULTAR`.
- **Sem pedido à IA para "abrir tela".** A abertura é feita pela tela, com filtro, sem executar nada.

## 5. O que ficou para depois (exige dado real ou decisão)

- **Texto da base de regras:** passar pela Wanessa e pelo contador e gravar a versão marcada "revisado com a contabilidade".
- **Faturamento ativo da chave do Gemini:** conferir no Google Cloud (item da seção 8 da especificação).
- **Qualidade real das respostas do Gemini** (texto e propostas): só no piloto com dados reais. Os testes usam respostas simuladas. Acompanhar no
  registro de uso as respostas com "trechos retirados".
- **Atalho "Criar atividade" na Régua de cobrança** (pendente do bloco B): não foi feito. O especialista cobre a criação a partir da análise.

## 6. Riscos a conferir antes de publicar

1. **E-mail da atividade.** `Atividades_apiCriar` avisa o responsável por e-mail quando a atividade é para outra pessoa. O título pode ter o
   nome do cliente; o destinatário é sempre da lista de sigilo. É o mesmo comportamento das atividades do Financeiro lançadas à mão desde a E1.
2. **IA ligada por padrão.** A primeira análise com IA já envia a fotografia pseudonimizada ao Gemini.
3. **Conferência estrita.** Uma resposta correta que arredonda ou combina números de outro jeito perde a frase. A tela avisa, e a parte restante
   ou o texto padrão continuam valendo.
4. **Nomes de clientes na pergunta.** São trocados pelos nomes que a fotografia conhece (memória do servidor de 6 horas). Depois de reiniciar o
   servidor sem nova fotografia, um nome de cliente digitado na pergunta pode não ser trocado. A máscara de CNPJ, CPF, e-mail e telefone vale
   sempre.
5. **Tabelas novas.** `FIN_IA_USO` e `FIN_BASE_REGRAS` são criadas no primeiro uso (`CertCal_garantirTabela_`).

## 7. Suíte completa

Resultado em `suite.txt`.

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 266 | 2541 | 0 | 0 |
| Referência | — | 2529 | 0 | — |

A diferença são os 12 testes do arquivo novo `financeiro-especialista`.

O teste ajustado de propósito (`financeiro-omie-20261114`, 23 abas) passa com 25 de 25. Os três `assistente-*` passam: 12, 6 e 12.
