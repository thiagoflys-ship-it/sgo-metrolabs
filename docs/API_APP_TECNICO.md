# API do aplicativo do técnico (Assistência técnica do SGO+)

Contrato entre o servidor do SGO+ (equipe da Assistência técnica, arquivos `SGO_Assistencia_*.js`) e o aplicativo do
técnico instalado pelo navegador (outra equipe, arquivos `SGO_Campo_*` e o PWA no `sgo_servidor`). Projeto aprovado:
`docs/PROJETO_ASSISTENCIA_TECNICA_NO_SGO_20261021.md` (seção 3.6). Versão do contrato: **1** (21/10/2026).

Regra de convivência: a equipe da Assistência não edita os arquivos do aplicativo; a equipe do aplicativo não edita os
`SGO_Assistencia_*.js`. Mudança no contrato é combinada neste arquivo (nova seção "Mudanças", com data) antes do código.

## 1. Como chamar

As funções são globais do legado do SGO+, chamadas como as demais telas:

- No servidor próprio: `POST /api/run` com corpo `{ "fn": "<função>", "args": [sessionId, payload] }`. A resposta HTTP é
  `{ "ok": true, "valor": <resultado> }` (ou `{ "ok": false, "erro": "..." }` quando a chamada nem chegou à função).
  Mande o cabeçalho `x-pedido-id` (16 a 64 caracteres `[A-Za-z0-9-]`, um por envio): se a conexão cair antes da
  resposta e o navegador repetir o mesmo pedido, o servidor devolve o resultado da primeira vez.
- No Google (legado): `google.script.run.<função>(sessionId, payload)`.

Login: o mesmo do SGO+ (`login(usuario, senha)` devolve `{ success, sessionId, ... }`). A sessão vale como no sistema
(renova a cada uso). Sessão vencida: o resultado vem com `ok: false, codigo: "SESSAO"`; peça o login de novo **sem
apagar a fila do aparelho**.

Todo `<resultado>` tem `ok` (true/false). Com `ok: false` vem `message` (frase completa para mostrar ao técnico, no padrão
"o que aconteceu, por quê, o que fazer") e `codigo`:

| codigo | Quando | O que o aplicativo faz |
| --- | --- | --- |
| `SESSAO` | sessão inválida ou vencida | pedir login e reenviar a fila |
| `SEM_ACESSO` | perfil sem Assistência (cliente, conta de sistema) | mostrar a mensagem |
| `DESLIGADA` | a Assistência do SGO+ foi desligada pela gestão | mostrar a mensagem; manter a fila no aparelho |
| `ENTRADA` | dado da chamada inválido (falta `pedidoId`, formato errado) | corrigir o envio |
| `ERRO` | falha inesperada no servidor | tentar de novo mais tarde; nada foi gravado pela metade |

Datas: sempre texto `AAAA-MM-DDTHH:mm:ss` no horário de Brasília, ou ISO com fuso (`2026-10-22T09:15:00-03:00`,
`...Z`). O servidor guarda **duas horas** em cada evento: a do aparelho (`em`) e a do recebimento.

Trava: toda função confere a sessão e que a O.S. é do técnico logado (técnico responsável). Gestão (Administrador,
Diretoria, Gestor) pode ler `Ast_appMeuDia` de outro técnico passando `tecnicoId` (só leitura; os envios de campo são
sempre do responsável).

## 2. `Ast_appMeuDia(sessionId, { dia, dias, tecnicoId })`

Tudo o que o técnico precisa para trabalhar sem internet no dia. Chamar com internet ao abrir o aplicativo e sempre que
houver sinal (é leve: só as O.S. do técnico).

- `dia`: `AAAA-MM-DD` (padrão: hoje). `dias`: 1 a 7 (padrão 1; o aplicativo pode baixar a semana para viajar).
- Entram: O.S. agendadas para o período, mais as O.S. do técnico ainda abertas de dias anteriores (em execução,
  pausadas, com documentação pendente), para o técnico terminar.

Resposta:

