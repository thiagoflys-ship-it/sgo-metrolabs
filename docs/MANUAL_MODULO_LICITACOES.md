# Manual do módulo Licitações (SGO+) — etapas 1 e 2

Versão de 02/11/2026 (etapa 2: arquivos do edital e nota 0–100 pela IA). Quem usa: Diretoria e Administrador. Os demais perfis não veem o módulo.

## 1. Para que serve

O módulo Licitações acompanha as contratações públicas que interessam à Metrolabs. Nesta etapa ele faz quatro coisas:

1. Coleta, no servidor próprio do SGO+, as contratações publicadas no PNCP (Portal Nacional de Contratações Públicas), sem depender de ninguém com a tela aberta. O Compras.gov.br dados abertos é a reserva quando o PNCP falha e a fonte dos itens de cada contratação.
2. Faz a triagem por regras: separa o que interessa (candidatas), o que tem impeditivo a decidir (travadas) e o que a regra descarta (com o motivo e o trecho da fonte).
3. Mostra tudo nas telas Hoje em Licitações e Oportunidades, com a ficha básica de cada licitação e o histórico completo.
4. Mantém o cadastro dos 33 portais da missão, com o tipo de integração, a situação, o teste de conexão real, o registro das chamadas e a parametrização.

Na etapa 2 (02/11/2026) o módulo ganhou mais duas:

5. Baixa os arquivos do edital (edital, termo de referência, anexos) das candidatas, travadas e das que a Diretoria pedir, guarda cada um no servidor com o SHA-256 e extrai o texto (seção 6.5).
6. Dá uma nota de 0 a 100 com a IA, por critério, com cada afirmação classificada como FATO (com o trecho e a fonte), INFERÊNCIA ou PENDÊNCIA (seção 6.6). A IA não decide: descartar ou participar continua com a Diretoria.

Ficam para as próximas etapas: agenda e prazos, alertas por WhatsApp, Kanban e Gantt, tabela de preços, simulador, proposta, disputa e contratos.

## 2. Quem pode usar

- Diretoria e Administrador: tudo nesta etapa.
- Gestor, Comercial, Financeiro, Técnico, Metrologia, RH, cliente e representada: não usam. O menu não aparece e o servidor recusa as chamadas, mesmo que alguém tente abrir o endereço da tela.

## 3. Onde fica

Menu lateral, grupo "Licitações":

- Hoje em Licitações
- Oportunidades
- Portais e configurações

No celular, a tela inicial ganha o atalho "Licitações" e cada tela do módulo abre com a barra de seções no topo.

## 4. Como a coleta funciona

### 4.1 O que é lido

| Fonte | O que o SGO+ lê | Para quê |
|---|---|---|
| PNCP, contratações por data de publicação | Pregão eletrônico, concorrência eletrônica e dispensa | Radar diário |
| PNCP, contratações com proposta em aberto | As mesmas modalidades | Conferência diária (a partir das 22h) para não perder nada |
| Compras.gov.br, contratações | O mesmo período, quando o PNCP falha | Reserva (espelho do PNCP com atraso) |
| Compras.gov.br, itens | Itens das candidatas e travadas | Triagem mais precisa (material ou serviço, benefício ME/EPP) |

Ficam fora do radar por padrão: a inexigibilidade (contratação sem disputa, útil só para inteligência de mercado) e o credenciamento (o código dessa modalidade ainda não foi conferido na tabela oficial do PNCP). As duas podem ser ligadas pelo Administrador quando forem necessárias.

### 4.2 Regras de uso das APIs

- No máximo 1 chamada a cada 3 segundos no PNCP (o próprio PNCP bloqueia com HTTP 429 acima disso).
- HTTP 429 ou 503: o coletor espera 30 segundos, depois 60, depois 120, e então desiste daquela rodada; a próxima tenta de novo.
- Cada chamada fica no registro (portal, rota, parâmetros, HTTP, duração, quantidade, erro).
- A coleta é incremental: começa um dia antes da última data lida por inteiro. A data só avança quando todas as páginas foram lidas.

### 4.3 Uma licitação nunca aparece duas vezes

