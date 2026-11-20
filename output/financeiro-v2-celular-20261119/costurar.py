# Junta os pedaços de uma captura longa (Chromium deixa em branco a captura inteira acima de ~16 mil pixels reais).
import sys
from PIL import Image
saida, partes = sys.argv[1], sys.argv[2:]
ims = [Image.open(p) for p in partes]
w = max(i.size[0] for i in ims); h = sum(i.size[1] for i in ims)
tela = Image.new('RGB', (w, h), 'white'); y = 0
for i in ims: tela.paste(i, (0, y)); y += i.size[1]
tela.save(saida, optimize=True)