```json
{
  "ok": true, "versaoContrato": 1, "geradoEm": "2026-10-22T07:40:12", "dia": "2026-10-22", "ate": "2026-10-22",
  "tecnico": { "id": "u_tec", "nome": "Tiago Técnico" },
  "assistenciaLigada": true,
  "regras": { "fotoMaxBytes": 2000000, "fotoRecomendadaBytes": 300000, "localizacaoSo": ["CHEGUEI", "CONCLUI"],
              "motivosSemAssinatura": [{ "codigo": "RESPONSAVEL_AUSENTE", "nome": "Responsável ausente (informar quem recebeu)" }] },
  "os": [{
    "id": "id123", "numero": "OS-2026-0007", "chamadoId": "id120", "chamadoNumero": "CH-2026-0005",
    "situacao": "AGENDADA", "situacaoNome": "Agendada", "ordem": 1,
    "agendadoPara": "2026-10-22T09:00:00", "duracaoMin": 90,
    "prioridade": "P2", "prioridadeNome": "P2 — Alta", "prazoAtendimento": { "ate": "2026-10-23T09:00:00", "estado": "EM_DIA" },
    "tipo": { "codigo": "MANUTENCAO_CORRETIVA", "nome": "Manutenção corretiva",
              "exige": { "relato": true, "assinatura": true, "fotosMin": 2, "qrOuSerie": true, "checklist": true } },
    "sintoma": "Não aquece", "orientacao": "Levar resistência reserva",
    "cliente": { "id": "c1", "nome": "Hospital Exemplo", "cnpj": "00.000.000/0001-00", "telefone": "(62) 3333-0000" },
    "unidade": { "id": "un1", "nome": "Unidade Centro", "endereco": "Rua X, 100", "cidade": "Goiânia", "uf": "GO",
                 "responsavel": "Fulano", "telefone": "62988887777" },
    "enderecoMapa": "https://www.google.com/maps/search/?api=1&query=Rua%20X%2C%20100%2C%20Goi%C3%A2nia%2FGO",
    "contato": { "nome": "Solicitante", "telefone": "..." },
    "equipamento": { "id": "eq1", "tipo": "Autoclave", "modelo": "M1", "serie": "S1", "tag": "AC-01", "setor": "CME", "patrimonio": "" },
    "checklist": { "modeloId": "MOD_PADRAO_TECNICO", "versao": 3, "nome": "Atendimento técnico",
      "perguntas": [
        { "id": "p1", "texto": "Equipamento ligado ao chegar?", "tipo": "SIM_NAO", "obrigatoria": true },
        { "id": "p2", "texto": "Foto da placa de identificação", "tipo": "FOTO", "obrigatoria": true, "fotosMin": 1 },
        { "id": "p3", "texto": "Estado geral", "tipo": "OPCAO", "opcoes": ["Bom", "Regular", "Ruim"], "obrigatoria": false }
      ] },
    "registrado": { "saiuEm": "", "chegouEm": "", "concluiuEm": "", "respostas": { "p1": "SIM" },
                    "fotos": [{ "idLocal": "f-1", "perguntaId": "p2", "nome": "placa.jpg" }],
                    "pecas": [], "relato": {}, "assinatura": null },
    "historicoEquipamento": [{ "data": "2026-09-10", "origem": "AUVO", "numero": "45123", "tipo": "Manutenção Preventiva", "tecnico": "...", "resumo": "..." }],
    "pendencias": ["falta 1 foto", "falta a assinatura do cliente"]
  }]
}
```

Tipos de pergunta (`tipo`): `TEXTO`, `NUMERO`, `SIM_NAO` (valor `SIM`/`NAO`/`NA`), `OPCAO` (um valor de `opcoes`),
`MULTIPLA` (lista de valores de `opcoes`), `DATA` (`AAAA-MM-DD`), `FOTO` (a foto vai por `Ast_appEnviarFoto` com
`perguntaId`), `ASSINATURA` (usa o evento `ASSINATURA`). `obrigatoria: true` entra nas pendências enquanto vazia.

