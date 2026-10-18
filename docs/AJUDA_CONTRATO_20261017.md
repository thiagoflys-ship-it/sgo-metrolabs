# Ajuda "Como usar esta tela" — contrato de conteúdo (17/10/2026)

Dono do componente: frente A (painel, servidor, Principal, Cadastros, Administracao).
Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db`.

## 1. Arquivo de cada grupo

Cada grupo cria UM arquivo servidor:

    SGO_Ajuda_<Grupo>.js

com UMA função global (sem IIFE, nome exato):

    function SGO_ajudaTelas_<Grupo>_() { return { ... }; }

Grupos e responsáveis:

| Grupo          | Frente | Arquivo                       | Função                              |
|----------------|--------|-------------------------------|-------------------------------------|
| Principal      | A      | SGO_Ajuda_Principal.js        | SGO_ajudaTelas_Principal_()         |
| Cadastros      | A      | SGO_Ajuda_Cadastros.js        | SGO_ajudaTelas_Cadastros_()         |
| Administracao  | A      | SGO_Ajuda_Administracao.js    | SGO_ajudaTelas_Administracao_()     |
| Qualificacao   | B      | SGO_Ajuda_Qualificacao.js     | SGO_ajudaTelas_Qualificacao_()      |
| Calibracao     | B      | SGO_Ajuda_Calibracao.js       | SGO_ajudaTelas_Calibracao_()        |
| Documentos     | B      | SGO_Ajuda_Documentos.js       | SGO_ajudaTelas_Documentos_()        |
| Planejamento   | B      | SGO_Ajuda_Planejamento.js     | SGO_ajudaTelas_Planejamento_()      |
| Frota          | C      | SGO_Ajuda_Frota.js            | SGO_ajudaTelas_Frota_()             |
| Auvo           | C      | SGO_Ajuda_Auvo.js             | SGO_ajudaTelas_Auvo_()              |
| Qualidade      | C      | SGO_Ajuda_Qualidade.js        | SGO_ajudaTelas_Qualidade_()         |
| Conduta        | C      | SGO_Ajuda_Conduta.js          | SGO_ajudaTelas_Conduta_()           |
| Inventario     | C      | SGO_Ajuda_Inventario.js       | SGO_ajudaTelas_Inventario_()        |

O servidor (`SGO_Ajuda.js`, frente A) chama cada função com `typeof ... === "function"`
antes; grupo que ainda não existe simplesmente não aparece e a tela mostra
"Ajuda desta tela em preparação". Não é preciso cadastrar nada em include():
são arquivos .js de servidor. Não edite os arquivos dos outros grupos.

## 2. Formato devolvido

```js
function SGO_ajudaTelas_Frota_() {
  return {
    "frota": {
      titulo: "Frota",                       // nome da tela como aparece no menu
      paraQueServe: "Texto curto, 1 a 3 frases.",
      antesDeComecar: ["Item.", "Item."],    // o que a pessoa precisa ter/saber antes
      passos: [                               // tarefas; cada uma com passos numerados
        { titulo: "Retirar um veículo", itens: ["Toque em \"Frota\" no menu.", "Toque no veículo."] }
      ],
      cores: [ { nome: "Selo verde \"Disponível\"", significado: "O veículo pode ser retirado." } ],
      problemas: [ { situacao: "Aparece \"Sem sinal\"", oQueFazer: "Espere a foto subir; ..." } ],
      quemPode: [ { perfil: "TECNICO", pode: "Retirar e devolver o próprio veículo." } ],
      perguntas: [ { p: "Pergunta?", r: "Resposta." } ],
      secoesManual: [ { titulo: "Opcional", paragrafos: ["Só aparece no manual A4."] } ] // opcional
    },
    "frota/multas": { ... }                   // sub-tela ou aba: "<chave>/<aba>"
  };
}
```

Regras do formato:
- Todos os campos são opcionais, menos `titulo`. Campo vazio não aparece no painel.
- Texto puro (sem HTML). O painel escapa tudo. Use aspas duplas escapadas para nome de botão: `\"Salvar\"`.
- `quemPode[].perfil`: use o código do perfil — `ADMIN`, `DIRETORIA`, `GESTOR`, `TECNICO`,
  `METROLOGIA`, `COMERCIAL`, `FINANCEIRO`, `CLIENTE` — ou vários separados por vírgula
  (`"ADMIN,GESTOR,DIRETORIA"`), ou `TODOS`. O painel destaca a linha do perfil de quem está vendo
  ("Você") e mostra as demais logo abaixo; o perfil CLIENTE só vê a própria linha e `TODOS`.
