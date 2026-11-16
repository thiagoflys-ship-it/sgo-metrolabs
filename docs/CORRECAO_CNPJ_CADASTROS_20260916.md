# CNPJ, cadastros e integração — 16/09/2026

Pendências gerais e iniciativas futuras: [índice do projeto](PENDENCIAS_PROJETO.md). O estudo da futura Central de Gestão Operacional está registrado nesse índice e não deve ser iniciado agora.

## Estado da entrega

Banco real corrigido; código corrigido no DEV e reobtido para conferência. **Produção `/exec` atualizada para a versão 273 em 16/09/2026**, no deployment existente. O usuário autorizou expressamente a publicação para a equipe testar: “pode publicar para eles testarem”. Essa orientação substituiu, nesta entrega, a sequência de validação humana prévia prevista na seção 7 de `STATUS_SESSAO_PORTAL_CNPJ_DB_20260709.md`. O teste humano de ponta a ponta continua pendente.

- Projeto: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.
- Banco: `1Ny2wiUrzqa8i3IirgEaW11ZZe_IFH9cs1kpXkxu3VzM`.
- [DEV para validação](https://script.google.com/macros/s/AKfycbyWt7ZTH1YcOTeX6vL3UIX6BFuqbCLvaAD4KUG7BE-x/dev).
- Deployment de produção existente: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`. Preservar essa URL na publicação.

## Causas confirmadas

1. `SGO_DATA.insert/insertMany/updateByRowIndex` escreviam CNPJ em células sem formato de texto. Sheets convertia `08562523000133` para o número `8562523000133`.
2. A comparação de duplicidade não recuperava o zero legado. Assim, o CNPJ novo e o salvo eram considerados diferentes.
3. Certificado de Calibração e NR13 criavam o cliente e procuravam novamente pelo CNPJ; a busca falhava depois da conversão numérica, deixando cliente salvo sem concluir o fluxo.
4. Auvo criava unidade quando não encontrava mapeamento de sincronização, sem reconhecer a unidade manual existente pelo CNPJ.
5. A edição normalizava objetos completos com campos vazios, podendo apagar colunas adicionais como `ORIGEM`.

## Alterações no banco real

- HSCOR: **11 clientes → 1; 2 unidades → 1**. Removidos dez clientes repetidos sem vínculos operacionais encontrados e uma unidade repetida sem vínculos. Mantidos os IDs originais:
  - Cliente `7d181989-6e99-425a-8c61-c39713b52c8f`.
  - Unidade `3ac61e48-0769-49c5-8f95-64e9aed3af45`.
- HSCOR permanece com CNPJ textual `08562523000133`. Cidade/UF vazias da unidade original preenchidas a partir da unidade repetida: Duque de Caxias/RJ.
- **77 células de CNPJ** válidas convertidas para texto antes das exclusões; zeros restaurados somente quando o preenchimento passa nos dígitos verificadores. Colunas D de clientes e unidades formatadas como texto para proteger novos registros na grade existente.
- Clinipam e Notre Dame: removida uma unidade duplicada de cada. Conferidos mesmo CNPJ, cliente e endereço. Dois equipamentos e dois mapeamentos Auvo foram transferidos para os IDs preservados, com releitura de confirmação.
- Resultado: **30 clientes e 34 unidades**. Nenhum certificado/PDF foi apagado ou reemitido.
- Backups, requisições e releituras: `backups/CNPJ_DADOS_20260916/`.

## Código no DEV

- Preserva CNPJ como texto na linha efetivamente gravada, inclusive em lote e expansão da grade.
- Recupera CNPJ legado na leitura compartilhada quando os dígitos verificadores permitem; novos formulários continuam validando o CNPJ completo.
- Protege conferência/gravação por lock, incluindo concorrência e duplicidade no próprio lote.
- Cadastro compartilhado bloqueia CNPJ repetido de cliente/unidade, nome de unidade repetido no mesmo cliente sem CNPJ, TAG real repetida de equipamento no mesmo cliente, usuário, placa, usuário de técnico e identidade completa de padrão (TAG/descrição/certificado/validade). Marcadores como `N/P` não são tratados como TAG única. Calibrações periódicas e grandezas distintas permanecem permitidas.
- Certificado usa diretamente o ID retornado pelo cadastro; criação cliente/unidade usa um único lock e compensa falha na unidade. NR13 reutiliza esse fluxo.
- Cadastro de equipamento valida a relação cliente/unidade quando criada ou alterada. Emissão de certificado recusa relação inconsistente.
- Auvo reconhece unidade existente; ambiguidade ou vínculo com outro cliente gera erro para revisão, em vez de criar outra unidade.
- Edição preserva campos adicionais do cadastro.
- Desktop já possuía Editar/Excluir e restrição de exclusão no servidor. Mobile ganhou botão explícito de exclusão para ADMIN/DIRETORIA/GESTOR. Exclusão de cliente/unidade com vínculos é recusada, orientando transferir vínculos ou inativar.
- Eliminada colisão global `dataParaIsoOuVazio_` entre certificado e NR13 com prefixos próprios. As implementações eram iguais; não foi atribuída a ela a falha do HSCOR.

Arquivos alterados: `SGO_Data.js`, `SGO_Utilis.js`, `SGO_Clientes.js`, `SGO_Unidades.js`, `SGO_Equipamentos.js`, `SGO_CertCal_Main.js`, `SGO_NR13_Main.js`, `SGO_Auvo_Reverso.js`, `JS_Core.html`.

## Verificação e limites

- 16 verificações de normalização, unicidade, vínculos, formato de célula e sintaxe; 16 cenários de integração usando funções reais com Sheets/locks simulados.
- Regressões: 22 testes de certificado, 18 de Frota e dois grupos de verificação de relatórios Auvo passaram.
- Releitura confirmou **184 arquivos idênticos** ao estágio enviado e somente nove arquivos modificados frente ao backup remoto.
- Varredura estática: 1.688 funções globais de servidor; nenhuma colisão restante. Nenhuma chamada ausente no subconjunto de RPCs reconhecido pelo scanner. Isso não constitui teste funcional integral de todos os módulos.
- Não houve navegação autenticada de ponta a ponta, emissão real de certificado de teste ou inspeção visual no navegador. Dados e formatos foram conferidos pela API.
- `Integracao_OSPlus.js` e `SGO_Integracao_Engine.js` usam escrita direta em outro banco; não foram executados. O segundo contém mapeamento posicional legado que exige conferir o esquema do destino antes de alterar ou executar. A proteção central cobre módulos que escrevem por `SGO_DATA`, não qualquer sistema externo.

## Pendências de identificação

- Santa Martha: mesmo CNPJ, endereços Dr. Mario Viana, 653 e Travessa Elzir de Almeida Brandão, 70. Não presumir que sejam o mesmo local.
- IMED Formosa: mesmo CNPJ, endereços Maestro João Luiz do Espírito Santo, 480 e Rua Albino Abadio de Oliveira. Aguardando confirmação.
- IMED Uruaçu: CNPJ `19324171000870` em unidades vinculadas a clientes diferentes (cliente próprio de Uruaçu e agrupamento Formosa/Auvo). Precisa definir o agrupamento correto antes de consolidar.
- Nove equipamentos: `CLIENTE_ID` de Notre Dame com `UNIDADE_ID` de Santa Martha. TAGs: EC-003247, 3246 (dois registros), EC-057459, EC-102696, EC-102695, EC-102699, N/P e EC-102697. Não corrigidos por suposição.
- **39 grupos de equipamentos com TAG repetida no mesmo cliente**, desconsiderando marcadores N/P. Listados em `backups/CNPJ_DADOS_20260916/equipamentos_repetidos.json`. Não excluídos nesta limpeza de clientes/unidades: é necessário reconciliar vínculos de certificados, documentos, Auvo e QR antes da remoção física. A prevenção de novos cadastros repetidos já está no DEV.

## Validação humana após a publicação autorizada

Recarregar o portal publicado, buscar `08562523000133` em Clientes, Unidades e Certificado de Calibração. Selecionar o HSCOR existente e confirmar a passagem para Equipamento. HSCOR não tinha equipamento cadastrado na leitura inicial; cadastrar o equipamento real necessário ao atendimento com sua unidade. Conferir Editar/Excluir com gestor; cadastro com vínculo deve ser protegido. Não é necessário emitir um certificado real apenas para testar navegação.

Publicação realizada com `clasp version` (273) e atualização do deployment existente, preservando a URL. Antes da publicação, nova leitura remota em `backups/CNPJ_PUBLICACAO_IPV4_20260916/` confirmou os 184 arquivos idênticos ao estágio testado. Versão anterior para eventual reversão: 272. O DEV e a produção usam o banco real.

Backups de código: `CNPJ_REMOTE_20260916`, `CNPJ_LOCAL_PRE_20260916`, `CNPJ_PRE_PUSH_CHECK_20260916`. Envio: `CNPJ_STAGE_20260916`. Releitura: `CNPJ_VERIFICACAO_20260916`.
# Atualização e retomada

O trabalho evoluiu para o painel de vínculos e a interface com manual integrado, publicados na **versão 275**. Para retomar, consultar o [inventário consolidado de Clientes e Unidades](INVENTARIO_PORTAL_CLIENTES_UNIDADES_20260917.md), que registra versões, fontes, testes, cópias e pendências. O conteúdo abaixo preserva o histórico da correção de 16/09/2026.