Situações da O.S. (`situacao`): `AGENDADA`, `EM_DESLOCAMENTO`, `NO_LOCAL`, `EM_EXECUCAO`, `PAUSADA`,
`DOC_PENDENTE` (execução concluída, falta documentação), `ENCERRADA`, `CANCELADA`.

## 3. `Ast_appSincronizar(sessionId, { pedidoId, aparelho, eventos })`

Sobe a fila do aparelho. **Idempotente por `idLocal`**: o mesmo `idLocal` aceito uma vez nunca é gravado de novo (volta em
`aceitos` com `duplicado: true`). Um evento recusado **não** consome o `idLocal`: depois de corrigir, o aplicativo pode
reenviar com o mesmo `idLocal` (ou um novo).

- `pedidoId`: texto único do envio (obrigatório; registrado com cada evento).
- `aparelho`: opcional, `{ modelo, sistema, versaoApp }` (só para suporte).
- `eventos`: até 200 por chamada, cada um `{ tipo, osId, em, dados, idLocal }`. O servidor processa na ordem de `em`
  (e, no empate, na ordem da lista). `idLocal`: 8 a 80 caracteres `[A-Za-z0-9_.:-]`, único no aparelho para sempre
  (sugestão: `<id do aparelho>-<contador>` ou UUID).

| tipo | dados | Regras |
| --- | --- | --- |
| `SAIU` (opcional) | `{}` | Saí para o atendimento. Sem localização. |
| `CHEGUEI` | `{ lat, lng, precisao }` (opcionais) | Localização só aqui e no `CONCLUI`. Sem localização vale, e fica a observação. Distância até a unidade, quando a unidade tem coordenadas, fica para a gestão; longe não bloqueia. |
| `RESPOSTA` | `{ perguntaId, valor }` | Valor conforme o tipo da pergunta. A última resposta vale; a anterior fica no histórico. A primeira resposta coloca a O.S. em execução. |
| `FOTO` | `{ fotoIdLocal, perguntaId, legenda }` | Liga ou corrige a legenda/pergunta de uma foto já enviada por `Ast_appEnviarFoto`. Opcional: a foto enviada já conta. Foto ainda não recebida: recusado (não definitivo). |
| `RELATO` | `{ relato, condicaoEncontrada, causa, servicoRealizado, testeFuncional, recomendacoes, serieConfirmada, identificadoPor }` | Campos ausentes não mudam. `identificadoPor`: `QR`, `SERIE` ou `TAG`. Série diferente do cadastro: aceito e marcado como **série divergente** (a gestão é avisada; o cadastro não muda sozinho). |
| `PECA` | `{ descricao, codigo, quantidade, unidade, situacao, urgencia, removerIdLocal }` | `situacao`: `APLICADA` ou `FALTA`. `FALTA` abre pedido em Compras (vínculo ao cliente e à O.S.) e marca a O.S. como aguardando peça. `removerIdLocal`: desfaz uma peça lançada por engano. |
| `ASSINATURA` | `{ nome, documento, imagem }` ou `{ semAssinatura: true, motivo: "RESPONSAVEL_AUSENTE", recebidoPor, justificativa }` | `imagem`: `data:image/png;base64,...` (de 800 a 200.000 caracteres). Sem assinatura só com motivo, nome de quem recebeu e justificativa (10 letras ou mais). |
| `CONCLUI` | `{ lat, lng, precisao }` (opcionais) | Exige `CHEGUEI` antes. Com a documentação completa, a O.S. é **encerrada** e o relatório A4 é gerado; com falta, fica `DOC_PENDENTE` e a resposta diz o que falta. Na O.S. em `DOC_PENDENTE`, o envio que completar a documentação encerra sozinho. |

Resposta:

