ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Qualidade_Main.js'
PARES = [
(" * crescer: cada área (Auvo, Frota, e o que entrar depois) é um coletor",
 " * crescer: cada área (atendimentos da Assistência, Frota, e o que entrar depois) é um coletor"),
("""  // 16/10/2026 (auditoria P2): "OK, integrações respondendo" aparecia com o Auvo sem chaves.
  var props=PropertiesService.getScriptProperties(),auvoConfigurado=!!(props.getProperty('AUVO_API_KEY')&&props.getProperty('AUVO_API_TOKEN'));
  return Object.assign({ok:true,auvoConfigurado:auvoConfigurado,periodoDias:dias,""",
 """  // 18/11/2026: Auvo descontinuado pelo dono. A área "auvo" do painel passou a ser só os atendimentos da Assistência do SGO+
  // (QualidadeAuvo_coletar_ lê a fonte única, origem SGO); não há mais conexão do Auvo a conferir.
  return Object.assign({ok:true,periodoDias:dias,"""),
("var QUALIDADE_MODULOS_PENDENCIA = ['frota', 'auvo', 'qualidade', 'conduta'];",
 "var QUALIDADE_MODULOS_PENDENCIA = ['frota', 'qualidade', 'conduta'];"),
]