A chave é o número de controle do PNCP (por exemplo, 00444232000139-1-001311/2026). O Compras.gov.br devolve o mesmo número; a compra dele é reconhecida como a mesma.

### 4.4 Retificação na fonte

Quando o órgão retifica a publicação (data, objeto, valor, situação), o SGO+ grava uma versão nova ligada à anterior. A versão anterior nunca é alterada nem apagada. A ficha mostra todas as versões, e o histórico diz o que mudou (de → para), com a versão e o hash.

### 4.5 Horários e fuso

O PNCP informa as datas sem fuso. O SGO+ guarda o texto como veio e trata o horário como de Brasília, marcado como presumido. Nas UFs com outro fuso (AM, MT, MS, RO, RR e AC), a ficha pede para confirmar no edital se o horário é local.

### 4.6 Lei aplicável

A lei vem do amparo legal da contratação, não da modalidade. Estatal (por exemplo, IMBEL) usa pregão pela Lei 13.303/2016, com regulamento e prazos próprios; o cartão mostra o selo "Lei 13.303/2016 (estatal)".

## 5. Triagem por regras

### 5.1 Resultado

| Resultado | Quando | Onde aparece |
|---|---|---|
| Candidata | Tem termo de interesse e nada que descarte ou trave | Oportunidades > Para analisar |
| Travada | Tem termo de interesse e um impeditivo que depende de decisão da Diretoria | Oportunidades > Travadas |
| Descartada pela regra | Tem termo de interesse, mas a regra descarta | Oportunidades > Descartadas |
| Fora | Nenhum termo de interesse | Não aparece |

Toda decisão da regra vem com o motivo e o trecho literal do objeto, da informação complementar ou do item que a disparou.

### 5.2 Termos de interesse

Calibração, aferição, metrologia, qualificação térmica e de equipamento, validação de processo de esterilização, mapeamento térmico, termodesinfectora, lavadora ultrassônica, autoclave, esterilização, seladora, NR-13, vaso de pressão, caldeira, válvula de segurança, engenharia clínica, registrador de temperatura, osmose reversa, termo-higrômetro, esfigmomanômetro e manutenção de equipamentos de saúde ou de laboratório. Palavras a mais podem ser incluídas em Parametrizar (PNCP e Compras.gov.br).

### 5.3 O que descarta

- Termos negativos, tirados de falsos positivos reais: castração e esterilização de animais, reagentes e soluções de calibração, borracharia e calibragem de pneus, embalagem para esterilização, terceirização da esterilização de materiais, vidraria calibrada, equipamento de pavimento, audiologia, nobreak, locação de equipamento, insumos para CME. Se um termo mais específico também aparece (por exemplo, "calibração de termômetros"), a regra não descarta e põe o selo "Termo negativo junto: conferir".
- Compra de produto: dois sinais juntos entre objeto de aquisição ou fornecimento, itens de material, especificação construtiva (volume em litros, inox), garantia de fábrica ou prazo de entrega, adesão a ata, lista de insumos e objeto sem nenhuma palavra de serviço. O último sinal é uma leitura desta etapa: quando a Diretoria cadastrar produtos ou representadas, a trilha de produto passa a ser avaliada em vez de descartada.
- Contratação direta já decidida (ato que autoriza a contratação direta).
- Prazo de propostas encerrado.
- UF fora das configuradas ou valor abaixo do mínimo configurado (por padrão, Brasil inteiro e sem mínimo; valor não informado nunca é descartado por isso).

### 5.4 O que trava

- Exige acreditação RBC (ISO/IEC 17025): a Metrolabs não é acreditada; as calibrações são rastreáveis. Fica a pendência "o edital aceita calibração rastreável ou subcontratação de laboratório acreditado?". Quando o objeto diz que a acreditação é opcional, não trava (selo verde "Acreditação opcional"). Quando pede só certificado "rastreável à RBC" (padrões calibrados por laboratório acreditado), também não trava: fica o selo laranja "Rastreabilidade à RBC" e a pendência para conferir no edital. Se o texto fala em laboratório acreditado ou empresa pertencente à RBC, trava.
- Dedicação exclusiva de mão de obra (equipe residente). "Sem dedicação exclusiva" não trava.
- Software de gestão exigido.
- Suspensa na fonte.
- Exclusivo ME/EPP com o porte da matriz configurado como "Demais". Com o porte EPP (padrão, decisão do dono), o item exclusivo não trava: ganha os selos "Exclusivo ME/EPP — podemos participar (EPP)" e "Empate ficto (EPP)".

