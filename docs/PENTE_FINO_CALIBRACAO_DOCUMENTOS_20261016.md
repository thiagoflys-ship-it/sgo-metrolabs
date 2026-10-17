# Pente fino — Calibração e documentos técnicos (16/10/2026)

Escopo: Certificado de calibração (CertCal, incluindo relatórios gerenciais), Relatório de calibração (RelCal), Laudo NR-13, Declaração de execução, Relatório QI/QO/QD, PGT e POP, Planejamento CME, Cronograma de execução e Registros operacionais.

Ambiente: cópias de `sgo_servidor/dados/dev/pglite` em `%TEMP%` (sgo_cal, sgo_nr13, sgo_pgt, sgo_cron), servidor com `SGO_ENSAIO=1 SGO_AGENDADOR=0` nas portas 8104–8107, legado = pasta do Portal. Testado por chamadas HTTP aos dispatchers e com o Playwright clicando nas telas (admin e usuários de outros perfis, inclusive CLIENTE com CLIENTE_ID, criados só nas cópias). Documentos gerados de fato e lidos (HTML/PDF, A4). Sem chave Gemini nas cópias: o caminho "sem chave" foi testado em todos os módulos. Todos os servidores foram parados. Nada publicado no Google.

Mensagem padrão para chave de IA ausente, aplicada em todos os módulos: "A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo." (antes citava "Propriedades do script", que não existe no servidor novo). Lógica da IA e thinking não foram alterados.

## Achados graves (todos corrigidos)

| # | Módulo | Achado |
|---|---|---|
| 1 | Certificado de calibração | Certificado era emitido com padrão **vencido** na data da calibração (rastreabilidade quebrada). Agora bloqueia, com mensagem que diz o padrão, a validade, a data e o que fazer. |
| 2 | NR-13 | Grupo de potencial de risco usava ">" onde a NR-13 usa "≥": P.V = 1 caía no grupo 5 (vaso classe C 10 bar × 1.000 L saía categoria V em vez de IV, com prazo de inspeção maior que o permitido). |
| 3 | NR-13, Declaração, QI/QO, PGT/POP, Planejamento CME, Cronograma, Registros | O perfil CLIENTE usava a API desses módulos (o menu só escondia). Cliente lia laudo NR-13 de outra empresa por CNPJ/ID e listava PDFs de qualquer CNPJ nos Registros/PGT. Agora os dispatchers recusam CLIENTE com mensagem clara. |
| 4 | PGT/POP e Planejamento CME | O setup, que roda sozinho quando falta a propriedade da pasta de PDFs, **apagava** as abas de dados (histórico de PGT/POP, planejamentos, receitas, clientes) e criava outra pasta raiz. Agora só preenche aba vazia e reaproveita a pasta existente. |
| 5 | NR-13 | Nenhum equipamento já cadastrado podia ser laudado (tipo "AUTOCLAVE" × "Autoclave" na lista) e "1.000" L era lido como 1 L. |
| 6 | NR-13 | PH fora da lista era aceito e o laudo saía assinado por outra pessoa; data de próxima inspeção inválida virava "término + 1 ano" sem aviso e sem limite pelo prazo da categoria. |
| 7 | QI/QO/QD | Incerteza do certificado arredondada (0,035 °C saía 0,04 °C). |
| 8 | Cronograma | Feriado nacional contava como dia útil; documento com datas sem ano. |
| 9 | Registros operacionais | Etapa de consulta/pendências inacessível pela tela; sem IA não era possível criar tipo de documento. |

## Certificado de calibração (CertCal)

