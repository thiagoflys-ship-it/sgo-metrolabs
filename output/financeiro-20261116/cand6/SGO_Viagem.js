/****************************************************
 * DEPÓSITO DE VIAGEM — ETAPA 1 (E1, 11/11/2026, pedido e decisões do dono)
 *
 * Proposta aprovada: output/deposito-viagem-20261111/PROPOSTA_DEPOSITO_VIAGEM.md. Manual: docs/MANUAL_DEPOSITO_VIAGEM.md.
 * Tela: JS_DepositoViagem.html (menu Operação de campo > Depósito de viagem). Ajuda: SGO_Ajuda_DepositoViagem.js.
 * Relatório A4 da solicitação: SGO_Viagem_Documento.js.
 *
 * O QUE A E1 FAZ
 *  - O gestor monta a solicitação discriminada: centro de custo (obrigatório), vínculo (cliente, proposta, O.S. ou viagem
 *    interna justificada), destino, ida e volta, equipe, responsável pelo dinheiro, veículo, roteiro e as linhas do orçamento
 *    (hospedagem, alimentação, combustível, pedágio, estacionamento, passagens, transporte local e outros). O TOTAL NUNCA É
 *    DIGITADO: sai da soma das linhas (um total enviado pela tela que não bate com a soma é recusado). Cada categoria
 *    obrigatória tem linha ou "não se aplica" com o motivo. Hotel, passagem e "outros" só passam com orçamento ou print anexado.
 *  - Conferência na hora: o impossível é recusado com o motivo e o que fazer; o resto vira apontamento para quem aprova.
 *  - Relatório A4 (HTML) de cada revisão. Mudar o conteúdo depois do envio ou da aprovação gera revisão nova e exige nova
 *    aprovação (a aprovação fica presa à revisão e à marca SHA-256 do conteúdo).
 *  - Aprovação: o aprovador configurado na política (padrão: o login matheusgodoi) aprova, devolve ou nega com fundamentação.
 *    A Diretoria também aprova quando o aprovador pede ou viaja (ninguém aprova a si mesmo), quando o total passa do limite
 *    da política (padrão R$ 5.000,00) e quando alguma linha passa do teto da política (com justificativa).
 *  - Aviso de aprovação pela fila dos avisos da gestão (evento GS05, registrado na matriz por este arquivo): gestor recebe
 *    no expediente; solicitação urgente (viagem começa em menos de N dias úteis, padrão 2) avisa na hora, a qualquer horário.
 *    Item na Caixa de decisões até a decisão. Ao decidir, quem pediu e o responsável pelo dinheiro são avisados.
 *  - Carga no cartão Caju registrada pelo Financeiro (data, valor e comprovante obrigatório), nunca acima do aprovado da
 *    revisão vigente. NÃO HÁ INTEGRAÇÃO COM O CAJU: a carga é feita no portal do Caju e só registrada aqui.
 *  - Cadastro de centros de custo (CAD_CENTROS_CUSTO): unidade + área, mais Frota e Sede, mantido pela Diretoria e Financeiro.
 *  - Política de viagem com versões (VIA_POLITICA): aprovadores, limite da Diretoria, antecedência do urgente e tetos por
 *    categoria. Os tetos começam VAZIOS (nenhum valor inventado): vazio não confere; preenchido, acima dele exige
 *    justificativa e sobe à Diretoria. Desde 11/11/2026 (decisão do dono) só hospedagem e alimentação têm teto (VIA_TETO_CATS).
 *  - Caixas de acesso (SGO_Poderes.js, lote 12): VIAGEM_SOLICITAR, VIAGEM_VER_TODAS, VIAGEM_APROVAR, VIAGEM_APROVAR_DIRETORIA,
 *    VIAGEM_DEPOSITAR, VIAGEM_POLITICA e VIAGEM_CENTRO_CUSTO. Proteções fixas: ninguém aprova a solicitação que pediu ou em que
 *    viaja; quem aprovou não registra a carga; quem viaja não registra a carga do próprio cartão.
 *
 * ETAPA 2 (E2, 11/11/2026): PRESTAÇÃO DE CONTAS, CONFERÊNCIA DO FINANCEIRO, ACERTO, FECHAMENTO E TRAVA — SGO_Viagem_Prestacao.js
 * (regras), SGO_Viagem_Fechamento.js (A4 de fechamento). Abas novas: VIA_PRESTACOES (um gasto por linha), VIA_ACERTOS (devolução
 * do saldo e reembolso) e VIA_LIBERACOES (liberação da trava pela Diretoria). Situações novas depois da carga: prestação
 * pendente (calculada: carga feita e viagem terminada), prestação devolvida, em conferência, acerto pendente, aguardando a
 * ciência e encerrada. Caixa nova VIAGEM_CONFERIR (lote 12; padrão: Financeiro). SEM CONCILIAÇÃO COM O CAJU: a importação do
 * extrato e o casamento com as transações do cartão vão para um MÓDULO NOVO (decisão do dono, 11/11/2026), que lê os dados já
 * organizados (Via_dadosConciliacao_, colunas TRANSACAO_ID/CONCILIACAO_SITUACAO/EXTRATO_ID reservadas e vazias).
 * LIGAÇÃO FUTURA COM COMPRAS: a compra informada grava CENTRO_CUSTO como texto livre (SGO_Compras_Informar.js,
 * CmpI_vinculo_/CmpI_opcoes_); nada disso foi migrado. A troca do texto livre pela escolha deste cadastro fica para a E3.
 *
 * Ordem de carga: o servidor e o Apps Script carregam os arquivos em ordem alfabética; este vem depois de SGO_Alertas_*,
 * SGO_Avisos_*, SGO_Gestao_* e SGO_Poderes.js, então as listas que ele completa (PEND_*, GES_TIPOS, AVG_*, MTZ_*) já existem.
 * Nenhuma função devolve Date cru. Nenhum aviso leva valor pelo WhatsApp além do total do pedido.
 ****************************************************/

var VIA_FUSO = 'America/Sao_Paulo';
var VIA_MODULO = 'viagem';
var VIA_TELA = 'deposito_viagem';
var VIA_ABAS = { SOLICITACOES: 'VIA_SOLICITACOES', REVISOES: 'VIA_REVISOES', ANEXOS: 'VIA_ANEXOS', DECISOES: 'VIA_DECISOES', CARGAS: 'VIA_CARGAS',
  HISTORICO: 'VIA_HISTORICO', POLITICA: 'VIA_POLITICA', CENTROS: 'CAD_CENTROS_CUSTO', PRESTACOES: 'VIA_PRESTACOES', ACERTOS: 'VIA_ACERTOS', LIBERACOES: 'VIA_LIBERACOES' };
var VIA_COLUNAS = {
  VIA_SOLICITACOES: ['ID', 'NUMERO', 'SITUACAO', 'REVISAO', 'SOLICITANTE_ID', 'SOLICITANTE_NOME', 'CENTRO_CUSTO_ID', 'CENTRO_CUSTO_CODIGO', 'VINCULO_TIPO', 'CLIENTE_ID',
    'CLIENTE_NOME', 'VINCULO_REF', 'VINCULO_JUSTIFICATIVA', 'OBJETIVO', 'DESTINO_CIDADE', 'DESTINO_UF', 'SAIDA_EM', 'CHEGADA_EM', 'EQUIPE_JSON', 'RESPONSAVEL_ID',
    'RESPONSAVEL_NOME', 'VEICULO_TIPO', 'VEICULO_ID', 'VEICULO_NOME', 'VEICULO_JUSTIFICATIVA', 'ROTEIRO', 'LINHAS_JSON', 'NAO_SE_APLICA_JSON', 'TOTAL', 'URGENTE',
    'EXIGE_DIRETORIA', 'MOTIVOS_DIRETORIA', 'APONTAMENTOS_JSON', 'POLITICA_VERSAO', 'CONTEUDO_HASH', 'REVISAO_HASH', 'ETAPA', 'GERENCIA_APROVADOR_ID',
    'APROVACAO_VALIDA', 'APROVADO_REVISAO', 'APROVADO_HASH', 'APROVADO_TOTAL', 'APROVADO_EM', 'CARREGADO_TOTAL', 'ENVIADO_EM', 'DECIDIDO_EM', 'CANCELADO_EM',
    'CANCELADO_MOTIVO', 'CRIADO_EM', 'ATUALIZADO_EM', 'ATUALIZADO_POR_NOME',
    // E2 (prestação, conferência e acerto). Os valores são CALCULADOS pelo sistema (nunca digitados) e gravados a cada mudança,
    // para o módulo de conciliação ler sem refazer a conta. CONCILIACAO_SITUACAO fica vazia: é do módulo de conciliação com o Caju.
    'PRESTACAO_PRAZO', 'PRESTACAO_SITUACAO', 'CONCILIACAO_SITUACAO', 'SALDO_RECOLHIDO', 'ENCERRADO_EM',
    'PRESTACAO_ENVIADA_EM', 'PRESTACAO_ENVIADA_POR_NOME', 'PRESTACAO_OBS', 'GASTO_TOTAL', 'GASTO_CAJU', 'GASTO_PROPRIO', 'ACEITO_TOTAL', 'GLOSADO_TOTAL',
    'A_DEVOLVER', 'A_REEMBOLSAR', 'DEVOLVIDO_TOTAL', 'REEMBOLSADO_TOTAL', 'CONFERIDA_EM', 'CONFERIDA_POR_ID', 'CONFERIDA_POR_NOME', 'FECHAMENTO_HASH',
    'CIENCIA_EM', 'CIENCIA_POR_ID', 'CIENCIA_POR_NOME', 'CIENCIA_COMENTARIO'],
  VIA_REVISOES: ['ID', 'SOLICITACAO_ID', 'NUMERO', 'REVISAO', 'HASH', 'TOTAL', 'CONTEUDO_JSON', 'MOTIVO', 'CRIADA_EM', 'CRIADA_POR_ID', 'CRIADA_POR_NOME'],
  VIA_ANEXOS: ['ID', 'SOLICITACAO_ID', 'LINHA_ID', 'CATEGORIA', 'TIPO', 'NOME', 'ARQUIVO_ID', 'URL', 'MIME', 'TAMANHO', 'SHA', 'ENVIADO_POR_ID', 'ENVIADO_POR_NOME',
    'ENVIADO_EM', 'REMOVIDO_EM', 'REMOVIDO_POR_NOME'],
  VIA_DECISOES: ['ID', 'SOLICITACAO_ID', 'REVISAO', 'HASH', 'ETAPA', 'DECISAO', 'FUNDAMENTACAO', 'TOTAL', 'POR_ID', 'POR_NOME', 'EM'],
  VIA_CARGAS: ['ID', 'SOLICITACAO_ID', 'REVISAO', 'DATA', 'VALOR', 'CENTRO_CUSTO_CAJU', 'OBSERVACAO', 'COMPROVANTE_ID', 'COMPROVANTE_URL', 'COMPROVANTE_NOME',
    'POR_ID', 'POR_NOME', 'EM',
    // reservados para a E2 (conciliação com o extrato do Caju)
    'EXTRATO_ID', 'CONCILIADA_EM',
    // 11/11/2026 (Conciliação Caju, SGO_Caju_Pedidos.js): carga feita pela API do Caju. ORIGEM = CAJU_API (vazio = manual).
    'ORIGEM', 'PEDIDO_CAJU_ID', 'TAXA_CAJU', 'TOTAL_CAJU'],
  VIA_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'REVISAO', 'ACAO', 'DE', 'PARA', 'TEXTO', 'POR_ID', 'POR_NOME', 'EM'],
  VIA_POLITICA: ['ID', 'VERSAO', 'VALOR_JSON', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM'],
  CAD_CENTROS_CUSTO: ['ID', 'CODIGO', 'NOME', 'UNIDADE', 'AREA', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'CODIGO_CAJU', 'CODIGO_OMIE', 'ATIVO', 'CRIADO_EM', 'CRIADO_POR',
    'ATUALIZADO_EM', 'ATUALIZADO_POR'],
  // E2: um gasto da prestação por linha. ID estável (uuid) e ITEM_NUMERO (1, 2, 3... dentro da solicitação) para o módulo de
  // conciliação casar com a transação do cartão (TRANSACAO_ID e CONCILIACAO_SITUACAO ficam vazios até lá). VALOR é o gasto
  // declarado; VALOR_ACEITO e VALOR_GLOSADO saem da conferência do Financeiro. PAGO_COM: CAJU (cartão) ou PROPRIO (dinheiro da pessoa).
  VIA_PRESTACOES: ['ID', 'SOLICITACAO_ID', 'NUMERO', 'ITEM_NUMERO', 'LINHA_ID', 'CATEGORIA', 'FORA_DO_ORCADO', 'DATA', 'VALOR', 'ESTABELECIMENTO', 'CNPJ', 'DESCRICAO',
    'PAGO_COM', 'SEM_COMPROVANTE', 'JUSTIFICATIVA_SEM_COMPROVANTE', 'COMPROVANTE_ID', 'COMPROVANTE_URL', 'COMPROVANTE_NOME', 'COMPROVANTE_SHA', 'LEITURA_IA_JSON',
    'IA_DIVERGENCIAS', 'CENTRO_CUSTO_CODIGO', 'CENTRO_CUSTO_CAJU', 'PESSOA_ID', 'PESSOA_NOME', 'SITUACAO', 'VALOR_ACEITO', 'VALOR_GLOSADO', 'GLOSA_MOTIVO',
    'CONFERIDO_POR_ID', 'CONFERIDO_POR_NOME', 'CONFERIDO_EM', 'TRANSACAO_ID', 'CONCILIACAO_SITUACAO', 'LANCADO_POR_ID', 'LANCADO_POR_NOME', 'LANCADO_EM',
    'REMOVIDO_EM', 'REMOVIDO_POR_NOME', 'REMOVIDO_MOTIVO'],
  // E2: acerto do saldo. DEVOLUCAO (a pessoa devolve: recolhimento no Caju ou depósito dela) e REEMBOLSO (a empresa paga a diferença).
  VIA_ACERTOS: ['ID', 'SOLICITACAO_ID', 'NUMERO', 'TIPO', 'FORMA', 'DATA', 'VALOR', 'OBSERVACAO', 'COMPROVANTE_ID', 'COMPROVANTE_URL', 'COMPROVANTE_NOME', 'CENTRO_CUSTO_CODIGO',
    'CENTRO_CUSTO_CAJU', 'PESSOA_ID', 'PESSOA_NOME', 'POR_ID', 'POR_NOME', 'EM', 'TRANSACAO_ID', 'CONCILIADO_EM'],
  // E2: liberação da trava (prestação vencida) pela Diretoria, com motivo e validade; vale para as viagens listadas.
  VIA_LIBERACOES: ['ID', 'PESSOA_ID', 'PESSOA_NOME', 'SOLICITACOES_JSON', 'NUMEROS', 'MOTIVO', 'VALIDA_ATE', 'POR_ID', 'POR_NOME', 'EM']
};
var VIA_COLUNAS_TEXTO = {
  VIA_SOLICITACOES: ['NUMERO', 'SAIDA_EM', 'CHEGADA_EM', 'APROVADO_EM', 'ENVIADO_EM', 'DECIDIDO_EM', 'CANCELADO_EM', 'CRIADO_EM', 'ATUALIZADO_EM', 'DESTINO_UF', 'VINCULO_REF', 'PRESTACAO_PRAZO', 'ENCERRADO_EM',
    'PRESTACAO_ENVIADA_EM', 'CONFERIDA_EM', 'CIENCIA_EM'],
  VIA_REVISOES: ['CRIADA_EM'], VIA_ANEXOS: ['ENVIADO_EM', 'REMOVIDO_EM'], VIA_DECISOES: ['EM'], VIA_CARGAS: ['DATA', 'EM', 'CONCILIADA_EM', 'PEDIDO_CAJU_ID'],
  VIA_HISTORICO: ['EM'], VIA_POLITICA: ['EM'], CAD_CENTROS_CUSTO: ['CODIGO', 'CODIGO_CAJU', 'CODIGO_OMIE', 'CRIADO_EM', 'ATUALIZADO_EM'],
  VIA_PRESTACOES: ['NUMERO', 'DATA', 'CNPJ', 'CONFERIDO_EM', 'LANCADO_EM', 'REMOVIDO_EM', 'CENTRO_CUSTO_CAJU'], VIA_ACERTOS: ['NUMERO', 'DATA', 'EM', 'CONCILIADO_EM', 'CENTRO_CUSTO_CAJU'],
  VIA_LIBERACOES: ['VALIDA_ATE', 'EM']
};
/**
 * PARA O MÓDULO DE CONCILIAÇÃO COM O CAJU (módulo novo, decisão do dono de 11/11/2026; NÃO criadas aqui): importação do extrato
 * (CSV ou API do Caju) e o casamento das transações com VIA_CARGAS (EXTRATO_ID), VIA_PRESTACOES (TRANSACAO_ID) e VIA_ACERTOS
 * (TRANSACAO_ID). Desenho de referência; o módulo novo decide o formato final.
 */
var VIA_COLUNAS_E2 = {
  VIA_EXTRATO_CAJU: ['ID', 'IMPORTACAO_ID', 'IDENTIFICADOR', 'COLABORADOR', 'USUARIO_ID', 'DATA', 'VALOR', 'ESTABELECIMENTO', 'CNPJ', 'CATEGORIA_MCC', 'CENTRO_CUSTO_CAJU',
    'TIPO', 'SOLICITACAO_ID', 'SITUACAO', 'LINHA_ORIGINAL_JSON'],
  VIA_CONCILIACOES: ['ID', 'SOLICITACAO_ID', 'CENTRO_CUSTO_CODIGO', 'APROVADO', 'GASTO_CARTAO', 'COMPROVADO', 'SALDO', 'SITUACAO', 'POR_ID', 'EM']
};

/**
 * Situações gravadas. PRESTACAO_PENDENTE não é gravada: é a CARGA_FEITA depois da chegada da viagem (Via_sitEfetiva_), para a
 * pessoa não depender de uma rotina para "virar" a situação.
 */
var VIA_SITUACOES = { RASCUNHO: 'Rascunho', AGUARDANDO_APROVACAO: 'Aguardando aprovação', AGUARDANDO_DIRETORIA: 'Aguardando a Diretoria', DEVOLVIDA: 'Devolvida para ajuste',
  NEGADA: 'Negada', APROVADA: 'Aprovada, aguardando a carga', CARGA_FEITA: 'Carga feita no cartão', CANCELADA: 'Cancelada',
  PRESTACAO_PENDENTE: 'Prestação de contas pendente', PRESTACAO_DEVOLVIDA: 'Prestação devolvida para ajuste', PRESTACAO_ENVIADA: 'Prestação em conferência',
  ACERTO_PENDENTE: 'Conferida, acerto do saldo pendente', AGUARDANDO_CIENCIA: 'Aguardando a ciência do fechamento', ENCERRADA: 'Encerrada (contas fechadas)' };
var VIA_EDITAVEIS = ['RASCUNHO', 'DEVOLVIDA', 'APROVADA', 'CARGA_FEITA'];
var VIA_AGUARDANDO = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_DIRETORIA'];
/** Depois da carga: a prestação de contas (a viagem aconteceu ou está acontecendo). */
var VIA_POS_CARGA = ['PRESTACAO_DEVOLVIDA', 'PRESTACAO_ENVIADA', 'ACERTO_PENDENTE', 'AGUARDANDO_CIENCIA', 'ENCERRADA'];
/** Situações que ocupam a pessoa nas datas (sobreposição de viagens). */
var VIA_ATIVAS = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_DIRETORIA', 'DEVOLVIDA', 'APROVADA', 'CARGA_FEITA'].concat(VIA_POS_CARGA);
var VIA_VINCULOS = { CLIENTE: 'Cliente', PROPOSTA: 'Proposta comercial', OS: 'Ordem de serviço', INTERNA: 'Viagem interna' };
var VIA_FUNCOES = { TECNICO: 'Técnico', ENGENHEIRO: 'Engenheiro', GESTOR: 'Gestor', OUTRO: 'Outra função' };
var VIA_VEICULOS = { FROTA: 'Veículo da Frota', PROPRIO: 'Veículo próprio', COLETIVO: 'Ônibus, avião ou outro transporte coletivo', SEM: 'Sem veículo (deslocamento a pé ou de carona)' };
var VIA_ETAPAS = { GERENCIA: 'Aprovação da gerência', DIRETORIA: 'Aprovação da Diretoria' };
var VIA_DECISOES_NOMES = { APROVAR: 'Aprovada', DEVOLVER: 'Devolvida para ajuste', NEGAR: 'Negada' };
var VIA_RX_ANEXO = /\.(pdf|png|jpe?g|webp|heic)$/i;
var VIA_ANEXO_MAX_BASE64 = 14 * 1024 * 1024;
var VIA_FUNDAMENTACAO_MIN = 15;
var VIA_JUSTIFICATIVA_MIN = 20;
var VIA_PASTA_ANEXOS = 'Depósito de viagem - Anexos';

/**
 * Linhas do orçamento. valor = q1 × q2 × unitário (q2 ausente = 1); COMBUSTIVEL: q1 ÷ q2 × unitário (km ÷ km por litro × preço).
 * inteiro: número inteiro a partir de 1; meio: múltiplo de 0,5. O teto da política vale para o unitário.
 */
