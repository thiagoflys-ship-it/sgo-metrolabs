# Auditoria cruzada — Certificado de Calibração — 08/10/2026

Escopo: somente CertCal e leitura de suas dependências. Nenhum upload, publicação ou alteração de registros históricos nesta auditoria. A produção não foi validada operacionalmente por estes testes locais.

## Caminho dos dados e equipamentos

Desktop: `JS_CertCal.html` carrega `SGO_CertCal_ConteudoModulo.js`; o formulário chama `CertCal_apiDispatch`. Mobile: wizard em `JS_Core.html` chama o mesmo dispatch. Ambos enviam IDs de cliente/equipamento/executor, data/condições, solicitação de próxima calibração e blocos de pontos brutos com três leituras e IDs de padrões. Não enviam resultados finais calculados.

`SGO_CertCal_Main.js` resolve CAD_CLIENTES/CAD_UNIDADES/CAD_EQUIPAMENTOS/CAD_TECNICOS; `SGO_VINCULOS.relation` exige vínculo ativo correspondente. CAD_PADROES fornece U/K/Veff. `CertCal_calcularBlocos_` e `CertCalCalculo` são compartilhados por preview e emissão. O contexto calculado e a configuração institucional congelada são persistidos em CERT_CALIBRACAO.DADOS_JSON; Documento e IA interpretativa determinística consomem esse contexto. CERT_CALIBRACAO aponta os PDFs. SGO_DOCUMENTOS recebe o certificado para inventário; Auvo recebe a tarefa como integração auxiliar.

Leitura da base real, realizada pela raiz da atividade e registrada em `CERTCAL_CRUZAMENTO_CADASTROS_20261008.json`: 400 equipamentos ativos, 45 clientes e 51 unidades. Nove equipamentos apresentam divergência entre cliente do equipamento e cliente da unidade (linhas 25–33); não foram corrigidos por falta de evidência de qual vínculo é o correto. A emissão já bloqueia essas relações. Acervo informado pela leitura da raiz: 105 padrões, 89 ativos, nenhum ativo sem número/U/K/validade/PDF.

O CertCal é genérico por grandeza/canal e aceita os tipos cadastrados; não usa a lista de nove instrumentos do RelCal, módulo de interpretação de certificados externos. Os nove cenários físicos automatizados são amostras de regressão, não uma validação de todos os métodos dos 400 ativos. A base inclui manômetros, válvulas, sensores, transmissores, autoclaves e outros tipos. A existência do equipamento no cadastro não comprova cobertura técnica do procedimento.

## Defeitos comprovados e correções locais

| Defeito | Evidência e correção |
|---|---|
| CLIENTE acessava equipamentos/snapshot/relatório de outro cliente | Busca, listagem, reabertura e interpretativo exigiam sessão sem conferir cliente da sessão. `CertCal_exigirAcessoCliente_` agora protege as quatro APIs, inclusive retorno de relatório já salvo. |
| Executor inexistente/inativo ou ausente entrava no certificado | `CertCal_montarContexto_` permitia null e fallback silencioso. ID informado exige cadastro ativo com nome; sem ID, nome livre é obrigatório. |
| Técnico criava executor simplificado mas não o encontrava | Cadastro simplificado não tem USUARIO_ID; `SGO_TECNICOS.listar` oculta registros sem usuário próprio para perfil TECNICO. Catálogo exclusivo CertCal agora lista executores ativos para equipe interna; CLIENTE não consulta nem cria. O módulo SGO_TECNICOS não foi alterado. |
| Busca apresentava TAG/tipo atuais em certificado histórico | Agora prefere `snapshot.equipamento`; fallback cadastral apenas para legado sem identidade no snapshot. |
| Reabertura aceitava número diferente do snapshot | Bloqueia divergência, como já ocorria na emissão do interpretativo. |
| Gerencial mostrava zero pontos calibrados | Corrigido pela raiz: usa resultados do snapshot, com fallback para pontos de legado. |
| Gerencial não reconhecia grandeza Tempo | Corrigido pela raiz: classificação explícita de Tempo, inclusive cronômetro/segundos/minutos. |

