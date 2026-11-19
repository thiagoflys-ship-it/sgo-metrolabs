# Financeiro v2 — refazer o módulo inteiro (pedido do dono, 19/11/2026)

## Pedido
- Refazer TODO o módulo financeiro: bonito, com dashboards e páginas completas, no padrão visual do módulo Comercial. A Wanessa deve operar tudo dentro do SGO+, sem usar Omie ou banco por fora. O SGO+ opera, não só consulta.
- Três especialistas: finanças, design e desenvolvimento.
- Funções do Omie que faltam: transferência entre contas, cadastro completo de fornecedor, relatórios, guias de imposto (e o que mais a rotina da Wanessa mostrar).
- Integrações bancárias: Sicredi (chave já existe), Caju (chave já existe; já há SGO_Caju_Api.js), Sicoob e Itaú (dono está providenciando — deixar pronto para ligar quando a chave chegar).
- Três CNPJs: matriz, filial e prestadora de serviços (alguns funcionários recebem por ela). Tudo junto no SGO+, com visão consolidada e por empresa.

## Regras que continuam
- Acesso ao Financeiro: só dono (admin), Charles e Wanessa.
- Aprovação: só dono ou Charles (exceto Compras e preço comercial: Matheus com critérios).
- Chaves de API: o dono grava em /_sgo/segredos; o código funciona sem a chave e mostra "não configurado".
- Publicar por etapas, com suíte 0 falhas; nunca publicar entre 06:00 e 08:30.

## Fases (um especialista por vez)
1. **Finanças (análise)** — rotina real (dados do Omie e da Wanessa), lista do que falta no SGO+, modelo de 3 CNPJs (um app Omie por CNPJ), APIs Sicredi/Caju/Sicoob/Itaú (o que cada uma permite: extrato, Pix, boleto, pagamento), regras de conciliação automática. Entrega: ESPECIFICACAO.md.
2. **Design** — seguir o padrão do Comercial; dashboard principal, páginas completas por assunto (Contas a receber, Contas a pagar, Bancos e conciliação, Notas fiscais, Cobrança, Fornecedores e clientes, Impostos, Relatórios, Orçamento, Empresas), celular e computador. Entrega: protótipo navegável com dados fictícios + guia visual.
3. **Desenvolvimento** — por etapas publicáveis: (a) estrutura nova + dashboard + 3 CNPJs; (b) contas, baixa, transferência, fornecedores; (c) Sicredi + Caju (extrato automático, conciliação, Pix/boleto); (d) notas, impostos, relatórios; (e) Sicoob/Itaú prontos para ligar. Cada etapa com testes, ajuda e manual.

## Depende do dono / terceiros
- Gravar em /_sgo/segredos: chaves Sicredi e Caju (já tem), Omie da filial e da prestadora (App Key/Secret de cada empresa), Sicoob e Itaú quando chegarem.
- Wanessa: lista do que ainda faz fora do SGO+ (Omie, banco) e com que frequência.
