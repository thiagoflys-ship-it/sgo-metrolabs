# Manual do Operador — Módulo PGT e POP (Engenharia Clínica)

## O que mudou em 18/10/2026 (documento A4)

- O PGT sai com capa, sumário com os números de página, seções numeradas (os requisitos gerais e específicos viram subseções 7.1, 8.1...), glossário com o termo em negrito e as quatro assinaturas juntas na página final ("Aprovação").
- O POP sai com título, ficha (código, revisão e data), histórico de revisões (Tabela 1), seções numeradas, passos numerados em lista e as assinaturas. O sumário só aparece quando o POP passa de 3 páginas.
- Cada documento gerado já fica na pasta do cliente (CNPJ) em PDF e em cópia A4 (HTML) com o nome "POP - POP005 rev 1.0 - Etiquetagem de Equipamentos - aaaa-mm-dd hhmm" (no PGT: "PGT - PGTS rev 1.0 - <instituição> - ..."). O botão "Salvar na pasta do cliente" não cria mais um segundo PDF com o mesmo nome: se o documento já estava salvo, mostra o arquivo que já existe.

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Nome, cargo e registro de quem elaborou ficam na etapa 1. "Avançar" confere razão social, responsável técnico e "Elaborado por".
- Sem IA, o PGT e os POPs sem roteiro não são gerados (nada é gravado e a revisão continua a mesma). O POP com roteiro sai com texto padrão.


### Geração de Plano de Gerenciamento de Tecnologias em Saúde e Procedimentos Operacionais Padrão

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema**. Leia na ordem, de cima para baixo, seguindo a tela também de cima para baixo. Se aparecer uma palavra técnica desconhecida, vá direto ao **Glossário** (seção 10).

---

## 1. O que este sistema faz, em uma frase

Você preenche os dados de um hospital e o sistema gera, com ajuda de Inteligência Artificial, o **PGT** (Plano de Gerenciamento de Tecnologias em Saúde) inteiro e os **POPs** (Procedimentos Operacionais Padrão) escolhidos — todos personalizados pra aquele hospital, seguindo a RDC nº 509/2021 (ANVISA) e a ABNT NBR 15.943:2011.

> **PGT é um documento grande e denso** — é gerado em 6 blocos de Inteligência Artificial (não 1 chamada só), o que deixa o texto bem mais completo, mas também demora — pode levar alguns minutos. É normal a tela mostrar "gerando..." por um tempo.

---

## 2. Etapa 1 — Dados do Hospital

| Campo | O que fazer |
|---|---|
| **CNPJ** | Digite e clique em "Buscar" — preenche Razão Social, Logradouro, Bairro, Cidade, UF sozinho |
| **Porte / Tipo do Hospital** | Ex.: hospital de grande porte, clínica, etc. |
| **Nº de Leitos** | Quantidade de leitos do hospital |
| **Nome do Responsável Técnico** | Responsável técnico do hospital (aparece no documento) |
| **Cargo** | Cargo desse responsável |

Use **"Consultar documentos já gerados"** pra ver se esse hospital já tem PGT/POPs gerados antes, sem precisar gerar de novo.

---

## 3. Etapa 2 — PGT

| Campo | O que fazer |
|---|---|
| **Nome de quem elaborou** | Nome de quem está montando o documento agora |
| **Cargo** | Sugestão: "Gestor de Engenharia Clínica" — editável |
| **Registro profissional** | Nº de registro (CREA, etc.) de quem elaborou |
| **Roteiro / Observações do PGT (opcional)** | Texto livre com informações específicas desse hospital pra IA considerar |
| **Imagens (opcional)** | A IA analisa cada foto anexada e escreve uma interpretação técnica sozinha |

> **Atenção com nome/cargo/registro:** esses 3 campos são sempre editáveis e nunca vêm fixos — um documento gerado com um nome diferente do de costume sai assinado com o registro profissional certo daquela pessoa, não de outra. Preencha com cuidado.

---

## 4. Etapa 3 — POPs

Marque, na lista, quais Procedimentos Operacionais Padrão você quer gerar pra esse hospital. Se precisar de um POP que não está na lista, use **"+ Adicionar POP avulso"** pra criar um personalizado — remova qualquer um marcado por engano com "Remover".

---

## 5. Etapa 4 — Gerar Documentos

Clique em **"Gerar Tudo"**. O sistema gera o PGT (em 6 blocos de IA) e todos os POPs marcados, um por um — pode levar alguns minutos. Acompanhe pelo **LOG OPERACIONAL** (visível em todas as etapas), que mostra o progresso em tempo real. Ao terminar, clique em **"Ver Documentos"**.

---

## 6. Etapa 5 — Documentos Gerados

| Botão | O que faz |
|---|---|
| **Abrir** | Abre o documento numa nova aba, pronto pra imprimir |
| **Salvar no Drive** | Salva uma cópia em PDF na pasta do hospital |
| **Atualizar lista** | Recarrega a lista de documentos gerados |

---

## 7. Passo a passo completo

1. Etapa 1: CNPJ, buscar, preencher porte/leitos/responsável técnico.
2. Etapa 2: preencher quem elaborou (nome/cargo/registro), roteiro e imagens.
3. Etapa 3: marcar os POPs desejados (ou adicionar avulso).
4. Etapa 4: clicar em "Gerar Tudo" e acompanhar o log.
5. Etapa 5: abrir cada documento, salvar no Drive.

---

## 8. Erros comuns e o que fazer

| O que aconteceu | O que fazer |
|---|---|
| A geração está demorando muito | Normal — o PGT sozinho são 6 chamadas de IA em sequência; acompanhe o log |
| Quero reaproveitar um documento já gerado pra esse hospital | Use "Consultar documentos já gerados" na etapa 1 |
| Um POP que eu preciso não está na lista | Use "+ Adicionar POP avulso" na etapa 3 |

---

## 9. Glossário

| Termo | Explicação simples |
|---|---|
| **PGT** | Plano de Gerenciamento de Tecnologias em Saúde — documento amplo, exigido por norma, sobre a gestão dos equipamentos do hospital |
| **POP** | Procedimento Operacional Padrão — instrução passo a passo de como um processo deve ser feito |
| **RDC nº 509/2021** | Norma da ANVISA que embasa a exigência do PGT |
| **POP avulso** | Um POP personalizado, criado na hora, fora da lista padrão |

---

*Este manual descreve o módulo PGT e POP tal como implementado em 2026-08-20.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).
