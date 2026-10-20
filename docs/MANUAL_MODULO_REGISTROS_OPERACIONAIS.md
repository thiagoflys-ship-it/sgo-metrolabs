# Manual do Operador — Módulo Registros Operacionais

## O que mudou em 18/10/2026 (documento A4)

- O registro sai com título normal (sem caixa alta), ficha com a data e o número, seções numeradas (os campos sem seção ficam em "Informações gerais"), tabelas que repetem o cabeçalho "Item | Registro" em cada página, texto longo em linha inteira e assinaturas com nome, cargo e papel.
- Arquivo salvo na pasta do cliente (CNPJ), PDF e cópia A4, com o nome "Registro operacional - REG-XXXXXXXX - <tipo> - aaaa-mm-dd hhmm".

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Para criar um tipo novo, escolha "+ Criar novo tipo de documento" na lista da etapa 2 e, no fim, clique em "Salvar tipo de documento".


### Preenchimento e controle de documentos operacionais (rondas, checklists, formulários, treinamentos)

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema**. Leia na ordem, de cima para baixo, seguindo a tela também de cima para baixo. Se aparecer uma palavra técnica desconhecida, vá direto ao **Glossário** (seção 10).

---

## 1. O que este sistema faz, em uma frase

Você registra a execução de qualquer documento operacional do hospital (ronda, checklist, formulário, treinamento, etc.) — o sistema guarda tudo organizado por hospital e por tipo de documento, e avisa quando algum registro ficou **pendente** (aberto, esperando um documento que o feche).

> **"Tipo de Documento" é flexível.** Você não está preso a uma lista fixa — pode criar, editar e excluir os tipos de documento que o hospital precisa, cada um com seus próprios campos.

---

## 2. Etapa 1 — Dados do Hospital

| Campo | O que fazer |
|---|---|
| **CNPJ** | Digite e clique em "Buscar" — preenche Razão Social, Cidade e UF sozinho |

Clique em **"Avançar"** pra ir pra etapa 2.

---

## 3. Etapa 2 — Tipo de Documento

Escolha o tipo de documento que você vai registrar. Se o tipo que você precisa não existe ainda, crie um novo:

| Campo | O que fazer |
|---|---|
| **Nome do tipo de documento** | Ex.: "Checklist de Ronda Noturna", "Ata de Treinamento" |
| **POP(s) relacionado(s) (opcional)** | Se esse documento comprova a execução de um POP específico, relacione aqui |
| **Documento que fecha esta pendência** | Marque se esse tipo de documento deve ficar "pendente" até outro documento futuro fechar essa pendência |

Clique em **"Gerar sugestão de campos com IA"** pra deixar a Inteligência Artificial sugerir quais campos esse tipo de documento normalmente precisa — aceite, edite ou remova qualquer campo sugerido. Use **"+ Adicionar campo"** e **"+ Adicionar assinatura"** pra montar manualmente. Um tipo já criado pode ser mudado com **"Editar este tipo"**, ou removido com **"Excluir este tipo"** (pede confirmação).

---

## 4. Etapa 3 — Preenchimento do Registro

Preencha os campos definidos pro tipo de documento escolhido (variam conforme o tipo). Em qualquer campo de texto, o botão **"✨ Melhorar com IA"** reescreve o que você digitou de forma mais clara e profissional — você decide entre **"Usar sugestão da IA"** ou **"Manter o que escrevi"**, a IA nunca troca o texto sozinha sem sua confirmação. Anexe imagens se o tipo de documento permitir. Clique em **"Gerar Registro"** pra finalizar.

---

## 5. Etapa 4 — Consultar Registros Já Gerados

Digite o CNPJ e clique em "Buscar" pra ver o **Histórico Completo** de registros desse hospital.

---

## 6. Pendências em aberto

Na mesma etapa de consulta, a seção "Pendências em Aberto" mostra registros que ainda não foram fechados — cada um mostra a data em que ficou pendente. Pra fechar, clique em **"Registrar Fechamento"** na pendência correspondente — isso abre um novo preenchimento já vinculado àquela pendência.

---

## 7. Passo a passo completo

1. Etapa 1: CNPJ, buscar, conferir dados do hospital.
2. Etapa 2: escolher ou criar o tipo de documento.
3. Etapa 3: preencher os campos, usar "Melhorar com IA" se quiser, gerar o registro.
4. Etapa 4: consultar histórico e pendências em aberto quando precisar.

---

## 8. Erros comuns e o que fazer

| O que aconteceu | O que fazer |
|---|---|
| O botão "Avançar" da etapa 2 está desabilitado | Escolha ou finalize a criação de um tipo de documento antes de avançar |
| Não sei quais campos colocar num tipo novo | Use "Gerar sugestão de campos com IA" como ponto de partida |
| Um registro sumiu da lista de pendências | Provavelmente já foi fechado — confira no Histórico Completo |

---

## 9. Glossário

| Termo | Explicação simples |
|---|---|
| **Tipo de Documento** | Modelo reutilizável, com campos próprios, pra um tipo de registro operacional |
| **Pendência** | Um registro que ficou "em aberto", esperando um documento futuro que o feche |
| **Registrar Fechamento** | Preencher o documento que fecha uma pendência específica |
| **POP** | Procedimento Operacional Padrão que esse registro comprova ter sido executado |

---

*Este manual descreve o módulo Registros Operacionais tal como implementado em 2026-08-20.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).
