# Onde paramos — 18/11/2026, 22:40

## Produção agora
- Imagem: `metrolabs/sgo:segredos-sem-auvo-20261118` (legado = `output/financeiro-20261116/cand31`).
- Publicado hoje: pacotes P1–P4 (Wanessa/Matheus), app de campo (foto, assinatura em tela cheia, desfazer/reabrir), retirada completa do Auvo (rotinas 3→0, pendências, avisos, alertas, menus, chaves), tela de segredos sem o Auvo.
- Conta técnica do Auvo em Usuários: não existe (conferido no banco).

## Em andamento (fila, um especialista por vez)
1. **QR do equipamento** — PUBLICADO 19/11 00:05 (qr-equipamento-docs-20261118, cand32; suíte 2674/0): documentos de um equipamento aparecendo em outros (29 PGT/POP + 3 em todo QR) e duplicados. Regra do dono: cada equipamento só mostra o que é dele; nas pastas só o último documento gerado (oficial). Entrega: `output/qr-equipamento-20261118/`.
2. **Servidor** — CONCLUÍDO 19/11 (8,0 → 107 GB livres; rotina semanal domingo 03:30; relatório output/servidor-manutencao-20261119/): limpar imagens antigas, contêineres parados, cache de build, backups antigos (26 GB em 341 pastas, ~190 MB por publicação). Nunca tocar no cofre, no banco nem nos volumes em uso.
   - Acrescentado ao item 1 (Matheus, extrema urgência): botão Excluir documento nas pastas do equipamento (exclusão lógica, motivo, some do QR/Portal, restaurar só Admin/Diretoria) + lista de documentos que parecem estar no cliente errado.
3. **Financeiro** — PUBLICADO 19/11 (financeiro-auditoria-20261119, cand33, suíte 2687/0). Falta: 1ª baixa real assistida com a Wanessa (roteiro seção 11 do relatório); conferir fotografia diária; decisões: Matheus no sigilo? débito automático/tarifa precisam de aprovação?: mapear e testar o módulo inteiro com dados reais; contas a pagar e a receber por PERÍODO e com os filtros/colunas do Omie (Situação, Nº documento, Parcela, NF, Vencimento, Cliente, Valor da conta, Previsão, Último recebimento, Valor líquido, Impostos retidos, Valor a receber, Desconto, Juros e multa, Valor recebido, Categoria, Operação); conciliação com erro ("Conferência local registrada... permanece sob controle do Omie": não concilia contas atrasadas e o que concilia não baixa no Omie) — fazer a baixa real pela API do Omie.
4. **Manutenção geral do SGO+** (RODANDO, cópia cand34; entrega output/manutencao-geral-20261119/): mapear tudo, procurar erros, corrigir, conferir que os módulos conversam.

## Pendências do dono / terceiros
- Decidir: numeração de revisão dos ensaios conta por número em todos os equipamentos ("Rev. 43"); corrigir muda o número impresso nos próximos documentos.
- Matheus revisar documentos suspeitos (lista em output/qr-equipamento-20261118/RELATORIO.md item 5) e usar o botão Excluir.
- Piloto do Portal do Cliente na CRM (contrato + 3 pessoas) e ligar a trava por volta de 25/11.
- Respostas da Wanessa (contador, Caju, Omie, Sicoob).
- Valores opcionais vazios: teto do Matheus, desconto máximo comercial, percentual da recarga.
- km 127,2 do GFU5G11 na Frota.

## Servidor — depende do dono
- URGENTE: rclone (backup criptografado no Google Drive) avisa que o acesso dele ao Drive para em 2026 — criar acesso próprio no Google Cloud com a conta da empresa.
- Reiniciar o servidor fora do expediente (~2 min) para concluir kernel/libc6; 2 atualizações de segurança pendentes.
- ~27 GB de QA do RH (31 contêineres de ensaio, 67 volumes de banco soltos com dados de pessoas): apagar precisa de ok.
- Caddy `lb_try_duration 30s` para não dar erro de segundos durante publicação (~170 requisições em 18/11).
- Reconstruir imagens SGO+/RH a partir da base (4,6/5,6 GB cada → <1 GB).
- Restante da migração do SGO+ (4,9 GB) e pacotes do RH (2,1 GB): apagar se confirmar.

## Conferir quando acontecer
- Foto no celular do Gabriel (OS-2026-0042) depois de atualizar o app.
- Caixa de decisões: 64 itens do Auvo devem virar RETIRADA; 2 sugestões do Conduta do Auvo descartadas (coleta das 6h).
- Primeiro relatório semanal (segunda 23/11, 07:00), primeira lista de aprovação de pagamentos, primeiro WhatsApp real GS08–GS11.
- Dois testes falham só entre 21h e 24h (data UTC × Brasília) — o especialista do QR vai corrigir.
