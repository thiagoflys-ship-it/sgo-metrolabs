# Manual do Operador — Inventário de Equipamentos

Lista dos equipamentos de um cliente com a situação de calibração e qualificação.

*Revisão: 17/10/2026, conferido com a tela. É o mesmo texto do botão "Manual do operador" da tela.*

## 1. Como usar este manual

Leia na ordem. Cada tarefa tem passos numerados: faça um passo de cada vez. O nome de cada botão aparece entre aspas, igual ao que está na tela. Palavras desconhecidas estão no **Glossário** (seção 10).

## 2. Para que serve esta tela

Monta a lista dos equipamentos de um cliente com a situação da calibração e da qualificação de cada um. Gera o PDF para imprimir e o relatório A4 com análise.

> **Esta tela não cadastra nada.** Ela só lê clientes, equipamentos e documentos que já estão no sistema. Para cadastrar ou corrigir, use "Equipamentos" e "Arquivo de documentos". Depois gere o inventário de novo.

> **É um retrato do momento.** O inventário gerado hoje não muda sozinho amanhã. Gere de novo quando precisar da situação atual.

## 3. Filtros

| Campo | O que fazer |
|---|---|
| Buscar por CNPJ | Digite o CNPJ (só números) e toque em "Buscar". O cliente é escolhido sozinho |
| Cliente | Escolha o cliente, ou deixe "Todos os clientes" |
| Unidade | Depois de escolher o cliente, escolha a unidade, ou deixe "Todas as unidades" |
| Status | Escolha "Todos", "Ativo" ou "Inativo" |

## 4. Gerar o inventário

1. Ajuste os filtros.
2. Toque em "Gerar Inventário".
3. Aguarde a tabela aparecer.
4. Olhe primeiro os cartões do topo: total, em dia, vencendo, vencidos e sem documentação.
5. Na tabela, olhe primeiro as linhas vermelhas e depois as amarelas.

> **Qual documento conta:** o documento ativo, ligado ao equipamento, com o tipo de calibração ou de qualificação. Se houver mais de um, vale o de validade mais distante.

## 5. Cores e selos

| Selo ou cor | O que quer dizer |
|---|---|
| "OK" (verde) | Em dia. Faltam mais de 30 dias para vencer |
| "Vencendo" (amarelo) | Vence em 1 a 30 dias. Programe o serviço |
| "Vencido" (vermelho) | Já venceu ou vence hoje. O equipamento está irregular |
| "Sem doc" (cinza) | Não há documento, ou o documento não tem data de vencimento ("Sem data de vencimento") |
| Linha com fundo vermelho | O equipamento tem pelo menos um documento vencido |
| Linha com fundo amarelo | O equipamento tem documento vencendo |
| Linha apagada | Equipamento inativo |

## 6. Imprimir ou salvar em PDF

1. Gere o inventário.
2. Toque em "Gerar PDF / Imprimir".
3. Confira a pré-visualização. O papel é A4 deitado e as páginas saem numeradas. Esta impressão não guarda cópia: para guardar o documento na pasta do cliente, use "Relatório A4 com análise".
4. Toque em "Imprimir / Salvar PDF".
5. Para PDF, escolha "Salvar como PDF" na janela de impressão.
6. Toque em "Fechar" para voltar.

## 7. Relatório A4 com análise e documentos já gerados

1. Gere o inventário.
2. Toque em "Relatório A4 com análise".
3. Aguarde até um minuto. O relatório abre numa aba nova.
4. Uma cópia em PDF e HTML fica guardada na pasta do cliente (a subpasta com o CNPJ). O link aparece na tela.

O relatório traz identificação, indicadores com o gráfico da situação documental, análise do inventário, distribuição por tipo, itens que exigem ação e a lista completa. Relatório longo traz capa e sumário com o número das páginas. Sem a chave da IA, a análise sai com o texto padrão do sistema e a tela avisa. Os números continuam certos.

Para achar um inventário salvo: em "Documentos já Gerados", digite o nome do cliente ou do arquivo, toque em "Buscar" e toque no link.

## 8. Quem pode usar

| Perfil | O que pode fazer |
|---|---|
| Equipe interna (todos os perfis da Metrolabs) | Gerar o inventário de qualquer cliente, imprimir, gerar o relatório A4 e buscar os já gerados |
| Cliente | Só a própria empresa, quando a tela estiver liberada no seu menu |

## 9. Erros comuns e o que fazer

| O que aparece | O que fazer |
|---|---|
| "Gere o inventário antes de imprimir" ou "antes de emitir o relatório" | Toque em "Gerar Inventário" primeiro |
| "Nenhum equipamento encontrado com os filtros selecionados." | Troque para "Todas as unidades" e "Todos" e gere de novo |
| "Digite o CNPJ (ou parte dele) pra buscar." | Digite o CNPJ e toque em "Buscar" |
| "Nenhum cliente ativo encontrado com esse CNPJ." | Confira o número ou escolha o cliente na lista |
| Equipamento "Sem doc" mas tem certificado | Confira no "Arquivo de documentos" se o documento está ativo, ligado ao equipamento e com data de vencimento |
| "O navegador bloqueou a nova aba" | Toque no link para abrir o relatório |
| "a cópia (PDF e HTML) não foi gravada na pasta" | Gere de novo. Se repetir, avise o administrador |

## 10. Glossário

| Termo | O que é |
|---|---|
| Inventário | Lista dos equipamentos de um cliente com a situação dos documentos |
| Calibração / Qualificação | Os dois tipos de documento acompanhados em cada equipamento |
| Retrato do momento | O inventário mostra a situação de quando foi gerado e não muda sozinho |