| Página/função | Testado | Achado | Corrigido | Pendente |
|---|---|---|---|---|
| Cálculo (CertCalCalculo) | Conferido à mão: uA = s/√n, uB = U95/K, Welch-Satterthwaite, K t-Student 95,45 %. Ex.: 121,2/121,3/121,1 com padrão U95 0,15 K 2 → uc 0,0946, Veff 14,45, K 2,19, U95 0,21. Leituras iguais → Veff ∞, K 2,00. Teto Veff ≥ 1e7 e exibição ∞ a partir de 10.000 funcionam. Milhar pt-BR "1.234,5" lido certo. | Orçamento não inclui resolução do instrumento (já declarado nas observações do certificado). | — | Responsável técnico: decidir se inclui a componente de resolução (mudaria valores; não alterado). |
| Emissão | Gerado de verdade com 1 e 2 blocos, padrão válido, vencido, sem validade, data futura. | Padrão vencido aceito; data da calibração no futuro aceita; validade inválida no cadastro gerava erro confuso ("Data inválida") sem dizer qual padrão. | Bloqueio de padrão vencido na data da calibração (validade ≥ data da calibração passa, mesmo se hoje estiver vencido); data futura recusada; validade inválida bloqueia citando o padrão; padrão sem validade emite com aviso na tela. `SGO_CertCal_Main.js`. | — |
| Documento A4 | Lido o HTML e o PDF salvo (pasta "Certificado de Calibracao - Documentos Gerados/<cliente>", com .html ao lado). | Tabela de padrões repetia o mesmo padrão usado em dois blocos; "Registrado em" saía em ISO UTC (2026-10-17T01:04:47Z, dia errado). | Lista de padrões sem repetição; data/hora em dd/mm/aaaa HH:mm no fuso do sistema. `SGO_CertCal_Documento.js`. | — |
| Relatório interpretativo | Gerado (texto determinístico, sem IA); segunda chamada; perfil CLIENTE. | No servidor novo a segunda chamada falhava ("link inválido") porque só aceitava link do Google Drive; CLIENTE conseguia emitir o relatório. | Aceita link `/arquivos/<id>` do servidor; CLIENTE só abre relatório já emitido. `SGO_CertCal_Main.js`. | — |
| Relatórios gerenciais (renovação, desempenho) | Gerados como GESTOR/ADMIN; recusados a TECNICO/CLIENTE. | Sem chave de IA o relatório inteiro falhava; logo quebrada (link do Drive); padrões inativos contados como vencidos. | Relatório sai com os dados e um aviso no lugar do texto da IA; logo embutida; inativos fora da contagem. `SGO_CertCal_GestaoIA.js`, `SGO_CertCal_GestaoRelatorios.js`. | — |
| Tela | Fluxo completo clicado (CNPJ, equipamento, dados, bloco, padrão, calcular, gerar, interpretativo, busca por CNPJ, manual) em desktop; celular abre o assistente do núcleo. | Seções numeradas 1, 2, 3, 5, 6, 7, 8 (pulava o 4, diferente do manual). | Renumeradas 1–7. `SGO_CertCal_ConteudoModulo.js`. | — |
| Permissões | CLIENTE: só vê certificados do próprio CNPJ; não emite, não calcula, não cadastra padrão. | COMERCIAL/FINANCEIRO podem emitir certificado e cadastrar padrão (todo perfil interno pode). | — | Dono: decidir se restringe emissão a TECNICO/METROLOGIA/GESTOR/ADMIN. |

## Relatório de calibração (RelCal)

| Página | Testado | Achado | Corrigido | Pendente |
|---|---|---|---|---|
| Instrumentos e slots | 9 instrumentos; centrífuga refrigerada com 3 slots. | — | — | — |
| Gerar | Sem certificado: mensagem clara. Sem chave de IA: mensagem e tela destravada. | Mensagem citava "Propriedades do script". | Mensagem padrão. `SGO_RelCal_IA.js`. | Gerar com a chave real e ler o documento (depende 100 % da IA). |
| Salvar / buscar | PDF + HTML salvos na pasta do cliente; busca por termo. | — | — | — |
| Permissões | CLIENTE recusado. | — | — | — |

## Laudo NR-13

Testado: busca de cliente, equipamento, categorização ao vivo, teste hidrostático, válvulas e manômetros, rascunho e retomada, emissão (laudos 202600001–007), busca por CNPJ, reabertura, trava de laudo emitido, pendência "aprovado com ressalvas", foto, IA sem chave, perfis.

Corrigido:
- `SGO_NR13_Main.js`:
  - trava de CLIENTE (o cliente vê o laudo em Documentos);
  - grupos com "≥";
  - aviso de campo de aplicação (item 13.2.1);
  - datas validadas de verdade;
  - próxima inspeção limitada ao prazo da categoria;
  - PH obrigatoriamente da lista;
  - trava na numeração.
- `SGO_NR13_Documento.js`: PMTA, volume e P.V com as casas necessárias (0,0039 não vira 0,00); texto "para o exame".
- `SGO_NR13_Config.js`: título oficial da NR-13.
- `SGO_NR13_ConteudoModulo.js`: tipo de vaso sem diferenciar maiúsculas; "1.000" = 1000; rascunho sem arredondar.
- `SGO_NR13_IA.js`: mensagem padrão.

Pendente:
- **Responsável técnico.** Conferir as citações legais do laudo:
  - "Portaria MTP nº 4.219/2022, com retificação de 20/10/2022" parece incoerente;
  - "item 13.5.1.1.3";
  - "Tabela 1/2".

  Não foram alteradas sem a fonte oficial.
