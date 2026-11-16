# Projeto de gestão de atendimentos, deslocamentos e cobranças + Política de cobranças (Assistência Técnica e Brasmedical)

Recebido do dono (Thiago, Metrolabs) em 03/11/2026, em dois documentos: "PROJETO DE GESTÃO INTELIGENTE DE ATENDIMENTOS, DESLOCAMENTOS E COBRANÇAS" (P) e "POLÍTICA DE COBRANÇAS — ASSISTÊNCIA TÉCNICA E BRASMEDICAL" (C, proposta para validação da diretoria). Registro fiel de todas as regras, com a numeração original.

**Complemento do dono (03/11):** vale para a MATRIZ (Goiânia) e para a FILIAL (Rio de Janeiro); todos os carros da Frota entram (não só Montana e Onix).
**Decisões já tomadas pelo dono (03/11):** R$ 2,50/km é a única tarifa aprovada; fora da garantia quem paga é a Brasmedical, podendo transferir ao cliente final; margem = a do Comercial; vencimento 30 dias; demonstrativo por atendimento; "Abrir em nome da representada" só o Matheus.

---

## P1. Missão e diretrizes
- Módulos: Brasmedical (Representação) e Assistência Técnica. Do pedido à execução, cálculo, aprovação comercial, faturamento e encerramento financeiro.
- Preocupação principal: eliminar erro humano no preenchimento e na definição dos valores. O colaborador não digita livremente km nem valores.
- Diretrizes: não criar sistema paralelo; usar cadastros e recursos existentes; integrar comercial, contratos, clientes, O.S., logística e financeiro; UM mecanismo central de cálculo; validar no front e no servidor; registrar alterações relevantes; IA só quando agregar segurança; interface simples; evitar digitação; regras parametrizadas; rastreabilidade atendimento → deslocamento → cobrança → faturamento.
- **Regra central: o colaborador informa o que aconteceu; o SGO+ determina o que deve ser cobrado.**

## P2. Quilometragem
- R$ 2,50 por km rodado = preço de cobrança padrão, mesmo valor para todos os veículos.
- Contempla: combustível, lubrificantes, óleo e filtros, manutenção preventiva e corretiva, pneus, alinhamento/balanceamento, depreciação, seguro, IPVA/licenciamento, conservação, custos operacionais do veículo.
- NÃO inclui: hora técnica, tempo de deslocamento, pedágios, estacionamentos, alimentação, hospedagem, materiais/peças, serviços adicionais (regras próprias).
- Preço de cobrança ≠ custo real do veículo: manter separados.

## P3. Motor central ("SGO+ Motor de Precificação de Atendimentos")
- Usado por Brasmedical, Assistência e futuros módulos; nada de cálculo por módulo.
- Considera: cliente, unidade, contrato vigente, O.S., tipo de atendimento, origem, destino, veículo, distância, nº de deslocamentos, profissionais, tempo de viagem, tempo de execução, materiais/peças, despesas, regras contratuais, isenções autorizadas, valores vigentes.
- Resultado com cada componente individualizado. Ex.: 150 km ida + 150 volta = 300 km × 2,50 = R$ 750,00. Automático; colaborador não altera o valor.

## P4. Abertura do atendimento
- Obrigatórios: cliente, unidade, equipamento (quando aplicável), tipo de serviço, endereço, descrição, responsável, previsão. Dados de cadastro preenchidos automaticamente; não pedir de novo.
- Endereços estruturados (mapas quando possível); seleciona a unidade cadastrada, não redigita; endereço errado → pedido de correção cadastral; nunca mudar endereço silenciosamente durante a O.S.

## P5. Km automático
- Origem (base) → destino (unidade): rota rodoviária, ida, necessidade de retorno, total previsto, × 2,50, previsão exibida. Precisão decimal (87,5 km × 2,50 = R$ 218,75).
- Km ESTIMADO (orçamento) ≠ km REALIZADO (execução, validado pela política). O previsto não vira automaticamente o realizado.
- Mapas: avaliar Google Maps Platform, roteirização já existente no SGO+ ou outra API; verificar o que existe e custos antes de contratar.

