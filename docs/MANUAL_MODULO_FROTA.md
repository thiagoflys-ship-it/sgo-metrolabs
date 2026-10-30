# Manual do Operador — Módulo Frota

Retirar e devolver veículo, vistoria, KM, abastecimento, despesas, multas, documentos, manutenção, relatório e rastreador.

*Revisão: 21/10/2026 (Gantt da frota refeito: escalas Dia, Semana e Mês, sub-linhas sem sobreposição, balão e lista no celular); 20/10/2026 (aba Rastreamento, Gantt, copiloto e comprovantes), conferido com a tela. É o mesmo texto do botão "Manual do operador" da tela.*

## 1. Como usar este manual

Leia na ordem. Cada tarefa tem passos numerados: faça um passo de cada vez. O nome de cada botão aparece entre aspas, igual ao que está na tela. Palavras desconhecidas estão no **Glossário** (seção 16).

## 2. Para que serve a Frota

A Frota registra quem pegou cada veículo da empresa e quando devolveu. Em cada ponta você confere o KM, tira fotos e faz a vistoria. Assim, qualquer problema novo aparece logo.

O sistema também avisa sozinho quando manutenção, documento ou CNH vão vencer, descobre quem estava com o veículo quando chega uma multa e monta o relatório da frota.

> **Abas do computador (19/10/2026):** "Situação e retiradas", "Gestão e melhoria", "Veículos e condutores", "Manutenção e paradas", "Documentos e multas", "Abastecimentos e despesas", "Rastreamento" e "Histórico e relatório". Cada pessoa só vê as abas do seu perfil.

## 3. Celular e computador; quem pode o quê

No **celular** a tela é a mesma para todos: avisos, botão de devolver, veículos para retirar e veículos em uso. A gestão tem também o quadro **"Opções da gestão"**, com "Registrar abastecimento", "Ajustar KM do veículo" e "Partida do veículo (rastreador)".

No **computador**, a mesma tela de retirar e devolver fica na aba "Situação e retiradas", quadro "Retirar e devolver".

| Perfil | O que pode fazer |
|---|---|
| Toda a equipe | Retirar em seu próprio nome. Devolver a própria retirada. Ver a situação da frota, os avisos, as listas e o histórico. |
| Gestão (Administrador, Diretoria, Gestor, RH e Financeiro) | Tudo da equipe. Também: retirar em nome de outra pessoa e devolver no lugar dela, com justificativa; informar outra data e hora; cadastrar veículos e condutores; ajustar e conferir KM; ver a trilha de auditoria; registrar manutenção, parada, documentos, multas e abastecimentos; consultar despesas; gerar relatório; usar o rastreador. |
| Só o Administrador | "Levantamento de valores suspeitos", na aba Despesas. |
| Cliente | Não usa a Frota. |

## 4. Veículos e condutores

Cada veículo e cada condutor são cadastrados uma vez só. Isso é feito pela gestão, na aba "Veículos e condutores".

### Cadastrar um veículo

1. Toque em "+ Cadastrar novo veículo".
2. Preencha placa, modelo, marca, ano, cor e "KM atual".
3. Em "Apelido", escreva como a equipe vai chamar o carro (ex.: Onça) ou toque em "Sugerir apelido": vem um nome de animal brasileiro que nenhum veículo usa. Toque de novo para outro nome.
4. Em "Base", escolha a cidade onde o carro fica (ex.: Goiânia ou Rio de Janeiro).
5. Toque em "Salvar veículo".

### Apelido e base: como reconhecer cada carro

Temos carros de mesmo modelo e cor, em Goiânia e no Rio de Janeiro. Por isso cada veículo pode ter um **apelido** (Onça, Tucano, Capivara...) e uma **base** (a cidade onde ele fica). Em todo lugar o veículo aparece assim: **Onça · Goiânia · ABC1D23 · ONIX 1.0 MT LS · Branca** (nas listas apertadas, **Onça · Goiânia · ABC1D23**). Apelido e base vêm na frente; o modelo aparece sem repetir a marca e a cor aparece como foi cadastrada (21/10/2026). Sem apelido: **Goiânia · ABC1D23**.

- **Onde aparece:** lista e cartão de veículos, tela de retirar e devolver (computador e celular), reservas e agenda, mapa do rastreamento (nome do marcador), Gantt da frota, Kanban da gestão, multas, abastecimentos, manutenção, documentos, comprovantes, avisos do Início e Caixa de decisões, relatórios A4 da Frota e o COMMAND (Frota e Reservas).
- **Apelido único:** dois veículos ativos não têm o mesmo apelido. Maiúscula, acento, hífen e espaço não contam ("Lobo-guará" e "lobo guara" são o mesmo). Veículo inativo não segura o nome, mas para reativá-lo com um nome que outro ativo já usa é preciso trocar o apelido antes.
- **Dar apelido a um veículo já cadastrado:** na lista, o aviso "N veículos ativos sem apelido" mostra quantos faltam. Toque em "Editar" na linha, preencha "Apelido" e "Base" e toque em "Salvar edição". Campo vazio mantém o que já estava gravado. Nada fica travado enquanto faltar apelido.
- **Escolher a base:** acima da lista de veículos, do mapa, da agenda das reservas e do Gantt há o campo "Base". No celular e na tela de retirar, são botões ("Todas", "Goiânia", "Rio de Janeiro"). A escolha fica guardada no navegador ou no celular e vale para todas essas telas. Veículo ainda sem base aparece em todas as bases.
- **Lista de bases:** a gestão muda em "Bases da frota" (embaixo de "+ Cadastrar novo veículo"), uma cidade por linha, e toca em "Gravar bases". Padrão: Goiânia e Rio de Janeiro. Base com veículo ativo não sai da lista: troque a base desses veículos antes.
- **Quem pode:** Administrador, Diretoria, Gestor, RH e Financeiro dão apelido, escolhem a base e mudam a lista. A equipe vê e escolhe a base para filtrar.

### Cadastrar um condutor

1. Toque em "+ Cadastrar novo condutor".
2. Em "Vincular a um usuário do SGO (opcional)", escolha o login da pessoa. Sem isso ela não consegue retirar pelo próprio login.
3. Preencha nome e telefone.
4. Se tiver, preencha a CNH, a validade e anexe o arquivo.
5. Toque em "Salvar condutor".

> **Por que ligar o condutor ao login?** Porque é assim que o sistema sabe quem está retirando. Quem não é da gestão retira sempre em seu próprio nome. Não há como escolher outra pessoa.

### Editar um condutor (validade da CNH, telefone, login)

1. Na lista de condutores, toque em "Editar" na linha da pessoa.
2. Preencha o que mudou: "Validade da CNH" (dd/mm/aaaa), "Número da CNH", "Telefone" ou o "Login do SGO+" (só se ainda não tiver).
3. Campo vazio mantém o que já estava gravado.
4. Toque em "Salvar alterações". Para trocar o arquivo da CNH, use "Trocar CNH" na mesma linha.

A validade aparece na lista: em vermelho quando venceu, em amarelo quando vence em até 30 dias. O aviso de CNH some sozinho quando a nova validade é gravada. Telefone, número e arquivo da CNH só aparecem para a gestão.

Veículo ou condutor que não vai mais ser usado: toque em "Inativar" e confirme. Ele some das listas, mas o histórico continua guardado. Para voltar, toque em "Reativar".

## 5. Retirar veículo

1. Abra a Frota.
2. Em "Retirar um veículo", toque na sua base (botões "Todas", "Goiânia", "Rio de Janeiro"...) e no cartão do veículo. Só aparecem os disponíveis. O nome grande é o apelido do carro; embaixo vêm placa, modelo, cor e base.
3. Olhe o número no painel do carro.
4. Se for igual ao KM que já aparece na tela, não mexa.
5. Se for diferente, corrija o número e toque em "Tirar foto do painel (obrigatória: KM diferente)".
6. Toque em "Tirar foto do veículo". A câmera abre direto. Tire pelo menos uma foto.
7. Olhe o veículo por fora e por dentro.
8. Se estiver tudo certo, toque em "Tudo OK".
9. Se achar um problema, toque em "Tem problema", toque no item e escreva o que viu. No grupo "Funcionamento" (só na retirada), com a ignição ligada, confira: luz de advertência no painel, nível do óleo do motor, nível da água do radiador, pneus (nenhum murcho ou com dano) e freio (sem ruído ou vibração).
10. Se quiser, preencha "Finalidade (opcional)".
11. Toque em "Confirmar retirada".
12. Espere o aviso "Retirada registrada".

> **A linha acima do botão** diz o que falta, por exemplo "Falta: a foto do painel". Quando aparece "Tudo pronto.", pode confirmar.

> **Data e hora:** vale sempre a hora do momento em que você confirma (horário de Brasília). Você não digita data nem hora.

