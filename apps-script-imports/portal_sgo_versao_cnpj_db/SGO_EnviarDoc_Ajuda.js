/****************************************************
 * Ajuda "Como usar esta tela" do envio de documentos (20/10/2026, SGO_EnviarDoc.js / JS_EnviarDoc.html).
 *  - tela própria "enviar_documento" (a janela Enviar documento);
 *  - SGO_ajudaComplementos_: acrescenta o passo "Enviar o documento ao cliente" na ajuda de toda tela
 *    que gera ou lista documento (chamado por SGO_Ajuda_todas_ depois de juntar os grupos).
 * Texto puro, tom profissional, contrato em docs/AJUDA_CONTRATO_20261017.md.
 ****************************************************/

/** Telas que geram ou listam documento de cliente (chave da ajuda -> onde fica o botão). */
var ENVDOC_AJUDA_TELAS = {
  autoclave: 'depois de emitir o relatório de ensaio ou o relatório de dados',
  lavadora: 'depois de emitir o relatório de ensaio ou o relatório de dados',
  cadeia_frio: 'depois de emitir o relatório de qualificação ou o relatório de dados',
  estufa_banhomaria: 'depois de emitir o relatório de qualificação ou o relatório de dados',
  baixa_temperatura: 'depois de emitir o relatório de qualificação (botão "Enviar ao cliente" em 8. Revisão e emissão)',
  declaracao_qiqo: 'depois de gerar o relatório QI/QO/QD',
  nr13: 'depois de emitir ou reabrir o laudo',
  certificado_calibracao: 'depois de gerar o certificado ou o relatório interpretativo',
  relatorio_calibracao: 'depois de salvar o relatório na pasta do cliente',
  declaracao_exec: 'depois de salvar a declaração e na lista de declarações já geradas',
  pgt_pop: 'depois de gerar o documento e na lista de documentos (botão ao lado de "PDF salvo")',
  reg_op: 'depois de gerar o registro',
  planejamento_cme: 'depois de salvar o planejamento na pasta do cliente',
  cronograma_execucao: 'depois de salvar o cronograma na pasta do cliente',
  inventario: 'depois de gerar o relatório do inventário',
  padroes: 'depois de emitir o inventário dos padrões, a solicitação de orçamento ou um relatório gerencial (documento interno)',
  documentos: 'em cada documento com arquivo (botão "Enviar" ao lado de "Abrir arquivo", no menu "Mais" e no detalhe) e no botão "Envios de documentos" no topo da tela',
  clientes: 'na aba "Documentos gerados e envios" do cliente',
  qualidade: 'depois de gerar o relatório (documento interno)',
  auvo: 'depois de gerar o relatório de atendimentos (documento interno)',
  'frota/historico_e_relatorio': 'depois de gerar o relatório da frota (documento interno)'
};

function SGO_ajudaComplementos_(todas, ordem) {
  if (!todas || typeof todas !== 'object') return;
  var tela = SGO_ajudaTelas_EnviarDoc_();
  Object.keys(tela).forEach(function (k) {
    if (!todas[k]) ordem.push(k);
    todas[k] = tela[k];
    todas[k].__grupo = 'EnviarDoc';
  });
  Object.keys(ENVDOC_AJUDA_TELAS).forEach(function (k) {
    var t = todas[k];
    if (!t || typeof t !== 'object') return;
    var passos = Array.isArray(t.passos) ? t.passos.slice() : [];
    if (passos.some(function (p) { return p && /Enviar o documento/i.test(String(p.titulo || '')); })) return;
    var interno = /interno/.test(ENVDOC_AJUDA_TELAS[k]);
    passos.push({
      titulo: interno ? 'Enviar o documento por e-mail ou WhatsApp' : 'Enviar o documento ao cliente (e-mail ou WhatsApp)',
      itens: [
        'O botão "Enviar" aparece ' + ENVDOC_AJUDA_TELAS[k] + '. Depois de gerar, aparece também a barra "Documento salvo" no canto da tela, com o botão "' + (interno ? 'Enviar' : 'Enviar ao cliente') + '".',
        'Toque em "' + (interno ? 'Enviar' : 'Enviar ao cliente') + '". Abre a janela "Enviar documento", com o PDF já anexado.',
        interno ? 'Escolha as pessoas da equipe ou digite o e-mail ou o celular de quem vai receber.' : 'Confira os destinatários: o sistema sugere os contatos do cliente do documento (cadastro, unidades e quem já recebeu). Marque, desmarque ou acrescente outro.',
        'Marque E-mail e/ou WhatsApp, confira o assunto e a mensagem e toque em "Revisar e enviar".',
        'Confira a pré-visualização e toque em "Confirmar e enviar". O resultado de cada destinatário aparece na hora e fica no histórico do documento e do cliente.'
      ]
    });
    t.passos = passos;
    var probs = Array.isArray(t.problemas) ? t.problemas.slice() : [];
    probs.push({ situacao: 'O envio do documento aparece como "Falhou"', oQueFazer: 'Leia o motivo ao lado (ex.: e-mail inválido, celular sem WhatsApp, WhatsApp da empresa desconectado), corrija e toque em "Tentar de novo". Os envios ficam em Arquivo de documentos > "Envios de documentos".' });
    t.problemas = probs;
  });
}