Proteções anteriores preservadas: duas casas somente na apresentação; sinal da tendência; cálculo em precisão completa; próxima data somente solicitação identificada; nenhuma aprovação/reprovação; snapshot institucional por emissão; persistência antes de compartilhar; interpretativo existente preservado e concorrência verificada sob lock.

## Testes executados

Treze arquivos `tests/certcal*.test.cjs` passaram integralmente por execução direta `node arquivo`. `node --test` no sandbox tentou criar subprocessos e recebeu EPERM; a execução direta rodou os mesmos testes. Novo `certcal-acesso-executor.test.cjs` contém cinco cenários de acesso/executor/histórico/reabertura. Fixtures de instrumentos e próxima calibração foram atualizadas para declarar executor real de teste.

Incluídas regressão do certificado 202600250 (cinco pontos RPM e quatro tempo), nove perfis físicos, motor Student/Welch-Satterthwaite, precisão e coerência documental, próxima calibração desktop/mobile/backend, falhas parciais, concorrência do relatório e snapshot institucional. Serviços Google são simulados nos testes; isso não valida conversor PDF Apps Script, permissões Drive, cotas, Sheet, Auth e Auvo em operação no `/dev`.

## Pendências e limitações encontradas

1. Mobile: lacuna encontrada e CORRIGIDA pela raiz nesta auditoria. Guarda certificadoId emitido e oferece geração do interpretativo pelo mesmo endpoint/snapshot. Novo teste cobre associação do ID, retorno do PDF e falha recuperável.
2. Padrões têm descrição livre e U/K/Veff, sem grandeza/unidade/faixa estruturadas. O backend não consegue comprovar compatibilidade dimensional padrão/bloco ou cobertura por faixa; heurística textual do desktop não substitui validação metrológica. Também não valida a disponibilidade/periodicidade do padrão no dia da calibração. Exige definição humana de procedimento e critérios antes de implantar bloqueios.
3. Idempotência de reenvio do certificado e auditoria crítica persistente continuam pendentes. A numeração possui lock, mas nova chamada cria nova emissão; numeração única não evita atendimento duplicado. `SGO_DATA.log` genérico não garante registro crítico.
4. Registro SGO_DOCUMENTOS e tarefa Auvo são auxiliares e suas falhas podem ser suprimidas/logadas após a emissão oficial. Sucesso do certificado não comprova sucesso dessas duas integrações. É necessária reconciliação/indicador explícito de pendência.
5. PDF privado no instante de criação depende também das permissões herdadas da pasta Drive. Ainda é necessário conferir a pasta efetiva no Google e testar políticas de compartilhamento no `/dev`.
6. Reabertura monta HTML com o template atual. Snapshot congela dados/configuração das emissões novas, mas não todo o código de renderização; para cópia histórica exata deve prevalecer PDF originalmente salvo, sobretudo em legado sem configuração documental.
7. Autoridade técnica precisa validar referência versus setpoint, resolução, correções, distribuições, correlações, sensibilidade e abrangência. Os testes reproduzem o modelo implementado, sem aprovar a completude do orçamento de cada equipamento.

Conclusão: foram identificados e corrigidos defeitos reais de acesso, executor, histórico e indicadores; não há base para declarar todos os equipamentos/metodologias operacionalmente homologados. A validação Google e as pendências acima permanecem explícitas.

## Consolidação final da raiz

Suite final com quinze arquivos aprovada, acrescentando `certcal-cadastros-cruzados.test.cjs` e `certcal-mobile-interpretativo.test.cjs`. Evidência em `tmp/certcal-auditoria-cruzada-testes-20261008.txt`. O cruzamento preserva o grafo real de 400 cadastros, com IDs/nomes anonimizados: 391 contextos passam e os nove vínculos divergentes são bloqueados pelas funções reais de contexto e vínculo. São pontos sintéticos para testar comunicação e estrutura, não calibração real de cada equipamento.

Classificação gerencial também passou a reconhecer Massa/Balança e Manômetro. Correções restritas a CertCal, sem alterar os dados da base Google, históricos, os módulos consumidores ou a produção. Os nove vínculos exigem definição do cliente/unidade corretos por responsável do cadastro antes de sua regularização.
