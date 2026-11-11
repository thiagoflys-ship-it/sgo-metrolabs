// Catálogo de poderes do SGO+ (ETAPA 1, só leitura). Fonte única do catalogo.json, do CSV e das tabelas do MD.
// Cada poder: padrao = expressão JS sobre eu {id,login,perfil,area,vinculo} e as funções H (abaixo), que
// reproduzem a regra de hoje. "travas" = regras para achar no inventário as checagens que o poder substituirá.
'use strict';

// ---------------------------------------------------------------- dados reais (cadastro-e-config.txt)
const USUARIOS = [
  ['b36756b2-d5e1-474d-9ae3-f5e5826a6c13', 'bento', 'TECNICO', 'METROLOGIA', 'PJ'],
  ['3a63382c-e790-4e5a-b60c-28a83a7e1a26', 'admin', 'ADMIN', 'DIRETORIA', 'DIRETORIA'],
  ['2263e0c4-e5d2-48f4-bf2c-86badf283993', 'matheusgodoi', 'GESTOR', 'QUALIDADE', 'PJ'],
  ['2a50720e-c4fd-4145-a1e1-c42f6b4f9c27', 'hidelbrandosampaio', 'TECNICO', 'TECNICA', 'CLT'],
  ['ef9153c0-834c-40c8-a8b1-521f5cba4992', 'paulohenrique', 'TECNICO', 'TECNICA', 'CLT'],
  ['8d120910-7386-44ac-a812-bcd5500380f1', 'gabrielpereira', 'TECNICO', 'TECNICA', 'CLT'],
  ['1749164c-7e45-494e-b81c-4bd1f4080bf0', 'elisa', 'GESTOR', 'RH', 'CLT'],
  ['84d0dbf3-216e-414e-af56-3b0ee0b18fc7', 'wanessa', 'FINANCEIRO', 'FINANCEIRO', 'CLT'],
  ['51cdecab-374a-46a4-b858-902fd020c93c', 'beatriz', 'METROLOGIA', 'METROLOGIA', 'CLT'],
  ['0b2114c3-5d38-4085-833c-feab626bf7fc', 'guilherme', 'TECNICO', 'LOGISTICA', 'CLT'],
  ['ae06746e-fee7-4898-95ef-4aedb81046bd', 'hst', 'CLIENTE', '', 'CLIENTE'],
  ['707226a2-df0f-40c4-a6f5-71f5c80a3fa4', 'hcn', 'CLIENTE', '', 'CLIENTE'],
  ['1be90789-c60b-4033-bbca-b60c8564b747', 'ndi', 'CLIENTE', '', 'CLIENTE'],
  ['1b451e8f-bcee-4d1b-9ad3-4f676ad29c91', 'ricardo', 'GESTOR', 'COMERCIAL', 'PJ'],
  ['3adc28ff-55ea-4149-b784-6300758ec4c2', 'gabrieldias', 'TECNICO', 'TECNICA', 'CLT'],
  ['1ec5d6d0-284c-4919-aa05-8804172a070e', 'charles', 'DIRETORIA', 'DIRETORIA', 'DIRETORIA'],
  ['8b894cc5-9672-4dd7-837e-b8f7adffca60', 'joaopedro', 'TECNICO', 'TECNICA', 'CLT'],
  ['38ac1b77-a06b-408c-ad9a-6685bc49ae5d', 'energiza2209', 'REPRESENTADA', '', 'REPRESENTANTE'],
  ['33cf57ac-30e6-4e3e-ae6d-95e79ff0dfdd', 'priscilla', 'GESTOR', 'METROLOGIA', 'CLT'],
  ['f5c4cb0e-a3bf-4988-9a78-94738cd3f912', 'bruna', 'GESTOR', 'METROLOGIA', 'CLT'],
  ['fa80f784-f046-4912-a00e-3c8be150cdd8', 'monica', 'COMERCIAL', 'COMERCIAL', 'CLT'],
  ['06a7b944-9d66-4d9b-b911-cb078e934a77', 'rafael.marques', 'TECNICO', 'TECNICA', 'CLT'],
  ['512014b5-d9ba-4db5-945d-debbdac1d3f7', 'qualidade', 'REPRESENTADA', '', 'REPRESENTANTE'],
].map(([id, login, perfil, area, vinculo]) => ({ id, login, perfil, area, vinculo }));

const CFG = {
  donos: ['admin'],                                                  // SGO_Chaves.js:32
  compradores: ['1ec5d6d0-284c-4919-aa05-8804172a070e', '0b2114c3-5d38-4085-833c-feab626bf7fc', '2263e0c4-e5d2-48f4-bf2c-86badf283993', 'fa80f784-f046-4912-a00e-3c8be150cdd8', '1b451e8f-bcee-4d1b-9ad3-4f676ad29c91'], // CMP_CONFIG.REGRAS
  substitutos: [], areaCompras: 'LOGISTICA',
  triagem: ['f5c4cb0e-a3bf-4988-9a78-94738cd3f912', '1ec5d6d0-284c-4919-aa05-8804172a070e', 'b36756b2-d5e1-474d-9ae3-f5e5826a6c13', '2263e0c4-e5d2-48f4-bf2c-86badf283993', '1b451e8f-bcee-4d1b-9ad3-4f676ad29c91'], // ATEC_CONFIG.REGRAS.triagem
  comGestores: [],                                                   // COM_CONFIG.METODOLOGIA.gestores
  repResponsaveis: [],                                               // ATEC_CONFIG.REGRAS.representacao.responsaveis
  // NÃO EXTRAÍDOS (premissa: vazios). Conferir antes da migração; ver "premissas" no catalogo.json.
  gestoresPorArea: {},                                               // GES_CONFIG.gestoresPorArea (propriedade do script)
  repEmNome: [],                                                     // lista "Quem pode abrir pedido em nome da representada"
  pontoRhIds: [],                                                    // configuração do Assistente do ponto (rhIds)
  autPermissoesAcionar: [],                                          // AUT_PERMISSOES (vazia em produção)
  idsTransferirOS: ['f5c4cb0e-a3bf-4988-9a78-94738cd3f912', '2263e0c4-e5d2-48f4-bf2c-86badf283993'], // SGO_Assistencia_OS.js:629-632
  relatorioInterno: { id: 'b36756b2-d5e1-474d-9ae3-f5e5826a6c13', login: 'bento' },                    // *_ConteudoModulo.js (bentoAutorizado)
};

// ---------------------------------------------------------------- regras-base (espelho do código)
const H_SRC = `
const H = {
  dono: eu => CFG.donos.indexOf(eu.login) >= 0,                                   // Chaves_ehDonoUsuario_
  externo: eu => ['CLIENTE', 'REPRESENTADA', 'AUVO_SYNC', ''].indexOf(eu.perfil) >= 0,
  interno: eu => !H.externo(eu),                                                  // exigirSessao recusa REPRESENTADA; módulos recusam CLIENTE
  gestaoDecisoes: eu => ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0,  // isAdminPerfilAuth_ / isAdminSession
  rotina: eu => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].indexOf(eu.perfil) >= 0, // SGO_ehGestaoRotina_
  diretoria: eu => eu.perfil === 'DIRETORIA' || H.dono(eu),                       // perfil Diretoria ou dono
  equipeTecnica: eu => ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'].indexOf(eu.perfil) >= 0, // SGO_QEQ_PERFIS_EQUIPE / BAIXATEMP PERFIS_EQUIPE
  sigiloQualidade: eu => H.diretoria(eu) || (['GESTOR', 'ADMIN'].indexOf(eu.perfil) >= 0 && eu.area === 'QUALIDADE'), // Conduta_veIdentidade_ / Ges_veSigilo_
  gpa: (area) => (CFG.gestoresPorArea[area] || []),
  com: eu => { // Com_nivelDe_
    const dir = H.diretoria(eu);
    const gestao = eu.perfil === 'ADMIN' || dir || (eu.perfil === 'GESTOR' && eu.area === 'COMERCIAL') || ((CFG.comGestores.concat(H.gpa('COMERCIAL'))).indexOf(eu.id) >= 0 && eu.perfil !== 'CLIENTE');
    const vendedor = !gestao && (eu.perfil === 'COMERCIAL' || (eu.area === 'COMERCIAL' && eu.perfil !== 'CLIENTE' && eu.perfil !== 'RH'));
    const financeiro = !gestao && !vendedor && (eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO');
    const catalogo = gestao || financeiro;
    return { gestao, vendedor, financeiro, veValores: gestao || vendedor || financeiro, veCusto: catalogo, catalogo, catalogoVenda: vendedor && !catalogo, diretoria: dir };
  },
  cmp: eu => { // Cmp_nivelDe_
    if (H.externo(eu)) return { nivel: 'NENHUM' };
    const dir = H.diretoria(eu), admin = eu.perfil === 'ADMIN';
    const gestao = admin || dir || (eu.perfil === 'GESTOR' && eu.area === CFG.areaCompras);
    const lista = CFG.compradores.concat(CFG.substitutos).indexOf(eu.id) >= 0;
    const gestor = eu.perfil === 'GESTOR';
    const fin = eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO';
    const comprador = gestao || lista;
    return { nivel: 'INTERNO', gestao, comprador, gestor: gestor || gestao, financeiro: fin || dir || admin, veValores: comprador || gestor || fin, veFila: comprador || gestor,
      regras: admin || dir || H.rotina(eu), diretoria: dir, admin };
  },
  ast: eu => { // Ast_nivelDe_
    if (H.externo(eu)) return { interno: false };
    const dir = H.diretoria(eu), admin = eu.perfil === 'ADMIN';
    const gestao = admin || dir || (eu.perfil === 'GESTOR' && eu.area === 'TECNICA') || H.gpa('TECNICA').indexOf(eu.id) >= 0;
    const tecnico = eu.perfil === 'TECNICO' || eu.area === 'TECNICA';
    const comercial = eu.perfil === 'COMERCIAL' || eu.area === 'COMERCIAL';
    const fin = eu.perfil === 'FINANCEIRO' || eu.area === 'FINANCEIRO';
    return { interno: true, gestao, tecnico, admin, diretoria: dir, comercial, regras: admin || dir || eu.perfil === 'GESTOR', excluir: admin || dir || eu.perfil === 'GESTOR',
      valores: gestao || comercial || fin || eu.perfil === 'GESTOR', triagem: CFG.triagem.indexOf(eu.id) >= 0 };
  },
  pto: eu => { // Ponto_eu_
    const admin = eu.perfil === 'ADMIN', dir = H.diretoria(eu);
    const rh = eu.perfil === 'RH' || eu.area === 'RH' || CFG.pontoRhIds.indexOf(eu.id) >= 0;
    const verTodos = admin || dir || rh;
    const areasGestor = verTodos ? [] : [].concat(eu.perfil === 'GESTOR' && eu.area ? [eu.area] : [], Object.keys(CFG.gestoresPorArea).filter(a => H.gpa(a).indexOf(eu.id) >= 0));
    return { configurar: admin || dir || rh || H.rotina(eu), verTodos, tratar: verTodos, gestor: !verTodos && areasGestor.length > 0 };
  },
  lic: eu => eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || (eu.perfil !== 'CLIENTE' && eu.perfil !== 'REPRESENTADA' && H.dono(eu)), // Lic_nivelDe_
  autAdministra: eu => eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || H.dono(eu) || eu.vinculo === 'DIRETORIA', // AutPred_administra_ (inclui VINCULO_TRABALHO = DIRETORIA)
  gestoresCompras: () => [],                                       // Cmp_gestoresCompras_: gestoresPorArea[LOGISTICA] ou GESTOR com área LOGISTICA (hoje nenhum)
};`;

