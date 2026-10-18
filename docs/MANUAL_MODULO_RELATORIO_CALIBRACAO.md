# Manual do Operador — Módulo Relatório de Calibração

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- O relatório é salvo sozinho na pasta do cliente. Depois aparece o quadro "Vincular ao Cadastro" para ligar o documento ao equipamento do Inventário. Os perfis Comercial e Financeiro só consultam.


### Instrumentos simples calibrados no laboratório da Metrolab's — certificado + fotos, relatório explicado de forma didática

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 11) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você anexa o **certificado de calibração real** de um instrumento simples (termômetro, balança, esfigmomanômetro, etc.), o sistema **lê o certificado automaticamente** e escreve um relatório inteiro, com Inteligência Artificial, explicando de forma didática cada resultado — sem arredondar nem reescrever nenhum número.

Este é um módulo **separado** da Declaração de Execução de Serviço e do Relatório de QI/QO/QD: aqui **não existe etapa de instalação ou operação** — são instrumentos de bancada ou de bolso, calibrados principalmente **no laboratório da própria Metrolab's** (diferente do resto do Portal, que assume atendimento em campo por padrão).

---

## 2. Os 9 tipos de instrumento

Você escolhe **um** instrumento na tela (campo "Instrumento", seção 2).

| Instrumento | Peças calibráveis (certificados separados) |
|---|---|
| **Termo-higrômetro** | 1 certificado só |
| **Termômetro** | 1 certificado só |
| **Esfigmomanômetro** | 1 certificado só |
| **Balança** | 1 certificado só |
| **Centrífuga (sem refrigeração)** | Temporizador/Cronômetro do ciclo **+** Indicador de Rotação (RPM) — 2 certificados separados |
| **Centrífuga Refrigerada** | Temporizador/Cronômetro do ciclo **+** Indicador de Rotação (RPM) **+** Sensor de Temperatura — 3 certificados separados |
| **Incubadora de Testes Biológicos** | 1 certificado só |
| **Estufa de Incubação (bancada de laboratório)** | 1 certificado só |
| **Banho-maria (bancada de laboratório)** | 1 certificado só |

**Por que a Centrífuga tem mais de um certificado?** Porque, na prática, o temporizador, o indicador de rotação e (na versão refrigerada) o sensor de temperatura são calibrados como peças separadas, cada uma com seu próprio certificado emitido pelo laboratório de calibração. O sistema mostra **um campo de upload para cada peça** — nunca junte vários certificados num arquivo só, isso pode confundir a leitura automática de qual dado pertence a qual peça.

---

## 3. Mapa da tela — visão geral

1. **Cliente** — quem é o dono do instrumento.
2. **Instrumento** — qual instrumento foi calibrado, com quais dados, e onde a calibração foi feita.
3. **Certificado e Fotos** — os certificados de calibração (obrigatório ao menos um), fotos opcionais, e o botão que gera o relatório.
4. **Documentos já gerados** — busca de relatórios antigos.

---

## 4. Seção 1 — Cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Preenche automaticamente nome e endereço | Digite o CNPJ e clique em "Buscar CNPJ" |
| **Buscar CNPJ** (botão) | Dispara a busca automática | Evita digitar manualmente | Clique depois de digitar o CNPJ |
| **Cliente / Razão Social** | Nome oficial da empresa | Aparece na capa do documento | Confira depois da busca; corrija manualmente se necessário |
| **Endereço** | Endereço da empresa | Aparece na capa do documento | Mesma lógica |

---

## 5. Seção 2 — Instrumento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Instrumento** (dropdown) | O tipo de instrumento calibrado (seção 2 deste manual) | Define quantos slots de certificado aparecem na seção 3 | Escolha **antes** de anexar qualquer certificado — trocar depois reconstrói os campos de certificado e você perderia o arquivo já anexado |
| **TAG / Identificação** | Código interno do instrumento no cliente | Identifica qual instrumento específico foi calibrado | Copie do instrumento físico ou peça ao cliente |
| **Marca** / **Modelo** | Fabricante e modelo | Identificação no documento | Digite conforme a placa |
| **Localização habitual do instrumento** | Onde o instrumento fica normalmente | Rastreabilidade | Digite o local |
| **Data da calibração** | Data em que a calibração foi realizada | Aparece no documento | `dd/MM/aaaa` |
| **Técnico responsável** | Quem realizou a calibração | Responsável no documento | Nome completo |

### Local da calibração

| Campo | O que é | O que fazer |
|---|---|---|
| **Realizado no laboratório da Metrolab's** (já vem marcado) | Diz se a calibração foi feita no laboratório ou no cliente | **Diferente dos outros módulos do Portal**, aqui a caixa já vem **marcada** por padrão, porque a maioria das calibrações deste tipo é feita no laboratório. Desmarque só nos casos raros em que foi feito nas instalações do cliente — isso muda a redação do relatório |

### Observações do técnico (opcional)

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Observações do técnico sobre esta calibração** | Texto livre | Enriquece o relatório com contexto real (ex.: condição do instrumento antes da calibração, particularidades do atendimento) | Escreva livremente — a IA usa isso como contexto adicional, nunca como substituto dos dados do certificado |

---