## P6. Deslocamento real
- Saída: veículo, motorista, profissionais, atendimento, origem, data/hora, odômetro inicial. Retorno: data/hora, odômetro final, local, atendimento/roteiro. Reusar controles de veículos e check-in/check-out existentes; sem cadastro duplicado.
- Comparar previsto × odômetro × rastreamento. Alerta e justificativa + aprovação quando diferença > maior entre 15% do previsto e 10 km (configurável).
- Nunca aumentar a cobrança só porque rodou mais. Identificar desvios, trajetos particulares, erros de percurso. Km faturável segue política/contrato.

## P7. Duplicidade (obrigatório)
- Cenário 1: 2 equipamentos no mesmo hospital, 2 O.S., 100 km → não cobrar 200 km em cada; várias O.S. ligadas a um deslocamento.
- Cenário 2: Hospital A → Hospital B → volta: registrar trechos reais; não ida-e-volta por hospital; metodologia de rateio APRESENTADA À DIRETORIA antes de implantar.
- Cenário 3: retorno no dia seguinte: motivo (continuidade programada, peça, pedido do cliente, retrabalho, garantia, nova solicitação); verificar contrato e se é faturável.

## P8. Contratos
- Sem contrato: tabela padrão conforme orçamento aprovado. Com contrato: condições pactuadas. Deslocamento incluso: sem cobrança extra. Franquia de km: só o excedente. Garantia: cobertura. Emergencial: taxas específicas.
- Equipe não decide gratuito × faturado; exceção só com autorização registrada.
- Prioridade: contrato válido > proposta/orçamento aprovado > regra específica autorizada > tabela padrão. Conflito impede liberação automática.

## P9. Horas
- Registrar separados: tempo de deslocamento, execução, espera, improdutivo. Cobrança do deslocamento ainda a parametrizar/validar. Nem todo tempo é faturado.

## P10. Interface guiada
- Tela 1 Identificação (cliente, unidade, atendimento, equipamento); Tela 2 Deslocamento (veículo, origem, destino, presencial/remoto → km previsto); Tela 3 Execução (início, fim, serviços, materiais, fotos, ocorrências); Tela 4 Conferência (previsto, realizado, faturável, valor deslocamento, horas, despesas, valores aplicáveis, total previsto) — confirma fatos, não digita preço.
- Máscaras, obrigatórios condicionais, seleções vinculadas, mensagens claras, validação automática, responsivo, rascunho, sem perda de dados; registrar emergência sem conexão (validações antes do fechamento financeiro).

## P11. Bloqueios (sem impedir o atendimento emergencial)
1 endereço inválido; 2 km negativa/impossível/incompatível; 3 deslocamento faturado duas vezes; 4 valor/tabela/desconto alterado sem autorização; 5 contra o contrato; 6 despesa sem comprovação; 7 sem O.S./cliente/unidade; 8 já faturado; 9 rota com trechos não identificados.

## P12. Permissões
- Técnico: registra deslocamento, odômetro, serviços, evidências, despesas; NÃO muda R$/km, preços, isenções, descontos.
- Supervisor: confere, aponta inconsistências, pede correção, valida registros operacionais.
- Comercial e Financeiro: conferem valores, aplicam condições aprovadas, preparam faturamento, pendências.
- Diretoria/autorizado: exceções, descontos, isenções, tabelas, ajustes extraordinários. Registrar quem, quando, motivo, valores.

## P13. Brasmedical
- Instalação, preventiva, corretiva, garantia, visita, diagnóstico, retirada, entrega, retorno, troca de peças. Ligado à O.S., equipamento e cliente. Faturável conforme condições. Sem cobrança repetida quando o mesmo profissional atende vários equipamentos numa visita.

## P14. Assistência Técnica
- Preventiva, corretiva, calibração, qualificação, inspeção, ensaios, diagnóstico, instalação, comissionamento, consultoria, avaliação, emergencial. Vários serviços na mesma visita: cada um com O.S./item, deslocamento registrado UMA vez e atribuído pela política.