var VIA_CATEGORIAS = [
  { cod: 'HOSPEDAGEM', nome: 'Hospedagem', anexo: true, q1: { rot: 'Quartos', un: ['quarto', 'quartos'], inteiro: true }, q2: { rot: 'Noites', un: ['noite', 'noites'], inteiro: true },
    un: 'Diária do quarto (R$)', desc: 'Hotel e cidade', descObrig: true, tetoRot: 'diária por quarto', ajuda: 'Quartos × noites × diária do hotel. Anexe o print ou o orçamento do hotel com a diária.' },
  { cod: 'ALIMENTACAO', nome: 'Alimentação', q1: { rot: 'Pessoas', un: ['pessoa', 'pessoas'], inteiro: true }, q2: { rot: 'Dias', un: ['dia', 'dias'], meio: true },
    un: 'Valor por pessoa por dia (R$)', desc: 'Observação (opcional)', tetoRot: 'por pessoa por dia', ajuda: 'Pessoas × dias × valor por pessoa por dia. Dia de ida ou volta pela metade: use 0,5.' },
  { cod: 'COMBUSTIVEL', nome: 'Combustível', q1: { rot: 'Km total (ida e volta)', un: ['km', 'km'] }, q2: { rot: 'Consumo do veículo (km por litro)', un: ['km/L', 'km/L'], divisor: true },
    un: 'Preço do litro (R$)', desc: 'Observação (opcional)', tetoRot: 'preço do litro', ajuda: 'Km da ida e da volta ÷ consumo do veículo × preço do litro. Veículo com cartão-combustível da empresa: marque "Não se aplica" e escreva "pago pelo cartão da Frota".' },
  { cod: 'PEDAGIO', nome: 'Pedágio', q1: { rot: 'Passagens pelas praças', un: ['passagem', 'passagens'], inteiro: true },
    un: 'Valor médio por passagem (R$)', desc: 'Trecho e praças', tetoRot: 'por passagem', ajuda: 'Número de passagens pelas praças (ida e volta) × valor médio. Veículo com tag de pedágio da empresa: "Não se aplica".' },
  { cod: 'ESTACIONAMENTO', nome: 'Estacionamento', q1: { rot: 'Dias', un: ['dia', 'dias'], meio: true }, un: 'Valor por dia (R$)', desc: 'Onde (opcional)', tetoRot: 'por dia',
    ajuda: 'Dias × valor por dia.' },
  { cod: 'PASSAGENS', nome: 'Passagens', anexo: true, q1: { rot: 'Pessoas', un: ['pessoa', 'pessoas'], inteiro: true }, un: 'Valor da passagem por pessoa (R$)', desc: 'Trecho e companhia',
    descObrig: true, tetoRot: 'por pessoa', ajuda: 'Pessoas × valor da passagem (ida e volta somadas). Anexe o print da cotação.' },
  { cod: 'TRANSPORTE_LOCAL', nome: 'Transporte local', q1: { rot: 'Dias', un: ['dia', 'dias'], meio: true }, un: 'Valor por dia (R$)', desc: 'Táxi, aplicativo ou ônibus', tetoRot: 'por dia',
    ajuda: 'Dias × valor por dia de táxi, aplicativo ou ônibus no destino.' },
  { cod: 'OUTROS', nome: 'Outros', anexo: true, opcional: true, q1: { rot: 'Quantidade', un: ['unidade', 'unidades'], inteiro: true }, un: 'Valor unitário (R$)', desc: 'O que é',
    descObrig: true, justificativa: true, tetoRot: 'por item', ajuda: 'Gasto que não cabe nas categorias acima. Exige justificativa (20 letras ou mais) e o orçamento ou print anexado.' }
];
/**
 * Decisão do dono (11/11/2026): a política só tem teto de HOSPEDAGEM (diária por quarto) e de ALIMENTAÇÃO (por pessoa por
 * dia). As outras categorias não têm teto: a linha continua no orçamento (com o anexo onde já é exigido), mas não é conferida
 * contra teto. Valor antigo gravado na política para outra categoria é ignorado (não quebra nem confere nada).
 */
var VIA_TETO_CATS = ['HOSPEDAGEM', 'ALIMENTACAO'];
var VIA_CAT = {};
VIA_CATEGORIAS.forEach(function (c) { VIA_CAT[c.cod] = c; });

/** Política padrão (antes de a Diretoria gravar): só o aprovador e os limites decididos pelo dono em 11/11/2026; tetos vazios. */
var VIA_POLITICA_PADRAO = { aprovadores: ['matheusgodoi'], limiteDiretoria: 5000, urgenteDiasUteis: 2, tetos: {}, prazoPrestacaoDiasUteis: 3, limiteSemComprovante: null };
/** E2: prazo da prestação (dias úteis depois da volta) vai de 1 a 30; o gasto sem comprovante começa VAZIO (= não é permitido). */
var VIA_PRAZO_PRESTACAO_MAX = 30;
/** Unidades da empresa (as bases da Frota) para a lista inicial de centros de custo. */
var VIA_UNIDADES = [['GO', 'Goiânia'], ['RJ', 'Rio de Janeiro']];
var VIA_AREAS_RESERVA = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['COMERCIAL', 'Comercial'], ['FINANCEIRO', 'Financeiro'], ['RH', 'RH'],
  ['QUALIDADE', 'Qualidade'], ['METROLOGIA', 'Metrologia'], ['TECNICA', 'Técnica/Campo'], ['LOGISTICA', 'Logística']];
var VIA_PODERES = ['VIAGEM_SOLICITAR', 'VIAGEM_VER_TODAS', 'VIAGEM_APROVAR', 'VIAGEM_APROVAR_DIRETORIA', 'VIAGEM_DEPOSITAR', 'VIAGEM_CONFERIR', 'VIAGEM_POLITICA', 'VIAGEM_CENTRO_CUSTO'];

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Via_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Via_up_(v) { return Via_s_(v).toUpperCase(); }
function Via_texto_(v, max) { var s = Via_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }
function Via_json_(t, padrao) { if (t && typeof t === 'object') return t; try { var v = JSON.parse(Via_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Via_2_(n) { return (n < 10 ? '0' : '') + n; }
function Via_r2_(v) { var n = Number(v) || 0; return Math.round((n + (n >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
function Via_cent_(v) { return Math.round((Number(v) || 0) * 100); }
function Via_agora_() { return Utilities.formatDate(new Date(), VIA_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function Via_hoje_() { return Utilities.formatDate(new Date(), VIA_FUSO, 'yyyy-MM-dd'); }
function Via_id_() { try { return Utilities.getUuid(); } catch (e) { return 'via-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); } }
/** Número pt-BR: aceita número ou texto ("1.234,56", "R$ 250,00", "0,5", "1.5"). null = vazio ou inválido. */
function Via_num_(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = Via_s_(v).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!s) return null;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}
function Via_numBr_(v, casas) {
  if (typeof SGO_DocA4_num_ === 'function') return SGO_DocA4_num_(Number(v) || 0, casas);
  return (Number(v) || 0).toFixed(casas).replace('.', ',');
}
/** "R$ 1.234,56" (pt-BR). */
function Via_moeda_(v) { return 'R$ ' + Via_numBr_(Via_r2_(v), 2); }
/** Quantidade sem casas desnecessárias: 2, 2,5, 600. */
function Via_qtd_(v) { var n = Number(v) || 0; return Via_numBr_(n, Math.round(n) === n ? 0 : (Math.round(n * 10) === n * 10 ? 1 : 2)); }
/** "aaaa-mm-ddTHH:mm" de qualquer valor de data do banco ('' se não der para ler). */
function Via_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, VIA_FUSO, "yyyy-MM-dd'T'HH:mm");
  var s = Via_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (m) {
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) && m[4]) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, VIA_FUSO, "yyyy-MM-dd'T'HH:mm"); }
    return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] : '');
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] : '') : '';
}
function Via_dia_(v) { return Via_iso_(v).slice(0, 10); }
function Via_br_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(Via_iso_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function Via_brDia_(v) { return Via_br_(v).slice(0, 10); }
function Via_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Via_s_(dia));
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Via_2_(t.getUTCMonth() + 1) + '-' + Via_2_(t.getUTCDate());
}
function Via_diasEntre_(diaA, diaB) {
  var a = /^(\d{4})-(\d{2})-(\d{2})/.exec(Via_s_(diaA)), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(Via_s_(diaB));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 864e5);
}
/** Dia útil da empresa (fim de semana e feriados não; SGO_Expediente.js). */
function Via_diaUtil_(dia) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(Via_s_(dia));
  if (!m) return false;
  var semana = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  if (typeof SGO_expedienteMotivoDia_ === 'function' && typeof SGO_expediente_ === 'function') return !SGO_expedienteMotivoDia_(dia, semana, SGO_expediente_());
  return semana !== 0 && semana !== 6;
}
/** Dias úteis DEPOIS de hoje até o dia (o dia conta). 0 = hoje ou antes. */
function Via_diasUteisAte_(dia) {
  var hoje = Via_hoje_(), d = hoje, n = 0;
  dia = Via_s_(dia).slice(0, 10);
  if (!dia || dia <= hoje) return 0;
  for (var i = 0; i < 400; i++) { d = Via_somarDias_(d, 1); if (d > dia) break; if (Via_diaUtil_(d)) n++; }
  return n;
}
/** Marca do conteúdo (SHA-256 em hexadecimal). */
function Via_marca_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = (x < 0 ? x + 256 : x).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  } catch (e) {
    var h1 = 5381, s = String(texto || '');
    for (var i = 0; i < s.length; i++) h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) | 0;
    return 'x' + (h1 >>> 0).toString(16);
  }
}
function Via_plural_(n, um, varios) { return Via_qtd_(n) + ' ' + (Number(n) === 1 ? um : varios); }
function Via_erro_(e) { return String((e && e.message) || e || 'erro desconhecido'); }

// ------------------------------------------------------------
// ABAS, TRAVA E HISTÓRICO
// ------------------------------------------------------------
function Via_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('VIA_ABAS_OK_V3')) return; } catch (e) { cache = null; }
  Object.keys(VIA_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, VIA_COLUNAS[aba]);
    VIA_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    if (typeof CertCal_forcarColunaTexto_ === 'function') (VIA_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (typeof SGO_DATA !== 'undefined') { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } } catch (e) {}
  try { if (cache) cache.put('VIA_ABAS_OK_V3', '1', 21600); } catch (e) {}
}
function Via_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada|not found/i.test(Via_erro_(e))) return []; throw e; }
}
/** O que chama outro módulo com trava própria (avisos da gestão, notificações) roda depois de soltar esta trava. */
var VIA_TRAVA = { n: 0, depois: [] };
function Via_depois_(fn) { if (VIA_TRAVA.n > 0) VIA_TRAVA.depois.push(fn); else { try { fn(); } catch (e) { console.error('Depósito de viagem (depois): ' + Via_erro_(e)); } } }
function Via_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (e) { throw new Error('Não foi possível gravar agora: outra pessoa está gravando no SGO+ neste momento. Espere alguns segundos e toque de novo; nada foi alterado.'); }
  VIA_TRAVA.n++;
  var ok = false;
  try { var r = fn(); ok = true; return r; } finally {
    VIA_TRAVA.n--;
    try { SpreadsheetApp.flush(); } catch (e) {}
    try { lock.releaseLock(); } catch (e2) {}
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e3) {} }
    var fila = VIA_TRAVA.depois; VIA_TRAVA.depois = [];
    if (ok) fila.forEach(function (f) { try { f(); } catch (e4) { console.error('Depósito de viagem (depois da trava): ' + Via_erro_(e4)); } });
  }
}
function Via_historico_(entidade, id, acao, eu, extra) {
  var x = extra || {};
  try {
    SGO_DATA.insert(VIA_ABAS.HISTORICO, { ID: Via_id_(), ENTIDADE: entidade, ENTIDADE_ID: id, REVISAO: x.revisao === undefined ? '' : x.revisao, ACAO: acao,
      DE: Via_texto_(x.de, 300), PARA: Via_texto_(x.para, 300), TEXTO: Via_texto_(x.texto, 4000), POR_ID: Via_s_(eu && eu.id), POR_NOME: Via_s_(eu && eu.nome), EM: Via_agora_() });
  } catch (e) { console.error('Depósito de viagem, histórico: ' + Via_erro_(e)); }
}

// ------------------------------------------------------------
// PESSOAS E CAIXAS DE ACESSO
// ------------------------------------------------------------
var VIA_FORA = ['CLIENTE', 'REPRESENTADA', 'AUVO_SYNC'];
/** Equipe interna: { id: { id, login, nome, perfil, area, vinculo, ativo, email } } (contas de fora não entram). */
function Via_usuarios_() {
  var m = {};
  var linhas = [];
  try { linhas = Via_ler_(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { linhas = []; }
  linhas.forEach(function (u) {
    var perfil = Via_up_(u.PERFIL), id = Via_s_(u.ID);
    if (!id || VIA_FORA.indexOf(perfil) >= 0 || Via_s_(u.EXCLUIDO_EM)) return;
    m[id] = { id: id, login: Via_s_(u.USUARIO).toLowerCase(), nome: Via_s_(u.NOME) || Via_s_(u.USUARIO), perfil: perfil, area: Via_up_(u.AREA),
      vinculo: Via_up_(u.VINCULO_TRABALHO).replace(/\s+/g, ''), ativo: Via_up_(u.STATUS || 'ATIVO') === 'ATIVO', email: Via_s_(u.EMAIL).toLowerCase() };
  });
  return m;
}
/** Quem está na sessão. Contas de fora são recusadas com o caminho. */
function Via_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = Via_up_(s.perfil);
  if (VIA_FORA.indexOf(perfil) >= 0) throw new Error('O Depósito de viagem é da equipe interna da Metrolabs. Esta conta (' + (perfil === 'CLIENTE' ? 'cliente' : 'conta de fora da equipe') + ') não usa este módulo. Volte ao Início.');
  var u = Via_usuarios_()[Via_s_(s.userId)] || {};
  return { id: Via_s_(s.userId), login: Via_s_(s.usuario).toLowerCase(), nome: Via_s_(s.nome) || u.nome || Via_s_(s.usuario), perfil: perfil, area: u.area || '', sessao: s };
}
function Via_sessaoDe_(u) { return { userId: u.id, usuario: u.login, perfil: u.perfil, nome: u.nome }; }
/** A pessoa tem a caixa? (SGO_Poderes.js; sem o motor de caixas, ninguém tem, e a tela explica.) */
function Via_pode_(eu, codigo) {
  if (typeof SGO_pode_ !== 'function') return false;
  try { return !!SGO_pode_(eu.sessao || Via_sessaoDe_(eu), codigo); } catch (e) { console.error('Depósito de viagem, caixa ' + codigo + ': ' + Via_erro_(e)); return false; }
}
function Via_poderes_(eu) { var r = {}; VIA_PODERES.forEach(function (c) { r[c] = Via_pode_(eu, c); }); return r; }
function Via_nomeCaixa_(codigo) {
  try { if (typeof Poderes_poder_ === 'function') return Poderes_poder_(codigo).nome; } catch (e) {}
  return codigo;
}
/** Recusa por falta de caixa: o quê, por quê e o que fazer. */
function Via_exigir_(eu, codigo, acao, oQueFazer) {
  if (Via_pode_(eu, codigo)) return true;
  throw new Error('Não foi possível ' + acao + ': a sua conta não tem a permissão «' + Via_nomeCaixa_(codigo) + '». ' + (oQueFazer || 'Se for o caso, peça ao responsável pelo sistema para liberar esta caixa em Administração > Acessos.'));
}
/** Para a regra padrão da caixa VIAGEM_APROVAR (SGO_Poderes.js): a pessoa está na lista de aprovadores da política? */
function Via_ehAprovadorConfig_(eu) {
  if (!eu) return false;
  var lista = (Via_politica_().aprovadores || []).map(function (x) { return Via_s_(x).toLowerCase(); });
  return lista.indexOf(Via_s_(eu.id).toLowerCase()) >= 0 || (!!eu.login && lista.indexOf(Via_s_(eu.login).toLowerCase()) >= 0);
}
/**
 * Quem é CHAMADO para um papel (aviso, pendência, Caixa): quem tem a caixa pelo padrão do perfil ou por exceção gravada em
 * Acessos. O dono tem todas as caixas e pode agir em qualquer etapa, mas só é chamado quando o padrão também o inclui
 * (ex.: Diretoria; aprovador da política se estiver na lista; Financeiro, não).
 */
function Via_papel_(u, codigo) {
  var a = null;
  try { if (typeof Poderes_avaliar_ === 'function') a = Poderes_avaliar_(Poderes_eu_(Via_sessaoDe_(u)), Poderes_poder_(codigo)); } catch (e) { a = null; }
  if (!a) return Via_pode_(u, codigo);
  return !!a.valor && (a.origem !== 'dono' || !!a.padrao);
}
function Via_comPapel_(codigo, impedidos) {
  var us = Via_usuarios_();
  impedidos = impedidos || [];
  return Object.keys(us).filter(function (id) { return us[id].ativo && impedidos.indexOf(id) < 0 && Via_papel_(us[id], codigo); });
}
/** Aprovadores da gerência chamados (caixa VIAGEM_APROVAR), menos quem pediu e quem viaja. */
function Via_aprovadoresGerencia_(conflito) { return Via_comPapel_('VIAGEM_APROVAR', conflito); }
/** Diretoria chamada (caixa VIAGEM_APROVAR_DIRETORIA), menos os impedidos. */
function Via_aprovadoresDiretoria_(impedidos) { return Via_comPapel_('VIAGEM_APROVAR_DIRETORIA', impedidos); }
/**
 * 16/11/2026 (decisão do dono, confirmada): com APROVACAO_SO_DIRETORIA = SIM (padrão; Chaves e senhas > Regras do Financeiro),
 * toda aprovação de depósito de viagem é do dono do sistema ou da Diretoria, numa etapa só; a gerência (aprovador da política)
 * deixa de aprovar e as solicitações que aguardavam a gerência passam para a Diretoria. Separação de funções mantida: quem pede
 * ou viaja não aprova. A lista de aprovadores da política continua guardada e volta a valer com NAO.
 */
function Via_soDiretoria_() { return typeof SGO_aprovacaoSoDiretoria_ === 'function' ? SGO_aprovacaoSoDiretoria_() : false; }
function Via_ehDonoOuDiretoria_(u) { return typeof SGO_ehDonoOuDiretoria_ === 'function' ? SGO_ehDonoOuDiretoria_(u) : !!u && Via_up_(u.perfil) === 'DIRETORIA'; }
/** Dono e Diretoria ativos, menos os impedidos (quem pediu e quem viaja). */
function Via_aprovadoresSoDir_(impedidos) {
  var us = Via_usuarios_(); impedidos = impedidos || [];
  return Object.keys(us).filter(function (id) { return us[id].ativo && impedidos.indexOf(id) < 0 && Via_ehDonoOuDiretoria_(us[id]); });
}
var VIA_MOTIVO_SO_DIRETORIA = 'por decisão do dono, no começo só o dono e a Diretoria aprovam (Chaves e senhas > Regras do Financeiro)';
/** Financeiro chamado para a carga (caixa VIAGEM_DEPOSITAR). */
function Via_depositantes_() { return Via_comPapel_('VIAGEM_DEPOSITAR', []); }
function Via_nomes_(ids) { var us = Via_usuarios_(); return (ids || []).map(function (id) { return us[id] ? us[id].nome : id; }); }

// ------------------------------------------------------------
// POLÍTICA DE VIAGEM (versões; Diretoria)
// ------------------------------------------------------------
var VIA_POLITICA_MEMO = null;
function Via_politicaLimpa_(p) {
  p = p || {};
  var out = { aprovadores: [], limiteDiretoria: VIA_POLITICA_PADRAO.limiteDiretoria, urgenteDiasUteis: VIA_POLITICA_PADRAO.urgenteDiasUteis, tetos: {},
    prazoPrestacaoDiasUteis: VIA_POLITICA_PADRAO.prazoPrestacaoDiasUteis, limiteSemComprovante: null };
  (Array.isArray(p.aprovadores) ? p.aprovadores : VIA_POLITICA_PADRAO.aprovadores).forEach(function (a) { a = Via_s_(a); if (a && out.aprovadores.indexOf(a) < 0) out.aprovadores.push(a); });
  var lim = Via_num_(p.limiteDiretoria); if (lim !== null && lim > 0) out.limiteDiretoria = Via_r2_(lim);
  var urg = Via_num_(p.urgenteDiasUteis); if (urg !== null && urg >= 0 && urg <= 15 && Math.round(urg) === urg) out.urgenteDiasUteis = urg;
  VIA_CATEGORIAS.forEach(function (c) { var t = p.tetos && VIA_TETO_CATS.indexOf(c.cod) >= 0 ? Via_num_(p.tetos[c.cod]) : null; out.tetos[c.cod] = t !== null && t > 0 ? Via_r2_(t) : null; });
  var pz = Via_num_(p.prazoPrestacaoDiasUteis); if (pz !== null && pz >= 1 && pz <= VIA_PRAZO_PRESTACAO_MAX && Math.round(pz) === pz) out.prazoPrestacaoDiasUteis = pz;
  var sc = Via_num_(p.limiteSemComprovante); out.limiteSemComprovante = sc !== null && sc > 0 ? Via_r2_(sc) : null;
  return out;
}
/** Política em vigor: { versao (0 = padrão do sistema), aprovadores, limiteDiretoria, urgenteDiasUteis, tetos, em, por, motivo }. Nunca lança. */
function Via_politica_() {
  if (VIA_POLITICA_MEMO && Date.now() - VIA_POLITICA_MEMO.em < 5000) return VIA_POLITICA_MEMO.p;
  var p = Via_politicaLimpa_(VIA_POLITICA_PADRAO), versao = 0, em = '', por = '', motivo = 'Padrão do sistema (decisão do dono de 11/11/2026): aprovador matheusgodoi, Diretoria acima de R$ 5.000,00, urgente com menos de 2 dias úteis, tetos vazios.';
  try {
    var linhas = Via_ler_(VIA_ABAS.POLITICA).slice().sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
    if (linhas.length) {
      var ult = linhas[linhas.length - 1];
      p = Via_politicaLimpa_(Via_json_(ult.VALOR_JSON, {}));
      versao = Number(ult.VERSAO) || linhas.length; em = Via_br_(ult.EM); por = Via_s_(ult.POR_NOME); motivo = Via_s_(ult.MOTIVO);
    }
  } catch (e) { /* sem a aba: o padrão vale */ }
  p.versao = versao; p.em = em; p.por = por; p.motivo = motivo;
  VIA_POLITICA_MEMO = { em: Date.now(), p: p };
  return p;
}
function Via_politicaParaTela_(p) {
  var us = Via_usuarios_();
  var aprov = (p.aprovadores || []).map(function (a) {
    var id = Object.keys(us).filter(function (k) { return k === a || us[k].login === Via_s_(a).toLowerCase(); })[0];
    return { chave: a, id: id || '', nome: id ? us[id].nome : a + ' (não encontrado no cadastro)', ativo: !!(id && us[id].ativo) };
  });
  return { versao: p.versao, em: p.em, por: p.por, motivo: p.motivo, aprovadores: aprov, limiteDiretoria: p.limiteDiretoria, limiteTxt: Via_moeda_(p.limiteDiretoria),
    urgenteDiasUteis: p.urgenteDiasUteis, tetos: VIA_CATEGORIAS.filter(function (c) { return VIA_TETO_CATS.indexOf(c.cod) >= 0; }).map(function (c) { var t = p.tetos[c.cod]; return { cod: c.cod, nome: c.nome, rot: c.tetoRot, valor: t, valorTxt: t ? Via_moeda_(t) : '' }; }),
    semTetos: !VIA_CATEGORIAS.some(function (c) { return p.tetos[c.cod]; }), prazoPrestacaoDiasUteis: p.prazoPrestacaoDiasUteis, limiteSemComprovante: p.limiteSemComprovante,
    limiteSemComprovanteTxt: p.limiteSemComprovante ? Via_moeda_(p.limiteSemComprovante) : '' };
}
function Via_salvarPolitica_(eu, dados) {
  Via_exigir_(eu, 'VIAGEM_POLITICA', 'gravar a política de viagem', 'A política (aprovador, limite da Diretoria e tetos) é da Diretoria. Peça a mudança a ela.');
  var d = dados || {}, motivo = Via_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível gravar a política: escreva o motivo da mudança (10 letras ou mais). Ele fica no histórico de versões com o seu nome.');
  var p = d.politica || {}, us = Via_usuarios_();
  var aprov = (Array.isArray(p.aprovadores) ? p.aprovadores : []).map(Via_s_).filter(Boolean);
  if (!aprov.length) throw new Error('Não foi possível gravar a política: escolha pelo menos um aprovador. Sem aprovador, toda solicitação iria direto à Diretoria.');
  aprov.forEach(function (a) {
    var id = Object.keys(us).filter(function (k) { return k === a || us[k].login === a.toLowerCase(); })[0];
    if (!id || !us[id].ativo) throw new Error('Não foi possível gravar a política: o aprovador "' + a + '" não é uma conta ativa da equipe. Escolha de novo na lista.');
  });
  var lim = Via_num_(p.limiteDiretoria);
  if (lim === null || lim <= 0) throw new Error('Não foi possível gravar a política: o limite acima do qual a Diretoria também aprova precisa ser um valor em reais maior que zero (ex.: 5.000,00).');
  var urg = Via_num_(p.urgenteDiasUteis);
  if (urg === null || urg < 0 || urg > 15 || Math.round(urg) !== urg) throw new Error('Não foi possível gravar a política: a antecedência do urgente é um número inteiro de dias úteis, de 0 a 15 (padrão 2).');
  var tetos = {};
  VIA_CATEGORIAS.forEach(function (c) {
    if (VIA_TETO_CATS.indexOf(c.cod) < 0) { tetos[c.cod] = null; return; } // sem teto nesta categoria (decisão do dono, 11/11/2026): o que vier é ignorado
    var bruto = p.tetos ? p.tetos[c.cod] : null, t = Via_num_(bruto);
    if (Via_s_(bruto) !== '' && (t === null || t <= 0)) throw new Error('Não foi possível gravar a política: o teto de ' + c.nome + ' (' + c.tetoRot + ') precisa ser um valor em reais maior que zero, ou ficar vazio (sem teto).');
    tetos[c.cod] = t !== null && t > 0 ? Via_r2_(t) : null;
  });
  // E2: prazo da prestação e gasto sem comprovante (ausentes = padrão: 3 dias úteis; sem comprovante não aceito)
  var pzBruto = p.prazoPrestacaoDiasUteis, pz = Via_s_(pzBruto) === '' ? VIA_POLITICA_PADRAO.prazoPrestacaoDiasUteis : Via_num_(pzBruto);
  if (pz === null || pz < 1 || pz > VIA_PRAZO_PRESTACAO_MAX || Math.round(pz) !== pz) throw new Error('Não foi possível gravar a política: o prazo da prestação de contas é um número inteiro de dias úteis depois da volta, de 1 a ' + VIA_PRAZO_PRESTACAO_MAX + ' (padrão 3).');
  var scBruto = p.limiteSemComprovante, sc = Via_num_(scBruto);
  if (Via_s_(scBruto) !== '' && (sc === null || sc <= 0)) throw new Error('Não foi possível gravar a política: o limite de gasto sem comprovante por viagem precisa ser um valor em reais maior que zero, ou ficar vazio (vazio = gasto sem comprovante não é aceito).');
  var nova = { aprovadores: aprov, limiteDiretoria: Via_r2_(lim), urgenteDiasUteis: urg, tetos: tetos, prazoPrestacaoDiasUteis: pz, limiteSemComprovante: sc !== null && sc > 0 ? Via_r2_(sc) : null };
  return Via_comTrava_(function () {
    Via_garantirAbas_();
    var atual = Via_politica_(), versao = Math.max(atual.versao || 0, Via_ler_(VIA_ABAS.POLITICA).reduce(function (m, l) { return Math.max(m, Number(l.VERSAO) || 0); }, 0)) + 1;
    SGO_DATA.insert(VIA_ABAS.POLITICA, { ID: Via_id_(), VERSAO: versao, VALOR_JSON: JSON.stringify(nova), MOTIVO: motivo, POR_ID: eu.id, POR_NOME: eu.nome, EM: Via_agora_() });
    Via_historico_('POLITICA', 'v' + versao, 'POLITICA_GRAVADA', eu, { texto: motivo + ' | ' + JSON.stringify(nova) });
    VIA_POLITICA_MEMO = null;
    try { if (typeof Poderes_memoLimpar_ === 'function') Poderes_memoLimpar_(); } catch (e) {}
    return { politica: Via_politicaParaTela_(Via_politica_()), message: 'Política gravada (versão ' + versao + '). As próximas solicitações enviadas já são conferidas por ela; as já enviadas guardam a versão com que foram conferidas.' };
  });
}
function Via_versoesPolitica_() {
  return Via_ler_(VIA_ABAS.POLITICA).slice().sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); }).map(function (l) {
    var v = Via_politicaLimpa_(Via_json_(l.VALOR_JSON, {}));
    return { versao: Number(l.VERSAO) || 0, em: Via_br_(l.EM), por: Via_s_(l.POR_NOME), motivo: Via_s_(l.MOTIVO), limiteTxt: Via_moeda_(v.limiteDiretoria), urgenteDiasUteis: v.urgenteDiasUteis,
      aprovadores: v.aprovadores.join(', '), tetos: VIA_CATEGORIAS.filter(function (c) { return v.tetos[c.cod]; }).map(function (c) { return c.nome + ' ' + Via_moeda_(v.tetos[c.cod]); }).join('; ') || 'sem tetos',
      prazoPrestacaoDiasUteis: v.prazoPrestacaoDiasUteis, semComprovante: v.limiteSemComprovante ? 'sem comprovante até ' + Via_moeda_(v.limiteSemComprovante) + ' por viagem' : 'sem comprovante não aceito' };
  });
}