> **Problema marcado na vistoria da retirada** vira uma pendência para a gestão resolver e aparece para quem retirar o veículo depois, até a gestão registrar o que foi feito. Luz vermelha de óleo ou de temperatura acesa, ou freio com problema: não siga viagem e fale com a gestão.

> **KM sugerido pelo rastreador:** com leitura recente do rastreador, aparece "O rastreador indica cerca de ... km" e o botão "Usar". Vale sempre o número do painel.

> **KM maior que o registrado:** não é erro. Alguém pode ter usado sem registrar. Corrija o número, tire a foto do painel e continue. A gestão confere depois. **KM menor** não é aceito, porque o odômetro não volta. Se o número registrado estiver errado, peça à gestão o ajuste de KM.

> **Veículo com outra pessoa:** ele aparece em "Em uso por outras pessoas". Se você tocar nele, a tela diz com quem está. Se duas pessoas tentarem retirar o mesmo veículo ao mesmo tempo, só a primeira consegue.

> **Saiu da tela sem confirmar?** Ao abrir a Frota de novo, toque em "Continuar a retirada" com a placa. As fotos já enviadas continuam lá. Para desistir, toque em "Cancelar e voltar" e confirme: nada é registrado.

## 6. Devolver veículo

0. Estacione e **desligue o carro**. Com o carro ligado ou andando (o rastreador mostra), o SGO+ não aceita a devolução: o bloqueio da partida é pedido logo depois dela (seção 21).
1. Abra a Frota (ou o Início, no celular).
2. Toque no botão verde "Devolver" com a placa do veículo.
3. Digite o KM que está no painel agora. Com leitura recente do rastreador, o campo já vem com o KM que ele indica: confira no painel e corrija se for diferente.
4. Toque em "Tirar foto do painel (obrigatória)".
5. Faça a vistoria: "Tudo OK" ou "Tem problema".
6. Em "Abastecimento", responda se abasteceu durante este uso (obrigatório): "Não abasteci" ou "Abasteci".
   - "Abasteci" > "Lançar agora": litros e valor como estão na nota (ex.: 35,591 e 125,99), combustível, "Completou o tanque?" e "Tirar foto da nota (obrigatória)". Embaixo aparece o resumo (litros × preço por litro = valor) para você conferir. A foto do painel do passo 1 vai junto.
   - "Abasteci" > "Lançar depois": fica um pedido com prazo de 1 dia útil em "Comprovantes pedidos a você" (seção 9).
   - Já lançou pelo botão "Abasteci" durante o uso: toque em "Já lancei pelo Abasteci (não abasteci de novo)". Se abasteceu outra vez, toque em "Abasteci".
7. Se quiser, abra "Mais fotos e observações (opcional)".
8. Toque em "Confirmar devolução".
9. Espere o aviso "Devolução registrada". Se aparecer "Abastecimento não lançado", a sua próxima retirada fica travada até resolver (seção 9).

> **Quem devolve:** só quem retirou. A gestão pode devolver no lugar da pessoa, com justificativa (seção 8). A pessoa recebe um aviso.

> **Esqueceu de devolver?** Retirada aberta há mais de 12 horas aparece no Início como possível devolução esquecida, para você e para a gestão. Devolva assim que puder.

> **Outra pessoa vai seguir com o carro?** Não devolva: use **Passar o carro** (seção 21). Ninguém devolve, nenhum comando vai para o carro e funciona até sem internet.

> **KM muito alto:** se o KM rodado passar de 1.500 km, ou der média acima de 120 km/h, a devolução não é bloqueada. Confira se digitou certo. A gestão recebe o aviso para conferir.

> **Por que a vistoria se repete na devolução?** Para comparar com a saída. Se um item saiu OK e voltou com problema, fica claro que aconteceu durante o uso.

## 7. Sinal fraco e erro ao confirmar

Cada foto mostra um selo: "Preparando…", "Enviando…", "Enviada", "Sem sinal: nova tentativa em instantes" ou "Não enviada: toque para tentar de novo".

1. Se aparecer "Sem sinal", não faça nada. O sistema tenta de novo sozinho, três vezes.
2. Se aparecer "Não enviada: toque para tentar de novo", toque na foto. Ou remova no "×" e tire outra.
3. Você pode tocar em "Confirmar retirada" ou "Confirmar devolução" mesmo com foto subindo. A tela mostra "Terminando de enviar as fotos" e depois "Gravando o registro…".
4. Se der erro ao confirmar, não saia da tela. Leia a mensagem. Se for falta de conexão, espere o sinal voltar e toque em confirmar de novo. As fotos já enviadas não são enviadas outra vez.

> **Apareceu "Já estava registrado" ou "já estava registrada"?** Está tudo certo. O primeiro toque já tinha gravado e nada foi registrado em dobro. Não faça mais nada.

> **Apareceu "Registro conferido"?** A conexão caiu na resposta, mas o registro foi gravado. Não registre de novo.

## 8. Gestão: opções, KM a conferir, ajuste de KM e trilha

### Registrar em nome de outra pessoa ("Opções da gestão")

1. Na retirada ou na devolução, abra "Opções da gestão" (no fim da tela).
2. Na retirada, escolha o "Condutor".
3. Se foi em outro horário, preencha "Data (vazio = agora)" e "Hora (vazio = agora)".
4. Escreva a "Justificativa", com pelo menos 15 letras.
5. Termine a retirada ou a devolução normalmente e confirme.

A justificativa é obrigatória para outro condutor, para devolução no lugar do condutor e para data ou hora com mais de 10 minutos de diferença. Data no futuro não é aceita. O registro fica marcado como "registrado pela gestão", entra na trilha de auditoria e o condutor recebe um aviso.

### KM a conferir

1. Abra a aba "Situação e retiradas".
2. No quadro "KM a conferir", leia o motivo de cada linha.
3. Toque em "Foto do painel" e confira o número.
4. Toque em "Conferido". Se quiser, escreva o que a foto mostrou.

### Ajustar o KM do veículo

1. Abra a aba "Veículos e condutores" (no celular: "Opções da gestão" > "Ajustar KM do veículo").
2. Escolha o veículo.
3. Digite o "KM novo".
4. Escreva a justificativa, com pelo menos 15 letras.
5. Toque em "Ajustar KM".

É o único jeito de mudar o KM. O botão "Editar" do veículo não muda o KM. Veículo em uso só é ajustado depois da devolução.

### Trilha de auditoria

1. Na aba "Histórico e relatório", vá ao quadro "Trilha de auditoria".
2. Escolha o veículo ou deixe "Todos os veículos".
3. Toque em "Consultar".

A trilha mostra quem fez cada registro especial, quando, o valor antes e depois e a justificativa. Nada nela pode ser apagado.

## 9. Abastecimentos

Desde 30/10/2026 (pedido do dono) nenhum abastecimento passa despercebido: quem abasteceu lança na devolução, o SGO+ confere na hora e cobra o que faltar.

### Como o SGO+ garante que o abastecimento seja lançado

1. **Na devolução**, a pergunta "Abasteceu durante este uso?" é obrigatória (seção 6). Lança ali ou deixa para depois, com prazo de 1 dia útil.
2. **Conferência automática:** se o veículo rodar mais que o limite desde o último abastecimento lançado (75% da autonomia: capacidade do tanque × consumo do veículo; sem a capacidade cadastrada, 350 km), quem devolveu recebe a pendência "Abastecimento não lançado".
3. **Próxima retirada travada:** com essa pendência (ou com o "Lançar depois" vencido), a próxima retirada da pessoa não é aceita. A mensagem diz o quê, por quê e o que fazer. Resolve na hora: "Enviar comprovante" ou "Não abasteci" com o motivo.
4. **Aviso:** pendente há mais de 1 dia útil, o condutor recebe aviso no sistema e por e-mail (WhatsApp só na contagem do resumo do dia, no expediente) e a gestão no e-mail de resumo. A pendência aparece também em Minhas atividades e no Início.
5. **A gestão confere e decide:** aceita ou não o "Não abasteci" (com a foto do painel da devolução) e pode liberar uma pendência, sempre com o motivo na trilha.

### "Abasteci": lançar na hora, no posto (condutor)

1. Na tela inicial da Frota, toque em "Abasteci". O veículo que está com você já vem escolhido.
2. Toque em "Tirar foto da nota (obrigatória)". Com a leitura automática ligada, os campos vêm sugeridos a partir da foto: confira cada um com a nota (se mudar litros ou valor, a gestão confere).
3. Digite os litros e o valor como estão na nota (ex.: 35,591 e 125,99), o combustível, o KM do painel e o posto, e diga se completou o tanque. Com leitura recente do rastreador, aparece o KM que ele indica e o botão "Usar".
4. Se quiser, tire a foto do painel (odômetro e ponteiro do combustível).
5. Toque em "Conferir e lançar o abastecimento", leia o resumo (litros × preço por litro = valor) e toque em OK.
6. Na devolução, responda "Já lancei pelo Abasteci".

