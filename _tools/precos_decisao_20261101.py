# -*- coding: utf-8 -*-
"""
Decisão do dono de 01/11/2026 ("os valores têm que ser os valores maiores"; "pra empresa tem que sobrar no mínimo 35%").

Acrescenta a docs/COMERCIAL_C1_TABELA_SERVICOS.json, em cada serviço:
  planilha_30_10: o valor equivalente da planilha "Precificação Contrato Laboratório 2026" (30/10/2026, SEM imposto), quando há;
  decisao_dono_20261101: custo novo, os candidatos (tabela C1, planilha com o imposto por fora, conta com a sobra de 35%), o preço
                         novo (o MAIOR) e a fonte ("planilha 30/10", "conta de custo", "tabela C1", ...).
O SGO+ recalcula sempre pela política em vigor (SGO_Comercial_Ficha.js, ComF_calcular_). Estes números são a referência para a
Diretoria, feitos com o Bônus Coletivo de R$ 3,56 por hora do POL-BON-001 (o sistema usa os colaboradores reais do cadastro).

Uso (da raiz do repositório):
  python _tools/precos_decisao_20261101.py             grava o JSON (CRLF, como estava); depois: node _tools/gerar_tabela_c1.cjs
  python _tools/precos_decisao_20261101.py --conferir  sai com 1 se o JSON gravado não bate com a conta
"""
import json, math, os, sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ARQ = os.path.join(RAIZ, 'docs', 'COMERCIAL_C1_TABELA_SERVICOS.json')

P = {
    'hora_tecnico_custo': 90.0, 'hora_engenheiro_custo': 132.0, 'custo_fixo_sobre_mao_de_obra': 0.25, 'bonus_coletivo_por_hora': 3.56,
    'impostos_servico': 0.1425, 'comissao_venda': 0.03, 'margem_minima': 0.35, 'margem_alvo': 0.40, 'acrescimo_urgente': 1.1,
    'hora_avulsa_sem_imposto': 190.0,
}
# Equivalências com a planilha de 30/10/2026 (valores sem imposto). Regra do dono: o valor maior.
PLANILHA = {
    'MP_CAMARA': {'valor': 950.0, 'referencia': 'ITENS_ORCAMENTO, R$ / MP: câmara fria R$ 850 e câmara com freezer conjugado R$ 950 por visita; usado o maior'},
    'CAL_CAMARA': {'valor': 800.0, 'referencia': 'ITENS_ORCAMENTO, R$ / CAL: R$ 450 (1 ponto) a R$ 800 (3 pontos) para câmara, estufa e incubadora; usado o maior'},
    'QT_CAMARA_CONSERVADORA': {'valor': 2400.0, 'referencia': 'ITENS_ORCAMENTO, R$ / QUAL: câmara de cerca de 600 L com e sem carga, R$ 4.800 = 2 campanhas de 24 h (PAINEL, nota 4); R$ 2.400 por campanha'},
    'QT_ESTUFA': {'valor': 1750.0, 'referencia': 'ITENS_ORCAMENTO, R$ / QUAL: incubadora BOD com e sem carga, R$ 3.500 = 2 campanhas de 24 h (PAINEL, nota 4); R$ 1.750 por campanha (microincubadora R$ 3.300)'},
    'HORA_TECNICO': {'valor': 190.0, 'referencia': 'PECAS_A_COTAR, célula L3: R$ 190 por hora de instalação, sem imposto'},
}


def r2(v):
    return math.floor(v * 100 + 0.5 + 1e-9) / 100


def arred(v):
    n = r2(v)
    if not n > 0:
        return 0.0
    m = 5 if n < 100 else 10
    return r2(math.ceil(n / m - 1e-9) * m)


D_MIN = 1 - P['impostos_servico'] - P['comissao_venda'] - P['margem_minima']
D_ALVO = 1 - P['impostos_servico'] - P['comissao_venda'] - P['margem_alvo']
SEM_IMP = 1 - P['impostos_servico']


def conta(s):
    hT, hE = s['horas']['tecnico'], s['horas']['engenheiro']
    mo = r2(hT * P['hora_tecnico_custo'] + hE * P['hora_engenheiro_custo'])
    fixo = r2(mo * P['custo_fixo_sobre_mao_de_obra'])
    bonus = r2((hT + hE) * P['bonus_coletivo_por_hora'])
    custo = r2(mo + fixo + bonus + s['padroes_rateio'] + s['consumiveis_art'])
    return {'mao_obra': mo, 'custo_fixo': fixo, 'bonus_coletivo': bonus, 'total': custo,
            'preco_conta_sobra_35': arred(custo / D_MIN), 'preco_alvo_40': arred(custo / D_ALVO)}