// ------------------------------------------------------------
// CENTROS DE CUSTO (CAD_CENTROS_CUSTO; Diretoria e Financeiro)
// ------------------------------------------------------------
function Via_areas_() {
  var l = [];
  try { Via_ler_('CAD_AREAS').forEach(function (a) { var c = Via_up_(a.CODIGO); if (c && Via_up_(a.ATIVO || 'SIM') !== 'NAO') l.push([c, Via_s_(a.NOME) || c]); }); } catch (e) { l = []; }
  return l.length ? l : VIA_AREAS_RESERVA.slice();
}
/** Lista inicial (só quando o cadastro está vazio): unidade + área de CAD_AREAS, mais Frota e Sede de cada unidade. Chamar dentro da trava. */
function Via_semearCentros_(eu) {
  if (Via_ler_(VIA_ABAS.CENTROS).length) return 0;
  var agora = Via_agora_(), n = 0, quem = eu ? eu.nome : 'sistema';
  VIA_UNIDADES.forEach(function (un) {
    Via_areas_().concat([['FROTA', 'Frota'], ['SEDE', 'Sede (manutenção e limpeza)']]).forEach(function (ar) {
      SGO_DATA.insert(VIA_ABAS.CENTROS, { ID: Via_id_(), CODIGO: un[0] + '-' + ar[0], NOME: un[1] + ' · ' + ar[1], UNIDADE: un[0], AREA: ar[0], RESPONSAVEL_ID: '', RESPONSAVEL_NOME: '',
        CODIGO_CAJU: '', CODIGO_OMIE: '', ATIVO: 'SIM', CRIADO_EM: agora, CRIADO_POR: quem, ATUALIZADO_EM: agora, ATUALIZADO_POR: quem });
      n++;
    });
  });
  Via_historico_('CENTRO', 'LISTA_INICIAL', 'CENTROS_LISTA_INICIAL', eu || { id: '', nome: 'sistema' }, { texto: n + ' centros de custo da lista inicial (unidade + área, Frota e Sede). Confirme a lista com o Financeiro.' });
  return n;
}
/** Última conferência feita por uma pessoa (criar, alterar ou marcar como conferido) de cada centro: { id: { em, por } }. */
function Via_centrosConferidos_() {
  var m = {};
  Via_ler_(VIA_ABAS.HISTORICO).forEach(function (h) {
    if (Via_s_(h.ENTIDADE) !== 'CENTRO' || ['CENTRO_CONFERIDO', 'CENTRO_ALTERADO', 'CENTRO_CRIADO'].indexOf(Via_up_(h.ACAO)) < 0 || !Via_s_(h.POR_ID)) return;
    var id = Via_s_(h.ENTIDADE_ID), em = Via_s_(h.EM);
    if (!m[id] || m[id].emIso < em) m[id] = { emIso: em, em: Via_br_(em), por: Via_s_(h.POR_NOME), acao: Via_up_(h.ACAO) };
  });
  return m;
}
/** comConferencia: inclui quem conferiu cada centro (lê o histórico; só a tela dos centros pede). */
function Via_centros_(soAtivos, comConferencia) {
  var l = Via_ler_(VIA_ABAS.CENTROS);
  if (!l.length) {
    // dentro de uma gravação deste módulo a trava já está com esta chamada (pegar de novo esperaria por si mesma)
    try { if (VIA_TRAVA.n > 0) { Via_garantirAbas_(); Via_semearCentros_(null); } else Via_comTrava_(function () { Via_garantirAbas_(); Via_semearCentros_(null); }); }
    catch (e) { console.error('Depósito de viagem, lista inicial de centros: ' + Via_erro_(e)); }
    l = Via_ler_(VIA_ABAS.CENTROS);
  }
  var conf = comConferencia ? Via_centrosConferidos_() : {};
  return l.filter(function (c) { return !soAtivos || Via_up_(c.ATIVO || 'SIM') === 'SIM'; }).map(function (c) {
    var k = conf[Via_s_(c.ID)] || null;
    return { conferido: !!k, conferidoEm: k ? k.em : '', conferidoPor: k ? k.por : '', id: Via_s_(c.ID), codigo: Via_up_(c.CODIGO), nome: Via_s_(c.NOME), unidade: Via_up_(c.UNIDADE), area: Via_up_(c.AREA), responsavelId: Via_s_(c.RESPONSAVEL_ID),
      responsavelNome: Via_s_(c.RESPONSAVEL_NOME), codigoCaju: Via_s_(c.CODIGO_CAJU), codigoOmie: Via_s_(c.CODIGO_OMIE), ativo: Via_up_(c.ATIVO || 'SIM') === 'SIM',
      atualizadoEm: Via_br_(c.ATUALIZADO_EM), atualizadoPor: Via_s_(c.ATUALIZADO_POR) };
  }).sort(function (a, b) { return a.codigo.localeCompare(b.codigo); });
}
function Via_salvarCentro_(eu, d) {
  Via_exigir_(eu, 'VIAGEM_CENTRO_CUSTO', 'alterar os centros de custo', 'O cadastro de centros de custo é mantido pela Diretoria e pelo Financeiro. Peça a mudança a eles.');
  d = d || {};
  var motivo = Via_texto_(d.motivo, 300);
  if (motivo.length < 5) throw new Error('Não foi possível gravar o centro de custo: escreva o motivo (5 letras ou mais). Ele fica no histórico.');
  var nome = Via_texto_(d.nome, 120), codigo = Via_up_(d.codigo).replace(/\s+/g, '-');
  if (nome.length < 3) throw new Error('Não foi possível gravar o centro de custo: escreva o nome (ex.: "Goiânia · Técnica/Campo").');
  return Via_comTrava_(function () {
    Via_garantirAbas_();
    var todos = Via_ler_(VIA_ABAS.CENTROS), agora = Via_agora_(), us = Via_usuarios_();
    var resp = Via_s_(d.responsavelId);
    if (resp && !us[resp]) throw new Error('Não foi possível gravar: o responsável escolhido não está no cadastro da equipe. Escolha de novo ou deixe sem responsável.');
    var campos = { NOME: nome, UNIDADE: Via_up_(d.unidade).slice(0, 10), AREA: Via_up_(d.area).slice(0, 30), RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: resp ? us[resp].nome : '',
      CODIGO_CAJU: Via_texto_(d.codigoCaju, 40), CODIGO_OMIE: Via_texto_(d.codigoOmie, 40), ATIVO: d.ativo === false || Via_up_(d.ativo) === 'NAO' ? 'NAO' : 'SIM', ATUALIZADO_EM: agora, ATUALIZADO_POR: eu.nome };
    if (Via_s_(d.id)) {
      var c = todos.filter(function (x) { return Via_s_(x.ID) === Via_s_(d.id); })[0];
      if (!c) throw new Error('Não foi possível gravar: o centro de custo não foi encontrado. Atualize a tela e tente de novo.');
      SGO_DATA.update(VIA_ABAS.CENTROS, c.ID, campos);
      Via_historico_('CENTRO', c.ID, 'CENTRO_ALTERADO', eu, { de: Via_s_(c.NOME) + ' / ' + Via_s_(c.ATIVO), para: nome + ' / ' + campos.ATIVO, texto: motivo });
      return { message: 'Centro de custo ' + Via_up_(c.CODIGO) + ' gravado. O código não muda (as solicitações antigas continuam ligadas a ele).' };
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(codigo)) throw new Error('Não foi possível criar o centro de custo: o código usa letras, números e hífen, de 2 a 24 caracteres (ex.: GO-TECNICA).');
    if (todos.some(function (x) { return Via_up_(x.CODIGO) === codigo; })) throw new Error('Não foi possível criar: já existe o centro de custo ' + codigo + '. Use outro código ou altere o existente.');
    var id = Via_id_();
    SGO_DATA.insert(VIA_ABAS.CENTROS, Object.assign({ ID: id, CODIGO: codigo, CRIADO_EM: agora, CRIADO_POR: eu.nome }, campos));
    Via_historico_('CENTRO', id, 'CENTRO_CRIADO', eu, { para: codigo + ' ' + nome, texto: motivo });
    return { message: 'Centro de custo ' + codigo + ' criado.' };
  });
}

/** Números da conferência inicial dos centros (tela "Centros de custo"). */
function Via_centrosResumo_(lista) {
  var ativos = lista.filter(function (c) { return c.ativo; });
  return { total: lista.length, ativos: ativos.length, inativos: lista.length - ativos.length, conferidos: lista.filter(function (c) { return c.conferido; }).length,
    semConferir: lista.filter(function (c) { return !c.conferido; }).length, ativosComCaju: ativos.filter(function (c) { return !!c.codigoCaju; }).length };
}
/**
 * Conferência guiada (11/11/2026): marca o centro como conferido pelo Financeiro ou pela Diretoria e, se veio o código usado
 * no Caju, grava junto. d: { id, codigoCaju (opcional) }. Fica no histórico com o nome de quem conferiu.
 */
function Via_conferirCentro_(eu, d) {
  Via_exigir_(eu, 'VIAGEM_CENTRO_CUSTO', 'conferir o centro de custo', 'A conferência dos centros de custo é do Financeiro e da Diretoria.');
  d = d || {};
  return Via_comTrava_(function () {
    Via_garantirAbas_();
    var c = Via_ler_(VIA_ABAS.CENTROS).filter(function (x) { return Via_s_(x.ID) === Via_s_(d.id); })[0];
    if (!c) throw new Error('Não foi possível conferir: o centro de custo não foi encontrado. Atualize a tela e tente de novo.');
    var caju = d.codigoCaju === undefined || d.codigoCaju === null ? null : Via_texto_(d.codigoCaju, 40), texto = 'Conferido na conferência guiada.';
    if (caju !== null && caju !== Via_s_(c.CODIGO_CAJU)) {
      SGO_DATA.update(VIA_ABAS.CENTROS, c.ID, { CODIGO_CAJU: caju, ATUALIZADO_EM: Via_agora_(), ATUALIZADO_POR: eu.nome });
      texto += ' Código no Caju: ' + (Via_s_(c.CODIGO_CAJU) || '(vazio)') + ' -> ' + (caju || '(vazio)') + '.';
    }
    Via_historico_('CENTRO', c.ID, 'CENTRO_CONFERIDO', eu, { para: Via_up_(c.CODIGO), texto: texto });
    return { message: 'Centro de custo ' + Via_up_(c.CODIGO) + ' marcado como conferido' + (caju ? ' (código no Caju: ' + caju + ')' : '') + '.' };
  });
}