// ---------------------------------------------------------------- catálogo
// m = regras de mapeamento: [arquivoRe, funcaoRe|null, gateRe|null, extra] ; extra = { nivel, acao, caso, linha }
const P = [];
function poder(codigo, modulo, lote, categoria, nome, descricao, padrao, m, extra) {
  P.push(Object.assign({ codigo, modulo, lote, categoria, nome, descricao, padrao, m: m || [] }, extra || {}));
}

// ===== LOTE 1 — Contas, senhas e acessos
const L1 = 'Contas e acessos';
poder('CONTAS_VER', L1, 1, 'ver', 'Ver a lista de contas', 'Abre Administração > Usuários: nomes, e-mails, perfis, áreas e situação das contas.', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^(listar|obter|pesquisar)$/, /verificarPermissaoConsulta_/], [/SGO_Usuarios/, /^usuariosPainel$/, /SGO_ehGestaoRotina_|isAdminPerfilAuth_|SGO_podeConsultarPessoas_/]]);
poder('CONTAS_CRIAR', L1, 1, 'operar', 'Criar conta', 'Cadastra uma pessoa nova no SGO+ (perfis comuns; Administrador e Diretoria têm caixa própria).', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^criar$/, /verificarPermissaoAdmin_/]]);
poder('CONTAS_ALTERAR_OUTROS', L1, 1, 'operar', 'Alterar dados de outra pessoa', 'Muda nome, e-mail, celular e vínculo de trabalho de outra conta. Atenção: o e-mail recebe o link de nova senha.', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^atualizar$/, /verificarPermissaoAdmin_/]]);
poder('CONTAS_MUDAR_PERFIL', L1, 1, 'administrar', 'Mudar o perfil de outra pessoa', 'Troca o perfil (ex.: Técnico para Gestor). Hoje é a mesma trava de "alterar dados"; ninguém muda o próprio perfil (proteção fixa).', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^atualizar$/, /exigirNaoMudarProprioPerfil_/]], { obs: 'Hoje não existe trava separada: usuariosAtualizar aceita PERFIL com a mesma regra de CONTAS_ALTERAR_OUTROS (SGO_Usuarios.js:331).' });
poder('CONTAS_REDEFINIR_SENHA', L1, 1, 'administrar', 'Redefinir senha de outra pessoa', 'Envia o link de nova senha ou define senha provisória de outra conta.', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^enviarLinkRedefinicao$/, /verificarPermissaoAdmin_/]]);
poder('CONTAS_INATIVAR', L1, 1, 'excluir', 'Inativar e reativar conta', 'Tira ou devolve o acesso de uma pessoa, guardando o histórico.', 'H.rotina(eu)',
  [[/SGO_Usuarios/, /^(inativar|reativar)$/, /verificarPermissaoAdmin_/]]);
poder('CONTAS_EXCLUIR', L1, 1, 'excluir', 'Excluir conta de vez', 'Exclusão lógica definitiva da conta (some da lista e dos seletores).', "eu.perfil === 'ADMIN'",
  [[/SGO_Usuarios/, /^excluir$/, /verificarPermissaoAdmin_|exigirExcluir_/], [/SGO_Usuarios/, /^usuariosVinculosConta$/, null], [/SGO_Usuarios/, /^exigirExcluir_$/, null]]);
poder('CONTAS_GERIR_ADMINISTRADOR', L1, 1, 'administrar', 'Gerir contas de Administrador', 'Criar, alterar, inativar, excluir ou mandar link para conta de perfil Administrador, ou dar esse perfil.', "eu.perfil === 'ADMIN'",
  [[/SGO_Usuarios/, /^(criar|atualizar|inativar|reativar|excluir|enviarLinkRedefinicao)$/, /exigirAdminParaContaAdmin_/], [/SGO_Usuarios/, /^usuariosPainel$/, null, { linha: [1100, 1142] }]]);
poder('CONTAS_DAR_DIRETORIA', L1, 1, 'administrar', 'Dar ou alterar o perfil Diretoria', 'Promover alguém a Diretoria ou mexer numa conta Diretoria (a Diretoria decide casos próprios no Conduta).', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_Usuarios/, /^usuariosPainel$/, null, { linha: [1102] }]], { obs: 'Mesma função exigirAdminParaContaAdmin_ (SGO_Usuarios.js:247-258), ramo alvo = DIRETORIA.' });
poder('AREAS_GERIR', L1, 1, 'administrar', 'Cadastrar áreas', 'Cria, renomeia, inativa áreas e preenche área vazia pelo perfil.', 'H.rotina(eu)',
  [[/SGO_Areas/, /^(areasPainel|areasSalvar|areasAlterarSituacao|areasPreencherPeloPerfil)$/, /Areas_sessaoGestao_/]]);
poder('AREAS_DEFINIR_PESSOA', L1, 1, 'administrar', 'Mudar a área de uma pessoa', 'Define a área do cadastro. Atenção: a área dá acessos (Qualidade = nomes do Conduta; Comercial = vendas e custos; RH = ponto de todos).', 'H.rotina(eu)',
  [[/SGO_Areas/, /^areasDefinirDoUsuario$/, /Areas_sessaoGestao_/]]);
poder('SEGURANCA_VER_REGISTRO', L1, 1, 'sigiloso', 'Ver a Segurança do acesso e o registro de entradas', 'Painel de segurança: quem entrou, IP, aparelho, horários, troca de senha pendente.', "eu.perfil === 'ADMIN' || H.dono(eu) || H.gestaoDecisoes(eu)",
  [[/SGO_SegurancaAcesso/, /^SegAcesso_api$/, /SegAcesso_podeVer_/]]);
poder('SEGURANCA_ALTERAR', L1, 1, 'administrar', 'Alterar a Segurança do acesso', 'Liga o código no celular, exige troca de senha de todos ou de uma pessoa, zera o segundo fator, cadastra o modelo do WhatsApp.', "eu.perfil === 'ADMIN' || H.dono(eu)",
  [[/SGO_SegurancaAcesso/, /^(SegAcesso_api|exigirAdmin)$/, /^exigirAdmin$|SegAcesso_ehAdmin_/]]);
poder('SISTEMA_SEGREDOS_SERVIDOR', L1, 1, 'administrar', 'Gravar chaves e senhas no servidor (/_sgo/segredos)', 'Grava ou apaga chaves da IA, Omie, Auvo, e-mail do sistema, Z-API e Meta na tela do servidor.', 'H.gestaoDecisoes(eu)',
  [], { travasExtras: [{ arquivo: 'base/src/servicos/segredos.ts', linha: 34, funcao: 'rotasSegredos (POST /_sgo/segredos)', acao: 'gravar/apagar segredo', regraAtual: 'isAdminSession (ADMIN, DIRETORIA, GESTOR)' }, { arquivo: 'base/src/servidor.ts', linha: 299, funcao: 'ehAdmin', acao: 'conferência usada por /_sgo/segredos e /_sgo/estado', regraAtual: 'isAdminSession' }] });
poder('SISTEMA_PAINEL_SERVIDOR', L1, 1, 'ver', 'Ver o painel do servidor (/_sgo/estado)', 'Backup, restauração, vigia, fila de e-mails e erros das últimas 24 h.', 'H.gestaoDecisoes(eu)',
  [], { travasExtras: [{ arquivo: 'base/src/servicos/estado.ts', linha: 19, funcao: 'rotasEstado (POST /_sgo/estado)', acao: 'ver o estado do servidor', regraAtual: 'isAdminSession (ADMIN, DIRETORIA, GESTOR)' }] });
poder('MODO_PERSONALIZADO_DESIGNAR', L1, 1, 'administrar', 'Designar responsáveis do modo personalizado', 'Escolhe quem ajusta parâmetros dos geradores e aprova documentos personalizados; apaga senha e desbloqueia.', "eu.perfil === 'ADMIN' || H.dono(eu)",
  [[/SGO_ModoPersonalizado/, null, /SGO_MP_exigirAdmin_/]]);
poder('ACESSOS_GERIR', L1, 1, 'administrar', 'Gerir os acessos (tela Acessos)', 'Marca e desmarca caixas de outras pessoas, aplica modelos e copia acessos. Ninguém altera as próprias caixas.', 'H.dono(eu)',
  [], { nova: true, obs: 'Poder novo (não há trava hoje). Padrão: só o dono do sistema; ele pode autorizar outra pessoa.' });

// ===== LOTE 2 — Programa de conduta (só as travas de acesso; regras do programa não mudam)
const L2 = 'Programa de conduta';
poder('CONDUTA_PARTICIPAR', L2, 2, 'operar', 'Participar do Programa de conduta', 'Registrar ocorrência e evento positivo, ver as próprias, dar ciência, contestar e recorrer do que é seu, lançar missão, biblioteca.', 'H.interno(eu)',
  [[/SGO_Conduta/, null, /Conduta_exigirEquipe_/]]);
poder('CONDUTA_CONSULTAR_EQUIPE', L2, 2, 'ver', 'Consultar o Conduta de toda a equipe', 'Ausências, missões, fechamentos (com valores por pessoa) e relatórios gerenciais de todos, sem o nome do envolvido nas ocorrências.', 'H.gestaoDecisoes(eu) || eu.perfil === "RH"',
  [[/SGO_Conduta/, null, /Conduta_podeConsultarTodos_/]]);
poder('CONDUTA_VER_NOMES', L2, 2, 'sigiloso', 'Ver quem é o envolvido (sigilo)', 'Nome do envolvido, foto da evidência, extrato de outra pessoa, relatório da equipe, sugestões, planos e indicadores.', 'H.gestaoDecisoes(eu) && H.sigiloQualidade(eu)',
  [[/SGO_Conduta/, /^(Conduta_apiGerarExtratoColaborador|Conduta_apiObterFechamento|Conduta_apiPreviaFechamento|Conduta_apiListarMissoes|Conduta_apiRegistrarMissao|Conduta_apiObterSigilo|Conduta_apiListarOcorrencias|Conduta_apiContestarOcorrencia|Conduta_apiRecorrerOcorrencia|Conduta_apiListarSugestoes|Conduta_apiKanbanQualidade|Conduta_apiGerarRelatorioEquipe|Conduta_podeVerOcorrencia_|Cndq_exigirConsulta_|Conduta_apiObterFotoOcorrencia|Conduta_apiListarPlanos|Conduta_apiIndicadoresQualidade)$/, /isAdminSession|Conduta_veIdentidade_|Conduta_podeVerOcorrencia_|Cndq_exigirConsulta_/]]);