### 5.5 Selos de ponto forte e de informação

- Autorizada Inmetro: o objeto ou o item fala de balança ou esfigmomanômetro (a Metrolabs tem registro no Inmetro para esses instrumentos; o escopo exato está a confirmar com o documento).
- Lei 13.303/2016 (estatal).
- Valor estimado não informado ou sigiloso.
- Versão N da fonte (houve retificação).

### 5.6 Ordem da lista

O padrão é a prioridade da UF (GO e DF 8; MG, BA, TO, MT, MS e RJ 6; demais do Sudeste e Sul 3; Norte e Nordeste 2) e, depois, o prazo de proposta mais próximo. Em "Ordenar por" dá para escolher a nota (maior primeiro; as sem nota ficam no fim) ou só o prazo.

### 5.7 Quando as regras mudam

Mudou uma palavra, a UF, o valor mínimo ou o porte, a próxima rodada refaz a triagem de tudo o que está em aberto. A regra só muda a situação de uma oportunidade enquanto ninguém mexeu nela (no radar, ou descartada pela regra). O que a Diretoria enviou para análise, descartou com motivo ou reabriu nunca é desfeito pela regra; a mudança de triagem fica só no histórico (a ficha de uma reaberta avisa "a regra do radar não descarta de novo").

## 6. Telas

### 6.1 Hoje em Licitações

- Faixa da situação do coletor: última coleta, quantos registros lidos, novos, candidatos, travados e descartados; ou o motivo da falha e o que fazer.
- Números clicáveis: Para analisar, Travadas, Em análise, Prazos de proposta em 7 dias, Descartadas pela regra (7 dias), Com versão nova da fonte (7 dias).
- Prazos de proposta nos próximos 7 dias e as últimas que entraram no radar, cada uma com "Abrir ficha".
- "Atualizar" traz o que o coletor já encontrou. "Coletar agora" pede uma rodada fora da frequência (começa em até 1 minuto).

### 6.2 Oportunidades

Partes: Para analisar, Travadas, Em análise, Descartadas. Filtros: busca, UF (ou a prioridade), selo, onde é a sessão e "Ordenar por" (prioridade da UF e prazo, nota, prazo).

Cada cartão mostra a nota de 0 a 100 e a classe quando a análise por IA já foi feita (sem nota: a UF e a situação), o órgão e o código LIC, município, modalidade, modo de disputa, registro de preços, onde é a sessão, os selos, o objeto com o termo destacado, o número de controle, o valor estimado, o prazo de proposta com o tempo restante, o motivo, o trecho da fonte e as pendências.

Onde é a sessão: quando a publicação veio de um portal de disputa conhecido (Compras.gov.br, BLL, BNC, Licitanet, Licitar Digital, BBMNET, Licitações-e, Portal de Compras Públicas e portais estaduais), o cartão diz qual. Quando veio de um sistema municipal de gestão, a plataforma da sessão precisa ser lida no edital.

Ações:

| Botão | O que faz | Regra |
|---|---|---|
| Abrir ficha | Resumo, Arquivos, Análise, Fonte e Histórico | — |
| Enviar para análise | Leva para "Em análise", com você como responsável | Observação opcional |
| Descartar | Leva para "Descartadas" | Motivo obrigatório (pelo menos 10 letras) |
| Reabrir | Devolve uma descartada ao radar; a regra não a descarta de novo | Motivo obrigatório |
| Abrir no portal | Abre o processo no sistema de origem, em nova aba | Só quando a fonte informa o link e ele é um endereço http/https (outro tipo de link vindo da fonte é ignorado, por segurança) |
| Ver no PNCP | Abre a contratação no site do PNCP, em nova aba | — |

### 6.3 Ficha da licitação