As conferências são as mesmas da devolução (tabela abaixo). KM digitado longe do que o rastreador indica (mais de 20 km, ou 3% do que ele rodou) grava "a conferir". Sem retirada aberta, a tela explica: se abasteceu um veículo que não retirou, entregue a nota à gestão, que lança no seu nome.

### Pedágio, estacionamento e outras despesas (condutor)

1. Na tela inicial da Frota, toque em "Pedágio, estacionamento e outras despesas".
2. Escolha o veículo (o que está com você, ou um que você devolveu nos últimos 3 dias) e o tipo: pedágio, estacionamento, lavagem, peças e serviços ou outro.
3. Tire a foto da nota ou do recibo (obrigatória), digite o valor, a data, a hora (se tiver) e o local. Em peças e serviços e em outro, escreva o que foi pago.
4. Toque em "Conferir e lançar a despesa" e confirme.

| Situação | O que acontece |
|---|---|
| Sem foto da nota, valor zero ou acima de R$ 30.000, data no futuro | Recusa, com o que fazer |
| Mesmo veículo, data, tipo e valor de outra despesa | Recusa: já está lançada |
| Valor acima do comum (pedágio ou estacionamento acima de R$ 150, lavagem acima de R$ 250, peças e serviços acima de R$ 3.000) | Grava "a conferir" |
| Data da nota fora da sua retirada | Grava "a conferir" |

Pedágio pago pela tag não precisa ser lançado: a gestão importa o extrato.

### Registrar um abastecimento (gestão)

1. Abra a aba "Abastecimentos e despesas" e toque em "+ Registrar abastecimento" (no celular: "Opções da gestão" > "Registrar abastecimento").
2. Escolha o veículo e, se souber, o condutor.
3. Preencha a data, o "KM no abastecimento", o tipo de combustível, os litros, o valor total e o posto. Litros como estão na nota: a vírgula ou o ponto é sempre a casa decimal (35,591 ou 35.591 são 35,591 litros).
4. Anexe a foto ou o PDF do comprovante. Sem ele não salva.
5. Toque em "Salvar abastecimento" (no celular, "Registrar abastecimento").
6. Leia o resumo (litros × preço por litro = valor; KM e quanto rodou desde o anterior). OK grava; Cancelar volta para corrigir.

### O que a conferência recusa e o que fica "a conferir"

| Situação | O que acontece |
|---|---|
| Litros acima de 105% da capacidade do tanque (sem a capacidade, acima de 150 L) | Recusa, com a capacidade e a dica da vírgula |
| Preço por litro abaixo de R$ 1 ou acima de R$ 15 | Recusa: litros ou valor digitados errado |
| Mesmo veículo, data, litros e valor de outro lançamento | Recusa: já está lançado |
| Data no futuro | Recusa |
| Preço por litro fora da faixa normal (média de 90 dias ± 30%, ou a faixa padrão do combustível) | Grava "a conferir" |
| KM menor que o do abastecimento anterior, ou fora das retiradas do veículo no dia (folga de 50 km) | Grava "a conferir" |
| Dois abastecimentos com menos de 150 km entre eles somando mais que o tanque | Grava "a conferir" |
| Lançado mais de 30 dias depois | Grava "a conferir" |

Lançamento "a conferir" ou "divergente" fica fora da média de consumo. Intervalo com rendimento abaixo de 2 ou acima de 30 km/L também fica fora e aparece no copiloto como lançamento a conferir.

### Responder um abastecimento pendente (condutor)

1. Abra a aba "Abastecimentos e despesas" (no celular, "Resolver agora" no aviso da tela inicial da Frota).
2. Em "Comprovantes pedidos a você": se abasteceu, preencha e anexe a nota em "Enviar comprovante"; se não abasteceu, toque em "Não abasteci" e escreva o motivo.
3. A próxima retirada fica livre na hora.

### Obrigatoriedade do abastecimento (gestão, no topo da aba)

- **Veículos:** KM atual, último abastecimento, quanto rodou desde então e o limite; campo "Tanque (L)" para a capacidade do tanque.
- **Pendências:** quem, qual veículo, prazo, se trava a retirada; "Liberar" com o motivo.
- **"Não abasteci" a conferir:** "Aceitar" ou "Não aceitar" (com o motivo, que vai ao condutor; a retirada volta a travar).
- **Lançamentos a conferir:** comprovante e foto do painel ao lado; "Conferido", "Divergente" (com o motivo) ou "Corrigir".
- **Corrigir:** só os campos que mudar são gravados, com justificativa; o comprovante continua o mesmo; antes, depois, quem e quando ficam na trilha de auditoria.
- **Corrigir data, hora ou KM de uma retirada:** escolha o veículo e a retirada (as datas da planilha antiga aparecem marcadas para conferir dia e mês). O KM do veículo não muda por aqui (use "Ajustar KM").
- **Configuração:** porcentagem da autonomia (padrão 75%), consumo padrão sem histórico (9 km/L), limite sem tanque cadastrado (350 km) e ligar ou desligar a trava da retirada.

> **Consumo (km por litro):** o sistema calcula sozinho, comparando o KM entre dois abastecimentos do mesmo veículo. Com menos de 2 abastecimentos, o consumo não aparece.

### Conferência de gastos (gestão)

Quadro "Conferência de gastos", na aba "Abastecimentos e despesas": abastecimentos, despesas (pedágio, estacionamento, lavagem, peças e serviços, outro) e manutenções numa lista só, com o comprovante ao lado.

1. Escolha o período (já vem o mês atual), o veículo, o condutor, o tipo e a situação. Toque em "Consultar".
2. Leia o total do período, o km das retiradas devolvidas, o custo por km e os totais por veículo (com km/L) e por tipo.
3. Toque numa linha: o comprovante abre ao lado (no celular, por cima), com os apontamentos da conferência e quem lançou.
4. Toque em "Conferido", "A conferir" ou "Divergente". "A conferir" e "Divergente" pedem o motivo (mínimo de 15 caracteres). Quem, quando, o antes, o depois e o motivo ficam na trilha de auditoria.
5. "Conferir em lote" marca como conferidos os lançamentos pendentes sem apontamento e com comprovante. "Conferido (marcados)" marca as linhas que você marcou na caixa.

| Situação | O que quer dizer |
|---|---|
| Pendente de conferência | Acabou de entrar, sem apontamento |
| A conferir | A conferência apontou algo (preço, KM, valor, sem retirada no momento, leitura da nota diferente) ou a gestão devolveu para conferir |
| Conferido | A gestão bateu o comprovante com o lançamento |
| Divergente | Não bate; fica fora dos totais e das médias de consumo |
| Corrigido | Houve correção campo a campo; o valor anterior está na trilha |

Custo por km: total do período dividido pelo km das retiradas devolvidas com saída no período. Despesa da gestão também pode ser lançada aqui ("Lançar despesa com comprovante").

### Pedágio pela tag: importar o extrato (gestão)

A operadora da tag de pedágio não oferece API pública para empresas: a integração automática só existe por contrato comercial com ela. Por isso o SGO+ usa o extrato.

1. No portal da operadora, exporte o extrato de passagens do mês em CSV (ou Excel .xlsx), sem mudar as colunas.
2. Na aba "Abastecimentos e despesas", abra "Importar o extrato do pedágio (tag)", escolha o arquivo e toque em "Ver a prévia".
3. Confira cada linha: com a retirada encontrada (placa e data e hora), sem retirada (vai "a conferir"), já importada antes ou placa que não está na Frota. Estorno e linha de total são ignorados.
4. Toque em "Gravar as passagens". O arquivo fica guardado como o comprovante. Importar o mesmo extrato de novo não duplica nada.

### Relatório mensal A4 (gestão)

1. Abra "Relatório mensal A4 da frota", escolha o mês e toque em "Gerar relatório mensal (A4 e PDF)".
2. O relatório abre em outra aba. A cópia em PDF e HTML fica na pasta "Frota - Relatorios Gerados", subpasta "Relatórios mensais".

Traz: resumo do mês; gastos por tipo e combustível por tipo (litros e preço médio); gastos, km, custo por km e consumo (km/L) por veículo; manutenções feitas no mês; paradas agendadas; plano de manutenção vencido, a vencer e sem a última vez; lançamentos a conferir e divergentes; problemas informados na retirada em aberto.

## 10. Manutenção e paradas

### Plano de manutenção (gestão)

Cada veículo tem um plano no topo da aba "Manutenção e paradas". Vence o que chegar primeiro, o KM ou a data.

