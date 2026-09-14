# Status da sessão — Portal SGO+ (2026-09-13)

Documento de continuidade para Codex, Claude ou qualquer pessoa retomar o projeto sem reconstruir a conversa.

## Projeto e produção

- Fonte Apps Script: `apps-script-imports/portal_sgo_versao_cnpj_db/`
- Script ID: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`
- Deployment estável: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`
- Alertas globais publicados em produção na versão **272**.
- Regra: atualizar esse mesmo deployment para preservar o link `/exec`.

## Trabalho realizado nesta sequência

1. **Frotas**
   - Revisão da comunicação entre usuários, login, condutores, retirada, devolução, dashboard e mobile.
   - Correção do condutor automático no checklist.
   - Situação do veículo mostra disponível/em uso e quem retirou.
   - Datas e horas do histórico foram regularizadas.
   - Pendências do Painel da Qualidade passaram a informar qual dado falta.
   - Registros de teste do usuário Matheus foram tratados conforme a solicitação registrada em `CORRECAO_FROTA_PORTAL_20260913.md`.

2. **Certificados de calibração**
   - Tratamento de datas de emissão/validade e valores decimais com vírgula.
   - Revisão dos campos VFF, UF e K e suporte a certificados de mesmo número/data com TAG/grandeza diferente.
   - Relatórios gerenciais HTML A4 com IA: Plano de Renovação/Auditoria e Desempenho do módulo.
   - Lista completa colorida por prioridade, legenda, logo Metrolab's, margens equilibradas e texto justificado.

3. **Auvo**
   - Relatório por colaborador ou grupo, com número da OS.
   - Segundo relatório HTML A4 com interpretação por IA.

4. **Programa de Conduta**
   - Cadastro de cidades/destinos, reconhecimento de grupo/departamento e separação de elogio público/cobrança reservada.
   - Relatórios semanais e de missões em HTML A4 com IA, indicadores e informações para financeiro/diretoria.
   - Relatórios com logo, margens, texto justificado e respostas da IA organizadas em blocos/listas.

5. **Painel da Qualidade**
   - Revisão das integrações e melhoria da apresentação das pendências.

6. **Proteção contra ações repetidas**
   - As ações novas seguem o padrão “Aguarde/processando”, desabilitando botões durante geração ou salvamento.

7. **Alertas globais de padrões**
   - Protótipo aprovado pelo usuário em `PROTOTIPO_ALERTAS_PADROES_SGO_20260913.html`.
   - Backend novo: `SGO_AlertasPadroes.js`.
   - Perfis destinatários: GESTOR e METROLOGIA, configuráveis.
   - Balão periódico e aviso crítico central sobre qualquer módulo.
   - Nenhum recarregamento de página; formulários permanecem no DOM e o trabalho digitado é preservado.
   - Botão “Tratar agora/Ver padrões” abre `certificado_calibracao`.
   - O alerta desaparece automaticamente quando não há vencidos, vencendo na janela configurada ou validade inválida.
   - Configuração persistida em ScriptProperties, chave `SGO_ALERTAS_PADROES_CONFIG_V1`.
   - Leitura e gravação das configurações exigem perfil ADMIN no servidor.

## Configuração padrão dos alertas

| Item | Padrão |
|---|---|
| Ativo | Sim |
| Perfis | GESTOR e METROLOGIA |
| Horário | 08:00–17:30 |
| Balão | A cada 120 minutos, visível por 20 segundos |
| Aviso crítico | A cada 240 minutos |
| Antecedência | 30 dias |
| Consulta silenciosa | A cada 5 minutos |

O navegador guarda apenas o horário da última apresentação por usuário. A fonte de verdade das pendências continua sendo `CAD_PADROES`.

## Arquivos diretamente envolvidos nos alertas

- `SGO_AlertasPadroes.js`: configuração, autorização e resumo real das validades.
- `JS_Core.html`: agendamento, balão, modal, memória local e navegação.
- `JS_Admin.html`: formulário administrativo, salvamento e teste.
- `UI_Estilos.html`: aparência desktop/mobile.
- `docs/manual_portal_sgo_cnpj_db/06_PAINEL_ADMIN_USUARIOS.md`: instruções ao administrador.

## Como retomar

1. Ler este arquivo e `CORRECAO_CERTCAL_PORTAL_20260913.md`/`CORRECAO_FROTA_PORTAL_20260913.md`.
2. Conferir `clasp status` e `clasp deployments` no diretório do Portal.
3. Não criar novo deployment: atualizar o ID estável acima.
4. Para testar: entrar como ADMIN, abrir Painel Admin, salvar a configuração e usar “Testar alerta agora”.
5. Testar depois com contas GESTOR e METROLOGIA navegando e preenchendo formulários.