- Resumo: objeto completo, triagem com o trecho, pendências, fuso e as ações.
- Fonte: de onde veio, onde é a sessão, quem publicou, links, CNPJ do órgão, número da compra no Compras.gov.br, abertura e encerramento das propostas como a fonte informou, fuso, situação na fonte, última atualização na fonte, primeira coleta, última sincronia, hash da versão (SHA-256), hash da resposta original, versão das regras da triagem, tabela das versões e tabela dos itens.
- Arquivos: os arquivos do edital (seção 6.5).
- Análise: a nota e a leitura do edital pela IA (seção 6.6).
- Histórico: cada fato com quando, quem, o quê (de → para), versão, fonte e hash.

### 6.4 Portais e configurações

Partes:

1. Portais e integrações: os 33 portais com código, nome, tipo (A a E), situação, ligado ou desligado, último teste e as ações "Acessar" (abre o portal em nova aba), "Parametrizar" e, no PNCP e no Compras.gov.br, "Testar conexão".
2. Registro das chamadas: as últimas chamadas do coletor e dos testes.
3. Regras do radar: "Coletor ligado", porte da matriz e os termos e regras que a triagem usa.
4. Permissões: quem vê o quê.

Situação dos portais no cadastro inicial:

| Situação | Portais |
|---|---|
| Em teste (vira "Operacional" no primeiro teste real bem-sucedido) | PNCP, Compras.gov.br |
| Aguardando credenciais | Portal de Compras Públicas (chave publicKey pedida por formulário) |
| Aguardando documentação | BBMNET, Bionexo, GTPLAN, SmartCompras, Petronect, Mercado Eletrônico |
| Não configurado | Demais (sem API para fornecedor: publicação pelo PNCP, sessão no próprio portal) |

Parametrizar (o motivo é obrigatório; cada salvamento vira versão nova; só os campos alterados mudam):

| Campo | Regra |
|---|---|
| Ligado | Só portais com API (tipos A e B); o tipo B exige a credencial |
| Palavras a mais que interessam | Separadas por vírgula; somam-se aos termos padrão |
| Palavras que descartam | Separadas por vírgula; o descarte fica registrado |
| UFs | Siglas separadas por vírgula; em branco = Brasil inteiro |
| Valor mínimo | Em reais; 0 = sem mínimo |
| Frequência | 30 min, 1 h, 2 h (padrão), 4 h, 12 h ou 1 vez por dia |
| Credencial | O NOME da chave em Chaves e senhas (letras maiúsculas, números e _), nunca o valor |
| Responsável | Diretoria ou Administrador ativos |
| Situação | "Operacional" só depois de um teste real bem-sucedido |

Nesta etapa, as palavras, UFs, valor mínimo e frequência do PNCP valem para o que vem do PNCP; os do Compras.gov.br, para o que vem pela reserva.

### 6.5 Arquivos do edital (aba Arquivos da ficha)

De onde vêm: da API do PNCP que lista e entrega os documentos de cada contratação (`/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos`). O servidor lê com a mesma regra do coletor: no máximo 1 chamada a cada 3 segundos no PNCP, somando tudo, e espera quando o PNCP responde 429 ou 503.

De quais oportunidades: só das candidatas e travadas com prazo em aberto (rotina do servidor a cada 5 minutos, com o coletor ligado), das enviadas para análise e das que a Diretoria pedir com "Buscar arquivos agora". As milhares de contratações sem termo de interesse nunca são baixadas; o servidor recusa o pedido para elas.

O que fica guardado de cada arquivo: título e tipo do documento, nome, tamanho, data de publicação na fonte, data do download, origem (PNCP) e o SHA-256 do conteúdo. O arquivo fica restrito: não abre por link, só pela ficha, para a Diretoria e o Administrador, e o servidor confere o SHA-256 antes de entregar.

Sem repetição: o mesmo conteúdo (mesmo SHA-256) é guardado uma vez só, mesmo que apareça em dois documentos; a tabela diz "Conteúdo igual a ...". Documento que muda na fonte com o mesmo número vira versão nova; a anterior continua guardada em "Versões anteriores". Documento que some da lista da fonte fica marcado "retirado da fonte", nunca apagado.