| Item | Intervalo inicial (uso severo; ajuste pelo manual do veículo) |
|---|---|
| Óleo do motor e filtro de óleo | 5.000 km ou 6 meses |
| Filtro de ar e filtro de cabine | 10.000 km ou 12 meses |
| Filtro de combustível | 20.000 km ou 12 meses |
| Pastilhas e discos de freio (inspeção) | 10.000 km |
| Fluido de freio | 24 meses |
| Pneus: rodízio, alinhamento e balanceamento | 10.000 km |
| Pneus: troca | 40.000 km (ou antes, pela medida do sulco) |
| Correia dentada | informe pelo manual do veículo |
| Líquido de arrefecimento | 24 meses |
| Bateria (teste) | 12 meses |
| Revisão geral | 10.000 km ou 12 meses |

1. Abra o veículo no quadro "Plano de manutenção".
2. Em cada item, toque em "Informar" e preencha a data e o KM da última vez (na nota ou na etiqueta da oficina). Se o manual pede outro intervalo, preencha também o intervalo e de onde veio.
3. Toque em "Gravar". A próxima vem calculada.

- **Sem a última vez:** o SGO+ cria a pendência "Plano de manutenção incompleto: informe a última troca de óleo do [veículo]" para a gestão, até preencher.
- **Aviso antecipado:** faltam 1.000 km ou 30 dias (aviso no sistema); faltam 500 km ou 15 dias ("a vencer", também no e-mail de resumo da gestão); vencido (a cada dia, e o condutor vê na retirada).
- **Óleo ou freio vencido há mais de 1.000 km:** a retirada do veículo fica travada. Leve à manutenção ou toque em "Liberar uso" (com o motivo, por mais 500 km).
- **Manutenção registrada:** ao registrar a manutenção (tipo "Troca de óleo", "Filtro de ar" etc.), o item do plano se atualiza sozinho.
- **Licenciamento, seguro e IPVA:** continuam em Documentos e multas (validade) e aparecem no rodapé de cada veículo do plano.

### Agendar parada a partir do plano (gestão)

1. No "Plano de manutenção", no item vencido, a vencer ou com aviso, toque em "Agendar parada".
2. Marque o que será feito, a data e a hora de entrega, a volta (vazio = mesmo dia), a oficina e quem leva e busca o veículo.
3. Toque em "Agendar parada".

- O veículo fica **bloqueado para reserva e retirada** no período (manutenção programada das Reservas). Quem tentar retirar recebe a mensagem com o período e os veículos livres.
- A atividade "Levar o veículo à oficina" entra na agenda (Minhas atividades) de quem leva.
- Se o veículo estiver reservado ou em uso no período, a tela diz com quem está: escolha outra data.

### Concluir a parada

1. Em "Paradas agendadas", toque em "Concluir parada".
2. Marque o que foi feito, informe a data do serviço, o KM e o custo total e anexe a nota fiscal (obrigatória quando há custo).
3. Toque em "Concluir parada".

Cada item feito vira manutenção registrada: o plano conta a próxima a partir dela. O custo entra na conferência de gastos como "Oficina e manutenção". O veículo volta a ficar livre e a atividade é concluída. Para desistir, toque em "Cancelar" e escreva o motivo: a manutenção programada e a atividade são canceladas.

### Problemas informados na retirada (gestão)

O quadro lista o que os condutores marcaram com problema na vistoria da retirada. Luz no painel, óleo e freio aparecem como urgentes.

1. Confira o veículo e resolva.
2. Toque em "Resolver" e escreva o que foi feito (mínimo de 15 caracteres).

Até resolver, o problema aparece na central de pendências e para quem for retirar o veículo. Se o mesmo item for marcado de novo, a pendência soma a ocorrência e junta o que o condutor escreveu (nada é apagado).

### Registrar uma manutenção

1. Abra a aba "Manutenção e paradas".
2. Escolha o veículo e o tipo. A próxima troca em KM já vem sugerida.
3. Preencha data, KM, custo, oficina e descrição.
4. Ajuste a próxima troca, se precisar.
5. Toque em "Registrar manutenção".

### Registrar uma parada

1. Escolha o veículo.
2. Preencha "Data início", o motivo e a descrição. A data de fim pode ficar vazia.
3. Toque em "Registrar parada".

> **Avisos de vencimento:** o topo da Frota mostra sozinho manutenção, documento ou CNH vencidos ou que vencem em até 30 dias (ou 500 km). O mesmo aviso aparece no Início.

## 11. Documentos e multas

### Anexar um documento do veículo

1. Abra a aba "Documentos e multas".
2. Toque em "+ Anexar documento".
3. Escolha o veículo e o "Tipo de documento".
4. Se o documento tiver prazo, preencha a validade.
5. Anexe o arquivo e toque em "Salvar documento".

Ao anexar a renovação (por exemplo, o CRLV do ano seguinte), o anterior aparece como "substituído por um mais novo" e deixa de gerar aviso. Documento sem validade nunca gera aviso.

### Registrar uma multa

1. Toque em "+ Registrar multa".
2. Escolha o veículo.
3. Preencha a data e a hora da infração, o local, a descrição e o valor.
4. Se tiver, preencha o órgão autuador, o número do AIT, os pontos e o vencimento, e anexe a notificação.
5. Toque em "Salvar multa".
6. Leia a mensagem. Ela diz se o sistema achou quem estava com o veículo na hora.

Se o sistema não achou, escolha o condutor na linha da multa e toque em "Indicar". Se a retirada foi lançada depois da multa, toque em "Recruzar". A situação da multa (Aberta, Paga, Recorrida, Cancelada) é escolhida na própria linha.

## 12. Despesas

1. Abra a aba "Abastecimentos e despesas" e vá ao quadro "Despesas por veículo e período".
2. Escolha o veículo, ou deixe "Todos os veículos".
3. Confira "Data início" e "Data fim". Já vêm com os últimos 30 dias.
4. Escolha a categoria, ou deixe "Todas".
5. Toque em "Consultar".

Aparecem os totais de abastecimentos, manutenções, multas e outras despesas, o "Total do período" e a lista de lançamentos.

> **Só o Administrador:** o quadro "Levantamento de valores suspeitos" procura valores que parecem ter sido gravados sem a vírgula (por exemplo, R$ 35.090 no lugar de R$ 350,90). Toque em "Fazer o levantamento". Nada é alterado: corrija o lançamento no lugar onde ele foi feito.

## 13. Histórico e relatório

### Histórico de um veículo

1. Abra a aba "Histórico e relatório".
2. Em "Histórico do veículo", escolha o veículo. O histórico aparece na hora.

### Relatório da frota (gestão)

1. Em "Relatório da frota", escolha um veículo ou deixe "Toda a frota (relatório geral)".
2. Confira as datas.
3. Toque em "Gerar relatório".
4. Aguarde até um minuto. O relatório abre numa aba nova.
5. Para imprimir ou salvar em PDF, toque em "Imprimir ou salvar em PDF" no topo do relatório. Uma cópia (PDF e HTML) fica guardada na pasta "Frota - Relatorios Gerados", na subpasta do veículo ou em "Frota completa".

O relatório por veículo traz identificação, resumo do período com o gráfico dos gastos, análise, retiradas, abastecimentos, despesas, manutenções, documentos e CNH, multas e paradas, avisos e providências, e o espaço para as assinaturas. O relatório geral traz o resumo, a análise, os gráficos de uso e de composição do custo por veículo, as paradas, os avisos e providências e, na última folha (deitada), o quadro de uso e custos de cada veículo. Relatório com mais de três páginas traz o sumário com o número das páginas.

## 14. Cores e selos

| O que aparece | O que quer dizer |
|---|---|
| Botão verde "Devolver" com a placa | Este veículo está com você |
| "Disponível" (verde) | Pode ser retirado |
| "Em uso" (amarelo) | Está com alguém |
| "Em manutenção" ou "Inativo" (cinza) | Não pode ser retirado |
| Selo da foto "Enviada" (verde) | A foto chegou |
| Selo da foto "Sem sinal: nova tentativa em instantes" | O sistema vai tentar de novo sozinho |
| Selo da foto "Não enviada" ou "Não deu para ler" (vermelho) | Toque na foto para tentar de novo, ou remova e tire outra |
| "Tudo OK" verde / "Tem problema" vermelho | Resultado da vistoria |
| Aviso "Vencido" (vermelho) | Prazo vencido ou vencendo hoje |
| Aviso "A vencer" (amarelo) | Vence em até 30 dias |
| Documento "VENCIDO" vermelho, "VENCENDO" amarelo, "OK" verde | Situação da validade |
| Multa: "(automático)" verde, "(manual)" azul, "(conferir)" amarelo, "Não identificado" vermelho | Como o condutor da multa foi definido |

## 15. Erros comuns e o que fazer