poder('CONDUTA_DECIDIR', L2, 2, 'aprovar', 'Decidir ocorrências', 'Homologar, julgar, aceitar ou descartar sugestão, análise de causa e plano de ação.', 'H.gestaoDecisoes(eu) && H.sigiloQualidade(eu)',
  [[/SGO_Conduta/, null, /Conduta_exigirDecisor_/]]);
poder('CONDUTA_DECIDIR_COMO_DIRETORIA', L2, 2, 'aprovar', 'Decidir como Diretoria (casos próprios e de gestores)', 'Decide ocorrência ou missão em que é envolvido (com fundamentação), sugestões vindas da avaliação de gestor; registro nasce homologado.', 'H.diretoria(eu)',
  [[/SGO_Conduta/, null, /Conduta_ehDiretoriaOuDono_|Cndq_exigirDiretoriaSeGestao_/]], { obs: 'Regra do programa (decisão do dono de 19/10/2026). Recomendação: manter a caixa travada só para a Diretoria.' });
poder('CONDUTA_MISSAO_DECIDIR', L2, 2, 'valores', 'Aprovar e remover missões (incentivo em R$)', 'Aprova ou recusa missão de viagem (incentivo) e remove missão lançada.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Conduta_Missao/, /^(Conduta_apiDecidirMissao|Conduta_apiRemoverMissao)$/, /Conduta_exigirGestor_/]]);
poder('CONDUTA_AUSENCIA_GERIR', L2, 2, 'sigiloso', 'Lançar e remover ausências', 'Registra e remove ausência de colaborador no programa.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Conduta_Ausencia/, null, /Conduta_exigirGestor_/]]);
poder('CONDUTA_FECHAR_MES', L2, 2, 'aprovar', 'Fechar o mês do Conduta', 'Prévia e fechamento da competência (bônus coletivo).', 'H.gestaoDecisoes(eu)',
  [[/SGO_Conduta_Fechamento/, null, /Conduta_exigirGestor_/]]);
poder('CONDUTA_PAINEIS_GESTAO', L2, 2, 'ver', 'Painéis e relatórios da gestão do programa', 'Painel de ciência, relatório do programa, relatório semanal e de missões.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Conduta_(Ciencia|Relatorio|RelatoriosGerenciais)/, /^(Conduta_apiPainelCiencia|Conduta_apiGerarRelatorio|Conduta_apiGerarRelatorioSemanal|Conduta_apiGerarRelatorioMissoes)$/, /Conduta_exigirGestor_/]]);
poder('CONDUTA_CONFIGURAR', L2, 2, 'administrar', 'Configurar rotinas do programa', 'Rotina de ciência, checagem diária de prazos, relatório semanal automático, destinos de viagem, coleta de sugestões.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Conduta/, null, /Conduta_exigirGestor_/]]);

// ===== LOTE 3 — Financeiro
const L3 = 'Financeiro';
const FIN_NODE = 'eu.perfil === "ADMIN" || eu.perfil === "DIRETORIA" || eu.perfil === "FINANCEIRO"';
poder('FIN_VER_CONTAS', L3, 3, 'valores', 'Ver contas a pagar, a receber, caixa e extrato (Omie)', 'Tela /financeiro do servidor: consultas ao Omie e histórico de conciliações.', FIN_NODE,
  [], { travasExtras: [{ arquivo: 'base/src/servidor.ts', linha: 305, funcao: 'rotasFinanceiro (autorizado)', acao: 'consultar pagar/receber/contas/caixa/extrato/histórico', regraAtual: '["ADMIN","DIRETORIA","FINANCEIRO"].includes(perfil)' }, { arquivo: 'base/src/servicos/financeiro.ts', linha: 19, funcao: 'POST /financeiro/consulta', acao: 'recusa sem operador autorizado', regraAtual: 'autorizado(req, sessao)' }] });
poder('FIN_CONCILIAR_BANCO', L3, 3, 'operar', 'Conciliar o extrato bancário (OFX)', 'Confirma transação do OFX contra o Omie e grava a conciliação.', FIN_NODE,
  [], { travasExtras: [{ arquivo: 'base/src/servicos/financeiro.ts', linha: 24, funcao: 'POST /financeiro/consulta (tipo confirmar)', acao: 'confirmar transação do extrato', regraAtual: 'mesma conferência de servidor.ts:305' }] });
poder('FIN_CONFERIR_COMPRAS', L3, 3, 'aprovar', 'Conferir compras (Financeiro)', 'Conferência das compras recebidas e relatório da conciliação.', 'H.cmp(eu).financeiro === true',
  [[/SGO_Compras_(Financeiro|Relatorios)/, /^(CmpFin_conferir_|CmpFin_lista_|CmpRel_gerar_)$/, /Cmp_exigir_/, { nivel: /FINANCEIRO/ }], [/SGO_Compras_Relatorios/, /^CmpRel_gerar_$/, /inline/, { linha: [238] }]]);
poder('FIN_FATURAS_CONCILIAR', L3, 3, 'operar', 'Conciliar faturas de cartão', 'Importa extrato da fatura, concilia e fecha a fatura.', 'H.cmp(eu).financeiro === true || H.cmp(eu).gestao === true',
  [[/SGO_Compras_Faturas/, /^(CmpFat_tela_|CmpFat_importar_|CmpFat_acao_|CmpFat_fechar_|CmpFat_exigirFin_)$/, /CmpFat_exigirFin_|Cmp_exigir_/]]);
poder('FIN_A_PAGAR', L3, 3, 'valores', 'Ver e baixar o que há a pagar', 'Lista de compras a pagar e marcar como pago.', 'H.cmp(eu).financeiro === true || H.cmp(eu).gestao === true',
  [[/SGO_Compras_Faturas/, /^(CmpPag_lista_|CmpPag_marcarPago_)$/, /CmpFat_exigirFin_/]]);
poder('FIN_FATURA_REABRIR', L3, 3, 'administrar', 'Reabrir fatura fechada', 'Reabre fatura de cartão já fechada.', 'H.cmp(eu).diretoria === true || eu.perfil === "ADMIN"',
  [[/SGO_Compras_Faturas/, /^CmpFat_fechar_$/, /inline/]]);
poder('FIN_CARTOES_VER', L3, 3, 'valores', 'Ver os cartões da empresa', 'Lista de cartões (final, responsável, limites).', 'H.cmp(eu).financeiro === true || H.cmp(eu).comprador === true || H.cmp(eu).gestao === true || H.cmp(eu).gestor === true',
  [[/SGO_Compras_(Faturas|Painel)/, null, /CmpCart_podeVer_/]]);
poder('FIN_CARTOES_EDITAR', L3, 3, 'administrar', 'Cadastrar e alterar cartões', 'Cria e altera cartões da empresa.', 'H.cmp(eu).financeiro === true || H.cmp(eu).diretoria === true || eu.perfil === "ADMIN"',
  [[/SGO_Compras_Faturas/, null, /CmpCart_podeEditar_/]]);

// ===== LOTE 4 — Relatórios técnicos: aprovação e emissão
const L4 = 'Documentos técnicos';
poder('RELATORIO_TECNICO_APROVAR', L4, 4, 'aprovar', 'Aprovar relatório técnico de qualificação', 'Responsável técnico: confere, aprova, emite ou devolve relatório de Autoclave, Lavadora, Cadeia de frio e Estufa/Banho-maria.', "['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'].indexOf(eu.perfil) >= 0",
  [[/SGO_(AutoRel|LavRel|CadeiaFrioRel|EstufaBanhoRel)_/, null, /(Aprovador_|SGO_QE_ehAprovador_)/], [/SGO_QualifEmissao/, null, /SGO_QE_ehAprovador_/]]);
poder('RELATORIO_BAIXATEMP_APROVAR', L4, 4, 'aprovar', 'Aprovar ensaio de baixa temperatura', 'Revisa e aprova o ensaio de esterilizador a baixa temperatura (quem elaborou não aprova: proteção fixa).', "['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0",
  [[/SGO_BaixaTemp_Main/, null, /BaixaTemp_exigirAprovador_/], [/SGO_BaixaTemp_Main/, /^BaixaTemp_apiPing$/, /inline/]]);
poder('RELATORIO_MODELO_ESCOLHER', L4, 4, 'administrar', 'Escolher o modelo dos relatórios oficiais', 'Define o modelo do relatório oficial (Autoclave, Lavadora, Estufa, Cadeia de frio).', "eu.perfil === 'ADMIN'",
  [[/SGO_(AutoRel_ModeloOficialNovo|LavRel_ModeloOficialNovo|EstufaBanhoRel_Qualif|CadeiaFrioRel_Emissao)/, /DefinirModelo/, /inline/]], { travasExtras: [{ arquivo: 'base/legado/SGO_CadeiaFrioRel_Emissao.js', linha: 318, funcao: 'CadeiaFrioRel_apiDefinirModelo', acao: 'escolher o modelo dos documentos', regraAtual: "perfil === 'ADMIN'" }] });
poder('RELATORIO_INTERNO_SIMULADO', L4, 4, 'sigiloso', 'Usar o relatório interno (dados reconstituídos)', 'Gera dados simulados de ciclo para o relatório interno. Exige também a senha do simulador (proteção fixa).', "eu.perfil === 'ADMIN' || (eu.id === CFG.relatorioInterno.id && eu.login === CFG.relatorioInterno.login)",
  [[/SGO_(AutoRel|LavRel|CadeiaFrioRel|EstufaBanhoRel)_/, null, /ValidarSenhaSimuladorAdmin_|validarSenhaSimuladorAdmin_/]], { obs: 'O padrão espelha a TELA (ADMIN ou Bento, *_ConteudoModulo.js). O servidor hoje confere só a senha (divergência D-01).' });
poder('DOCTEC_GERAR', L4, 10, 'operar', 'Gerar documentos técnicos', 'Abre e gera Autoclave, Lavadora, Cadeia de frio, Estufa, PGT/POP, Planejamento CME, Cronograma, Registros operacionais, Relatório de calibração e Declaração de execução; consulta Calibração, NR-13 e Baixa temperatura.', 'H.interno(eu) && eu.perfil !== "RH"',
  [[/SGO_/, null, /SGO_bloquearRH_|RelCal_exigirEquipe_|DeclExecQIQO_exigirEquipe_/]], { travasExtras: [
    { arquivo: 'base/legado/SGO_CertCal_Main.js', linha: 1, funcao: 'CertCal_apiDispatch (linha minificada)', acao: 'abrir Certificado de calibração e Padrões de referência', regraAtual: 'SGO_bloquearRH_: recusa perfil RH' },
    { arquivo: 'base/legado/SGO_RelCal_Main.js', linha: 1, funcao: 'RelCal_apiDispatch / RelCal_exigirEquipe_ (linha minificada)', acao: 'abrir o Relatório de calibração', regraAtual: 'não CLIENTE e não RH' },
    { arquivo: 'base/legado/SGO_DeclaracaoExec_Main.js', linha: 1, funcao: 'DeclExec_apiDispatch (linha minificada)', acao: 'abrir a Declaração de execução', regraAtual: 'DeclExecQIQO_exigirEquipe_: não CLIENTE e não RH' },
    { arquivo: 'base/legado/SGO_DeclaracaoExec_Main.js', linha: 4, funcao: 'DeclExecQIQO_exigirEquipe_ (linha minificada)', acao: '(definição da regra)', regraAtual: 'sessão; perfil !== CLIENTE; SGO_bloquearRH_' } ] });
poder('DOCTEC_EMITIR_OFICIAL', L4, 10, 'operar', 'Emitir certificado, laudo e relatório oficial', 'Preenche e emite Certificado de calibração, Laudo NR-13, Baixa temperatura e relatórios oficiais de qualificação; completa cadastro de equipamento pelo ensaio.', 'H.equipeTecnica(eu)',
  [[/SGO_(AutoRel|LavRel|CadeiaFrioRel|EstufaBanhoRel)_ModeloOficial/, null, /SGO_QEQ_ehEquipe_/], [/SGO_QualifEquipamento/, null, /SGO_QEQ_ehEquipe_/], [/SGO_NR13_Main/, /^NR13_apiDispatch$/, /inline/], [/SGO_BaixaTemp_Main/, /^apiPreencherCadastro$/, /inline/], [/SGO_CertCal_Main/, null, /CertCal_exigirPerfilEmissor_/]],
  { obs: 'Calibração e NR-13 recusam COMERCIAL e FINANCEIRO; Baixa temperatura e modelos oficiais aceitam só ADMIN, DIRETORIA, GESTOR, TECNICO, METROLOGIA. Com os perfis de hoje o resultado é o mesmo.', travasExtras: [{ arquivo: 'base/legado/SGO_CertCal_Main.js', linha: 1, funcao: 'CertCal_exigirPerfilEmissor_ / CertCal_perfilSoConsulta_', acao: 'emitir certificado / padrões (CERTCAL_FN_SO_EMISSORES_)', regraAtual: "perfil !== 'COMERCIAL' && perfil !== 'FINANCEIRO'" }] });
poder('CALIBRACAO_GESTAO', L4, 10, 'ver', 'Relatórios de gestão da calibração', 'Relatório de renovação e de desempenho; ver o controle de padrões de todos os técnicos.', 'H.gestaoDecisoes(eu)',
  [[/SGO_CertCal_GestaoRelatorios|SGO_Padroes_Documentos/, null, /isAdminSession/]]);
poder('PADROES_ATUALIZAR_ACERVO', L4, 10, 'administrar', 'Atualizar o acervo de padrões pelos certificados', 'Atualiza os padrões de referência a partir dos certificados.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Padroes_Automacao/, null, /isAdminSession/]]);
poder('LAVCICLO_CONFIRMAR_REFERENCIA', L4, 10, 'aprovar', 'Confirmar referência do ciclo da lavadora', 'Confirma as referências do relatório do ciclo (.sgolav).', "eu.perfil === 'METROLOGIA' || ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0",
  [[/SGO_LavCiclo_Main/, /^(LavCic_eu_|LavCic_acaoReferencias_)$/, /inline/]]);
poder('ALERTAS_PADROES_CONFIGURAR', L4, 10, 'administrar', 'Configurar alertas de vencimento de padrões', 'Quem recebe e quando aparecem os lembretes de vencimento dos padrões.', "eu.perfil === 'ADMIN'",
  [[/SGO_AlertasPadroes/, null, /AlertasPadroes_exigirAdmin_|inline/]]);

// ===== LOTE 5 — Compras
const L5 = 'Compras';
poder('COMPRAS_PEDIR', L5, 5, 'operar', 'Pedir compra e informar compra feita', 'Abre pedido de compra, informa compra feita, acompanha os próprios pedidos (sem valores).', "H.cmp(eu).nivel !== 'NENHUM'",
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^INTERNO$/ }], [/SGO_Compras_Requisicoes/, /^CmpR_obter_$/, /CmpR_podeVer_/]], { escopo: 'PROPRIO (pedidos de que é solicitante ou vendedor)' });
poder('COMPRAS_VER_FILA', L5, 5, 'ver', 'Ver a fila e o painel de compras', 'Fila de todas as compras, painel e relatórios de compras.', 'H.cmp(eu).veFila === true',
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^FILA$/ }]]);
poder('COMPRAS_VER_VALORES', L5, 5, 'valores', 'Ver valores de compras e fornecedores', 'Valores, orçamentos e cadastro de fornecedores.', 'H.cmp(eu).veValores === true',
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^VALORES$/ }], [/SGO_Compras_Pedido/, /^CmpP_paraTela_$/, /inline/], [/SGO_Compras_Painel/, /^Cmp_regrasTela_$/, /Cmp_exigir_/, { linha: [178] }]]);
poder('COMPRAS_COMPRAR', L5, 5, 'operar', 'Cotar e comprar', 'Lança e escolhe orçamento, emite pedido ao fornecedor, registra recebimento, entrega e pagamento, cadastra fornecedor.', 'H.cmp(eu).comprador === true',
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^COMPRADOR$/ }], [/SGO_Compras_Pedido/, /^CmpP_entregar_$/, /inline/]]);
poder('COMPRAS_APROVAR_ATE_LIMITE', L5, 5, 'aprovar', 'Aprovar compra até o limite do comprador', 'Aprova compra da faixa do comprador (hoje até R$ 1.000,00). Quem pediu não aprova a própria compra (fixo).', 'CFG.compradores.concat(CFG.substitutos).indexOf(eu.id) >= 0 || H.gestoresCompras().indexOf(eu.id) >= 0 || H.diretoria(eu)',
  [[/SGO_Compras_Cotacoes/, null, /CmpC_podeAprovar_/]], { limite: 'faixa 1 de CMP_CONFIG.REGRAS.faixas (hoje R$ 1.000,00)', obs: 'Rota em CmpC_rota_ (SGO_Compras_Cotacoes.js:129-166).' });
