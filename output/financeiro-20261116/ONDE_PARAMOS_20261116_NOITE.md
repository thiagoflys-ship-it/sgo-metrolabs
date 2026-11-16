# Onde paramos — Financeiro e Conduta (16/11/2026, noite)

## Produção (servidor 179.197.73.61, /opt/metrolabs/sgo)
Imagem atual: **metrolabs/sgo:financeiro-aprovacao-diretoria-20261116** (sha256:9ff16ecb895b45f851bb59c0cfa330b1306c0d708a4b8972ef699cd1e59d223a).
Fonte do legado publicado: `output/financeiro-20261116/cand6`. Cada publicação tem backup em /opt/metrolabs/backup/<tag> (compose.antes.yml + banco-antes.dump).

Publicações de 16/11, na ordem:
1. financeiro-sigilo-20261116 — lista de sigilo (admin, charles, wanessa) acima das caixas.
2. financeiro-ficha-cliente-20261116 — Ficha do cliente (cobrança).
3. financeiro-pente-fino-20261116 — sigilo em todo o Financeiro (Compras-fin, Caju, viagem carga/conferência, relatório diário só contagem), guia por aba e explicação de campos; GRAVAÇÃO NO OMIE LIGADA.
4. conduta-relato-20261116 — "Ver relato" no Conduta; envolvido não recebe quem registrou.
5. financeiro-completo-20261116 — B1–B9, cadastro cliente/fornecedor no Omie, NF-e compra/NFS-e -> contas a pagar, marca d'água, design, configurações; CNPJ 32487278000121 gravado.
6. financeiro-onda2-indicadores-20261116 — E1–E5: atividades do Financeiro só sigilo, foto diária 06:00, aba Indicadores, nota de saúde.
7. financeiro-aprovacao-diretoria-20261116 — APROVACAO_SO_DIRETORIA (padrão SIM): Compras, Depósito de viagem e Painel só dono e Charles aprovam.

## Decisões do dono (16/11)
- Ninguém além do dono e do Charles aprova nada financeiro ("no começo"); configurável (APROVACAO_SO_DIRETORIA).
- Tudo configurável com padrão seguro (Chaves e senhas > Regras do Financeiro / Conduta).
- Gemini: a mesma chave paga dos outros módulos está liberada (dados pseudonimizados).
- Recarga Caju da rotina: técnicos (peças, insumos, oficina); pedem e prestam contas; só dono e Charles aprovam.
- Ainda NÃO informados: teto da recarga, saldo mínimo de caixa (FIN_SALDO_MINIMO), valores das alçadas do Painel.

## Próximo (onda 3, especificação em especialistas/ESPEC_ONDA2_FINANCEIRO.md)
- Bloco B: E6 Kanban da cobrança; E7 Gantt + previsão 90 dias; E8 relatório semanal A4 por link (seg 07:00) ao dono e Charles; E9 IA interpretando.
- Bloco C: Recarga Caju da rotina R1–R6.
- Depois: E10/E11 especialista IA da Wanessa; ondas A–D (contas fixas, calendário fiscal, fechamento, DRE, orçamento, Sicoob...).
- Para retomar: copiar cand6 para cand7 e passar ao especialista de desenvolvimento os blocos B e C (instruções em especialistas/RELATORIO_ONDA3.md e no brief anterior: regras, testes com rodar-lista.sh e rodar-suite-dest.cjs, referência suite-onda3-a.txt = 2252/71).

## Verificar amanhã
- Primeira foto diária do Financeiro (rotina 06:00) e a aba Indicadores com números.
- Primeira baixa real da Wanessa acompanhada (juros/multa/desconto travados em zero até lá).
- Detalhe cosmético: em Administração > Acessos as caixas COMPRAS_APROVAR_* e VIAGEM_APROVAR ainda aparecem marcadas para gestores; a decisão real já é só da Diretoria (Cmp_soDiretoria_ / Via_soDiretoria_). Avaliar mostrar "suspensa pela regra só Diretoria".

## Ferramentas
- Montar camada: node output/financeiro-20261116/montar-camada.cjs <base> <cand> <saida> <TAG> <BASEIMG>; publicar: subir a pasta para /tmp/pub-financeiro e `sh publicar.sh`.
- Testes: sh output/financeiro-20261116/rodar-lista.sh <cand> <testes...>; suíte: DEST=<cand> ... node output/financeiro-20261115/rodar-suite-dest.cjs candidato <saida>.
- Ensaios somente leitura em produção: output/financeiro-20261116/ensaio (rodar.mjs + ZZ_*.js copiados para /tmp/ens16 no contêiner).
