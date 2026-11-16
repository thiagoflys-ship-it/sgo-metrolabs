/****************************************************
 * FROTA — CONFIG
 *
 * Módulo de controle de frota de veículos: cadastro de veículos e
 * condutores, movimentação (retirada/devolução com checklist de
 * não-conformidades + fotos), manutenção (com alerta de vencimento por
 * KM/data, mesmo esquema de CAD_PADROES no Certificado de Calibração),
 * despesas e paradas.
 ****************************************************/
var FROTA_CFG = Object.freeze({

  APP_TITLE: 'Frota',

  // Checklist padrão de vistoria — usado IGUAL na retirada e na devolução
  // do veículo, pra dar pra comparar e ver o que apareceu de novo durante
  // o uso. Agrupado por área (não é o diagrama numerado do carro, é uma
  // lista equivalente — mais rápida de manter e não depende de imagem).
  GRUPOS_CHECKLIST: Object.freeze([
    Object.freeze({ grupo: 'Frente', itens: Object.freeze(['Para-choque dianteiro', 'Capô', 'Para-brisa', 'Faróis', 'Grade/Radiador', 'Retrovisores']) }),
    Object.freeze({ grupo: 'Traseira', itens: Object.freeze(['Para-choque traseiro', 'Porta-malas', 'Vidro traseiro', 'Lanternas traseiras']) }),
    Object.freeze({
      grupo: 'Laterais', itens: Object.freeze([
        'Porta dianteira esquerda', 'Porta traseira esquerda', 'Porta dianteira direita', 'Porta traseira direita',
        'Vidros laterais', 'Teto', 'Rodas/Pneus dianteiros', 'Rodas/Pneus traseiros', 'Estepe'
      ])
    }),
    Object.freeze({ grupo: 'Interior', itens: Object.freeze(['Bancos', 'Painel/Instrumentos', 'Cintos de segurança', 'Ar-condicionado', 'Som/Rádio']) }),
    Object.freeze({ grupo: 'Itens obrigatórios', itens: Object.freeze(['Triângulo', 'Macaco', 'Chave de roda', 'Extintor', 'Documento do veículo (CRLV)']) })
  ]),

  // Tipos de manutenção com intervalo SUGERIDO (o operador pode mudar o
  // valor na hora de registrar — isto é só o valor padrão que já vem
  // preenchido, evita digitar toda vez pros casos comuns).
  TIPOS_MANUTENCAO: Object.freeze([
    // 30/10/2026 (plano de manutenção, decisão do dono pela recomendação do estudo): óleo em uso severo (5.000 km ou 6 meses);
    // tipos novos para os itens do plano (fluido de freio, alinhamento, arrefecimento, bateria). Ver SGO_Frota_PlanoManutencao.js.
    Object.freeze({ codigo: 'OLEO', label: 'Troca de óleo', intervaloKm: 5000, intervaloMeses: 6 }),
    Object.freeze({ codigo: 'FILTRO_OLEO', label: 'Filtro de óleo', intervaloKm: 5000, intervaloMeses: 6 }),
    Object.freeze({ codigo: 'FILTRO_AR', label: 'Filtro de ar', intervaloKm: 10000, intervaloMeses: 12 }),
    Object.freeze({ codigo: 'FILTRO_COMBUSTIVEL', label: 'Filtro de combustível', intervaloKm: 20000, intervaloMeses: 12 }),
    Object.freeze({ codigo: 'PNEUS', label: 'Troca de pneus', intervaloKm: 40000, intervaloMeses: null }),
    Object.freeze({ codigo: 'ALINHAMENTO', label: 'Rodízio, alinhamento e balanceamento', intervaloKm: 10000, intervaloMeses: null }),
    Object.freeze({ codigo: 'FREIOS', label: 'Pastilhas/Discos de freio', intervaloKm: 10000, intervaloMeses: null }),
    Object.freeze({ codigo: 'FLUIDO_FREIO', label: 'Fluido de freio', intervaloKm: null, intervaloMeses: 24 }),
    Object.freeze({ codigo: 'ARREFECIMENTO', label: 'Líquido de arrefecimento', intervaloKm: null, intervaloMeses: 24 }),
    Object.freeze({ codigo: 'BATERIA', label: 'Bateria (teste ou troca)', intervaloKm: null, intervaloMeses: 12 }),
    Object.freeze({ codigo: 'CORREIA', label: 'Correia dentada/acessórios', intervaloKm: 60000, intervaloMeses: null }),
    Object.freeze({ codigo: 'REVISAO', label: 'Revisão geral/motor', intervaloKm: 10000, intervaloMeses: 12 }),
    Object.freeze({ codigo: 'OUTRO', label: 'Outro', intervaloKm: null, intervaloMeses: null })
  ]),

  // Pedágio removido (2026-08-28, pedido do usuário — a frota usa tag
  // automática, não faz sentido lançar manual). Painel "Registrar despesa"
  // (que usava essa lista) foi removido do ConteudoModulo pelo mesmo
  // motivo: Combustível/Manutenção/Multa já têm fluxo próprio mais
  // detalhado (com comprovante, no caso de Combustível).
  TIPOS_DESPESA: Object.freeze(['Combustível', 'Estacionamento', 'Multa', 'Lavagem', 'Manutenção', 'Outro']),

  // Central de documentos do veículo (Fase 2, 2026-08-25) — categorias com
  // vencimento (CRLV, seguro, licenciamento) entram no mesmo alarme de
  // manutenção da dashboard/menu quando a VALIDADE estiver vazia = documento
  // sem prazo (ex.: laudo de vistoria avulso), não entra no alarme.
  TIPOS_DOCUMENTO: Object.freeze(['CRLV', 'Seguro', 'Licenciamento', 'IPVA', 'Laudo de Vistoria', 'Nota Fiscal', 'Outro']),

  // Abastecimentos (Fase 6, 2026-08-25) — litros/valor por posto, usado
  // pra calcular consumo médio (km/L) e custo por km no relatório.
  TIPOS_COMBUSTIVEL: Object.freeze(['Gasolina', 'Etanol', 'Diesel', 'Diesel S10', 'GNV', 'Flex', 'Elétrico']),

  // Janela de aviso de manutenção vencendo — mesmo padrão (30 dias) já
  // usado pros Padrões de Referência do Certificado de Calibração; pra
  // KM, usa uma margem equivalente (500km) como "vencendo em breve".
  DIAS_AVISO_VENCIMENTO: 30,
  KM_AVISO_VENCIMENTO: 500,

  UPLOAD_FOLDER_PROP: 'FROTA_UPLOAD_FOLDER_ID'
});
