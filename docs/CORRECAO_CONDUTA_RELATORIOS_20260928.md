# Relatórios semanais e missões — rastreio de 28/09/2026

## Evidências

Foram lidos os sete relatórios existentes em `qual_relatorio`, inclusive o semanal de 21 a 27/09/2026. O HTML desse documento cortava “2026.” como item numerado e atribuía ICO 100 a bom desempenho/resolução de desvios, embora seu próprio contexto registrasse duas ocorrências, zero firmes e modo sombra ativo. O texto apresentava o bônus como preservado sem explicar que era simulado.

A listagem imprimia diretamente as chaves ISO de período e emissão. Há duas edições históricas de 07 a 13/09, que foram preservadas, agora identificadas. Intervalos manuais sobrepostos são mantidos: o botão passa a dizer explicitamente “últimos 7 dias”.

## Correções

- Datas e competências legíveis em português, edições diferenciadas e eventos de abertura sem interpolação de IDs em JavaScript inline.
- Parágrafos/listas reais: números no meio de frases não são interpretados como listas. Texto escapado contra HTML executável.
- Explicações numéricas e financeiras geradas diretamente dos fatos, sem narrativa livre de IA concluir resolução de pendências, aprovação ou pagamento. Modo de simulação indicado expressamente.
- Prévia histórica reconstruída a partir do CONTEXTO_JSON salvo, sem recalcular com dados atuais e sem reescrever os registros. Aviso da geração original visível. Históricos sem contexto válido produzem erro explícito.
- Datas finais inválidas/futuras e competências impossíveis bloqueadas. Geração repetida protegida por lock; atualiza a edição existente mais recente sem apagar edições anteriores.
- Missões: um mesmo executante não duplica o incentivo por ocupar os dois campos. Bloqueio por ocorrência firme vinculada segue a regra do fechamento, independentemente do mês do fato. Valor proposto/simulado não comprova pagamento.
- Janela reservada durante o clique, antes da resposta assíncrona, evitando bloqueio de pop-up; download HTML como alternativa. Falhas encerram a janela de espera.
- Tabelas vazias com explicação, cabeçalhos de impressão, listas e adaptação a telas menores.

## Verificação e publicação

Teste automatizado com os sete contextos reais salvos e dados sintéticos para cenários financeiros, acesso restrito, datas, gravação e DOM. Visualização local do último relatório inspecionada no Edge. Não houve emissão de pagamento, mudança de ocorrências ou envio de mensagem.

Backup remoto e dos relatórios em `backups/CONDUTA_RELATORIOS_20260928/`. Apenas `SGO_Conduta_RelatoriosGerenciais` e `SGO_Conduta_ConteudoModulo` são publicados; demais arquivos preservados do remoto. A versão e implantação confirmadas são registradas em `publicacao.json`. A correção de apresentação dos relatórios já existentes se aplica ao clicar em Abrir; arquivos HTML/PDF baixados anteriormente permanecem como estavam.

## Impedimento confirmado na publicação

O conteúdo corrigido foi enviado e conferido no HEAD, mas a criação da versão falhou duas vezes com HTTP 429 / RESOURCE_EXHAUSTED: `Cannot create more versions: Script has reached the limit of 200 versions.` Não foi criada nova versão nem alterada a implantação, que permanece na **290**. Assim, a correção ainda não está disponível no link de produção.

Listagem completa confirmou 200 versões; as implantações consultadas usam 290, 199 e 1. A versão **2**, criada em 25/03/2026, não está nessas implantações e teve seus 18 arquivos copiados para `versao-antiga-2.json`. Nenhuma versão foi excluída. A API pública só permite criar/obter/listar versões; a exclusão deve ser feita no Histórico do projeto. Após liberar uma vaga, retomar com `_tools/retomar_publicacao_conduta_rel_20260928.js`, que verifica o HEAD e a implantação antes de criar e publicar a versão no mesmo link.

Validação final: 15 testes aprovados; screenshot do relatório revisado em `relatorio-revisado.png`.

## Publicação concluída

Após o usuário liberar espaço no Histórico, a listagem passou a 190 versões. A primeira tentativa ainda retornou o limite anterior; a seguinte criou e publicou a **versão 291**, mantendo a mesma implantação e URL. Todos os **195 arquivos** foram conferidos contra o conteúdo preparado. Comprovante em `backups/CONDUTA_RELATORIOS_20260928/publicacao.json`. O impedimento descrito acima foi resolvido.