## P15. Prévia
- Antes de orçamento/faturamento: demonstrativo (cliente, origem, destino, veículo, componentes). Diferenciar confirmado, estimado, pendente, não faturável. Sem valores fictícios em documento definitivo.

## P16. IA de conferência
- Distâncias fora do habitual, duplicidades, atendimentos simultâneos incompatíveis, rotas divergentes, retornos frequentes, cobranças inconsistentes, serviço sem despesa, não faturado, padrões de erro. Ex.: "320 km registrados, rota habitual ~180 km". IA sugere; não muda valores; regras determinísticas e auditáveis.

## P17. Financeiro
- Etapas: solicitado, programado, executado, despesas, conferência, cálculo, aprovação, liberado, faturado, recebido. Financeiro vê executado não faturado, deslocamentos pendentes, despesas sem aprovação, previstos × faturados × recebidos, divergências. Reusar fluxos financeiros existentes.

## P18. WhatsApp
- Avisos: executado aguardando conferência, km inconsistente, cobrança pendente de aprovação, executado sem faturamento, contrato × cobrança, despesa sem comprovante, exceção aguardando. Com identificação e link seguro; sem repetição; registrar envio e resultado.

## P19. Auditoria
- Por cálculo: regra, versão da tabela, contrato, km, origem dos dados, usuário, data/hora, alterações, autorizações, justificativas, valor final. Mudança futura de tabela não altera o já faturado; correção pós-faturamento por ajuste financeiro, sem mexer no histórico.

## P20. Indicadores
- Km percorridos, faturáveis, não faturáveis; receita de deslocamento, de hora técnica, total por atendimento; custos conhecidos; margem; atendimentos por veículo e por técnico; deslocamentos não cobrados; descontos; exceções; faturamento pendente; inconsistências. Filtros: período, cliente, unidade, veículo, técnico, módulo.

## P21. Testes obrigatórios
1) 50+50 km = R$ 250,00; 2) 150+150 = R$ 750,00; 3) 2 O.S. mesma viagem → sem duplicar; 4) deslocamento incluso no contrato → sem cobrança; 5) técnico muda R$/km → bloqueado; 6) endereço inválido → sem cálculo definitivo; 7) odômetro final < inicial → inconsistência; 8) vários clientes → trechos e rateio aprovado; 9) remoto → sem deslocamento; 10) O.S. já faturada → sem duplicar; 11) garantia → cobertura; 12) tabela muda → histórico íntegro; 13) mapas fora → pendência + contingência validada; 14) dois técnicos mesmo carro → km não multiplica; 15) parcialmente faturável → só a parcela autorizada.

## P22. Qualidade
- Reusar componentes, sem duplicar cadastros/regras, cálculo centralizado, validação no servidor, dinheiro correto (decimal), permissões, integridade, sem duplicidade em operações simultâneas, mensagens claras, auditoria, testes, compatível com a arquitetura. UX com especialista, foco no técnico em campo.

## P23. Metodologia
- Fase 1 Diagnóstico: Brasmedical, Assistência, abertura de O.S., registro de deslocamentos, cadastro de veículos, check-in/check-out, definição de preços, consulta de contratos, integração financeira, notificações, APIs de mapas. Não recriar o que existe.
- Fase 2 Arquitetura: motor, modelo de dados, relação com módulos, fluxo, regras, permissões, telas, integrações, estratégia anti-erro/duplicidade.
- Fase 3 Validação comercial (alternativas para aprovação): cobrança do tempo de deslocamento; rateio de km entre clientes; viagens com várias O.S.; retornos em garantia; franquias; exceções; km previsto × efetivo. **Não inventar políticas; única tarifa aprovada: R$ 2,50/km.**
- Fases 4 Desenvolvimento, 5 Testes, 6 Homologação com a Metrolabs.