| O que aparece | O que fazer |
|---|---|
| "Seu login ainda não tem condutor vinculado" | Peça à gestão para ligar o seu usuário a um condutor (seção 4). Depois abra a Frota de novo |
| KM "Menor que o KM registrado" | Confira o número no painel. Se o registro estiver errado, peça à gestão o ajuste de KM |
| KM "Diferente do KM registrado" | Tire a foto do painel e continue. A gestão confere depois |
| "Esta retirada está com [nome]. Só [nome] ou a gestão podem registrar a devolução" | Peça a essa pessoa para registrar. Se não der, procure a gestão |
| "O veículo [placa] já está retirado por [nome]" ou "não está mais disponível" | Escolha outro veículo |
| "Nenhum veículo disponível agora" | Todos estão em uso. A lista se atualiza sozinha quando alguém devolver |
| "Já estava registrado" / "já estava registrada" | Está tudo certo. Nada foi registrado em dobro |
| "Registro conferido" | O registro foi gravado. Não registre de novo |
| "Justificativa obrigatória" (gestão) | Escreva o motivo em "Justificativa", com pelo menos 15 letras |
| "está no futuro" (gestão) | Corrija a data e a hora, ou deixe vazio para usar a hora atual |
| "Anexe a foto ou o PDF do comprovante do abastecimento." | Anexe o comprovante e salve de novo |
| "Liberação aguardando sinal do carro" ou "Partida não liberada agora" | A retirada já está registrada. Tente ligar em alguns minutos; se não pegar, ligue para a gestão, que usa "Liberar agora" (seção 21) |
| "Devolução não registrada: o rastreador mostra o ... com a ignição ligada" | Estacione, desligue, espere 1 minuto e confirme de novo. Se outra pessoa vai seguir com o carro, use "Passar o carro" (seção 21) |
| "Não foi possível carregar a frota agora" | Confira a internet e toque em "Tentar de novo" |
| O consumo (km/L) não aparece | Precisa de pelo menos 2 abastecimentos do veículo no período |
| "O apelido ... já é do veículo ..." | Escolha outro apelido ou toque em "Sugerir apelido" |
| "A base ... não está na lista de bases da Frota" | Escolha uma base da lista ou inclua a cidade em "Bases da frota" |
| A lista mostra poucos carros | A base escolhida filtra a lista: escolha "Todas as bases" (ou "Todas" no celular) |

## 16. Glossário

| Termo | O que é |
|---|---|
| Vistoria | Conferência dos itens do veículo na retirada e na devolução |
| Retirada em andamento | Veículo que foi pego e ainda não foi devolvido |
| Condutor vinculado | Condutor ligado a um login do SGO+. É o que permite retirar em seu próprio nome |
| Foto do painel | Foto do odômetro. Obrigatória na devolução e quando o KM foge do registrado |
| Registrado pela gestão | Retirada ou devolução que a gestão registrou no lugar do condutor, com justificativa |
| Trilha de auditoria | Lista que guarda quem fez cada registro especial, quando, o antes e o depois e o motivo |
| Vencendo / Vencido | Prazo perto de acabar (até 30 dias) / prazo acabado ou vencendo hoje |
| Parada | Período em que o veículo ficou fora de uso |
| Consumo (km/L) | Quantos quilômetros o veículo roda com 1 litro |
| Cruzamento de multa | Comparação da hora da multa com as retiradas, para achar quem estava com o veículo |
| Bloqueio da partida | Comando do rastreador que corta a bomba de combustível. Só é enviado com o carro conectado, parado e desligado, nunca com retirada aberta (seção 21) |
| Passar o carro | Troca de responsável sem devolução e sem comando ao carro |
| Uso sem registro | Veículo ligado ou andando sem retirada aberta, visto pelo rastreador |
| Apelido | Nome curto do carro (ex.: Onça), único entre os veículos ativos, para não confundir carros iguais |
| Base | Cidade onde o carro fica (ex.: Goiânia, Rio de Janeiro). Filtra as listas, o mapa, as reservas e o Gantt |

## 17. Rastreador: monitoramento, localização e bloqueio da partida

> **21/10/2026:** o bloqueio e a liberação da partida seguem a regra nova da seção 21 (Rastreamento > "Bloqueio da partida"). O que está abaixo sobre "acesso com comandos" é a versão anterior e vale só como histórico.

### Como a tela "Rastreador" está organizada

1. **Para que serve** (no topo): o que o SGO+ faz com o rastreador, em três linhas.
2. **Situação**: se o rastreador está ligado, a hora da última leitura, por quantos dias a localização fica guardada e o que funciona com o acesso de hoje.
3. **O que fazer agora**: a lista do que precisa da gestão, veículo por veículo. Exemplo: "PQB4394 tem sugestão de aparelho: confira no cartão do veículo e clique em Gravar vínculo". Quando está tudo em dia, aparece "Nada a fazer".
4. **Alertas para conferir** (só quando houver): uso sem registro e falha de comunicação.
5. **Veículos e aparelhos**: um cartão por veículo, com o aparelho ligado a ele, a situação agora (parado ou andando, onde está), o hodômetro do aparelho e a última devolução.
6. **Liberar ou bloquear a partida** e **Comandos enviados**: só aparecem quando o acesso com comandos estiver liberado.

### Ligar um veículo ao aparelho do rastreador

1. No cartão do veículo, escolha o aparelho na lista. O aparelho com a placa no nome já vem marcado e o cartão fica verde com "Sugestão".
2. Toque em "Gravar vínculo".
3. Se o aparelho já estava ligado ao veículo, aparece "Vínculo já estava gravado": está tudo certo, nada foi mudado.

### O que o SGO+ faz com o rastreador

- **Uso sem registro:** se o rastreador mostrar o veículo ligado ou andando sem retirada aberta, a gestão recebe um alerta vermelho com placa, hora e local. Descubra quem estava com o veículo. Se foi esquecimento, registre a retirada no lugar do condutor. Depois toque em "Conferido".
- **Parado ou andando:** abaixo de 5 km/h o veículo está parado. Com a ignição desligada, o GPS às vezes marca 5 ou 11 km/h com o carro parado (oscilação normal do sinal): o SGO+ mostra "parado, ignição desligada" e não trata como uso.
- **KM:** o hodômetro do aparelho conta desde a instalação e nunca é igual ao painel (exemplo: aparelho com 26.238 km num carro com 189.561 km). Por isso o SGO+ não compara esses números. Ele guarda o hodômetro do aparelho na retirada e na devolução e compara o **KM rodado**: o informado (chegada menos saída) com o medido pelo aparelho. Se o aparelho não informar o hodômetro, vale a distância que o rastreador mediu no período da retirada. Diferença acima de 20 km (ou de 5%) vai para "KM a conferir".
- **KM do painel estimado:** no cartão do veículo aparece o KM do painel calculado pelo rastreador (hodômetro do aparelho mais a diferença fixa medida na última retirada). Serve só para a gestão perceber uso sem registro; não muda nenhum KM.
- **Ponto de chegada:** na devolução, o SGO+ guarda a hora e o endereço onde o veículo parou. Só a gestão vê, na aba "Rastreador".

### Quando o acesso com comandos for liberado (versão anterior, substituída pela seção 21)

O responsável pelo sistema preenche, em Chaves e senhas > Rastreador da frota, os endereços do comando de bloqueio e de liberação e liga o "Bloqueio da partida pelo SGO+". A partir daí:

- **Na retirada:** ao confirmar, o sistema libera a partida. Se aparecer "Partida não liberada pelo rastreador", a retirada já está registrada: não registre de novo. Ligue para a gestão. O sistema também tenta de novo sozinho.
- **Na devolução:** o bloqueio só é enviado com o veículo parado, a ignição desligada e menos de 5 km/h. Estacione e desligue normalmente.

> **O veículo nunca é bloqueado em movimento.** Se o veículo estiver andando, com a ignição ligada, com o GPS ainda oscilando ou com a posição antiga (mais de 30 minutos), o bloqueio espera. Se esperar mais de 30 minutos, a gestão recebe um alerta.

> **Emergência (a partida não liberou e você precisa sair):** ligue para a gestão. A gestão libera no computador (Frota > aba "Rastreador") ou no celular (Frota > "Opções da gestão" > "Partida do veículo (rastreador)"): escolhe o veículo, escreve a justificativa e toca em "Liberar partida". Também pode liberar pelo aplicativo do rastreador.

### Localização e LGPD

