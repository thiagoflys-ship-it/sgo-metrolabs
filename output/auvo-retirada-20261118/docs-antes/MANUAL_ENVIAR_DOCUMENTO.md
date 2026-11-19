# Manual: enviar documento ao cliente (e-mail e WhatsApp)

Vale para todo o SGO+ a partir de 20/10/2026. Componente único: `SGO_EnviarDoc.js` (servidor), `JS_EnviarDoc.html` (tela) e `SGO_EnviarDoc_Ajuda.js` (ajuda "Como usar esta tela").

## 1. Para que serve

Todo documento gerado pelo SGO+ pode ser enviado ao cliente por e-mail, por WhatsApp ou pelos dois, com o PDF anexado. O envio é sempre feito por uma pessoa da equipe: o sistema nunca manda documento ao cliente sozinho. Cada envio fica registrado no histórico do documento e do cliente.

## 2. Onde aparece o botão "Enviar"

| Onde | Como |
|---|---|
| Logo depois de gerar qualquer documento | Barra "Documento salvo" no canto da tela, com o botão "Enviar ao cliente" (ou "Enviar", para documento interno). |
| Links de documento salvo nas telas dos módulos ("Abrir PDF", "PDF salvo", "Baixar relatório (PDF)", "Salvo na pasta do cliente") | Botão "Enviar" ao lado do link. |
| Documento aberto em outra aba (faixa verde "Documento salvo na pasta do cliente") | Link "Enviar ao cliente (e-mail ou WhatsApp)": abre a janela na aba do SGO+. |
| Arquivo de documentos | Botão "Enviar" ao lado de "Abrir arquivo", item "Enviar ao cliente" no menu "Mais" de cada documento e botão "Envios de documentos" no topo da tela. |
| Cadastros > Clientes > (cliente) | Aba "Documentos gerados e envios": todos os documentos gravados nas pastas do cliente, com o último envio de cada um e o botão "Enviar". |
| Pasta do cliente no servidor (link "Abrir pasta do cliente") | Link "enviar por e-mail ou WhatsApp" ao lado de cada PDF e HTML. |

Documentos ligados (inventário de 20/10/2026):

| Módulo | Documento | Classe |
|---|---|---|
| Autoclaves | Relatório de ensaio (ciclo e estanqueidade), memória de cálculo do F0, relatório de dados (planilha em PDF), modelo oficial preenchido | cliente |
| Lavadoras | Relatório de ensaio, relatório de dados, modelo oficial preenchido | cliente |
| Cadeia de frio | Relatório de qualificação térmica, relatório de dados | cliente |
| Estufa, banho-maria e secadora | Relatório de qualificação térmica, relatório de dados | cliente |
| Certificado de calibração | Certificado e relatório interpretativo | cliente |
| Relatório de calibração | Relatório de calibração | cliente |
| Laudo NR-13 | Laudo (emitir e reabrir) | cliente |
| Declaração de execução | Declaração e relatório QI/QO/QD | cliente |
| PGT e POP | PGT e POP | cliente |
| Planejamento CME | Planejamento técnico do CME | cliente |
| Cronograma de execução | Cronograma | cliente |
| Registros operacionais | Registro operacional | cliente |
| Inventário de equipamentos | Inventário com análise | cliente |
| Arquivo de documentos | Qualquer arquivo ligado a um cliente | cliente |
| Padrões de referência | Inventário dos padrões, solicitação de orçamento, relatórios gerenciais | interno |
| Frota | Relatório da frota, por veículo, reservas, rastreamento | interno |
| Painel de qualidade, Auvo | Relatórios de gestão e de atendimentos | interno |
| Programa de conduta, Desempenho da gestão | Fechamentos, extratos, relatórios da equipe, avaliação do gestor | bloqueado (dado pessoal) |

## 3. Passo a passo