## P24. Resultado esperado
- Metodologia ponta a ponta, mínimo de decisão comercial do colaborador. Diretoria segura de: sem cobrança indevida, sem deixar de cobrar, sem deslocamento duplicado, sem alteração de valores sem autorização, dados corretos e rastreáveis, mesma metodologia nos dois módulos, integração com financeiro, faturamento = atendimentos realizados. Não concluído só com telas: demonstrar o fluxo completo (execução, cálculo, conferência, aprovação, faturamento, auditoria).

---

## C1. Princípio
- Distinguir: (1) custo interno, (2) preço comercial, (3) valor autorizado pelo cliente, (4) valor faturável, (5) faturado, (6) recebido.
- Técnico registra; sistema calcula; supervisor confere operação; comercial/financeiro valida condições; diretoria autoriza exceções. Ninguém altera livremente preços.

## C2. Categorias (parametrizáveis sem mudar código)
DES-001 Quilometragem (R$ 2,50/km) · DES-002 Tempo de deslocamento (por hora/profissional) · TEC-001 Hora técnica (por categoria) · TEC-002 Diagnóstico (fixo ou hora) · TEC-003 Visita técnica (mínimo ou fechado) · TEC-004 Tempo de espera (motivo + autorização) · ADI-001 Emergencial (adicional autorizado) · ADI-002 Fora do expediente (adicional autorizado) · DES-003 Pedágio e estacionamento (comprovado) · VIA-001 Alimentação e hospedagem (política de viagens) · MAT-001 Peças e materiais (tabela) · LOG-001 Frete e transporte (modalidade).

## C3. Hora técnica
- Categorias: A técnico operacional; B técnico especializado; C engenheiro/especialista; D preço fechado (calibração, qualificação, inspeção…).
- Por hora: início/fim automáticos, duração efetiva, pausas separadas, preço da categoria autorizada, sem alteração manual sem justificativa e aprovação, comparar com o orçamento.
- Sugestão: hora mínima + frações de 15 min (1h20 → 1h30), só se previsto nas condições aceitas.
- O colaborador não escolhe a própria categoria: vem do serviço e das regras. **Valores das categorias a definir pela Metrolabs.**

## C4. Tempo de deslocamento
- Diferente do km. Registrar saída, chegada, saída do cliente, retorno, profissionais, total.
- Sugestão para análise: 50% da hora técnica do profissional (ex. ilustrativo: hora 200 → deslocamento 100 × 6 h = 600; NÃO aprovado).
- Dois técnicos no mesmo carro: km uma vez; tempo individual só dos autorizados; valor conforme proposta/contrato. Não cobrar ao mesmo tempo deslocamento e hora técnica do mesmo profissional no mesmo intervalo. Registrar sempre, faturável ou não.

## C5. Diagnóstico
- Serviço próprio. Modelos: A por hora; B preço fixo aprovado; C incluído no serviço. Não cobrar fixo + horas da mesma atividade. Abatimento no reparo só com regra aprovada (nunca automático).

## C6. Visita técnica
- Categoria própria (avaliação, levantamento, inspeção preliminar, diagnóstico presencial, avaliação para orçamento, verificação de instalação, pedido do cliente). Tarifa mínima possível; km e despesas só se previstos. Se a visita inclui 1 h de trabalho, não cobrar essa hora de novo; mostrar incluído / separado / dependente de autorização.

## C7. Tempo de espera
- Classes: atribuível ao cliente; à Metrolabs; condição técnica (estabilização, aquecimento, ciclos); motivo externo.
- Cobrança depende da causa, contrato e autorização. Sugestão: tolerância de 30 min para espera do cliente, depois tarifa (% da hora) se pactuada.
- Exigir motivo, início, fim, evidência/observação, quem classificou. Nunca cobrar espera da Metrolabs; não cobrar em duplicidade espera já incluída no preço.

## C8. Emergencial
- Normal / prioritário / emergencial. Adicional só se: previsto em contrato ou aprovado pelo cliente; classificado corretamente; urgência justifica; previsto na tabela. Técnico não muda para emergencial; classificação na abertura ou por alteração autorizada; registrar quem pediu a urgência.

