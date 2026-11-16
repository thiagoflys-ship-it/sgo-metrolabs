# Cadeia fria — datas dos dataloggers — 28/09/2026

## Problema confirmado

Nos seis XLSX enviados em 28/09/2026 para a pasta `Cadeia de Frio - Uploads`, o cabeçalho é `Numero | data | tempo | Temperatura°C`. O importador tratava `tempo` como data/hora completa e não combinava essa coluna com `data`. O fallback ainda podia interpretar o número sequencial do registro como uma data serial Excel.

Outras falhas encontradas: o formulário não enviava a preferência de data; a configuração assumia BR; CSV passava por conversão de localidade do Google; hora inválida em coluna separada virava meia-noite; a prévia mostrava dados diferentes dos efetivamente normalizados; ordenação podia ocultar reversões. Reconstrução temporal já estava desabilitada na configuração, mas sua chamada foi retirada do caminho da importação.

## Correção

- Combinação explícita de Data + Tempo/Hora, sem usar outra coluna como fallback quando existe cabeçalho temporal.
- XLSX lido diretamente do XML original: datas seriais, estilos, strings compartilhadas e sistemas de data 1900/1904.
- CSV/TXT lidos diretamente, com campos delimitados entre aspas e UTF-16 quando indicado por BOM.
- Datas nativas do Google Sheets preservadas no fuso da planilha, incluindo segundos ocultos pela formatação visual. XLS legado usa conversão Drive v3 e depois o mesmo tratamento de datas nativas.
- Seleção AUTO/BR/US. AUTO interrompe datas efetivamente ambíguas e mistura inequívoca de formatos, em vez de adivinhar.
- Hora inválida ou reversão cronológica gera mensagem; nenhum horário é reconstruído. Exportação estritamente decrescente pode ser invertida sem alterar leituras.
- Prévia usa o mesmo parser do relatório e apresenta início/fim importados.
- Recorte dos ensaios e planilha de saída usam o fuso configurado, America/Sao_Paulo.

## Validação

23 testes automatizados passaram, com execução em America/Sao_Paulo e UTC: BR/US/ISO, ambiguidades, datas impossíveis, AM/PM, virada de mês/meia-noite, serial Excel, cabeçalho Elitech, recorte de ensaio, CSV/TXT, datas nativas de Sheets, XML XLSX 1900/1904, prévia e formulário.

Arquivos reais baixados sem alterar os originais; XML descompactado e processado pelo novo importador. Comparação de **todos os 9.147 registros**, verificando data/hora e temperatura linha a linha, sem perda na importação individual:

| Arquivo | Registros | Início | Fim |
|---|---:|---|---|
| DTL 01 arrumado.xlsx | 1.524 | 20/08/2026 10:57:13 | 21/08/2026 12:20:13 |
| DTL 03 arrumado.xlsx | 1.525 | 20/08/2026 10:58:01 | 21/08/2026 12:22:01 |
| DTL 04 arrumado.xlsx | 1.526 | 20/08/2026 10:57:37 | 21/08/2026 12:22:37 |
| DTL 05 arrumado.xlsx | 1.522 | 20/08/2026 11:00:00 | 21/08/2026 12:21:00 |
| DTL 06 arrumado.xlsx | 1.526 | 20/08/2026 10:58:16 | 21/08/2026 12:23:16 |
| DTL 07 arrumado.xlsx | 1.524 | 20/08/2026 10:57:34 | 21/08/2026 12:20:34 |

A mesclagem existente foi exercitada: 1.526 instantes de referência; diferenças no início/fim das séries geram lacunas, sem fabricar temperaturas. A regra de sincronização entre sensores não foi alterada.

## Publicação e limites

Backup completo em `backups/CADEIA_FRIO_DATAS_20260928/`. A versão 288 tinha exatamente o mesmo conteúdo do HEAD remoto (193 arquivos). O publicador preserva todos esses arquivos, substitui apenas seis arquivos de cadeia fria e acrescenta o helper de datas. Impede sobrescrita caso detecte publicação concorrente.

Versão **289**, publicada e confirmada na mesma implantação: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`. Comprovante de versão e verificação de conteúdo em `publicacao.json`; **194 arquivos conferidos** após a correção.

Os testes do parser ocorreram localmente com adaptadores dos serviços Apps Script e XML original dos arquivos reais. Acesso HTTP ao portal verificado. Não foi emitido um laudo de cliente para teste nem alterado relatório histórico; documentos antigos precisam ser regenerados quando aplicável. XLS legado não teve amostra real nesta bateria.