```json
{
  "ok": true, "pedidoId": "p-20261022-0001", "recebidoEm": "2026-10-22T10:02:11",
  "aceitos": [{ "idLocal": "a1-0001", "tipo": "CHEGUEI", "osId": "id123", "duplicado": false }],
  "recusados": [{ "idLocal": "a1-0002", "tipo": "RESPOSTA", "osId": "id123", "definitivo": false,
                  "motivo": "a pergunta p9 não existe no checklist desta O.S.",
                  "corrigir": "Atualize o Meu dia (puxe para baixo) e responda de novo." }],
  "os": [{ "id": "id123", "numero": "OS-2026-0007", "situacao": "DOC_PENDENTE", "situacaoNome": "Documentação pendente",
           "pendencias": ["falta 1 foto"], "encerrada": false, "relatorioUrl": "" }]
}
```

`definitivo: true` = não adianta reenviar (O.S. de outro técnico, O.S. cancelada ou encerrada, evento de tipo
desconhecido); o aplicativo tira da fila e mostra o motivo. `definitivo: false` = corrigir e reenviar.

## 4. `Ast_appEnviarFoto(sessionId, { osId, idLocal, nome, base64, perguntaId, legenda, em })`

Uma foto por chamada (a foto reduzida no aparelho, cerca de 300 KB; teto `fotoMaxBytes`). `base64` sem o prefixo
`data:` (aceito com o prefixo). Idempotente por `idLocal`: a mesma foto enviada duas vezes fica uma vez só. Formatos:
JPG, PNG, WEBP. A foto fica na pasta do equipamento (ou do cliente) do SGO+, privada (abre só com login).

Resposta: `{ ok, idLocal, duplicado, foto: { id, nome, perguntaId }, os: { id, situacao, pendencias } }`.

Recusa (com `ok: false`, `codigo: "ENTRADA"` e `message`): O.S. de outro técnico, O.S. encerrada ou cancelada, arquivo
vazio, maior que o teto, formato não aceito.

## 5. `Ast_appOS(sessionId, { osId })` (apoio)

Uma O.S. no mesmo formato do item de `os` de `Ast_appMeuDia`, para atualizar a tela depois de sincronizar.

## 5a. Estado do documento e envio ao cliente (22/10/2026, etapa 2)

Cada O.S. do `Ast_appMeuDia`, do `Ast_appOS` e do `os[]` da resposta do `Ast_appSincronizar` traz o campo `envio`
(só acrescentado; sem ele, o aplicativo deduz pelo `relatorioUrl`):

```json
"envio": { "situacao": "PDF_GERADO", "pdfGerado": true, "relatorioUrl": "/arquivos/abc", "geradoEm": "2026-10-22T10:05:00", "revisao": 0,
           "enviadoEm": "", "enviadoPor": "", "enviadoCanal": "", "enviadoPara": "", "podeEnviar": true,
           "contatos": [{ "nome": "Fulano", "email": "fulano@cliente.exemplo", "origem": "Responsável da unidade", "sugerido": true }],
           "texto": "Relatório gerado em 22/10/2026 10:05. Ainda não enviado ao cliente." }
```

`situacao`: `SEM_PDF` (O.S. aberta, ou encerrada com o relatório ainda em geração), `PDF_GERADO` (encerrada, PDF na
pasta, ainda não enviado) ou `ENVIADO` (com `enviadoEm`, `enviadoPor`, `enviadoCanal` = `e-mail`, `enviadoPara`).
`contatos`: contatos do cliente com e-mail (responsável da unidade, solicitante do chamado, cadastro do cliente,
contatos cadastrados), `sugerido: true` nos que o aplicativo marca de saída. `podeEnviar`: o técnico responsável ou a
gestão, com a O.S. encerrada e o PDF gerado.

Evento `ENVIAR_CLIENTE` no `Ast_appSincronizar` (mesma fila, mesmo `idLocal`, idempotente):

| tipo | dados | Regras |
| --- | --- | --- |
| `ENVIAR_CLIENTE` | `{ para: [{ nome, email }] ou [emails], mensagem (opcional), reenviar (opcional) }` | Só com a O.S. `ENCERRADA` e o PDF gerado (antes disso: recusado, não definitivo; "Tentar de novo" em Envios depois do Concluí). O servidor manda o PDF por e-mail pelo Enviar documento (registro em DOC_ENVIOS) e grava na O.S. quando, por quem, canal e para quem. O `idLocal` vira o pedido do Enviar documento: repetido, nada sai de novo. Já enviado e sem `reenviar`: aceito com a nota "já tinha sido enviado". E-mail incompleto (sem `nome@dominio`): recusado, não definitivo, com `corrigir`. Roda fora da trava da Assistência, depois dos outros eventos do lote. |