1. Toque em "Enviar" (ou em "Enviar ao cliente" na barra "Documento salvo").
2. Passo 1, documento e anexos: confira o PDF ("Conferir o documento"). Se quiser, marque "Incluir a cópia em HTML" e "Anexar outros documentos deste cliente" (só aparecem os da pasta do mesmo cliente; no máximo 5).
3. Passo 2, por onde enviar: marque E-mail, WhatsApp ou os dois.
4. Passo 3, para quem: os contatos do cliente do documento já aparecem (cadastro do cliente, responsável das unidades, acessos do cliente ao SGO+ e quem já recebeu documento desse cliente). Os três primeiros vêm marcados. Para outro destinatário, preencha nome, e-mail e/ou celular e toque em "Acrescentar". O campo "Cópia do e-mail (Cc)" é opcional.
5. Passo 4, mensagem: o assunto e os textos já vêm prontos, com o nome do documento, o número, o cliente e o equipamento quando houver. No WhatsApp o texto é o do modelo aprovado pela Meta (fixo, não editável): "{nome}" vira o primeiro nome de cada destinatário (sem nome, o nome do cliente).
6. Toque em "Revisar e enviar" e confira a pré-visualização do e-mail (de, responder para, para, cópia, assunto, anexos e texto) e do WhatsApp.
7. Toque em "Confirmar e enviar". Cada destinatário aparece como "Enviado" ou "Falhou", com o motivo.

## 4. Regras

- **Cliente certo**: o servidor descobre o cliente pelo próprio arquivo (registro do Arquivo de documentos ou pasta do cliente, pelo CNPJ ou pelo nome). O que a tela informa nunca troca esse cliente; se a tela indicar outro, a janela avisa e os contatos continuam sendo os do cliente do arquivo.
- **Documento interno** (sem pasta de cliente): a janela avisa e oferece as pessoas da equipe (o e-mail e o celular saem do cadastro de Usuários e não aparecem na tela) ou o destinatário digitado.
- **Dado pessoal de colaborador** (Programa de conduta, avaliação da gestão, cópias privadas de certificado): não sai por e-mail nem por WhatsApp (LGPD). A janela explica e não envia.
- **Quem envia**: Administrador, Diretoria, Gestor, Técnico, Metrologia, Comercial e Financeiro. O cliente (portal) e o RH não enviam.
- **E-mail**: quando o e-mail integrado do usuário existir (`SGO_Email_enviarComoUsuario_`), sai pela caixa da pessoa; sem ela, sai pela caixa do sistema da Metrolabs com o nome da pessoa e "responder para" o e-mail do cadastro dela. Usuário sem e-mail no cadastro: a janela avisa que a resposta vai para a caixa do sistema. Limite: 20 endereços e 18 MB de anexos por envio.
- **WhatsApp** (28/10/2026): pelo WhatsApp oficial da Metrolabs (Meta). O PDF vai primeiro para a Meta e sai na própria mensagem, no modelo aprovado `sgo_documento_cliente` ("Olá, {nome}. A Metrolabs enviou o documento em anexo: ... Em caso de dúvida, responda esta mensagem ou fale com ..."); nunca vai link público. Mensagem iniciada pela empresa só por modelo aprovado: o texto não é editado (texto livre vai por e-mail). Só PDF: a cópia em HTML vai só por e-mail. É ação de uma pessoa: o envio ao cliente sai mesmo com o piloto do WhatsApp ligado (o servidor libera só este modelo, só do SGO+ e só com o PDF); os avisos automáticos ao cliente continuam retidos pelo piloto. Só celular (DDD + 9 + 8 dígitos); telefone fixo aparece marcado "(sem WhatsApp)". Limite: 8 celulares e 15 MB por arquivo.
- **Horário**: fora do horário comercial (dias úteis, horário de Avisos e horários) a janela mostra o aviso, mas o envio continua liberado; o envio fica marcado "fora do horário comercial" no histórico.
- **Sem envio duplicado**: cada confirmação leva um número de pedido; o mesmo pedido nunca é enviado duas vezes (duplo clique, conexão que repete). O botão fica desabilitado durante o envio.
- **Nada é apagado**: "Tentar de novo" cria um envio novo ligado ao que falhou; o que falhou continua no histórico com o motivo.

