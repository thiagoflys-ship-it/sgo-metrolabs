/****************************************************
 * METROLABS — GERADOR DE RELATÓRIOS
 * ARQUIVO: Utils.gs
 ****************************************************/

function textoSeguro_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function upperSeguro_(valor) {
  return textoSeguro_(valor).toUpperCase();
}

function isBlank_(valor) {
  return textoSeguro_(valor) === '';
}

function sanitizarNomeArquivo_(valor) {
  return textoSeguro_(valor)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escaparRegex_(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDriveImageUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
}

function getModuloConfig_(tipo) {
  const chave = upperSeguro_(tipo);
  const modulo = CONFIG.MODULOS[chave];

  if (!modulo) {
    throw new Error('Tipo de relatório inválido: ' + tipo);
  }

  return modulo;
}

function getPublicConfig_() {
  return {
    appName: CONFIG.APP_NAME,
    subtitle: CONFIG.APP_SUBTITLE,
    logoFileUrl: getDriveImageUrl_(CONFIG.LOGO_ID),
    modulos: {
      LAVADORA: {
        chave: CONFIG.MODULOS.LAVADORA.chave,
        nome: CONFIG.MODULOS.LAVADORA.nome
      },
      TERMODESINFECTORA: {
        chave: CONFIG.MODULOS.TERMODESINFECTORA.chave,
        nome: CONFIG.MODULOS.TERMODESINFECTORA.nome
      }
    }
  };
}

function normalizarPayload_(payload) {
  payload = payload || {};
  const tipo = upperSeguro_(payload.tipo);
  const modulo = getModuloConfig_(tipo);

  const dados = { tipo: tipo };

  modulo.campos.forEach(function(campo) {
    dados[campo] = textoSeguro_(payload[campo]);
  });

  if (dados.statusFinal) {
    dados.statusFinal = upperSeguro_(dados.statusFinal);
  }

  return dados;
}

function validarPayload_(dados) {
  const modulo = getModuloConfig_(dados.tipo);
  const erros = [];

  modulo.campos.forEach(function(campo) {
    if (isBlank_(dados[campo])) {
      erros.push('Preencha o campo: ' + getLabelCampo_(dados.tipo, campo) + '.');
    }
  });

  if (dados.tipo === 'TERMODESINFECTORA') {
    if (modulo.statusValidos.indexOf(dados.statusFinal) === -1) {
      erros.push('Status final inválido. Use APROVADO ou REPROVADO.');
    }
  }

  return erros;
}

function montarMapaPlaceholders_(dados) {
  const modulo = getModuloConfig_(dados.tipo);
  const mapa = {};

  Object.keys(modulo.placeholders).forEach(function(campo) {
    mapa[modulo.placeholders[campo]] = textoSeguro_(dados[campo]);
  });

  return mapa;
}

function replaceAllInBody_(body, mapa) {
  Object.keys(mapa).forEach(function(chave) {
    body.replaceText(escaparRegex_(chave), mapa[chave]);
  });
}

function getLabelCampo_(tipo, campo) {
  const labels = {
    LAVADORA: {
      numeroRelatorio: 'Número do relatório',
      cliente: 'Cliente',
      equipamento: 'Equipamento',
      tag: 'TAG',
      identificacao: 'Identificação',
      tipoEnsaio: 'Tipo de ensaio',
      perfil: 'Perfil',
      cnpj: 'CNPJ',
      setorLocal: 'Setor / Local',
      observacoes: 'Observações',
      dataCiclo: 'Data do ciclo'
    },
    TERMODESINFECTORA: {
      numeroRelatorio: 'Número do relatório',
      dataCiclo: 'Data do ciclo',
      cliente: 'Cliente',
      cnpjCliente: 'CNPJ do cliente',
      tag: 'TAG',
      marca: 'Marca',
      modelo: 'Modelo',
      ns: 'Número de série',
      localizacao: 'Localização',
      statusFinal: 'Status final'
    }
  };

  return (labels[tipo] && labels[tipo][campo]) ? labels[tipo][campo] : campo;
}

function blobToPdf_(file) {
  return file.getBlob().getAs(MimeType.PDF);
}