## 6. Garantias do servidor

- Nada é apagado: resposta corrigida, peça removida e foto trocada ficam no histórico da O.S.
- O.S. encerrada não aceita mais eventos (definitivo), exceto `ENVIAR_CLIENTE`. Correção depois do encerramento é da gestão, na tela ("Abrir para corrigir", com motivo: Rev. 01, 02...).
- O relatório A4 é gerado uma vez só, no encerramento; o `relatorioUrl` não muda sem uma revisão com motivo.
- A hora de cada marco no relatório A4 mostra a do aparelho e a do recebimento quando diferem mais de 5 minutos.
- O técnico em atendimento (entre `CHEGUEI` e `CONCLUI`) aparece para o ponto e para a Frota pela fonte única de
  atendimentos (`SGO_Atendimentos_linhas_`).

## 7. Versão 2 (22/10/2026, etapa 1 do estudo): localizar ou cadastrar cliente, unidade e equipamento e abrir a O.S. em campo

O técnico, fora da agenda, localiza (ou cadastra) o cliente, a unidade e o equipamento e abre a O.S. na hora, inclusive sem
internet. Tudo o que a versão 1 tinha continua igual; o que entrou está abaixo. Nível: técnico (perfil Técnico ou área
Técnica) ou gestão; exige a Assistência ligada (`DESLIGADA` como nas demais).

**Ids provisórios.** Sem internet o aparelho cria cliente, unidade, equipamento e O.S. com ids provisórios: o `idLocal` do
próprio item da fila. Qualquer função da versão 2 (e também `Ast_appSincronizar`, `Ast_appEnviarFoto` e `Ast_appOS`) aceita o id
provisório no lugar do real: `ATEC_SYNC` guarda, na coluna `REF_ID`, o registro que cada `idLocal` criou (ou reconheceu como
existente). A fila do aparelho envia na ordem (cadastros, depois a O.S., depois os eventos) e troca o provisório pelo real nos
itens pendentes assim que o servidor responde.

### 7.1 `Ast_appMeuDia` traz mais

- `versaoContrato: 2`.
- `campo`: `{ podeAbrir, duracaoPadraoMin, limiteBusca: 20, prioridades: [{ codigo, nome }], paradas: [{ codigo, nome }] }`.
  `podeAbrir` é false para quem não é técnico nem gestão.
- `tipos`: tipos de serviço ativos com visita, cada um `{ codigo, nome, grupo, descricao, exige: { relato, assinatura, fotosMin,
  qrOuSerie, checklist, relatoCampos }, checklist: { modeloId, versao, nome, perguntas: [...] } }`, para o aparelho montar a O.S.
  provisória com o checklist certo sem internet.
- Cada O.S. ganha `abertaEmCampo: true|false`.

### 7.2 `Ast_appBuscarCadastro(sessionId, { termo, clienteId, unidadeId })`

Busca no cadastro único, **sempre com limite** (`limite: 20` por lista; `total` diz quantos há). Nunca devolve a base inteira.
Precisa de internet (a tela avisa).

- `{ termo }` (2 letras ou 4 números): `clientes` por nome, razão social ou CNPJ; `unidades` cujo CNPJ bate (filial cadastrada
  como unidade de outro cliente, com `clienteNome`); `equipamentos` por TAG, série ou patrimônio (3 caracteres ou mais), com
  `clienteNome` e `unidadeNome`.
- `{ clienteId }`: `cliente`, `unidades` do cliente e `equipamentos` do cliente; `{ clienteId, unidadeId }`: só da unidade.
  `termo` filtra.