poder('COMPRAS_APROVAR_DA_AREA', L5, 5, 'aprovar', 'Aprovar compra da própria área (faixa do gestor)', 'Aprova compra da faixa do gestor (hoje até R$ 10.000,00) pedida por alguém da área dele. Quem cotou não aprova (fixo).', "(eu.perfil === 'GESTOR' && !!eu.area) || Object.keys(CFG.gestoresPorArea).some(a => H.gpa(a).indexOf(eu.id) >= 0) || H.diretoria(eu)",
  [[/SGO_Compras_Cotacoes/, /^CmpC_rota_$/, /inline/]], { escopo: 'AREA (área de quem pediu); Diretoria = todas', limite: 'faixa 2 (hoje R$ 10.000,00)' });
poder('COMPRAS_APROVAR_SEM_LIMITE', L5, 5, 'aprovar', 'Aprovar compra acima de todas as faixas', 'Faixa da Diretoria (acima de R$ 10.000,00) e reserva de todas as faixas.', 'H.diretoria(eu)',
  [[/SGO_Compras_Config/, /^Cmp_diretoria_$/, /inline/]]);
poder('COMPRAS_GESTAO', L5, 5, 'administrar', 'Gestão de Compras', 'Relatório mensal e decisões da gestão de Compras (gestor da área de Compras, Diretoria, Administrador).', 'H.cmp(eu).gestao === true',
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^GESTAO$/ }]]);
poder('COMPRAS_REGRAS_EDITAR', L5, 5, 'administrar', 'Alterar as regras de compras', 'Compradores, substitutos, faixas de aprovação e cotações mínimas.', 'H.cmp(eu).regras === true',
  [[/SGO_Compras/, null, /Cmp_exigir_/, { nivel: /^REGRAS$/ }]]);
poder('COMPRAS_CIENCIA_GESTAO', L5, 5, 'aprovar', 'Dar ciência de compra fora do fluxo', 'Ciência da gestão em compra informada (sem pedido).', 'H.cmp(eu).gestor === true || H.cmp(eu).diretoria === true || eu.perfil === "ADMIN"',
  [[/SGO_Compras_Financeiro/, /^CmpFin_ciente_$/, /inline/]]);

// ===== LOTE 6 — Frota: localização e bloqueio
const L6 = 'Frota';
const FROTA_G = 'H.gestaoDecisoes(eu) || H.rotina(eu)';
poder('FROTA_LOCALIZAR', L6, 6, 'sigiloso', 'Ver localização, mapa e rotas dos veículos', 'Rastreamento: mapa, rotas, retiradas, combustível, copiloto, relatório de rastreamento.', FROTA_G,
  [[/SGO_Frota_(Rastreamento|RastreamentoGestao)/, /^(Frota_apiRastrConsultas|Frota_apiRastrMapa|Frota_apiRastrRota|Frota_apiRastrRetiradas|Frota_apiRastrCombustivel|Frota_apiRastrCapacidadeTanque|Frota_apiRastrPedirComprovante|Frota_apiRastrCancelarPedido|Frota_apiRastrGantt|Frota_apiRastrCopiloto|Frota_apiRastrCopilotoDecidir|Frota_apiRastrRelatorio)$/, /FrotaR_exigirGestao_/],
   [/SGO_Frota_Rastreador/, /^(Frota_apiListarRastreador|Frota_apiRastreadorAtualizarAgora)$/, /Rastreador_exigirGestao_/], [/SGO_Frota_Rastreamento/, /^(Frota_apiRastrEnviarComprovante|FrotaR_ponte_)$/, null]]);
poder('FROTA_RASTREADOR_CONFIGURAR', L6, 6, 'administrar', 'Configurar rastreador e alertas', 'Vincular rastreador, conferir comandos e alertas, configuração do rastreamento.', FROTA_G,
  [[/SGO_Frota_Rastreador/, /^(Frota_apiRastreadorVincular|Frota_apiRastreadorConferirComandos|Frota_apiRastreadorConferirAlerta)$/, /Rastreador_exigirGestao_/], [/SGO_Frota_Rastreamento/, /^Frota_apiRastrConfig$/, /FrotaR_exigirGestao_/]]);
poder('FROTA_BLOQUEAR_PARTIDA', L6, 6, 'aprovar', 'Bloqueio da partida', 'Modo do bloqueio, triagem, fora da base, área da base, integridade, encerrar emergência, bloquear pelo rastreador, decidir passagem.', FROTA_G,
  [[/SGO_Frota_Bloqueio/, /^(Frota_apiBloqueioDecidirForaBase|Frota_apiBloqueioModo|Frota_apiBloqueioTriagem|Frota_apiBloqueioEncerrarEmergencia|Frota_apiBloqueioAreaBase|Frota_apiBloqueioIntegridade|Frota_apiBloqueioPainel|Frota_apiBloqueioRelatorio|Frota_apiPassagemDecidir|Frota_apiBloqueioEncerrarEsquecida)$/, /FrotaBlq_exigirGestao_|Frota_ehGestao_/],
   [/SGO_Frota_Rastreador/, /^Frota_apiRastreadorBloquear$/, /Rastreador_exigirGestao_/]]);
