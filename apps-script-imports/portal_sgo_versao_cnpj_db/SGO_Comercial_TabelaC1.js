/****************************************************
 * COMERCIAL C2 — TABELA DE PREÇOS DA C1 (gerado; não editar à mão)
 *
 * Gerado por _tools/gerar_tabela_c1.cjs a partir de docs/COMERCIAL_C1_TABELA_SERVICOS.json (2026-11-01).
 * São os 42 serviços que a gestão importa para o catálogo em Produtos e serviços > "Importar tabela de preços C1"
 * (SGO_Comercial_Ficha.js): horas por função, padrões, consumíveis, os preços da C1, o mercado público (PNCP) e o histórico
 * da Metrolabs (CRM 2025-26 e Drive 2018-23). Os preços valem como referência: o sistema recalcula pela política em vigor.
 ****************************************************/

var COM_TABELA_C1 = {
 "versao": "C1-2026-11-01",
 "servicos": [
  {
   "codigo": "QT_AUTOCLAVE_GRANDE",
   "nome": "Qualificação térmica de autoclave a vapor acima de 100 L (QI, QO e QD)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "QI, QO e QD com até 3 programas de ciclo (3 ciclos por programa), teste de vácuo e Bowie-Dick quando aplicável; calibração RBC da instrumentação da autoclave (sensor de temperatura, manômetro, manovacuômetro, válvula de segurança com ART); relatório com F0, gráficos e parecer.",
   "horasTecnico": 14,
   "horasEngenheiro": 5,
   "padroes": 150,
   "consumiveis": 130,
   "c1": {
    "custo": 1892.5,
    "precoConta": 3020,
    "precoNormal": 3020,
    "precoMinimo": 2610,
    "precoUrgente": 6350
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 17,
     "min": 2700,
     "mediana": 3800,
     "max": 7500
    },
    "ganhos": {
     "n": 6,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "drive": {
     "n": 73,
     "min": 1000,
     "mediana": 2750,
     "max": 10500
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 59,
    "min": 610.74,
    "mediana": 2550,
    "max": 8700,
    "orgaos": 31,
    "q1": 1800,
    "q3": 3899
   },
   "mercadoCentroOeste": {
    "n": 2,
    "min": 3375,
    "mediana": 3375,
    "max": 3375
   }
  },
  {
   "codigo": "QT_AUTOCLAVE_BANCADA",
   "nome": "Qualificação térmica de autoclave de bancada até 100 L (QO e QD)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "QO e QD em 1 ou 2 programas (3 ciclos por programa), calibração do sensor do equipamento, relatório.",
   "horasTecnico": 7,
   "horasEngenheiro": 3,
   "padroes": 100,
   "consumiveis": 30,
   "c1": {
    "custo": 1018.75,
    "precoConta": 1630,
    "precoNormal": 1660,
    "precoMinimo": 1410,
    "precoUrgente": 3490
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 13,
     "min": 1080,
     "mediana": 2750,
     "max": 3500
    },
    "ganhos": {
     "n": 3,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "drive": {
     "n": 2,
     "min": 2200,
     "mediana": 2200,
     "max": 2200
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 7,
    "min": 799,
    "mediana": 1659.5,
    "max": 7200,
    "orgaos": 5,
    "q1": 955,
    "q3": 5000
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_AUTOCLAVE_BT",
   "nome": "Qualificação de esterilizador de baixa temperatura (formaldeído, peróxido ou óxido de etileno)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "QI, QO e QD, perfil de temperatura e pressão, calibração da instrumentação; indicadores químicos e biológicos fornecidos pelo cliente.",
   "horasTecnico": 8,
   "horasEngenheiro": 4,
   "padroes": 100,
   "consumiveis": 30,
   "c1": {
    "custo": 1240,
    "precoConta": 1980,
    "precoNormal": 1980,
    "precoMinimo": 1710,
    "precoUrgente": 4160
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "ganhos": {
     "n": 3,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_LAVADORA_TD",
   "nome": "Qualificação de lavadora termodesinfectora (QI, QO e QD)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Perfil térmico das fases de lavagem e termodesinfecção (A0), calibração da instrumentação, testes de limpeza fornecidos pelo cliente.",
   "horasTecnico": 8,
   "horasEngenheiro": 4,
   "padroes": 120,
   "consumiveis": 30,
   "c1": {
    "custo": 1260,
    "precoConta": 2010,
    "precoNormal": 2430,
    "precoMinimo": 1740,
    "precoUrgente": 5110
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 3,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "ganhos": {
     "n": 3,
     "min": 2750,
     "mediana": 2750,
     "max": 2750
    },
    "drive": {
     "n": 23,
     "min": 700,
     "mediana": 1300,
     "max": 7850
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 11,
    "min": 1109.76,
    "mediana": 2425,
    "max": 4013,
    "orgaos": 5,
    "q1": 1500,
    "q3": 4013
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_LAVADORA_US",
   "nome": "Qualificação de lavadora ultrassônica",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Temperatura da cuba, tempo, teste de cavitação, calibração do sensor.",
   "horasTecnico": 4,
   "horasEngenheiro": 2,
   "padroes": 60,
   "consumiveis": 20,
   "c1": {
    "custo": 635,
    "precoConta": 1020,
    "precoNormal": 1430,
    "precoMinimo": 880,
    "precoUrgente": 3010
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 7,
     "min": 850,
     "mediana": 1500,
     "max": 2800
    },
    "ganhos": null,
    "drive": {
     "n": 14,
     "min": 700,
     "mediana": 850,
     "max": 3780
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 6,
    "min": 1263.6,
    "mediana": 1423.3,
    "max": 3000,
    "orgaos": 3,
    "q1": 1295.76,
    "q3": 1910
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_SECADORA",
   "nome": "Qualificação de secadora ou gabinete de secagem",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Mapeamento de temperatura da câmara e calibração do controlador.",
   "horasTecnico": 3,
   "horasEngenheiro": 1.5,
   "padroes": 50,
   "consumiveis": 0,
   "c1": {
    "custo": 466.25,
    "precoConta": 750,
    "precoNormal": 750,
    "precoMinimo": 650,
    "precoUrgente": 1580
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs",
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 4,
     "min": 500,
     "mediana": 650,
     "max": 650
    },
    "ganhos": {
     "n": 3,
     "min": 650,
     "mediana": 650,
     "max": 650
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_SELADORA",
   "nome": "Validação de seladora térmica",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Temperatura das barras, pressão e tempo, ensaio de integridade da selagem.",
   "horasTecnico": 2,
   "horasEngenheiro": 1,
   "padroes": 40,
   "consumiveis": 30,
   "c1": {
    "custo": 347.5,
    "precoConta": 560,
    "precoNormal": 560,
    "precoMinimo": 480,
    "precoUrgente": 1180
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs"
   ],
   "historico": {
    "crm": {
     "n": 1,
     "min": 550,
     "mediana": 550,
     "max": 550
    },
    "ganhos": null,
    "drive": {
     "n": 2,
     "min": 900,
     "mediana": 900,
     "max": 900
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 3,
    "min": 805.61,
    "mediana": 850,
    "max": 856.82,
    "orgaos": 1,
    "q1": 805.61,
    "q3": 856.82
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_CAMARA_CONSERVADORA",
   "nome": "Qualificação térmica de câmara de conservação ou refrigerador (até 1.000 L)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento, 1 campanha de 24 h",
   "escopo": "Mapeamento com cerca de 9 sensores por 24 h, abertura de porta e queda de energia; campanha com carga é adicional (ver regras).",
   "horasTecnico": 4,
   "horasEngenheiro": 3,
   "padroes": 80,
   "consumiveis": 20,
   "c1": {
    "custo": 820,
    "precoConta": 1310,
    "precoNormal": 1310,
    "precoMinimo": 1130,
    "precoUrgente": 2760
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do 3º quartil do mercado público: revisar horas ou aceitar perder licitação"
   ],
   "historico": {
    "crm": {
     "n": 12,
     "min": 1000,
     "mediana": 1895,
     "max": 2800
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 16,
    "min": 316.8,
    "mediana": 899,
    "max": 1228.78,
    "orgaos": 7,
    "q1": 762.9,
    "q3": 959
   },
   "mercadoCentroOeste": {
    "n": 2,
    "min": 920,
    "mediana": 985,
    "max": 1050
   }
  },
  {
   "codigo": "QT_FREEZER",
   "nome": "Qualificação térmica de freezer (-10 a -30 °C)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento, 1 campanha de 24 h",
   "escopo": "Mapeamento 24 h com sensores para baixa temperatura, abertura de porta e queda de energia.",
   "horasTecnico": 4,
   "horasEngenheiro": 3,
   "padroes": 100,
   "consumiveis": 20,
   "c1": {
    "custo": 840,
    "precoConta": 1340,
    "precoNormal": 1800,
    "precoMinimo": 1160,
    "precoUrgente": 3780
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 4,
     "min": 1000,
     "mediana": 1800,
     "max": 2200
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 9,
    "min": 639.98,
    "mediana": 2200,
    "max": 2381.1,
    "orgaos": 4,
    "q1": 1328.25,
    "q3": 2381.1
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_ULTRAFREEZER",
   "nome": "Qualificação térmica de ultracongelador (-65 a -86 °C)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento, 1 campanha de 24 h",
   "escopo": "Como o freezer, com sensores e cabos para ultrabaixa temperatura.",
   "horasTecnico": 4,
   "horasEngenheiro": 3.5,
   "padroes": 140,
   "consumiveis": 20,
   "c1": {
    "custo": 962.5,
    "precoConta": 1540,
    "precoNormal": 2160,
    "precoMinimo": 1330,
    "precoUrgente": 4540
   },
   "regra": {
    "tipo": "PISO_RELATIVO",
    "base": "QT_FREEZER",
    "fator": 1.2
   },
   "fonte": "custo, com piso de 120% do freezer (ultrabaixa temperatura exige mais sensores e tempo)",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 4,
     "min": 1850,
     "mediana": 3150,
     "max": 3500
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_CAMARA_FRIA",
   "nome": "Qualificação térmica de câmara fria (walk-in, até 30 m³)",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento, 1 campanha de 24 h",
   "escopo": "Mapeamento com 15 ou mais sensores por 24 h, abertura de porta e queda de energia.",
   "horasTecnico": 6,
   "horasEngenheiro": 5,
   "padroes": 200,
   "consumiveis": 20,
   "c1": {
    "custo": 1382.5,
    "precoConta": 2210,
    "precoNormal": 2210,
    "precoMinimo": 1910,
    "precoUrgente": 4650
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 2,
    "min": 1560,
    "mediana": 1970.55,
    "max": 2381.1,
    "orgaos": 2,
    "q1": 1560,
    "q3": 2381.1
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_ESTUFA",
   "nome": "Qualificação térmica de estufa, incubadora de laboratório ou banho-maria",
   "grupo": "Qualificação térmica",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento, 1 temperatura de trabalho",
   "escopo": "Mapeamento com cerca de 9 sensores, estabilidade, uniformidade e recuperação de porta.",
   "horasTecnico": 3,
   "horasEngenheiro": 2.5,
   "padroes": 60,
   "consumiveis": 20,
   "c1": {
    "custo": 661.25,
    "precoConta": 1060,
    "precoNormal": 1060,
    "precoMinimo": 910,
    "precoUrgente": 2230
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs",
    "Metrolabs vem cotando abaixo do preço mínimo (margem de 10%) desta conta"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 450,
     "mediana": 450,
     "max": 550
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 19,
    "min": 190,
    "mediana": 957.53,
    "max": 2790,
    "orgaos": 10,
    "q1": 694.31,
    "q3": 1560
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_SALA",
   "nome": "Mapeamento térmico de ambiente (farmácia, almoxarifado, depósito)",
   "grupo": "Qualificação térmica",
   "unidade": "ambiente",
   "unidadeTexto": "por ambiente, até 7 dias",
   "escopo": "Cerca de 12 pontos de temperatura e 2 de umidade por até 7 dias; relatório conforme as normas sanitárias de armazenamento.",
   "horasTecnico": 6,
   "horasEngenheiro": 6,
   "padroes": 250,
   "consumiveis": 20,
   "c1": {
    "custo": 1597.5,
    "precoConta": 2550,
    "precoNormal": 2550,
    "precoMinimo": 2200,
    "precoUrgente": 5360
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "QT_CAIXA_TERMICA",
   "nome": "Qualificação térmica de caixa térmica de transporte",
   "grupo": "Qualificação térmica",
   "unidade": "caixa",
   "unidadeTexto": "por caixa",
   "escopo": "Mapeamento do tempo de conservação com carga e gelo reciclável.",
   "horasTecnico": 2,
   "horasEngenheiro": 1.5,
   "padroes": 40,
   "consumiveis": 0,
   "c1": {
    "custo": 400,
    "precoConta": 640,
    "precoNormal": 640,
    "precoMinimo": 550,
    "precoUrgente": 1350
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs",
    "Metrolabs vem cotando abaixo do preço mínimo (margem de 10%) desta conta",
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 1,
     "min": 380,
     "mediana": 380,
     "max": 380
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_MONITOR",
   "nome": "Calibração com teste de segurança elétrica de monitor multiparamétrico",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "ECG, SpO2, PNI, temperatura e respiração com simulador; segurança elétrica com analisador.",
   "horasTecnico": 1.25,
   "horasEngenheiro": 0.3,
   "padroes": 35,
   "consumiveis": 0,
   "c1": {
    "custo": 154.81,
    "precoConta": 250,
    "precoNormal": 350,
    "precoMinimo": 220,
    "precoUrgente": 740
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 151.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 15,
     "min": 239,
     "mediana": 350,
     "max": 380
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": {
     "n": 2,
     "min": 151,
     "mediana": 151,
     "max": 151
    }
   },
   "mercado": {
    "n": 23,
    "min": 91,
    "mediana": 430,
    "max": 1600,
    "orgaos": 16,
    "q1": 390,
    "q3": 520
   },
   "mercadoCentroOeste": {
    "n": 3,
    "min": 1005,
    "mediana": 1005,
    "max": 1600
   }
  },
  {
   "codigo": "CAL_DESFIBRILADOR",
   "nome": "Calibração com teste de segurança elétrica de desfibrilador ou cardioversor",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Energia entregue, tempo de carga, sincronismo, segurança elétrica.",
   "horasTecnico": 1,
   "horasEngenheiro": 0.3,
   "padroes": 40,
   "consumiveis": 0,
   "c1": {
    "custo": 145.75,
    "precoConta": 240,
    "precoNormal": 280,
    "precoMinimo": 210,
    "precoUrgente": 590
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 164.80), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 11,
     "min": 190,
     "mediana": 280,
     "max": 450
    },
    "ganhos": {
     "n": 3,
     "min": 412,
     "mediana": 450,
     "max": 450
    },
    "drive": null,
    "custoCrm": {
     "n": 5,
     "min": 164.8,
     "mediana": 164.8,
     "max": 164.8
    }
   },
   "mercado": {
    "n": 47,
    "min": 91,
    "mediana": 399,
    "max": 940,
    "orgaos": 28,
    "q1": 280,
    "q3": 600
   },
   "mercadoCentroOeste": {
    "n": 2,
    "min": 550,
    "mediana": 585,
    "max": 620
   }
  },
  {
   "codigo": "CAL_BOMBA_INFUSAO",
   "nome": "Calibração com teste de segurança elétrica de bomba de infusão",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Vazão e pressão de oclusão com analisador, alarmes, segurança elétrica.",
   "horasTecnico": 1.5,
   "horasEngenheiro": 0.3,
   "padroes": 40,
   "consumiveis": 0,
   "c1": {
    "custo": 173.88,
    "precoConta": 280,
    "precoNormal": 280,
    "precoMinimo": 240,
    "precoUrgente": 590
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 80.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 8,
     "min": 200,
     "mediana": 280,
     "max": 950
    },
    "ganhos": {
     "n": 3,
     "min": 200,
     "mediana": 280,
     "max": 280
    },
    "drive": null,
    "custoCrm": {
     "n": 5,
     "min": 80,
     "mediana": 80,
     "max": 80
    }
   },
   "mercado": {
    "n": 8,
    "min": 174,
    "mediana": 333.33,
    "max": 395,
    "orgaos": 5,
    "q1": 315,
    "q3": 395
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_VENTILADOR",
   "nome": "Calibração com teste de segurança elétrica de ventilador pulmonar",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Volume, pressão, frequência, FiO2 e PEEP com analisador de fluxo, alarmes, segurança elétrica.",
   "horasTecnico": 1.5,
   "horasEngenheiro": 0.4,
   "padroes": 50,
   "consumiveis": 0,
   "c1": {
    "custo": 200.38,
    "precoConta": 320,
    "precoNormal": 350,
    "precoMinimo": 280,
    "precoUrgente": 740
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 163.20), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 15,
     "min": 290,
     "mediana": 350,
     "max": 470
    },
    "ganhos": {
     "n": 3,
     "min": 408,
     "mediana": 470,
     "max": 470
    },
    "drive": null,
    "custoCrm": {
     "n": 5,
     "min": 163.2,
     "mediana": 163.2,
     "max": 163.2
    }
   },
   "mercado": {
    "n": 6,
    "min": 300,
    "mediana": 1428,
    "max": 4100,
    "orgaos": 5,
    "q1": 300,
    "q3": 1780
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_ECG",
   "nome": "Calibração com teste de segurança elétrica de eletrocardiógrafo",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Amplitude, frequência e velocidade com simulador, segurança elétrica.",
   "horasTecnico": 0.75,
   "horasEngenheiro": 0.25,
   "padroes": 25,
   "consumiveis": 0,
   "c1": {
    "custo": 108.44,
    "precoConta": 180,
    "precoNormal": 210,
    "precoMinimo": 150,
    "precoUrgente": 450
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 8,
     "min": 180,
     "mediana": 205,
     "max": 235
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 34,
    "min": 145,
    "mediana": 382,
    "max": 1549.5,
    "orgaos": 24,
    "q1": 260,
    "q3": 395
   },
   "mercadoCentroOeste": {
    "n": 1,
    "min": 620,
    "mediana": 620,
    "max": 620
   }
  },
  {
   "codigo": "CAL_BISTURI",
   "nome": "Calibração com teste de segurança elétrica de bisturi elétrico",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Potência de saída por modo e carga, fuga de RF, segurança elétrica.",
   "horasTecnico": 1,
   "horasEngenheiro": 0.3,
   "padroes": 40,
   "consumiveis": 0,
   "c1": {
    "custo": 145.75,
    "precoConta": 240,
    "precoNormal": 480,
    "precoMinimo": 210,
    "precoUrgente": 1010
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 266.60), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 7,
     "min": 210,
     "mediana": 480,
     "max": 526.4
    },
    "ganhos": {
     "n": 2,
     "min": 480,
     "mediana": 480,
     "max": 480
    },
    "drive": null,
    "custoCrm": {
     "n": 4,
     "min": 263.2,
     "mediana": 266.6,
     "max": 270
    }
   },
   "mercado": {
    "n": 3,
    "min": 160,
    "mediana": 473.33,
    "max": 830,
    "orgaos": 3,
    "q1": 160,
    "q3": 830
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_OXIMETRO",
   "nome": "Calibração de oxímetro de pulso",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "SpO2 e frequência de pulso com simulador.",
   "horasTecnico": 0.5,
   "horasEngenheiro": 0.2,
   "padroes": 20,
   "consumiveis": 0,
   "c1": {
    "custo": 81.12,
    "precoConta": 130,
    "precoNormal": 180,
    "precoMinimo": 120,
    "precoUrgente": 380
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 120.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 7,
     "min": 95,
     "mediana": 200,
     "max": 289.9
    },
    "ganhos": {
     "n": 1,
     "min": 240,
     "mediana": 240,
     "max": 240
    },
    "drive": null,
    "custoCrm": {
     "n": 3,
     "min": 120,
     "mediana": 120,
     "max": 120
    }
   },
   "mercado": {
    "n": 13,
    "min": 49,
    "mediana": 174,
    "max": 290,
    "orgaos": 10,
    "q1": 100,
    "q3": 262
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_INCUBADORA_NEO",
   "nome": "Calibração com teste de segurança elétrica de incubadora neonatal ou berço aquecido",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Temperatura, umidade, fluxo de ar e ruído com analisador, segurança elétrica.",
   "horasTecnico": 1.5,
   "horasEngenheiro": 0.4,
   "padroes": 30,
   "consumiveis": 0,
   "c1": {
    "custo": 180.38,
    "precoConta": 290,
    "precoNormal": 290,
    "precoMinimo": 250,
    "precoUrgente": 610
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "Metrolabs vem cotando abaixo do preço mínimo (margem de 10%) desta conta"
   ],
   "historico": {
    "crm": {
     "n": 12,
     "min": 97.5,
     "mediana": 242,
     "max": 385
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 13,
    "min": 174,
    "mediana": 404.69,
    "max": 982.5,
    "orgaos": 6,
    "q1": 325,
    "q3": 615
   },
   "mercadoCentroOeste": {
    "n": 1,
    "min": 615,
    "mediana": 615,
    "max": 615
   }
  },
  {
   "codigo": "CAL_ASPIRADOR",
   "nome": "Calibração com teste de segurança elétrica de aspirador cirúrgico",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Vácuo e vazão, segurança elétrica.",
   "horasTecnico": 0.5,
   "horasEngenheiro": 0.15,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 62.88,
    "precoConta": 110,
    "precoNormal": 190,
    "precoMinimo": 90,
    "precoUrgente": 400
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 4,
     "min": 60,
     "mediana": 188.57,
     "max": 199
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 3,
    "min": 174,
    "mediana": 230,
    "max": 880,
    "orgaos": 2,
    "q1": 174,
    "q3": 880
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_ANESTESIA",
   "nome": "Calibração com teste de segurança elétrica de aparelho de anestesia",
   "grupo": "Calibração de eletromédicos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Fluxômetros, pressões, ventilador do aparelho, vazamento, segurança elétrica.",
   "horasTecnico": 2,
   "horasEngenheiro": 0.5,
   "padroes": 50,
   "consumiveis": 0,
   "c1": {
    "custo": 245,
    "precoConta": 400,
    "precoNormal": 400,
    "precoMinimo": 340,
    "precoUrgente": 840
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs",
    "Metrolabs vem cotando abaixo do preço mínimo (margem de 10%) desta conta",
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 250,
     "mediana": 250,
     "max": 320
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_ESFIGMO",
   "nome": "Calibração de esfigmomanômetro (aneroide ou digital)",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Pressão em 5 pontos e vazamento.",
   "horasTecnico": 0.33,
   "horasEngenheiro": 0.1,
   "padroes": 5,
   "consumiveis": 0,
   "c1": {
    "custo": 40.06,
    "precoConta": 65,
    "precoNormal": 70,
    "precoMinimo": 60,
    "precoUrgente": 150
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 48.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 13,
     "min": 59,
     "mediana": 70,
     "max": 120
    },
    "ganhos": {
     "n": 5,
     "min": 59,
     "mediana": 65,
     "max": 120
    },
    "drive": {
     "n": 14,
     "min": 55,
     "mediana": 115,
     "max": 165
    },
    "custoCrm": {
     "n": 5,
     "min": 48,
     "mediana": 48,
     "max": 48
    }
   },
   "mercado": {
    "n": 13,
    "min": 40,
    "mediana": 81.66,
    "max": 357.3,
    "orgaos": 9,
    "q1": 55,
    "q3": 158.1
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_TERMOMETRO",
   "nome": "Calibração de termômetro (digital, espeto, máxima e mínima)",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Até 3 pontos de temperatura.",
   "horasTecnico": 0.33,
   "horasEngenheiro": 0.1,
   "padroes": 8,
   "consumiveis": 0,
   "c1": {
    "custo": 43.06,
    "precoConta": 70,
    "precoNormal": 70,
    "precoMinimo": 60,
    "precoUrgente": 150
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 28,
     "min": 55,
     "mediana": 70,
     "max": 100
    },
    "ganhos": {
     "n": 9,
     "min": 65,
     "mediana": 75,
     "max": 75
    },
    "drive": {
     "n": 6,
     "min": 50,
     "mediana": 150,
     "max": 180
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 143,
    "min": 45,
    "mediana": 132,
    "max": 628,
    "orgaos": 58,
    "q1": 90,
    "q3": 200
   },
   "mercadoCentroOeste": {
    "n": 5,
    "min": 60,
    "mediana": 122.7,
    "max": 456
   }
  },
  {
   "codigo": "CAL_TERMOHIGROMETRO",
   "nome": "Calibração de termo-higrômetro",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Temperatura e umidade relativa, até 3 pontos cada, em lote no laboratório.",
   "horasTecnico": 0.3,
   "horasEngenheiro": 0.1,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 43.38,
    "precoConta": 70,
    "precoNormal": 70,
    "precoMinimo": 60,
    "precoUrgente": 150
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 24,
     "min": 50,
     "mediana": 60,
     "max": 95
    },
    "ganhos": {
     "n": 7,
     "min": 50,
     "mediana": 60,
     "max": 65
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": {
    "n": 89,
    "min": 42,
    "mediana": 188.03,
    "max": 481,
    "orgaos": 34,
    "q1": 105.7,
    "q3": 336.92
   },
   "mercadoCentroOeste": {
    "n": 4,
    "min": 42,
    "mediana": 43.25,
    "max": 72
   }
  },
  {
   "codigo": "CAL_DATALOGGER",
   "nome": "Calibração de registrador de temperatura (data logger)",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Até 3 pontos de temperatura.",
   "horasTecnico": 0.5,
   "horasEngenheiro": 0.15,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 62.88,
    "precoConta": 110,
    "precoNormal": 110,
    "precoMinimo": 90,
    "precoUrgente": 240
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 60.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado",
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 2,
     "min": 140,
     "mediana": 140,
     "max": 140
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": {
     "n": 2,
     "min": 60,
     "mediana": 60,
     "max": 60
    }
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_BALANCA_PEQ",
   "nome": "Calibração de balança até 30 kg (neonatal, pediátrica, de bancada)",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Excentricidade, repetibilidade e carga em 5 pontos com pesos padrão.",
   "horasTecnico": 0.6,
   "horasEngenheiro": 0.15,
   "padroes": 15,
   "consumiveis": 0,
   "c1": {
    "custo": 73.5,
    "precoConta": 120,
    "precoNormal": 150,
    "precoMinimo": 110,
    "precoUrgente": 320
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 59.60), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 10,
     "min": 102,
     "mediana": 150,
     "max": 550
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": {
     "n": 3,
     "min": 59.6,
     "mediana": 59.6,
     "max": 59.6
    }
   },
   "mercado": {
    "n": 21,
    "min": 115,
    "mediana": 249,
    "max": 410.66,
    "orgaos": 15,
    "q1": 173.18,
    "q3": 320
   },
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_BALANCA_ADULTO",
   "nome": "Calibração de balança até 300 kg (antropométrica, plataforma)",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Excentricidade, repetibilidade e carga com pesos padrão transportados.",
   "horasTecnico": 1,
   "horasEngenheiro": 0.2,
   "padroes": 40,
   "consumiveis": 0,
   "c1": {
    "custo": 129.25,
    "precoConta": 210,
    "precoNormal": 250,
    "precoMinimo": 180,
    "precoUrgente": 530
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [
    "o CRM tem custo cadastrado (mediana R$ 210.00), provável valor pago a parceiro: confirmar se o serviço é terceirizado"
   ],
   "historico": {
    "crm": {
     "n": 14,
     "min": 285,
     "mediana": 295,
     "max": 465
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": {
     "n": 5,
     "min": 177,
     "mediana": 210,
     "max": 279
    }
   },
   "mercado": {
    "n": 72,
    "min": 90,
    "mediana": 249,
    "max": 625,
    "orgaos": 33,
    "q1": 190,
    "q3": 330
   },
   "mercadoCentroOeste": {
    "n": 4,
    "min": 219,
    "mediana": 232.28,
    "max": 259.01
   }
  },
  {
   "codigo": "CAL_MANOMETRO",
   "nome": "Calibração de manômetro, manovacuômetro ou transdutor de pressão",
   "grupo": "Calibração de instrumentos",
   "unidade": "instr.",
   "unidadeTexto": "por instrumento",
   "escopo": "Até 5 pontos de pressão.",
   "horasTecnico": 0.5,
   "horasEngenheiro": 0.15,
   "padroes": 15,
   "consumiveis": 0,
   "c1": {
    "custo": 67.88,
    "precoConta": 110,
    "precoNormal": 110,
    "precoMinimo": 95,
    "precoUrgente": 240
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 2,
     "min": 240,
     "mediana": 379,
     "max": 518
    },
    "ganhos": null,
    "drive": {
     "n": 10,
     "min": 138,
     "mediana": 189,
     "max": 525
    },
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_VALVULA_SEG",
   "nome": "Calibração de válvula de segurança com emissão de ART",
   "grupo": "Calibração de instrumentos",
   "unidade": "válvula",
   "unidadeTexto": "por válvula",
   "escopo": "Pressão de abertura e fechamento em bancada, lacre, ART.",
   "horasTecnico": 1,
   "horasEngenheiro": 0.5,
   "padroes": 20,
   "consumiveis": 0,
   "c1": {
    "custo": 158.75,
    "precoConta": 260,
    "precoNormal": 260,
    "precoMinimo": 220,
    "precoUrgente": 550
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 320,
     "mediana": 320,
     "max": 350
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_CENTRIFUGA",
   "nome": "Calibração de centrífuga",
   "grupo": "Calibração de instrumentos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Rotação, tempo e temperatura (se refrigerada).",
   "horasTecnico": 0.75,
   "horasEngenheiro": 0.2,
   "padroes": 15,
   "consumiveis": 0,
   "c1": {
    "custo": 90.19,
    "precoConta": 150,
    "precoNormal": 150,
    "precoMinimo": 130,
    "precoUrgente": 320
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 10,
     "min": 90,
     "mediana": 350,
     "max": 850
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_CAMARA",
   "nome": "Calibração do indicador de câmara, refrigerador, estufa ou banho",
   "grupo": "Calibração de instrumentos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Indicação do controlador em até 3 pontos (sem mapeamento).",
   "horasTecnico": 0.75,
   "horasEngenheiro": 0.25,
   "padroes": 20,
   "consumiveis": 0,
   "c1": {
    "custo": 103.44,
    "precoConta": 170,
    "precoNormal": 170,
    "precoMinimo": 150,
    "precoUrgente": 360
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "preço pela conta acima do maior preço já praticado pela Metrolabs",
    "Metrolabs vem cotando abaixo do preço mínimo (margem de 10%) desta conta",
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 115,
     "mediana": 115,
     "max": 120
    },
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "CAL_INCUBADORA_BIO",
   "nome": "Calibração de incubadora de indicador biológico",
   "grupo": "Calibração de instrumentos",
   "unidade": "equip.",
   "unidadeTexto": "por equipamento",
   "escopo": "Temperatura do bloco em 1 ponto.",
   "horasTecnico": 0.4,
   "horasEngenheiro": 0.1,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 49,
    "precoConta": 80,
    "precoNormal": 80,
    "precoMinimo": 70,
    "precoUrgente": 170
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 8,
     "min": 150,
     "mediana": 190,
     "max": 240
    },
    "ganhos": {
     "n": 1,
     "min": 190,
     "mediana": 190,
     "max": 190
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "MP_AUTOCLAVE_GRANDE",
   "nome": "Manutenção preventiva de autoclave hospitalar",
   "grupo": "Manutenção preventiva",
   "unidade": "visita",
   "unidadeTexto": "por visita",
   "escopo": "Inspeção, limpeza técnica, testes funcionais e de segurança, relatório com fotos; peças e kits à parte.",
   "horasTecnico": 6,
   "horasEngenheiro": 0.5,
   "padroes": 20,
   "consumiveis": 0,
   "c1": {
    "custo": 440,
    "precoConta": 710,
    "precoNormal": 750,
    "precoMinimo": 610,
    "precoUrgente": 1580
   },
   "regra": {
    "tipo": "MERCADO_HISTORICO"
   },
   "fonte": "custo + mercado + histórico (mercado e histórico acima da conta: sobe até o menor dos dois)",
   "alertas": [],
   "historico": {
    "crm": {
     "n": 5,
     "min": 700,
     "mediana": 750,
     "max": 1780
    },
    "ganhos": {
     "n": 2,
     "min": 700,
     "mediana": 787.5,
     "max": 875
    },
    "drive": {
     "n": 3,
     "min": 500,
     "mediana": 1000,
     "max": 2000
    },
    "custoCrm": null
   },
   "mercado": {
    "n": 82,
    "min": 200,
    "mediana": 900,
    "max": 4733.28,
    "orgaos": 31,
    "q1": 649,
    "q3": 1719.36
   },
   "mercadoCentroOeste": {
    "n": 33,
    "min": 350,
    "mediana": 850,
    "max": 4500
   }
  },
  {
   "codigo": "MP_AUTOCLAVE_BANCADA",
   "nome": "Manutenção preventiva de autoclave de bancada",
   "grupo": "Manutenção preventiva",
   "unidade": "visita",
   "unidadeTexto": "por visita",
   "escopo": "Inspeção, limpeza, troca de guarnição se fornecida, testes; peças à parte.",
   "horasTecnico": 2.5,
   "horasEngenheiro": 0.25,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 191.88,
    "precoConta": 310,
    "precoNormal": 310,
    "precoMinimo": 270,
    "precoUrgente": 660
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 2,
     "min": 450,
     "mediana": 625,
     "max": 800
    },
    "ganhos": {
     "n": 2,
     "min": 450,
     "mediana": 625,
     "max": 800
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "MP_LAVADORA_US",
   "nome": "Manutenção preventiva de lavadora ultrassônica",
   "grupo": "Manutenção preventiva",
   "unidade": "visita",
   "unidadeTexto": "por visita",
   "escopo": "Inspeção, limpeza, testes funcionais; peças à parte.",
   "horasTecnico": 2,
   "horasEngenheiro": 0.25,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 163.75,
    "precoConta": 270,
    "precoNormal": 270,
    "precoMinimo": 230,
    "precoUrgente": 570
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "MP_SELADORA",
   "nome": "Manutenção preventiva de seladora",
   "grupo": "Manutenção preventiva",
   "unidade": "visita",
   "unidadeTexto": "por visita",
   "escopo": "Inspeção, limpeza das barras, testes; peças à parte.",
   "horasTecnico": 1.5,
   "horasEngenheiro": 0.2,
   "padroes": 10,
   "consumiveis": 0,
   "c1": {
    "custo": 127.38,
    "precoConta": 210,
    "precoNormal": 210,
    "precoMinimo": 180,
    "precoUrgente": 450
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": {
     "n": 3,
     "min": 300,
     "mediana": 300,
     "max": 300
    },
    "ganhos": {
     "n": 1,
     "min": 300,
     "mediana": 300,
     "max": 300
    },
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "MP_CAMARA",
   "nome": "Manutenção preventiva de câmara de conservação ou refrigerador",
   "grupo": "Manutenção preventiva",
   "unidade": "visita",
   "unidadeTexto": "por visita",
   "escopo": "Condensador, vedação, degelo, alarmes, tensão e corrente, relatório com fotos; peças à parte.",
   "horasTecnico": 3,
   "horasEngenheiro": 0.5,
   "padroes": 15,
   "consumiveis": 0,
   "c1": {
    "custo": 266.25,
    "precoConta": 430,
    "precoNormal": 430,
    "precoMinimo": 370,
    "precoUrgente": 910
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas"
   ],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "HORA_TECNICO",
   "nome": "Hora técnica de técnico (corretiva, instalação, acompanhamento)",
   "grupo": "Hora técnica",
   "unidade": "hora",
   "unidadeTexto": "por hora",
   "escopo": "Hora em atendimento; mínimo de 2 horas por visita.",
   "horasTecnico": 1,
   "horasEngenheiro": 0,
   "padroes": 0,
   "consumiveis": 0,
   "c1": {
    "custo": 56.25,
    "precoConta": 90,
    "precoNormal": 190,
    "precoMinimo": 80,
    "precoUrgente": 400
   },
   "regra": {
    "tipo": "HORA_AVULSA"
   },
   "fonte": "material interno: planilha de precificação de 30/10/2026 usa R$ 190 por hora de instalação; a conta pura daria R$ 90",
   "alertas": [
    "sem preço comparável em compras públicas",
    "hora avulsa tem ociosidade (espera, diagnóstico sem peça): a conta pura com 140 h faturáveis subestima"
   ],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  },
  {
   "codigo": "HORA_ENGENHEIRO",
   "nome": "Hora técnica de engenheiro (laudo, parecer, consultoria)",
   "grupo": "Hora técnica",
   "unidade": "hora",
   "unidadeTexto": "por hora",
   "escopo": "Hora de engenharia; mínimo de 1 hora.",
   "horasTecnico": 0,
   "horasEngenheiro": 1,
   "padroes": 0,
   "consumiveis": 0,
   "c1": {
    "custo": 165,
    "precoConta": 270,
    "precoNormal": 270,
    "precoMinimo": 230,
    "precoUrgente": 570
   },
   "regra": {
    "tipo": "CONTA"
   },
   "fonte": "custo",
   "alertas": [
    "sem preço comparável em compras públicas",
    "a planilha interna não traz hora de engenheiro; com a mesma folga usada na hora do técnico (R$ 190 sobre custo de R$ 56,25) daria cerca de R$ 560: decisão do dono"
   ],
   "historico": {
    "crm": null,
    "ganhos": null,
    "drive": null,
    "custoCrm": null
   },
   "mercado": null,
   "mercadoCentroOeste": null
  }
 ]
};