def montar(d):
    novos = {}
    res = {}
    ordem = sorted(d['servicos'], key=lambda s: 0 if s['codigo'] == 'QT_FREEZER' else 1)
    for s in ordem:
        c = conta(s)
        pl = PLANILHA.get(s['codigo'])
        avulsa = s['codigo'] == 'HORA_TECNICO'
        cand = {'tabela_c1': None if avulsa else float(s['preco_normal']), 'planilha_com_imposto': arred(pl['valor'] / SEM_IMP) if pl else None,
                'conta_custo_sobra_35': c['preco_conta_sobra_35'], 'piso_freezer': None}
        if 'piso de 120% do freezer' in s['fonte_preco'] and 'QT_FREEZER' in novos:
            cand['piso_freezer'] = arred(novos['QT_FREEZER'] * 1.2)
        nomes = {'conta_custo_sobra_35': 'conta de custo', 'planilha_com_imposto': 'hora avulsa (planilha 30/10)' if avulsa else 'planilha 30/10',
                 'tabela_c1': 'tabela C1', 'piso_freezer': 'piso de 120% do freezer'}
        preco, fonte = None, ''
        for k in ['conta_custo_sobra_35', 'planilha_com_imposto', 'tabela_c1', 'piso_freezer']:
            if cand[k] is not None and (preco is None or cand[k] > preco + 0.004):
                preco, fonte = cand[k], nomes[k]
        novos[s['codigo']] = preco
        sobra = r2(preco * (1 - P['impostos_servico'] - P['comissao_venda']) - c['total'])
        res[s['codigo']] = {'custo': c, 'candidatos': cand, 'preco_antes': float(s['preco_normal']), 'preco_novo': preco, 'fonte': fonte,
                            'aumento_pct': r2((preco / s['preco_normal'] - 1) * 100), 'preco_urgente_novo': arred(preco * (1 + P['acrescimo_urgente'])),
                            'sobra_no_preco_novo_pct': r2(sobra / preco * 100)}
    d['meta']['decisao_dono_20261101'] = {
        'falas': ['Pra empresa tem que sobrar no mínimo 35%', 'Os valores têm que ser os valores maiores, esses serviços estão muito baratos'],
        'regra': 'preço = o MAIOR entre a tabela C1 (preco_normal), a planilha de 30/10/2026 com o imposto por fora (valor ÷ (1 − impostos de serviço)) e a conta de custo com a sobra mínima (custo ÷ (1 − impostos − comissão − 35%)); hora avulsa: o maior entre R$ 190 ÷ (1 − impostos) e a conta; ultracongelador com piso de 120% do freezer',
        'custo': 'horas x custo da hora (técnico R$ 90, MAN-VIA-001; engenheiro R$ 132) + 25% de custo fixo sobre a mão de obra + Bônus Coletivo diluído (horas x R$ 3,56, POL-BON-001) + padrões + consumíveis/ART',
        'parametros': P,
        'observacao': 'O SGO+ recalcula pela política em vigor (bônus com os colaboradores reais do cadastro; impostos da unidade emissora). Arredondamento para cima: R$ 5 abaixo de R$ 100 e R$ 10 acima.',
    }
    for s in d['servicos']:
        if s['codigo'] in PLANILHA:
            s['planilha_30_10'] = dict({'sem_imposto': True}, **PLANILHA[s['codigo']])
        else:
            s.pop('planilha_30_10', None)
        s['decisao_dono_20261101'] = res[s['codigo']]
    return d


def main():
    atual = open(ARQ, encoding='utf-8', newline='').read()
    d = montar(json.loads(atual))
    texto = json.dumps(d, indent=1, ensure_ascii=False).replace('\n', '\r\n')
    if '--conferir' in sys.argv:
        if texto != atual:
            print('docs/COMERCIAL_C1_TABELA_SERVICOS.json desatualizado: rode python _tools/precos_decisao_20261101.py')
            sys.exit(1)
        print('JSON confere com a decisão de 01/11/2026.')
        return
    open(ARQ, 'w', encoding='utf-8', newline='').write(texto)
    for s in d['servicos']:
        x = s['decisao_dono_20261101']
        print('%s: %s -> %s (%s)' % (s['codigo'], s['preco_normal'], x['preco_novo'], x['fonte']))


if __name__ == '__main__':
    main()
