# Definições do Financeiro (FORM-FIN-001, Wanessa, 19/11/2026) — regras oficiais do Financeiro v2

Fonte: FORM-FIN-001 Rev. 00 preenchido pela Wanessa em 19/11/2026 + mensagens do escritório 19/11 10:27–10:53 + planilha de contas fixas (`contas-fixas-wanessa-20261119.csv`, print `contas-fixas-wanessa-20261119.png`). Validação da Diretoria: Thiago (dono).

## Empresas
- Matriz 32.487.278/0001-21 — Omie "METROLAB". **Regime: Lucro Real.**
- Filial RJ 32.487.278/0002-02 — Omie próprio "METROLAB'S FILIAL RJ" (chaves ainda não gravadas). A planilha de contas fixas já separa despesas da FILIAL (aluguel Zelter, Light, Claro, estacionamento, proteção veicular, telefone assistência RJ).
- Prestadora (Metrolabs Serviços) 62.909.375/0001-26 — **sem Omie próprio** ("ainda não temos esse acesso na Omie"). Criada para a **folha de pagamento e as guias (FGTS/INSS e DAS)**. Dentro do Omie da matriz existe **conta da prestadora vinculada para baixa**. Na planilha, INSS/FGTS/DAS "METROLAB(S) SERVIÇOS" aparecem lançados como MATRIZ — tratar como despesa da Prestadora paga pela conta dela dentro do Omie da matriz (conferir com a Wanessa na etapa b).
- Contas bancárias: dono disse que todas são da matriz; exceção a conferir: a conta da prestadora citada pela Wanessa.

## A. Pagamentos pelo banco (Sicredi Multipag)
- A1/A2: sem valor máximo por pagamento nem por dia (limite configurável, padrão vazio = sem limite).
- A3/A4: aprovação no app do Sicredi: **Charles e Thiago** (somente os sócios; sem suplente).
- A5: sem regra de 2 aprovações.
- A6: pagamentos **todo dia útil**.

## B. Alçadas de contas a pagar
- B1–B3: o Financeiro **não aprova nenhum valor**; **qualquer pagamento, só os sócios** (Thiago ou Charles). Confirma a regra do dono.

## C. Régua de cobrança de clientes
- C1: **não enviar** lembrete antes do vencimento.
- C2: canais **e-mail, WhatsApp e telefone** (ligação da equipe = tarefa para a Wanessa). WhatsApp ao cliente depende dos modelos aprovados pela Meta.
- C3: 1ª cobrança **1 dia útil** após o vencimento; C4: 2ª cobrança **2 dias úteis** após.
- C5: avisar a Diretoria com **3 dias** de atraso.
- C6/C7: protesto **só com autorização da Diretoria** (o boleto informa protesto em 20 dias).
- C8: multa **3%** e juros **2% ao mês**. Prática: o cliente atrasado costuma pedir **Pix para pagar sem multa** — o sistema deve permitir gerar Pix do valor original (decisão registrada caso a caso, com quem autorizou).
- C9: nenhum cliente excluído informado (lista configurável).
- C10: tom **cordial e formal**.

## D. Vale-alimentação (iFood Benefícios) — integração nova
- D1: **valor por dia trabalhado**. D2: **R$ 25,00/dia na Matriz; R$ 50,00/dia na Filial**.
- D3: **todos** os colaboradores. D4/D5: **não desconta faltas**; desconta **só nas férias**.
- D6: admissão/desligamento: "outro" (não descrito — conferir). D7: pedido **quando a Diretoria solicitar** (sem dia fixo).
- D8: **há desconto em folha (coparticipação)** — percentual a confirmar.

## E. Cargas Caju (viagens e rotina técnica)
- E1/E2: valor **de acordo com a viagem** (sem teto fixo).
- E3: aprovação **Charles e Thiago**.
- E4: técnico presta contas em **3 dias** após a viagem.

## F. Caixa e rotina
- F1: alerta de **saldo mínimo R$ 30.000,00**.
- F2: alertas de caixa: **Financeiro** (Wanessa acompanha pelo extrato).
- F3: fechamento no **dia 5 do mês seguinte**.
- F4: relatório semanal de saúde financeira para o **Charles**.
- F5: tarefa que mais toma tempo: **relatório de provisão mensal** → automatizar (prioridade).

## Impostos e folha (Lucro Real)
- FGTS e INSS: dia **20**. DAS: dia **23**. PIS/COFINS/ICMS: dia **25**. ISS (guia): dia **15**. IPTU (Prefeitura de Goiânia): dia **20**.
- Folha de pagamento e pró-labore: **5º dia útil** de cada mês.

## Contas fixas (52 linhas)
Ver `contas-fixas-wanessa-20261119.csv` (empresa, fornecedor, dia, forma: boleto / débito automático / Pix, banco do débito). Base para o calendário de contas fixas, previsão de caixa e conferência de débitos automáticos (Sicoob, Caixa, Itaú).
