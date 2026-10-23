# Publicação integrada — 23/10/2026

## Conteúdo

Integra os commits de Autoclave `ba6e3cc` (origem) / `e14b4b3` (servidor), com as alterações de Início, permissões e Chaves, integração Intelbras, garagem e conferência noturna do KM. Não executar o importador sobre alterações não commitadas; ele agora recusa essa operação, inclusive arquivos novos.

## Incidente e correção

O PostgreSQL respondeu durante o incidente. Vários módulos retornaram “Sessão expirada ou inexistente”. Restaurar a imagem anterior e entrar novamente recuperou a tela, conforme confirmação do proprietário. A imagem defeituosa não ficou disponível para comparação posterior; portanto a causa exata de todas as requisições não pode ser afirmada somente pelos registros.

Foi reproduzida uma falha de autenticação: `lerSessaoAuth_` aceitava uma cópia vencida do cache mesmo quando a sessão persistente já havia sido renovada; `validarSessao` então apagava ambas as cópias. Agora cache vencido, incompatível ou malformado consulta a propriedade persistente antes de encerrar. O teste falhou antes da correção e passou depois. Sessões realmente vencidas continuam recusadas. Requisições autenticadas da Frota e Conduta são testadas após a recuperação.

O navegador mostra um aviso de sessão encerrada, preservando a tela até a pessoa escolher “Entrar novamente”. Uma resposta atrasada da sessão anterior não interfere no novo login.

## Alarme e Frota

Ativar e desativar aparecem verdes e mostram o intervalo de 10 segundos. O servidor informa o tempo global restante, inclusive após recarregar e para outros colaboradores. Configuração continua restrita a Admin/Diretoria. Os testes usam central simulada; a publicação não deve enviar comandos físicos de arme/desarme ou portões.

Garagem usa `switch_1=true` para abrir e `false` para fechar, conforme teste presencial anterior confirmado pelo proprietário. O pedestre mantém seu comportamento.

Odômetro usa `totalDistance` antes do contador do aparelho. Montana PRP8J05 foi acertada para 189.780 km conforme foto. Onix aguarda devolução com foto atual na segunda-feira. Rotina após 22h de Brasília exige piloto ativo, devolução recente, parado/desligado/conectado, posição compatível e duas leituras independentes da foto coincidindo com o KM digitado. Tentativas incertas não são repetidas automaticamente. Gemini retornou HTTP 402 por créditos esgotados; ajustes dependentes da IA permanecem pendentes até regularização, sem trocar chave, pagar ou inventar KM.

## Validação e publicação

- Origem: `node --test --test-concurrency=2 tests/*.test.cjs`.
- Servidor: `npm run verificar`, `npx vitest run`, `node --test testes/automacao-predial-regressao.cjs testes/km-noturno.test.cjs testes/alarme-contagem.test.cjs`.
- Imagem derivada de `git archive HEAD`, em pasta limpa; backup do banco e código antes da troca.
- Teste da imagem sem rede, com banco efêmero e agendador desligado, antes do único `compose up` de produção.
- Depois: saúde, continuidade das sessões, Frota, Conduta, alarme (somente leitura), gatilhos e telas Autoclave/Chaves/Início. Push dos dois repositórios e cópias Git verificadas em `G:\Meu Drive`.
