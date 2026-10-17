# Relatórios A4 de qualificação (Autoclave, Lavadora, Cadeia de Frio, Estufa) — 17/10/2026

Pedido do dono: "relatórios da autoclave e lavadoras e outros, todos têm que ser HTML A4 para impressão, com IA, relatório perfeito".

Situação: implementado e testado no servidor de ensaio (cópia do banco de desenvolvimento). **Não publicado.**

## 1. Padrão comum `SGO_DocA4.js`

As funções antigas (`SGO_DocA4_css_`, `SGO_DocA4_num_`) ficaram iguais, porque outros módulos as usam. Foram acrescentadas funções novas, usadas só pelos documentos de qualificação:

- **Página A4** com margens fixas (25/15/18/18 mm). O **cabeçalho corrido** traz o logo, o título curto, o número do documento e a revisão. O **rodapé corrido** traz a empresa, o CNPJ e "Página X de Y". Os dois aparecem em todas as páginas, por meio das caixas de margem do `@page`, que o Chromium do servidor imprime.
- **Logo reduzido**: cópia em JPEG de 600 × 199 px (28 KB) feita a partir do logo compartilhado, que tem 750 KB e ia inteiro em cada documento. Se o logo mudar, é preciso gerar a cópia de novo.
- **Peças prontas**: abertura do documento (título, ficha e quadro de resultado), tabelas de identificação em 2 colunas, tabela genérica com números alinhados à direita, situação colorida (Conforme / Não conforme), listas, figuras numeradas, fotos, assinaturas e a linha de total no corpo da tabela. Em tabelas longas o cabeçalho se repete a cada página. A linha de total não fica no `tfoot` porque o navegador a repetiria em toda página.
- **Gráficos em SVG estático**, nítidos e sem JavaScript (o PDF é gerado sem scripts):
  - linhas (temperatura por sensor, pressão), com janela sombreada (exposição ou fase principal), faixa aceitável sombreada e linhas de referência;
  - barras (F0 ou A0 por sensor), com a linha do mínimo;
  - escala robusta: uma leitura espúria isolada (por exemplo, sensor desconectado no início) não achata o gráfico. Ela fica fora da escala, e a legenda diz o valor omitido.
- **Registradores e rastreabilidade**: o texto "Identificação do registrador" (por exemplo "DTL-01, DTL-06") é cruzado com o cadastro de padrões (`CAD_PADROES`). Saem a descrição, o nº do certificado de calibração, a validade e a situação na data do ensaio. Certificado vencido, validade em branco ou registrador fora do cadastro viram observação no documento e são informados à IA.
- **Números pt-BR em toda parte**. As mensagens antigas dos motores ("4.2 °C") são convertidas para vírgula na hora de exibir.
- **IA comum** (`SGO_DocA4_chamarGemini_`):
  - raciocínio ligado (`thinkingBudget: -1`, dinâmico) nos modelos 2.5 em diante, temperatura 0,2 e até 32.768 tokens de saída;
  - modelo padrão `gemini-2.5-flash`, com `gemini-2.5-pro` e `gemini-2.5-flash-lite` como reserva. Os modelos 1.5 e 2.0, que não aceitam o raciocínio, saíram da lista;
  - resposta cortada (MAX_TOKENS) ou bloqueada nunca é aproveitada: o sistema passa ao próximo modelo e, se todos falharem, explica o motivo;
  - regras de redação comuns: números exatamente como no contexto, só as normas listadas, nenhum fabricante, veredito inequívoco (proibido "aprovado com alerta/ressalvas/parcialmente"), sem markdown, sem expressões de efeito, sem inglês;
  - a resposta passa por uma limpeza (negrito, títulos e marcadores de lista são removidos).

## 2. Decisões do dono aplicadas