- A guarda dos dados de localização (inclusive de quem dirige) é da Metrolabs.
- Desde 20/10/2026 (decisão da diretoria) o SGO+ guarda a rota de cada veículo: cada posição lida do rastreador vira um ponto da rota, numa tabela própria do servidor. Ficam também o ponto de chegada de cada devolução e o local dos alertas de uso sem registro.
- Depois do prazo de guarda (padrão de 90 dias, ajustável pela gestão em Rastreamento > Privacidade e configuração), os pontos de rota e a localização são apagados sozinhos, uma vez por dia.
- Cada vez que alguém da gestão abre o mapa, consulta uma rota ou gera relatório com localização, fica registrado quem, quando e o quê (Rastreamento > Privacidade e configuração > Quem consultou).
- Quem dirige é avisado na tela de retirada: o veículo é rastreado durante o uso, para quê e por quanto tempo fica guardado. O registro é do veículo, não da pessoa.
- Só a gestão (Administrador, Diretoria, Gestor, RH e Financeiro) vê a localização. A equipe não vê, nem durante a própria retirada: quem está no veículo já sabe onde está.
- Os avisos por e-mail e WhatsApp e a trilha de auditoria não levam o local; ele fica só no SGO+.
- Telefone, número e arquivo da CNH dos condutores também são só da gestão: a equipe vê apenas o nome dos colegas.

## 18. Gestão e melhoria: Kanban, 5 Porquês, plano de ação e indicadores

Aba só da gestão. Serve para tratar o que dá problema na frota e para acompanhar os números do período. Tem duas partes: "Quadro dos casos (Kanban)" e "Indicadores do período".

### Quadro dos casos

Cada caso anda por quatro colunas: **Aberta**, **Em análise**, **Em execução** e **Concluída**.

1. **Aberta** mostra sozinha, sem ninguém digitar: avaria na devolução (item que estava em ordem na retirada e voltou com problema), multa em aberto e manutenção vencida ou a vencer. Toque em "Abrir caso". Se não precisa de tratamento (desgaste normal, por exemplo), toque em "Descartar" e escreva o motivo.
2. Em **Em análise**, toque em "5 Porquês": responda "por que isso aconteceu?" e continue perguntando "por quê?" a cada resposta (no mínimo 3), até chegar a uma causa que a empresa consegue mudar. Escreva a causa raiz e salve.
3. Se a solução foi simples (multa paga, conserto feito), toque em "Concluir" e escreva como foi resolvido.
4. Se precisa de mudança, toque em "Plano de ação (5W2H)": o quê, por quê, onde, quando, quem, como e quanto. A ação vira uma atividade em Minhas atividades para o responsável, com o prazo, e o caso passa para **Em execução**. Para outra ação, toque em "Mais uma ação".
5. Quando as ações forem concluídas em Minhas atividades, toque em "Concluir (verificar)": escreva o que foi conferido e marque se resolveu. Se não resolveu, o caso volta para Em análise (novo ciclo).
6. Se quiser, escreva "O que muda para não repetir" (regra, item do checklist, treinamento).

> **Caso recorrente:** duas avarias no mesmo veículo ou com o mesmo condutor em 180 dias, ou duas multas do mesmo condutor em 12 meses. O cartão mostra "Recorrente" e o caso só pode ser concluído depois dos 5 Porquês.

> **Cores e selos do cartão:** tipo do caso (azul), "Recorrente" e "Prazo do plano vencido" (amarelo), "Multa já paga", "Manutenção já registrada" (verde: pode concluir), "Ciclo 2" (cinza: a primeira ação não resolveu). A faixa P, D, C, A mostra em que passo do ciclo o caso está.

"+ Novo caso" serve para o que não aparece sozinho, por exemplo um barulho no freio relatado pelo condutor. Nada é apagado: o caso descartado fica guardado com quem decidiu, quando e o motivo.

Multa e avaria com condutor identificado também viram sugestão no Programa de conduta, onde a gestão decide se vira ocorrência. Avaria sem caso aberto e multa perto do vencimento aparecem na central de avisos do Início.

### Indicadores do período

1. Escolha o período (30, 90, 180 ou 365 dias).
2. Leia os números do topo: KM rodado, custo por km, consumo médio, disponibilidade, manutenção preventiva no prazo, avarias, multas e casos em andamento.
3. Em "Por veículo" e "Por condutor", veja onde estão os problemas.

| Indicador | Como é calculado |
| --- | --- |
| Custo por km | Abastecimentos, manutenções e despesas avulsas do período divididos pelo KM rodado nas retiradas. A multa fica fora (é do condutor) |
| Consumo médio | KM entre dois abastecimentos do mesmo veículo dividido pelos litros. Precisa de pelo menos 2 abastecimentos |
| Disponibilidade | Dias do período em que o veículo não estava em parada registrada |
| Preventiva no prazo | Manutenção feita até a data ou o KM da "próxima troca" da manutenção anterior do mesmo tipo |
| Avarias por 1.000 km | Avarias na devolução divididas pelo KM rodado, vezes 1.000 |
| Eficácia dos planos | Casos com plano em que a verificação disse "resolveu", sobre os verificados |

## 19. Rastreamento: mapa ao vivo, rotas, combustível, relatórios, Gantt e copiloto

Aba "Rastreamento", só da gestão (Administrador, Diretoria, Gestor, RH e Financeiro). Tem seis partes, nos botões do topo da aba. Nada aqui manda comando ao veículo: o acesso ao rastreador é só de leitura.

> **Rastreador não configurado?** A tela diz o que falta. Quem configura é o responsável pelo sistema, em Configurações > Chaves e senhas > Rastreador da frota (chave de acesso e "Rastreador ligado no SGO+"). Depois volte e toque em "Atualizar".

### Mapa ao vivo

1. Abra a aba "Rastreamento". O mapa abre com todos os veículos que têm aparelho ligado.
2. Cada veículo aparece com a cor da situação; a lista ao lado (embaixo, no celular) mostra placa, situação, condutor da retirada aberta, velocidade em km/h, local e a hora da última posição.
3. Com a tela aberta, o mapa se atualiza sozinho a cada 30 segundos (limite da empresa do rastreador). Nada que você estiver digitando é apagado.
4. Toque num veículo da lista para centralizar o mapa nele.

| Cor | Situação |
| --- | --- |
| Azul | Em uso, com retirada registrada |
| Vermelho | Andando sem retirada registrada (uso sem registro) |
| Amarelo | Parado com a ignição ligada e sem retirada |
| Verde | Parado |
| Cinza | Sem sinal há mais de 30 minutos |

### Rotas

1. Em "Rotas", escolha o período e toque em "Buscar retiradas", ou escolha um veículo e toque em "Ver rota do período".
2. Na lista de retiradas, toque em "Ver rota": o trajeto aparece no mapa (em vermelho os trechos acima do limite de velocidade), com saída, chegada e paradas numeradas.
3. Abaixo do mapa: km do trajeto, tempo em movimento e parado, velocidade máxima, trechos acima do limite, paradas de 5 minutos ou mais e, quando o condutor tem atendimentos no Auvo, o deslocamento até cada um.
4. "Relatório A4" gera o relatório de rota da retirada para imprimir (fica salvo em PDF e HTML).

A empresa do rastreador não informa trânsito. O SGO+ mostra o que os pontos permitem: velocidade, paradas, horários e uso fora do expediente. Trânsito em tempo real exigiria um serviço pago de mapas.

### Combustível e KM

1. Escolha o período e toque em "Calcular".
2. "Consumo por veículo": km/L do período, a média do próprio veículo e o desvio. Vermelho = gastou mais que a média além do limite configurado (padrão 15%): revise o veículo.
3. "Capacidade do tanque": informe os litros do tanque de cada veículo para o SGO+ apontar abastecimento com litros acima da capacidade.
4. "Abastecimentos a conferir": litros acima do tanque, rendimento muito abaixo da média, sem comprovante e, com a hora informada, se o veículo estava parado no horário (marque "Conferir com a posição do veículo").
5. "KM por condutor": km informado nas retiradas do período.
6. "Pedir comprovante": escolha veículo e condutor, escreva o que ele deve enviar e o prazo. O condutor recebe uma atividade em Minhas atividades (cobrança no sistema até enviar, no e-mail de resumo do dia e na contagem do WhatsApp de resumo do dia, se for CLT). Ele envia em Frota > Abastecimentos e despesas > "Comprovantes pedidos a você"; o pedido e a atividade fecham sozinhos.

Consumo pelo método do tanque cheio: os km entre dois abastecimentos divididos pelos litros do segundo. Abastecimento parcial distorce o resultado daquele intervalo. O registro de abastecimento ganhou o campo "Hora (opcional)": com ela o SGO+ confere a posição do veículo no horário.

### Relatórios

Quatro relatórios A4 para imprimir, salvos em PDF e HTML na pasta "Frota - Relatorios Gerados/Rastreamento": rota da retirada, mensal do veículo (km, consumo, custos, paradas, excessos, manutenção), consumo da frota e uso fora do expediente.

### Aparelhos e alertas

É a tela do rastreador descrita na seção 17: ligar veículo e aparelho, alertas de uso sem registro e de conexão.

### Privacidade e configuração