## C9. Fora do expediente
- Fora do horário, noite, sábado fora da programação, domingo, feriado: adicionais por faixa, configuráveis; não usar percentuais trabalhistas de hora extra. Emergencial + fora do expediente: sugestão maior adicional, sem acumular (só se previsto).

## C10. Pedágio e estacionamento
- Fora dos R$ 2,50. Valor devido/necessário; vínculo com a viagem; comprovante quando houver; data e valor; sem duplicar; cliente responsável; verificar se o contrato inclui; tributação do financeiro. Sem comprovante: pendente ou exceção autorizada. Técnico não digita valor final sem identificar a despesa.

## C11. Alimentação e hospedagem
- Alimentação: duração, necessidade, contrato, política de viagens, fornecida pelo cliente. Hospedagem: permanência fora da origem, profissionais, diárias, necessidade, valores autorizados, comprovantes, condições aprovadas.
- Modelos: A despesa real; B diária comercial; C incluída no preço fechado. Não aplicar diária + reembolso integral das mesmas despesas; fornecido pelo cliente → não cobrar. Reembolso ao colaborador separado do valor faturado.

## C12. Peças e materiais
- Integrado ao estoque e ao comercial. Técnico registra na O.S.; sistema consulta código, descrição, quantidade, unidade, custo, preço de venda, contrato, garantia, valor faturável. Técnico não inventa preço nem muda quantidade sem registro; sem faturar o mesmo material duas vezes.
- Consumíveis (fita, terminais, abraçadeiras, limpeza técnica, auxiliares): Metrolabs define se (1) incluídos na hora, (2) no preço fechado, (3) por quantidade, (4) taxa de consumíveis aprovada. Sem cobrança dupla.

## C13. Frete e transporte
- Veículo Metrolabs: política de km e serviços logísticos autorizados. Transportadora: frete aprovado. Especializado: orçamento próprio (movimentação, embalagem, recursos). Não cobrar km próprio quando o transporte foi só por terceiro; etapas mistas separadas.

## C14. Preço fechado
- Calibrações, qualificações, inspeção NR-13, câmara fria, ensaios: usar o preço do catálogo; não cobrar por hora. Só acrescentar componentes expressamente excluídos do preço e autorizados (ex.: deslocamento não incluso). Consultar inclusões/exclusões de cada serviço.

## C15. Cancelamentos, retornos, reagendamentos
- Cancelado antes da saída: sem deslocamento; taxa só se aceita antes. Durante o deslocamento: hora, km percorrido, motivo, quem pediu; mobilização só com contrato/autorização. Impossibilitado pelo cliente: registrar comparecimento e impedimento; cobranças só as autorizadas. Retorno por falha da Metrolabs: sem nova cobrança. Retorno pedido pelo cliente: novo serviço/continuidade/condição. Retorno em garantia: cobertura antes de cobrar; deslocamento sozinho não cria visita faturável.

## C16. Múltiplos técnicos/atendimentos
- Km não multiplica por profissionais; horas só dos necessários e autorizados; preço fechado não multiplica por técnicos (salvo condição expressa). Viagens compartilhadas: rateio aprovado pela diretoria; **total do deslocamento = soma das parcelas**, sem duplicar. Rateio de custo interno ≠ cobrança entre clientes.

## C17. Mão de obra adicional
- Quantidade e classificação definidas na programação; horas por profissional conforme proposta; ampliar equipe na execução com justificativa e aprovação; sem profissionais fictícios ou horas duplicadas.

## C18. Despesas extraordinárias
- Locação de equipamento/plataforma, guindaste, transporte especial, terceirizado, ferramental: descrição, justificativa, valor, comprovante ou cotação, vínculo, autorização comercial. Margem por tabela/proposta; ninguém define preço de revenda livremente.

## C19. Remoto
- Orientação, diagnóstico remoto, suporte, consultoria, configuração remota. Sem km. Tempo ou preço fechado quando autorizado. Remoto que vira presencial: registros ligados, sem duplicar o já cobrado.