// ------------------------------------------------------------
// CONTEÚDO DA SOLICITAÇÃO E CÁLCULO
// ------------------------------------------------------------
/** Linha do orçamento como a tela manda -> linha limpa { id, categoria, descricao, q1, q2, unitario, justificativa, justificativaTeto }. */
function Via_linhaLimpa_(l) {
  l = l || {};
  var cat = VIA_CAT[Via_up_(l.categoria)];
  if (!cat) throw new Error('Não foi possível ler o orçamento: há uma linha sem categoria conhecida. Atualize a tela (F5) e monte a linha de novo.');
  var id = Via_s_(l.id);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) id = 'L' + Via_id_().replace(/-/g, '').slice(0, 12);
  var num = function (v) { var n = Via_num_(v); return n === null ? null : n; };
  return { id: id, categoria: cat.cod, descricao: Via_texto_(l.descricao, 300), q1: num(l.q1), q2: cat.q2 ? num(l.q2) : null, unitario: num(l.unitario),
    justificativa: cat.justificativa ? Via_texto_(l.justificativa, 1000) : '', justificativaTeto: Via_texto_(l.justificativaTeto, 1000) };
}
/** Valor e base de cálculo de uma linha; erros = o que impede o valor. */
function Via_calcLinha_(l, pol) {
  var cat = VIA_CAT[l.categoria], erros = [];
  var conf = function (q, v) {
    if (v === null || v === undefined) { erros.push('preencha "' + q.rot + '"'); return; }
    if (!(v > 0)) { erros.push('"' + q.rot + '" precisa ser maior que zero'); return; }
    if (q.inteiro && Math.round(v) !== v) erros.push('"' + q.rot + '" é um número inteiro');
    if (q.meio && Math.round(v * 2) !== v * 2) erros.push('"' + q.rot + '" vai de meio em meio (ex.: 2,5)');
  };
  conf(cat.q1, l.q1);
  if (cat.q2) conf(cat.q2, l.q2);
  if (l.unitario === null || l.unitario === undefined) erros.push('preencha "' + cat.un + '"');
  else if (!(l.unitario > 0)) erros.push('"' + cat.un + '" precisa ser maior que zero');
  if (cat.descObrig && Via_s_(l.descricao).length < 3) erros.push('preencha "' + cat.desc + '"');
  if (cat.justificativa && Via_s_(l.justificativa).length < VIA_JUSTIFICATIVA_MIN) erros.push('escreva a justificativa (' + VIA_JUSTIFICATIVA_MIN + ' letras ou mais)');
  var valor = 0, base = '';
  if (!erros.length) {
    var bruto = cat.q2 && cat.q2.divisor ? l.q1 / l.q2 * l.unitario : l.q1 * (cat.q2 ? l.q2 : 1) * l.unitario;
    valor = Via_r2_(bruto);
    base = Via_plural_(l.q1, cat.q1.un[0], cat.q1.un[1]) + (cat.q2 ? (cat.q2.divisor ? ' ÷ ' + Via_qtd_(l.q2) + ' km/L' : ' × ' + Via_plural_(l.q2, cat.q2.un[0], cat.q2.un[1])) : '') +
      ' × ' + Via_moeda_(l.unitario) + (cat.cod === 'COMBUSTIVEL' ? ' por litro' : '');
  }
  var teto = pol && pol.tetos && VIA_TETO_CATS.indexOf(cat.cod) >= 0 ? pol.tetos[cat.cod] : null;
  var acima = !!(teto && l.unitario !== null && l.unitario > teto + 0.0001);
  return { valor: valor, base: base, erros: erros, teto: teto, acimaTeto: acima };
}
/** Conteúdo da tela -> conteúdo limpo (o que entra na revisão). O total nunca vem da tela. */
function Via_conteudoLimpo_(d) {
  d = d || {};
  var equipe = [], vistos = {};
  (Array.isArray(d.equipe) ? d.equipe : []).forEach(function (p) {
    var id = Via_s_(p && p.id);
    if (!id || vistos[id]) return;
    vistos[id] = true;
    var f = Via_up_(p.funcao);
    equipe.push({ id: id, funcao: VIA_FUNCOES[f] ? f : 'OUTRO' });
  });
  var na = {};
  var naIn = d.naoSeAplica && typeof d.naoSeAplica === 'object' ? d.naoSeAplica : {};
  Object.keys(naIn).forEach(function (k) { var c = VIA_CAT[Via_up_(k)]; if (c && !c.opcional && Via_s_(naIn[k])) na[c.cod] = Via_texto_(naIn[k], 300); });
  var linhas = (Array.isArray(d.linhas) ? d.linhas : []).slice(0, 80).map(Via_linhaLimpa_);
  var vt = Via_up_(d.vinculoTipo), vc = Via_up_(d.veiculoTipo);
  return {
    centroCustoId: Via_s_(d.centroCustoId), vinculoTipo: VIA_VINCULOS[vt] ? vt : '', clienteId: Via_s_(d.clienteId), vinculoRef: Via_texto_(d.vinculoRef, 60),
    vinculoJustificativa: Via_texto_(d.vinculoJustificativa, 600), objetivo: Via_texto_(d.objetivo, 1000), destinoCidade: Via_texto_(d.destinoCidade, 80), destinoUf: Via_up_(d.destinoUf).slice(0, 2),
    saidaEm: Via_iso_(d.saidaEm), chegadaEm: Via_iso_(d.chegadaEm), equipe: equipe, responsavelId: Via_s_(d.responsavelId),
    veiculoTipo: VIA_VEICULOS[vc] ? vc : '', veiculoId: vc === 'FROTA' ? Via_s_(d.veiculoId) : '', veiculoJustificativa: Via_texto_(d.veiculoJustificativa, 600),
    roteiro: Via_texto_(d.roteiro, 2000), linhas: linhas, naoSeAplica: na
  };
}
function Via_conteudoDaLinha_(r) {
  return { centroCustoId: Via_s_(r.CENTRO_CUSTO_ID), vinculoTipo: Via_up_(r.VINCULO_TIPO), clienteId: Via_s_(r.CLIENTE_ID), vinculoRef: Via_s_(r.VINCULO_REF),
    vinculoJustificativa: Via_s_(r.VINCULO_JUSTIFICATIVA), objetivo: Via_s_(r.OBJETIVO), destinoCidade: Via_s_(r.DESTINO_CIDADE), destinoUf: Via_up_(r.DESTINO_UF),
    saidaEm: Via_iso_(r.SAIDA_EM), chegadaEm: Via_iso_(r.CHEGADA_EM), equipe: Via_json_(r.EQUIPE_JSON, []), responsavelId: Via_s_(r.RESPONSAVEL_ID),
    veiculoTipo: Via_up_(r.VEICULO_TIPO), veiculoId: Via_s_(r.VEICULO_ID), veiculoJustificativa: Via_s_(r.VEICULO_JUSTIFICATIVA), roteiro: Via_s_(r.ROTEIRO),
    linhas: Via_json_(r.LINHAS_JSON, []), naoSeAplica: Via_json_(r.NAO_SE_APLICA_JSON, {}) };
}
/** Total pela soma das linhas e o cálculo de cada uma. */
function Via_calcular_(c, pol) {
  var total = 0, linhas = c.linhas.map(function (l) {
    var k = Via_calcLinha_(l, pol);
    total += Via_cent_(k.valor);
    return Object.assign({}, l, { valor: k.valor, base: k.base, erros: k.erros, teto: k.teto, acimaTeto: k.acimaTeto });
  });
  return { linhas: linhas, total: total / 100 };
}
/** Comprovantes (carga, gastos da prestação e acerto) não são orçamento: ficam fora da marca da aprovação e da tabela do orçamento. */
var VIA_ANEXOS_COMPROVANTE = ['COMPROVANTE_CARGA', 'COMPROVANTE_GASTO', 'COMPROVANTE_ACERTO'];
function Via_ehAnexoOrcamento_(a) { return VIA_ANEXOS_COMPROVANTE.indexOf(Via_up_(a.TIPO)) < 0; }
function Via_anexosAtivos_(solId) {
  return Via_ler_(VIA_ABAS.ANEXOS).filter(function (a) { return Via_s_(a.SOLICITACAO_ID) === Via_s_(solId) && !Via_s_(a.REMOVIDO_EM) && Via_ehAnexoOrcamento_(a); });
}
/** Marca do conteúdo: tudo o que a aprovação cobre (dados, linhas e os anexos de cada linha). */
function Via_hash_(c, anexos) {
  var ax = (anexos || []).map(function (a) { return Via_s_(a.LINHA_ID) + ':' + Via_s_(a.SHA || a.ID); }).sort();
  var cc = JSON.parse(JSON.stringify(c));
  cc.equipe = (cc.equipe || []).slice().sort(function (a, b) { return a.id.localeCompare(b.id); });
  return Via_marca_(JSON.stringify({ c: cc, a: ax }));
}

// ------------------------------------------------------------
// CONFERÊNCIA (o impossível recusa; o resto vira apontamento)
// ------------------------------------------------------------
/**
 * { faltas: [texto] (impedem o envio), apontamentos: [{ codigo, tipo: 'ATENCAO'|'INFO', texto }], exigeDiretoria, motivosDiretoria: [],
 *   urgente, diasUteis, total, linhas (com o cálculo), etapa: 'GERENCIA'|'DIRETORIA', gerencia: [ids], diretoria: [ids] }
 */
function Via_conferir_(row, c, pol, opcoes) {
  opcoes = opcoes || {};
  var faltas = [], ap = [], motivosDir = [], us = Via_usuarios_(), anexos = opcoes.anexos || (row ? Via_anexosAtivos_(row.ID) : []);
  var calc = Via_calcular_(c, pol);
  var falta = function (t) { faltas.push(t); };
  var apt = function (codigo, texto, tipo) { ap.push({ codigo: codigo, tipo: tipo || 'ATENCAO', texto: texto }); };
  // dados da viagem
  var centro = c.centroCustoId ? Via_centros_(false).filter(function (x) { return x.id === c.centroCustoId; })[0] : null;
  if (!centro) falta('Escolha o centro de custo (obrigatório para a conciliação do Financeiro).');
  else if (!centro.ativo) falta('O centro de custo ' + centro.codigo + ' está inativo. Escolha outro ou peça ao Financeiro para reativá-lo.');
  if (!c.vinculoTipo) falta('Diga a que a viagem está ligada: cliente, proposta, ordem de serviço ou viagem interna.');
  else if (c.vinculoTipo === 'CLIENTE' && !c.clienteId) falta('Escolha o cliente da viagem.');
  else if ((c.vinculoTipo === 'PROPOSTA' || c.vinculoTipo === 'OS') && Via_s_(c.vinculoRef).length < 3) falta('Escreva o número da ' + (c.vinculoTipo === 'OS' ? 'ordem de serviço' : 'proposta') + '.');
  else if (c.vinculoTipo === 'INTERNA' && Via_s_(c.vinculoJustificativa).length < VIA_JUSTIFICATIVA_MIN) falta('Viagem interna: escreva a justificativa (' + VIA_JUSTIFICATIVA_MIN + ' letras ou mais).');
  if (c.clienteId && !Via_clienteNome_(c.clienteId)) falta('O cliente escolhido não está no cadastro de clientes. Escolha de novo.');
  if (Via_s_(c.objetivo).length < 10) falta('Escreva o objetivo da viagem (10 letras ou mais).');
  if (Via_s_(c.destinoCidade).length < 2) falta('Escreva a cidade de destino.');
  if (!/^[A-Z]{2}$/.test(c.destinoUf)) falta('Escolha a UF do destino.');
  var saida = c.saidaEm, chegada = c.chegadaEm, temDatas = /T\d{2}:\d{2}$/.test(saida) && /T\d{2}:\d{2}$/.test(chegada);
  var dias = null, noites = null;
  if (!temDatas) falta('Informe a data e a hora de saída e de chegada.');
  else if (chegada <= saida) falta('A chegada precisa ser depois da saída.');
  else {
    noites = Via_diasEntre_(saida.slice(0, 10), chegada.slice(0, 10));
    dias = noites + 1;
    if (noites > 60) falta('A viagem passa de 60 dias. Confira as datas; viagem longa assim pede uma solicitação por período.');
    if (saida.slice(0, 10) < Via_hoje_()) apt('DEPOIS_DO_INICIO', 'Solicitação montada depois do início da viagem (saída em ' + Via_br_(saida) + ').');
  }
  if (!c.equipe.length) falta('Inclua as pessoas que viajam (equipe).');
  c.equipe.forEach(function (p) {
    var u = us[p.id];
    if (!u) falta('Uma pessoa da equipe não está no cadastro. Tire e escolha de novo.');
    else if (!u.ativo) falta(u.nome + ' está com a conta inativa. Tire da equipe ou peça a reativação.');
  });
  if (!c.responsavelId) falta('Escolha o responsável pelo dinheiro (quem recebe a carga no cartão Caju e presta contas).');
  else if (!c.equipe.some(function (p) { return p.id === c.responsavelId; })) falta('O responsável pelo dinheiro precisa estar na equipe da viagem.');
  // E2 (trava): quem tem prestação de contas vencida não recebe dinheiro de viagem nova até prestar contas ou a Diretoria liberar
  if (c.responsavelId && typeof Via_travaPrestacao_ === 'function') { var trava = Via_travaPrestacao_(c.responsavelId, row ? Via_s_(row.ID) : ''); if (trava) falta(trava.texto); }
  if (!c.veiculoTipo) falta('Diga como a equipe vai: veículo da Frota, veículo próprio, transporte coletivo ou sem veículo.');
  else if (c.veiculoTipo === 'FROTA' && !c.veiculoId) falta('Escolha o veículo da Frota.');
  else if (c.veiculoTipo === 'PROPRIO') {
    if (Via_s_(c.veiculoJustificativa).length < VIA_JUSTIFICATIVA_MIN) falta('Veículo próprio: escreva por que (' + VIA_JUSTIFICATIVA_MIN + ' letras ou mais) e quem autorizou.');
    else apt('VEICULO_PROPRIO', 'Veículo próprio: o reembolso por km tem regras próprias e precisa de autorização prévia (justificativa: ' + Via_texto_(c.veiculoJustificativa, 200) + ').');
  }
  if (Via_s_(c.roteiro).length < 5) falta('Descreva o roteiro: os trechos e o meio de transporte de cada um.');
  // orçamento
  var porCat = {};
  calc.linhas.forEach(function (l) { (porCat[l.categoria] = porCat[l.categoria] || []).push(l); });
  VIA_CATEGORIAS.forEach(function (cat) {
    var ls = porCat[cat.cod] || [], na = Via_s_(c.naoSeAplica[cat.cod]);
    if (!cat.opcional) {
      if (!ls.length && na.length < 5) falta(cat.nome + ': inclua a linha ou marque "Não se aplica" com o motivo (5 letras ou mais).');
      if (ls.length && na) falta(cat.nome + ': há linha e também "Não se aplica". Tire as linhas ou desmarque "Não se aplica".');
    }
    ls.forEach(function (l, i) {
      var rot = cat.nome + (ls.length > 1 ? ' (linha ' + (i + 1) + ')' : '');
      l.erros.forEach(function (e) { falta(rot + ': ' + e + '.'); });
      if (cat.anexo && !anexos.some(function (a) { return Via_s_(a.LINHA_ID) === l.id; })) falta(rot + ': anexe o orçamento ou o print (' + (cat.cod === 'HOSPEDAGEM' ? 'do hotel, com a diária' : cat.cod === 'PASSAGENS' ? 'da cotação da passagem' : 'do gasto') + ').');
      if (l.acimaTeto) {
        if (Via_s_(l.justificativaTeto).length < VIA_JUSTIFICATIVA_MIN) falta(rot + ': ' + Via_moeda_(l.unitario) + ' passa do teto da política (' + Via_moeda_(l.teto) + ' ' + cat.tetoRot + '). Escreva a justificativa do valor acima do teto (' + VIA_JUSTIFICATIVA_MIN + ' letras ou mais) ou ajuste o valor.');
        else { apt('ACIMA_TETO', rot + ': ' + Via_moeda_(l.unitario) + ' acima do teto de ' + Via_moeda_(l.teto) + ' ' + cat.tetoRot + '. Justificativa: ' + Via_texto_(l.justificativaTeto, 300)); motivosDir.push(rot + ' acima do teto da política'); }
      }
      if (noites !== null && cat.cod === 'HOSPEDAGEM' && l.q2 > noites && !l.erros.length) apt('NOITES', rot + ': ' + Via_plural_(l.q2, 'noite', 'noites') + ' de hotel numa viagem de ' + Via_plural_(noites, 'noite', 'noites') + '.');
      if (dias !== null && cat.cod === 'ALIMENTACAO' && l.q2 > dias && !l.erros.length) apt('DIAS', rot + ': ' + Via_plural_(l.q2, 'dia', 'dias') + ' de alimentação numa viagem de ' + Via_plural_(dias, 'dia', 'dias') + '.');
    });
  });
  if (!(calc.total > 0) && !faltas.length) falta('O total da viagem está zerado. Sem gasto, não há depósito a pedir.');
  if (!VIA_CATEGORIAS.some(function (k) { return pol.tetos[k.cod]; })) apt('SEM_TETOS', 'A política de viagem ainda não tem tetos preenchidos: os valores não foram conferidos contra teto (versão ' + pol.versao + ' da política).', 'INFO');
  // sobreposição: a mesma pessoa em outra viagem nas mesmas datas
  if (temDatas && chegada > saida) {
    var ids = c.equipe.map(function (p) { return p.id; });
    Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (o) {
      if (row && Via_s_(o.ID) === Via_s_(row.ID)) return;
      if (VIA_ATIVAS.indexOf(Via_up_(o.SITUACAO)) < 0) return;
      var os = Via_iso_(o.SAIDA_EM), oc = Via_iso_(o.CHEGADA_EM);
      if (!os || !oc || !(saida < oc && os < chegada)) return;
      var comuns = Via_json_(o.EQUIPE_JSON, []).map(function (p) { return p.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
      if (comuns.length) falta(Via_nomes_(comuns).join(', ') + (comuns.length > 1 ? ' já estão' : ' já está') + ' na viagem ' + Via_s_(o.NUMERO) + ' (' + Via_br_(os) + ' a ' + Via_br_(oc) + ', ' + (VIA_SITUACOES[Via_up_(o.SITUACAO)] || o.SITUACAO) + '). A mesma pessoa não viaja em duas solicitações nas mesmas datas: ajuste as datas ou a equipe, ou cancele a outra.');
    });
  }
  // urgência e quem aprova
  var diasUteis = temDatas ? Via_diasUteisAte_(saida.slice(0, 10)) : null;
  var urgente = diasUteis !== null && diasUteis < pol.urgenteDiasUteis;
  if (urgente) apt('URGENTE', 'Urgente: a viagem começa ' + (diasUteis === 0 ? 'hoje ou já começou' : 'em ' + Via_plural_(diasUteis, 'dia útil', 'dias úteis')) + ' (a política pede ' + Via_plural_(pol.urgenteDiasUteis, 'dia útil', 'dias úteis') + ' de antecedência). O aviso a quem aprova sai na hora, a qualquer horário.');
  var solicitanteId = row ? Via_s_(row.SOLICITANTE_ID) : Via_s_(opcoes.solicitanteId);
  var conflito = [solicitanteId].concat(c.equipe.map(function (p) { return p.id; })).filter(Boolean);
  var soDir = Via_soDiretoria_();
  var gerencia = soDir ? [] : Via_aprovadoresGerencia_(conflito);
  if (soDir) motivosDir.unshift(VIA_MOTIVO_SO_DIRETORIA);
  else if (!gerencia.length) {
    var aprovConfig = Object.keys(us).filter(function (id) { return Via_ehAprovadorConfig_(us[id]); });
    var impedido = aprovConfig.filter(function (id) { return conflito.indexOf(id) >= 0; });
    motivosDir.unshift(impedido.length ? Via_nomes_(impedido).join(', ') + (impedido.indexOf(solicitanteId) >= 0 ? ' pediu' : ' viaja') + ' (ninguém aprova a própria despesa)' : 'nenhum aprovador da política disponível');
  }
  if (calc.total > pol.limiteDiretoria + 0.004) motivosDir.push('total de ' + Via_moeda_(calc.total) + ' acima do limite da política (' + Via_moeda_(pol.limiteDiretoria) + ')');
  var exigeDir = motivosDir.length > 0;
  var diretoria = exigeDir ? (soDir ? Via_aprovadoresSoDir_(conflito) : Via_aprovadoresDiretoria_(conflito)) : [];
  if (exigeDir) apt('DIRETORIA', 'Vai também à Diretoria: ' + motivosDir.join('; ') + '.');
  if (exigeDir && !diretoria.length) falta('Esta solicitação precisa da Diretoria (' + motivosDir.join('; ') + '), mas não há ninguém da Diretoria que possa aprovar (quem pediu e quem viaja não aprovam). Fale com a Diretoria antes de enviar.');
  return { faltas: faltas, apontamentos: ap, exigeDiretoria: exigeDir, motivosDiretoria: motivosDir, urgente: urgente, diasUteis: diasUteis, dias: dias, noites: noites,
    total: calc.total, linhas: calc.linhas, etapa: gerencia.length ? 'GERENCIA' : 'DIRETORIA', gerencia: gerencia, diretoria: diretoria, centro: centro };
}
function Via_clienteNome_(id) {
  if (!id) return '';
  try { var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, id); return c ? (Via_s_(c.NOME_FANTASIA) || Via_s_(c.RAZAO_SOCIAL) || Via_s_(c.NOME)) : ''; } catch (e) { return ''; }
}
function Via_veiculoNome_(id) {
  if (!id) return '';
  try { var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id); return v ? [Via_s_(v.PLACA), Via_s_(v.MODELO), Via_s_(v.APELIDO)].filter(Boolean).join(' · ') : ''; } catch (e) { return ''; }
}
/** O total não é digitado: um total vindo da tela que não bate com a soma é recusado. */
function Via_conferirTotalDigitado_(d, total) {
  if (!d || d.total === undefined || d.total === null || Via_s_(d.total) === '') return;
  var t = Via_num_(d.total);
  if (t === null || Math.abs(Via_cent_(t) - Via_cent_(total)) > 0) {
    throw new Error('Não foi possível gravar: o total não é digitado. Ele sai da soma das linhas do orçamento (' + Via_moeda_(total) + '). Para mudar o total, mude as linhas (quantidades e valores).');
  }
}