Texto: extraído do PDF com texto, do Word (DOCX), de planilhas e dos PDFs dentro de ZIP, num processo separado com memória e tempo limitados (arquivo que trava a leitura vira "texto não extraído" com o motivo; parte de ZIP acima de 50 MB não é aberta). O download só segue redirecionamento dentro do pncp.gov.br; arquivo acima de 80 MB ou redirecionado para fora fica "recusado" e não é baixado de novo, salvo se mudar na fonte. O que não dá para ler fica como "texto não extraído" com o motivo, sem inventar nada: PDF escaneado (imagem, precisa de OCR, que o SGO+ não faz), RAR, 7z, imagem, Word antigo (.doc), PDF com senha. PDF com algumas páginas sem texto fica "Texto parcial", com a contagem.

Falha da fonte: se a lista ou o download falham (por exemplo, HTTP 503 "No server is available"), a faixa vermelha diz o erro e a hora da nova tentativa automática (15 min, 1 h, 4 h, 12 h e depois a cada 24 h). A rodada para no primeiro 503 para não insistir com a fonte fora do ar. Enquanto isso, leia o edital pelo botão "Ver no PNCP".

Botões: "Abrir" (outra aba; só PDF, imagem e texto, por segurança: HTML, XML, SVG e os demais saem como download) e "Baixar" (salva no aparelho), até 25 MB pela tela; "Buscar arquivos agora" (pedido em segundo plano); "Atualizar a ficha" (a tela não se atualiza sozinha).

### 6.6 Análise por IA e nota de 0 a 100 (aba Análise da ficha)

A IA lê o edital (o texto extraído dos arquivos), o objeto, os itens e os dados do PNCP, e devolve uma análise por critério. Cada afirmação vem classificada:

- FATO: com a fonte, que é o arquivo (A1, A2... com o nome e o SHA-256) ou o campo do PNCP, e o trecho copiado entre aspas.
- INFERÊNCIA: conclusão a partir dos fatos, com o raciocínio.
- PENDÊNCIA: o que falta saber para decidir.

Critérios e quem pontua (pesos do doc 03, B6; ficam em LIC_CONFIG, chave NOTA, com versão):

| Critério | Peso | Quem pontua |
|---|---|---|
| Capacidade técnica | 30 | A IA classifica cada item com grau (alta, média, baixa, não atende), o código do catálogo e o trecho (do objeto, de um item ou de um arquivo; UF, valor e datas não provam serviço). O sistema calcula os pontos: item de grau alto provado conta 1, médio meio, o resto zero, sobre o total de itens |
| Margem | 15 | Sistema: 5 com pendência enquanto não houver piso (a tabela de preços de Licitações é da próxima etapa) |
| Documentação | 15 | IA, conferida: as exigências de habilitação com o trecho. No máximo 7,5 (metade, como pendência) enquanto o SGO+ não tiver o cadastro de habilitação |
| Localização | 15 | Sistema: prioridade da UF (até 8) + distância (até 7; metade como pendência até a distância rodoviária ser confirmada; Goiânia vale 7) |
| Prazo | 10 | Sistema: dias úteis até o fim das propostas, contados com os feriados do SGO+ (a IA não conta datas) |
| Valor | 10 | Sistema: pelo valor estimado da fonte |
| Riscos | 5 | IA, conferida: perde 1 ponto por risco provado com trecho (registro de preços sem mínimo, garantia acima de 5%, garantia de proposta, peças sem teto, atendimento em horas, medição longa, multa acima de 10%, vistoria obrigatória) |

Trava provada com trecho zera a nota, com o motivo (exige laboratório acreditado RBC sem aceitar rastreabilidade, dedicação exclusiva, software próprio, vistoria vencida, empresa impedida, contratação direta já decidida, tudo fora do catálogo, produto sem catálogo), e a soma sem a trava fica registrada. O prazo vencido também trava. Classes: 75 ou mais alta, 50 a 74 média, 30 a 49 baixa, abaixo de 30 ou com trava "candidata a descarte". A oportunidade continua no radar: quem descarta é a Diretoria.

Regras do dono que a IA recebe: a Metrolabs não é acreditada RBC (é rastreável); tem autorização do Inmetro para balanças e esfigmomanômetros; participa a matriz de Goiânia, empresa de pequeno porte (EPP); prioridade GO, DF, vizinhos e RJ. O texto do sistema nunca cita fabricante.