poder('FROTA_LIBERAR_PARTIDA', L6, 6, 'operar', 'Liberar a partida agora', '"Liberar agora" um veículo bloqueado.', "(" + FROTA_G + ") && ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].indexOf(eu.perfil) >= 0",
  [[/SGO_Frota_Bloqueio/, /^Frota_apiBloqueioLiberarAgora$/, null], [/SGO_Frota_Bloqueio/, /^Frota_apiBloqueioPainel$/, /inline/]], { obs: 'O Financeiro passa pela trava geral do bloqueio, mas é recusado aqui (SGO_Frota_Bloqueio.js:1260).' });
poder('FROTA_BLOQUEIO_ROUBO', L6, 6, 'administrar', 'Bloqueio de roubo', 'Bloqueio do veículo em caso de roubo.', "(" + FROTA_G + ") && eu.perfil === 'DIRETORIA'",
  [[/SGO_Frota_Bloqueio/, /^Frota_apiBloqueioRoubo$/, null]], { obs: 'Hoje só o perfil DIRETORIA: o Administrador (dono) NÃO tem (SGO_Frota_Bloqueio.js:1288). Com a proteção fixa "dono sempre tudo" ele passaria a ter.' });
poder('FROTA_ODOMETRO_CORRIGIR', L6, 6, 'operar', 'Corrigir o hodômetro do bloqueio', 'Ajusta a leitura do hodômetro no módulo de bloqueio.', "(" + FROTA_G + ") && ['ADMIN', 'GESTOR'].indexOf(eu.perfil) >= 0",
  [[/SGO_Frota_Bloqueio/, /^Frota_apiBloqueioHodometro$/, null]], { obs: 'FBLQ_ODO_PERFIS = ADMIN e GESTOR: a Diretoria não tem (SGO_Frota_Bloqueio.js:1323).' });

// ===== LOTE 7 — Comercial
const L7 = 'Comercial';
poder('COM_USAR', L7, 7, 'operar', 'Trabalhar no Comercial', 'Oportunidades, propostas, assinatura, envio, passagem aos setores, especialista, orçamentista, gestora, banco de preços (consulta).', 'H.com(eu).gestao || H.com(eu).vendedor',
  [[/SGO_Comercial/, null, /Com_exigir_/, { nivel: /^VENDEDOR$/ }], [/SGO_Comercial_Config/, /^Com_exigir_$/, /inline/]], { escopo: 'PROPRIO para vendedor (oportunidades e propostas de que é responsável); TODOS com COM_TODAS_AS_VENDAS' });
poder('COM_TODAS_AS_VENDAS', L7, 7, 'ver', 'Ver e mexer nas vendas de todos', 'Oportunidades e propostas de todos os vendedores, indicadores por vendedor, trocar responsável.', 'H.com(eu).gestao',
  [[/SGO_Comercial/, null, /ComOpo_podeVer_|ComP_podeVer_/], [/SGO_Comercial_(Painel|Especialista|Propostas|Oportunidades)/, /^(Com_painel_|ComEsp_fatos_|ComEsp_visao_|ComP_podeVer_|ComP_salvar_|ComP_voltarRascunho_|ComP_registrarAssinaturaCliente_|ComP_marcarInvestimento_|ComOpo_salvar_)$/, /inline/]]);
poder('COM_GESTAO_COMERCIAL', L7, 7, 'aprovar', 'Gestão comercial', 'Reabrir oportunidade, criar atividade na oportunidade, relatório mensal, perguntar à gestora, metodologia, decidir preço de item, itens oficiais.', 'H.com(eu).gestao',
  [[/SGO_Comercial/, /^(ComOpo_reabrir_|ComOpo_criarAtividadeGestao_|relatorioMes|ComG_perguntar_|Com_metodologiaTela_|ComP_decidirPreco_|ComP_historicoProduto_|ComCat_tela_|ComCat_salvar_|ComCat_sobra_|ComP_excluirDuplicado_|ComP_arquivarProduto_|ComP_salvarProduto_|normT|ComBP_registrar_|ComF_previaImportacao_|ComF_importar_)$/, /Com_exigir_|inline/, { nivel: /^(GESTAO|)$/ }]]);
poder('COM_DECIDIR_DESCONTO', L7, 7, 'aprovar', 'Decidir desconto acima da alçada', 'Aprova ou recusa desconto que passou do limite do vendedor (não decide o próprio: fixo).', 'H.com(eu).gestao',
  [[/SGO_Comercial_Propostas/, /^ComP_decidirDesconto_$/, /Com_exigir_/], [/SGO_Comercial_Propostas/, /^ComP_decidirDesconto_$/, /inline/, { linha: [949] }]]);
poder('COM_DESCONTO_DIRETORIA', L7, 7, 'aprovar', 'Aprovar desconto da faixa da Diretoria', 'Desconto ou margem que a política manda para a Diretoria.', 'H.com(eu).diretoria || eu.perfil === "ADMIN"',
  [[/SGO_Comercial_Propostas/, /^(ComP_detalhe_|ComP_concluir_|ComP_decidirDesconto_)$/, /inline/]]);
poder('COM_PEDIDOS_APROVADOS', L7, 7, 'ver', 'Ver os pedidos aprovados', 'Pedidos aprovados com valor, condição de pagamento e dados de faturamento.', 'H.com(eu).gestao || H.com(eu).vendedor || H.com(eu).financeiro',
  [[/SGO_Comercial/, null, /Com_exigir_/, { nivel: /^FINANCEIRO$/ }], [/SGO_Comercial_Propostas/, /^ComP_paraTela_$/, /inline/, { linha: [547] }]], { escopo: 'Financeiro: só propostas APROVADAS; vendedor: as próprias' });
poder('COM_VER_VALORES', L7, 7, 'valores', 'Ver valores de venda', 'Valor estimado, ponderado e preço nas oportunidades, propostas, quadro e Gantt.', 'H.com(eu).veValores',
  [[/SGO_Comercial/, null, /inline/, { trecho: /veValores/ }]]);
poder('COM_VER_CUSTO', L7, 7, 'valores', 'Ver custo e margem', 'Custo dos itens, margem, preço mínimo e política de precificação.', 'H.com(eu).veCusto',
  [[/SGO_Comercial/, null, /inline/, { trecho: /veCusto/ }]]);
poder('COM_CATALOGO_EDITAR', L7, 7, 'operar', 'Manter o catálogo (preço e custo)', 'Cadastra e altera produto ou serviço com custo, ficha de custo, reativa item arquivado.', 'H.com(eu).catalogo',
  [[/SGO_Comercial_Ficha/, /^(ComF_salvarFicha_|ComF_aplicarSugerido_|ComF_exigirGestao_)$/, /ComF_exigirGestao_|Com_exigir_/], [/SGO_Comercial_Propostas/, /^(ComP_catalogo_|ComP_arquivarProduto_)$/, /Com_exigir_|inline/], [/SGO_Comercial_Precificacao/, /^ComPr_historicoReajustes_$/, /Com_exigir_/]]);
poder('COM_CATALOGO_EDITAR_VENDA', L7, 7, 'operar', 'Cadastrar item e preço de venda (vendedor)', 'Vendedor cadastra item novo e altera preço de venda dentro da alçada; não vê custo.', 'H.com(eu).catalogoVenda',
  [[/SGO_Comercial_Propostas/, /^(ComP_salvarProduto_|ComP_historicoProduto_|ComP_excluirDuplicado_|ComP_arquivarProduto_)$/, /Com_exigir_/], [/SGO_Comercial_Painel/, /^Com_inicio_$/, /inline/, { trecho: /catalogoVenda/ }]]);
poder('COM_POLITICA_PRECOS', L7, 7, 'administrar', 'Política de preços e termos', 'Reajuste do catálogo, catálogo oficial, decisão do dono na política, termos e condições, política de precificação.', 'H.com(eu).diretoria || eu.perfil === "ADMIN"',
  [[/SGO_Comercial/, null, /ComPr_exigirReajuste_|ComPr_podeReajustar_|ComDec_exigir_|ComCat_exigirImplantar_|ComCat_podeMudarPreco_/], [/SGO_Comercial_Painel/, /^(Com_inicio_|normT)$/, /inline/]]);
poder('COM_BANCO_PRECOS_GERIR', L7, 7, 'administrar', 'Gerir o banco de preços', 'Carga, tirar preço das contas, fora da curva, indicadores do banco de preços.', 'H.com(eu).gestao',
  [[/SGO_Comercial_BancoPrecos/, null, /ComBP_exigirGestao_/]]);
poder('COM_CONTATOS_CLIENTES', L7, 7, 'sigiloso', 'Ver e editar contatos dos clientes', 'Nome, telefone e e-mail dos contatos (dados pessoais).', "H.com(eu).gestao || H.com(eu).vendedor || ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0",
  [[/SGO_Comercial_Contatos/, null, /ComCt_exigir_|ComCt_podeVer_|inline/]]);
poder('COM_EXCLUIR', L7, 7, 'excluir', 'Excluir oportunidade ou proposta', 'Exclui oportunidade ou proposta que não foi ao cliente.', 'H.com(eu).gestao || H.com(eu).vendedor',
  [[/SGO_Comercial/, /^(ComOpo_excluir_|ComP_excluir_|ComOpo_detalhe_|ComP_detalhe_|ComOpo_podeExcluir_|ComP_podeExcluir_)$/, /Com_exigir_|ComOpo_podeExcluir_|ComP_podeExcluir_|inline/]], { escopo: 'PROPRIO para vendedor; TODOS para a gestão comercial' });
poder('RONDA_SUGESTAO_DECIDIR', L7, 8, 'aprovar', 'Decidir sugestão da ronda ao Comercial', 'Aceita (vira oportunidade) ou descarta a sugestão da ronda de engenharia clínica.', 'H.ast(eu).comercial || H.ast(eu).diretoria || H.ast(eu).admin',
  [[/SGO_Assistencia_(Ronda|Painel)/, null, /AstRd_podeSugestao_|AstRd_decidirSugestao_/], [/SGO_Assistencia_Ronda/, /^AstRd_tela_$/, /inline/, { linha: [994] }]]);

// ===== LOTE 8 — Assistência técnica e Representação
const L8 = 'Assistência técnica';
poder('AST_USAR', L8, 8, 'operar', 'Usar a Assistência técnica', 'Abrir e acompanhar chamados, agenda, rondas, indicadores, histórico, recebimento, solicitações, reclamações, app de campo.', 'H.ast(eu).interno === true',
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^INTERNO$/ }], [/SGO_Assistencia_App/, /^(Ast_appCadastrar|Ast_appAbrirOS)$/, /inline/], [/SGO_Assistencia_Chamados/, /^AstC_detalhe_$/, /inline/]]);
poder('AST_VER_TODOS_CHAMADOS', L8, 8, 'ver', 'Ver todos os chamados', 'Todos os chamados e O.S. (o técnico vê só os seus e a fila livre).', 'H.ast(eu).interno === true && (H.ast(eu).gestao || !H.ast(eu).tecnico)',
  [[/SGO_(Assistencia|Representacao)/, null, /AstC_podeVer_/], [/SGO_Assistencia_Chamados/, /^AstC_podeVer_$/, /inline/], [/SGO_Assistencia_Agenda/, /^AstA_agenda_$/, /inline/]], { escopo: 'TODOS; técnico: os próprios' });