// ------------------------------------------------------------
// LEITURA E PERMISSÕES DE UMA SOLICITAÇÃO
// ------------------------------------------------------------
function Via_solicitacao_(id) {
  var r = id ? SGO_DATA.getById(VIA_ABAS.SOLICITACOES, Via_s_(id)) : null;
  if (!r) throw new Error('Solicitação não encontrada. Atualize a lista e abra de novo.');
  return r;
}
function Via_equipeIds_(r) { return Via_json_(r.EQUIPE_JSON, []).map(function (p) { return Via_s_(p.id); }); }
function Via_conflito_(r) { return [Via_s_(r.SOLICITANTE_ID)].concat(Via_equipeIds_(r)).filter(Boolean); }
function Via_podeVer_(eu, r, pod) {
  if (Via_s_(r.SOLICITANTE_ID) === eu.id || Via_equipeIds_(r).indexOf(eu.id) >= 0) return true;
  pod = pod || Via_poderes_(eu);
  return !!(pod.VIAGEM_VER_TODAS || pod.VIAGEM_APROVAR || pod.VIAGEM_APROVAR_DIRETORIA || pod.VIAGEM_DEPOSITAR);
}
function Via_exigirVer_(eu, r, pod) {
  if (!Via_podeVer_(eu, r, pod)) throw new Error('Não foi possível abrir a solicitação ' + Via_s_(r.NUMERO) + ': ela é de quem pediu, de quem viaja, de quem aprova e do Financeiro. Se você precisa acompanhá-la, peça a quem pediu (' + Via_s_(r.SOLICITANTE_NOME) + ').');
}
/** O que esta pessoa pode fazer agora: { editar, enviar, retirar, cancelar, decidir, carga } com { pode, motivo }. */
function Via_acoes_(eu, r, pod) {
  pod = pod || Via_poderes_(eu);
  var s = Via_up_(r.SITUACAO), sol = Via_s_(r.SOLICITANTE_ID) === eu.id, conflito = Via_conflito_(r);
  var nao = function (m) { return { pode: false, motivo: m }; }, sim = { pode: true, motivo: '' };
  var a = {};
  a.editar = !sol ? nao('Só quem pediu (' + Via_s_(r.SOLICITANTE_NOME) + ') altera a solicitação.') : !pod.VIAGEM_SOLICITAR ? nao('A sua conta não tem mais a permissão «' + Via_nomeCaixa_('VIAGEM_SOLICITAR') + '».')
    : VIA_EDITAVEIS.indexOf(s) < 0 ? nao(VIA_AGUARDANDO.indexOf(s) >= 0 ? 'Está aguardando a decisão. Para mudar, toque em "Retirar para ajustar".' : 'A solicitação está ' + (VIA_SITUACOES[s] || s).toLowerCase() + ': não muda mais.') : sim;
  if (a.editar.pode && s === 'CARGA_FEITA' && typeof Via_itensAtivos_ === 'function' && Via_itensAtivos_(r.ID).length) a.editar = nao('Já há gastos lançados na prestação de contas: a solicitação não muda mais. Gasto a mais do que o carregado entra na própria prestação e vira reembolso, conferido pelo Financeiro.');
  a.enviar = a.editar.pode && ['RASCUNHO', 'DEVOLVIDA'].indexOf(s) >= 0 ? sim : nao(a.editar.pode ? 'Já está aprovada. Se mudar alguma coisa, ela volta para rascunho e você envia de novo.' : a.editar.motivo);
  a.retirar = sol && VIA_AGUARDANDO.indexOf(s) >= 0 ? sim : nao('Só quem pediu retira, e só enquanto aguarda a decisão.');
  var carregado = Number(r.CARREGADO_TOTAL) || 0;
  a.cancelar = !sol ? nao('Só quem pediu cancela.') : ['NEGADA', 'CANCELADA'].indexOf(s) >= 0 ? nao('A solicitação já está encerrada.')
    : carregado > 0 ? nao('Já houve carga no cartão (' + Via_moeda_(carregado) + '): depois da carga não se cancela. Se a viagem não aconteceu, preste contas sem gastos (a prestação explica o motivo) e o Financeiro recolhe o saldo no Caju.') : sim;
  var etapa = Via_up_(r.ETAPA);
  if (VIA_AGUARDANDO.indexOf(s) < 0) a.decidir = nao('Não está aguardando decisão.');
  else if (conflito.indexOf(eu.id) >= 0) a.decidir = nao('Você ' + (sol ? 'pediu' : 'viaja') + ' nesta solicitação, e ninguém aprova a própria despesa.');
  else if (Via_soDiretoria_()) a.decidir = Via_ehDonoOuDiretoria_({ login: eu.login || eu.usuario, perfil: eu.perfil, area: eu.area }) ? { pode: true, motivo: '', etapa: 'DIRETORIA' }
    : nao('Você não aprova esta solicitação: ' + VIA_MOTIVO_SO_DIRETORIA + '. Ela está com o dono e a Diretoria; acompanhe por aqui.');
  else if (s === 'AGUARDANDO_APROVACAO') a.decidir = pod.VIAGEM_APROVAR ? { pode: true, motivo: '', etapa: 'GERENCIA' } : nao('A decisão desta etapa é do aprovador da política (caixa «' + Via_nomeCaixa_('VIAGEM_APROVAR') + '»).');
  else if (!pod.VIAGEM_APROVAR_DIRETORIA) a.decidir = nao('Esta etapa é da Diretoria (caixa «' + Via_nomeCaixa_('VIAGEM_APROVAR_DIRETORIA') + '»).');
  else if (Via_s_(r.GERENCIA_APROVADOR_ID) && Via_s_(r.GERENCIA_APROVADOR_ID) === eu.id) a.decidir = nao('Você já aprovou a etapa da gerência; a Diretoria precisa ser outra pessoa.');
  else a.decidir = { pode: true, motivo: '', etapa: 'DIRETORIA' };
  if (etapa && a.decidir.pode && !Via_soDiretoria_()) a.decidir.etapa = etapa;
  var saldo = Via_r2_((Number(r.APROVADO_TOTAL) || 0) - carregado);
  if (!pod.VIAGEM_DEPOSITAR) a.carga = nao('A carga no cartão é registrada pelo Financeiro (caixa «' + Via_nomeCaixa_('VIAGEM_DEPOSITAR') + '»).');
  else if (['APROVADA', 'CARGA_FEITA'].indexOf(s) < 0 || Via_up_(r.APROVACAO_VALIDA) !== 'SIM') a.carga = nao(s === 'RASCUNHO' && Number(r.APROVADO_TOTAL) > 0 ? 'A solicitação mudou depois da aprovação: espere a nova aprovação.' : 'Só depois da aprovação.');
  else if (Via_s_(r.CONTEUDO_HASH) !== Via_s_(r.APROVADO_HASH)) a.carga = nao('O conteúdo não é o da revisão aprovada: espere a nova aprovação.');
  else if (Via_equipeIds_(r).indexOf(eu.id) >= 0) a.carga = nao('Você viaja nesta solicitação: a carga do seu próprio cartão é registrada por outra pessoa do Financeiro.');
  else if (Via_aprovadoresDaRevisao_(r).indexOf(eu.id) >= 0) a.carga = nao('Você aprovou esta solicitação: quem aprova não registra a carga (separação de funções).');
  else if (!(saldo > 0)) a.carga = nao('O valor aprovado já foi todo carregado.');
  else a.carga = { pode: true, motivo: '', saldo: saldo };
  if (typeof Via_acoesPrestacao_ === 'function') Via_acoesPrestacao_(eu, r, pod, a);
  // 11/11/2026 (Conciliação Caju): pedido de crédito em andamento trava carga manual, edição e cancelamento; e a ação cargaCaju
  if (typeof Cju_ajustarAcoes_ === 'function') { try { Cju_ajustarAcoes_(eu, r, pod, a); } catch (e) { console.error('Depósito de viagem, pedido Caju: ' + Via_erro_(e)); } }
  return a;
}
function Via_decisoesDe_(solId) {
  return Via_ler_(VIA_ABAS.DECISOES).filter(function (d) { return Via_s_(d.SOLICITACAO_ID) === Via_s_(solId); })
    .sort(function (a, b) { return Via_s_(a.EM).localeCompare(Via_s_(b.EM)); });
}
function Via_aprovadoresDaRevisao_(r) {
  var rev = Number(r.APROVADO_REVISAO), hash = Via_s_(r.APROVADO_HASH);
  return Via_decisoesDe_(r.ID).filter(function (d) { return Via_up_(d.DECISAO) === 'APROVAR' && Number(d.REVISAO) === rev && Via_s_(d.HASH) === hash; }).map(function (d) { return Via_s_(d.POR_ID); });
}

// ------------------------------------------------------------
// PARA A TELA
// ------------------------------------------------------------
/** Situação para mostrar: a gravada, menos a carga feita de viagem que já terminou, que é a prestação pendente. */
function Via_sitEfetiva_(r) {
  var s = Via_up_(r.SITUACAO);
  if (s === 'CARGA_FEITA' && typeof Via_viagemTerminou_ === 'function' && Via_viagemTerminou_(r)) return 'PRESTACAO_PENDENTE';
  return s;
}
function Via_resumo_(r) {
  var se = Via_sitEfetiva_(r), pz = typeof Via_prazoInfo_ === 'function' ? Via_prazoInfo_(r) : null;
  return { id: Via_s_(r.ID), numero: Via_s_(r.NUMERO), situacao: se, situacaoGravada: Via_up_(r.SITUACAO), situacaoNome: VIA_SITUACOES[se] || Via_s_(r.SITUACAO), revisao: Number(r.REVISAO) || 0,
    prazoPrestacao: pz ? pz.prazoTxt : '', prestacaoVencida: !!(pz && pz.vencida), aDevolverTxt: Number(r.A_DEVOLVER) > 0 ? Via_moeda_(r.A_DEVOLVER) : '', aReembolsarTxt: Number(r.A_REEMBOLSAR) > 0 ? Via_moeda_(r.A_REEMBOLSAR) : '',
    destino: [Via_s_(r.DESTINO_CIDADE), Via_up_(r.DESTINO_UF)].filter(Boolean).join('/'), saida: Via_br_(r.SAIDA_EM), chegada: Via_br_(r.CHEGADA_EM), saidaIso: Via_iso_(r.SAIDA_EM),
    solicitante: Via_s_(r.SOLICITANTE_NOME), responsavel: Via_s_(r.RESPONSAVEL_NOME), centro: Via_s_(r.CENTRO_CUSTO_CODIGO), total: Number(r.TOTAL) || 0, totalTxt: Via_moeda_(r.TOTAL),
    urgente: Via_up_(r.URGENTE) === 'SIM', aprovadoTxt: Number(r.APROVADO_TOTAL) > 0 && Via_up_(r.APROVACAO_VALIDA) === 'SIM' ? Via_moeda_(r.APROVADO_TOTAL) : '',
    carregadoTxt: Number(r.CARREGADO_TOTAL) > 0 ? Via_moeda_(r.CARREGADO_TOTAL) : '', atualizado: Via_br_(r.ATUALIZADO_EM), atualizadoIso: Via_iso_(r.ATUALIZADO_EM) };
}
function Via_paraTela_(eu, r, pod) {
  pod = pod || Via_poderes_(eu);
  var c = Via_conteudoDaLinha_(r), pol = Via_politica_(), us = Via_usuarios_();
  var anexos = Via_ler_(VIA_ABAS.ANEXOS).filter(function (a) { return Via_s_(a.SOLICITACAO_ID) === Via_s_(r.ID) && !Via_s_(a.REMOVIDO_EM); });
  var conf = Via_conferir_(r, c, pol, { anexos: anexos.filter(Via_ehAnexoOrcamento_) });
  var anexoTela = function (a) { return { id: Via_s_(a.ID), linhaId: Via_s_(a.LINHA_ID), nome: Via_s_(a.NOME), url: Via_s_(a.URL), por: Via_s_(a.ENVIADO_POR_NOME), em: Via_br_(a.ENVIADO_EM), tipo: Via_up_(a.TIPO) }; };
  var t = Via_resumo_(r);
  var acoes = Via_acoes_(eu, r, pod);
  var aprovEdit = ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0;
  Object.assign(t, {
    solicitanteId: Via_s_(r.SOLICITANTE_ID), criado: Via_br_(r.CRIADO_EM), conteudo: c,
    centroNome: conf.centro ? conf.centro.codigo + ' · ' + conf.centro.nome : Via_s_(r.CENTRO_CUSTO_CODIGO),
    vinculoNome: VIA_VINCULOS[c.vinculoTipo] || '', clienteNome: Via_s_(r.CLIENTE_NOME) || Via_clienteNome_(c.clienteId), veiculoNome: Via_s_(r.VEICULO_NOME) || Via_veiculoNome_(c.veiculoId),
    veiculoTipoNome: VIA_VEICULOS[c.veiculoTipo] || '',
    equipe: c.equipe.map(function (p) { var u = us[p.id] || {}; return { id: p.id, nome: u.nome || p.id, funcao: p.funcao, funcaoNome: VIA_FUNCOES[p.funcao] || p.funcao, vinculo: u.vinculo || '' }; }),
    responsavelNome: us[c.responsavelId] ? us[c.responsavelId].nome : Via_s_(r.RESPONSAVEL_NOME),
    dias: conf.dias, noites: conf.noites,
    linhas: conf.linhas.map(function (l) {
      return Object.assign({}, l, { categoriaNome: VIA_CAT[l.categoria].nome, valorTxt: l.erros.length ? '' : Via_moeda_(l.valor), tetoTxt: l.teto ? Via_moeda_(l.teto) + ' ' + VIA_CAT[l.categoria].tetoRot : '',
        anexos: anexos.filter(function (a) { return Via_s_(a.LINHA_ID) === l.id && Via_ehAnexoOrcamento_(a); }).map(anexoTela) });
    }),
    naoSeAplica: c.naoSeAplica, totalCalculado: conf.total, totalCalculadoTxt: Via_moeda_(conf.total),
    faltas: conf.faltas, apontamentos: VIA_EDITAVEIS.indexOf(Via_up_(r.SITUACAO)) >= 0 && !aprovEdit ? conf.apontamentos : Via_json_(r.APONTAMENTOS_JSON, conf.apontamentos),
    exigeDiretoria: Via_up_(r.EXIGE_DIRETORIA) === 'SIM' || (Via_up_(r.SITUACAO) === 'RASCUNHO' && conf.exigeDiretoria), motivosDiretoria: Via_s_(r.MOTIVOS_DIRETORIA) || conf.motivosDiretoria.join('; '),
    etapa: Via_up_(r.ETAPA), etapaNome: VIA_ETAPAS[Via_up_(r.ETAPA)] || '',
    aguardando: VIA_AGUARDANDO.indexOf(Via_up_(r.SITUACAO)) >= 0 ? Via_nomes_(Via_up_(r.SITUACAO) === 'AGUARDANDO_DIRETORIA' ? Via_aprovadoresDiretoria_(Via_conflito_(r).concat([Via_s_(r.GERENCIA_APROVADOR_ID)].filter(Boolean))) : Via_aprovadoresGerencia_(Via_conflito_(r))).join(', ') : '',
    aprovacao: { valida: Via_up_(r.APROVACAO_VALIDA) === 'SIM', revisao: Via_s_(r.APROVADO_REVISAO), total: Number(r.APROVADO_TOTAL) || 0, totalTxt: Number(r.APROVADO_TOTAL) > 0 ? Via_moeda_(r.APROVADO_TOTAL) : '', em: Via_br_(r.APROVADO_EM) },
    carregado: Number(r.CARREGADO_TOTAL) || 0, carregadoTxt: Via_moeda_(r.CARREGADO_TOTAL), saldoACarregar: acoes.carga.saldo || Math.max(0, Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0))),
    decisoes: Via_decisoesDe_(r.ID).map(function (d) { return { revisao: Number(d.REVISAO) || 0, etapa: Via_up_(d.ETAPA), etapaNome: VIA_ETAPAS[Via_up_(d.ETAPA)] || '', decisao: Via_up_(d.DECISAO), decisaoNome: VIA_DECISOES_NOMES[Via_up_(d.DECISAO)] || d.DECISAO, fundamentacao: Via_s_(d.FUNDAMENTACAO), por: Via_s_(d.POR_NOME), em: Via_br_(d.EM), total: Via_moeda_(d.TOTAL) }; }),
    cargas: Via_ler_(VIA_ABAS.CARGAS).filter(function (g) { return Via_s_(g.SOLICITACAO_ID) === Via_s_(r.ID); }).sort(function (a, b) { return Via_s_(a.EM).localeCompare(Via_s_(b.EM)); })
      .map(function (g) { return { data: Via_brDia_(g.DATA), valorTxt: Via_moeda_(g.VALOR), revisao: Number(g.REVISAO) || 0, centroCaju: Via_s_(g.CENTRO_CUSTO_CAJU), obs: Via_s_(g.OBSERVACAO), comprovante: { nome: Via_s_(g.COMPROVANTE_NOME), url: Via_s_(g.COMPROVANTE_URL) }, por: Via_s_(g.POR_NOME), em: Via_br_(g.EM),
        pedidoCaju: Via_s_(g.PEDIDO_CAJU_ID), taxaTxt: Via_s_(g.TAXA_CAJU) !== '' ? Via_moeda_(g.TAXA_CAJU) : '', conciliada: !!Via_s_(g.CONCILIADA_EM) }; }),
    revisoes: Via_ler_(VIA_ABAS.REVISOES).filter(function (v) { return Via_s_(v.SOLICITACAO_ID) === Via_s_(r.ID); }).sort(function (a, b) { return (Number(a.REVISAO) || 0) - (Number(b.REVISAO) || 0); })
      .map(function (v) { return { revisao: Number(v.REVISAO) || 0, em: Via_br_(v.CRIADA_EM), por: Via_s_(v.CRIADA_POR_NOME), motivo: Via_s_(v.MOTIVO), totalTxt: Via_moeda_(v.TOTAL) }; }),
    historico: Via_ler_(VIA_ABAS.HISTORICO).filter(function (h) { return Via_s_(h.ENTIDADE) === 'SOLICITACAO' && Via_s_(h.ENTIDADE_ID) === Via_s_(r.ID); })
      .sort(function (a, b) { return Via_s_(b.EM).localeCompare(Via_s_(a.EM)); }).slice(0, 80)
      .map(function (h) { return { em: Via_br_(h.EM), acao: Via_s_(h.ACAO), de: Via_s_(h.DE), para: Via_s_(h.PARA), texto: Via_s_(h.TEXTO), por: Via_s_(h.POR_NOME), revisao: Via_s_(h.REVISAO) }; }),
    proximaRevisao: Via_proximaRevisao_(r, c, anexos.filter(Via_ehAnexoOrcamento_)),
    acoes: acoes, comprovantesCarga: anexos.filter(function (a) { return Via_up_(a.TIPO) === 'COMPROVANTE_CARGA'; }).map(anexoTela)
  });
  if (typeof Via_prestacaoParaTela_ === 'function') t.prestacao = Via_prestacaoParaTela_(eu, r, acoes);
  // 11/11/2026: carga pelo Caju (pedidos de crédito desta solicitação; SGO_Caju_Pedidos.js)
  if (typeof Cju_infoSolicitacao_ === 'function') { try { t.caju = Cju_infoSolicitacao_(eu, r, acoes); } catch (e) { t.caju = null; console.error('Depósito de viagem, Caju: ' + Via_erro_(e)); } }
  return t;
}
/** Revisão que o próximo envio terá (a mesma, se o conteúdo é o de uma revisão já enviada) e se pede o motivo da mudança. */
function Via_proximaRevisao_(r, c, anexos) {
  var revs = Via_ler_(VIA_ABAS.REVISOES).filter(function (v) { return Via_s_(v.SOLICITACAO_ID) === Via_s_(r.ID); });
  var hash = Via_hash_(c, anexos), igual = revs.filter(function (v) { return Via_s_(v.HASH) === hash; })[0];
  if (igual) return { numero: Number(igual.REVISAO) || 0, nova: false, pedeMotivo: false };
  var n = revs.length ? revs.reduce(function (m, v) { return Math.max(m, Number(v.REVISAO) || 0); }, 0) + 1 : 0;
  return { numero: n, nova: true, pedeMotivo: n > 0 };
}

// ------------------------------------------------------------
// AÇÕES
// ------------------------------------------------------------
function Via_proximoNumero_() {
  var ano = Via_hoje_().slice(0, 4), prefixo = 'VIA-' + ano + '-', chave = 'VIA_SEQ_' + ano, props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty(chave)) || 0, re = /^VIA-\d{4}-(\d+)$/;
  Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (r) { var m = re.exec(Via_s_(r.NUMERO)); if (m && Via_s_(r.NUMERO).indexOf(prefixo) === 0 && Number(m[1]) > seq) seq = Number(m[1]); });
  seq++;
  props.setProperty(chave, String(seq));
  var n = String(seq); while (n.length < 4) n = '0' + n;
  return prefixo + n;
}
/** Campos da linha da planilha a partir do conteúdo limpo. */
function Via_camposDoConteudo_(c, conf) {
  var us = Via_usuarios_();
  return { CENTRO_CUSTO_ID: c.centroCustoId, CENTRO_CUSTO_CODIGO: conf.centro ? conf.centro.codigo : '', VINCULO_TIPO: c.vinculoTipo, CLIENTE_ID: c.clienteId, CLIENTE_NOME: Via_clienteNome_(c.clienteId),
    VINCULO_REF: c.vinculoRef, VINCULO_JUSTIFICATIVA: c.vinculoJustificativa, OBJETIVO: c.objetivo, DESTINO_CIDADE: c.destinoCidade, DESTINO_UF: c.destinoUf, SAIDA_EM: c.saidaEm,
    CHEGADA_EM: c.chegadaEm, EQUIPE_JSON: JSON.stringify(c.equipe), RESPONSAVEL_ID: c.responsavelId, RESPONSAVEL_NOME: us[c.responsavelId] ? us[c.responsavelId].nome : '',
    VEICULO_TIPO: c.veiculoTipo, VEICULO_ID: c.veiculoId, VEICULO_NOME: Via_veiculoNome_(c.veiculoId), VEICULO_JUSTIFICATIVA: c.veiculoJustificativa, ROTEIRO: c.roteiro,
    LINHAS_JSON: JSON.stringify(c.linhas), NAO_SE_APLICA_JSON: JSON.stringify(c.naoSeAplica), TOTAL: conf.total, URGENTE: conf.urgente ? 'SIM' : '' };
}
/**
 * Conteúdo mudou numa solicitação aprovada (ou com carga): a aprovação deixa de valer e ela volta a rascunho (nova revisão no envio).
 * Devolve o texto para a tela ('' quando nada muda).
 */