- **Dono.** A categoria é calculada com a PMTA como P (conservador); decidir se mantém.

## Declaração de execução e Relatório QI/QO/QD

| Página | Achado | Corrigido |
|---|---|---|
| Dispatch | CLIENTE gerava rascunho, montava documento e enviava arquivo. | Exige equipe interna. `SGO_DeclaracaoExec_Main.js`. |
| Período do atendimento | Data inválida e fim antes do início eram aceitos. | Validado, com mensagem indicando a seção. |
| QI/QO/QD — medidas | Valores do certificado arredondados para 2 casas. | Mínimo de 2 casas, sem cortar as que o valor tem; milhar pt-BR. `SGO_DeclaracaoExec_DocumentoQIQO.js`. |
| Fotos | Aviso interno da IA ("não foi possível gerar...") ia para o documento do cliente. | Foto sai só com a legenda do técnico. |
| IA sem chave | Mensagem antiga. | Mensagem padrão. `SGO_DeclaracaoExec_IA.js`. |

Pendente:
- **Dono.** Sem chave de IA, a Declaração e o QI/QO não são gerados (não há como escrever o texto manualmente).
- **Núcleo.** O cliente é texto livre, sem vínculo com cliente, unidade ou equipamento, e não aparece em Documentos.
- **Núcleo.** O número é livre, sem controle de duplicidade.

## PGT e POP

Corrigido:
- `SGO_PgtPop_Setup.js`: o setup não apaga dados e reaproveita a pasta. Validado apagando a propriedade e gerando de novo: o histórico foi mantido.
- `SGO_PgtPop_Main.js`: trava de CLIENTE.
- `SGO_PgtPop_ConteudoModulo.js`: data da lista de controle invertida (05/10 aparecia 10/05).
- `SGO_PgtPop_Documento.js`:
  - a "Data desta Revisão" é a data do histórico, não a da reabertura;
  - os passos numerados viram parágrafos;
  - o POP avulso tem nome próprio (antes, todos se sobrescreviam como POP_v1.pdf);
  - a imagem é sanitizada.
- `SGO_PgtPop_IA.js`:
  - a limpeza de negrito/marcadores também vale para o POP;
  - mensagem padrão.

Pendente:
- **Dono.** "Gerar Tudo" sempre cria uma revisão nova do PGT, e a tela não envia a descrição da revisão.
- **Observar com a chave real.** Os 8.192 tokens com o thinking ligado podem cortar o POP.

## Planejamento CME

Cálculo conferido à mão em 6 cenários:
- vapor de 100 L, 54 L e 54,5 L (no limite);
- peróxido;
- ultrassônica;
- termodesinfectora.

Corrigido:
- `SGO_PlanCME_Setup.js`: o setup não apaga dados nem duplica receitas.
- `SGO_PlanCME_Main.js`: trava de CLIENTE.
- `SGO_PlanCME_Calculo.js`:
  - a margem de segurança gravada pelo setup nunca era lida; agora é lida, aceita vírgula e recusa texto e valor menor que 1;
  - a razão social é exigida.
- `SGO_PlanCME_Documento.js` e `SGO_PlanCME_IA.js`: volume e margem em pt-BR ("54,5 litros", "1,2").
- `SGO_PlanCME_ConteudoModulo.js`:
  - não avança sem razão social e volume;
  - o seletor de etapas ficou restrito ao módulo;
  - "Salvar no Drive" envia o CNPJ (a pasta é criada pelo CNPJ);
  - a falha do cálculo vai para o histórico e destrava o botão.

Pendente:
- **Dono.** Nomes de fabricante nas opções "Lavadora Ultrassônica (...)", que aparecem no documento e no texto da IA. Os valores estão gravados, então não foram trocados.
- **Dono.** Não há lista ou histórico de planejamentos salvos.

## Cronograma de execução

Corrigido:
- `SGO_CronExec_Grupos.js`:
  - feriados nacionais e Sexta-feira da Paixão são pulados;
  - data vazia ou inválida é recusada.

  Validado: 24/12/2026 + 5 dias úteis termina em 31/12; o grupo seguinte começa em 05/01/2027.
- `SGO_CronExec_Main.js`:
  - trava de CLIENTE;
  - totais recalculados no servidor;
  - equipamento removido ou fim antes do início são recusados citando o nome do equipamento;
  - falha de gravação vira aviso.
