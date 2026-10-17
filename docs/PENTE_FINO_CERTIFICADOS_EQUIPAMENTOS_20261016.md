# Pente fino: relatórios e certificados de equipamentos (16/10/2026)

Escopo: Autoclave (AutoRel), Lavadora (LavRel), Cadeia de Frio (CadeiaFrioRel), Estufa/Banho-maria/Secadora (EstufaBanhoRel), abas "Preencher modelo" (TemplateAutoclave/TemplateLavadora) e utilitários SGO_DocSalvar.js / SGO_DocA4.js / SGO_Documentos.js.

Como testei: cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_equip`, servidor em modo ensaio na porta 8103. Nessa cópia criei as 2 pastas fixas de Autoclave/Lavadora (mesmos IDs da produção) e uma sessão de admin. O Playwright clicou de verdade nas telas: enviou o arquivo, gerou o relatório (planilha + PDF), gerou o rascunho e emitiu o certificado (nova aba). Li o HTML gerado, conferi a impressão A4 e baixei o PDF salvo na pasta do cliente. Servidor parado no fim.

Dataloggers usados (reais, da pasta Downloads/backups):
- Autoclave: `121C_Processo_1_Sem_Carga…xlsx` (12 sensores + pressão, 30 s) e `134C_Processo_1_Com_Carga…xlsx`.
- Cadeia de Frio: 5 arquivos RC-5 `DTL-01/06/07/10/12.xls` (um arquivo por sensor, 1 min, 26 h) e `dtl corrigido.xlsx`.
- Estufa: `DTL 1 CICLO 903.xlsx` (data m/d/aa, 12 sensores).
- Lavadora: não há arquivo real de lavadora no computador (o `MÓDULO 1.csv` é de outro equipamento: 143 °C durante um mês). Por isso gerei um CSV sintético de termodesinfecção, no formato dos registradores (`;`, vírgula decimal, hora `hh:mm:ss:000`).

## Conferência de cálculos

| Item | Resultado |
|---|---|
| F0 (Autoclave 121) | Recalculado à parte com 10^((T−121,1)/10)·Δt na janela de 11:12:13 a 11:31:13. Bate sensor a sensor: S5 dá 27,22 nos dois cálculos e S9 dá 58,63 (diferença na 4ª casa, que vem do arredondamento da leitura exibida). |
| Autoclave 134 | Reprovação correta: ST-08 registra 0,00 °C (sensor em falha) e a regra exige todos os sensores. O operador precisa desmarcar o S8. |
| A0 (Lavadora) | Base de 80 °C, z = 10 e Δt em segundos, como na ISO 15883. O cálculo fica restrito à fase principal, por isso o resultado é conservador (S1 = 3.797,92 s). |
| Cadeia de Frio | Máxima de 11,7 °C no S5 (DTL-12): confere com o arquivo. A hora mostrada é a da grade alinhada (12:33:58); a hora original do registrador é 12:34:24. |
| Estufa | A ruptura da faixa e o aviso de "duração menor que 24 h" estão corretos para o arquivo. |

## Achados e correções, por módulo e página

### Comum aos 4 módulos (rascunho e emissão)
1. **GRAVE, corrigido: sem a chave da IA, o certificado não saía de jeito nenhum.** O rascunho dava erro e a área de revisão nunca abria, então o técnico ficava parado. A mensagem ainda mandava abrir o "editor do Apps Script". Agora, se a IA falhar (chave ausente ou recusada, limite de uso, serviço fora), o rascunho abre mesmo assim, com os campos de texto vazios e um aviso amarelo explicando o motivo e o que fazer. Cálculos e veredito não dependem da IA. As mensagens de chave agora apontam para "Chaves e senhas". (`SGO_DocSalvar_textosIaOuManual_`, `SGO_DocSalvar_msgChaveIA_`, os 4 `*_CertificadoIA.js` e `*_CertificadoRelatorio.js`, e a faixa de aviso nos 4 `*_ConteudoModulo.js`.)
2. **Corrigido: Lavadora e Cadeia de Frio emitiam o certificado sem conferências.** Não checavam se os dados eram os mesmos do rascunho nem se os textos estavam preenchidos, então era possível emitir com outro arquivo ou com seções em branco. Autoclave e Estufa já checavam. Agora o rascunho devolve uma assinatura dos dados, a tela a reenvia na emissão e o servidor confere a assinatura e os textos obrigatórios (`SGO_DocSalvar_assinatura_` e `SGO_DocSalvar_validarEmissao_`).
3. **Corrigido: números em formato americano no certificado.** Autoclave mostrava "F0 27.2195 min" e Lavadora "A0 3797.92". Cadeia de Frio e Estufa mostravam mínima, máxima, média, mediana, desvio, amplitude e tolerância como "2.5 °C" / "0.5 °C", e o Leak Test também saía com ponto decimal. Tudo passou para o padrão brasileiro com 2 casas ("27,22 min", "3.797,92 s", "2,50 °C").
4. **Adicionado: marca, modelo e nº de série na Identificação** dos 4 certificados. Esses dados eram digitados na tela, mas não apareciam no documento.
5. **Adicionado: tabela por sensor** no certificado de Autoclave (F0 e temperaturas mínima, média e máxima na exposição, com a situação de cada um) e no de Lavadora (A0 e temperaturas da fase principal). A metodologia já citava "por posição de sensor", mas o documento só trazia o agregado. A Lavadora também passou a mostrar o "A0 mínimo normativo" e a unidade "s".
6. **Corrigido: resultado "INFORMATIVO" aparecia como "— conforme"** na conclusão do ensaio (Autoclave e Lavadora).
7. **Corrigido no Autoclave: Setor e Técnico executor saíam como "—"** mesmo preenchidos. O contexto não lia `local` nem `respTecnico`.
8. **Corrigido: a consulta automática do CNPJ sobrescrevia o que o operador tinha digitado** (Autoclave e Lavadora), contra a regra de nunca sobrescrever sem mesclar. No Autoclave ela também jogava a cidade no campo "Localização (Setor)". Agora só preenche campo vazio. Quando o campo já tem valor diferente, mantém o valor e registra no histórico o que a consulta encontrou. Em Estufa e Cadeia de Frio a consulta só roda pelo botão "Buscar CNPJ" e ficou como estava.
9. **Corrigido: erros de importação sem orientação ao operador.**
   - "saltos temporais excessivos (1)" agora informa entre quais horas e em qual linha está o buraco e o que fazer (separar o período do ensaio).
   - "intervalo mediano fora do esperado (0.033 min)" agora diz "2 s, fora da faixa aceita (6 s a 10 min)" e o que fazer.
   - O ponto final duplicado ("..") no histórico também foi corrigido. Arquivos: os 3 `*_Parser.js` e `SGO_DocSalvar_msgIntervalo_`.
10. **Corrigido: data com ano de 2 dígitos (ex.: 5/19/26) era recusada** nos 4 leitores quando chegava como texto (CSV ou planilha com data em texto): "Data ou hora inválida na linha 2". Agora é aceita como 20xx. Testado com Cadeia de Frio.
11. **Corrigido: o campo "link do arquivo" só aceitava link do Google.** Agora aceita também o link do servidor novo (`/arquivos/<id>` e `/planilhas/<id>`).
12. **Corrigido: Cadeia de Frio e Estufa liam os textos de análise com um seletor genérico (`.cert-analise-estudo`).** Com os dois módulos abertos na mesma página, um poderia pegar o texto do outro. O seletor agora fica restrito ao próprio módulo.

### Itens da auditoria de design (bloco Qualificação)
- (1) **Segurança, corrigido:** `tplAutoclaveGerarRelatorio` e `tplLavadoraGerarRelatorio` não exigiam login. Agora recebem `(sessionId, payload)` e chamam `exigirSessao`. As 3 chamadas da tela foram ajustadas.
- (2) **Corrigido:** o botão "Relatório interno" ficou discreto (secundário, sem laranja) e só aparece para o perfil ADMIN; a senha continua sendo conferida no servidor. O `window.prompt`, que mostrava a senha digitada, foi trocado por um diálogo com campo mascarado. Vale para os 4 módulos.
- (3) **Corrigido:** Cadeia de Frio exibia "Responsável pelo aceite (tplCadeiaFrioRel_cliente)". Agora mostra "(cliente)".
- (4) **Corrigido:** quando a geração falha, aparece uma faixa vermelha no topo do módulo e o selo muda para "Falha na geração". A faixa some quando a próxima geração dá certo. Conferido por foto da tela com o arquivo que tem o buraco de 24 h.
- (5) **Corrigido:** rótulos e mensagens sem acento na Lavadora (Instituição, Localização, Parâmetros, Tolerância, Detecção, Exposição, início, "(°C)", "20 °C a 100 °C", pré-visualização, Relógio, Diagnóstico, áudio, "já está" e outros). No Autoclave, "Temperatura alvo (°C)" e as opções de setpoint passaram a "134,0 °C".
- (6) **Corrigido:** textos de tela sem citar Google. "Ler por ID / Link do Google Sheets" virou "Enviar arquivo ou informar o link"; "pasta de uploads do Drive" virou "pasta de arquivos dos registradores"; "Gerar Google Docs + PDF" e "Abrir Google Docs" viraram "Gerar documento e PDF" e "Abrir documento".

### Correção pedida pelo coordenador (SGO_DocSalvar)
- **GRAVE, corrigido na origem:** `SGO_DocSalvar_idDaUrl_` não reconhecia o link do servidor novo (`/arquivos/<id>`, absoluto ou relativo). Por isso a cópia HTML A4 nunca era gravada nos módulos que usam `SGO_DocSalvar_comCopiaHtml_` (PGT/POP e Planejamento CME). Agora aceita o formato do Google e o do servidor. Testado no servidor com os 4 formatos de link e com o `PlanCME_apiSalvarDocumento` de verdade: o PDF e o HTML foram gravados na mesma pasta do cliente, sem aviso. O contorno que o agente de calibração fez no CronExec pode continuar.

### Lavadora: norma
- **Corrigido:** o A0 agora soma apenas leituras a partir de 65 °C, como manda a ISO 15883-1 (`tLimiteA0: 65` no ciclo TERMO). Sem esse valor na configuração, o comportamento antigo continua.

### Autoclave: Memória de cálculo do F0
- **Corrigido, texto tecnicamente errado:** o documento dizia sempre que "cada minuto equivale a dezenas de minutos" de F0. Isso só vale para 134 °C; no ciclo de 121 °C o fator real é cerca de 1,4×. O texto agora usa o fator medido no pior sensor. A tabela de escala também passou a vir em ordem crescente de temperatura.

## O que ficou testado e funcionando (documento real gerado)
| Módulo | Relatório (planilha + PDF) | Rascunho | Certificado salvo na pasta do cliente (HTML + PDF) |
|---|---|---|---|
| Autoclave 121 °C | aprovado | ok, sem IA | sim, PDF de 3 páginas baixado; também a Memória de cálculo do F0 |
| Lavadora TERMO | aprovado | ok | sim |
| Cadeia de Frio (5 arquivos RC-5, um por sensor) | reprovado (11,7 °C) | ok | sim |
| Estufa | reprovado (fora da faixa e menos de 24 h) | ok | sim |

Também conferidos: página A4 com texto justificado e hifenização, rodapé, logo, número de página e faixa "salvo na pasta" só na tela (some na impressão).

## Pendências (precisam de decisão ou de outro agente)
1. **Aprovar abaixo do mínimo normativo, decisão do dono:** Autoclave aprova "com alerta" F0 entre 14,6 e 15 min (tolerância de 0,2 abaixo do normativo) e Lavadora aprova A0 entre 590 e 600 s. O certificado da Lavadora mostra o "Limite operacional 590" ao lado do normativo 600. Do ponto de vista metrológico, aprovar abaixo do valor da norma é discutível.
2. **Lavadora, A0 de 3000:** só existe o critério de 600 s. Para artigos críticos e vírus termorresistentes a ISO 15883 pede A0 de 3000. Falta um seletor de classe da carga.
3. **Lavadora:** o A0 é calculado só na fase principal. A ISO soma tudo que fica acima de 65 °C, inclusive subida e descida, então hoje o resultado é conservador. Decidir se continua assim.
4. **Arquivos sem login (sgo_servidor):** `http://localhost:8103/arquivos/<id>` devolveu o PDF do certificado sem login (HTTP 200). Se valer também em produção, qualquer pessoa com o link baixa o laudo, o que é aceitável só se o acesso estiver restrito ao IP do escritório. Repassar ao agente do núcleo/servidor.
5. **Certificados não entram na lista de Documentos:** os 4 certificados não são registrados em DOC_DOCUMENTOS e não ficam vinculados a cliente, unidade ou equipamento do cadastro. Os campos são texto livre mais CNPJ, então não aparecem em "Documentos" nem no Inventário do equipamento. Ligar isso exige definir a identificação (TAG → equipamento) com o núcleo/cadastros.
6. **Lacuna sem dado no arquivo:** a validação de tempo olha o arquivo inteiro antes de recortar a janela do estudo. Um arquivo que junta dois períodos é recusado mesmo que o estudo esteja todo num deles. A mensagem agora explica como resolver; recortar antes de validar fica como melhoria.
7. **Intervalo de 2 s:** registradores programados com intervalo menor que 6 s (caso do `dtl corrigido.xlsx`) são recusados pela faixa de 0,1 a 10 min. Ajustar só se o laboratório usar esse intervalo.
8. **Abas "Preencher modelo" (Autoclave/Lavadora):** chamam o aplicativo antigo do Google por UrlFetch (`SGO_CFG.MOTORES.*_TEMPLATE`), o que não funciona no servidor próprio sem o Google. Não testei a geração dessa aba; só exigi o login.
9. **Lavadora sem arquivo real:** testei com dado sintético. Pedir ao usuário um arquivo de registrador de termodesinfectora para a validação final.
10. **Textos "por posição de sensor" e "parecer assinado":** a Interpretação Técnica (Autoclave e Lavadora) diz "não é o documento final" e não tem assinaturas, mas a metodologia cita "parecer técnico conclusivo, assinado por profissionais". Ajustar o texto se o dono quiser.
11. **Seletores genéricos na Cadeia de Frio:** as classes `.sensor-ativo` e `.sensor-arquivo` da grade de sensores também não têm prefixo do módulo. Hoje só uma tela fica aberta por vez; registrado por precaução.