## 5. Histórico

Tabela `DOC_ENVIOS`: uma linha por e-mail (todos os endereços juntos) e uma por celular. Campos: quem enviou, quando, documento (arquivo, tipo, título, número, equipamento), cliente, canal, destino, cópia, nome do destinatário, assunto, mensagem, anexos, modo do e-mail (caixa do usuário ou do sistema), situação (ENVIANDO, ENVIADO, FALHOU), motivo, identificação no provedor, "fora do horário" e a tentativa de origem.

Onde consultar: na janela ("Envios anteriores deste documento"), em Cadastros > Clientes > (cliente) > "Documentos gerados e envios" e em Arquivo de documentos > "Envios de documentos" (filtros por cliente e "Com falha").

## 6. Se algo der errado

| O que aconteceu | O que fazer |
|---|---|
| Lista de destinatários vazia | O cadastro do cliente não tem e-mail nem celular. Digite e toque em "Acrescentar"; depois complete o contato em Cadastros > Clientes ou na unidade. |
| WhatsApp desligado na janela | A janela diz o porquê: o WhatsApp oficial (Meta) não está configurado (o responsável grava as chaves em Administração > Chaves e senhas) ou o modelo `sgo_documento_cliente` ainda não foi aprovado pela Meta (o responsável cadastra em Chaves e senhas > "Cadastrar modelos na Meta" e confere em "Situação dos modelos"). Enquanto isso, use o e-mail. |
| "Falhou" com "modelo ainda não está aprovado na Meta" | O modelo do documento não foi aprovado (ou não foi cadastrado). Envie por e-mail e avise o responsável pelo sistema. |
| "Falhou" com "A Meta não aceitou o PDF" | Confira se o arquivo abre e tem menos de 15 MB; gere de novo e toque em "Tentar de novo", ou envie por e-mail. |
| "Este documento não é enviado pelo sistema" | Documento com dado pessoal de colaborador. Entregue pessoalmente ou peça orientação à Diretoria. |
| "A tela indicou outro cliente" | O arquivo está na pasta de outro cliente. Confira o documento antes de enviar. |

## 7. Para quem mantém o sistema

- Chamadas da tela: `EnviarDoc_apiConferir`, `EnviarDoc_apiPreparar`, `EnviarDoc_apiEnviar`, `EnviarDoc_apiTentarDeNovo`, `EnviarDoc_apiHistorico`, `EnviarDoc_apiEnvios`, `EnviarDoc_apiDocumentosDoCliente`.
- A barra "Documento salvo" vem de uma observação passiva das respostas do `google.script.run` (o módulo não precisa mudar): se a resposta traz o link de um arquivo salvo, o servidor confere qual é o documento. Para ligar um botão explícito em qualquer tela: `SGO_EnviarDoc.abrir({ arquivoId | url, htmlId, docDocumentoId, dica: { clienteId, numero, equipamento } })` ou o atributo `data-sgo-enviar="<id ou link>"`.
- Pasta raiz nova de módulo: acrescentar em `ENVDOC_RAIZES` (tipo, classe e frase do e-mail).
- WhatsApp oficial: `EnviarDoc_metaMidia_` (POST `/<PHONE_ID>/media`, multipart montado à mão) e `EnviarDoc_metaDocumento_` (modelo `sgo_documento_cliente`, `NTF_MODELOS_META` em `SGO_Notificar.js`, cabeçalho DOCUMENT). Cadastro do modelo com PDF de exemplo pela Resumable Upload API (`Chaves_metaHandleExemplo_`; `META_WA_APP_ID` opcional). Exceção do piloto no servidor: `sgo_servidor/src/servicos/whatsappPiloto.ts`, regra 4 (`MODELOS_ACAO_HUMANA`). Texto do modelo em `sgo_servidor/docs/MODELOS_WHATSAPP_META.md`.
- Testes: `tests/enviar-documento.test.cjs`.