- `SGO_CronExec_Documento.js`:
  - datas com ano;
  - cópia HTML A4 gravada ao lado do PDF.
- `SGO_CronExec_ConteudoModulo.js`:
  - quantidade negativa é recusada;
  - o dia da semana é atualizado;
  - grupos vazios são retirados;
  - a aba abre no clique (antes, o bloqueador de pop-up dava erro técnico);
  - o CNPJ é enviado ao salvar;
  - manual atualizado.
- `SGO_CronExec_IA.js`:
  - mensagem padrão;
  - datas em dd/mm/aaaa.

Pendente:
- **Dono.** Sem chave de IA não gera documento.
- **Dono.** Não há tela de histórico.
- **Dono.** Feriados estaduais e municipais não entram.
- **Dono.** A coluna "Marca" é digitada pelo operador; decidir se fica, pela regra de nunca citar fabricante.

## Registros operacionais

Corrigido:
- `SGO_RegOp_Main.js`:
  - trava de CLIENTE;
  - data validada (31/02 é recusada) e sempre devolvida como texto (sem Date cru);
  - o fechamento recusa pendência já fechada, de outro CNPJ ou inexistente;
  - nome de arquivo único por horário;
  - falha do PDF vira aviso e log.
- `SGO_RegOp_Documento.js`:
  - números com vírgula;
  - datas dd/mm/aaaa;
  - quebras de linha mantidas;
  - lista ordenada por data de criação.
- `SGO_RegOp_ConteudoModulo.js`:
  - botão "Consultar registros e pendências";
  - "Montar os campos manualmente";
  - salvar lê o nome e os POPs do formulário;
  - o fechamento assume o CNPJ da pendência.
- `SGO_RegOp_IA.js`: mensagem padrão.

Pendente:
- **Dono.** Qualquer perfil interno exclui tipo de documento.
- **Dono.** A edição do tipo sobrescreve CRIADO_EM e não registra quem alterou.
- **Menor.** As fotos não têm limite de tamanho.

## Pendências para outros donos (não editadas aqui)

1. **Núcleo (`SGO_DocSalvar.js`) — grave.** `SGO_DocSalvar_idDaUrl_` não reconhece `/arquivos/<id>` do servidor novo. Com isso, `SGO_DocSalvar_comCopiaHtml_` não grava a cópia HTML A4 nos módulos que usam "Salvar no Drive". Basta aceitar também esse formato. O Cronograma foi contornado localmente; o CertCal usa `htmlAoLado_` e funcionou.
2. **Núcleo/servidor — logo.** A logo dos documentos de PGT/POP, Planejamento CME, Cronograma e Registros é lida por ID do Google Drive (`DriveApp.getFileById`), que não existe no servidor, e sai sem logo. O CertCal usa a logo embutida (`CadeiaFrioRel_CFCFG.LOGO_BASE64`); o mesmo valeria para os demais.
3. **Cadastro de Padrões (`SGO_Padroes.js`).** Aceita duas TAGs iguais (teste: TAG "HACK" criada duas vezes).
4. **Núcleo (`JS_Core.html`, assistente do celular).**
   - A lista de padrões no celular não mostra a situação da validade. O servidor agora bloqueia o vencido, mas o técnico só descobre ao gerar.
   - O botão "Novo cliente" fica sob a faixa de ensaio.
5. **Banco de desenvolvimento.** Faltam as abas CAD_TECNICOS, AUVO_TAREFAS e CAD_CONDUTORES, o que gera erros no console e "Aba não encontrada" no técnico do CertCal. Conferir se a produção tem essas abas.
6. **Servidor (segurança).** `/api/run` executa qualquer função global não bloqueada pelo nome (por exemplo `usuariosCriar`, que confere o perfil por dentro). Avaliar uma lista de permitidas.
7. **Pastas.** Cada módulo grava na sua própria raiz (`<Módulo> - Documentos Gerados/<cliente>` ou `.../PDFS_GERADOS/<CNPJ>`), não em uma pasta única do cliente. Algumas pastas são pelo nome do cliente, não pelo CNPJ (CertCal, RelCal, Declaração).

## Evidências

Scripts e telas no scratchpad da sessão (`...\scratchpad\cal`, `\nr13`, `\pgt`, `\cron`):
- cenários HTTP: h1–h8, c1–c9, a3;
- Playwright: ui1, ui2, ui_cron, ui_regop, ui_cliente;
- capturas de tela: ui_certcal_popup.png, ui_certcal_renov.png, n3_laudo.png, cron_srv_a4.png, ui_regop_doc.png.
