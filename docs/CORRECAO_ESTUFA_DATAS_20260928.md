# Estufa + Banho-maria: datas dos dataloggers

Correção do importador separado de Estufa, mantendo as regras próprias de seleção de canais, ensaios de estufa/banho-maria/secadora e geração dos documentos.

## Correções

- Combinação de Data + Tempo/Hora, incluindo cabeçalhos Elitech. O número sequencial deixa de ser usado como fallback de data quando há coluna temporal identificada.
- Leitura direta de XLSX e CSV/TXT; datas nativas de Sheets preservadas no fuso da origem, com segundos. XLS legado continua usando conversão, agora com Drive v3.
- Formato AUTO/BR/US no formulário. Datas ambíguas exigem escolha; datas ou horas inválidas não são descartadas nem substituídas por meia-noite.
- Prévia com os mesmos dados normalizados do relatório e período importado.
- Recorte dos estudos e planilha de saída com fuso consistente.
- Preservados o mapeamento de canais não consecutivos (S1/S3/S8 etc.) e a proteção de tamanho antes da leitura de Sheets.

## Verificação

- 23 testes específicos de importação e datas, em America/Sao_Paulo e UTC.
- 66 testes de regressão dos perfis e cálculos: 126 emissões locais simuladas de documentos e 190 gráficos, sem emitir laudos de clientes em produção.
- Teste DOM da interface anterior adaptado ao formulário atual, com conferência adicional do seletor AUTO/BR/US e do envio da preferência.
- Seis XLSX reais já disponíveis da investigação de Cadeia Fria reutilizados para testar o mesmo formato no importador Estufa. Comparação linha a linha de data/hora e temperatura, total de 9.147 leituras. Esses arquivos validam o formato; não representam ensaios reais de estufa.

## Publicação

**Versão 290 publicada e confirmada**, com 195 arquivos conferidos pela API após o envio.

Backup remoto integral e comparação contra alterações concorrentes em `backups/ESTUFA_DATAS_CORRECAO_20260928/`. Somente seis arquivos existentes de Estufa alterados, mais o helper de datas. Demais arquivos preservados do HEAD remoto, inclusive correções de Cadeia Fria da v289. O comprovante definitivo de versão/implantação está em `publicacao.json` nessa pasta.

Implantação mantida: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.

Relatórios históricos não são reescritos automaticamente. A equipe deve recarregar o portal e regenerar documentos que tenham datas incorretas. Os testes de importação foram locais, com adaptadores para os serviços Google; não houve validação integral de um novo laudo pela interface de produção.