function Via_aposMudar_(r, campos, hashNovo, eu) {
  var s = Via_up_(r.SITUACAO);
  if (['APROVADA', 'CARGA_FEITA'].indexOf(s) < 0 || hashNovo === Via_s_(r.APROVADO_HASH)) return '';
  campos.SITUACAO = 'RASCUNHO'; campos.APROVACAO_VALIDA = ''; campos.ETAPA = ''; campos.GERENCIA_APROVADOR_ID = '';
  Via_historico_('SOLICITACAO', r.ID, 'APROVACAO_PERDIDA', eu, { revisao: r.REVISAO, de: VIA_SITUACOES[s], para: VIA_SITUACOES.RASCUNHO,
    texto: 'Conteúdo alterado depois da aprovação da revisão ' + Via_s_(r.APROVADO_REVISAO) + ': a aprovação deixa de valer. Envie de novo (revisão nova); a carga só continua depois da nova aprovação.' + (Number(r.CARREGADO_TOTAL) > 0 ? ' Já carregado: ' + Via_moeda_(r.CARREGADO_TOTAL) + '.' : '') });
  return ' A solicitação estava aprovada: com a mudança, a aprovação deixou de valer e ela voltou a rascunho. Envie de novo para aprovar a revisão nova.';
}
function Via_salvar_(eu, d) {
  d = d || {};
  var c = Via_conteudoLimpo_(d), pol = Via_politica_();
  return Via_comTrava_(function () {
    Via_garantirAbas_();
    var r = Via_s_(d.id) ? Via_solicitacao_(d.id) : null, agora = Via_agora_();
    if (!r) Via_exigir_(eu, 'VIAGEM_SOLICITAR', 'montar a solicitação de depósito de viagem', 'Quem monta a solicitação é o gestor da área (ele inclui você na equipe da viagem). Peça a ele; se você deveria poder montar, fale com o responsável pelo sistema.');
    else {
      var ac = Via_acoes_(eu, r);
      if (!ac.editar.pode) throw new Error('Não foi possível gravar a solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.editar.motivo);
    }
    var anexos = r ? Via_anexosAtivos_(r.ID) : [];
    var conf = Via_conferir_(r, c, pol, { anexos: anexos, solicitanteId: eu.id });
    Via_conferirTotalDigitado_(d, conf.total);
    var campos = Via_camposDoConteudo_(c, conf), hash = Via_hash_(c, anexos);
    campos.CONTEUDO_HASH = hash; campos.ATUALIZADO_EM = agora; campos.ATUALIZADO_POR_NOME = eu.nome;
    var msg = 'Rascunho gravado. Total pela soma das linhas: ' + Via_moeda_(conf.total) + '.';
    if (!r) {
      var id = Via_id_(), numero = Via_proximoNumero_();
      SGO_DATA.insert(VIA_ABAS.SOLICITACOES, Object.assign({ ID: id, NUMERO: numero, SITUACAO: 'RASCUNHO', REVISAO: 0, SOLICITANTE_ID: eu.id, SOLICITANTE_NOME: eu.nome, CARREGADO_TOTAL: 0, CRIADO_EM: agora }, campos));
      Via_historico_('SOLICITACAO', id, 'CRIADA', eu, { revisao: 0, para: VIA_SITUACOES.RASCUNHO, texto: 'Solicitação ' + numero + ' criada. Total ' + Via_moeda_(conf.total) + '.' });
      r = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, id);
      msg = 'Solicitação ' + numero + ' criada como rascunho. Total pela soma das linhas: ' + Via_moeda_(conf.total) + '.';
    } else {
      if (hash !== Via_s_(r.CONTEUDO_HASH)) {
        msg += Via_aposMudar_(r, campos, hash, eu);
        if (Via_up_(r.SITUACAO) === 'DEVOLVIDA' || campos.SITUACAO === 'RASCUNHO') Via_historico_('SOLICITACAO', r.ID, 'ALTERADA', eu, { revisao: r.REVISAO, texto: 'Conteúdo alterado. Total ' + Via_moeda_(conf.total) + '.' });
        else if (Via_up_(r.SITUACAO) === 'RASCUNHO') Via_historico_('SOLICITACAO', r.ID, 'ALTERADA', eu, { revisao: r.REVISAO, texto: 'Rascunho alterado. Total ' + Via_moeda_(conf.total) + '.' });
      }
      SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
      r = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID);
    }
    if (conf.faltas.length && ['RASCUNHO', 'DEVOLVIDA'].indexOf(Via_up_(r.SITUACAO)) >= 0) msg += ' Para enviar, falta: ' + conf.faltas.length + ' item(ns) (veja a lista "O que falta para enviar").';
    return { solicitacao: Via_paraTela_(eu, r), message: msg };
  });
}
function Via_salvarArquivo_(arq, numero, prefixo, oQue) {
  if (!arq || !Via_s_(arq.base64) || !Via_s_(arq.nome)) throw new Error('Não foi possível anexar: falta o arquivo ' + oQue + '. Toque em "Escolher arquivo", selecione e tente de novo.');
  if (String(arq.base64).length > VIA_ANEXO_MAX_BASE64) throw new Error('Não foi possível anexar: o arquivo ' + oQue + ' passa de 10 MB. Salve em tamanho menor (PDF ou foto reduzida) e anexe de novo.');
  if (!VIA_RX_ANEXO.test(Via_s_(arq.nome))) throw new Error('Não foi possível anexar: o arquivo ' + oQue + ' precisa ser PDF ou imagem (PNG, JPG, WEBP, HEIC). Tire o print ou salve em PDF e anexe de novo.');
  var raiz = SGO_DocSalvar_pastaPersistente_('VIA_PASTA_ANEXOS_ID', VIA_PASTA_ANEXOS, '');
  var pasta = numero && typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(raiz, numero) : raiz;
  var b64 = String(arq.base64).replace(/^data:[^,]+,/, '');
  var nome = SGO_DocSalvar_sanitizarNome_((prefixo ? prefixo + ' - ' : '') + Via_s_(arq.nome));
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), Via_s_(arq.tipo) || 'application/octet-stream', nome);
  var f = pasta.createFile(blob);
  return { id: f.getId(), nome: f.getName(), url: f.getUrl(), sha: Via_marca_(b64), tamanho: Math.round(b64.length * 0.75) };
}
function Via_anexar_(eu, d) {
  d = d || {};
  return Via_comTrava_(function () {
    Via_garantirAbas_();
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.editar.pode) throw new Error('Não foi possível anexar na solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.editar.motivo);
    var c = Via_conteudoDaLinha_(r), linha = c.linhas.filter(function (l) { return l.id === Via_s_(d.linhaId); })[0];
    if (!linha) throw new Error('Não foi possível anexar: a linha do orçamento ainda não foi gravada. Toque em "Salvar rascunho" e anexe de novo.');
    var cat = VIA_CAT[linha.categoria];
    var arq = Via_salvarArquivo_(d.arquivo, Via_s_(r.NUMERO), cat.nome, 'do orçamento ou print');
    var antes = Via_anexosAtivos_(r.ID);
    if (antes.some(function (a) { return Via_s_(a.LINHA_ID) === linha.id && Via_s_(a.SHA) === arq.sha; })) throw new Error('Não foi possível anexar: este mesmo arquivo já está nesta linha. Se for outro orçamento, escolha o arquivo certo.');
    SGO_DATA.insert(VIA_ABAS.ANEXOS, { ID: Via_id_(), SOLICITACAO_ID: r.ID, LINHA_ID: linha.id, CATEGORIA: cat.cod, TIPO: 'ORCAMENTO', NOME: arq.nome, ARQUIVO_ID: arq.id, URL: arq.url,
      MIME: Via_s_(d.arquivo.tipo), TAMANHO: arq.tamanho, SHA: arq.sha, ENVIADO_POR_ID: eu.id, ENVIADO_POR_NOME: eu.nome, ENVIADO_EM: Via_agora_() });
    var hash = Via_hash_(c, Via_anexosAtivos_(r.ID)), campos = { CONTEUDO_HASH: hash, ATUALIZADO_EM: Via_agora_(), ATUALIZADO_POR_NOME: eu.nome };
    var extra = Via_aposMudar_(r, campos, hash, eu);
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
    Via_historico_('SOLICITACAO', r.ID, 'ANEXO_INCLUIDO', eu, { revisao: r.REVISAO, texto: cat.nome + ': ' + arq.nome });
    return { solicitacao: Via_paraTela_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID)), message: 'Anexo incluído em ' + cat.nome + ': ' + arq.nome + '.' + extra };
  });
}
function Via_removerAnexo_(eu, d) {
  d = d || {};
  return Via_comTrava_(function () {
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.editar.pode) throw new Error('Não foi possível tirar o anexo: ' + ac.editar.motivo);
    var a = Via_anexosAtivos_(r.ID).filter(function (x) { return Via_s_(x.ID) === Via_s_(d.anexoId); })[0];
    if (!a) throw new Error('Não foi possível tirar o anexo: ele não está mais nesta solicitação. Atualize a tela.');
    SGO_DATA.update(VIA_ABAS.ANEXOS, a.ID, { REMOVIDO_EM: Via_agora_(), REMOVIDO_POR_NOME: eu.nome });
    var hash = Via_hash_(Via_conteudoDaLinha_(r), Via_anexosAtivos_(r.ID)), campos = { CONTEUDO_HASH: hash, ATUALIZADO_EM: Via_agora_(), ATUALIZADO_POR_NOME: eu.nome };
    var extra = Via_aposMudar_(r, campos, hash, eu);
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
    Via_historico_('SOLICITACAO', r.ID, 'ANEXO_RETIRADO', eu, { revisao: r.REVISAO, texto: Via_s_(a.NOME) + ' (o arquivo continua guardado na pasta do módulo)' });
    return { solicitacao: Via_paraTela_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID)), message: 'Anexo tirado da linha. O arquivo continua guardado (nada é apagado).' + extra };
  });
}
/** Retrato da revisão (o que o A4 e a aprovação cobrem). */
function Via_retrato_(r, c, conf, anexos, pol) {
  var us = Via_usuarios_();
  return { numero: Via_s_(r.NUMERO), solicitante: { id: Via_s_(r.SOLICITANTE_ID), nome: Via_s_(r.SOLICITANTE_NOME) }, conteudo: c,
    centro: conf.centro ? { codigo: conf.centro.codigo, nome: conf.centro.nome, codigoCaju: conf.centro.codigoCaju } : null, clienteNome: Via_clienteNome_(c.clienteId),
    veiculoNome: Via_veiculoNome_(c.veiculoId), equipe: c.equipe.map(function (p) { var u = us[p.id] || {}; return { id: p.id, nome: u.nome || p.id, funcao: p.funcao, vinculo: u.vinculo || '' }; }),
    responsavelNome: us[c.responsavelId] ? us[c.responsavelId].nome : '', linhas: conf.linhas.map(function (l) { return { id: l.id, categoria: l.categoria, descricao: l.descricao, q1: l.q1, q2: l.q2, unitario: l.unitario,
      justificativa: l.justificativa, justificativaTeto: l.justificativaTeto, valor: l.valor, base: l.base, teto: l.teto, acimaTeto: l.acimaTeto }; }),
    total: conf.total, dias: conf.dias, noites: conf.noites, urgente: conf.urgente, diasUteis: conf.diasUteis, apontamentos: conf.apontamentos, exigeDiretoria: conf.exigeDiretoria,
    motivosDiretoria: conf.motivosDiretoria, politica: { versao: pol.versao, limiteDiretoria: pol.limiteDiretoria, urgenteDiasUteis: pol.urgenteDiasUteis, tetos: pol.tetos },
    anexos: anexos.map(function (a) { return { id: Via_s_(a.ID), linhaId: Via_s_(a.LINHA_ID), categoria: Via_s_(a.CATEGORIA), nome: Via_s_(a.NOME), por: Via_s_(a.ENVIADO_POR_NOME), em: Via_br_(a.ENVIADO_EM), sha: Via_s_(a.SHA) }; }) };
}
function Via_enviar_(eu, d) {
  d = d || {};
  var pol = Via_politica_();
  var saida = Via_comTrava_(function () {
    Via_garantirAbas_();
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.enviar.pode) throw new Error('Não foi possível enviar a solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.enviar.motivo);
    var c = Via_conteudoDaLinha_(r), anexos = Via_anexosAtivos_(r.ID);
    var conf = Via_conferir_(r, c, pol, { anexos: anexos });
    Via_conferirTotalDigitado_(d, conf.total);
    if (conf.faltas.length) throw new Error('Não foi possível enviar a solicitação ' + Via_s_(r.NUMERO) + ': falta ' + (conf.faltas.length === 1 ? 'um item' : conf.faltas.length + ' itens') + '. ' + conf.faltas.join(' ') + ' Ajuste, salve e envie de novo.');
    var prox = Via_proximaRevisao_(r, c, anexos), motivoRev = Via_texto_(d.motivoRevisao, 600), agora = Via_agora_(), hash = Via_hash_(c, anexos);
    if (prox.pedeMotivo && motivoRev.length < 10) throw new Error('Não foi possível enviar: é a revisão ' + prox.numero + ' (o conteúdo mudou desde a revisão enviada antes). Escreva o que mudou (10 letras ou mais); o texto vai para o relatório A4 e para quem aprova.');
    if (prox.nova) {
      SGO_DATA.insert(VIA_ABAS.REVISOES, { ID: Via_id_(), SOLICITACAO_ID: r.ID, NUMERO: r.NUMERO, REVISAO: prox.numero, HASH: hash, TOTAL: conf.total,
        CONTEUDO_JSON: JSON.stringify(Via_retrato_(r, c, conf, anexos, pol)), MOTIVO: prox.numero > 0 ? motivoRev : 'Primeira emissão.', CRIADA_EM: agora, CRIADA_POR_ID: eu.id, CRIADA_POR_NOME: eu.nome });
    }
    var etapa = conf.etapa, situacao = etapa === 'GERENCIA' ? 'AGUARDANDO_APROVACAO' : 'AGUARDANDO_DIRETORIA';
    var campos = Object.assign(Via_camposDoConteudo_(c, conf), { SITUACAO: situacao, ETAPA: etapa, REVISAO: prox.numero, REVISAO_HASH: hash, CONTEUDO_HASH: hash, GERENCIA_APROVADOR_ID: '',
      EXIGE_DIRETORIA: conf.exigeDiretoria ? 'SIM' : '', MOTIVOS_DIRETORIA: conf.motivosDiretoria.join('; '), APONTAMENTOS_JSON: JSON.stringify(conf.apontamentos), POLITICA_VERSAO: pol.versao,
      APROVACAO_VALIDA: '', ENVIADO_EM: agora, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome });
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
    Via_historico_('SOLICITACAO', r.ID, 'ENVIADA', eu, { revisao: prox.numero, de: VIA_SITUACOES[Via_up_(r.SITUACAO)], para: VIA_SITUACOES[situacao],
      texto: 'Revisão ' + prox.numero + ' enviada. Total ' + Via_moeda_(conf.total) + '. ' + (etapa === 'GERENCIA' ? 'Aprovação de: ' + Via_nomes_(conf.gerencia).join(', ') : 'Direto à Diretoria (' + conf.motivosDiretoria.join('; ') + ')') +
        (conf.exigeDiretoria && etapa === 'GERENCIA' ? '; depois, a Diretoria (' + conf.motivosDiretoria.join('; ') + ')' : '') + (conf.urgente ? '. URGENTE.' : '.') + (prox.numero > 0 && prox.nova ? ' O que mudou: ' + motivoRev : '') });
    var r2 = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID);
    Via_depois_(function () { Via_avisarAprovacao_(r2, etapa, etapa === 'GERENCIA' ? conf.gerencia : conf.diretoria, conf, eu); });
    return { r: r2, conf: conf, etapa: etapa };
  });
  var quem = Via_nomes_(saida.etapa === 'GERENCIA' ? saida.conf.gerencia : saida.conf.diretoria).join(', ');
  return { solicitacao: Via_paraTela_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, saida.r.ID)),
    message: 'Solicitação ' + Via_s_(saida.r.NUMERO) + ' (revisão ' + Via_s_(saida.r.REVISAO) + ', total ' + Via_moeda_(saida.conf.total) + ') enviada para aprovação de ' + quem + (saida.etapa === 'DIRETORIA' ? ' (Diretoria)' : '') + '.' +
      (saida.conf.exigeDiretoria && saida.etapa === 'GERENCIA' ? ' Depois ela vai também à Diretoria: ' + saida.conf.motivosDiretoria.join('; ') + '.' : '') +
      (saida.conf.urgente ? ' Urgente: o aviso saiu na hora.' : ' O aviso sai no expediente.') + ' Você é avisado da decisão.' };
}
function Via_retirar_(eu, d) {
  return Via_comTrava_(function () {
    var r = Via_solicitacao_((d || {}).id), ac = Via_acoes_(eu, r);
    if (!ac.retirar.pode) throw new Error('Não foi possível retirar a solicitação: ' + ac.retirar.motivo);
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, { SITUACAO: 'RASCUNHO', ETAPA: '', GERENCIA_APROVADOR_ID: '', ATUALIZADO_EM: Via_agora_(), ATUALIZADO_POR_NOME: eu.nome });
    Via_historico_('SOLICITACAO', r.ID, 'RETIRADA', eu, { revisao: r.REVISAO, de: VIA_SITUACOES[Via_up_(r.SITUACAO)], para: VIA_SITUACOES.RASCUNHO, texto: Via_texto_((d || {}).motivo, 300) || 'Retirada por quem pediu para ajustar.' });
    return { solicitacao: Via_paraTela_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID)), message: 'Solicitação retirada da aprovação e de volta a rascunho. Ajuste e envie de novo; o pedido de aprovação anterior deixa de valer.' };
  });
}
function Via_cancelar_(eu, d) {
  d = d || {};
  var motivo = Via_texto_(d.motivo, 600);
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (10 letras ou mais). Ele fica no histórico e no relatório.');
  var info = Via_comTrava_(function () {
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.cancelar.pode) throw new Error('Não foi possível cancelar a solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.cancelar.motivo);
    var agora = Via_agora_(), estavaAprovada = ['APROVADA'].indexOf(Via_up_(r.SITUACAO)) >= 0;
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, { SITUACAO: 'CANCELADA', ETAPA: '', APROVACAO_VALIDA: '', CANCELADO_EM: agora, CANCELADO_MOTIVO: motivo, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome });
    Via_historico_('SOLICITACAO', r.ID, 'CANCELADA', eu, { revisao: r.REVISAO, de: VIA_SITUACOES[Via_up_(r.SITUACAO)], para: VIA_SITUACOES.CANCELADA, texto: motivo });
    if (estavaAprovada) Via_depois_(function () { Via_notificar_(Via_depositantes_(), r, 'Cancelada: ' + Via_s_(r.NUMERO) + ' não precisa mais de carga', 'A solicitação ' + Via_s_(r.NUMERO) + ' foi cancelada por ' + eu.nome + ' antes da carga no cartão. Motivo: ' + motivo + '.\nNão faça a carga.'); });
    return r;
  });
  return { solicitacao: Via_paraTela_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, info.ID)), message: 'Solicitação ' + Via_s_(info.NUMERO) + ' cancelada. O histórico e os anexos ficam guardados.' };
}
function Via_decidir_(eu, d) {
  d = d || {};
  var decisao = Via_up_(d.decisao), fund = Via_texto_(d.fundamentacao, 2000);
  if (!VIA_DECISOES_NOMES[decisao]) throw new Error('Não foi possível registrar a decisão: escolha Aprovar, Devolver para ajuste ou Negar.');
  if (fund.length < VIA_FUNDAMENTACAO_MIN) throw new Error('Não foi possível registrar a decisão: escreva a fundamentação (' + VIA_FUNDAMENTACAO_MIN + ' letras ou mais). Ela vai para o relatório A4 e para quem pediu.');
  var saida = Via_comTrava_(function () {
    var r = Via_solicitacao_(d.id), pod = Via_poderes_(eu), ac = Via_acoes_(eu, r, pod);
    if (!ac.decidir.pode) throw new Error('Não foi possível registrar a decisão na solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.decidir.motivo);
    if (Via_s_(d.revisao) !== '' && Number(d.revisao) !== Number(r.REVISAO)) throw new Error('Não foi possível registrar a decisão: a solicitação mudou para a revisão ' + Via_s_(r.REVISAO) + ' enquanto a tela estava aberta. Abra de novo, confira o relatório e decida.');
    if (Via_s_(r.CONTEUDO_HASH) !== Via_s_(r.REVISAO_HASH)) throw new Error('Não foi possível registrar a decisão: o conteúdo não é o da revisão enviada. Peça a quem pediu para enviar de novo.');
    var etapa = Via_soDiretoria_() ? 'DIRETORIA' : (Via_up_(r.ETAPA) || ac.decidir.etapa), agora = Via_agora_(), total = Number(r.TOTAL) || 0; // 16/11/2026: com SIM, uma etapa só
    var campos = { DECIDIDO_EM: agora, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome }, novo = '', proxima = null;
    if (decisao === 'APROVAR' && etapa === 'GERENCIA' && Via_up_(r.EXIGE_DIRETORIA) === 'SIM') {
      novo = 'AGUARDANDO_DIRETORIA'; campos.ETAPA = 'DIRETORIA'; campos.GERENCIA_APROVADOR_ID = eu.id;
      proxima = Via_aprovadoresDiretoria_(Via_conflito_(r).concat([eu.id]));
      if (!proxima.length) throw new Error('Não foi possível aprovar: depois de você, a solicitação precisa da Diretoria (' + Via_s_(r.MOTIVOS_DIRETORIA) + '), mas não há ninguém da Diretoria disponível que não seja quem pediu, quem viaja ou você. Fale com a Diretoria; nada foi gravado.');
    } else if (decisao === 'APROVAR') {
      novo = 'APROVADA'; campos.ETAPA = ''; campos.APROVACAO_VALIDA = 'SIM'; campos.APROVADO_REVISAO = r.REVISAO; campos.APROVADO_HASH = r.REVISAO_HASH; campos.APROVADO_TOTAL = total; campos.APROVADO_EM = agora;
      if (etapa === 'GERENCIA') campos.GERENCIA_APROVADOR_ID = eu.id;
      if (Number(r.CARREGADO_TOTAL) > 0) { novo = 'CARGA_FEITA'; if (typeof Via_prazoCalcular_ === 'function') campos.PRESTACAO_PRAZO = Via_prazoCalcular_(r.CHEGADA_EM); }
    } else if (decisao === 'DEVOLVER') { novo = 'DEVOLVIDA'; campos.ETAPA = ''; campos.GERENCIA_APROVADOR_ID = ''; }
    else { novo = 'NEGADA'; campos.ETAPA = ''; campos.APROVACAO_VALIDA = ''; }
    campos.SITUACAO = novo;
    SGO_DATA.insert(VIA_ABAS.DECISOES, { ID: Via_id_(), SOLICITACAO_ID: r.ID, REVISAO: r.REVISAO, HASH: r.REVISAO_HASH, ETAPA: etapa, DECISAO: decisao, FUNDAMENTACAO: fund, TOTAL: total, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora });
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
    Via_historico_('SOLICITACAO', r.ID, 'DECISAO_' + decisao, eu, { revisao: r.REVISAO, de: VIA_SITUACOES[Via_up_(r.SITUACAO)], para: VIA_SITUACOES[novo], texto: (VIA_ETAPAS[etapa] || etapa) + ': ' + VIA_DECISOES_NOMES[decisao] + '. ' + fund });
    var r2 = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID);
    Via_depois_(function () {
      if (novo === 'AGUARDANDO_DIRETORIA') Via_avisarAprovacao_(r2, 'DIRETORIA', proxima, null, eu);
      Via_avisarDecisao_(r2, decisao, etapa, fund, eu, novo);
      if (novo === 'APROVADA' || (novo === 'CARGA_FEITA' && decisao === 'APROVAR')) Via_avisarFinanceiro_(r2, eu);
    });
    return { r: r2, novo: novo, proxima: proxima };
  });
  var rr = saida.r, m;
  if (saida.novo === 'AGUARDANDO_DIRETORIA') m = 'Aprovação da gerência registrada. A solicitação ' + Via_s_(rr.NUMERO) + ' segue para a Diretoria (' + Via_s_(rr.MOTIVOS_DIRETORIA) + '): ' + Via_nomes_(saida.proxima).join(', ') + '.';
  else if (saida.novo === 'APROVADA' || saida.novo === 'CARGA_FEITA') m = 'Solicitação ' + Via_s_(rr.NUMERO) + ' aprovada (revisão ' + Via_s_(rr.REVISAO) + ', ' + Via_moeda_(rr.APROVADO_TOTAL) + '). O Financeiro foi avisado para fazer a carga no cartão Caju; quem pediu e o responsável pelo dinheiro também.';
  else if (saida.novo === 'DEVOLVIDA') m = 'Solicitação ' + Via_s_(rr.NUMERO) + ' devolvida para ajuste. Quem pediu foi avisado com a sua fundamentação.';
  else m = 'Solicitação ' + Via_s_(rr.NUMERO) + ' negada. Quem pediu foi avisado com a sua fundamentação.';
  return { solicitacao: Via_paraTela_(eu, rr), message: m };
}
function Via_registrarCarga_(eu, d) {
  d = d || {};
  var valor = Via_num_(d.valor), data = Via_dia_(d.data), obs = Via_texto_(d.observacao, 600);
  if (valor === null || !(valor > 0)) throw new Error('Não foi possível registrar a carga: informe o valor carregado no cartão Caju (maior que zero).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Não foi possível registrar a carga: informe a data da carga.');
  if (data > Via_hoje_()) throw new Error('Não foi possível registrar a carga: a data (' + Via_brDia_(data) + ') é futura. Registre depois de fazer a carga no portal do Caju.');
  if (!d.comprovante || !Via_s_(d.comprovante.base64)) throw new Error('Não foi possível registrar a carga: anexe o comprovante da carga (print da tela ou recibo do portal do Caju). Sem o comprovante a situação não muda para "Carga feita".');
  var saida = Via_comTrava_(function () {
    Via_garantirAbas_();
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.carga.pode) throw new Error('Não foi possível registrar a carga na solicitação ' + Via_s_(r.NUMERO) + ': ' + ac.carga.motivo);
    var saldo = ac.carga.saldo;
    if (typeof Via_travaPrestacao_ === 'function') { var tv = Via_travaPrestacao_(Via_s_(r.RESPONSAVEL_ID), Via_s_(r.ID)); if (tv) throw new Error('Não foi possível registrar a carga: ' + tv.texto); }
    if (Via_cent_(valor) > Via_cent_(saldo)) throw new Error('Não foi possível registrar a carga: ' + Via_moeda_(valor) + ' passa do que falta carregar (' + Via_moeda_(saldo) + ' de ' + Via_moeda_(r.APROVADO_TOTAL) + ' aprovados na revisão ' + Via_s_(r.APROVADO_REVISAO) + '). Carga acima do aprovado só depois de nova aprovação: peça a quem pediu para ajustar a solicitação.');
    if (Via_cent_(valor) < Via_cent_(saldo) && obs.length < 10) throw new Error('Não foi possível registrar a carga: o valor (' + Via_moeda_(valor) + ') é menor que o que falta carregar (' + Via_moeda_(saldo) + '). Escreva na observação por que a carga é parcial (10 letras ou mais).');
    var arq = Via_salvarArquivo_(d.comprovante, Via_s_(r.NUMERO), 'Comprovante da carga Caju', 'do comprovante da carga');
    var agora = Via_agora_(), centro = Via_texto_(d.centroCustoCaju, 40) || Via_s_(r.CENTRO_CUSTO_CODIGO);
    var anexoId = Via_id_();
    SGO_DATA.insert(VIA_ABAS.ANEXOS, { ID: anexoId, SOLICITACAO_ID: r.ID, LINHA_ID: '', CATEGORIA: '', TIPO: 'COMPROVANTE_CARGA', NOME: arq.nome, ARQUIVO_ID: arq.id, URL: arq.url, MIME: Via_s_(d.comprovante.tipo),
      TAMANHO: arq.tamanho, SHA: arq.sha, ENVIADO_POR_ID: eu.id, ENVIADO_POR_NOME: eu.nome, ENVIADO_EM: agora });
    SGO_DATA.insert(VIA_ABAS.CARGAS, { ID: Via_id_(), SOLICITACAO_ID: r.ID, REVISAO: r.APROVADO_REVISAO, DATA: data, VALOR: Via_r2_(valor), CENTRO_CUSTO_CAJU: centro, OBSERVACAO: obs,
      COMPROVANTE_ID: anexoId, COMPROVANTE_URL: arq.url, COMPROVANTE_NOME: arq.nome, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora, EXTRATO_ID: '', CONCILIADA_EM: '' });
    var novoTotal = Via_r2_((Number(r.CARREGADO_TOTAL) || 0) + valor);
    var prazoPrest = typeof Via_prazoCalcular_ === 'function' ? Via_prazoCalcular_(r.CHEGADA_EM) : '';
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, { CARREGADO_TOTAL: novoTotal, SITUACAO: 'CARGA_FEITA', PRESTACAO_PRAZO: prazoPrest, PRESTACAO_SITUACAO: 'EM_ABERTO', ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome });
    Via_historico_('SOLICITACAO', r.ID, 'CARGA_REGISTRADA', eu, { revisao: r.APROVADO_REVISAO, de: VIA_SITUACOES[Via_up_(r.SITUACAO)], para: VIA_SITUACOES.CARGA_FEITA,
      texto: 'Carga de ' + Via_moeda_(valor) + ' em ' + Via_brDia_(data) + ' no cartão Caju (centro de custo ' + centro + '). Carregado: ' + Via_moeda_(novoTotal) + ' de ' + Via_moeda_(r.APROVADO_TOTAL) + '.' + (obs ? ' ' + obs : '') });
    var r2 = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID);
    Via_depois_(function () {
      Via_notificar_([Via_s_(r2.RESPONSAVEL_ID), Via_s_(r2.SOLICITANTE_ID)], r2, 'Carga no cartão Caju: ' + Via_s_(r2.NUMERO), 'O Financeiro registrou a carga de ' + Via_moeda_(valor) + ' em ' + Via_brDia_(data) + ' no cartão Caju de ' + Via_s_(r2.RESPONSAVEL_NOME) + ' para a viagem ' + Via_s_(r2.NUMERO) + ' (' + Via_s_(r2.DESTINO_CIDADE) + '/' + Via_s_(r2.DESTINO_UF) + ').\nGaste no cartão Caju e guarde todos os comprovantes (foto ou PDF de cada gasto): a prestação de contas é item a item, no SGO+ (Depósito de viagem > Prestar contas)' + (r2.PRESTACAO_PRAZO ? ', até ' + Via_brDia_(r2.PRESTACAO_PRAZO) : '') + '.', eu.id);
    });
    return { r: r2, valor: valor };
  });
  var falta = Via_r2_((Number(saida.r.APROVADO_TOTAL) || 0) - (Number(saida.r.CARREGADO_TOTAL) || 0));
  return { solicitacao: Via_paraTela_(eu, saida.r), message: 'Carga de ' + Via_moeda_(saida.valor) + ' registrada com o comprovante.' + (falta > 0 ? ' Falta carregar ' + Via_moeda_(falta) + '.' : ' O valor aprovado está todo carregado.') + ' O responsável pelo dinheiro foi avisado.' };
}

