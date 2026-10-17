/**
 * Divide um texto em parágrafos HTML (<p>...</p>) por linha em branco —
 * mesmo padrão já usado nos módulos de hoje do Portal SGO+ (Declaração/
 * QI-QO/Relatório de Calibração) pra texto gerado por IA, que costuma vir
 * com vários parágrafos separados por linha em branco.
 */
function PlanCMEDoc_paragrafosHtml_(texto) {
  const partes = String(texto || "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (!partes.length) return "<p>-</p>";
  return partes.map(p => "<p>" + PlanCME_escaparHtml_(p) + "</p>").join("\n");
}

/**
 * CSS do documento único — mesmo padrão visual "folha A4" já usado hoje
 * nos módulos do Portal SGO+ (Declaração de Execução de Serviço/QI-QO/
 * Relatório de Calibração), replicado aqui verbatim (classes/valores)
 * porque este é um projeto Apps Script separado, sem escopo global
 * compartilhado com o Portal (2026-07-26, a pedido do usuário: "entra lá
 * no módulo e traz pra cá").
 */
function PlanCME_getCss_() {
  const css = [];
  css.push('@page { size: A4; margin: 18mm 16mm; }');
  css.push('* { box-sizing: border-box; }');
  css.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  css.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 28px 34px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  css.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #0b4ea2; padding-bottom: 14px; margin-bottom: 20px; }');
  css.push('.logo-topo { height: 46px; }');
  css.push('.titulo-doc { text-align:right; }');
  css.push('.titulo-doc h1 { font-size: 18px; margin: 0; color:#0b4ea2; }');
  css.push('.titulo-doc small { color:#6b7280; }');
  css.push('table.dados { width:100%; border-collapse: collapse; margin-bottom: 18px; }');
  css.push('table.dados td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.dados td.rotulo { background:#f3f4f6; font-weight:700; width: 190px; color:#374151; }');
  css.push('.secao { margin-top: 26px; }');
  // Fundamentação Técnica pode juntar QI+QO+QD e passar de 1 página — "avoid" no bloco
  // inteiro é ignorado pelo navegador nesse caso e a quebra cai em qualquer ponto do
  // texto (ex.: no meio de "ABNT NBR 16328:2024"). Cada QI/QO/QD vira uma .subsecao
  // menor com seu próprio page-break-inside: avoid, que o navegador consegue respeitar.
  css.push('.secao-fundamentacao { page-break-inside: auto; }');
  css.push('.subsecao { page-break-inside: avoid; margin-bottom: 14px; }');
  css.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('.secao h3 { font-size: 12.5px; color:#0b4ea2; margin: 14px 0 6px; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('p, li { text-align: justify; margin: 8px 0; orphans: 3; widows: 3; }');
  css.push('table.tabela-itens { width:100%; border-collapse: collapse; margin: 10px 0 4px; }');
  css.push('table.tabela-itens th, table.tabela-itens td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.tabela-itens th { background:#f3f4f6; text-align:left; }');
  css.push('.destaque { background:#f3f4f6; border-left: 4px solid #0b4ea2; padding: 14px 16px; margin-top: 14px; page-break-inside: avoid; }');
  css.push('.destaque.alerta { border-left-color: #d97706; background:#fffbeb; }');
  // campo-eru + rodape-final abaixo: alturas/margens enxutas de propósito —
  // texto gerado por IA varia de tamanho a cada documento, então o espaço
  // sobrando na última página nunca é garantido; encolher esses blocos fixos
  // recupera espaço que, em muitos casos, é a diferença entre a assinatura
  // caber na mesma página do resto ou pular sozinha para uma página quase
  // vazia (achado real 2026-07-28, reportado pelo usuário). Não elimina o
  // problema 100% — impressão HTML→PDF sem motor de paginação não permite
  // isso —, só reduz a frequência.
  css.push('.campo-eru { height: 110px; }');
  css.push('.rodape-final { page-break-inside: avoid; margin-top: 26px; }');
  css.push('.assinaturas { display:flex; justify-content:space-around; }');
  css.push('.assinatura-item { text-align:center; width: 45%; }');
  css.push('.assinatura-item img, .assinatura-item svg { height: 60px; }');
  css.push('.assinatura-linha { border-top: 1px solid #1f2937; margin-top: 4px; padding-top: 4px; font-size: 11.5px; }');
  css.push('.rodape-aviso { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 10.5px; color:#6b7280; }');
  css.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  css.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  css.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  return css.join('\n');
}

/**
 * Monta o documento único de Planejamento Técnico, Fundamentação e
 * Orientação de E.R.U. — no padrão visual "folha A4" do Portal (ver
 * PlanCME_getCss_), com assinaturas reais. Substitui os antigos
 * montarHtmlDocumentoPlanejamento_/montarHtmlJustificativaERU_ (2
 * documentos separados), unificados em 2026-07-26 a pedido do usuário
 * ("quero que vc faça um documento só").
 */
function PlanCME_montarDocumentoHtml_(dados) {
  const logo = PlanCME_getLogoDataUri_();
  const resultado = dados.resultado || {};
  const textosIA = resultado.textosIA || {};
  const tipoProcesso = PlanCME_obterTipoProcesso_(dados);
  const normas = PlanCME_obterNormasPorProcesso_(tipoProcesso);
  const dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  const isUltrassonica = tipoProcesso.includes("Ultrassônica");
  const checklistQI = resultado.checklistQI || [];
  const assinaturas = PLANCME_CFG.ASSINATURAS_PADRAO || [];

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Planejamento Técnico de Qualificação — ' + PlanCME_escaparHtml_(dados.cliente.razaoSocial || 'Cliente') + '</title>');
  html.push('<style>' + PlanCME_getCss_() + SGO_DocA4_css_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo) {
    html.push('<img class="logo-topo" src="' + logo + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="titulo-doc"><h1>PLANEJAMENTO TÉCNICO DE QUALIFICAÇÃO E QUANTITATIVO DE INSUMOS</h1><small>Documento gerado em ' + PlanCME_escaparHtml_(dataAtual) + '</small></div>');
  html.push('</div>');

  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Cliente</td><td>' + PlanCME_escaparHtml_(dados.cliente.razaoSocial || '') + '</td></tr>');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + PlanCME_escaparHtml_(dados.cliente.cnpj || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Endereço</td><td>' + PlanCME_escaparHtml_(PlanCME_montarEnderecoDoc_(dados.cliente) || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Equipamento</td><td>' + PlanCME_escaparHtml_(dados.equipamento.tipo || '') + '</td></tr>');
  html.push('<tr><td class="rotulo">Tipo de Processo</td><td>' + PlanCME_escaparHtml_(tipoProcesso) + '</td></tr>');
  html.push('<tr><td class="rotulo">Marca / Modelo</td><td>' + PlanCME_escaparHtml_((dados.equipamento.marca || '—') + ' / ' + (dados.equipamento.modelo || '—')) + '</td></tr>');
  html.push('<tr><td class="rotulo">Número de Série</td><td>' + PlanCME_escaparHtml_(dados.equipamento.serie || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Volume da Câmara</td><td>' + PlanCME_escaparHtml_(PlanCME_formatarNumeroBr_(dados.equipamento.volume)) + ' litros</td></tr>');
  html.push('<tr><td class="rotulo">Bomba de Vácuo</td><td>' + (dados.equipamento.bombaVacuo ? 'Sim' : 'Não') + '</td></tr>');
  html.push('<tr><td class="rotulo">Empresa executante</td><td>' + PlanCME_escaparHtml_(PLANCME_CFG.EMPRESA.NOME) + ' — ' + PlanCME_escaparHtml_(PLANCME_CFG.EMPRESA.RESPONSAVEL_TECNICO) + '</td></tr>');
  html.push('</table>');

  if (textosIA.introducao) {
    html.push('<div class="secao"><h2>Introdução</h2>');
    html.push(PlanCMEDoc_paragrafosHtml_(textosIA.introducao));
    html.push('</div>');
  }

  html.push('<div class="secao"><h2>Escopo Contratado</h2>');
  html.push('<ul>');
  if (dados.servicos.qi) html.push('<li><strong>Qualificação de Instalação</strong></li>');
  if (dados.servicos.qo) html.push('<li><strong>Qualificação de Operação</strong></li>');
  if (dados.servicos.qd) html.push('<li><strong>Qualificação de Desempenho</strong></li>');
  if (dados.servicos.bowieDick) html.push('<li><strong>Teste Bowie-Dick</strong></li>');
  html.push('</ul>');
  html.push('<p><strong>Receitas informadas:</strong></p>');
  if (dados.ciclos && dados.ciclos.length) {
    html.push('<ul>');
    dados.ciclos.forEach(function(ciclo) { html.push('<li>' + PlanCME_escaparHtml_(String(ciclo)) + '</li>'); });
    html.push('</ul>');
  } else {
    html.push('<p>Nenhuma receita informada.</p>');
  }
  html.push('</div>');

  html.push('<div class="secao"><h2>Quantitativo de Insumos</h2>');
  html.push('<table class="tabela-itens"><thead><tr><th>Item</th><th>Base Calculada</th><th>Total com Margem de Segurança</th></tr></thead><tbody>');
  (resultado.insumos || []).forEach(function(item) {
    html.push('<tr><td>' + PlanCME_escaparHtml_(item.nome || '') + '</td><td>' + PlanCME_escaparHtml_(String(item.base || 0)) + '</td><td><strong>' + PlanCME_escaparHtml_(String(item.total || 0)) + '</strong></td></tr>');
  });
  html.push('</tbody></table>');
  html.push('<div class="destaque"><div><strong>Quantidade de sensores prevista:</strong> ' + PlanCME_escaparHtml_(String(resultado.sensores || 0)) + '</div>');
  html.push('<div><strong>Margem de segurança aplicada:</strong> ' + PlanCME_escaparHtml_(PlanCME_descreverMargem_(resultado.margem || PLANCME_CFG.CALCULO.MARGEM_SEGURANCA)) + '</div></div>');
  html.push('</div>');

  if (textosIA.fundamentacaoQI || textosIA.fundamentacaoQO || textosIA.fundamentacaoQD) {
    html.push('<div class="secao secao-fundamentacao"><h2>Fundamentação Técnica do Escopo</h2>');
    if (dados.servicos.qi && textosIA.fundamentacaoQI) {
      html.push('<div class="subsecao"><h3>Qualificação de Instalação</h3>');
      html.push(PlanCMEDoc_paragrafosHtml_(textosIA.fundamentacaoQI));
      html.push('</div>');
    }
    if (dados.servicos.qo && textosIA.fundamentacaoQO) {
      html.push('<div class="subsecao"><h3>Qualificação de Operação</h3>');
      html.push(PlanCMEDoc_paragrafosHtml_(textosIA.fundamentacaoQO));
      html.push('</div>');
    }
    if (dados.servicos.qd && textosIA.fundamentacaoQD) {
      html.push('<div class="subsecao"><h3>Qualificação de Desempenho</h3>');
      html.push(PlanCMEDoc_paragrafosHtml_(textosIA.fundamentacaoQD));
      html.push('</div>');
    }
    html.push('</div>');
  }

  if (isUltrassonica && PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) {
    html.push('<div class="destaque alerta"><h3>Observação Técnica do Método (Metrolabs)</h3><p>' + PlanCME_escaparHtml_(PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) + '</p></div>');
  }

  if (textosIA.conclusao) {
    html.push('<div class="secao"><h2>Conclusão da Fundamentação</h2>');
    html.push(PlanCMEDoc_paragrafosHtml_(textosIA.conclusao));
    html.push('</div>');
  }

  if (resultado.detalhes && resultado.detalhes.length) {
    html.push('<div class="secao"><h2>Explicação Técnica do Resultado</h2><ul>');
    resultado.detalhes.forEach(function(texto) { html.push('<li>' + PlanCME_escaparHtml_(texto) + '</li>'); });
    html.push('</ul></div>');
  }

  if (checklistQI.length) {
    html.push('<div class="secao"><h2>Checklist de Inspeção para Qualificação de Instalação</h2><ul>');
    checklistQI.forEach(function(item) { html.push('<li>' + PlanCME_escaparHtml_(item) + '</li>'); });
    html.push('</ul></div>');
  }

  if (dados.observacoes) {
    html.push('<div class="secao"><h2>Observações Adicionais</h2><p>' + PlanCME_escaparHtml_(dados.observacoes).replace(/\n/g, '<br>') + '</p></div>');
  }

  html.push('<div class="secao"><h2>Referências Técnicas e Regulatórias</h2><ul>');
  normas.forEach(function(norma) { html.push('<li>' + PlanCME_escaparHtml_(norma) + '</li>'); });
  html.push('</ul></div>');

  html.push('<div class="secao"><h2>Orientação Técnica e Especificação de Requisitos do Usuário (E.R.U.)</h2>');
  if (textosIA.orientacaoERU) {
    html.push(PlanCMEDoc_paragrafosHtml_(textosIA.orientacaoERU));
  } else {
    html.push('<p>' + PlanCME_escaparHtml_(PLANCME_CFG.TEXTOS.ERU) + '</p>');
  }
  html.push('<p>Quando a instituição optar por alterar o número de ciclos, sensores, indicadores, receitas, testes ou qualquer outra premissa do planejamento original, deverá formalizar essa decisão por meio de documento assinado pelo responsável técnico ou setor competente.</p>');
  html.push('<h3>Informações que devem constar na E.R.U.</h3><ul>');
  html.push('<li>Modelo e número de série do equipamento.</li>');
  html.push('<li>Receitas a serem qualificadas.</li>');
  html.push('<li>Quantidade de ciclos, sensores e indicadores.</li>');
  html.push('<li>Justificativa técnica para o ajuste pretendido.</li>');
  html.push('<li>Assinatura e identificação do responsável.</li>');
  html.push('</ul>');
  html.push('<div class="destaque campo-eru"><p><strong>Descrever abaixo a Especificação de Requisitos do Usuário:</strong></p></div>');
  html.push('</div>');

  html.push('<div class="rodape-final">');
  html.push('<div class="assinaturas">');
  assinaturas.forEach(function(a) {
    html.push('<div class="assinatura-item">');
    if (a.imagemSvg) html.push(a.imagemSvg);
    html.push('<div class="assinatura-linha"><strong>' + PlanCME_escaparHtml_(a.nome) + '</strong><br>' + PlanCME_escaparHtml_(a.cargo) + '<br>' + PlanCME_escaparHtml_(a.registro) + '</div>');
    html.push('</div>');
  });
  html.push('</div>');

  html.push('<div class="rodape-aviso">Este documento é o registro completo do planejamento técnico, da fundamentação do quantitativo de insumos e da orientação de Especificação de Requisitos do Usuário (E.R.U.) para o escopo de qualificação descrito acima. Qualquer alteração de premissa deste planejamento deve seguir o processo de E.R.U. descrito neste documento.</div>');
  html.push('</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}

/**
 * Monta o documento único e retorna só o HTML (sem tocar Drive) — mesmo
 * padrão de DeclExec_apiMontarDocumentoFinal (Portal): o frontend abre o
 * HTML numa nova aba e só salva no Drive quando o usuário clicar
 * separadamente em "Salvar no Drive" (ver PlanCME_apiSalvarDocumento).
 */
function PlanCME_apiMontarDocumentoFinal(dados) {
  try {
    const html = PlanCME_montarDocumentoHtml_(dados);
    return { ok: true, html: html };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}

/**
 * Converte o HTML já gerado (e já aberto/conferido pelo usuário) em PDF e
 * salva na pasta de PDFs do Drive, registrando o documento na planilha.
 * Só roda quando o usuário clica em "Salvar no Drive" — nunca durante
 * PlanCME_apiMontarDocumentoFinal.
 */
function PlanCME_apiSalvarDocumento(payload) {
  try {
    payload = payload || {};
    const html = String(payload.html || "");
    if (!html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");

    const props = PropertiesService.getScriptProperties();
    let pastaId = props.getProperty("PLANCME_PASTA_PDF_ID");
    if (!pastaId) {
      // Auto-provisiona (mesmo padrão de PlanCME_getDB_) — sem isso, esta
      // função ficava dependendo da ORDEM de chamada (só funcionava porque
      // PlanCME_salvarPlanejamento, chamada antes no fluxo de
      // tplPlanCME_gerarDocumento, aciona o setup como efeito colateral).
      // Frágil: qualquer mudança de fluxo futura reintroduziria o erro
      // "não configurado". Auto-suficiente agora, independente de quem
      // chamou antes.
      PlanCME_setupModulo();
      pastaId = props.getProperty("PLANCME_PASTA_PDF_ID");
    }

    // pasta do cliente (CNPJ ou nome) dentro da pasta do módulo; data no nome para não sobrescrever emissões anteriores
    const raiz = DriveApp.getFolderById(pastaId);
    const pasta = (payload.cnpj || payload.cliente) ? SGO_DocSalvar_pastaClienteEm_(raiz, payload.cnpj, payload.cliente) : raiz;
    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);

    const nomeCliente = PlanCME_sanitizarNomeArquivo_(payload.cliente || "CLIENTE");
    const nomeArquivo = "PLANEJAMENTO_CME_" + nomeCliente + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmm") + ".pdf";
    blob.setName(nomeArquivo);

    const arquivo = pasta.createFile(blob);
    // Liberação cirúrgica do arquivo individual (mesmo padrão do Portal SGO+
    // CNPJ/DB, ver SGO_Documentos.js) — sem isso o link enviado ao cliente
    // por WhatsApp/e-mail dá "Acesso negado", porque a pasta em si continua
    // privada. Achado real 2026-07-28: usuário testou o link do WhatsApp e
    // o cliente não conseguia abrir o documento.
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    PlanCME_registrarDocumento_({
      cliente: { razaoSocial: payload.cliente || "" },
      planejamentoId: payload.planejamentoId || ""
    }, arquivo, "PLANEJAMENTO_TECNICO");

    return { ok: true, url: arquivo.getUrl(), fileName: arquivo.getName() };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento no Drive: " + e.message };
  }
}

function PlanCME_registrarDocumento_(dados, arquivo, tipoDocumento) {
  const db = PlanCME_getDB_();
  const aba = db.getSheetByName(PLANCME_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    PlanCME_gerarId_(),
    agora,
    dados.cliente.razaoSocial || "",
    tipoDocumento || "PLANEJAMENTO_TECNICO",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.planejamentoId || ""
  ]);
}

function PlanCME_obterTipoProcesso_(dados) {
  return (dados && dados.equipamento && dados.equipamento.tipoProcesso)
    ? dados.equipamento.tipoProcesso
    : PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR;
}

function PlanCME_obterNormasPorProcesso_(tipoProcesso) {
  const tp = String(tipoProcesso || "");
  if (tp.includes("Peróxido")) return PLANCME_CFG.NORMAS.PEROXIDO;
  if (tp.includes("Formaldeído")) return PLANCME_CFG.NORMAS.FORMALDEIDO;
  if (tp.includes("Etileno")) return PLANCME_CFG.NORMAS.ETO;
  if (tp.includes("Ultrassônica") || tp.includes("Termodesinfectora")) return PLANCME_CFG.NORMAS.LAVADORAS;
  return PLANCME_CFG.NORMAS.VAPOR;
}

function PlanCME_getLogoDataUri_() {
  // Fase 2 (16/10): no servidor próprio não há Drive do Google; usa a mesma logo embutida do
  // Certificado de calibração (CadeiaFrioRel_CFCFG.LOGO_BASE64). O ID do Drive fica como reserva.
  try {
    const cfgLogo = typeof CadeiaFrioRel_CFCFG !== "undefined" ? CadeiaFrioRel_CFCFG.LOGO_BASE64 : null;
    if (cfgLogo && cfgLogo.data) return "data:" + (cfgLogo.mimeType || "image/png") + ";base64," + cfgLogo.data;
  } catch (e) { /* segue para o Drive */ }
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("PLANCME_LOGO_ID") || PLANCME_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function PlanCME_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function PlanCME_montarEnderecoDoc_(cliente) {
  const partes = [];
  if (cliente && cliente.logradouro) partes.push(cliente.logradouro);
  if (cliente && cliente.bairro) partes.push(cliente.bairro);

  let cidadeUf = "";
  if (cliente && cliente.cidade) cidadeUf += cliente.cidade;
  if (cliente && cliente.uf) cidadeUf += (cidadeUf ? "/" : "") + cliente.uf;
  if (cidadeUf) partes.push(cidadeUf);

  return partes.join(" - ");
}

/**
 * Número para exibição no documento em pt-BR (vírgula decimal, ponto de
 * milhar), sem casas decimais inúteis. Aceita number ou string crua do
 * formulário ("54.5" do input type=number, ou "54,5"). (2026-10-16: o volume
 * e a margem saíam com ponto decimal, ex. "1.2".)
 */
function PlanCME_formatarNumeroBr_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(n)) return String(valor);
  const partes = (Math.round(n * 1000) / 1000).toString().split('.');
  const inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return partes[1] ? inteiro + ',' + partes[1] : inteiro;
}

/** "1,2 (acréscimo de 20% sobre a base calculada)". */
function PlanCME_descreverMargem_(margem) {
  const m = Number(margem);
  if (!isFinite(m) || m <= 0) return PlanCME_formatarNumeroBr_(margem);
  const pct = Math.round((m - 1) * 1000) / 10;
  return PlanCME_formatarNumeroBr_(m) + ' (acréscimo de ' + PlanCME_formatarNumeroBr_(pct) + '% sobre a base calculada)';
}

function PlanCME_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