- Formas: cliente `{ id, nome, razaoSocial, nomeFantasia, cnpj, telefone, email, endereco, ativo, criadoEmCampo }`; unidade
  `{ id, clienteId, nome, cnpj, endereco, cidade, uf, responsavel, telefone, enderecoTexto, ativo, criadoEmCampo }`; equipamento
  `{ id, clienteId, unidadeId, tipo, fabricante, modelo, serie, tag, setor, patrimonio, texto, ativo, criadoEmCampo, clienteNome,
  unidadeNome }`. Inativos não entram.
- Erros: `ENTRADA` (termo curto; cliente não encontrado), `SEM_ACESSO` (cliente do portal).

### 7.3 `Ast_appConsultarCnpj(sessionId, { cnpj })`

Consulta pública do CNPJ, a mesma do cadastro de clientes (precisa de internet no servidor). Resposta
`{ cnpj, consultado, jaCadastrado, razaoSocial, nomeFantasia, endereco, cidade, uf, cep, telefone, email, aviso }`.
`jaCadastrado`: `null` ou `{ tipo: CLIENTE|UNIDADE, cliente, unidade, texto }` ("já cadastrado como ..."). Quando a consulta
pública não responde, `consultado: false` e `aviso` dizem para preencher à mão; nunca é erro. CNPJ inválido: `ENTRADA`.

### 7.4 `Ast_appCadastrar(sessionId, { idLocal, tipo, dados, em, aparelho })`

Cadastro feito em campo. `tipo`: `CLIENTE`, `UNIDADE` ou `EQUIPAMENTO`. **Idempotente por `idLocal`** (o mesmo volta com
`duplicado: true` e o mesmo registro). Cria pelas mesmas funções da tela Cadastros (maiúsculas, CNPJ válido, QR do
equipamento) e marca o registro com "criado em campo por <técnico> em <data>" (`ORIGEM_CADASTRO = CAMPO`); a gestão recebe a
pendência "cadastro criado em campo para conferir" e o aviso AT13; nada é bloqueado.

**Nunca duplica.** Antes de criar, o servidor confere e, se já existe, devolve o existente com `existente: true` e
`message: "Já cadastrado como ..."`:

| tipo | `dados` | Duplicidade conferida |
| --- | --- | --- |
| `CLIENTE` | `{ nome*, razaoSocial, cnpj, endereco, contato, telefone, email }` | CNPJ igual a um cliente (ou a uma unidade: devolve o cliente dela e a unidade); nome igual (sem acento e sem caixa) |
| `UNIDADE` | `{ clienteId*, nome*, cnpj, endereco, cidade, uf, responsavel, telefone, lat, lng, precisao }` | CNPJ da unidade igual (mesmo de outro cliente: a O.S. fica com o cliente dela, "vale o original"); nome igual no mesmo cliente. `lat`/`lng` (localização do aparelho) ficam na unidade |
| `EQUIPAMENTO` | `{ clienteId*, unidadeId*, tipo*, fabricante, modelo, serie, tag, setor, patrimonio }` | série igual no mesmo cliente (ignorando pontuação; "N/A", "S/N" não contam); TAG igual no mesmo cliente |

`clienteId` e `unidadeId` podem ser provisórios. Resposta: `{ tipo, id, duplicado, existente, message, cliente, unidades
(CLIENTE), unidade, clienteId (UNIDADE), equipamento, clienteId, unidadeId (EQUIPAMENTO) }`. Erros `ENTRADA`: nome ou tipo curto,
CNPJ inválido, cliente ou unidade não encontrados, quem não é técnico.

### 7.5 `Ast_appAbrirOS(sessionId, { idLocal, clienteId, unidadeId, equipamentoId, tipoCodigo, sintoma, solicitante, contato, prioridade, parada, diagnostico, em, aparelho })`

Abre o chamado (canal PRESENCIAL, `ABERTA_EM_CAMPO`), faz a **triagem em campo** pelo próprio técnico (sintomas confirmados no
local; decisão "visita"), cria a O.S. já no nome dele (AGENDADA para a hora do aparelho, duração padrão) e a atividade
"Atender OS-...", numa trava só; a gestão recebe o AT01 "atendimento aberto em campo" (sem triagem pendente). Prioridade
padrão P3. `tipoCodigo` precisa ser um tipo ativo com visita. Ids podem ser provisórios; vale o cadastro do equipamento
(cliente e unidade dele).