## 6. Seção 3 — Certificado e Fotos

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Detectar automaticamente os dados do certificado** (caixa de marcar, já vem marcada) | Liga a leitura automática do certificado pela IA | Assim que você anexa o certificado, o sistema lê e **preenche sozinho** cliente, TAG, marca, modelo, número do documento, data da calibração e técnico responsável | Deixe marcado no uso normal. Desmarque só se quiser preencher tudo manualmente |
| **Certificado(s) de calibração** (1 slot por peça calibrável, PDF ou imagem — obrigatório ao menos 1) | O certificado real emitido pelo laboratório de calibração | A IA lê o certificado e escreve o relatório inteiro com base nos dados reais dele | Anexe o certificado de cada peça. **Nunca junte vários certificados num arquivo só** quando o instrumento tiver mais de uma peça calibrável |
| **Registros fotográficos** (até 6, opcional) | Fotos do instrumento/calibração | A IA analisa cada foto automaticamente e gera uma legenda descritiva sozinha | Anexe as fotos relevantes — a legenda de texto é só um complemento opcional |
| **Número do documento** (opcional) | Código de referência interno | Numeração/controle interno | Preencha só se tiver um código — não é uma data |

> **O que acontece quando você anexa um certificado com "Detectar automaticamente" marcado?** Aparece uma mensagem "Detectando dados do certificado automaticamente..." e, em poucos segundos, os campos da seção 2 são preenchidos sozinhos (só os que estavam vazios — o sistema nunca sobrescreve algo que você já tinha digitado). Se a detecção falhar, aparece um aviso pedindo para preencher manualmente — isso não impede você de continuar, só significa que você preenche os campos você mesmo.

---

## 7. Gerar Relatório de Calibração

Diferente da Declaração de Execução e do Relatório de QI/QO/QD, este módulo **não tem uma etapa separada de rascunho/revisão** — um único clique já vai direto para o documento final.

1. Clique em **"Gerar Relatório de Calibração"**.
2. Uma nova aba abre imediatamente, mostrando "Gerando relatório de calibração, aguarde...".
3. O sistema lê o(s) certificado(s) e as fotos, e pede à Inteligência Artificial para escrever o relatório inteiro — isso pode levar até 1 minuto.
4. A aba é preenchida com o documento final completo, pronto para imprimir ou salvar como PDF.
5. Na tela original, aparece um botão **"Salvar no Drive"** — clique para salvar uma cópia em PDF na pasta do cliente.

**O que acontece se eu não anexar nenhum certificado?** O sistema recusa gerar o relatório e avisa: "Anexe ao menos um certificado de calibração (PDF ou imagem) antes de gerar o relatório." É uma exigência do sistema — sem certificado real, não há relatório.

---

## 8. Documentos já gerados

Busque relatórios de calibração já salvos, por cliente, TAG ou nome do arquivo — sem precisar gerar de novo.

---

## 9. Passo a passo — gerando um relatório do zero

1. Abra o módulo. Espere o selo de status virar "pronto".
2. **Seção 1:** CNPJ, buscar, conferir cliente/endereço.
3. **Seção 2:** escolha o instrumento certo **antes** de qualquer upload. Se souber os dados de antemão, pode preencher TAG/marca/modelo/localização/data/técnico — senão, deixe para a detecção automática preencher.
4. **Seção 3:** com "Detectar automaticamente" marcado, anexe o(s) certificado(s) — um por peça calibrável, se o instrumento tiver mais de uma. Confira os campos preenchidos automaticamente. Anexe fotos se quiser. Preencha observações do técnico e número do documento se aplicável.
5. Clique em **"Gerar Relatório de Calibração"** e aguarde — o documento abre em nova aba assim que pronto.
6. Clique em **"Salvar no Drive"** se quiser guardar uma cópia em PDF.

---

## 10. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| "Anexe ao menos um certificado..." ao clicar em gerar | Nenhum certificado foi anexado, ou o upload falhou | Confira se o arquivo foi realmente selecionado antes de gerar |
| A detecção automática não preencheu nada | Certificado ilegível, ou formato muito diferente do esperado | Preencha os campos manualmente — o relatório funciona do mesmo jeito |
| Troquei o instrumento e o certificado que eu tinha anexado sumiu | Comportamento esperado — trocar de instrumento reconstrói os slots de certificado | Escolha o instrumento certo **antes** de anexar qualquer certificado |
| A data/cliente detectados automaticamente vieram errados | O certificado real tinha esse dado diferente do que você esperava, ou a leitura confundiu algum campo | Revise e corrija manualmente antes de gerar — a detecção automática é um ponto de partida, não a palavra final |

---

## 11. Glossário

| Termo | Explicação simples |
|---|---|
| **Instrumento** | O tipo de equipamento de medição calibrado (termômetro, balança, etc.) |
| **Certificado de calibração** | Documento oficial emitido pelo laboratório de calibração, com os dados reais da calibração |
| **Peça calibrável** | Uma parte específica de um instrumento composto (ex.: temporizador de uma centrífuga) que recebe seu próprio certificado |
| **Detecção automática** | Recurso que lê o certificado anexado via IA e preenche os campos da tela sozinho |
| **Rastreabilidade metrológica** | A garantia documentada de que a calibração de um instrumento está ligada, por uma cadeia de comparações, a um padrão nacional/internacional reconhecido |

---

*Este manual descreve o módulo Relatório de Calibração tal como implementado em 2026-07-27. Se a tela mudar no futuro (novos instrumentos, novos campos), este documento precisa ser atualizado junto.*
