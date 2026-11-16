# Padrões — inventário e solicitação de orçamento

> Atualização: **produção 277** corrige o timeout relatado na abertura da versão 276. Carregamento dos cadastros consolidado em uma chamada, sem provisionamento na abertura. [Diagnóstico, correção e testes](CORRECAO_TIMEOUT_PADROES_20260921.md).

## Escopo autorizado em 21/09/2026

Acrescentar recursos ao Certificado de Calibração preservando a emissão/cálculos existentes. A referência é o **documento gerado pelo Inventário de Equipamentos**, não a interface do módulo. Localização é texto livre, sem lista fixa RJ/GO. Ambos os novos documentos são HTML A4 paisagem, com cópia preservada e consulta pelo portal.

## Implementação

- Nova seção “Controle dos padrões · inventário e orçamento”, com guia “Como usar”, busca, filtro de localização e situação, seleção individual/coletiva e mensagens de carregamento.
- Editor vinculado ao ID original do padrão: localização, marca, modelo, série, faixa, grandeza, unidade, resolução, laboratório, data da calibração, pontos/canais, resultados/incertezas/fatores por ponto, método, rastreabilidade e observações técnicas.
- Número do certificado e vencimento são apresentados para revisão e, quando salvos explicitamente, atualizam os mesmos campos no cadastro original. U95/K/Veff usados pelo motor metrológico não são alterados pela extração nem pelo editor adicional.
- Foto JPG/PNG, redimensionada no navegador, validada no servidor, com opção de substituição/remoção do vínculo. Foto acessível no editor/lista e incorporada ao snapshot do documento, quando cadastrada.
- IA lê o PDF anexado ao padrão, incluindo páginas, canais e pontos. Retorna proposta editável e alertas; não grava automaticamente. Ausências não autorizam inventar valores/datas. Certificados compartilhados entre peças/canais devem ser conferidos contra a identificação específica do cadastro.
- Registro de conferência, autor, revisão, certificado de origem e hash. Mudança de PDF/cadastro pode impedir emissão de prévia desatualizada. Extração expira em seis horas, vinculada a usuário, padrão e revisão.
- Inventário permite dados pendentes, explicitamente sinalizados. Pedido de orçamento exige identificação técnica essencial, PDF e conferência atual antes de chamar a IA.
- Solicitação inclui destinatário opcional, orientações opcionais, texto revisável, detalhes técnicos e pedido de intervalo de recalibração pretendido de três anos, sujeito à avaliação técnica. Não define validade comercial de três anos nem altera automaticamente vencimentos.
- Rascunho salvo na geração; emissão cria cópia final separada, com HTML e snapshot JSON. Histórico permite reabrir, baixar HTML e imprimir/salvar PDF. Documentos anteriores não são regenerados com o cadastro atual.
- Chamadas repetidas identificadas pela mesma requisição recuperam a cópia, evitando duplicação na persistência. A emissão de rascunho é restrita ao seu autor; consultas e controles são internos, bloqueados ao perfil CLIENTE.

## Persistência e compatibilidade

- `PADROES_CONTROLE_DOCUMENTAL`: ID original, dados complementares em JSON, revisão, atualização e autor.
- `PADROES_DOCUMENTOS_EMITIDOS`: identificador, requisição, tipo, estado, data, autor, IDs de HTML/JSON e resumo pesquisável.
- Provisionamento aditivo e idempotente sob lock; nunca chamar `setupSGO()` para este recurso.
- Salvamento do complemento e dos dois campos originais ocorre em uma única chamada atômica Sheets `batchUpdate`, usando `stringValue` para preservar zeros e impedir interpretação de texto como fórmula.
- Pasta própria criada no Drive, fora das pastas dos clientes, sem liberação pública por link. ID em `PADROES_CONTROLE_FOLDER_ID`. Acesso às cópias pelo portal autenticado.
- CSS copiado das classes de impressão `.tplInv-prt-*` do documento do inventário. Cabeçalho usa os dados corporativos existentes, preservados no snapshot.
- Sem novo escopo OAuth: Drive, Sheets e chamada externa já existem no manifesto do portal.

## Arquivos

Novos: `SGO_Padroes_Documentos.js`, `SGO_Padroes_DocumentoHTML.js`, `SGO_Padroes_DocumentoCSS.js`, `JS_Padroes_Documentos.html`.