## C20. Fórmula
- Total = serviços técnicos + deslocamentos + horas de viagem + materiais + despesas autorizadas + adicionais − descontos aprovados − franquias/créditos/abatimentos. Tributos conforme configuração, sem somar de novo se já incorporados.
- Mostrar: calculado, contratado, autorizado, faturável, faturado; divergência relevante alerta o financeiro.

## C21. Matriz de regras automáticas
Remoto → sem km · Presencial → deslocamento pelas regras · 2 técnicos/1 carro → km único · 2 O.S./1 viagem → sem duplicar · Preço fechado → sem duplicar hora incluída · Diagnóstico fixo → sem duplicar mão de obra · Deslocamento incluso → contrato · Garantia → cobertura · Espera da Metrolabs → não cobrar · Pedágio → vínculo e comprovante · Hospedagem do cliente → não cobrar · Material → estoque e preço · Material em garantia → cobertura · Cancelado → política contratual · Emergencial → classificação autorizada · Fora do expediente → adicional aprovado · Técnico altera preço → bloquear · Despesa já faturada → sem duplicar · Custo novo após orçamento aprovado → aditivo/autorização.

## C22. Tela "COMPOSIÇÃO FINANCEIRA DO ATENDIMENTO"
| Componente | Quantidade | Preço | Situação |
|---|---|---|---|
| Quilometragem | Automática | R$ 2,50/km | Calculado |
| Hora técnica | Automática | Tabela | Calculado |
| Tempo de deslocamento | Automática | Regra | A validar |
| Diagnóstico | Contratação | Tabela | A validar |
| Tempo de espera | Automática | Regra | A validar |
| Pedágios | Viagem | Comprovante | A validar |
| Alimentação | Política | Regra | A validar |
| Hospedagem | Viagem | Regra | A validar |
| Materiais | O.S. | Estoque | Calculado |
| Adicionais | Autorização | Regra | A validar |
- Situações mínimas: Calculado, Pendente de informação, Pendente de aprovação, Aprovado, Não faturável, Incluído no contrato, Faturado. Construída dos dados da operação; o colaborador não preenche.

## C23. Controles obrigatórios
Preços das tabelas/contratos · identificação única e origem rastreável de cada componente · sem sobreposição de períodos do mesmo profissional · faturamento conciliado com o estoque · cada trecho ligado a uma viagem · comprovantes/lançamentos duplicados identificados · nada contra o contrato · cobrança extra com comprovação da autorização · já faturado não volta ao financeiro · tabela nova não muda o já faturado.

## C24. Orçamento × apuração × faturamento
- Orçamento (estimado antes), apuração (da execução, dentro do contratado), faturamento (autorizado e liberado). Apurado > autorizado → divergência; adicional dependente de autorização não fatura automaticamente; fluxo de aprovação complementar; demonstrativo claro ao cliente.

## C25. Parametrização (área administrativa)
- R$/km; preço por categoria de hora; hora de deslocamento; hora mínima; fração; diagnóstico; visita; critério de espera; adicional emergencial; fora do expediente; alimentação; hospedagem; taxas logísticas; descontos máximos por nível; garantia; cancelamento; exceções contratuais.
- Cada parâmetro: início de vigência, histórico, aprovador, versão, permissões. **Parâmetro não aprovado fica inativo para faturamento automático.**

## C26. Orientação final e primeira entrega
- Verificar o existente; não duplicar tabelas, cadastros ou faturamento; integrado nos dois módulos; motor único; preenchimento guiado. Técnico registra fatos; sistema calcula; supervisor verifica; financeiro controla; diretoria aprova exceções e políticas.
- **Primeira entrega:** diagnóstico do existente; estrutura do motor; matriz de regras; parâmetros que precisam de aprovação; protótipo das telas; fluxo de integração com contratos, O.S., estoque e financeiro; estratégia de testes e homologação.
- Não habilitar novas modalidades para faturamento real antes da aprovação das regras.