O verificador: antes de valer, a resposta da IA é conferida. Todo FATO precisa da fonte, e o trecho (pelo menos 3 palavras seguidas) é procurado palavra por palavra no texto daquela fonte (sem acento, sem caixa, espaços normalizados). Cada fonte vai para a IA entre marcadores sorteados a cada análise, com a ordem de tratar o conteúdo como dado: instrução escrita dentro do edital é ignorada. Número ou citação no resumo e nas justificativas tem de estar nas fontes ou nos cálculos do sistema. Se a triagem por regras travou a oportunidade, a IA tem de provar a trava ou deixar a pendência "trava". Trecho que não está lá, fonte inexistente, pontos fora do peso, código de risco ou trava fora da lista, frase de decisão ("recomendo participar"), afirmação de acreditação RBC, fabricante citado, emoji ou markdown fazem a resposta ser recusada e refeita (até 2 vezes, com os problemas apontados). Recusada de novo, fica registrada como "recusada pelo verificador" e a nota anterior continua valendo.

Quando roda: sozinha, quando chegam arquivos novos ou mudados ou a fonte tem versão nova, só nas oportunidades no radar ou em análise com prazo aberto, e só se a base mudou (assim não gasta à toa). "Analisar agora" faz a primeira; "Refazer análise" pede o motivo (pelo menos 10 letras). Leva de 1 a 3 minutos.

Sem a chave da IA: nada é calculado nem inventado; a tela diz "análise por IA indisponível: falta a chave" e o botão fica desligado. O Administrador cadastra a chave GEMINI_API_KEY em Administração > Chaves e senhas (o modelo é o de IA_MODEL, o mesmo do restante do SGO+).

Versões: cada análise é uma linha nova em LIC_ANALISES (versão, data, quem pediu, motivo, modelo, a base analisada, os arquivos com o SHA-256 e o hash da própria análise). "Todas as versões da análise" mostra as anteriores.

## 7. Problemas comuns

| Situação | O que fazer |
|---|---|
| "O coletor de licitações roda só no servidor próprio do SGO+" | Abra o SGO+ em sgo.metrolabs.com.br |
| Faixa "Coletor desligado" | Portais e configurações > Regras do radar > "Coletor ligado", motivo, "Salvar versão nova" |
| Faixa vermelha: PNCP sem sucesso em 5 rodadas | Veja o registro das chamadas e use "Testar conexão"; HTTP 429 é limite, 503 é PNCP fora do ar. Enquanto isso o Compras.gov.br cobre |
| "Escreva o motivo do descarte" | Pelo menos 10 letras; nada foi alterado |
| "Não foi possível ligar: o portal é do tipo E" | Portal sem API; a publicação chega pelo PNCP |
| "Escreva o NOME da chave" | Cadastre o valor em Chaves e senhas e escreva só o nome aqui |
| "precisa de um teste de conexão real" | Toque em "Testar conexão" antes de marcar "Operacional" |
| Licitação com "ler no edital" na sessão | Publicação de sistema municipal; a plataforma da disputa está no edital |
| "Análise por IA indisponível: falta a chave" | O Administrador cadastra GEMINI_API_KEY em Chaves e senhas; depois, "Analisar agora". Os arquivos continuam disponíveis |
| Aba Arquivos com a leitura falhando (HTTP 503) | O PNCP de arquivos está fora do ar; o servidor tenta de novo na hora indicada. Leia o edital por "Ver no PNCP" |
| Arquivo com "texto não extraído" | Abra e leia à mão (imagem escaneada, RAR ou formato que o SGO+ não lê); a análise lista isso nas pendências |
| "A última tentativa foi recusada pelo verificador" | A IA citou trecho que não está no edital; a nota anterior vale. Use "Refazer análise" com o motivo |
| "Escreva o motivo para refazer a análise" | Pelo menos 10 letras; nada foi alterado |

## 8. Rastreabilidade

