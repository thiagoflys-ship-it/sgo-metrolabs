# Manual do Operador — Módulo Frota

### Retirada/devolução de veículos com checklist de vistoria, manutenção com alerta de vencimento, despesas e histórico

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema**. Leia na ordem, de cima para baixo, seguindo a tela também de cima para baixo. Se aparecer uma palavra técnica desconhecida, vá direto ao **Glossário** (seção 11).

---

## 1. O que este sistema faz, em uma frase

Você registra quando pega e quando devolve um veículo da empresa, com uma vistoria (checklist) em cada ponta pra flagrar qualquer problema novo — e o mesmo sistema guarda o histórico de manutenções, despesas e paradas de cada veículo, avisando sozinho quando uma manutenção está vencendo.

> **Todas as seções ficam sempre visíveis na tela** — não é um passo a passo obrigatório. Use a seção que precisar, na hora que precisar.

---

## 2. Veículos e Condutores

Antes de registrar qualquer retirada, o veículo e o condutor precisam estar cadastrados (uma vez só, depois reaproveita sempre). Use **"+ Cadastrar novo veículo"** (placa, modelo, marca, ano, cor, KM atual) e **"+ Cadastrar novo condutor"** (nome, telefone, CNH opcional). Um veículo ou condutor que não vai ser mais usado pode ser **Inativado** (some das listas de seleção, mas fica no histórico) em vez de excluído.

> **Ajustar KM do veículo (só a gestão: Administrador, Gestor ou Diretoria).** O KM de um veículo só muda pelo painel **"Ajustar KM do veículo"** (aba Veículos e condutores; no celular, botão "Ajustar KM do veículo"). Escolha o veículo, digite o KM novo e a justificativa (mínimo de 15 caracteres). O KM antigo, o novo, quem ajustou e o motivo ficam na **Trilha de auditoria**. O botão Editar do veículo não muda mais o KM. Veículo em uso só é ajustado depois da devolução.

---

## 3. Retirar veículo

Escolha o veículo, digite o **KM de saída** (o número do painel) e a finalidade da viagem. Quem não é da gestão não escolhe condutor: o sistema usa o condutor ligado ao seu login.

> **Data e hora.** Vale sempre a hora do servidor (horário de Brasília) no momento em que você confirma. A tela mostra "Registro com a hora atual" e não pede data nem hora. Só a gestão pode informar outra data/hora (por exemplo, quando alguém esqueceu de registrar). Se a diferença para agora passar de 10 minutos, a justificativa é obrigatória. Data no futuro não é aceita.

> **KM diferente do registrado.** Ao escolher o veículo, a tela mostra o KM registrado. Se o painel mostrar um número **maior** (alguém usou sem registrar, ou houve erro de digitação), a retirada não é bloqueada: anexe a **foto do painel (odômetro)**. A diferença fica gravada e a gestão recebe um aviso para conferir. KM **menor** que o registrado é recusado (o odômetro não volta); se o KM registrado estiver errado, peça à gestão o Ajuste de KM.

> **Retirada em nome de outra pessoa.** Só a gestão escolhe outro condutor. A justificativa é obrigatória, o registro fica marcado como "registrado pela gestão", entra na trilha de auditoria e o condutor recebe um aviso (no SGO+, por e-mail e por WhatsApp, conforme o cadastro dele).

Depois, faça o **checklist de vistoria**: cada item já vem marcado como "OK" — desmarque o que estiver com problema e escreva uma observação ao lado. Anexe pelo menos uma foto do veículo (obrigatória). Clique em **"Registrar Retirada"**.

> **O que acontece?** O veículo passa a aparecer em "Retiradas em andamento" e some da lista de veículos disponíveis pra retirada, até ser devolvido. Se duas pessoas tentarem retirar o mesmo veículo ao mesmo tempo, só a primeira consegue; a outra recebe o nome de quem está com ele.

---

## 4. Devolver veículo

Na seção "Retiradas em andamento", clique em **"Registrar Devolução"** do veículo correspondente — abre um formulário já sabendo qual retirada está sendo fechada. Preencha o **KM de chegada** (tem que ser igual ou maior que o KM de saída registrado). Faça o checklist de vistoria de novo (mesma lista) e anexe pelo menos uma foto do veículo. A data e a hora são as do servidor, como na retirada.