**(a) Nada é aprovado abaixo do mínimo da norma.**
- **Autoclave** (`SGO_AutoRel_AnaliseCiclo.js` e `Config.js`): o limite de aprovação passou a ser o F0 mínimo normativo, de 15,00 min. A faixa de 14,6 a 15 min, que antes aprovava "com alerta", agora reprova. Um F0 acima do mínimo, mas a menos de 10% dele, aprova e vira observação "próximo do limite" (margem configurável em `margemObservacaoPercentual`).
- **Lavadora** (`SGO_LavRel_AnaliseCiclo.js` e `Config.js`): a mesma regra vale para o A0 (antes aprovava "com alerta" de 590 a 600 s) e para o tempo de cavitação da ultrassônica.
- **Textos**: as mensagens, a planilha e os gráficos trocaram "limite operacional/tolerância" por "mínimo normativo/exigido". O status "com alerta" não é mais produzido nesses dois módulos.
- **Cadeia de Frio e Estufa**: lá o "com alerta" significa excursão dentro da tolerância declarada, que faz parte do critério. O documento mostra "Aprovado" e lista a excursão em Observações; a planilha passou a dizer "APROVADO (COM OBSERVAÇÃO)".

**(b) Lavadora: critério de A0 de 3.000 s para artigo crítico.**
- Foi criado na tela o campo "Classificação do artigo processado", com duas opções: semicrítico ou não crítico (A0 ≥ 600 s) e crítico (A0 ≥ 3.000 s), conforme a ABNT NBR ISO 15883-1, Anexo B.
- O critério, a tabela por sensor, o gráfico de barras, a planilha, a conclusão e o prompt da IA seguem a classificação escolhida.
- Teste feito: o mesmo ensaio com A0 de 1.511,98 s **reprova** como crítico. Com A0 de 3.797,92 s, aprova nas duas classificações.

## 3. Documentos, por módulo

Todos usam o padrão comum e são salvos em HTML e PDF na subpasta do cliente (CNPJ). O relatório interno (dados simulados) continua sem gravação na pasta, de propósito, e leva a faixa "uso interno".

| Documento | Arquivos | Conteúdo |
|---|---|---|
| Autoclave: relatório de ensaio térmico (ciclo e teste de estanqueidade) | `AutoclaveCertificado.html`, `SGO_AutoRel_CertificadoRelatorio.js` | Resultado no topo; 1 identificação completa (cliente, CNPJ, setor, TAG, marca, modelo, série, receita, lote, técnico, aceite); 2 registradores com certificado e validade, mais parâmetros (temperatura programada, faixa, remoção de ar, intervalo, sensores, correção); 3 metodologia com a fórmula do F0, critérios de aceitação e normas; 4 resultados: fases do ciclo, tabela por sensor, gráficos de temperatura, pressão e F0 por sensor, verificação dos critérios (requisito × obtido × situação); 5 análise técnica (IA); 6 não conformidades e observações; 7 conclusão técnica, conclusão em linguagem simples e parecer; 8 responsabilidade técnica com assinaturas (técnico executor e responsáveis técnicos); anexo de fotos |
| Autoclave: memória de cálculo do F0 | `SGO_AutoRel_MemoriaF0.js` | Mesmo padrão; agora é **salva na pasta do cliente**; comparativo entre sensores e tabela leitura a leitura por sensor |
| Lavadora: relatório de ensaio (termodesinfectora e ultrassônica) | `LavadoraCertificado.html`, `SGO_LavRel_CertificadoRelatorio.js` | Mesma estrutura da Autoclave; critério de A0 conforme a classificação do artigo; ultrassônica com ABNT NBR 17130-1:2024 nas referências; **anexo novo, "Memória de cálculo do A0"**: resumo por sensor e leitura a leitura do pior sensor, gravados no mesmo laço que soma o A0 oficial (sem segunda conta) |
| Cadeia de Frio e Estufa/Banho-maria/Secadora: relatório de qualificação térmica (certificado) | `CadeiaFrioCertificado.html`, `EstufaBanhoCertificado.html`, `SGO_DocA4_documentoQualificacaoTermica_` | Um único documento para os dois módulos: parecer no topo; identificação; introdução e objetivo (IA); registradores; metodologia, critérios por estudo e normas; resultados por estudo (estatísticas, repetições da estufa de esterilização, conformidade por sensor, gráfico com a faixa e a tolerância, análise de IA); verificação dos critérios; não conformidades e observações; conclusão e parecer final; assinaturas |
| Folha do "Preencher modelo" (Autoclave e Lavadora, quando não há modelo oficial) | `SGO_TemplateAutoclave.js` (motor comum) | Mesmo padrão: identificação, resultado informado e assinaturas do responsável técnico e do cliente |
| Relatório de dados (planilha) | `*_Planilha.js` | Continua sendo a planilha de dados. Só os textos de critério e de status mudaram, pela decisão (a). O documento A4 completo é o relatório de ensaio / certificado acima, que agora traz tudo o que o PDF da planilha trazia, além dos gráficos |

