import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\assistente-manuais-acesso-20261117.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
a = """    /^Seguem a matriz de avisos aprovada: no sistema até resolver; e-mail só no resumo da manhã .*WhatsApp nunca pelo Compras/,
"""
b = a + """    // 18/11/2026 (decisão do dono): o Auvo foi descontinuado e saiu do SGO+. Os parágrafos que descreviam a integração, a transição
    // (os seis critérios), o uso em paralelo e as tarefas do Auvo na agenda, no ponto, na Frota e na Caixa foram reescritos nos mesmos
    // manuais (ver output/auvo-retirada-20261118/RELATORIO.md); os que citavam o Auvo e as linhas soltas da lista de critérios saíram.
    /\\bAuvo\\b/,
    /^Os seis critérios do projeto, cada um com o que o sistema mediu/,
    /^[2356]\\. (Quatro semanas seguidas com todos os técnicos|Painel de qualidade, Conduta e Frota mostrando|Pelo menos um atendimento feito sem internet|Relatório da O\\.S\\. aprovado pela Qualidade)/,
    /^\\s*não houve atendimento\\)\\.$/,
    /^abrem só para a equipe interna\\.$/,
    /^atendimento não recebe lembrete\\), central de pendências, Início, ficha do equipamento e Vínculos leem a mesma lista:/,
"""
if s.count(a) != 1: sys.exit('ERRO %d' % s.count(a))
s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
