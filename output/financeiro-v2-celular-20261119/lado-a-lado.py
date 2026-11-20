# Antes (cand38) e depois (cand39) lado a lado, em 1x (390 px cada), para as telas principais das fotos do dono.
import sys, os
from PIL import Image, ImageDraw
base = os.path.dirname(os.path.abspath(__file__))
telas = [('painel-diretoria', '390-admin-fin_painel-v2_diretoria.png'), ('painel-meu-dia', '390-wanessa-fin_painel-v2_dia.png'),
         ('contas-a-pagar', '390-admin-fin_pagar-contas.png'), ('aprovacoes', '390-admin-fin_aprovacoes-pagamentos.png'),
         ('empresas-e-bancos', '390-admin-fin_empresas-v2_empresas.png'), ('bancos', '390-admin-fin_bancos-v2_bancos.png')]
for nome, arq in telas:
    a = Image.open(os.path.join(base, 'capturas-antes', arq)); d = Image.open(os.path.join(base, 'capturas-depois', arq))
    a = a.resize((390, int(a.size[1] * 390 / a.size[0]))); d = d.resize((390, int(d.size[1] * 390 / d.size[0])))
    h = max(a.size[1], d.size[1]) + 30
    t = Image.new('RGB', (390 * 2 + 20, h), 'white'); g = ImageDraw.Draw(t)
    g.text((8, 8), 'ANTES (cand38, produção)', fill='black'); g.text((418, 8), 'DEPOIS (cand39)', fill='black')
    t.paste(a, (0, 30)); t.paste(d, (410, 30)); t.save(os.path.join(base, 'principais-390', nome + '.png'), optimize=True)
    print(nome, t.size)