- **Idempotente por `idLocal`**: o mesmo volta `duplicado: true` com a mesma O.S.
- **Mesmo equipamento com O.S. aberta no nome deste técnico**: devolve essa O.S. com `existente: true` ("continue nela");
  nada é aberto em dobro.
- Resposta: `{ duplicado, existente, os (formato do Meu dia), chamado: { id, numero }, message }`.
- Erros `ENTRADA`: tipo inexistente ou sem visita, problema com menos de 10 letras, solicitante vazio, equipamento não
  encontrado, quem não é técnico. `DESLIGADA` com a Assistência desligada.

### 7.6 Fila do aparelho (versão 2)

Itens `CADASTRO` (`dados: { tipo, dados }`) e `NOVA_OS` (`osId` = o próprio `idLocal`, `dados` da O.S.) entram na mesma fila,
na ordem, e sobem um por chamada (como as fotos). `ENTRADA` numa `NOVA_OS` é recusa definitiva e recusa junto os eventos e fotos
que apontavam para ela (com o que fazer). O número do pedido (`X-Pedido-Id`) do item é estável (`N`/`C` + idLocal + rodada +
resumo da sessão).

## Mudanças

- 22/10/2026 (etapa 2 do estudo): campo `envio` nas O.S. do `Ast_appMeuDia`, do `Ast_appOS` e do `os[]` do
  `Ast_appSincronizar`; evento `ENVIAR_CLIENTE` na fila (seção 5a). Só acrescentado; o aplicativo anterior continua valendo.
- 22/10/2026: versão 2 (seção 7): `Ast_appBuscarCadastro`, `Ast_appConsultarCnpj`, `Ast_appCadastrar`, `Ast_appAbrirOS`; ids
  provisórios aceitos; `campo`, `tipos` e `abertaEmCampo` no `Ast_appMeuDia`; itens `CADASTRO` e `NOVA_OS` na fila. Tudo
  acrescentado; o aplicativo da versão 1 continua valendo.
- 21/10/2026: versão 1.
- 21/10/2026 (ensaio integrado com o aplicativo): `tipo.exige.relatoCampos` em cada O.S. do `Ast_appMeuDia`: os campos do
  `RELATO` que o servidor exige para encerrar (`servicoRealizado` = relato ou serviço realizado com 10 letras ou mais;
  `condicaoEncontrada` e `testeFuncional` com 3 ou mais). Campo novo, só acrescentado; o aplicativo antigo continua valendo.

## Minhas atividades (26/10/2026)

- `Ast_appMeuDia` devolve também `atividades` (só do próprio técnico; vazio quando a gestão consulta outro técnico) e `motivosAtraso`. Cada atividade: `{ id, titulo, descricao, prioridade, situacao, prazo, prazoOriginal, atrasada, venceHoje, cliente, modulo, lancadaPor, justificativas, motivoAguardando, versao }`. Fica de fora o atendimento de O.S. (é a própria O.S.).
- Eventos novos no `Ast_appSincronizar` (no lote, `osId` = `"ATV:<id>"`, idempotentes pelo `idLocal`):
  - `ATV_SITUACAO` `{ atividadeId, situacao: "Em andamento"|"Aguardando"|"Concluída", observacao, motivo, versao }`
  - `ATV_JUSTIFICAR` `{ atividadeId, motivo, categoria, novaPrevisao, versao }`
  - `ATV_COMENTAR` `{ atividadeId, texto }`
- Aplicados pela mesma API da tela (Atividades_api*), com a sessão do técnico. Se outra pessoa mudou a atividade depois da `versao` (ATUALIZADO_EM visto no aparelho), situação e justificativa são recusadas em definitivo com o motivo; comentário sempre entra. A resposta traz `atividades` atualizadas quando houve evento de atividade.