## 4. Como foi testado

- **Ambiente**: cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_relqual`, servidor em modo ensaio na porta 8122. Sessão de administrador de teste, as 2 pastas fixas de laudos e padrões de teste no cadastro: DTL-04 válido, DTL-05 vencido em 31/05/2026 e DTL-01/06/07 válidos. Para o relatório interno foi gravada uma senha de teste, só nessa cópia.
- **Geração pela tela, com Playwright**: envio do arquivo pelo campo da tela, rascunho, textos do técnico (caminho **sem IA**: o rascunho abriu com o aviso de chave ausente e não travou), confirmação, nova aba com o documento e download do **PDF salvo na pasta do cliente**. Cada página foi convertida em imagem e conferida.
- **Pela API, na página logada**: relatório interno (Autoclave simulada), teste de estanqueidade reconstituído e folha do "Preencher modelo".
- **Dataloggers usados**:
  - Autoclave: reais, 121 °C sem carga e 134 °C com carga;
  - Lavadora: sintético (não há arquivo real), mais uma variante a 86 °C para provar a reprovação com o critério de 3.000 s;
  - Cadeia de Frio: sintético de 26 h com abertura de porta e queda de energia (o arquivo real de trecho tem intervalo de 2 s, abaixo do mínimo aceito);
  - Estufa: sintético de incubação de 25 h.

| Caso | Resultado | PDF (páginas) |
|---|---|---|
| Autoclave 121 °C (DTL-04 válido) | Aprovado; F0 mínimo 27,22 min (S5); a leitura espúria do S8 (−55 °C) foi omitida do gráfico, com nota na legenda | `%TEMP%\sgo_relqual\final\auto121_salvo_na_pasta.pdf` (5) |
| Memória do F0 do mesmo ciclo | 12 páginas, tabelas compactas, total no fim de cada sensor | `%TEMP%\sgo_relqual\final\auto121_memoria_salva.pdf` |
| Autoclave 134 °C (DTL-05 vencido) | Reprovado (exposição não identificada: S3 em cerca de 30 °C); certificado vencido em Observações | `%TEMP%\sgo_relqual\final\auto134_salvo_na_pasta.pdf` (5) |
| Lavadora, semicrítico | Aprovado, A0 3.797,92 s ≥ 600 s; anexo do A0 | `%TEMP%\sgo_relqual\final\lav600_salvo_na_pasta.pdf` (6) |
| Lavadora, crítico (86 °C) | **Reprovado**, A0 1.511,98 s < 3.000 s | `%TEMP%\sgo_relqual\final\lav3000_salvo_na_pasta.pdf` (6) |
| Cadeia de Frio (distribuição, porta e energia) | Não qualificado (queda de energia saiu da faixa em 16 min, alvo de 60 min); 3 registradores válidos | `%TEMP%\sgo_relqual\final\cf_salvo_na_pasta.pdf` (6) |
| Estufa de incubação | Qualificado | `%TEMP%\sgo_relqual\final\eb_salvo_na_pasta.pdf` (4) |
| Relatório interno (Autoclave simulada) | Faixa "uso interno", não salvo na pasta | `%TEMP%\sgo_relqual\final\interno_autoclave.pdf` (5) |
| Teste de estanqueidade (reconstituído) | Aprovado, 0,82 mbar/min ≤ 1,30 | `%TEMP%\sgo_relqual\final\leak_autoclave.pdf` (3) |
| Folha do "Preencher modelo" | Folha padrão salva na pasta do cliente | `%TEMP%\sgo_relqual\final\folha_autoclave.pdf` (1) |

As imagens de todas as páginas estão em `%TEMP%\sgo_relqual\final\png`.

## 5. IA: o que foi conferido sem chave e o que conferir quando publicar

**Conferido sem chave.** Os prompts reais dos 4 módulos foram montados a partir dos contextos que o servidor devolveu no rascunho e lidos (cópias em `%TEMP%\sgo_relqual\saida\prompt_*.txt`). O encaixe da resposta foi testado com uma resposta simulada: todos os marcadores foram reconhecidos e a limpeza do markdown funcionou nos 4 módulos. O contexto enviado à IA agora tem:
- números já em pt-BR (contagens inteiras e grandezas com 2 casas, iguais às do documento);
- critérios com resultado obtido e situação;
- parâmetros do ensaio;
- rastreabilidade dos registradores;
- o veredito a usar literalmente.

Marca, modelo e fabricante não são enviados à IA.

**Conferir quando publicar e houver chave.** Gerar um rascunho de cada módulo e ler o documento inteiro (regra de validar com o PDF real). Verificar:
- se todos os valores citados batem com as tabelas;
- se a conclusão termina com "O ensaio está APROVADO/REPROVADO" (ou "qualificado/não qualificado") sem forma intermediária;
- se aparecem expressões de efeito, inglês ou nome de fabricante;
- na Lavadora, se o texto explica que o critério veio da classificação do artigo;
- na Cadeia de Frio e na Estufa, se uma excursão dentro da tolerância foi tratada como observação, e não como reprovação;
- o tempo de resposta: com o raciocínio ligado e 12 sensores, o rascunho pode levar de 30 a 90 s.

## 6. Pendências e observações

1. **Publicar**: nada foi publicado. Ao publicar, o `SGO_DocA4.js` novo precisa subir junto, porque os 4 módulos, a memória do F0 e a folha dependem dele.
2. **Cadeia de Frio, janela do estudo de porta**: a tabela por sensor do estudo de abertura de porta usa o recorte de dados do motor, que inclui uma margem antes e depois do evento. Se outro evento cair dentro dessa margem, a tabela pode mostrar "fora da faixa" num estudo aprovado. Com dados reais e eventos separados, isso não ocorre. Vale revisar no motor (`CadeiaFrioRel_Engine`), que não foi alterado.
3. **Lavadora ultrassônica**: o critério continua sendo o tempo de cavitação do protocolo do fabricante. A ABNT NBR 17130-1:2024 entrou como referência, mas a tolerância de ± 3 °C da norma não é calculada pelo motor. Avaliar se deve virar critério.
4. **A0 só na fase principal** (já registrado no pente fino): o resultado é conservador, e o documento diz isso na metodologia.
5. **Arquivos reais**: falta validar a Lavadora e a Cadeia de Frio com arquivos reais de registrador.
6. **Logo reduzido** em `SGO_DocA4_logoJpegBase64_()`: se o logo compartilhado mudar, é preciso gerar a cópia de novo (600 px, fundo branco).
7. A planilha (relatório de dados) mantém o seu formato de planilha. Se o dono quiser que o PDF da planilha também siga o padrão A4 com cabeçalho e rodapé corridos, isso é outra frente.