- Toda chamada a portal: registro no servidor (lic_conexoes_log).
- Toda resposta original: guardada com hash no servidor (prova do que estava publicado na data).
- Toda versão da fonte: linha própria, ligada à anterior, nunca alterada.
- Todo fato no SGO+ (entrada no radar, retificação, triagem refeita, descarte, análise, reabertura, parâmetro de portal, teste de conexão, regras do radar, coleta pedida): histórico com quem, quando, o quê, versão, fonte e hash.
- Arquivos do edital: cada um com SHA-256, tamanho, nome, origem e datas (lic_arquivos no servidor); versão nova quando muda na fonte; o histórico registra os arquivos lidos (ARQUIVOS_DA_FONTE, com o hash da base) e quem abriu ou baixou (ARQUIVO_ABERTO, com o SHA-256).
- Análise por IA: uma linha por versão em LIC_ANALISES, com o hash; no histórico, ANALISE_IA (ou recusada, ou falhou) com a versão, o modelo, a versão da fonte e os arquivos lidos com o SHA-256.
- Nada é apagado: a situação muda.

### 8.1 Regra de guarda (aprovada pelo dono em 02/11/2026)

| O quê | Quanto tempo |
|---|---|
| Oportunidade em que a Diretoria mexeu (análise, decisão, descarte manual, reabertura, arquivo pedido ou aberto, análise por IA pedida, proposta, resultado, contrato), com o histórico e os arquivos do edital | Para sempre |
| Candidata ou travada nunca tocada por pessoa | 2 anos a partir da publicação; depois sai da lista, com o resumo do que saiu no histórico |
| Fora do ramo (sem termo de interesse, ou descartada só pela regra e nunca tocada) | Só o resumo (órgão, objeto, valor, UF, modalidade, datas, número de controle, hash) por 1 ano; os dados brutos da fonte, 30 dias |
| Registro das chamadas aos portais | 6 meses |

Os dados brutos das oportunidades que ficam (para sempre ou nos 2 anos) nunca são apagados: são a prova do que estava publicado. A limpeza roda sozinha toda segunda às 06:30, dentro do servidor (a manutenção semanal só pede), com a coleta e a leitura de arquivos pausadas enquanto ela roda, em lotes pequenos, e o resumo (quantas linhas saíram de cada tabela e o espaço) vem no e-mail da manutenção. Enquanto o resumo existe, a mesma licitação não volta como "nova"; depois de 1 ano, se reaparecer na fonte, entra como nova. Se algo der errado na conferência do que é protegido, nada das licitações é apagado.

## 9. Para o Administrador

- Chave geral do coletor: propriedade LIC_COLETOR_LIGADO ("1" liga). A tela grava a chave quando a Diretoria salva as Regras do radar; antes disso, vale o que estiver na propriedade.
- Parâmetros que o servidor lê: propriedade LIC_CFG_COLETOR (gravada pela tela; não editar à mão).
- Coleta real sob demanda no servidor: `npx tsx scripts/licitacoes_coletar.ts` (opções `--dias`, `--modalidades`, `--propostas`, `--testar`, `--sincronizar`).
- A sentinela de infraestrutura mostra o item "Coletor de licitações (PNCP e Compras.gov.br)" em Saúde da infraestrutura.
- Arquivos do edital: tabelas lic_arquivos e lic_arquivos_estado no servidor; o conteúdo fica no serviço de arquivos do servidor, restrito (RESTRITO:LICITACOES). A rotina roda a cada 5 minutos com o coletor ligado (os pedidos da tela rodam sempre).
- Regra de guarda: `npx tsx scripts/licitacoes_guarda.ts --previa` conta sem apagar; sem `--previa` aplica (a manutenção semanal já chama). O script só chama a rota interna POST /interno/licitacoes/guarda do próprio servidor (aceita só de dentro do contêiner), que pausa o coletor e os arquivos, roda Lic_guarda_ (SGO_Licitacoes_Guarda.js) no pool principal, com a mesma trava da sincronização, e depois servicos/licitacoes/guarda.ts. Tudo que ainda está em LIC_OPORTUNIDADES fica com a contratação, os itens e os arquivos no servidor.
- Análise por IA: chave GEMINI_API_KEY e modelo IA_MODEL (as mesmas do SGO+); pesos da nota em LIC_CONFIG, chave NOTA (sem linha, vale o padrão do doc 03, B6).