- `secoesManual` (opcional) só entra no manual completo A4.

## 3. Linguagem (pedido do dono)

- Frases curtas, verbo no imperativo ("Toque em", "Escolha", "Confira").
- Um passo por item, sem juntar duas ações.
- Nome do botão exatamente como aparece na tela, entre aspas. Não invente botão: leia a tela.
- Explique cada cor e cada selo. Antecipe os erros comuns e diga o que fazer.
- Diga quem pode fazer o quê (perfil).
- Sem jargão técnico, sem emoji, sem inglês, sem frase motivacional. Tom profissional.
- Proibido escrever em arquivo a palavra que começa com "bur" e termina com "ro" e variações.
- "Toque" serve para celular e computador ("toque ou clique" só se precisar).

## 4. Chaves de tela (iguais a `data-mod` do menu em Index.html e a `abrir(mod)` em JS_Core.html)

| Chave                    | Tela (menu)                          | Grupo         |
|--------------------------|--------------------------------------|---------------|
| dashboard                | Início (computador)                  | Principal     |
| mobile_home              | Início do celular                    | Principal     |
| busca                    | Busca do menu ("Buscar")             | Principal     |
| minhas_atividades        | Minhas atividades                    | Principal     |
| atividades_equipe        | Atividades da equipe                 | Principal     |
| avisos                   | Avisos                               | Principal     |
| autoclave                | Autoclaves                           | Qualificacao  |
| lavadora                 | Lavadoras                            | Qualificacao  |
| cadeia_frio              | Cadeia de frio                       | Qualificacao  |
| estufa_banhomaria        | Estufa, banho-maria e secadora       | Qualificacao  |
| declaracao_qiqo          | Relatório QI/QO/QD                   | Qualificacao  |
| nr13                     | Laudo NR-13                          | Qualificacao  |
| certificado_calibracao   | Certificado de calibração            | Calibracao    |
| relatorio_calibracao     | Relatório de calibração              | Calibracao    |
| padroes                  | Padrões de referência                | Calibracao    |
| declaracao_exec          | Declaração de execução               | Documentos    |
| pgt_pop                  | PGT e POP                            | Documentos    |
| reg_op                   | Registros operacionais               | Documentos    |
| planejamento_cme         | Planejamento CME                     | Planejamento  |
| cronograma_execucao      | Cronograma de execução               | Planejamento  |
| auvo                     | Integração Auvo                      | Auvo          |
| frota                    | Frota                                | Frota         |
| qualidade                | Painel de qualidade                  | Qualidade     |
| conduta                  | Programa de conduta                  | Conduta       |
| inventario               | Inventário de equipamentos           | Inventario    |
| clientes                 | Clientes                             | Cadastros     |
| unidades                 | Unidades                             | Cadastros     |
| equipamentos             | Equipamentos                         | Cadastros     |
| vinculos                 | Vínculos                             | Cadastros     |
| documentos               | Arquivo de documentos                | Cadastros     |
| usuarios                 | Usuários                             | Administracao |
| admin                    | Configurações                        | Administracao |
| chaves                   | Chaves e senhas                      | Administracao |

Sub-telas e abas: `"<chave>/<aba>"`, com a aba em minúsculas, sem acento, palavras com `_`
(ex.: `"frota/multas"`, `"padroes/inventario_orcamento"`). Hoje o painel abre a chave da tela
inteira; as sub-chaves aparecem como seções extras ("Nesta tela também") no painel e no manual.

## 5. Manual completo do módulo

`SGO_Ajuda_apiManual(sessionId, modulo)` monta o A4 (padrão SGO_DocA4, com sumário) com a chave
`modulo` e todas as `"<modulo>/..."`, na ordem em que aparecem no objeto. O painel tem o botão
"Manual completo do módulo" (abre este A4). Os botões antigos "Manual do operador" dos módulos
continuam como estão (abrem o manual que já existe na tela); o painel de ajuda também oferece
"Manual do operador (desta tela)" quando a tela tiver esse botão.

## 6. Como conferir o seu grupo

Abra a tela no SGO+ e toque em "Como usar esta tela" (cabeçalho no computador, barra do topo no
celular). Se aparecer "Ajuda desta tela em preparação", a chave não bate ou a função não existe.
