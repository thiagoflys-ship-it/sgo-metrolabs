const SGO_ALERTAS = (() => {
  const SHEET_DOCS = "DOC_DOCUMENTOS";
  const STATUS_ATIVO = "ATIVO";

  function obterAlertasDashboard(sessionId) {
    const sessao = exigirSessao(sessionId);
    const documentos = SGO_DATA.getAll(SHEET_DOCS);
    const alertas = [];

    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    
    // OTIMIZAÇÃO: Busca o clienteId direto da memória da sessão, poupando uma leitura extra no banco CAD_USUARIOS
    const idClienteReal = isCliente ? SGO_UTILS.safe(sessao.clienteId) : "";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Puxa da configuração global, se não achar usa 30 dias como padrão, com validação de segurança ("typeof")
    const diasAviso = (typeof SGO_CFG !== "undefined" && SGO_CFG.ALERTAS && SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO) 
                      ? SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO 
                      : 30;

    documentos.forEach(doc => {
      // Ignora documentos inativos ou pendentes
      if (SGO_UTILS.safeUpper(doc.STATUS) !== STATUS_ATIVO) return;
      
      // Regra de Isolamento do Portal do Cliente
      if (isCliente && SGO_UTILS.safe(doc.CLIENTE_ID) !== idClienteReal) return;

      if (doc.DATA_VENCIMENTO) {
        // Tenta fazer o parse da data. Como implementamos o padrão ISO nas outras abas, 
        // precisamos separar o "T" caso o banco retorne "YYYY-MM-DDTHH:mm:ss"
        let dataStr = String(doc.DATA_VENCIMENTO).trim();
        if (dataStr.includes("T")) dataStr = dataStr.split("T")[0];
        // Também aceita dd/mm/aaaa (vencimentos gravados por outros módulos);
        // antes esses documentos nunca geravam alerta.
        const br = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (br) dataStr = br[3] + "-" + br[2] + "-" + br[1];

        const partes = dataStr.split("-");
        
        if (partes.length === 3) {
          const dataVenc = new Date(partes[0], partes[1] - 1, partes[2]);
          dataVenc.setHours(0, 0, 0, 0);
          
          const diffTime = dataVenc.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= diasAviso && diffDays >= 0) {
            alertas.push({
              tipo: "ATENÇÃO",
              mensagem: `O documento '${doc.NOME_ARQUIVO}' (${doc.TIPO_DOCUMENTO}) vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}.`,
              dias: diffDays,
              origem: "DOCUMENTO"
            });
          } else if (diffDays < 0) {
            alertas.push({
              tipo: "CRÍTICO",
              mensagem: `O documento '${doc.NOME_ARQUIVO}' (${doc.TIPO_DOCUMENTO}) está vencido há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'}.`,
              dias: diffDays,
              origem: "DOCUMENTO"
            });
          }
        }
      }
    });

    // Padrões de referência (Certificado de Calibração, CAD_PADROES) —
    // mesma janela de aviso, mas VALIDADE é dd/mm/aaaa (não ISO como
    // DATA_VENCIMENTO). Sheet pode ainda não existir em instalações onde
    // ninguém abriu o módulo Certificado de Calibração ainda — checa
    // antes de ler pra não derrubar o dashboard inteiro por causa disso.
    // Sem trava de cliente: padrão é ativo interno do laboratório, todo
    // usuário staff precisa ver ("nunca ser pego de surpresa").
    try {
      const ss = SGO_DATA.getDB();
      if (!isCliente && ss.getSheetByName(SGO_CFG.SHEETS.CAD_PADROES)) {
        const padroes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES);
        padroes.forEach(p => {
          if (SGO_UTILS.safeUpper(p.STATUS) !== STATUS_ATIVO) return;
          const validade = CertCal_classificarValidadePadrao_(p.VALIDADE);
          if (validade.diasRestantes === null) {
            alertas.push({ tipo: "ATENÇÃO", mensagem: `O padrão de referência '${p.TAG}': ${validade.label}.`, dias: null, origem: "PADRAO" });
            return;
          }
          const diffDays = validade.diasRestantes;

          if (diffDays <= diasAviso && diffDays >= 0) {
            alertas.push({
              tipo: "ATENÇÃO",
              mensagem: `O padrão de referência '${p.TAG}' (${p.DESCRICAO}) vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}.`,
              dias: diffDays,
              origem: "PADRAO"
            });
          } else if (diffDays < 0) {
            alertas.push({
              tipo: "CRÍTICO",
              mensagem: `O padrão de referência '${p.TAG}' (${p.DESCRICAO}) está vencido há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'}.`,
              dias: diffDays,
              origem: "PADRAO"
            });
          }
        });
      }
    } catch (e) {
      // Nunca deixa uma falha aqui derrubar os alertas de documentos, que
      // já funcionavam antes desta extensão.
      SGO_DATA.log("ALERTAS_PADROES_FALHOU", sessao.usuario, e.message, "ALERTAS");
    }

    // Manutenção de veículos (Frota, REG_FROTA_MANUTENCAO) — vencimento
    // por KM rodado e/ou data, calculado por Frota_calcularAlertasManutencao_
    // (SGO_Frota_Main.js, mesmo escopo global). Mesma trava/guarda que os
    // Padrões: sem cliente, sheet pode não existir ainda.
    try {
      const ss2 = SGO_DATA.getDB();
      if (!isCliente && ss2.getSheetByName(SGO_CFG.SHEETS.CAD_VEICULOS) && typeof Frota_calcularAlertasManutencao_ === "function") {
        Frota_calcularAlertasManutencao_().forEach(a => {
          const critico = a.status === "VENCIDO";
          const ehDocumento = a.categoria === "DOCUMENTO";
          const ehCnh = a.categoria === "CNH";
          const ehQualidade = a.categoria === "QUALIDADE";
          if (ehQualidade) {
            alertas.push({
              tipo: "ATENÇÃO",
              mensagem: `O veículo '${a.veiculoPlaca}' tem uma multa (${a.vencimento}) sem condutor vinculado — indique em Frota > Multas.`,
              dias: 0,
              origem: "FROTA"
            });
            return;
          }
          const rotulo = ehCnh ? "a CNH" : (ehDocumento ? `o documento '${a.tipoLabel}'` : `a manutenção '${a.tipoLabel}'`);
          const sujeito = ehCnh ? `O condutor '${a.veiculoPlaca}'` : `O veículo '${a.veiculoPlaca}'`;
          alertas.push({
            tipo: critico ? "CRÍTICO" : "ATENÇÃO",
            mensagem: critico
              ? `${sujeito} está com ${rotulo} ${ehDocumento && !ehCnh ? 'vencido' : 'vencida'}.`
              : `${sujeito} está com ${rotulo} vencendo em breve.`,
            dias: critico ? -1 : 15,
            origem: "FROTA"
          });
        });
      }
    } catch (e) {
      SGO_DATA.log("ALERTAS_FROTA_FALHOU", sessao.usuario, e.message, "ALERTAS");
    }

    // Ordena do mais urgente (negativos/vencidos primeiro) para os mais distantes
    // Alerta sem data (validade ilegível) vai para o topo, junto dos vencidos.
    alertas.sort((a, b) => ((a.dias === null ? -1e9 : a.dias) - (b.dias === null ? -1e9 : b.dias)));

    // Adicionado log padronizado para as 6 colunas do SYS_LOGS
    SGO_DATA.log("ALERTAS_CONSULTA", sessao.usuario, "Alertas do dashboard carregados. Total gerado: " + alertas.length, "ALERTAS");

    return { success: true, items: alertas };
  }

  return { obterAlertasDashboard };
})();

/* =========================
   WRAPPERS PARA GOOGLE.SCRIPT.RUN COM BLINDAGEM JSON
========================= */
function alertasObterDashboard(sessionId) {
  try {
    return JSON.parse(JSON.stringify(SGO_ALERTAS.obterAlertasDashboard(sessionId)));
  } catch (e) {
    return { success: false, message: SGO_textoFalhaOperador_('carregar os alertas', e) };
  }
}