- Prazo de guarda das rotas (padrão 90 dias), limite de velocidade (padrão 110 km/h), expediente da frota (padrão 07:00 a 19:00, segunda a sexta; feriados contam como fora) e desvio de consumo aceito (padrão 15%).
- "Quem consultou": a trilha de quem abriu o mapa, viu rotas ou gerou relatório com localização.

### Gantt da frota e copiloto (aba Gestão e melhoria)

- **Gantt da frota:** por veículo, no tempo. Cada veículo tem as sub-linhas "Planejado" (reservas e manutenção programada), "Realizado" (retiradas, listrada se em andamento, e paradas) e, quando houver, "Marcos" (losangos de manutenção prevista pela data ou pelo KM, pela média de km por dia, e de documento que vence). A última linha mostra as ações dos planos (Minhas atividades).
  - Escala "Dia" (uma marca por hora), "Semana" (um dia por coluna; abre de 7 dias antes a 14 dias depois de hoje) ou "Mês" (um rótulo por semana); "‹ Anterior", "Hoje" e "Próximo ›" andam no tempo; "De" e "Até" escolhem outro período (até 190 dias). Sábados e domingos ficam em cinza; a linha vermelha é agora.
  - O que acontece ao mesmo tempo fica um embaixo do outro, nunca por cima. Várias retiradas curtas que se encostam na escala escolhida viram um bloco só ("7 retiradas"); tocando nele aparece a lista e o botão "Ver este dia um a um". Evento de poucas horas tem largura mínima e um ponto no meio.
  - O nome fica dentro da barra só quando cabe inteiro (o nome curto, como "Ana T.", quando o inteiro não cabe); senão, ao lado ou só no balão. Passar o mouse ou tocar numa barra ou losango abre o balão com condutor, saída, devolução, KM e situação (na reserva: código, condutor, período e situação). Toque fora, em "×" ou Esc fecha.
  - Veículos sem nada no período aparecem numa linha só, embaixo do quadro. A legenda é agrupada em Planejado, Realizado e Marcos, com as mesmas cores das barras.
  - No celular a tela abre em "Lista": um cartão por veículo, com os eventos de cada dia (toque num item para ver o detalhe). Em "Gráfico", o quadro desliza para os lados por dentro e a placa fica fixa; a página não rola para o lado.
- **Copiloto de sugestões:** o SGO+ lê os dados do período e sugere ações: veículo gastando mais combustível que a média, abastecimento a conferir, condutor com trechos acima do limite, uso fora do expediente, uso sem registro repetido, manutenção próxima pelo KM estimado do rastreador, aparelho sem sinal e muito KM sem abastecimento lançado. Marque "Pedir ajuda da IA" para a IA ordenar e escrever a recomendação com os mesmos números (texto com número que não está nos dados é trocado pelo das regras).
- Toda sugestão é só sugestão: "Abrir caso no Kanban", "Lançar atividade" (Minhas atividades), "Pedir comprovante" ou "Descartar" com o motivo. Decidida, ela não volta no mesmo mês.

Excesso de velocidade numa retirada e comprovante pedido e não enviado no prazo também viram sugestão no Programa de conduta, onde a gestão decide. Uso sem registro não vira sugestão para ninguém: o rastreador sabe onde o veículo estava, não quem dirigia.

### Comprovantes pedidos a você (toda a equipe)

1. Abra a Frota, aba "Abastecimentos e despesas".
2. No quadro amarelo "Comprovante pedido a você", preencha data, KM, litros e valor (hora e posto, se souber).
3. Em "Foto da nota ou PDF", tire a foto ou escolha o arquivo e toque em "Enviar comprovante". O pedido some e a atividade é concluída sozinha.

## 20. Reservas de veículo

A reserva garante o veículo para quem já tem compromisso marcado (viagem, atendimento no cliente). Ela existe para que ninguém chegue para uma viagem e encontre o carro retirado por outra pessoa. Fica na aba **Reservas** da Frota, para toda a equipe interna (no celular, botão "Reservas: agenda e reservar um veículo").

### Reservar

1. Abra a Frota, aba "Reservas", e toque em "Reservar um veículo" (ou toque num espaço vazio da agenda).
2. Preencha o início e a devolução prevista (data e hora).
3. O campo "Veículo" já sugere o primeiro veículo livre no período; os ocupados aparecem com o motivo.
4. Escreva o destino e o motivo. Passageiros e "Ligar a" (O.S. do Auvo, atividade ou cliente) são opcionais.
5. Toque em "Reservar". Aparece o código da reserva (RV-AAAA-NNNN).

Quem pode: qualquer condutor ativo com a CNH válida até o fim da reserva, sem aprovação. A gestão (Administrador, Diretoria, Gestor, RH ou Financeiro) reserva em nome de outra pessoa (ela é avisada), lança a manutenção programada e cancela ou troca o veículo de qualquer reserva com justificativa.

### Regras

| Regra | Como funciona |
|---|---|
| Sem sobreposição | O mesmo veículo não tem duas reservas no mesmo horário, nem reserva sobre manutenção programada, parada ou retirada em andamento. O sistema mostra os livres no mesmo período. Uma pessoa não segura dois veículos ao mesmo tempo. A conferência final é feita dentro da trava do sistema, relendo o banco. |
| A retirada respeita a reserva | Ao retirar, informe a devolução prevista. Se o veículo tem reserva de outra pessoa (ou manutenção programada) começando antes da devolução prevista mais a folga (1 hora), a retirada é recusada com quem reservou, quando e os veículos livres agora. Só a gestão libera, com justificativa; quem reservou é avisado na hora com a sugestão de outro veículo. A liberação não vira registro "pela gestão" nem sugestão no Programa de conduta. |
| Dono da reserva | Retira normalmente a partir de 2 horas antes do início; a reserva passa a "em uso" e, na devolução, a "concluída". |
| Devolução atrasada com reserva a seguir (próximas 24 h) | Cobrança ao condutor atual no sistema e em Minhas atividades (atividade urgente, concluída sozinha na devolução); WhatsApp só se a reserva for no mesmo dia (exceção S44 da matriz de avisos: vínculo CLT, dia útil, horário de trabalho, no máximo uma por dia). Quem reservou recebe e-mail na hora; o gestor da Frota vê na Caixa de decisões. Se a reserva começar com o veículo fora, conta como "atraso que afetou reserva" e vira só sugestão no Programa de conduta. |
| Véspera | Último dia útil antes do início, a partir das 14:00: lembrete ao reservante (sistema; e-mail no expediente) e conferência do veículo (ativo, sem parada ou manutenção no período, sem manutenção vencida, documentos e CNH válidos, veículo de volta a tempo). Problema avisa o reservante e a gestão, com os livres para troca; problema que aparece depois avisa de novo. |
| Não comparecimento | Sem retirada até 1 hora depois do início, a reserva vira "não utilizada" e o veículo fica livre (o reservante é avisado). Se o veículo ainda estava fora com outra pessoa, a tolerância conta da devolução. |
| Nada é apagado | Canceladas, não utilizadas e concluídas ficam no histórico, com quem e quando. |

As regras de tempo (folga, tolerância, antecipação, hora do lembrete, antecedência e duração máximas) ficam em Reservas > Regras (gestão).

### Telas

- **Agenda**: semana ou dia, uma linha por veículo. Verde: sua reserva; azul claro: de outra pessoa; laranja: manutenção programada; azul forte: retirado agora; vermelho: devolução atrasada; cinza: parada. No celular a semana vira uma lista por dia.
- **Minhas reservas**: cancelar (com o motivo) e trocar o veículo (só os livres no mesmo período).
- **Todas as reservas, Indicadores e relatório, Regras** (gestão): cumpridas, não utilizadas, canceladas, retiradas bloqueadas, liberações, atrasos que afetaram reserva, pedidos recusados por sobreposição, por veículo, por condutor e por dia da semana; relatório A4 de uso e reservas do mês (HTML e PDF em "Frota - Relatorios Gerados/Reservas").
- **Tela de retirada**: o cartão do veículo mostra a próxima reserva ("Reservado para ... · devolva até ..."); o passo "Devolução prevista" já vem preenchido (fim da sua reserva ou fim do expediente).
- **Gantt da frota** (Gestão e melhoria): reservas na sub-linha "Planejado", retiradas na sub-linha "Realizado" de cada veículo.
- **Copiloto**: sugere ação para veículo disputado, dia da semana de pico, reservas não utilizadas e atrasos recorrentes de um condutor, e liberações frequentes.
- **COMMAND**: tela "Reservas de veículo" para quem tem a conta ligada ao SGO+ (minhas reservas, livres, reservar, cancelar; a gestão vê a agenda), pela ponte assinada, com as mesmas regras.

## 21. Bloqueio e liberação da partida (21/10/2026)

Regra aprovada pelo dono a partir do estudo de 12.000 situações simuladas: **a partida só pega com a retirada registrada, e o motor nunca é cortado com alguém dirigindo.**

