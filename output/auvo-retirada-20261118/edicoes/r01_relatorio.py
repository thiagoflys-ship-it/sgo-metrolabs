import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\output\auvo-retirada-20261118\RELATORIO.md'
s = io.open(p, encoding='utf-8').read()
P = [
("base do assistente regerada (49 manuais, 1.534 seções, versão `3f027b2439d5`)", "base do assistente regerada (49 manuais, 1.534 seções, versão `09bfddc0ffbb`)"),
("e 22 arquivos de teste ajustados de propósito, com comentário datado.", "e 25 arquivos de teste ajustados de propósito, com comentário datado."),
("Contagem de menções a \"Auvo\" na `cand30`: 133 arquivos do legado.", "Contagem de arquivos do legado com \"Auvo\" na `cand30`: 136."),
("""  - `conduta-qualidade-areas`, `certcal-emissao-parcial`, `ponto`, `sedna`, `poderes-lote0` (catálogo de referência lido sem as 4 caixas retiradas; 150 → 146; 8 caixas com texto ajustado conferidas sem citar a integração).""",
"""  - `conduta-qualidade-areas` (tarefa do Auvo não vira sugestão; a pendente do Auvo é encerrada pelo sistema), `certcal-emissao-parcial` (a emissão não chama nem avisa o Auvo), `ponto` (em atendimento e evidência só pela O.S. do SGO+), `sedna` (exemplo de "maiores grupos" com tipos que continuam existindo).
  - `poderes-lote0` (catálogo de referência lido sem as 4 caixas retiradas, 150 → 146; as 8 caixas com texto ajustado são conferidas sem citar a integração), `deposito-viagem`, `deposito-viagem-prestacao` e `diretoria-informada` (totais do catálogo 150 → 146, 158 → 154, 151 → 147).
  - `avisos-gestao-celular` (a trilha da matriz também traz a retirada de S54 a S56) e `assistente-manuais-acesso-20261117` (teste 6: os parágrafos dos manuais que citavam o Auvo ou a lista dos seis critérios entram na lista de saídas justificadas)."""),
("""7. **Capturas** foram feitas""", """7. **Falha que não é desta mudança:** `portal-cliente-etapa1-20261118`, teste T1.8, falha quando a suíte roda entre 21h e 24h de Brasília (o dia em UTC já é o seguinte e a data da última entrada fica um dia à frente do aviso). Falha igual na `cand30`; com o relógio do processo em 18/11/2026 15h (`relogio-meio-da-tarde.cjs`, só para conferir, sem mudar arquivo) passa 11/0 na `cand30` e na `cand31`. Fica registrado para quem cuida do Portal do cliente.
8. **Capturas** foram feitas"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %d %r' % (s.count(a), a[:70]))
    s = s.replace(a, b)
io.open(p, 'w', encoding='utf-8').write(s); print('ok')