Integrações mínimas: rotas em `SGO_CertCal_Main.js` e carregamento do script adicional em `CertCal_obterConteudoModulo`, dentro de `SGO_CertCal_ConteudoModulo.js`. Cálculos, documento oficial e relatórios gerenciais anteriores preservados.

Fonte: `apps-script-imports/portal_sgo_versao_cnpj_db`. O projeto Apps Script da raiz é outro; não fazer push pela raiz.

## Validação

- 18 testes de backend: acesso, ausência de dados, conferência, localização livre, zeros, gravação atômica, conflito, foto inválida, escape HTML, idempotência, snapshots imutáveis, mudança de PDF, texto revisado, extração e IA truncada.
- 12 testes DOM com o script integrado: formulário original preservado, filtros, seleção, editor, leitura sem gravação, localização, geração, emissão, histórico e falhas/carregamento.
- 22 regressões do CertCal, incluindo reprocessamento local dos 90 snapshots e 289 pontos existentes.
- Documento e tela inspecionados no Edge com perfil isolado; PDF de teste com duas páginas confirmado em A4 paisagem.
- Testes de IA, Drive e Sheets nos cenários novos usam respostas simuladas. Não equivalem a validação operacional autenticada contra os serviços reais.

Scripts: `_tools/test_padroes_docs_20260921.js`, `_tools/test_ui_padroes_docs_20260921.js`, `_tools/test_certcal_20260913.js`, `_tools/verificar_pdf_padroes_20260921.js`.

## Cópias e publicação

- `backups/PADROES_DOCS_20260921/original`: fonte local anterior aos acréscimos.
- `backups/PADROES_DOCS_REMOTE_20260921`: cópia obtida do código remoto antes do envio.
- `backups/PADROES_DOCS_STAGE_20260921`: pacote preparado sobre a cópia remota, substituindo somente dois arquivos e acrescentando quatro.
- `backups/PADROES_DOCS_20260921/manifest-stage.json`: inventário de hashes do pacote.
- Mesma pasta contém exemplos sintéticos de HTML, screenshots e PDF de teste; não são documentos reais emitidos para a empresa.

**Publicado em produção na versão 276 em 21/09/2026**, no mesmo [endereço do portal](https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec). Deployment confirmado por consulta posterior. Página pública respondeu HTTP 200 com conteúdo do portal.

Após o push, nova cópia em `backups/PADROES_DOCS_VERIFICADO_20260921` confirmou os 190 arquivos, com apenas seis diferenças em relação ao remoto anterior. Verificação: `_tools/verificar_remoto_padroes_docs_20260921.js`.

Versão anterior: 275. Reverter o deployment para 275 retira a nova interface, mas não desfaz dados que a equipe tenha gravado nem apaga documentos. Não houve preenchimento em massa, atribuição de localizações ou emissão real durante os testes desta sessão. A primeira leitura de PDF pela IA, gravação e emissão autenticadas ainda requerem conferência operacional no portal.

## Uso e retomada

1. Abrir Certificado de Calibração e localizar a nova seção de controle dos padrões.
2. Abrir “Dados, localização e foto”, preencher o local real e anexar foto, se disponível.
3. Usar “Ler certificado com IA”, revisar o PDF completo, corrigir dados e marcar conferência. Salvar.
4. Marcar padrões e gerar inventário ou solicitação de orçamento. Orientações podem ficar vazias.
5. Revisar texto e prévia; emitir/salvar cópia. Usar histórico para consultar documentos anteriores.

Não foram inventadas localizações, fotos ou informações faltantes. A auditoria anterior dos 89 padrões (`AUDITORIA_89_PADROES_CERTCAL_20260913.md`) permanece como referência histórica; não é uma confirmação da extração atual dos anexos em produção. A leitura/conferência atual é feita pelo novo fluxo.

Limites explícitos: até 200 registros por documento, PDF de até 12 MB por extração, fotos somadas até 8 MB no documento, histórico retorna até 200 correspondências por busca e dados complementares até 44 mil caracteres serializados por padrão. Exceder o limite gera mensagem, nunca truncamento silencioso.

Referência técnica da integração multimodal: [documentação oficial Gemini para processamento de PDFs](https://ai.google.dev/gemini-api/docs/document-processing), consultada em 21/09/2026. A integração reutiliza o provedor e a configuração de IA já presentes no portal.