poder('AST_TRIAGEM', L8, 8, 'operar', 'Fazer a triagem dos chamados novos', 'Recebe chamado novo e faz a triagem antes da fila livre.', 'H.ast(eu).gestao || H.ast(eu).triagem',
  [[/SGO_Assistencia_Chamados/, null, /AstC_podeTriar_|AstC_podeAssumir_/], [/SGO_Assistencia_Chamados/, /^AstC_triagem_$/, /Ast_exigir_/], [/SGO_Assistencia_Chamados/, /^AstC_podeTriar_$/, /inline/]], { lista: 'ATEC_CONFIG.REGRAS.triagem.responsaveis', obs: 'A lista vira exceções SIM; a gestão técnica tem por padrão.' });
poder('AST_GESTAO', L8, 8, 'aprovar', 'Gestão da Assistência técnica', 'Agendar, ordenar o dia, reservar veículo, cancelar e encerrar chamado, rondas, contratos de ronda, corrigir relatório, aguardar peça, transição do Auvo, relatório mensal.', 'H.ast(eu).gestao === true',
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^GESTAO$/ }], [/SGO_Assistencia_(Chamados|OS|Ronda)/, /^(AstC_logisticaRealizada_|AstO_dispensarAssColab_|AstRd_tela_)$/, /inline/]]);
poder('AST_EXECUTAR_OS_DE_OUTROS', L8, 8, 'operar', 'Registrar atendimento em O.S. de outro técnico', 'Registrar atendimento, foto, encerrar e enviar relatório em O.S. que não é sua (a própria é sempre permitida).', 'H.ast(eu).gestao === true',
  [[/SGO_Assistencia_(OS|App|Relatorio|Ronda)/, null, /AstO_exigirCampo_/], [/SGO_Assistencia_(OS|App|Ronda)/, /^(AstO_exigirCampo_|AstO_obter_|AstO_aplicarEvento_|AstApp_enviarCliente_|AstRd_aplicarEvento_)$/, /inline/]], { escopo: 'PROPRIO sempre (técnico responsável, fora das caixas); a caixa dá TODOS' });
poder('AST_TRANSFERIR_OS', L8, 8, 'aprovar', 'Transferir O.S. para outro técnico', 'Distribui e transfere O.S. entre técnicos.', 'H.ast(eu).interno === true && (H.ast(eu).gestao || CFG.idsTransferirOS.indexOf(eu.id) >= 0)',
  [[/SGO_Assistencia_(OS|Painel)/, null, /AstO_podeTransferir_/], [/SGO_Assistencia_OS/, /^AstO_podeTransferir_$/, /inline/]], { obs: 'Exceção por ID no código (Bruna e Matheus) vira exceção SIM na tela Acessos.' });
poder('AST_GERIR_FILA_SETOR', L8, 8, 'aprovar', 'Gerir a fila do setor', 'Escolhe o executor e gere a fila de O.S. de um setor (Técnica, Metrologia, Comercial, Logística, Administrativo).', "H.ast(eu).interno === true && (H.ast(eu).admin || H.ast(eu).diretoria || CFG.idsTransferirOS.indexOf(eu.id) >= 0 || (eu.perfil === 'GESTOR' && ['TECNICA', 'METROLOGIA', 'COMERCIAL', 'LOGISTICA', 'ADMINISTRATIVO'].indexOf(eu.area) >= 0) || Object.keys(CFG.gestoresPorArea).some(a => H.gpa(a).indexOf(eu.id) >= 0))",
  [[/SGO_Assistencia/, null, /AstO_podeGerirFila_/], [/SGO_Assistencia_OS/, /^AstO_podeGerirFila_$/, /inline/]], { escopo: 'SETOR: o da própria área; Administrador e Diretoria = todos; Bruna e Matheus = Técnica' });
poder('AST_REGRAS', L8, 8, 'administrar', 'Alterar as regras da Assistência', 'Prazos, contratos, tipos de serviço, checklists, ligar/desligar, trazer questionários do Auvo.', 'H.ast(eu).regras === true',
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^REGRAS$/ }]]);
poder('AST_VER_VALORES', L8, 8, 'valores', 'Ver e preencher valores de orçamento', 'Preencher, emitir, revisar e registrar resposta do orçamento da O.S.', 'H.ast(eu).valores === true',
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^VALORES$/ }]]);
poder('AST_EXCLUIR', L8, 8, 'excluir', 'Excluir e restaurar chamado', 'Excluir chamado de teste ou simulação, ver excluídos e restaurar.', 'H.ast(eu).excluir === true',
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^EXCLUIR$/ }]]);
poder('AST_DESLIGAR_AUVO', L8, 8, 'administrar', 'Marcar o Auvo como desligado', 'Marca o desligamento do Auvo depois dos seis critérios.', "eu.perfil === 'ADMIN'",
  [[/SGO_Assistencia/, null, /Ast_exigir_/, { nivel: /^ADMIN$/ }], [/SGO_Assistencia_Painel/, /^AstP_transicao_$/, /inline/]]);
poder('AST_ACEITAR_FALTAS_ACERVO', L8, 8, 'aprovar', 'Aceitar faltas do acervo do Auvo', 'Confirma o critério "faltas aceitas" na transição do Auvo.', 'H.ast(eu).diretoria === true',
  [[/SGO_Assistencia_Painel/, /^AstP_confirmar_$/, /inline/]]);
const L8b = 'Representação';
poder('REP_USAR', L8b, 8, 'operar', 'Abrir o módulo Representação (equipe)', 'Ver pedidos das representadas, conversar, documentos.', 'H.ast(eu).interno === true',
  [[/SGO_Representacao/, null, /Ast_exigir_/, { nivel: /^INTERNO$/ }]]);
poder('REP_ADMINISTRAR', L8b, 8, 'administrar', 'Administrar representadas', 'Cadastro da representada, catálogo, modelos e registro de ações das representadas.', "['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(eu.perfil) >= 0 || H.diretoria(eu) || CFG.repResponsaveis.indexOf(eu.id) >= 0",
  [[/SGO_Representacao/, null, /RepI_exigirAdm_|RepI_podeAdministrar_/]]);
poder('REP_ABRIR_EM_NOME', L8b, 8, 'operar', 'Abrir pedido em nome da representada', 'Abre pedido e liga chamado à representada.', 'H.interno(eu) && CFG.repEmNome.indexOf(eu.id) >= 0',
  [[/SGO_(Representacao|Assistencia_Painel)/, null, /Rep_exigirEmNome_|Rep_podeAbrirEmNome_/]], { lista: 'Rep_emNomeCfg_ (não extraída)' });
poder('REP_CONFIGURAR', L8b, 8, 'administrar', 'Configurar quem abre em nome e desligar chamado', 'Lista "quem pode abrir pedido em nome da representada" e desligar chamado da representada.', "eu.perfil === 'ADMIN'",
  [[/SGO_Representacao\.js/, /^(RepI_chamado_|RepI_desligarChamado_|RepI_emNomeConfig_|RepI_emNomeSalvar_)$/, /inline/]]);
poder('REP_RECEBER_ALERTAS', L8b, 8, 'operar', 'Receber aviso de pedido novo da representada', 'Aviso de pedido novo e dispensar o aviso.', 'H.ast(eu).gestao || CFG.repResponsaveis.indexOf(eu.id) >= 0 || H.ast(eu).triagem',
  [[/SGO_Representacao_Alertas/, null, /RepAl_podeReceber_|inline/]]);
poder('REP_LIBERAR_FOTO', L8b, 8, 'aprovar', 'Liberar foto à representada', 'Libera a foto do atendimento para a representada.', 'H.ast(eu).gestao || CFG.repResponsaveis.indexOf(eu.id) >= 0',
  [[/SGO_Representacao_Documentos/, /^RepD_liberarFoto_$/, /inline/]]);

// ===== LOTE 9 — Rotina da gestão: Frota (uso e gestão), Caixa de decisões, Atividades, Avisos, Ponto, comunicação
poder('FROTA_USAR', L6, 9, 'operar', 'Usar a Frota', 'Retirar, devolver, reservar, abastecer e registrar o próprio uso dos veículos.', 'H.interno(eu)',
  [[/SGO_Frota/, null, /Frota_exigirEquipe_/]]);
poder('FROTA_OPERAR_PELOS_OUTROS', L6, 9, 'operar', 'Operar a Frota por outra pessoa', 'Iniciar e finalizar viagem por outro condutor, ajustar e conferir km, justificar abastecimento, enviar comprovante.', FROTA_G,
  [[/SGO_Frota_(Main|Abastecimento|Gastos)/, /^(Frota_apiContextoOperacional|Frota_resolverCondutorRetirada_|Frota_apiInicioFrota|Frota_apiIniciarViagem|Frota_apiFinalizarViagem|Frota_apiAjustarKm|Frota_apiConferirKm|Frota_apiAbastJustificar|Frota_apiGastoContexto|FrotaGas_resolverRetirada_|Frota_condutoresParaPerfil_)$/, /Frota_ehGestao_|isAdminSession/]]);
poder('FROTA_VEICULOS_CADASTRAR', L6, 9, 'operar', 'Cadastrar veículos e documentos', 'Criar, alterar, inativar veículo, documentos do veículo, bases, identificação, checklist, auditoria e eventos.', FROTA_G,
  [[/SGO_Frota_(Main|Identificacao|Checklist)/, /^(Frota_apiCriarVeiculo|Frota_apiAtualizarVeiculo|Frota_apiInativarVeiculo|Frota_apiReativarVeiculo|Frota_apiUploadDocumento|Frota_apiExcluirDocumento|Frota_apiListarIdentificacao|Frota_apiListarSugestoesApelido|Frota_apiSalvarBasesFrota|Frota_apiChecklistPendencias|Frota_apiChecklistResolver|Frota_apiListarAuditoria|Frota_apiVerificarNovosEventos|Frota_apiListarKmAConferir)$/, /Frota_exigirGestor_|Frota_ehGestao_/]]);
poder('FROTA_CONDUTORES_E_MULTAS', L6, 9, 'sigiloso', 'Condutores, CNH e multas', 'Cadastro de condutor, foto da CNH, multas e indicação de condutor.', FROTA_G,
  [[/SGO_Frota_Main/, /^(Frota_apiListarUsuariosParaVinculo|Frota_apiUploadCnh|Frota_apiCriarCondutor|Frota_apiAtualizarCondutor|Frota_apiInativarCondutor|Frota_apiReativarCondutor|Frota_apiRegistrarMulta|Frota_apiRecruzarMulta|Frota_apiIndicarCondutorMulta|Frota_apiAtualizarStatusMulta|Frota_apiExcluirMulta)$/, /Frota_exigirGestor_/]]);
poder('FROTA_ABASTECIMENTO_CONFERIR', L6, 9, 'aprovar', 'Conferir abastecimentos', 'Painel de abastecimento, liberar, decidir justificativa, conferir, configurar e corrigir.', FROTA_G,
  [[/SGO_Frota_Abastecimento/, null, /FrotaAb_exigirGestao_|Frota_exigirGestor_/], [/SGO_Frota_Main/, /^(Frota_apiRegistrarAbastecimento|Frota_apiExcluirAbastecimento)$/, /Frota_exigirGestor_/]]);
