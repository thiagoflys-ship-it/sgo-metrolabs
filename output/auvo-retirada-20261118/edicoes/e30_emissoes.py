import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_NR13_Main.js', [
("""  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Nunca
  // derruba a emissão do laudo se o Auvo estiver fora do ar ou mal
  // configurado — ver SGO_Auvo_Main.js.
  try {
    Auvo_criarTarefa_({
      documentoId: laudoId,
      titulo: 'Laudo NR-13 nº ' + numero + ' — ' + (ctx.vaso.tag || ctx.vaso.tipo),
      descricao: 'Inspeção de vaso de pressão (NR-13), categoria ' + categoria.categoria + ' — veredito: ' + ctx.veredito,
      clienteId: ctx.cliente.id,
      usuarioId: sessao.userId,
      data: ctx.inspecao.dataTermino,
      linkPdf: arquivo.getUrl()
    });
  } catch (e) {
    SGO_DATA.log('AUVO_TAREFA_FALHOU', sessao.usuario, 'NR13 ' + numero + ': ' + e.message, 'AUVO');
  }
""", """  // 18/11/2026: Auvo descontinuado pelo dono; a emissão do laudo não cria mais tarefa no Auvo.
"""),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_PgtPop_Main.js', [
("""  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Só
  // dispara se o PDF realmente foi salvo e se o CNPJ digitado bate com um
  // cliente já cadastrado no Portal (este módulo, como o Registros
  // Operacionais, não usa CAD_CLIENTES como fonte — consulta direto de
  // uma API pública de CNPJ). Nunca derruba a geração se o Auvo estiver
  // fora do ar ou mal configurado.
  if (pdf && pdf.url) {
    try {
      var clienteAuvo = Auvo_resolverClientePorCnpj_(hospital.cnpj);
      if (clienteAuvo) {
        Auvo_criarTarefa_({
          documentoId: salvo.registroId,
          titulo: (tipo === 'PGT' ? 'PGT' : 'POP') + ' — ' + titulo,
          descricao: 'Documento de Engenharia Clínica "' + titulo + '" (v' + versaoNova + ') — ' + (hospital.razaoSocial || ''),
          clienteId: clienteAuvo.ID,
          usuarioId: exigirSessao(sessionId).userId,
          data: '',
          linkPdf: pdf.url
        });
      }
    } catch (e) {
      SGO_DATA.log('AUVO_TAREFA_FALHOU', '', 'PGTPOP ' + salvo.registroId + ': ' + e.message, 'AUVO');
    }
  }
""", """  // 18/11/2026: Auvo descontinuado pelo dono; a geração do PGT/POP não cria mais tarefa no Auvo.
"""),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_RegOp_Main.js', [
("""  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Só
  // dispara se o PDF realmente foi salvo (pdfUrl pode ficar vazio se o
  // auto-save acima falhou silenciosamente) e se o CNPJ digitado bate com
  // um cliente já cadastrado no Portal (este módulo não usa CAD_CLIENTES
  // como fonte — consulta direto de uma API pública de CNPJ). Nunca
  // derruba o registro se o Auvo estiver fora do ar ou mal configurado.
  if (pdfUrl) {
    try {
      var clienteAuvo = Auvo_resolverClientePorCnpj_(hospital.cnpj);
      if (clienteAuvo) {
        Auvo_criarTarefa_({
          documentoId: registroId,
          titulo: tipoDocumentoNome + ' — ' + (hospital.razaoSocial || ''),
          descricao: 'Registro operacional "' + tipoDocumentoNome + '" gerado em ' + data,
          clienteId: clienteAuvo.ID,
          usuarioId: exigirSessao(sessionId).userId,
          data: data,
          linkPdf: pdfUrl
        });
      }
    } catch (e) {
      SGO_DATA.log('AUVO_TAREFA_FALHOU', '', 'REGOP ' + registroId + ': ' + e.message, 'AUVO');
    }
  }
""", """  // 18/11/2026: Auvo descontinuado pelo dono; o registro operacional não cria mais tarefa no Auvo.
"""),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