// ------------------------------------------------------------
// AVISOS (GS05 pela fila da gestão; os demais pelo notificador comum)
// ------------------------------------------------------------
/** Registra o GS05 na matriz de avisos e o que a Caixa e o Início precisam saber deste módulo. Nunca lança. */
function Via_registrarAvisos_() {
  try {
    var ev = { cod: 'GS05', modulo: VIA_MODULO, evento: 'Pedido de aprovação de depósito de viagem (solicitação discriminada, com o relatório A4)', origem: 'SGO_Viagem.js (ao enviar e ao subir para a Diretoria)',
      publico: 'Aprovador da política de viagem (padrão: Matheus) ou a Diretoria, menos quem pediu e quem viaja', email: 'NAO', whatsapp: 'NAO', limite: '1 por revisão e etapa por pessoa',
      obs: 'Aviso da gestão: e-mail e WhatsApp pela fila da gestão, com o total e o link da solicitação. Gestor recebe no expediente; solicitação urgente (viagem em menos de 2 dias úteis, conforme a política) sai na hora, a qualquer horário; Diretoria a qualquer hora.',
      gestao: 'PENDENCIA' };
    if (typeof AVG_MTZ_EVENTOS !== 'undefined' && Array.isArray(AVG_MTZ_EVENTOS) && !AVG_MTZ_EVENTOS.some(function (x) { return x && x.cod === 'GS05'; })) AVG_MTZ_EVENTOS.push(ev);
    if (typeof AVG_NA_HORA_EVENTOS !== 'undefined' && Array.isArray(AVG_NA_HORA_EVENTOS) && AVG_NA_HORA_EVENTOS.indexOf('GS05') < 0) AVG_NA_HORA_EVENTOS.push('GS05');
    if (typeof AVG_APROVACOES !== 'undefined' && Array.isArray(AVG_APROVACOES)) ['viagem_aprovar', 'viagem_diretoria'].forEach(function (t) { if (AVG_APROVACOES.indexOf(t) < 0) AVG_APROVACOES.push(t); });
    if (typeof AVG_TELA_TIPOS !== 'undefined' && Array.isArray(AVG_TELA_TIPOS) && AVG_TELA_TIPOS.indexOf('viagem') < 0) AVG_TELA_TIPOS.push('viagem');
    if (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES && !MTZ_MODULOS_NOMES[VIA_MODULO]) MTZ_MODULOS_NOMES[VIA_MODULO] = 'Depósito de viagem';
    if (typeof AvG_registrarEventos_ === 'function') AvG_registrarEventos_();
  } catch (e) { try { console.error('Depósito de viagem, registro dos avisos: ' + Via_erro_(e)); } catch (x) {} }
}
function Via_link_() { try { return typeof Ges_linkTela_ === 'function' ? Ges_linkTela_(VIA_TELA) : (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : ''); } catch (e) { return ''; } }
/** Aviso pelo notificador comum (sistema e e-mail). Nunca lança. */
function Via_notificar_(ids, r, titulo, texto, excluirId) {
  try {
    var us = Via_usuarios_(), lista = [];
    (ids || []).forEach(function (id) { id = Via_s_(id); if (id && id !== Via_s_(excluirId) && us[id] && us[id].ativo && lista.indexOf(id) < 0) lista.push(id); });
    if (!lista.length || typeof SGO_notificar_ !== 'function') return { avisados: 0 };
    SGO_notificar_({ usuarios: lista, canais: ['sgo', 'email'], origem: 'VIAGEM', refId: ('VIA-' + Via_s_(r.ID) + '-' + Via_hash8_(titulo + texto)).slice(0, 80), titulo: titulo, texto: texto, link: Via_link_() || undefined });
    return { avisados: lista.length };
  } catch (e) { console.error('Depósito de viagem, aviso: ' + Via_erro_(e)); return { erro: Via_erro_(e) }; }
}
function Via_hash8_(s) { return Via_marca_(s).slice(0, 8); }
function Via_resumoAviso_(r, conf) {
  var c = Via_conteudoDaLinha_(r), linhas = conf ? conf.linhas : Via_calcular_(c, Via_politica_()).linhas;
  var porCat = {};
  linhas.forEach(function (l) { porCat[l.categoria] = (porCat[l.categoria] || 0) + Via_cent_(l.valor); });
  var cats = VIA_CATEGORIAS.filter(function (k) { return porCat[k.cod]; }).map(function (k) { return k.nome + ' ' + Via_moeda_(porCat[k.cod] / 100); }).join('; ');
  return 'O que você aprova: a solicitação ' + Via_s_(r.NUMERO) + ' revisão ' + Via_s_(r.REVISAO) + ', total ' + Via_moeda_(r.TOTAL) + ' (soma das linhas: ' + (cats || 'sem linhas') + ').\n' +
    'Viagem: ' + Via_s_(r.DESTINO_CIDADE) + '/' + Via_s_(r.DESTINO_UF) + ', de ' + Via_br_(r.SAIDA_EM) + ' a ' + Via_br_(r.CHEGADA_EM) + ', equipe de ' + Via_equipeIds_(r).length + ', responsável pelo dinheiro ' + Via_s_(r.RESPONSAVEL_NOME) + '.\n' +
    'Centro de custo: ' + Via_s_(r.CENTRO_CUSTO_CODIGO) + '. Pedido de ' + Via_s_(r.SOLICITANTE_NOME) + '.' + (Via_up_(r.URGENTE) === 'SIM' ? '\nURGENTE: a viagem começa em menos de ' + Via_politica_().urgenteDiasUteis + ' dias úteis.' : '') +
    (Via_s_(r.MOTIVOS_DIRETORIA) ? '\nDiretoria: ' + Via_s_(r.MOTIVOS_DIRETORIA) + '.' : '') + '\nDecida no SGO+ (Depósito de viagem > Aguardando minha decisão), com a fundamentação; o relatório A4 está na solicitação.';
}
/** Pedido de aprovação na hora (GS05). Gestor no expediente; urgente a qualquer hora; quem não é da gestão recebe pelo notificador comum. */
function Via_avisarAprovacao_(r, etapa, ids, conf, eu) {
  try {
    Via_registrarAvisos_();
    var urgente = Via_up_(r.URGENTE) === 'SIM', refId = Via_pendId_(r, etapa);
    var titulo = (urgente ? 'URGENTE · ' : '') + 'Aprovação · Depósito de viagem: ' + Via_s_(r.NUMERO) + ' rev. ' + Via_s_(r.REVISAO) + ' (' + Via_s_(r.DESTINO_CIDADE) + '), total ' + Via_moeda_(r.TOTAL) + ', pedido de ' + Via_s_(r.SOLICITANTE_NOME);
    var texto = Via_resumoAviso_(r, conf), lista = (ids || []).slice(), res = { ids: [] };
    if (typeof SGO_avisoGestaoAprovacaoNaHora_ === 'function') {
      res = SGO_avisoGestaoAprovacaoNaHora_({ evento: 'GS05', modulo: VIA_MODULO, area: '', quem: { id: Via_s_(r.SOLICITANTE_ID), nome: Via_s_(r.SOLICITANTE_NOME) }, destinos: lista,
        soDiretoria: etapa === 'DIRETORIA', qualquerHora: urgente, refId: refId, marco: refId + '|' + Via_s_(r.ENVIADO_EM), titulo: titulo, texto: texto, tela: { tipo: 'viagem', id: Via_s_(r.ID) } }) || { ids: [] };
    }
    var naFila = res.ids || [], fora = lista.filter(function (id) { return naFila.indexOf(id) < 0; });
    if (fora.length) Via_notificar_(fora, r, titulo, texto, Via_s_(r.SOLICITANTE_ID));
    return { gestao: naFila, comuns: fora };
  } catch (e) { console.error('Depósito de viagem, aviso de aprovação: ' + Via_erro_(e)); return { erro: Via_erro_(e) }; }
}
function Via_avisarDecisao_(r, decisao, etapa, fund, eu, novo) {
  var t = decisao === 'APROVAR' ? (novo === 'AGUARDANDO_DIRETORIA' ? 'aprovada pela gerência; segue para a Diretoria' : 'aprovada') : decisao === 'DEVOLVER' ? 'devolvida para ajuste' : 'negada';
  var texto = 'A solicitação ' + Via_s_(r.NUMERO) + ' (revisão ' + Via_s_(r.REVISAO) + ', total ' + Via_moeda_(r.TOTAL) + ') foi ' + t + ' por ' + eu.nome + ' (' + (VIA_ETAPAS[etapa] || etapa) + ').\nFundamentação: ' + fund + '\n' +
    (decisao === 'DEVOLVER' ? 'O que fazer: abra a solicitação no SGO+, ajuste o que foi pedido e envie de novo.' : decisao === 'NEGAR' ? 'A solicitação está encerrada. Se a viagem ainda for necessária, converse com quem decidiu antes de montar outra.' :
      novo === 'AGUARDANDO_DIRETORIA' ? 'Aguarde a Diretoria; você é avisado da decisão.' : 'O Financeiro foi avisado para fazer a carga no cartão Caju de ' + Via_s_(r.RESPONSAVEL_NOME) + '.');
  return Via_notificar_([Via_s_(r.SOLICITANTE_ID), Via_s_(r.RESPONSAVEL_ID)], r, 'Depósito de viagem ' + Via_s_(r.NUMERO) + ': ' + t, texto, eu.id);
}
function Via_avisarFinanceiro_(r, eu) {
  return Via_notificar_(Via_depositantes_(), r, 'Carga a fazer no cartão Caju: ' + Via_s_(r.NUMERO) + ', ' + Via_moeda_(r.APROVADO_TOTAL),
    'A solicitação ' + Via_s_(r.NUMERO) + ' foi aprovada (revisão ' + Via_s_(r.APROVADO_REVISAO) + ', ' + Via_moeda_(r.APROVADO_TOTAL) + ').\nResponsável pelo dinheiro: ' + Via_s_(r.RESPONSAVEL_NOME) + '. Centro de custo: ' + Via_s_(r.CENTRO_CUSTO_CODIGO) + '. Saída: ' + Via_br_(r.SAIDA_EM) + '.\n' +
    'O que fazer: faça a carga no portal do Caju (carteira de despesas do responsável) e registre no SGO+ (Depósito de viagem > Carga no cartão) com a data, o valor e o comprovante.', eu ? eu.id : '');
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS E CAIXA DE DECISÕES
// ------------------------------------------------------------
var VIA_PEND_TIPOS = {
  viagem_aprovar: { modulo: VIA_MODULO, um: 'depósito de viagem aguardando aprovação', varios: 'depósitos de viagem aguardando aprovação', rotulo: 'Aprovar viagem', fazer: 'confira o relatório A4 e decida em Depósito de viagem', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_diretoria: { modulo: VIA_MODULO, um: 'depósito de viagem aguardando a Diretoria', varios: 'depósitos de viagem aguardando a Diretoria', rotulo: 'Aprovar viagem', fazer: 'confira o relatório A4 e decida em Depósito de viagem', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_carga: { modulo: VIA_MODULO, um: 'carga no cartão Caju a registrar', varios: 'cargas no cartão Caju a registrar', rotulo: 'Fazer a carga', fazer: 'faça a carga no portal do Caju e registre em Depósito de viagem > Carga no cartão', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_devolvida: { modulo: VIA_MODULO, um: 'depósito de viagem devolvido para ajuste', varios: 'depósitos de viagem devolvidos para ajuste', rotulo: 'Ajustar', fazer: 'ajuste e envie de novo em Depósito de viagem', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  // E2: prestação de contas, conferência, acerto do saldo e ciência do fechamento
  viagem_prestar: { modulo: VIA_MODULO, um: 'prestação de contas de viagem a fazer', varios: 'prestações de contas de viagem a fazer', rotulo: 'Prestar contas', fazer: 'lance os gastos com o comprovante e envie em Depósito de viagem > Prestar contas', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_conferir: { modulo: VIA_MODULO, um: 'prestação de contas de viagem a conferir', varios: 'prestações de contas de viagem a conferir', rotulo: 'Conferir a prestação', fazer: 'confira item a item em Depósito de viagem > Conferir prestações', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_acerto: { modulo: VIA_MODULO, um: 'acerto de saldo de viagem a registrar', varios: 'acertos de saldo de viagem a registrar', rotulo: 'Registrar o acerto', fazer: 'registre a devolução ou o reembolso em Depósito de viagem > Conferir prestações', tela: { tipo: 'viagem' }, origem: 'VIAGEM' },
  viagem_ciencia: { modulo: VIA_MODULO, um: 'fechamento de viagem aguardando a sua ciência', varios: 'fechamentos de viagem aguardando a sua ciência', rotulo: 'Dar ciência', fazer: 'leia o A4 de fechamento e dê ciência em Depósito de viagem > Aguardando minha decisão', tela: { tipo: 'viagem' }, origem: 'VIAGEM' }
};
var VIA_GES_TIPOS = { viagem_aprovar: { prazo: 1 }, viagem_diretoria: { prazo: 1 } };
function Via_registrarTipos_() {
  try {
    if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(VIA_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = VIA_PEND_TIPOS[k]; });
    if (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS && !PEND_MODULOS[VIA_MODULO]) PEND_MODULOS[VIA_MODULO] = 'Depósito de viagem';
    if (typeof PEND_FONTES !== 'undefined' && Array.isArray(PEND_FONTES) && !PEND_FONTES.some(function (f) { return f && f.nome === 'Depósito de viagem'; })) {
      PEND_FONTES.push({ nome: 'Depósito de viagem', fn: function (add, ctx) { if (!ctx.cliente && typeof Viagem_fontePendencias_ === 'function') Viagem_fontePendencias_(add, ctx); } });
    }
    if (typeof GES_TIPOS !== 'undefined' && GES_TIPOS) Object.keys(VIA_GES_TIPOS).forEach(function (k) { if (!GES_TIPOS[k]) GES_TIPOS[k] = VIA_GES_TIPOS[k]; });
    if (typeof GES_AREA_MODULO_PADRAO !== 'undefined' && GES_AREA_MODULO_PADRAO && !GES_AREA_MODULO_PADRAO[VIA_MODULO]) GES_AREA_MODULO_PADRAO[VIA_MODULO] = 'FINANCEIRO';
    // 11/11/2026: tipos da Conciliação Caju (SGO_Caju.js carrega antes da central; o registro acontece aqui)
    if (typeof Cju_registrarTipos_ === 'function') Cju_registrarTipos_();
  } catch (e) { try { console.error('Depósito de viagem, registro na central: ' + Via_erro_(e)); } catch (x) {} }
}
function Via_pendId_(r, etapa) { return 'VIA:' + (etapa === 'DIRETORIA' ? 'DIR' : 'APR') + ':' + Via_s_(r.ID) + ':' + Via_s_(r.REVISAO); }
/** Itens da central (e da Caixa de decisões): aprovar (aprovador ou Diretoria), carga (Financeiro) e devolvida (quem pediu). Sem valores no título. */
function Viagem_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  Via_registrarTipos_();
  if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.viagem_aprovar) return;
  if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(VIA_ABAS.SOLICITACOES)) return;
  var hoje = Via_hoje_(), dep = null;
  Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (r) {
    var s = Via_up_(r.SITUACAO), num = Via_s_(r.NUMERO), dest = Via_s_(r.DESTINO_CIDADE) + '/' + Via_up_(r.DESTINO_UF), urg = Via_up_(r.URGENTE) === 'SIM';
    var tela = { tipo: 'viagem', id: Via_s_(r.ID) };
    if (s === 'AGUARDANDO_APROVACAO' || s === 'AGUARDANDO_DIRETORIA') {
      var dir = s === 'AGUARDANDO_DIRETORIA', conflito = Via_conflito_(r);
      if (Via_soDiretoria_()) dir = true; // 16/11/2026: com SIM, o que aguardava a gerência vai para o dono e a Diretoria
      var ids = Via_soDiretoria_() ? Via_aprovadoresSoDir_(conflito) : dir ? Via_aprovadoresDiretoria_(conflito.concat([Via_s_(r.GERENCIA_APROVADOR_ID)].filter(Boolean))) : Via_aprovadoresGerencia_(conflito);
      add(Pend_item_(dir ? 'viagem_diretoria' : 'viagem_aprovar', {
        id: Via_pendId_(r, dir ? 'DIRETORIA' : 'GERENCIA'), nome: num, publico: 'PESSOA', paraUsuarios: ids, responsavel: Via_s_(r.SOLICITANTE_NOME), responsavelId: Via_s_(r.SOLICITANTE_ID),
        gravidade: urg ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: (urg ? 'Urgente: ' : '') + 'aprovar o depósito de viagem ' + num + ' (' + dest + ', saída ' + Via_brDia_(r.SAIDA_EM) + ')' + (dir ? ' — etapa da Diretoria' : ''),
        detalhe: 'Pedido de ' + Via_s_(r.SOLICITANTE_NOME) + ', revisão ' + Via_s_(r.REVISAO) + ', centro de custo ' + Via_s_(r.CENTRO_CUSTO_CODIGO) + '.' + (dir ? ' Diretoria: ' + Via_s_(r.MOTIVOS_DIRETORIA) + '.' : ''),
        oQueFazer: 'Abra Depósito de viagem > Aguardando minha decisão, confira o relatório A4 e aprove, devolva ou negue com a fundamentação.', tela: tela,
        extra: dir ? { soDiretoria: true, naoPode: conflito.concat([Via_s_(r.GERENCIA_APROVADOR_ID)].filter(Boolean)) } : { decisor: ids[0] || '', motivoDecisor: 'Aprovador da política de viagem.', naoPode: conflito }
      }));
    }
    // 11/11/2026: com pedido de crédito no Caju em andamento, a pendência é a do pedido (caju_pedido), não a da carga
    var pedCaju = typeof Cju_pedidoEmAndamentoDe_ === 'function' ? Cju_pedidoEmAndamentoDe_(r.ID) : null;
    if (!pedCaju && (s === 'APROVADA' || s === 'CARGA_FEITA') && Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0)) > 0) {
      if (dep === null) dep = Via_depositantes_();
      var fazem = dep.filter(function (id) { return Via_equipeIds_(r).indexOf(id) < 0; });
      add(Pend_item_('viagem_carga', {
        id: 'VIA:CARGA:' + Via_s_(r.ID) + ':' + Via_s_(r.APROVADO_REVISAO), nome: num, publico: 'PESSOA', paraUsuarios: fazem, responsavel: Via_s_(r.RESPONSAVEL_NOME), responsavelId: Via_s_(r.RESPONSAVEL_ID),
        gravidade: Via_dia_(r.SAIDA_EM) <= Via_somarDias_(hoje, 1) ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: 'Carga no cartão Caju: ' + num + ' (' + dest + ', saída ' + Via_brDia_(r.SAIDA_EM) + ')',
        detalhe: 'Aprovada na revisão ' + Via_s_(r.APROVADO_REVISAO) + '. Responsável pelo dinheiro: ' + Via_s_(r.RESPONSAVEL_NOME) + '.',
        oQueFazer: 'Faça a carga no portal do Caju e registre em Depósito de viagem > Carga no cartão, com o comprovante.', tela: tela
      }));
    }
    if (typeof Via_pendenciasPrestacao_ === 'function') Via_pendenciasPrestacao_(add, r, hoje);
    if (s === 'DEVOLVIDA') {
      add(Pend_item_('viagem_devolvida', {
        id: 'VIA:DEV:' + Via_s_(r.ID) + ':' + Via_s_(r.REVISAO), nome: num, publico: 'PESSOA', paraUsuarios: [Via_s_(r.SOLICITANTE_ID)], responsavel: Via_s_(r.SOLICITANTE_NOME), responsavelId: Via_s_(r.SOLICITANTE_ID),
        gravidade: urg ? 'CRITICO' : 'ATENCAO', dias: null, titulo: 'Ajuste o depósito de viagem ' + num + ' (devolvido)', detalhe: 'Leia a fundamentação de quem devolveu na solicitação.',
        oQueFazer: 'Abra Depósito de viagem > Minhas solicitações, ajuste e envie de novo.', tela: tela
      }));
    }
  });
  // 11/11/2026: pedidos de crédito e divergências da Conciliação Caju (SGO_Caju.js)
  if (typeof Cju_fontePendencias_ === 'function') Cju_fontePendencias_(add);
}