poder('FROTA_GASTOS_VER', L6, 9, 'valores', 'Ver gastos e relatórios da Frota', 'Gastos, extrato de pedágio, despesas, relatório geral e mensal.', FROTA_G,
  [[/SGO_Frota_(Gastos|Consultas|RelatorioMensal|Relatorio)/, /^(Frota_apiGastosListar|Frota_apiGastosConferir|Frota_apiExtratoTagImportar|Frota_apiConsultarDespesas|Frota_apiRelatorioMensal|Frota_apiGerarRelatorio|FrotaGas_exigirGestao_)$/, /FrotaGas_exigirGestao_|Frota_exigirGestor_/]]);
poder('FROTA_MANUTENCAO_GERIR', L6, 9, 'operar', 'Manutenção da Frota', 'Plano de manutenção, paradas agendadas, registrar manutenção, despesa e parada.', FROTA_G,
  [[/SGO_Frota_(PlanoManutencao|Paradas)/, null, /FrotaPlano_exigirGestao_|FrotaPar_exigirGestao_|Frota_exigirGestor_/], [/SGO_Frota_Main/, /^(Frota_apiRegistrarManutencao|Frota_apiRegistrarDespesa|Frota_apiRegistrarParada)$/, /Frota_exigirGestor_/]]);
poder('FROTA_GESTAO_MELHORIA', L6, 9, 'aprovar', 'Gestão e melhoria da Frota', 'Casos, análise, planos de ação e indicadores da Frota.', FROTA_G,
  [[/SGO_Frota_Gestao/, null, /FrotaG_exigirGestao_|Frota_ehGestao_/]]);
poder('FROTA_RESERVAS_GERIR', L6, 9, 'aprovar', 'Gerir reservas dos outros', 'Cancelar, trocar veículo e decidir reservas de outras pessoas.', "['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0 || H.rotina(eu)",
  [[/SGO_Frota_Reservas/, null, /FrotaRes_ehGestaoRotina_|FrotaRes_ehGestaoPerfil_|FrotaRes_ehDono_/]], { escopo: 'PROPRIO sempre (dono da reserva, fora das caixas)' });
poder('FROTA_VALORES_SUSPEITOS', L6, 9, 'administrar', 'Levantamento de valores suspeitos da Frota', 'Lista de lançamentos com valor suspeito.', "eu.perfil === 'ADMIN'",
  [[/SGO_Frota_Consultas/, /^Frota_apiLevantamentoValoresSuspeitos$/, /inline/]]);
const L9g = 'Caixa de decisões e desempenho';
poder('GESTAO_CAIXA_DECISOES', L9g, 9, 'aprovar', 'Usar a Caixa de decisões', 'Abre a caixa, registra providência nos itens de que é responsável, regras (consulta).', "['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0 || H.rotina(eu)",
  [[/SGO_Gestao_Decisoes/, null, /Ges_sessaoGestao_|Ges_ehRotinaPerfil_/]], { escopo: 'itens de que é responsável' });
poder('GESTAO_CAIXA_VER_TODAS', L9g, 9, 'ver', 'Ver as decisões de todas as áreas', 'Na Caixa de decisões, vê os itens de todas as áreas (sem esta caixa, só os seus).', "['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(eu.perfil) >= 0",
  [[/SGO_Gestao_(Decisoes|Avaliacao)/, /^(Ges_montarCaixa_|Gestao_apiRelatorio)$/, /Ges_ehGestaoPerfil_/]], { obs: 'Gestao_apiRelatorio (relatório de atividades da equipe) usa a mesma regra Ges_ehGestaoPerfil_.' });
poder('GESTAO_VER_SIGILO', L9g, 9, 'sigiloso', 'Ver itens sigilosos (Conduta) na gestão', 'Itens do Programa de conduta com nome na Caixa e relatórios da empresa com nomes.', 'H.sigiloQualidade(eu)',
  [[/SGO_Gestao_(Decisoes|RelatoriosEmpresa)/, null, /Ges_veSigilo_|RelEmp_veNomes_|RelEmp_pode_/]]);
poder('GESTAO_AVALIACAO_GESTORES', L9g, 9, 'sigiloso', 'Avaliação dos gestores (Diretoria)', 'Desempenho de todos os gestores, relatório semanal da gestão, relatórios gerados, itens só da Diretoria.', 'H.diretoria(eu)',
  [[/SGO_Gestao_(Decisoes|Avaliacao)/, /^(Ges_avaliacaoParaSessao_|Gestao_apiRelatorio|Gestao_apiRelatoriosGerados|Ges_montarCaixa_|conta)$/, /Ges_ehDiretoriaSessao_/]]);
poder('GESTAO_AVALIACAO_REGRAS', L9g, 9, 'administrar', 'Regras da avaliação dos gestores', 'Pesos e faixas da nota dos gestores.', 'H.diretoria(eu)',
  [[/SGO_Gestao_Avaliacao/, /^Gestao_apiConfigAvaliacao$/, /Ges_ehDiretoriaSessao_/]]);
poder('GESTAO_CONFIGURAR', L9g, 9, 'administrar', 'Regras e responsáveis da Caixa de decisões', 'Responsáveis por área (dá poderes na Assistência, Comercial, Compras e Ponto), escada de avisos, destinatários dos relatórios da empresa.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || H.dono(eu)",
  [[/SGO_Gestao_(Decisoes|RelatoriosEmpresa)/, null, /Ges_podeConfigurar_/]]);