### A regra, em poucas linhas

1. **Retirada aberta = carro liberado, sempre**, mesmo em viagem de dias. A retirada manda "liberar" ao rastreador e confere. Se o carro estiver sem sinal, aparece "liberação aguardando sinal" para o condutor e para a gestão.
2. **Devolução só com o carro desligado e parado.** A devolução pede o bloqueio, que só é enviado com o aparelho conectado agora (online na iTracker e com contato nos últimos 2 minutos), a última posição do carro parada e com a ignição desligada e nenhuma retirada aberta. Com o carro desligado o rastreador economiza e só manda posição quando o carro liga, por isso a última posição pode ser de horas antes: com o aparelho conectado, se alguém ligasse o carro viria posição nova. Aparelho offline ou situação desconhecida: o bloqueio não sai. Senão o SGO+ espera e confere de novo a cada 2 minutos. Uma nova retirada cancela o pedido.
3. **Devolução fora da base:** o SGO+ não bloqueia sozinho; a gestão decide na Caixa de decisões (bloquear ou não).
4. **Passar o carro:** troca de responsável sem devolução e sem comando, só para quem tem autorização de dirigir (condutor ativo com CNH válida). Quem recebe toca em "Assumi o carro"; quem está com o carro confirma no aplicativo, ou a gestão autoriza.
5. **Retirada esquecida:** carro parado na base há 1 hora com a retirada aberta = o SGO+ pergunta ao condutor ("Você ainda está com o ...? Devolver / Continuar"). Sem resposta em mais 1 hora, vai para a Caixa de decisões. A gestão só encerra com o carro parado, desligado, na base e com sinal. Enquanto aberta, ninguém retira esse carro: quem precisar pede "Assumir o carro".
6. **Carro andando sem retirada:** nunca recebe bloqueio andando; a gestão é avisada na hora (uso sem registro).
7. **Conferência a cada 2 minutos:** o que deveria estar (liberado ou bloqueado) contra o relé do carro; reenvia só nas condições seguras, respeitando o limite do rastreador e sem repetir o mesmo comando sem resultado.
8. **Emergência:** "Liberar agora" (Administrador, Diretoria, Gestor e RH), com motivo, vale 24 horas ou até a devolução. Bloqueio de roubo só a Diretoria, com dupla confirmação; com o carro andando, só aceitando o risco de forma explícita.
9. **Odômetro do rastreador:** se o KM do painel na devolução e o do rastreador diferirem mais de 2% e mais de 50 km, a gestão recebe o aviso (só no sistema). O Gestor ou o Administrador confere a foto e toca em "Acertar o odômetro do rastreador". O SGO+ nunca acerta sozinho.
10. **Triagem do sinal:** a cada 2 minutos o SGO+ anota se o aparelho está conectado à iTracker (situação e último contato) e onde o carro está parado. Com 24 horas desse histórico, mede, em cada local onde o carro costuma ficar, a parte do tempo conectado e quanto demora, em média, para reconectar (até lá, "sem dados" e vale a regra normal). Não usa o intervalo entre posições, que confundia a economia do rastreador desligado com falta de sinal (corrigido em 22/10/2026). Carro que dorme onde o sinal cai fica em **Só avisa**: o SGO+ nunca manda bloqueio para ele.
11. **Modos de cada carro:** **Ativo** (manda o comando de verdade), **Simulação** (faz tudo e registra o que teria feito, sem mandar nada) e **Desligado**. No piloto, o Onix começa em Ativo e os outros em Simulação. O Ativo só manda comando de verdade depois de o responsável pelo sistema gravar a "Chave de acesso dos comandos" e ligar "Bloqueio da partida pelo SGO+" (Chaves e senhas > Rastreador da frota).
12. **Registro inviolável:** cada pedido, comando, simulação, confirmação e decisão fica gravado com quem, quando, a condição do carro e a resposta do rastreador. Cada linha leva o resumo da anterior; "Conferir a integridade" mostra se alguma foi alterada ou apagada. Às 18h, a gestão da Frota e a Diretoria recebem por e-mail o relatório do dia (o que aconteceu e o que a simulação teria feito).

### Para o condutor (celular)

- **Retirar e devolver:** como sempre. Antes de devolver, desligue o carro.
- **Passar o carro:** embaixo do botão "Devolver", toque em "Passar o ... para outra pessoa (sem devolver)", escolha a pessoa e confirme. Entregue a chave.
- **Assumi o carro:** quando alguém passar o carro para você, aparece o aviso; toque em "Assumi o carro" e digite o KM do painel.
- **Assumir o carro:** se você vai seguir com um carro que está com outra pessoa, abra "Em uso por outras pessoas" e toque em "Assumir o ...". Quem está com ele confirma (ou a gestão autoriza).
- **Sem internet:** passar e assumir ficam guardados no celular com a hora e vão sozinhos quando a internet voltar. A tela avisa quantos pedidos estão guardados.
- **"Você ainda está com o ...?"**: toque em "Devolver" (se terminou) ou "Continuar com ele".

### Para a gestão (Rastreamento > "Bloqueio da partida")

- **Carros:** um cartão por carro com modo, triagem do sinal, quem está com ele, partida no carro (liberada ou bloqueada, lida no rastreador), sinal, situação, base, último comando e pendência. A tela não se atualiza sozinha: toque em "Atualizar".
- **Decisões pendentes:** devolução fora da base (Bloquear / Não bloquear), retirada esquecida (Encerrar a retirada), passagem do carro (Autorizar / Recusar) e odômetro diferente do painel (Acertar o odômetro do rastreador). Todas pedem justificativa e também aparecem na Caixa de decisões.
- **Áreas das bases:** escolha a base, use a posição de um carro estacionado nela (ou digite latitude e longitude), confira o raio (padrão de 300 m) e grave. Sem a área, toda devolução vai para a decisão da gestão.
- **Registro e relatório:** "Conferir a integridade" e "Relatório de hoje".
- **Celular da gestão:** Frota > "Opções da gestão" > "Partida do veículo (rastreador)" > "Liberar agora (emergência)".

> **Por que o bloqueio não sai na hora da devolução?** Porque um comando aceito com o carro sem conexão fica na fila do rastreador e executa quando o carro reconecta, talvez com outra pessoa dirigindo. Por isso o SGO+ só manda com o aparelho conectado agora, o carro parado e desligado, e trata o comando que ficou na fila como não executado.

## Enviar o documento por e-mail ou WhatsApp (20/10/2026)

Os relatórios da frota são documentos internos: depois de gerar, a barra "Documento salvo" mostra o botão "Enviar"; a janela "Enviar documento" oferece as pessoas da equipe (e-mail e celular do cadastro de Usuários) ou o destinatário digitado. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Avisos da Frota pela matriz de avisos (21/10/2026)

| Aviso | Quem recebe | Canal |
|---|---|---|
| Retirada ou devolução registrada em seu nome pela gestão | Condutor | Sistema e e-mail de resumo do dia (sem WhatsApp) |
| Veículo em uso sem registro (rastreador) | Gestor da Frota | E-mail e WhatsApp na hora, no expediente; fora dele, no resumo do dia seguinte |
| Partida não liberada pelo rastreador | Gestor da Frota | WhatsApp na hora, no expediente (o condutor está esperando) |
| Bloqueio da partida pendente há 30 minutos | Gestor da Frota | E-mail na hora |
| Reserva cancelada, trocada de veículo, lembrete da véspera, problema na reserva, devolução atrasada (a quem reservou) | Reservante | E-mail na hora |
| Veículo da sua reserva de hoje liberado a outra pessoa | Reservante | E-mail e WhatsApp na hora (mesmo dia, expediente, CLT) |
| Devolução atrasada com reserva no mesmo dia | Quem está com o veículo | WhatsApp na hora (expediente, CLT, uma por dia) |
| Reserva feita pela gestão em seu nome, reserva não utilizada, problema na reserva (à gestão), CNH vencendo | Reservante, condutor ou gestor da Frota | E-mail de resumo do dia |
| Abastecimento sem comprovante há mais de 1 dia útil (S75, 30/10/2026) | Condutor | Sistema e e-mail na hora (no expediente); WhatsApp só na contagem do resumo do dia |
| Abastecimento sem comprovante há mais de 1 dia útil (S76, 30/10/2026) | Gestor da Frota | E-mail de resumo do dia |
| Veículo da sua reserva devolvido, devolução atrasada (à gestão) | Próximo reservante, gestor da Frota | Só no sistema (Caixa de decisões) |

O gestor da Frota é o da área Administrativo em Caixa de decisões › Regras e responsáveis (sem gestor, a Diretoria). PJ e vínculo não informado não recebem WhatsApp. Detalhes em `docs/MANUAL_MATRIZ_DE_AVISOS.md`.