function SGO_ajudaTelas_EnviarDoc_() {
  return {
    'enviar_documento': {
      titulo: 'Enviar documento',
      paraQueServe: 'Envia um documento gerado pelo SGO+ (certificado, relatório, laudo, declaração, PGT, POP, planejamento, cronograma, registro, inventário ou arquivo do Arquivo de documentos) por e-mail e/ou WhatsApp, com o PDF anexado. Cada envio fica registrado no histórico do documento e do cliente.',
      antesDeComecar: [
        'O documento precisa estar salvo (aparece a barra "Documento salvo" ou o link do PDF na tela).',
        'Para sugerir destinatários, o cadastro do cliente (Cadastros > Clientes) ou da unidade precisa ter e-mail ou celular de contato.',
        'O WhatsApp só aparece liberado quando o WhatsApp da empresa está configurado em Administração > Chaves e senhas.',
        'Nada é enviado sozinho: o envio só acontece quando você toca em "Confirmar e enviar".'
      ],
      passos: [
        { titulo: 'Enviar o documento', itens: [
          'Toque em "Enviar" ao lado do documento ou em "Enviar ao cliente" na barra "Documento salvo".',
          'No passo 1, confira o documento. Toque em "Conferir o documento" para abrir o PDF, se quiser.',
          'Se quiser, marque "Incluir a cópia em HTML" ou abra "Anexar outros documentos deste cliente" e marque os que vão junto.',
          'No passo 2, marque E-mail, WhatsApp ou os dois.',
          'No passo 3, marque quem vai receber. Para alguém que não está na lista, preencha nome, e-mail e/ou celular e toque em "Acrescentar".',
          'No passo 4, confira o assunto e os textos. Eles já vêm prontos com o nome do documento, o cliente e o equipamento; ajuste se precisar.',
          'Toque em "Revisar e enviar".',
          'Confira como o e-mail e a mensagem do WhatsApp vão sair e toque em "Confirmar e enviar".',
          'Aguarde o resultado: cada destinatário aparece como "Enviado" ou "Falhou", com o motivo.'
        ] },
        { titulo: 'Tentar de novo um envio que falhou', itens: [
          'Leia o motivo da falha e resolva (por exemplo, corrija o e-mail no cadastro ou peça para reconectar o WhatsApp da empresa).',
          'Toque em "Tentar de novo" na linha do envio. O mesmo documento e a mesma mensagem são enviados de novo; o envio que falhou continua no histórico.'
        ] },
        { titulo: 'Consultar o que já foi enviado', itens: [
          'Na janela, abra "Envios anteriores deste documento".',
          'Para ver tudo de um cliente: Cadastros > Clientes > abra o cliente > aba "Documentos gerados e envios".',
          'Para ver todos os envios: Arquivo de documentos > botão "Envios de documentos" no topo. Filtre por cliente ou por "Com falha".'
        ] }
      ],
      cores: [
        { nome: 'Selo verde "Enviado"', significado: 'O e-mail foi entregue à caixa de saída do sistema (ou ao seu e-mail integrado) ou o WhatsApp aceitou a mensagem com o documento.' },
        { nome: 'Selo vermelho "Falhou"', significado: 'Não foi enviado. O motivo aparece logo abaixo e o botão "Tentar de novo" fica disponível.' },
        { nome: 'Selo amarelo "Enviando"', significado: 'O envio está em andamento (o WhatsApp espera alguns segundos entre uma mensagem e outra para proteger o número da empresa).' },
        { nome: 'Faixa amarela "Fora do horário comercial"', significado: 'O envio continua liberado, mas o cliente pode só ver a mensagem no próximo dia útil.' },
        { nome: 'Faixa azul "Documento interno"', significado: 'O documento não está na pasta de um cliente. Confira se ele pode sair da Metrolabs antes de enviar.' },
        { nome: 'Etiqueta "(sem WhatsApp)" no telefone', significado: 'O número é fixo ou está incompleto: só recebe por e-mail. Corrija o celular no cadastro do cliente para usar o WhatsApp.' }
      ],
      problemas: [
        { situacao: 'A lista de destinatários vem vazia', oQueFazer: 'O cadastro do cliente não tem e-mail nem celular. Digite o destinatário e toque em "Acrescentar". Para as próximas vezes, complete o contato em Cadastros > Clientes (ou na unidade).' },
        { situacao: 'O WhatsApp aparece desligado', oQueFazer: 'O WhatsApp da empresa não está configurado. Peça ao responsável pelo sistema para gravar as chaves da Z-API em Administração > Chaves e senhas. Enquanto isso, envie por e-mail.' },
        { situacao: 'Aparece "Este documento não é enviado pelo sistema"', oQueFazer: 'O documento tem dados pessoais de colaboradores (Programa de conduta, avaliação da gestão). Ele não sai do SGO+ por e-mail ou WhatsApp. Entregue pessoalmente ou peça orientação à Diretoria.' },
        { situacao: 'Aparece "A tela indicou outro cliente"', oQueFazer: 'O arquivo está gravado na pasta de outro cliente. Os contatos sugeridos são do cliente da pasta. Confira se o documento é o certo antes de enviar.' },
        { situacao: 'Falhou com "limite de mensagens por hora"', oQueFazer: 'É a proteção do número da empresa contra bloqueio. Espere a próxima hora e toque em "Tentar de novo", ou envie por e-mail.' },
        { situacao: 'Toquei duas vezes em "Confirmar e enviar"', oQueFazer: 'Não tem problema: o mesmo pedido nunca é enviado duas vezes. O resultado mostra o envio uma vez só.' },
        { situacao: 'O cliente respondeu o e-mail', oQueFazer: 'A resposta vai para o seu e-mail do cadastro (Usuários). Se o seu cadastro não tiver e-mail, a resposta vai para a caixa do sistema: peça ao administrador para completar o seu e-mail.' }
      ],
      quemPode: [
        { perfil: 'ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO', pode: 'Enviar documentos gerados e do Arquivo de documentos, tentar de novo e consultar o histórico de envios.' },
        { perfil: 'RH', pode: 'Não envia documentos de cliente.' },
        { perfil: 'CLIENTE', pode: 'Não envia: recebe os documentos e os consulta no Arquivo de documentos.' }
      ],
      perguntas: [
        { p: 'O cliente recebe um link ou o arquivo?', r: 'Recebe o arquivo. No e-mail o PDF vai anexado; no WhatsApp o documento vai na própria mensagem. Nenhum link público é criado.' },
        { p: 'De qual e-mail sai?', r: 'Quando o seu e-mail integrado estiver ligado, sai pelo seu e-mail. Até lá, sai pela caixa do sistema da Metrolabs com o seu nome e com "responder para" o seu e-mail do cadastro.' },
        { p: 'Posso enviar para alguém que não está no cadastro?', r: 'Sim. Preencha nome, e-mail e/ou celular e toque em "Acrescentar". O contato fica sugerido nos próximos envios para o mesmo cliente.' },
        { p: 'O que o "{nome}" faz na mensagem do WhatsApp?', r: 'Vira o primeiro nome de cada destinatário. Sem nome, a saudação fica sem ele.' },
        { p: 'Por que o WhatsApp demora alguns segundos?', r: 'O sistema espera um intervalo entre uma mensagem e outra e limita a quantidade por hora e por dia, para o WhatsApp da empresa não ser bloqueado por envio em massa.' }
      ]
    }
  };
}