poder('GESTAO_RELATORIOS_EMPRESA', L9g, 9, 'ver', 'Relatórios da empresa', 'Abre os relatórios da empresa e o histórico de envios.', "H.diretoria(eu) || eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_Gestao_RelatoriosEmpresa/, null, /RelEmp_sessao_|Ges_ehDiretoriaSessao_/]]);
poder('GESTAO_RESUMO_DIARIO', L9g, 9, 'ver', 'Resumo diário da gestão (início)', 'Resumo do dia (Sedna) e resumo do Auvo no painel inicial.', 'H.gestaoDecisoes(eu) || H.rotina(eu)',
  [[/SGO_Sedna/, null, /isAdminPerfilAuth_|SGO_ehGestaoRotina_/]]);
const L9a = 'Atividades e avisos';
poder('ATIVIDADES_GERIR_EQUIPE', L9a, 9, 'aprovar', 'Gerir atividades da equipe', 'Lançar atividade para outra pessoa, trocar responsável, editar e mudar situação da atividade dos outros, decidir pedido de nova data.', 'H.gestaoDecisoes(eu) || H.rotina(eu)',
  [[/SGO_Atividades\.js/, null, /Atividades_exigirGestor_|Atividades_gestaoSobre_|Atividades_podeVer_|Atividades_podeAlterar_|Atividades_podeEditar_|Atividades_podeDecidirPedido_|isAdminPerfilAuth_|SGO_ehGestaoRotina_/], [/SGO_Atividades\.js/, null, /inline/, { trecho: /eu\.gestor/ }]], { escopo: 'PROPRIO sempre (atividade própria/envolvido, fora das caixas)' });
poder('ATIVIDADES_VER_RESTRITAS', L9a, 9, 'sigiloso', 'Ver atividades restritas de outros', 'Atividades restritas (ex.: do Conduta) de outras pessoas.', 'H.gestaoDecisoes(eu) || eu.perfil === "RH"',
  [[/SGO_Atividades\.js/, /^Atividades_veRestritasPerfil_$/, null]]);
poder('ATIVIDADES_AVISOS_HORARIOS', L9a, 9, 'administrar', 'Avisos e horários (expediente)', 'Expediente, feriados e envio de resumos pelo WhatsApp.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_Atividades_Avisos/, /^Atividades_apiConfigAvisos$/, /inline/]]);
poder('AVISOS_PUBLICAR', L9a, 9, 'operar', 'Publicar avisos com ciência', 'Publicar, reenviar, arquivar aviso e ver quem leu.', 'H.gestaoDecisoes(eu) || eu.perfil === "RH" || H.rotina(eu)',
  [[/SGO_Avisos\.js/, null, /Avisos_exigirGestor_|isAdminPerfilAuth_|SGO_ehPerfilRH_|SGO_ehGestaoRotina_|inline/]]);
poder('AVISOS_MATRIZ', L9a, 9, 'administrar', 'Matriz de avisos', 'Define quem recebe o quê por sistema, e-mail e WhatsApp.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || H.dono(eu)",
  [[/SGO_Avisos_Matriz/, /^(Mtz_sessao_|SGO_AvisosMatriz_api)$/, /Chaves_ehDonoUsuario_|inline/]]);
poder('AVISOS_ABRIR_DE_OUTROS', L9a, 9, 'ver', 'Abrir aviso da gestão de outra pessoa', 'Abre pelo link um aviso destinado a outra pessoa.', "eu.perfil !== 'CLIENTE' && (H.diretoria(eu) || H.gestaoDecisoes(eu))",
  [[/SGO_Avisos_Gestao/, /^AvG_ehGestao_$/, /inline/]], { obs: 'AvG_ehGestao_ (SGO_Avisos_Gestao.js:200-205): também RH e Financeiro quando responsáveis de área na Caixa (gestoresPorArea, não extraído).' });
const L9p = 'Assistente do ponto';
poder('PONTO_CONFIGURAR', L9p, 9, 'administrar', 'Configurar o Assistente do ponto', 'Ligar, desligar, jornada geral, feriados, avisos e jornada da pessoa, folgas e dispensas, prévia.', 'H.pto(eu).configurar',
  [[/SGO_Ponto_Api/, null, /Ponto_exigir_/, { caso: /^(salvarLembretes|salvarPessoa|salvarDispensa|removerDispensa|config|salvarConfig|salvarFeriados|previa)$/ }]]);
poder('PONTO_VER_TODOS', L9p, 9, 'sigiloso', 'Ver o ponto de todos', 'Painel do dia e do mês de todas as pessoas, quem participa, resumo do mês.', 'H.pto(eu).verTodos',
  [[/SGO_Ponto_Api/, null, /Ponto_exigir_/, { caso: /^(pessoas|resumoA4)$/ }], [/SGO_Ponto_Config/, /^Ponto_idsVisiveis_$/, /inline/, { linha: [408] }]]);
poder('PONTO_TRATAR_AJUSTES', L9p, 9, 'aprovar', 'Tratar pedidos de ajuste do ponto', 'Decide pedido de ajuste e vê justificativa e evidência dos outros.', 'H.pto(eu).tratar',
  [[/SGO_Ponto_Api/, null, /Ponto_exigir_|inline/, { caso: /^(tratar|pedidos)$/ }]]);
poder('PONTO_VER_EQUIPE_AREA', L9p, 9, 'sigiloso', 'Acompanhar o ponto da própria área', 'Painel do dia e do mês das pessoas da área que gere.', 'H.pto(eu).verTodos || H.pto(eu).gestor',
  [[/SGO_Ponto_Api/, null, /Ponto_exigir_/, { caso: /^(dia|mes)$/ }], [/SGO_Ponto_Config/, /^Ponto_idsVisiveis_$/, /inline/, { linha: [410] }]], { escopo: 'AREA' });
const L9c = 'Comunicação';
poder('CHAT_GESTAO', L9c, 9, 'operar', 'Gestão no bate-papo', 'Lê "Recebidas pelo WhatsApp", publica comunicados e edita qualquer grupo.', 'H.gestaoDecisoes(eu)',
  [[/^Comunicacao\.js$/, /^(comEhMembro_|editarGrupo|publicarComunicado)$/, /inline/], [/SGO_ComunicacaoAdaptador/, null, /isAdminPerfilAuth_|inline/]]);
poder('CHAT_ADMINISTRAR', L9c, 9, 'administrar', 'Administrar o bate-papo', 'Vincular pessoas, sincronizar, status, configuração e trilha do WhatsApp do bate-papo.', "eu.perfil === 'ADMIN'",
  [[/^Comunicacao\.js$/, /^(comApi|pessoas)$/, /inline/]]);
poder('CHAT_IMAGENS_CONFIGURAR', L9c, 9, 'administrar', 'Ligar o envio de imagens no bate-papo', 'Liga e desliga o envio de imagens para todos.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_ComunicacaoImagens/, null, /comImgPodeConfigurar_/]]);
poder('EMAIL_CAIXAS_COMPARTILHADAS', L9c, 9, 'administrar', 'Caixas de e-mail compartilhadas', 'Cadastra caixas compartilhadas, define quem acessa, assinatura e trilha.', "eu.perfil === 'ADMIN'",
  [[/SGO_Email/, null, /Email_exigirAdmin_|inline/]], { travasExtras: [{ arquivo: 'base/src/servicos/emailPessoal.ts', linha: 1176, funcao: 'caixas compartilhadas (servidor)', acao: 'gerir caixa compartilhada / trilha (linhas 793, 1176, 1182, 1209, 1223)', regraAtual: 'q.admin (perfil ADMIN)' }] });
poder('WHATSAPP_PILOTO_GERIR', L9c, 9, 'administrar', 'Piloto do WhatsApp', 'Quem participa do piloto de avisos pelo WhatsApp.', "['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].indexOf(eu.perfil) >= 0",
  [[/SGO_WhatsappPiloto/, /^(SGO_waPilotoEu_|SGO_waPilotoGravar_)$/, /inline/, { trecho: /WAP_PERFIS_TELA/ }]]);
poder('WHATSAPP_PILOTO_LIGAR', L9c, 9, 'administrar', 'Ligar e desligar o piloto do WhatsApp', 'Liga ou desliga o piloto para todos.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_WhatsappPiloto/, /^SGO_waPilotoGravar_$/, /inline/, { trecho: /ligaDesliga/ }]]);
poder('WHATSAPP_VER_TELEFONES', L9c, 9, 'sigiloso', 'Ver telefones completos no piloto', 'Mostra o celular completo das pessoas (os demais veem só o final).', "eu.perfil === 'ADMIN'",
  [[/SGO_WhatsappPiloto/, /^SGO_waPilotoEu_$/, /inline/, { linha: [337] }]]);
poder('ASSISTENTE_PAINEL_PERGUNTAS', L9c, 9, 'ver', 'Painel de perguntas ao assistente', 'Vê as perguntas feitas ao assistente "Tire sua dúvida" e sugere melhorias.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA'",
  [[/SGO_Assistente/, null, /SGO_Assist_exigirPainel_|inline/, { trecho: /painel|SGO_Assist_exigirPainel_/ }]]);

// ===== LOTE 10 — Cadastros, Auvo, painel de qualidade, Licitações, automação predial
const L10c = 'Cadastros e documentos';
poder('CADASTROS_EDITAR', L10c, 10, 'operar', 'Cadastrar clientes, unidades e equipamentos', 'Criar, editar e inativar cliente, unidade, equipamento e documento.', 'H.interno(eu)',
  [[/SGO_(Clientes|Unidades|Equipamentos|Documentos)/, /^(criar|atualizar|inativar|reativar|registrarDocumentoExistente)$/, /inline:perfil_cliente/]], { obs: 'Hoje a trava é "perfil diferente de CLIENTE" (SGO_Clientes.js:77, 142, 206).' });
poder('CADASTROS_EXCLUIR', L10c, 10, 'excluir', 'Excluir cadastro de vez', 'Excluir cliente, unidade, equipamento, documento e vínculo definitivamente.', 'H.gestaoDecisoes(eu)',
  [[/SGO_(Clientes|Unidades|Equipamentos|Documentos|Vinculos)/, /^(excluir|exigirExcluir)$/, /isAdminSession|inline:perfil_cliente/]]);
poder('CADASTROS_ROTINA_GESTAO', L10c, 10, 'operar', 'Rotina de cadastros da gestão', 'Transferir, consolidar e desvincular cadastros, histórico de vínculos, alterar documento com arquivo, painel de cadastros.', 'H.gestaoDecisoes(eu) || H.rotina(eu)',
  [[/SGO_(Vinculos|Documentos|CadastrosPainel)/, /^(staff|overview|details|atualizar|CadPainel_montar_)$/, /SGO_rotinaSessao_|isAdminSession/]]);
poder('CADASTROS_JUNTAR_DUPLICADOS', L10c, 10, 'administrar', 'Juntar cadastros repetidos', 'Juntar duplicados, marcar "não é duplicado", relatório de qualidade dos cadastros, atribuir correção, vínculo sem CNPJ.', "eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || H.dono(eu)",
  [[/SGO_(CadastroQualidade|Vinculos)/, null, /CadQ_podeJuntar_|CadQ_exigirJuntar_|inline/]]);
poder('EQUIPAMENTO_QR_COMPLETO', L10c, 10, 'ver', 'Ver tudo pelo QR do equipamento', 'Pelo QR Code, vê a ficha completa do equipamento (cliente vê só o dele).', 'H.equipeTecnica(eu)',
  [[/SGO_QRCode/, null, /inline/]]);
const L10a = 'Integração Auvo e painel de qualidade';
poder('AUVO_INTEGRACAO', L10a, 10, 'operar', 'Usar a integração com o Auvo', 'Conexão, sincronização diária e incremental, pendências, envio de cadastro pendente, relatório, buscar e sincronizar um cliente.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Auvo/, null, /Auvo_exigirAdmin_/], [/SGO_Main/, null, /isAdminPerfilAuth_/]]);
poder('AUVO_IMPLANTACAO', L10a, 10, 'administrar', 'Ferramentas de implantação do Auvo', 'Sincronizar em lote, importação reversa, técnicos e auditoria de nomes.', "eu.perfil === 'ADMIN'",
  [[/SGO_Auvo_Main/, /^Auvo_apiDispatch$/, /inline/]]);
poder('AUVO_ACERVO', L10a, 10, 'ver', 'Acervo do Auvo', 'Consulta o acervo histórico importado do Auvo.', "['ADMIN', 'DIRETORIA'].indexOf(eu.perfil) >= 0",
  [[/SGO_AuvoAcervo/, null, /AuvoAcervo_perfilPode_/]]);
poder('QUALIDADE_VER_PAINEL', L10a, 10, 'ver', 'Painel de qualidade', 'Painel, lista de ocorrências de qualidade e relatório.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Qualidade_(Main|Relatorio|Ocorrencias)/, /^(Qualidade_apiObterPainel|Qualidade_apiListarOcorrencias|Qualidade_apiGerarRelatorio)$/, /Qualidade_exigirGestor_/]]);
poder('QUALIDADE_REGISTRAR', L10a, 10, 'operar', 'Registrar e resolver ocorrência de qualidade', 'Ocorrências de qualidade ligadas a O.S. do Auvo e à Frota.', 'H.gestaoDecisoes(eu)',
  [[/SGO_Qualidade_Ocorrencias/, /^(Qualidade_apiRegistrarOcorrencia|Qualidade_apiResolverOcorrencia)$/, /Qualidade_exigirGestor_/]]);
const L10l = 'Licitações';
poder('LIC_USAR', L10l, 10, 'operar', 'Trabalhar em Licitações', 'Radar, fichas, pareceres, preços, proposta, disputa, habilitação, contratos, mercado e relatórios.', 'H.lic(eu)',
  [[/SGO_Licitacoes/, null, /Lic_exigir_/], [/SGO_Licitacoes(_Pareceres)?\.js/, null, /inline/, { trecho: /eu\.gestao/ }]]);
poder('LIC_ALCADAS', L10l, 10, 'administrar', 'Alterar alçadas dos pareceres', 'Quem dá parecer e as alçadas de participação.', "eu.perfil === 'ADMIN' || H.dono(eu)",
  [[/SGO_Licitacoes_Pareceres/, null, /LicPar_podeMudarCfg_/]]);
poder('LIC_ATOS_EXCEPCIONAIS', L10l, 10, 'administrar', 'Atos excepcionais em Licitações', 'Reabrir contrato encerrado e reconhecer quebra do registro de lances.', "eu.perfil === 'ADMIN'",
  [[/SGO_Licitacoes_(Contratos|Disputa)/, /^(LicC_versao_|LicD_quebraConferir_|LicD_reconhecerQuebra_)$/, /inline/, { linha: [590, 834, 855] }]]);
const L10x = 'Automação predial';
poder('AUT_PORTOES', L10x, 10, 'operar', 'Abrir e fechar portões', 'Ver e acionar os portões e o alarme.', 'H.interno(eu)',
  [[/SGO_Automacao_Predial/, /^(AutPred_direitos_|AutPred_sessao_)$|^$/, /AutPred_sessao_|AutPred_direitos_/], [/SGO_Alarme_Intelbras/, null, /AutPred_ehDono_/]]);
poder('AUT_PORTA_DIRETORIA', L10x, 10, 'operar', 'Destravar a porta da Diretoria', 'Acionar dispositivo restrito à Diretoria (os demais diretores só veem, salvo permissão ACIONAR).', 'H.dono(eu) || (H.autAdministra(eu) && eu.perfil !== "ADMIN" && CFG.autPermissoesAcionar.indexOf(eu.id) >= 0)',
  [[/SGO_Automacao_(Predial|Saude)/, null, /AutPred_ehDiretor_|AutPred_ehDono_/]], { obs: 'Ver o dispositivo restrito: AutPred_ehDiretor_ (perfil DIRETORIA, dono ou vínculo DIRETORIA). Acionar: dono por padrão ou permissão ACIONAR (AUT_PERMISSOES, hoje vazia).' });
poder('AUT_ADMINISTRAR', L10x, 10, 'administrar', 'Administrar a automação predial', 'Dispositivos, canais, permissões, homologação, saúde da infraestrutura, registro de todos os comandos, alarme.', 'H.autAdministra(eu)',
  [[/SGO_(Automacao_(Predial|Saude)|Alarme_Intelbras|Chaves)/, null, /AutPred_exigirAdministrador_|AutPred_administra_|AutPred_exigirSaude_/]]);

module.exports = { USUARIOS, CFG, H_SRC, P };