// ------------------------------------------------------------
// OPÇÕES DA TELA
// ------------------------------------------------------------
function Via_opcoes_(eu) {
  var us = Via_usuarios_(), pol = Via_politica_();
  var pessoas = Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return u.ativo; })
    .map(function (u) { return { id: u.id, nome: u.nome, perfil: u.perfil, area: u.area, vinculo: u.vinculo }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  var clientes = [];
  try { clientes = Via_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) { return Via_up_(c.STATUS || 'ATIVO') !== 'INATIVO' && !Via_s_(c.EXCLUIDO_EM); })
    .map(function (c) { return { id: Via_s_(c.ID), nome: Via_s_(c.NOME_FANTASIA) || Via_s_(c.RAZAO_SOCIAL) || Via_s_(c.NOME) }; }).filter(function (c) { return c.nome; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }); } catch (e) { clientes = []; }
  var veiculos = [];
  try { veiculos = Via_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return ['INATIVO', 'BAIXADO', 'VENDIDO'].indexOf(Via_up_(v.STATUS)) < 0; })
    .map(function (v) { return { id: Via_s_(v.ID), nome: [Via_s_(v.PLACA), Via_s_(v.MODELO), Via_s_(v.APELIDO)].filter(Boolean).join(' · ') }; }).filter(function (v) { return v.nome; }); } catch (e) { veiculos = []; }
  var refs = [];
  try { if (typeof ComPr_referencias_ === 'function') refs = ComPr_referencias_().slice(0, 600).map(function (r) { return { destino: r.destino, km: r.km }; }); } catch (e) { refs = []; }
  return { cores: VIA_CORES, tetoCats: VIA_TETO_CATS, centros: Via_centros_(true), pessoas: pessoas, clientes: clientes, veiculos: veiculos, referenciasKm: refs, politica: Via_politicaParaTela_(pol),
    categorias: VIA_CATEGORIAS, vinculos: VIA_VINCULOS, funcoes: VIA_FUNCOES, veiculoTipos: VIA_VEICULOS, situacoes: VIA_SITUACOES,
    ufs: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'],
    minimos: { fundamentacao: VIA_FUNDAMENTACAO_MIN, justificativa: VIA_JUSTIFICATIVA_MIN }, prestacao: typeof Via_opcoesPrestacao_ === 'function' ? Via_opcoesPrestacao_() : null };
}
function Via_listar_(eu, aba) {
  var pod = Via_poderes_(eu), todas = Via_ler_(VIA_ABAS.SOLICITACOES), l;
  aba = Via_s_(aba) || 'minhas';
  if (aba === 'minhas') l = todas.filter(function (r) { return Via_s_(r.SOLICITANTE_ID) === eu.id || Via_equipeIds_(r).indexOf(eu.id) >= 0; });
  else if (aba === 'decidir') l = todas.filter(function (r) { var s = Via_up_(r.SITUACAO); if (VIA_AGUARDANDO.indexOf(s) < 0 && s !== 'AGUARDANDO_CIENCIA') return false; var ac = Via_acoes_(eu, r, pod); return ac.decidir.pode || !!(ac.ciencia && ac.ciencia.pode); });
  else if (aba === 'prestar') l = todas.filter(function (r) { return Via_prestarEsperaPor_(eu, r); });
  else if (aba === 'conferir') {
    if (!pod.VIAGEM_CONFERIR) throw new Error('Não foi possível abrir "Conferir prestações": é do Financeiro (caixa «' + Via_nomeCaixa_('VIAGEM_CONFERIR') + '»). Para prestar contas das suas viagens, use "Prestar contas".');
    l = todas.filter(function (r) { return ['PRESTACAO_ENVIADA', 'ACERTO_PENDENTE'].indexOf(Via_up_(r.SITUACAO)) >= 0; });
  }
  else if (aba === 'carga') {
    if (!pod.VIAGEM_DEPOSITAR) throw new Error('Não foi possível abrir "Carga no cartão": é do Financeiro (caixa «' + Via_nomeCaixa_('VIAGEM_DEPOSITAR') + '»). Para acompanhar as suas viagens, use "Minhas solicitações".');
    l = todas.filter(function (r) { return ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0 && Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0)) > 0; });
  } else if (aba === 'todas') {
    if (!pod.VIAGEM_VER_TODAS) throw new Error('Não foi possível abrir "Todas": é da gerência, do Financeiro e da Diretoria (caixa «' + Via_nomeCaixa_('VIAGEM_VER_TODAS') + '»). As suas viagens estão em "Minhas solicitações".');
    l = todas;
  } else throw new Error('Não foi possível abrir a lista: aba desconhecida. Atualize a página (F5).');
  return l.map(Via_resumo_).sort(function (a, b) { return (b.urgente - a.urgente) || b.atualizadoIso.localeCompare(a.atualizadoIso); });
}
function Via_contagens_(eu, pod) {
  var todas = Via_ler_(VIA_ABAS.SOLICITACOES);
  return {
    decidir: todas.filter(function (r) { return VIA_AGUARDANDO.indexOf(Via_up_(r.SITUACAO)) >= 0 && Via_acoes_(eu, r, pod).decidir.pode; }).length,
    carga: pod.VIAGEM_DEPOSITAR ? todas.filter(function (r) { return ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0 && Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0)) > 0; }).length : 0,
    devolvidas: todas.filter(function (r) { return Via_up_(r.SITUACAO) === 'DEVOLVIDA' && Via_s_(r.SOLICITANTE_ID) === eu.id; }).length,
    ciencia: todas.filter(function (r) { if (Via_up_(r.SITUACAO) !== 'AGUARDANDO_CIENCIA') return false; var ac = Via_acoes_(eu, r, pod); return !!(ac.ciencia && ac.ciencia.pode); }).length,
    prestar: todas.filter(function (r) { return Via_prestarEsperaPor_(eu, r, true); }).length,
    conferir: pod.VIAGEM_CONFERIR ? todas.filter(function (r) { if (['PRESTACAO_ENVIADA', 'ACERTO_PENDENTE'].indexOf(Via_up_(r.SITUACAO)) < 0) return false; var ac = Via_acoes_(eu, r, pod); return !!((ac.conferir && ac.conferir.pode) || (ac.acerto && ac.acerto.pode)); }).length : 0
  };
}

// ------------------------------------------------------------
// ENTRADA ÚNICA DA TELA
// ------------------------------------------------------------
/**
 * acao: iniciar | opcoes | listar | abrir | salvar | anexar | removerAnexo | enviar | retirar | cancelar | decidir | registrarCarga |
 *       documento | politica | salvarPolitica | centros | salvarCentro | conferirCentro | painel (Kanban e Gantt) | relatorio (A4 do período) |
 *       E2: lerComprovante | lancarGasto | removerGasto | enviarPrestacao | conferirItem | devolverPrestacao | concluirConferencia |
 *       registrarAcerto | darCiencia | liberarTrava | fechamento (A4 de fechamento) | dadosConciliacao. Nunca lança: { ok, ... } ou { ok: false, message }.
 */
function Viagem_api(sessionId, acao, dados) {
  try {
    dados = dados || {};
    if (typeof Cju_memoLimpar_ === 'function') Cju_memoLimpar_();
    var eu = Via_eu_(sessionId), r;
    acao = Via_s_(acao);
    switch (acao) {
      case 'iniciar': {
        var pod = Via_poderes_(eu);
        var cont = { decidir: 0, carga: 0, devolvidas: 0, ciencia: 0, prestar: 0, conferir: 0 };
        try { cont = Via_contagens_(eu, pod); } catch (e) { /* sem as abas ainda */ }
        r = { poderes: pod, eu: { id: eu.id, nome: eu.nome, perfil: eu.perfil }, contagens: cont, motor: typeof SGO_pode_ === 'function' };
        // 11/11/2026: relatórios A4 da Conciliação Caju (individual do próprio colaborador; geral para quem vê a conciliação)
        if (typeof Cju_pode_ === 'function') r.caju = { ver: Cju_pode_(eu, 'CAJU_VER'), carga: Cju_pode_(eu, 'CAJU_CARGA') };
        break;
      }
      case 'opcoes': r = Via_opcoes_(eu); break;
      case 'listar': r = { itens: Via_listar_(eu, dados.aba), aba: Via_s_(dados.aba) || 'minhas' }; break;
      case 'abrir': { var s = Via_solicitacao_(dados.id), pd = Via_poderes_(eu); Via_exigirVer_(eu, s, pd); r = { solicitacao: Via_paraTela_(eu, s, pd) }; break; }
      case 'salvar': r = Via_salvar_(eu, dados); break;
      case 'anexar': r = Via_anexar_(eu, dados); break;
      case 'removerAnexo': r = Via_removerAnexo_(eu, dados); break;
      case 'enviar': r = Via_enviar_(eu, dados); break;
      case 'retirar': r = Via_retirar_(eu, dados); break;
      case 'cancelar': r = Via_cancelar_(eu, dados); break;
      case 'decidir': r = Via_decidir_(eu, dados); break;
      case 'registrarCarga': r = Via_registrarCarga_(eu, dados); break;
      case 'documento': {
        var sd = Via_solicitacao_(dados.id);
        Via_exigirVer_(eu, sd);
        r = { html: Via_documentoHtml_(sd, dados.revisao) };
        break;
      }
      case 'politica': r = { politica: Via_politicaParaTela_(Via_politica_()), versoes: Via_versoesPolitica_(), podeAlterar: Via_pode_(eu, 'VIAGEM_POLITICA') }; break;
      case 'salvarPolitica': r = Via_salvarPolitica_(eu, dados); r.versoes = Via_versoesPolitica_(); r.podeAlterar = true; break;
      case 'centros': r = { centros: Via_centros_(false, true), podeAlterar: Via_pode_(eu, 'VIAGEM_CENTRO_CUSTO'), areas: Via_areas_(), unidades: VIA_UNIDADES }; r.resumo = Via_centrosResumo_(r.centros); break;
      case 'salvarCentro': r = Via_salvarCentro_(eu, dados); r.centros = Via_centros_(false, true); r.resumo = Via_centrosResumo_(r.centros); r.podeAlterar = true; r.areas = Via_areas_(); r.unidades = VIA_UNIDADES; break;
      case 'conferirCentro': r = Via_conferirCentro_(eu, dados); r.centros = Via_centros_(false, true); r.resumo = Via_centrosResumo_(r.centros); r.podeAlterar = true; r.areas = Via_areas_(); r.unidades = VIA_UNIDADES; break;
      case 'painel': r = Via_painel_(eu); break;
      case 'relatorio': r = Via_relatorio_(eu, dados); break;
      // E2: prestação de contas, conferência, acerto, fechamento e trava (SGO_Viagem_Prestacao.js e SGO_Viagem_Fechamento.js)
      case 'lerComprovante': r = Via_lerComprovante_(eu, dados); break;
      case 'lancarGasto': r = Via_lancarGasto_(eu, dados); break;
      case 'removerGasto': r = Via_removerGasto_(eu, dados); break;
      case 'enviarPrestacao': r = Via_enviarPrestacao_(eu, dados); break;
      case 'conferirItem': r = Via_conferirItem_(eu, dados); break;
      case 'devolverPrestacao': r = Via_devolverPrestacao_(eu, dados); break;
      case 'concluirConferencia': r = Via_concluirConferencia_(eu, dados); break;
      case 'registrarAcerto': r = Via_registrarAcerto_(eu, dados); break;
      case 'darCiencia': r = Via_darCiencia_(eu, dados); break;
      case 'liberarTrava': r = Via_liberarTrava_(eu, dados); break;
      case 'fechamento': { var sf = Via_solicitacao_(dados.id); Via_exigirVer_(eu, sf); r = { html: Via_fechamentoHtml_(sf, eu), nomeArquivo: 'Fechamento_' + Via_s_(sf.NUMERO) + '.html' }; break; }
      case 'dadosConciliacao': r = Via_dadosConciliacaoApi_(eu, dados); break;
      default: throw new Error('Não foi possível concluir: ação desconhecida no Depósito de viagem. Atualize a página (F5) e tente de novo.');
    }
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: Via_erro_(e) };
  }
}

// registro na matriz de avisos, na central de pendências e na Caixa de decisões (os arquivos delas carregam antes deste)
Via_registrarAvisos_();
Via_registrarTipos_();
