import io
p = r'C:\Users\venda\projetos\google-script-dev\docs\MANUAL_CLIENTES_UNIDADES_VINCULOS.md'
raw = io.open(p, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')
a = "- **Excluir** uma unidade que só tem a ligação com o histórico do Auvo e/ou um contato: a prévia mostra que a ligação fica guardada como de cadastro excluído (para consulta) e que o contato fica inativo; nada é apagado além da unidade.\n"
b = a + (
"- **Excluir cliente ou unidade que só tem contatos** (26/10/2026): os contatos do próprio cadastro não impedem mais a exclusão, nem em Cadastros > Clientes/Unidades nem em Vínculos. Depois da exclusão eles ficam inativos na lista de contatos (não são apagados) e a mensagem diz quantos. Unidade, equipamento, documento, negociação e os demais registros ligados continuam impedindo.\n"
"- Contatos da unidade acompanham Transferir e Consolidar; em Desvincular ficam no cadastro original.\n"
"\n"
"**Exemplo — unidade com o nome de outra empresa pendurada no cliente errado:** em Vínculos, escolha a unidade como origem, ação **Desvincular**, motivo, **Conferir impacto** e confirme. Depois, se a unidade não serve para nada, escolha a mesma unidade, ação **Excluir**, motivo, **Conferir impacto** e confirme; se ela é de fato um local de outro cliente, use **Transferir** para esse cliente.\n")
assert s.count(a) == 1
s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