> **Quem devolve.** Só quem está com a retirada (o condutor) registra a devolução. Para as outras pessoas a lista mostra "Só [nome] ou a gestão registram a devolução". Se o condutor esqueceu, a gestão registra no lugar dele, com justificativa obrigatória; o registro fica marcado, entra na trilha de auditoria e o condutor é avisado.

> **Esqueceu de devolver?** Retirada aberta há mais de 12 horas aparece no Início, para o condutor e para a gestão, como "possível devolução esquecida", com o que fazer.

> **KM fora do esperado.** Se o KM rodado passar de 1.500 km, ou der média acima de 120 km/h no tempo da retirada, a devolução não é bloqueada, mas pede a **foto do painel (odômetro)**. Confira se o número não foi digitado errado; se estiver certo, anexe a foto. A gestão é avisada para conferir no painel "KM a conferir".

> **Por que o checklist se repete na devolução?** Pra você comparar: se um item estava OK na saída e voltou com problema, é fácil perceber que aconteceu durante o uso.

---

## 5. Manutenção e alertas de vencimento

Registre cada manutenção feita (óleo, pneu, filtro, freio, etc.) com data, KM, custo, oficina e descrição. Ao escolher o **Tipo**, o campo "Próxima troca — KM" já vem sugerido automaticamente (KM atual do veículo + intervalo padrão daquele tipo) — você pode ajustar esse número livremente.

> **"Avisos de manutenção" no topo da tela** mostra, sozinho, quais veículos estão com alguma manutenção vencendo (até 500 km ou 30 dias de antecedência) ou já vencida — sem precisar ir conferindo manualmente. O mesmo aviso aparece no Dashboard do Portal e como bolinha vermelha no menu lateral.

---

## 6. Despesas e Paradas

**Despesas:** registre qualquer gasto do veículo (combustível, pedágio, multa, lavagem, etc.) com data, valor e descrição.

**Paradas:** registre períodos em que o veículo ficou fora de uso (acidente, pane, revisão de garantia) — data de início, data de fim (se já souber) e o motivo.

---

## 7. Histórico do veículo

Escolha um veículo e clique em "Buscar" — mostra tudo junto: movimentações, manutenções, despesas e paradas, do mais recente pro mais antigo.

---

## 8. Passo a passo completo

1. Cadastre veículos e condutores (uma vez só).
2. Na retirada: escolha veículo/condutor, preencha KM e finalidade, faça o checklist, registre.
3. Na devolução: clique em "Registrar Devolução" na retirada em andamento, preencha KM de chegada, faça o checklist de novo, registre.
4. Registre manutenções, despesas e paradas conforme forem acontecendo.
5. Consulte o histórico de um veículo quando precisar.

---

## 9. Erros comuns e o que fazer

| O que aconteceu | O que fazer |
|---|---|
| "O KM de saída é menor que o KM registrado do veículo" | Confira o número no painel. Se o KM registrado estiver errado, peça à gestão o Ajuste de KM |
| "O KM de saída é diferente do KM registrado" ou "KM de chegada fora do esperado" | Confira o número; se estiver certo, anexe a foto do painel (odômetro) e registre de novo. A gestão confere depois |
| "Esta retirada está com [nome]. Só [nome] ou a gestão podem registrar a devolução" | Peça a [nome] para registrar; se não for possível, procure a gestão, que registra no lugar dele com justificativa |
| "Justificativa obrigatória" (gestão) | Escreva o motivo no campo Justificativa, com pelo menos 15 caracteres |
| "A data/hora está no futuro" (gestão) | Corrija ou deixe os campos vazios para usar a hora atual |
| "O veículo já está retirado por [nome]" | Escolha outro veículo. Se ele já voltou, [nome] (ou a gestão) registra a devolução antes |
| Não aparece nenhum veículo pra retirar | Todos podem estar em uso no momento — confira "Retiradas em andamento" |

---

## 10. Glossário

| Termo | Explicação simples |
|---|---|
| **Checklist de vistoria** | Lista de itens do veículo conferidos na retirada e na devolução, pra flagrar problemas |
| **Retirada em andamento** | Um veículo que já foi pego mas ainda não foi devolvido |
| **Vencendo / Vencida** | Manutenção perto do KM/data prevista, ou já passada dela |
| **Parada** | Período em que o veículo ficou fora de uso |

---

*Este manual descreve o módulo Frota tal como implementado em 2026-08-21.*
