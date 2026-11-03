# Manual do módulo Licitações (SGO+) — etapas 1, 2, 3 e 4

Versão de 02/11/2026 (etapa 2: arquivos do edital e nota 0–100 pela IA; etapa 3: agenda de prazos e alertas com ciência e escalonamento; etapa 4: Kanban, Gantt e Painel; leitura especialista do edital, seção 6.6.1; proposta em A4 e relatórios em A4). Quem usa: Diretoria e Administrador. Os demais perfis não veem o módulo.

## 1. Para que serve

O módulo Licitações acompanha as contratações públicas que interessam à Metrolabs. Nesta etapa ele faz quatro coisas:

1. Coleta, no servidor próprio do SGO+, as contratações publicadas no PNCP (Portal Nacional de Contratações Públicas), sem depender de ninguém com a tela aberta. O Compras.gov.br dados abertos é a reserva quando o PNCP falha e a fonte dos itens de cada contratação.
2. Faz a triagem por regras: separa o que interessa (candidatas), o que tem impeditivo a decidir (travadas) e o que a regra descarta (com o motivo e o trecho da fonte).
3. Mostra tudo nas telas Hoje em Licitações e Oportunidades, com a ficha básica de cada licitação e o histórico completo.
4. Mantém o cadastro dos 33 portais da missão, com o tipo de integração, a situação, o teste de conexão real, o registro das chamadas e a parametrização.

Na etapa 2 (02/11/2026) o módulo ganhou mais duas:

5. Baixa os arquivos do edital (edital, termo de referência, anexos) das candidatas, travadas e das que a Diretoria pedir, guarda cada um no servidor com o SHA-256 e extrai o texto (seção 6.5).
6. Dá uma nota de 0 a 100 com a IA, por critério, com cada afirmação classificada como FATO (com o trecho e a fonte), INFERÊNCIA ou PENDÊNCIA (seção 6.6). A IA não decide: descartar ou participar continua com a Diretoria.

Na etapa 3 (02/11/2026):

7. Monta a agenda de prazos de cada licitação a partir da fonte, com a natureza de cada data (confirmada, calculada pela lei ou pendente de confirmação), os feriados, a retificação como versão nova e a suspensão (seção 6.7).
8. Avisa a Diretoria de Licitações (interno, e-mail e WhatsApp oficial), pede a ciência, escalona sem ciência e usa o canal alternativo quando um falha (seções 6.8 e 6.9).

Na etapa 4 (02/11/2026):

9. Kanban das licitações por etapa, do Radar ao Contrato, com a passagem de etapa sempre com motivo e histórico (seção 6.10).
10. Gantt dos prazos no tempo, com a natureza de cada data e o momento atual marcado (seção 6.11).
11. Painel (Dashboard) com os indicadores do módulo, cada número com a fonte e o clique para a lista que o compõe (seção 6.12).

Ficam para as próximas etapas: tabela de preços, simulador, proposta, habilitação, disputa e contratos.

## 2. Quem pode usar

- Diretoria e Administrador: tudo nesta etapa.
- Gestor, Comercial, Financeiro, Técnico, Metrologia, RH, cliente e representada: não usam. O menu não aparece e o servidor recusa as chamadas, mesmo que alguém tente abrir o endereço da tela.

## 3. Onde fica

Menu lateral, grupo "Licitações":

- Hoje em Licitações
- Painel (Dashboard)
- Oportunidades
- Kanban
- Gantt
- Agenda e prazos
- Central de alertas
- Preços de licitação
- Portais e configurações
- Relatórios (relatório da oportunidade e relatório do período, em A4)

No celular, a tela inicial ganha o atalho "Licitações" e cada tela do módulo abre com a barra de seções no topo (Hoje, Painel, Oportunidades, Kanban, Gantt, Agenda, Alertas, Preços, Portais e configurações). Em Oportunidades, Kanban e Gantt, a barra "Lista · Kanban · Gantt" troca a forma de ver as mesmas licitações.

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

O padrão é a prioridade da UF (GO e DF 8; MG, BA, TO, MT, MS e RJ 6; demais do Sudeste e Sul 3; Norte e Nordeste 2) e, depois, o prazo de proposta mais próximo. Em "Ordenar por" dá para escolher a nota (maior primeiro; depois as sem nota; as de descarte, com nota 0 ou abaixo de 30, ficam por último) ou só o prazo.

### 5.7 Quando as regras mudam

Mudou uma palavra, a UF, o valor mínimo ou o porte, a próxima rodada refaz a triagem de tudo o que está em aberto. A regra só muda a situação de uma oportunidade enquanto ninguém mexeu nela (no radar, ou descartada pela regra). O que a Diretoria enviou para análise, descartou com motivo ou reabriu nunca é desfeito pela regra; a mudança de triagem fica só no histórico (a ficha de uma reaberta avisa "a regra do radar não descarta de novo").

## 6. Telas

### 6.1 Hoje em Licitações

- Faixa da situação do coletor: última coleta, quantos registros lidos, novos, candidatos, travados e descartados; ou o motivo da falha e o que fazer.
- Números clicáveis: Para analisar, Travadas, Em análise, Prazos de proposta em 7 dias, Descartadas pela regra (7 dias), Com versão nova da fonte (7 dias), Na fila de análise por IA, Alta aderência (24 h) e Alta aderência (7 dias). Os dois de alta aderência contam as oportunidades com alerta de nova oportunidade de alta aderência no período que continuam com a nota no limite ou acima, sem trava e com o prazo em aberto; a fonte fica logo abaixo dos números e o toque abre Oportunidades filtrada (de todas as partes, com a faixa do filtro e "Ver a aba" para tirar). Quando há oportunidade esperando nova tentativa da análise automática, ou que falhou 3 vezes, uma faixa diz quantas e o que fazer.
- Prazos de proposta nos próximos 7 dias e as últimas que entraram no radar, cada uma com "Abrir ficha".
- "Atualizar" traz o que o coletor já encontrou. "Coletar agora" pede uma rodada fora da frequência (começa em até 1 minuto).

### 6.2 Oportunidades

Partes: Para analisar, Travadas, Em análise, Descartadas. Filtros: busca, UF (ou a prioridade), selo, onde é a sessão, "Quem descartou" (só na parte Descartadas: todas, só a regra do radar ou a Diretoria; feito no servidor) e "Ordenar por" (prioridade da UF e prazo, nota, prazo).

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
- Prazos: os prazos com a fonte e a natureza, os alertas de cada um e as versões anteriores (seção 6.7).
- Arquivos: os arquivos do edital (seção 6.5).
- Análise: a nota e a leitura do edital pela IA (seção 6.6).
- Proposta: a proposta técnica e comercial em A4 (seção "Proposta (aba Proposta da ficha)").
- Histórico: cada fato com quando, quem, o quê (de → para), versão, fonte e hash.

### 6.4 Portais e configurações

Partes:

1. Portais e integrações: os 33 portais com código, nome, tipo (A a E), situação, ligado ou desligado, último teste e as ações "Acessar" (abre o portal em nova aba), "Parametrizar" e, no PNCP e no Compras.gov.br, "Testar conexão".
2. Registro das chamadas: as últimas chamadas do coletor e dos testes.
3. Regras do radar: "Coletor ligado", porte da matriz e os termos e regras que a triagem usa.
4. Regras dos alertas: quem recebe, canais, antecedências, níveis e escalonamento (seção 6.9).
5. Permissões: quem vê o quê.

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

- FATO: com a fonte, que é o arquivo (A1, A2... com o nome e o SHA-256) ou o campo do PNCP, e o trecho copiado entre aspas. Campo do PNCP (valor, UF, datas, modalidade) vale citado pelo valor inteiro (8431.44, 8.431,44 e R$ 8.431,44 são o mesmo valor).
- INFERÊNCIA: conclusão a partir dos fatos, com o raciocínio.
- PENDÊNCIA: o que falta saber para decidir.

As regras da empresa também são fontes citáveis: REGRA:catalogo (o que a Metrolabs faz), REGRA:rbc, REGRA:inmetro, REGRA:porte e REGRA:regiao. Elas servem só para inferência, pendência e para acompanhar uma trava (por exemplo: o edital pede calibração de decibelímetro, trecho do objeto, e REGRA:catalogo diz que acústica não está no catálogo: trava "fora do catálogo"). Nunca são fato sobre o edital nem prova de capacidade.

Manutenção corretiva genérica de "equipamentos médicos" sem a lista dos equipamentos: o código mais próximo do catálogo é HORA_TECNICO ("Hora técnica de técnico (corretiva, instalação, acompanhamento)"), que vale no máximo grau médio, com a pendência de ler a lista no termo de referência. Quando um grau não é aceito, o verificador diz à IA, na tentativa seguinte, quais códigos do catálogo cabem naquele trecho.

Critérios e quem pontua (pesos do doc 03, B6; ficam em LIC_CONFIG, chave NOTA, com versão):

| Critério | Peso | Quem pontua |
|---|---|---|
| Capacidade técnica | 30 | A IA classifica cada item com grau (alta, média, baixa, não atende), o código do catálogo e o trecho (do objeto, de um item ou de um arquivo; UF, valor e datas não provam serviço). Grau alto ou médio só vale com um código do catálogo e um trecho que fala daquele serviço (termômetro para CAL-001, autoclave para MP_AUTOCLAVE_BANCADA...); trecho com termo que não é serviço da Metrolabs (pneu, castração, reagente) não conta. O sistema calcula os pontos: item de grau alto provado conta 1, médio meio, o resto zero, sobre o total de itens da fonte (quando a fonte lista os itens) |
| Margem | 15 | Sistema: 5 com pendência enquanto não houver piso (a tabela de preços de Licitações é da próxima etapa) |
| Documentação | 15 | Com pelo menos um documento em uso no cadastro de habilitação: o SISTEMA, pelo cruzamento da aba Habilitação (atende conta inteiro, a conferir conta metade como pendência, falta, vence antes da sessão e "não atende" contam zero; a IA não pontua), com a pendência no quadro de afirmações; no máximo 7,5 (metade) quando as exigências vieram só da análise da IA, sem o checklist consolidado da leitura, ou quando há qualquer falta, vencimento antes da sessão ou "não atende" (falta na habilitação inabilita). Sem documento no cadastro (ou sem nenhuma exigência na leitura e na análise): a IA, conferida, no máximo 7,5 (metade, como pendência) |
| Localização | 15 | Sistema: prioridade da UF (até 8) + distância (até 7; metade como pendência até a distância rodoviária ser confirmada; Goiânia vale 7) |
| Prazo | 10 | Sistema: dias úteis até o fim das propostas, contados com os feriados do SGO+ (a IA não conta datas) |
| Valor | 10 | Sistema: pelo valor estimado da fonte |
| Riscos | 5 | IA, conferida: perde 1 ponto por risco provado com trecho (registro de preços sem mínimo, garantia acima de 5%, garantia de proposta, peças sem teto, atendimento em horas, medição longa, multa acima de 10%, vistoria obrigatória) |

Trava encontrada pela IA (exige laboratório acreditado RBC sem aceitar rastreabilidade, dedicação exclusiva, software próprio, vistoria vencida, empresa impedida, contratação direta já decidida, tudo fora do catálogo, produto sem catálogo) nunca zera a nota sozinha: ela fica como "trava a confirmar". A nota calculada continua visível, a classe mostra "candidata a descarte (trava a confirmar)", e a lista de Oportunidades e o Hoje mostram o selo "Trava a confirmar". Na aba Análise, cada trava tem os botões "Confirmar trava" e "Não é trava", os dois com motivo obrigatório (pelo menos 10 letras); a decisão fica no histórico com quem, quando, o motivo, o trecho e a nota de antes e de depois, com o número da decisão. Só depois de "Confirmar trava" a nota vai a 0 (a soma sem a trava fica registrada); "Não é trava" devolve a nota calculada. A decisão vale para a mesma trava e o mesmo trecho quando a análise é refeita, desde que o parágrafo do trecho no edital não tenha mudado e não tenha surgido exceção perto dele (para "Confirmar trava", também o arquivo inteiro: uma errata em outro parágrafo do mesmo arquivo, ou uma versão nova da fonte quando a trava cita um campo do PNCP, pede confirmação de novo); se mudou (edital retificado), a trava volta a "a confirmar", com a decisão anterior ao lado ("reconfirmar"). Trava nova pede confirmação nova. O trecho da trava tem de falar do assunto dela (RBC ou acreditação para a trava de RBC, dedicação exclusiva para a de dedicação exclusiva...), senão o verificador recusa; a trava "tudo fora do catálogo" precisa da frase do catálogo (REGRA:catalogo; quando a IA não a cita certo, o sistema cita a frase "Serviço ou produto que não aparece nas linhas acima está fora do catálogo da Metrolabs."). Só o prazo vencido, calculado pelo sistema, zera a nota direto. Classes: 75 ou mais alta, 50 a 74 média, 30 a 49 baixa, abaixo de 30 ou com trava confirmada "candidata a descarte". A oportunidade continua no radar e os alertas continuam: quem descarta é a Diretoria, pela ação de descartar.

Regras do dono que a IA recebe: a Metrolabs não é acreditada RBC (é rastreável); tem autorização do Inmetro para balanças e esfigmomanômetros; participa a matriz de Goiânia, empresa de pequeno porte (EPP); prioridade GO, DF, vizinhos e RJ. O texto do sistema nunca cita fabricante.

O verificador: antes de valer, a resposta da IA é conferida (fato repetido, com a mesma fonte e o mesmo trecho, aparece uma vez só). Todo FATO precisa da fonte, e o trecho (pelo menos 3 palavras seguidas) é procurado palavra por palavra no texto inteiro daquela fonte, na mesma ordem e com limite de palavra ("necessária" não vale dentro de "desnecessária"). Não contam acento, caixa, espaço, quebra de linha, pontuação solta, aspas tipográficas e o hífen que o PDF põe no fim da linha ("Con-tratada"). Número vale inteiro e com o separador ("1,5%" não é "15%", "1/12" não é "11/2", "R$ 15.000,00" não é "R$ 1.500.000"), e contam os sinais ≥, ≤, <, >, ± e o de número negativo ("-20 °C" não é "20 °C"). Trecho com negação antes dele na mesma frase ou oração ("Não será, sob qualquer pretexto, exigida ...", "é vedada ...", "é inaplicável ...", "fica isenta ..."; para trás até o começo da frase, parando em ponto, ponto e vírgula, interrogação, linha em branco ou item numerado que abre a linha, no máximo 40 palavras) é recusado. Também é recusado o que corta uma negação logo depois, separada por pontuação ou quebra de linha ("...laboratório? Não.", "... – Não", "...: não"), e, com qualquer separador, a negação que vem sozinha no fim da linha ou da frase ("...laboratório Não", "...laboratório. Não."). Negação que abre outra oração com conteúdo ("...; não se aplica aos itens de balança") não recusa. Item de lista fica sob a negação do cabeçalho da lista ("Não serão exigidos os seguintes documentos: alvará; certificado de acreditação RBC" ou com os itens numerados embaixo), e item numerado só começa outra frase quando a linha de cima termina em ponto, ponto de exclamação ou ponto e vírgula.

Resposta aceita em parte (03/11/2026, calibração com as 59 análises reais da fila): cada item de capacidade, exigência, risco, trava e afirmação é conferido sozinho, com as mesmas regras acima. O que não confere sai da nota (item de grau baixo ou "não atende" conta zero, risco não desconta, exigência não entra) e aparece em Pendências como "Não conferido (motivo)", sem repetir o trecho que não conferiu e sem mostrar texto da IA com negação, exceção, número fora das fontes ou termo impeditivo (RBC, acreditação, atestado, registro, Inmetro); a faixa no alto da análise diz quantos pontos caíram, e o resumo começa com o aviso do sistema ("N pontos da resposta da IA não conferiram...; capacidade provada: ..."). Trava apontada pela IA que não conferiu nunca some: fica na análise como "Não conferida — confirme no edital", a confirmar (a classe mostra "trava a confirmar"). A resposta inteira continua recusada quando falha o resumo, uma justificativa, os pontos da documentação, um número ou citação solta; quando cai algum item de grau alto ou médio (o resumo não pode afirmar capacidade que não foi provada); quando nenhum item de capacidade confere; quando a IA aponta trava e nenhuma confere (a trava "tudo fora do catálogo" descartada pelo sistema só libera a recusa se nenhuma outra trava caiu); quando não há nenhum fato conferido; quando a triagem travou e não há trava provada nem pendência "trava" da IA; ou quando cai mais da metade do que a IA escreveu. Havendo tempo, a IA recebe o que caiu e tenta de novo; vale a resposta com menos pontos caídos. Objeto fora do ramo (despacho aduaneiro, compra de produto, obra, software): com todos os itens "não atende" e ao menos um deles conferido, a análise passa com capacidade 0. A trava "tudo fora do catálogo" fica a confirmar, provada pelo trecho da IA ou pelo objeto inteiro e pela frase do catálogo; o sistema a põe quando a IA classificou tudo como "não atende". Objeto do ramo com "não atende" em tudo é recusado, com o que cabe no catálogo: o que pede serviço e tem termo de serviço do catálogo ("Manutenção preventiva e corretiva de autoclaves hospitalares") e o que pede serviço (calibração, manutenção, qualificação, validação, inspeção, monitoramento, aferição, ensaio, reparo, assistência técnica, engenharia clínica) sobre equipamento, instrumento, esterilização, CME, material médico-hospitalar ou odontológico, laboratório, câmara ou registrador. A trava automática "tudo fora do catálogo" fica só para objeto que não pede serviço (compra, obra, despacho, locação...). Com algum item que a IA classificou como alto ou médio, a trava "tudo fora do catálogo" não vale (vira pendência). Grau alto ou médio também não vale com trecho de compra do equipamento ("o fornecimento de 03 monitores") nem com trecho que só nomeia o equipamento quando o objeto não pede serviço (lista de produtos); objeto que começa como compra ganha a pendência "o serviço provado pode ser só acessório da compra".

Rede de segurança: perto do trecho (o parágrafo inteiro dele, desde a última linha em branco, e o parágrafo seguinte), o sistema procura palavras de negação ou de exceção ("não", "exceto", "dispensado", "facultativo", "alternativamente", "opcional", "subcontratar", "rastreável", "poderá", "aceito"...; "não-obrigatoriedade" conta, o hífen separa as palavras). Na trava, isso aparece como alerta de exceção para quem vai confirmar. Fato ou exigência que diga que o edital exige algo impeditivo (RBC, acreditação, ISO 17025, registro, atestado, Inmetro), com negação ou exceção perto, não vale como prova: vira a pendência "Confirmar no edital: há negação ou exceção perto do trecho ...", com o trecho e a palavra encontrada. Só no texto que foi enviado à IA, também valem: a numeração de cláusula que abre a linha e que a IA tirou ("1.3.1."); o rótulo que a IA pôs na frente ("Item 1", "LOTE 02 ITEM 01 UND"), desde que o número dele seja o da fonte; reticências "(...)" entre pedaços da mesma frase (5 palavras ou mais cada, até 300 caracteres, sem ponto final nem negação no que foi pulado); e a quebra de página no meio da frase (só rodapé e cabeçalho repetidos entre os dois pedaços, 5 palavras ou mais de cada lado). Reticências e quebra de página não valem em capacidade técnica nem em trava. O que fica gravado como prova é sempre o texto do edital, recortado do arquivo (a quebra de página aparece como "[quebra de página]"), nunca o que a IA escreveu. Trecho longo é aceito até 1.200 caracteres (a tela mostra até 600). Quando o trecho não está lá, a nova tentativa recebe o pedaço da fonte mais parecido, ou a ref certa se o trecho estiver em outro arquivo (nas primeiras 15 recusas de cada resposta). Os números calculados pelo sistema também podem ser citados, só em afirmação, com a ref SISTEMA. Cada fonte vai para a IA entre marcadores sorteados a cada análise, com a ordem de tratar o conteúdo como dado: instrução escrita dentro do edital é ignorada. Número ou citação no resumo e nas justificativas tem de estar nas fontes ou nos cálculos do sistema (com tolerância de arredondamento: "R$ 8,4 mil" para R$ 8.431,44 passa; anos, dias de datas e números menores que 10 não são conferidos; número inventado é recusado). Se a triagem por regras travou a oportunidade, a IA tem de provar a trava ou deixar a pendência "trava". Trecho que não está lá, fonte inexistente, pontos fora do peso, código de risco ou trava fora da lista, frase de decisão ("recomendo participar"), afirmação de acreditação RBC, fabricante citado, emoji ou markdown fazem a resposta ser recusada e refeita (até 2 vezes, com os problemas apontados). Recusada de novo, fica registrada como "recusada pelo verificador" e a nota anterior continua valendo. A tela diz em linguagem simples o que faltou e o que fazer (por exemplo: os arquivos do edital ainda não foram baixados porque o PNCP estava fora do ar; tente de novo depois que os arquivos chegarem). O detalhe técnico fica recolhido em "Ver o motivo técnico", e a resposta crua da IA de cada tentativa (até 24 mil caracteres cada; se não couber na célula, a mais antiga é cortada primeiro) fica guardada na análise (coluna RESPOSTAS_IA_JSON) e aparece em "Ver respostas da IA". Só a Diretoria e o Administrador veem.

O que vai para a IA: o verificador confere contra o texto inteiro dos arquivos, mas o pedido à IA leva até 140 mil caracteres, escolhidos por página: termo de referência, edital e aviso primeiro; páginas com itens, especificação, habilitação, qualificação técnica, RBC e Inmetro, garantia, multa, prazo de atendimento, peças, pagamento e registro de preços sobem; página repetida (o mesmo termo de referência em dois arquivos ou dentro do .zip) vai uma vez só; minuta de contrato e modelos de declaração e de proposta ficam por último. Página que não coube aparece para a IA como "[... página(s) não enviada(s) à IA ...]", e ela escreve pendência se faltar algo. A IA responde em JSON, com raciocínio limitado e trechos curtos, para caber no tempo da chamada (120 s).

Quando roda: sozinha, quando chegam arquivos novos ou mudados ou a fonte tem versão nova, só nas oportunidades no radar ou em análise com prazo aberto, e só se a base mudou (assim não gasta à toa). "Analisar agora" faz a primeira; "Refazer análise" pede o motivo (pelo menos 10 letras). Leva de 1 a 3 minutos.

Fila da análise automática (03/11/2026): cada oportunidade elegível cuja base mudou entra na fila (a mesma versão dos arquivos e da fonte não entra duas vezes); a cada 30 minutos o sistema também põe na fila as elegíveis ainda sem análise em dia (nunca analisadas, com o último erro da IA, ou com arquivos mais novos que a análise). A rotina da fila analisa até 2 por execução (cada análise leva de 1 a 2 minutos e a execução tem 5), na ordem: (1) fim das propostas em até 72 horas, qualquer UF; (2) UF prioritária (GO, DF, vizinhos e RJ); (3) as demais; em cada grupo, o prazo de propostas mais próximo primeiro. A aba Análise mostra "Na fila de análise (posição N de M)"; o Hoje e o Painel mostram quantas estão na fila. Erro da IA conta tentativa: a oportunidade volta à fila e tenta de novo em 1 hora e depois em 6 horas; na terceira falha da mesma versão sai da fila com "Análise automática falhou — use Analisar agora" (fica no histórico). Recusa do verificador não é refeita sozinha. Sem a chave da IA a fila fica parada e nada é agendado; cadastrada a chave, ela retoma sozinha.

Proteções da fila (revisão de 03/11/2026): cada rodada cabe nos 5 minutos da execução (nenhuma chamada nova à IA depois de 140 s do início da rodada; a segunda análise só começa se a primeira levou menos de 40 s). Uma rodada por vez. "Analisar agora" e a fila usam a mesma reserva: nunca duas análises da mesma oportunidade ao mesmo tempo (a ficha diz "já está sendo analisada agora"). Limite de uso da IA (HTTP 429) não conta tentativa: espera 30 minutos. Chave da IA recusada também não conta: a fila fica pausada, com a faixa vermelha no Hoje e o aviso na ficha, até a chave ser trocada (retoma sozinha; no máximo 24 h e tenta de novo). Teto de análises automáticas por dia: padrão 150, em Portais e configurações › Leitura do edital, com o motivo e a versão (LIC_CONFIG, chave FILA_ANALISE); passou dele, as outras ficam na fila para o dia seguinte. "Analisar agora" não conta no teto.

Sem a chave da IA: nada é calculado nem inventado; a tela diz "análise por IA indisponível: falta a chave" e o botão fica desligado. O Administrador cadastra a chave GEMINI_API_KEY em Administração > Chaves e senhas (o modelo é o de IA_MODEL, o mesmo do restante do SGO+).

Versões: cada análise é uma linha nova em LIC_ANALISES (versão, data, quem pediu, motivo, modelo, a base analisada, os arquivos com o SHA-256 e o hash da própria análise). "Todas as versões da análise" mostra as anteriores.

### 6.6.1 Leitura especialista do edital (aba Leitura do edital da ficha)

Pedido do dono (02/11/2026): uma IA que resuma o edital e diga o que realmente precisamos, com palavras-chave da Diretoria, sem inventar e sem só passar o olho: lendo linha por linha, como um especialista, e depois passando a estratégia. Só Diretoria e Administrador.

**Palavras-chave.** Há duas listas: as gerais da Diretoria (Portais e configurações > Leitura do edital; valem para todas as oportunidades) e as desta oportunidade ("Editar as palavras desta oportunidade"). Uma por linha; acento e maiúscula não contam; o plural simples entra sozinho ("atestado" acha "atestados"; "calibração" acha "calibrações"); "*" no fim procura o começo da palavra (calibr*). Motivo obrigatório; cada salvamento vira versão nova; se outra pessoa salvou antes, só o que você tirou e pôs é aplicado sobre a lista de agora (nada se perde). A busca é feita pelo SISTEMA, não pela IA: em todas as páginas de todos os arquivos com texto, com a palavra partida no fim da linha do PDF ("pri-" e "vado") juntada. Cada ocorrência mostra o arquivo, a página, a linha e a frase, com a palavra marcada. Palavra que não aparece: "não encontrada em nenhuma das N páginas", e os arquivos sem texto legível (escaneados) aparecem como não procurados.

**Ler edital inteiro.** A IA lê TODAS as páginas de todos os arquivos com texto, sem o corte de 140 mil caracteres da nota. Cada arquivo é dividido em blocos de páginas inteiras (até 8 mil caracteres e 6 páginas: na prova real de 02/11/2026, blocos de 16 mil deram 60 a 70 itens, acima do limite de 40, e foram recusados inteiros); cada bloco vai sozinho à IA, que aponta, nos temas da lista fixa (habilitação jurídica, fiscal e econômica, qualificação técnica, atestado, equipe e responsável técnico, visita técnica, amostra, prazo de execução e entrega, garantia, penalidade e multa, RBC/acreditação/Inmetro, pagamento, subcontratação, consórcio, registro de preços e quantidade, outro), o TRECHO do edital de cada exigência. Decisão do coordenador (02/11/2026): o item É o trecho literal do edital. A IA devolve só o tema e o trecho (o rótulo foi retirado na reconferência de 02/11/2026: rótulo enganoso, como "visita técnica obrigatória" sobre "não será exigida", era outra forma de inverter o sentido). O SISTEMA estende o que é mostrado e guardado como prova até a FRASE INTEIRA da fonte: do começo da oração ou da frase até o fim dela (. ; : de fim, quebra de parágrafo ou item numerado), no máximo 600 caracteres, com "…" quando corta pelo limite, e marca dentro dela o pedaço que a IA citou. Assim, "A vistoria técnica é obrigatória" aparece como "A vistoria técnica é obrigatória, podendo ser substituída por declaração formal...". Frase cortada pelo limite de 600 caracteres vira Pendência "frase longa: leia o restante no edital" (a rede olha até o fim real da frase). O tema é conferido por palavras mínimas específicas na frase (por exemplo, qualificação técnica: "qualificação técnica", "capacidade técnica", "responsável técnico", "acervo técnico", "CAT"; RBC e Inmetro: "acreditação", "RBC", "17025", "Inmetro", "rastreável"; "técnica", "calibração" ou "registro" soltos não bastam); sem elas, o item vai para "Tema a confirmar".

O MESMO verificador da nota confere cada trecho: tem de estar DENTRO do bloco que a IA recebeu, palavra por palavra (número com o separador entre dígitos, "0,2%" não é "2%"); trecho que corta uma negação ("admitida a participação" quando o edital diz "Não será admitida a participação") é recusado. Formulário de marcar ("( ) Sim ( ) Não (X) Dispensa", também com colchetes): cada opção é uma oração; o trecho de uma opção MARCADA não é recusado pela negação de uma opção vizinha não marcada (o rótulo da própria opção marcada continua valendo: "( ) Sim (X) Não — exige..." e "(X) Dispensada a..." são recusados; o enunciado antes das caixas continua valendo, a resposta marcada "(X) Não" logo depois do trecho recusa, e o trecho de opção não marcada segue a regra de sempre). A página e a linha são calculadas pelo sistema (posição do trecho no arquivo), nunca pela IA. Rede de segurança em todos os temas: negação ou exceção perto do trecho (na frase e na seguinte; no item impeditivo, como RBC, acreditação, registro, atestado e Inmetro, na página e na seguinte) faz do item uma Pendência "Confirmar no edital"; a rede sobe pelos cabeçalhos das cláusulas-mãe (no 8.2.2, os cabeçalhos do 8.2 e do 8; na alínea, o da cláusula dela): cabeçalho com negação, exceção ou dispensa ("8.2. Não serão exigidos os seguintes documentos:") faz do item uma Pendência que mostra a frase do cabeçalho; o mesmo vale para lista com marcadores (•, –, *, alínea) sob um cabeçalho que termina em ":" ("Não serão exigidos os documentos a seguir:"), subindo só pelos itens da mesma lista; procura no texto inteiro do arquivo e nos outros arquivos da oportunidade uma errata sobre a cláusula do trecho (o número dela perto de revogado, excluído, suprimido, alterado, nova redação, errata ou retificado), que também vira Pendência com a frase da errata; olha também os subitens filhos da cláusula do trecho (o 8.3.1 sob o 8.3, as alíneas a) e b) sob o item) e para na cláusula irmã ou acima (8.4, 9.); além das palavras da nota, contam "podendo", "poderá ser substituída", "substituir", "desde que", "caso", "quando", "ou declaração" e "facultado". Resposta recusada é refeita até 2 vezes com os problemas apontados.

**Progresso e retomada.** A leitura segue em segundo plano (pode fechar a tela): na tela, a IA lê os primeiros blocos; o resto fica com a rotina do servidor, que continua a cada minuto até acabar ("Lendo bloco 7 de 23"). "Continuar agora" lê os próximos blocos na hora. Bloco com o mesmo texto de outro (o mesmo termo de referência em dois arquivos) é lido uma vez só. Na leitura nova (arquivos ou palavras-chave mudaram, ou "Refazer"), os blocos com o mesmo texto, as mesmas regras e as mesmas palavras-chave de uma leitura anterior são aproveitados: cada trecho é reencontrado no arquivo atual, com o arquivo (pelo SHA-256), a página e a linha de agora; só o que mudou vai à IA. Palavra-chave nova deixa a leitura desatualizada ("Ler a versão nova"), para a IA procurá-la em cada bloco. Se o servidor não entregar o texto agora (falha passageira), a leitura para e os blocos esperam na fila; sem a chave da IA, a rotina não roda até a chave voltar (abrir a tela retoma).

**Cobertura.** Por arquivo: páginas com texto lidas / total com texto, blocos lidos e o que ficou de fora. Página só com cabeçalho e rodapé (as primeiras e últimas linhas que se repetem em 3 páginas ou mais) conta à parte, como "sem texto (provável imagem)"; uma tabela de itens com linhas iguais continua sendo texto. Com página ou arquivo sem texto, a leitura fica "Concluída com páginas para ler à mão". Bloco não lido (a IA não respondeu duas vezes, recusou por conteúdo, ou a resposta foi recusada pelo verificador 3 vezes) aparece com o motivo e o botão "Ler de novo os blocos não lidos". Arquivo sem texto legível aparece para ler à mão. Arquivo maior que o corte do servidor (400 mil caracteres) é lido inteiro, em pedaços; se o servidor não entregar o resto, o arquivo aparece como "não lido inteiro", a leitura fica "Concluída com partes não lidas" e a busca das palavras-chave avisa que a palavra pode estar no resto.

**O que realmente precisamos.** Montado pelo sistema com os trechos conferidos: agrupado por tema, sem trecho repetido (o mesmo trecho, ou um trecho dentro do outro) e com todas as fontes (arquivo, página, linha, SHA-256). A tela mostra o nome do tema e, em destaque, a FRASE DO EDITAL com o pedaço citado marcado, o arquivo e a página. A IA do resumo recebe só o tema e a frase. Item marcado "Pendência" tem negação ou exceção perto: confirme no edital antes de contar como exigência.

**Resumo do edital e Estratégia sugerida.** No fim, a IA escreve o resumo e a estratégia sugerida (o que fazer primeiro, riscos, documentos a providenciar e perguntas de esclarecimento ao órgão). A tela mostra os dois sob o título "Sugestão da IA — confira nos trechos" e, junto de cada frase, os trechos dos itens citados ("Trechos citados", para abrir). Toda frase cita pelo menos um item (I1, I2...; campo do PNCP, prazo da agenda e cobertura vão junto). O prazo para pedir esclarecimento vem da agenda (calculado ou confirmado pelo sistema), nunca da IA. O verificador recusa a resposta com número (com a unidade, inclusive úteis ou corridos e "mil") ou data que não estejam inteiros em UMA das fontes citadas, fonte que não existe, frase de decisão ("vale a pena participar"), RBC sem dizer como tratar (a Metrolabs é rastreável, não acreditada), Inmetro fora de balanças e esfigmomanômetros e fabricante. Além disso, o sentido de cada frase é conferido contra os trechos dos itens citados: negação (cada "não" do trecho exige um "não" na frase; "não será inferior a" vale como "no mínimo"), exceção, limite com a direção por número (até e no máximo; no mínimo, pelo menos e a partir de; apenas e somente) e exigido ou permitido com a mesma polaridade ("não é vedada" não é "é vedada"). Frase reprovada em qualquer conferência (número, data, item citado, decisão, RBC, sentido) é retirada da tela e listada em "Frases retiradas pelo verificador", com o motivo; as outras são publicadas: a consolidação só é recusada inteira quando nenhuma frase passa (prova real de 02/11/2026). As referências escritas no texto ("(I9, I23)") não contam como número, desde que existam na lista de itens e não venham coladas a %, dígito ou unidade ("I30%", "I45 dias" ou um item que não existe retiram a frase: "referência mal escrita"). O checklist é gravado uma linha por item (aba LIC_LEITURA_CHECKLIST), sem limite; se o que foi gravado não se lê inteiro, a tela diz "Checklist ilegível — refaça a leitura", nunca "nenhuma exigência". A estratégia é sempre sugestão: participar ou descartar é da Diretoria. Recusado, o checklist continua valendo e "Refazer resumo e estratégia" (com motivo) tenta de novo sem reler os blocos.

**Versões.** Cada leitura é uma versão (pela base dos arquivos e das regras). "Ler edital inteiro" na mesma base é recusado: use "Refazer" com o motivo (marque "Ler de novo também os blocos já lidos" se desconfiar da leitura). Arquivos mudaram: "Ler a versão nova". Pedido, conclusão, refação, blocos lidos de novo e recusas ficam no histórico com quem, quando, a versão, os arquivos (SHA-256) e o hash.

**Sem a chave da IA:** a busca das palavras-chave continua (é do sistema); "Ler edital inteiro" fica desligado e a tela diz "leitura pela IA indisponível: falta a chave".

**Leitura automática (opcional).** Portais e configurações > Leitura do edital > "Ler sozinho o edital das candidatas" (desligado no padrão, com motivo e versão): quando os arquivos de uma candidata no prazo chegam ou mudam, a rotina do servidor põe a leitura na fila.

### 6.7 Agenda e prazos

A agenda nasce sozinha da fonte: quando uma oportunidade entra no radar (ou quando a fonte muda), o SGO+ monta os prazos dela e cada prazo diz de onde veio e qual é a natureza da data.

| Natureza | O que é | Exemplos | Gera alerta? |
|---|---|---|---|
| CONFIRMADO | Veio da fonte, ou uma pessoa conferiu no edital | Início do recebimento e fim do envio das propostas (dataAberturaProposta e dataEncerramentoProposta do PNCP) | Sim |
| CALCULADO | Regra legal sobre a data da fonte. É sempre um cálculo, marcado como tal, com a regra escrita | Impugnação e esclarecimento: 3 dias úteis antes da abertura (Lei 14.133/2021, art. 164); impugnação em estatal: 5 dias úteis (Lei 13.303/2016, art. 87, § 1º); razões de recurso: 3 dias úteis da ata (art. 165) ou 5 (Lei 13.303, art. 59) | Sim, a partir do limite interno |
| PREVISTO (pendente de confirmação) | Depende do edital ou de ato do pregoeiro | Sessão fora do Compras.gov.br (a fonte não informa a hora); esclarecimento de estatal (regulamento próprio); regime jurídico sem amparo da 14.133 ou da 13.303; data da fonte incoerente (abertura e encerramento com menos de 1 hora entre eles) | Não, até alguém confirmar |

Regras do cálculo (art. 183): exclui o dia do começo e inclui o do vencimento.

- Prazo contado para trás (impugnação, esclarecimento): não contam sábado, domingo, feriado nacional, Carnaval, Sexta-feira Santa, Corpus Christi e os feriados cadastrados no SGO+. O limite interno dos alertas fica 1 dia útil antes, às 17:00, porque feriado municipal e ponto facultativo do órgão não chegam por API.
- Prazo contado para frente (recurso): só os feriados nacionais fixos, para o limite mostrado nunca passar do limite real.
- Exemplo real: abertura em 04/11/2026 (quarta). 03/11 é o 1º dia útil antes, 02/11 é Finados (não conta), 30/10 é o 2º e 29/10 é o 3º: impugnação até 29/10/2026; limite interno 28/10/2026 17:00.
- No Compras.gov.br a proposta vai até a abertura da sessão (IN SEGES/ME 73/2022, art. 18): o prazo aparece como "Fim do envio das propostas e abertura da sessão". Dispensa e inexigibilidade não têm impugnação.

Tela "Agenda e prazos" (menu Licitações):

- Período: Hoje, 7 dias, 30 dias ou Tudo. Filtros: prioridade, situação da data (pendentes), onde é a sessão, mostrar as travadas.
- Números: prazos no período, críticos, pendentes de confirmação, suspensos ou cancelados. Linha "Próximo prazo".
- Um bloco por dia, com o aviso do feriado ("não conta como dia útil nos cálculos"). Cada prazo: hora e fuso (Brasília, presumido quando a fonte não informa), nome, órgão, código, selos de natureza e nível, a fonte, a regra do cálculo, o limite interno, o motivo de uma mudança e os alertas (programados, próximo, enviados, sem ciência).
- Prazo suspenso ou cancelado aparece riscado, com o motivo. A data antiga de um prazo retificado fica na ficha.
- "Confirmar data" (prazo pendente) e "Conferir no edital" (confirmado com fuso presumido): data, hora ou dia todo, fuso e onde conferiu (obrigatório). Data diferente cria a versão nova do prazo e os alertas passam a seguir a nova; mesma data só registra a conferência.
- No fim, "Prazos sem data (pendentes de confirmação)".

Ficha da licitação, aba Prazos: todos os prazos com a fonte e a natureza, os alertas de cada prazo (com os estados e o botão "Ciente"), os alertas de mudança, o botão "Informar a data da ata" (prazo de recurso) e as "Versões anteriores dos prazos", riscadas.

Retificação, suspensão, revogação e anulação:

- Data mudou na fonte: a linha do prazo nunca é alterada. Nasce a versão nova (com o motivo "de ... para ...") e a anterior fica como "Substituído por versão nova". Os alertas pendentes do prazo antigo são cancelados com o motivo e a Diretoria recebe o alerta "Prazo alterado na fonte".
- Data conferida por uma pessoa vale enquanto a data da fonte em que ela se baseou não mudar. Se a fonte mudar, o prazo volta a seguir a fonte e o motivo pede para conferir de novo.
- Suspensa na fonte: prazos suspensos, alertas pendentes cancelados com o motivo e alerta crítico "Licitação suspensa na fonte". Revogada ou anulada: prazos cancelados e alerta crítico. Quando a situação volta, os prazos voltam a valer e vem o alerta "Licitação reaberta na fonte".
- Licitação que já estava suspensa quando a agenda foi montada: os prazos aparecem suspensos, sem alerta de mudança.

### 6.8 Alertas de licitação e Central de alertas

Quem recebe: só a Diretoria de Licitações (decisão do dono, 02/11/2026: Charles e Thiago). Padrão: perfis Diretoria e Administrador ativos com a área Diretoria no cadastro de usuários; uma conta técnica de administrador, sem a área, não recebe. Com a lista de destinatários das Regras dos alertas preenchida (com versão e motivo), vale só ela. Nenhum nome ou número fica no código.

Fora do expediente: exceção aprovada pelo dono só para Licitações. Os alertas saem a qualquer hora, só para essas pessoas. Os demais avisos do SGO+ continuam com a matriz de avisos (expediente, vínculo, teto do dia).

De quais oportunidades: candidatas, em análise e as que avançaram. Nunca as descartadas nem as sem termo de interesse; as travadas só com a chave "Alertar também as travadas".

Quem recebe primeiro: o responsável da oportunidade (quem enviou para análise); sem responsável, o titular escolhido nas regras; sem titular, os dois.

Canais:

| Canal | Quando | Observação |
|---|---|---|
| Interno | Sempre | Central de alertas, faixa vermelha "alertas sem ciência" no Hoje e na Agenda, aba Prazos da ficha |
| E-mail | Ligado por pessoa | Sai por sistema@metrolabs.com.br, com o botão "Abrir a licitação no SGO+" (link ?aviso=, pede login) e o link "Confirmar ciência" |
| WhatsApp | Ligado por pessoa | Só o WhatsApp oficial (Meta), pelo modelo sgo_licitacao_prazo. Nunca WhatsApp Web nem outro provedor. Sem o modelo aprovado, a linha diz "WhatsApp aguardando aprovação do modelo na Meta" e o alerta vai pelo interno e pelo e-mail |

A mensagem do WhatsApp leva o nível, o órgão, o processo, o objeto resumido, o prazo, quando (com o fuso), o tempo restante e a ação necessária, o link para abrir no SGO+ e o botão "Confirmar ciência". O valor estimado não vai na mensagem.

Antecedências padrão (ajustáveis):

| Prazo | Antecedências e níveis |
|---|---|
| Fim do envio das propostas | 7 dias normal, 3 dias importante, 24 h importante, 4 h crítico, 1 h crítico |
| Abertura da sessão (quando confirmada) | 24 h importante, 4 h importante, 1 h crítico, 30 min crítico, 10 min crítico |
| Impugnação e esclarecimento (do limite interno) | 48 h normal, 24 h importante, 4 h importante |
| Razões de recurso (do limite interno) | 48 h importante, 24 h importante, 4 h crítico |
| Mudança na fonte | Retificação e reabertura: importante, para quem recebe primeiro. Suspensão, revogação e anulação: crítico, para os dois |

Antecedência que já tinha passado quando o prazo entrou na agenda não é enviada: sai só o aviso mais recente, e só para oportunidade que passou a poder ter alerta (virou candidata, entrou em análise ou foi reaberta) depois da implantação. A implantação é marcada pela rotina só quando a agenda inteira já está montada; oportunidade que já existia antes dela nunca manda aviso vencido (salvar as regras ou abrir uma ficha antes da primeira rodada não dispara atrasados).

Retificação: a versão nova do prazo herda os avisos já enviados (e a ciência) de cada antecedência, para a mesma pessoa: o de 7 dias não sai de novo. As mudanças de uma oportunidade vão juntas num alerta de mudança só. Prazo pendente de confirmação não gera alerta de mudança, nem recálculo que não muda nenhuma data.

Envio agrupado (03/11/2026, para não repetir mensagens quase iguais): na mesma rodada, os alertas devidos da mesma licitação para a mesma pessoa (prazos, mudanças, lembretes e escalonamentos) saem num e-mail só e numa mensagem só de WhatsApp. O assunto diz quantos são e a janela (por exemplo, "Licitação LIC-2026-0131: 3 prazos nos próximos 7 dias · órgão"); o e-mail começa dizendo quantos prazos e o mais urgente, e lista cada um com natureza, data e hora, limite interno, fonte e ação. O WhatsApp usa o mesmo modelo sgo_licitacao_prazo: {{5}} traz o resumo ("3 prazos: impugnação, esclarecimento e fim das propostas"), {{6}} e {{7}} a data e o tempo do mais próximo e {{8}} a ação dele. Um link de ciência só (e o botão e a resposta CIENTE do WhatsApp) registra a ciência de todos os alertas daquela mensagem, para os dois integrantes. Nada some do registro: cada alerta continua com a sua linha, situação e histórico (ALERTA_ENVIADO diz "numa mensagem só com" e o código do envio, ENVIO_GRUPO). A mensagem sai no nível do mais grave; com um crítico, sai na hora e fora do teto do dia. O escalonamento do grupo é um só, no tempo do nível mais grave: no máximo um lembrete por mensagem e por pessoa. Avisos de documento de habilitação continuam um por mensagem.

Nova oportunidade de alta aderência (03/11/2026, pedido da missão): quando uma análise CONCLUÍDA (automática, pedida, ou a nota acertada depois) dá nota maior ou igual ao limite das regras (padrão 70), sem trava (nem trava a confirmar, nem triagem travada), com a oportunidade no Radar (candidata) ou Em análise (nunca Proposta, Disputa, Resultado ou Contrato) e o fim das propostas em aberto, sai UM alerta do tipo ALTA_ADERENCIA. "Não é trava" que deixa a nota alta também gera o alerta; a triagem do radar que deixa de travar também (a nota alta fica guardada com ALTA_ADERENCIA_ESPERA = TRIAGEM e a rotina dos alertas, no passo programar, avalia de novo sem refazer a análise). Sem rajada (revisão de 7401585): o importante sai só das 08:00 às 18:00, horário de Brasília, em dia útil; fora disso fica guardado para a primeira rodada do expediente (LIBERAR_EM) e não escalona à noite nem no fim de semana. Teto próprio: no máximo 5 alertas de alta aderência por pessoa no dia em mensagem própria (lembretes contam); o crítico sai na hora, mas no máximo 5 por pessoa na mesma rodada. O que passa fica "No resumo do dia" e vai num e-mail só, "N oportunidades de alta aderência (resumo)", sem WhatsApp, com órgão, nota, objeto, valor, fim das propostas, link de ciência e link da ficha de cada uma; continua pendente de ciência na Central (histórico ALERTA_TETO). Nível importante, para quem recebe primeiro (o responsável; sem ele, o titular das regras; sem titular, os dois); crítico, para os dois, com o fim das propostas em até 72 horas. Segue a mesma fila: entra no envio agrupado com os prazos da mesma licitação (vem primeiro na lista; o "mais urgente" continua sendo o prazo), conta nos tetos, tem lembrete, escalonamento e ciência (a de um vale para os dois). O e-mail traz órgão, UF, processo, objeto resumido, valor estimado, fim das propostas com a natureza e a fonte, nota e classe (análise e versão), os 2 ou 3 critérios mais fortes calculados pelo sistema (pontos sobre o peso: localização, prazo, valor, margem e documentação pela habilitação; nunca capacidade, documentação da IA nem riscos) e o link da ficha, que abre na aba Análise. WhatsApp pelo mesmo modelo sgo_licitacao_prazo: {{5}} "Oportunidade com nota 78 (alta aderência)", {{6}} e {{7}} o fim das propostas e o tempo restante, {{8}} a classe, os critérios mais fortes e a ação (até 200 caracteres); o valor não vai no WhatsApp. Uma vez por subida da nota (LIC_OPORTUNIDADES, ALTA_ADERENCIA_ESTADO, _CICLO, _EM e _NOTA): reanálise com a nota ainda alta não repete; a queda só conta com a nota abaixo do limite menos 5 (com 70, abaixo de 65) ou com trava: nada é enviado e o histórico registra ALTA_ADERENCIA_CAIU; se ela voltar a ficar alta, sai um alerta "a nota voltou a ficar alta", no máximo um por oportunidade em 7 dias. Os critérios mais fortes deixam de fora os marcados como pendência (sem simulação de preço, valor não informado, a conferir). Prazo encerrado ou descarte não contam como queda. Se a nota cair (ou o limite subir) antes de o alerta sair, ele é cancelado com o motivo. Histórico: ALERTA_ALTA_ADERENCIA com a nota, o limite, o nível, quem recebe e a versão da análise e das regras.

Tetos: no máximo 3 mensagens por pessoa em cada alerta (o original, o reenvio e o escalonamento somados) e 30 mensagens de licitação por pessoa no dia (ajustáveis; a mensagem com vários prazos conta uma vez). O alerta crítico não entra no teto do dia. Os normais e importantes que passam do teto do dia vão juntos num resumo por e-mail (sem WhatsApp), ficam como "No resumo do dia" e continuam pendentes de ciência na faixa e na Central. O que o teto por alerta segura fica como "Não enviado", com o motivo; os dois casos ficam no histórico (ALERTA_TETO).

Se a agenda de uma oportunidade der erro, ela fica de fora daquela rodada e as demais seguem; a situação da rotina, na Central de alertas, mostra a oportunidade com erro e, enquanto a implantação não foi marcada, "Implantação dos alertas aguardando a agenda inteira".

Estados de cada alerta (Central de alertas):

| Nº | Estado | Como chega lá |
|---|---|---|
| 1 | Criado | Programado com a hora de sair |
| 2 | Enviado ao provedor | O SGO+ entregou o e-mail ou a mensagem ao provedor |
| 3 | Aceito pelo provedor | A Meta devolveu o id da mensagem ("Aceito pela Meta"); o e-mail entrou na fila de envio |
| 4 | Entregue | Só pelo retorno de status da Meta (delivered) |
| 5 | Lido | Só pelo retorno de status da Meta (read) |
| 6 | Ciência | "Ciente" na tela, botão "Confirmar ciência" do WhatsApp, link do e-mail ou resposta CIENTE à mensagem (só a palavra CIENTE; "ok" ou outra frase não vale) |
| 7 | Em atendimento | A pessoa abriu a licitação pelo link do alerta |
| 8 | Concluído | O prazo passou com a ciência registrada |
| 9 | Falha | Com o motivo e o canal alternativo usado |
| 10 | Escalonado | Sem ciência no tempo do nível |

A ciência registra que a pessoa viu o alerta; ela não conclui a tarefa. A ciência de um integrante encerra a cobrança daquele alerta para os dois.

Escalonamento (uma vez por alerta, só o de quem recebeu primeiro; reenvio e escalonamento nunca escalonam de novo; oportunidade descartada ou prazo vencido param o escalonamento): sem ciência em 60 min (normal), 15 min (importante) ou 5 min (crítico), o alerta vai para o outro integrante, por e-mail e WhatsApp, e é reenviado a quem recebeu primeiro pelo outro canal. Se os dois receberam juntos (sem titular, ou mudança crítica), o escalonamento é só o reenvio por outro canal. Se nenhum canal saiu, escalona na hora. Depois que o prazo passa, o escalonamento para. A rotina roda a cada 5 minutos: o envio e o escalonamento saem até 5 minutos depois da hora marcada.

Falha e canal alternativo: se o canal escolhido não sai (sem celular, sem modelo aprovado, retido pelo piloto, erro da Meta ou do e-mail), o SGO+ usa o outro canal e registra ("WhatsApp não saiu: e-mail enviado como canal alternativo"). Se a Meta devolver falha depois (retorno failed), o e-mail sai na hora, se ainda não tinha saído e se a ciência ainda não foi registrada nem o prazo passou.

Central de alertas (menu Licitações): faixas com a situação do modelo na Meta, do último retorno de status e da rotina; quem recebe; partes Sem ciência, Programados, Enviados, Falhas e canal alternativo, Cancelados e Todos. Cada alerta mostra o nível, a situação, para quem, a antecedência, os estados de 1 a 10 com a hora, o que cada canal fez, a ciência (de quem, quando e por onde), o escalonamento e o motivo do cancelamento; botões "Ciente", "Reenviar" e "Abrir a licitação".

Página do botão "Confirmar ciência" (sem login): mostra só o primeiro nome, o prazo e o código LIC, e o botão para confirmar. O link vale só para aquele alerta e por 30 dias.

### 6.9 Regras dos alertas (Portais e configurações)

| Campo | Regra |
|---|---|
| Alertas de licitação ligados | Desligado: nada é programado nem enviado; os programados são cancelados com o motivo |
| Alertar também as travadas | Padrão desligado |
| Quem recebe e por onde | Só Diretoria e Administrador ativos; padrão: os da área Diretoria; "Na lista de destinatários" (lista explícita) manda quando marcada; por pessoa: recebe, e-mail, WhatsApp. Com os alertas ligados, pelo menos uma pessoa precisa receber |
| Tetos | Mensagens por pessoa em cada alerta (1 a 10, padrão 3) e por pessoa no dia (1 a 200, padrão 30) |
| Quem recebe primeiro sem responsável | Uma pessoa ou os dois |
| Canais para todos | E-mail e WhatsApp oficial |
| Escalonamento (min) | De 1 a 1.440 por nível |
| Antecedências | "7d normal, 3d importante, 24h importante, 4h crítico, 1h crítico"; até 8 por prazo, de 1 minuto a 30 dias, sem repetir |
| Mudanças na fonte | Nível de cada tipo de mudança |
| Nova oportunidade de alta aderência | Ligado (padrão) e a nota mínima, inteira de 50 a 100 (padrão 70); com versão, motivo e histórico (de, para) |

O motivo é obrigatório. Cada salvamento vira versão nova; só o que mudou é gravado (o resto fica como estava, por merge) e cada mudança vai para o histórico (de, para). Os alertas programados passam a seguir a regra nova e os que saem dela são cancelados com o motivo.

### 6.10 Kanban

Uma coluna por etapa, na ordem do pedido do dono: Radar, Em análise, Decisão, Proposta, Disputa, Resultado e Contrato.

| Coluna | O que entra |
|---|---|
| Radar | Candidatas e travadas da triagem por regras, sem decisão da Diretoria |
| Em análise | As enviadas para análise (arquivos do edital e nota da IA na ficha) |
| Decisão | As descartadas pela Diretoria, com o motivo. "Participar" entra aqui quando a etapa de preços e proposta chegar |
| Proposta | Vazia: chega na etapa de preços e proposta (tabela de preços de licitação, simulador e proposta em A4) |
| Disputa | As licitações com a disputa aberta na Central de disputas (aba Disputa da ficha) |
| Resultado | As licitações com o resultado de todos os itens registrado ("Concluir o resultado") |
| Contrato | As licitações com o contrato registrado (aba Contrato da ficha e tela Contratos) |

As descartadas só pela regra do radar ficam fora do quadro (Oportunidades › Descartadas); o quadro diz quantas são.

Cartão: órgão, objeto resumido, código LIC, cidade e UF, fim das propostas com o selo de tempo, nota da IA e a classe (ou "Sem nota da IA"), responsável, selos "Trava a confirmar", "Travada (decisão da Diretoria)", "Suspensa na fonte" e, na Decisão, quem descartou, quando e o motivo. Borda vermelha: menos de 2 dias ou trava a confirmar; amarela: menos de 5 dias ou travada; cinza: descartada.

Filtros (feitos no servidor): busca, UF (ou a prioridade GO, DF, vizinhos e RJ), nota (alta, média, baixa, descarte, trava a confirmar, sem nota), prazo das propostas (7 ou 30 dias contados por dia de calendário em Brasília, de hoje em diante, como a Agenda; encerrado; sem data), responsável, situação (todas ou só em andamento, sem as descartadas) e análise por IA (situação da última análise: concluída, recusada pelo verificador, erro da IA). Oportunidade com situação que não é etapa do Kanban não some: o quadro diz quantas ficaram fora. Dentro da coluna, o prazo mais perto vem primeiro; cada coluna mostra até 120 cartões (os demais pelos filtros).

Mudar de etapa: arrastar o cartão (computador) ou "Mover para" (qualquer aparelho). Só as passagens que já existem:

| De | Para | O que acontece |
|---|---|---|
| Radar | Em análise | Enviar para análise (você fica como responsável; o servidor lê os arquivos do edital) |
| Radar ou Em análise | Decisão | Descartar (decisão da Diretoria; os alertas pendentes são cancelados) |
| Decisão (descartada) | Radar | Reabrir (a regra do radar não descarta de novo) |
| Disputa | Resultado | Concluir o resultado (só com o resultado de todos os itens registrado na aba Disputa, com a fonte) |
| Resultado | Contrato | Explica e abre a aba Contrato da ficha: o contrato é registrado lá (com o motivo), e a licitação vai para Contrato ao gravar |

O motivo é obrigatório em todas (pelo menos 10 letras) e vai para o histórico da ficha com quem, quando, de → para e a fonte "Kanban". As outras passagens ficam desabilitadas com o porquê escrito embaixo do botão (Em análise não volta direto ao Radar: descarte e reabra; Proposta chega na próxima etapa; o Contrato é registrado na aba Contrato da ficha; a entrada em Disputa é pela aba Disputa da ficha, que pede a proposta emitida e o piso de cada item, e o botão "Abrir a ficha" leva até lá; "Participar" exige o preço mínimo aprovado). Soltar numa coluna travada abre a janela com o porquê e "Nada foi alterado". Se outra pessoa mudou a oportunidade enquanto o quadro estava aberto, a mudança é recusada com "alguém mudou agora há pouco" e nada é alterado.

No celular (390 px), o quadro vira uma lista por etapa: as abas no alto (com a quantidade de cada uma) escolhem a etapa; a página não rola para os lados.

### 6.11 Gantt

Os prazos da Agenda (LIC_EVENTOS) no tempo. Cada linha é uma licitação em andamento (as descartadas não entram; as travadas aparecem marcadas). A barra clara é o recebimento das propostas (do início ao fim). Os símbolos são os prazos: círculo, fim das propostas; quadrado, sessão pública; losango, impugnação; triângulo, esclarecimento; triângulo invertido, recurso; traço, início das propostas.

| Aparência | Natureza |
|---|---|
| Símbolo cheio | Confirmado (veio da fonte ou foi conferido por pessoa) |
| Símbolo vazado | Calculado pela regra legal |
| Símbolo tracejado | Pendente de confirmação |
| Riscado | Suspenso na fonte |
| Apagado | Já passou |

A linha azul escura marca agora (Brasília). Fim de semana fica cinza claro; feriado nacional, amarelado. Zoom: Semana (9 dias, a partir de ontem) ou Mês (35 dias, a partir de 3 dias atrás); "Anterior", "Hoje" e "Próximo" andam a janela. Filtros: UF, etapa (Radar, só as travadas, Em análise, Decisão) e natureza da data. Versões substituídas e prazos cancelados não aparecem (ficam na ficha, aba Prazos). Os prazos sem data ficam na lista "prazos sem data" acima do gráfico. Licitação que só está recebendo propostas, sem nenhum prazo dentro da janela, não vira linha: a tela diz quantas são, e elas aparecem quando a janela chegar ao prazo. Tocar na linha abre a ficha na aba Prazos. Até 150 linhas, com o prazo mais perto primeiro.

No celular, o gráfico vira uma linha do tempo vertical, dia a dia, com a marca "agora". No computador, a mesma lista fica em "Ver os mesmos prazos em lista" (também para leitor de tela).

### 6.12 Painel (Dashboard)

Números contados na hora em que a tela abre, cada um com a fonte (aba e regra da contagem) e o clique para a lista que o compõe.

| Indicador | Fonte | Abre |
|---|---|---|
| Em andamento, oportunidades por etapa | LIC_OPORTUNIDADES, SITUACAO (as descartadas só pela regra ficam fora do Kanban e são contadas à parte; o número delas abre Oportunidades › Descartadas filtrada em "Só a regra do radar") | Kanban (na etapa; "Em andamento" abre só as em andamento) |
| Em andamento por UF | LIC_OPORTUNIDADES, UF; primeiro a prioridade: GO e DF, vizinhos de GO (MG, BA, TO, MT, MS) e RJ, mesmo em zero; só as em andamento | Kanban filtrado pela UF, só em andamento |
| Distribuição das notas | NOTA, NOTA_CLASSE e TRAVAS_A_CONFIRMAR: alta (75 a 100), média (50 a 74), baixa (30 a 49), descarte, trava a confirmar, sem nota; só as em andamento | Kanban filtrado pela nota, só em andamento |
| Prazos nos próximos 7 e 30 dias, críticos, pendentes | LIC_EVENTOS, com a mesma regra da Agenda (sem versões substituídas, sem descartadas e sem travadas): o número bate com a lista. "Pendentes de confirmação" soma os da janela e os sem data não cancelados, como o contador da Agenda | Agenda no período; cada barra "por tipo" abre a Agenda dos 7 dias filtrada por aquele tipo de prazo (filtro "Tipo de prazo") |
| Alertas sem ciência | LIC_ALERTAS, a mesma regra da Central de alertas | Central de alertas, "Sem ciência" |
| Alta aderência (24 h e 7 dias) | LIC_ALERTAS, tipo ALTA_ADERENCIA criado no período (uma por oportunidade; lembrete e escalonamento não contam), cruzado com LIC_OPORTUNIDADES: só as que continuam com nota maior ou igual ao limite, sem trava, com o prazo em aberto e não descartadas (a mesma conta do Hoje) | Oportunidades filtrada pela mesma conta, de todas as partes |
| Travas a confirmar | TRAVAS_A_CONFIRMAR maior que zero, só as em andamento | Kanban, nota "Trava a confirmar", só em andamento |
| Saúde do coletor | Coletor do servidor (ligado, última rodada, último sucesso, falhas seguidas no PNCP, rotas com falha), registro das chamadas (as 300 mais recentes, janela de 24 h; quando as 300 são todas das últimas 24 h, mostra "300 ou mais" e "pelo menos N com erro") e LIC_PORTAIS (operacionais, com restrições, em teste, com falha, ligados) | Portais e configurações; cada barra abre a lista de portais filtrada pela situação (ou só os ligados), no filtro "Situação" |
| Análises por IA | Fila da análise automática: quantas na fila, quantas esperando nova tentativa e quantas falharam 3 vezes (LIC_OPORTUNIDADES, colunas ANALISE_PENDENTE_*). Concluídas, recusadas pelo verificador e erro da IA contam oportunidades do Kanban pela situação da última análise (LIC_OPORTUNIDADES, ANALISE_SITUACAO); LIC_ANALISES dá as tentativas registradas, a última e o tempo médio (só das análises com a duração gravada, desde a etapa 4) | Kanban filtrado pela situação da análise |

Fora do servidor próprio, a saúde do coletor diz que a coleta roda só lá. Os itens 4 e 8 da revisão independente de 02/11/2026 ficaram para uma rodada seguinte, por decisão do coordenador. O Painel não atualiza sozinho: "Atualizar" conta de novo.

### 6.13 Desempenho das três telas

Cada tela lê cada aba uma vez e agrega no servidor (nada de uma chamada por cartão). Medidas de 02/11/2026, no ensaio local do servidor próprio (tempo de processamento dentro do servidor, 3 repetições):

| Dados | Kanban | Gantt (semana) | Gantt (mês) | Painel |
|---|---|---|---|---|
| Cópia da produção: 186 oportunidades, 246 prazos, 1.014 alertas | 8 a 24 ms | 15 a 22 ms | 14 a 17 ms | 57 a 79 ms |
| Volume: 388 oportunidades (260 em andamento), 1.085 prazos | 43 a 64 ms | 88 a 100 ms | 63 a 125 ms | 81 a 162 ms |

No navegador, do toque no menu até a tela pronta: 77 a 131 ms no ensaio (computador e celular). O teste automático com 260 oportunidades e 960 prazos confere que cada tela lê cada aba uma só vez.

## Preços de licitação e simulador

Decisão do dono: "Os preços não serão do Comercial; isso será cadastrado no módulo". A tabela de preços de licitação é da Diretoria; o catálogo do Comercial serve só de ponto de partida e de custo.

### Tela "Preços de licitação"

- **Importar do catálogo**: a prévia mostra os serviços do catálogo que ainda não estão na tabela (preço, custo e execução sugerida). Desmarque o que não serve e importe. O que já está na tabela nunca é sobrescrito; produtos e peças ficam fora. Eletromédicos entram como parceiro; balança, esfigmomanômetro e o resto, pela equipe própria. O óxido de etileno (QT-AUTOCLAVE-BT) entra com o preço "a confirmar".
- **Editar**: preço de referência, situação do preço (confirmado ou a confirmar), execução (equipe própria ou parceiro), custo de referência (do catálogo, pela ficha de custo e pela política do Comercial em vigor, ou informado pela Diretoria), custo do parceiro, vigência, observações e ativo. O motivo é obrigatório; só o que mudou muda; cada gravação é uma versão nova, com a fotografia da linha e o histórico (de → para). "Histórico" mostra as versões.
- Colunas: piso sem deslocamento (o preço unitário que deixa a sobra mínima com o custo de referência) e a sobra no preço de referência, em vermelho com "abaixo do piso" quando fica abaixo da mínima.
- **Mudar a política** (versão e motivo): sobra mínima (nunca abaixo de 35%, decisão do dono), margem alvo, comissão, UFs da equipe do Rio, piso por item ou no lote, deslocamento diluído ou numa linha própria.

Padrões adotados em 02/11/2026 (o dono não soube responder; a Diretoria muda na tela): sobra de 35% e alvo de 40% sobre o preço inteiro; deslocamento e seguro-garantia diluídos no preço unitário, proporcionalmente ao custo de cada item (o edital pede preço com todas as despesas); piso por item (nenhum item abaixo de 35%, mesmo que o lote feche); sem comissão; RJ e ES pela equipe do Rio, o resto pela de Goiânia; impostos sempre da matriz de Goiânia (CNPJ da proposta, EPP); eletromédicos por parceiro, com o custo do parceiro e a mesma sobra; seguro-garantia só quando o edital exigir, com o custo da corretora.

### Aba "Preço" da ficha (simulador)

1. Os itens do edital vêm do PNCP/Compras.gov.br quando a fonte informa (número, descrição, quantidade e valor unitário estimado; item sigiloso fica sem preço). Sem itens, digite. Em cada item escolha o serviço da tabela; serviço por pontos (REG-CAL-001) pede os pontos por equipamento (o mínimo de 3 está incluído); serviço por parceiro aceita o custo do parceiro.
2. "Onde é executado": UF, município, km do trecho (só a ida; o SGO+ sugere pela tabela de distâncias do Programa de conduta, a partir de Goiânia), viagens, técnicos, engenheiros, dias e noites por viagem, transporte, passagem, pedágio e outros custos. Seguro-garantia: se o edital exige e o custo cotado.
3. "Calcular" (não grava) mostra a conta inteira: custo por equipamento e a fonte, custo direto, deslocamento e seguro diluídos, custo unitário total, piso = custo ÷ (1 − impostos − comissão − 35%), alvo com 40%, a sobra no preço do edital e na proposta, as linhas do deslocamento (km R$ 2,50 ida e volta, pedágio, alimentação, hospedagem, horas de estrada e Incentivo de Missão de R$ 300 por executante em trecho de 200 km ou mais), as premissas e as versões da política de Licitações e do Comercial usadas. Item abaixo do piso fica em vermelho, com o texto "abaixo do piso". O deslocamento é rateado só entre os itens da equipe própria (lote só de parceiro não tem viagem da equipe); o seguro, entre todos. Com o deslocamento numa linha própria, a sobra do lote no edital e na proposta desconta o custo dessa linha.
4. Pendências dizem o que falta e o que fazer: km desconhecido, pedágio, equipe, custo do parceiro, item sem custo, preço "a confirmar" (sem piso), seguro exigido sem o custo. Item sem piso (preço "a confirmar") não recebe deslocamento nem seguro: o rateio fica só nos itens com piso, com aviso (calcule de novo quando o preço for confirmado).
   Edital que só traz o total do lote: escreva em "Total do lote no edital"; o SGO+ compara com a soma dos pisos e, abaixo dela, marca a pendência (a margem da nota fica como pendência). Acima dela, a faixa verde diz que o lote cobre a soma dos pisos: a faixa vermelha fica só para problema. Valores em reais nunca quebram no meio (no computador e no celular).
5. "Salvar simulação" pede o motivo e grava uma versão nova (com muitos itens e pendências, a pendência repetida em vários itens é gravada numa linha só, "Itens 1, 4, 7: ..."; se nem assim couber, a mensagem diz o que fazer: resolver as pendências dos itens ou dividir a simulação em partes): a conta é refeita no servidor, e a versão guarda a entrada, o resultado, as premissas e o hash. Uma versão salva nunca muda; em "Ver" abra uma versão e use "Começar uma versão nova a partir desta" para corrigir. Se o registro for alterado fora do SGO+, a versão aparece como "alterada fora do SGO+".

### Nota da análise (critério margem)

Com simulação salva, o critério margem (15 pontos) usa a última versão: com pendência, com algum item sem o preço do edital ou com o registro alterado fora do SGO+, 5 como pendência; sobra no edital abaixo da mínima, 0; algum item do edital abaixo do piso (com piso por item), 6; sobra a partir da mínima, 11; a partir do alvo, 15. Sem simulação, continua 5 como pendência. A simulação entra na base da análise: depois de salvar, a aba Análise fica desatualizada; toque em "Refazer análise". A IA externa recebe só a pontuação da margem ("calculada pelo sistema"), nunca o piso, o preço do edital ou a sobra. A simulação aceita até 40 itens.

## Documentos de habilitação

Cadastro único dos documentos de habilitação da Metrolabs, consumido pelas licitações. Regras do levantamento (docs/LICITACOES_03_REGRAS_NEGOCIO_20261101.md, seção A4) e decisões do dono: CNPJ sempre da matriz de Goiânia; porte EPP (LC 123/2006, com a regularidade fiscal e trabalhista tardia do art. 43); a Metrolabs não é acreditada RBC (só rastreável); registro do Inmetro para balanças e esfigmomanômetros, com o escopo exato a confirmar com o documento. Não há cadastro paralelo: os certificados dos padrões vêm de Metrologia › Padrões de referência (CAD_PADROES); o SGO+ não tinha outro cadastro de documentos da empresa (o Arquivo de documentos é dos equipamentos dos clientes).

### Tela "Documentos de habilitação" (Licitações › Documentos de habilitação)

- **Cadastrar documento**: escolha na lista (os 27 do levantamento, na mesma ordem, mais o registro do Inmetro, o enquadramento EPP, o alvará e "Outro documento"). A categoria vem com o documento (jurídica; fiscal, social e trabalhista; econômico-financeira; técnica; declarações); só "Outro documento" escolhe. Campos: número, emissão, validade impressa, órgão emissor, link de verificação oficial (só http ou https), responsável (Diretoria ou Administrador), escopo, palavras extras do cruzamento e observações.
- **Atestado de capacidade técnica**: contratante (e CNPJ), objeto, período, serviços e quantidades (uma linha por serviço: serviço; quantidade; unidade), CAT ou acervo e a O.S. ou o relatório que comprova.
- **Arquivo**: PDF, PNG, JPG ou WEBP, até 10 MB. O SGO+ confere a assinatura do arquivo (a extensão tem de bater com o conteúdo), guarda RESTRITO no serviço de arquivos do SGO+ (não abre por link nem aparece na lista da pasta; só o SGO+ entrega, a quem tem acesso a Licitações) e grava o SHA-256 dos bytes. O arquivo só é gravado quando entra de fato (o mesmo arquivo de novo, ou uma recusa, não grava nada). "Abrir o arquivo" e "Baixar" conferem o SHA-256 antes de entregar; se não conferir, nada é entregue e o caso vai para o histórico (ARQUIVO_NAO_CONFERE).
- **Versão**: mudar um campo ou trocar o arquivo grava uma versão nova com o motivo (pelo menos 10 letras); só o que mudou muda. A versão guarda a fotografia do documento e o arquivo daquela versão (LIC_HAB_VERSOES, com o hash); o arquivo anterior nunca é apagado e abre pelo "Histórico". "Retirar de uso" e "Voltar a usar" também são versões. Não existe apagar.
- **Situação** (dia de Brasília): Vigente; Vence em até 30, 15 ou 7 dias; Vencido (depois do último dia de validade); Sem validade (contrato social, declaração por certame, emitir na data, ou "validade não informada" quando o documento tem data impressa e ela falta). A validade nunca é presumida.
- "Documentos da lista ainda sem cadastro" mostra o que falta cadastrar. O item 20 (responsável técnico) depende do cadastro de RH técnico, que ainda não existe no SGO+.

### Avisos de vencimento

Pela mesma infraestrutura dos alertas de licitação (LIC_ALERTAS, Central de alertas, ciência, tetos), para a Diretoria de Licitações (o responsável do documento, se for integrante; senão os dois):

| Quando | Canais | Nível |
|---|---|---|
| Faltam 30 dias ou menos | SGO+ e e-mail | normal |
| Faltam 15 dias ou menos | SGO+ e e-mail | normal |
| Faltam 7 dias ou menos | SGO+, e-mail e WhatsApp oficial (modelo sgo_licitacao_prazo) | importante |
| Vencido | SGO+, e-mail e WhatsApp oficial | importante |

- Um aviso por faixa e por versão do documento: rodar de novo não repete, e a faixa que já passou não sai. O aviso de validade sai das 8h às 18h (Brasília); fora disso, às 8h.
- Versão nova do documento (renovação): os avisos da versão anterior que ainda esperam são cancelados e os enviados sem ciência ficam concluídos, com o motivo.
- Licitação em análise, decisão, proposta ou disputa: documento que vence antes da sessão gera UM aviso por documento e versão, juntando as licitações em que ele vence antes (importante, das 8h às 18h, sem escalonamento); documentos que faltam geram um aviso por licitação e data da sessão, só por e-mail, e ele é conferido de novo antes de sair (falta resolvida = cancelado com o motivo).
- Aviso mais novo do mesmo documento (outra faixa ou versão nova) conclui os anteriores enviados sem ciência: na faixa "sem ciência" fica só o mais novo.
- 30 e 15 dias nunca caem para o WhatsApp como canal alternativo; quem desligou o e-mail (ou o WhatsApp) nas regras dos alertas não recebe por ele: o aviso fica no SGO+. Os avisos de documento têm teto próprio (10 por pessoa no dia) e não gastam o teto dos alertas de prazo.
- No WhatsApp, o campo do órgão leva "Metrolabs (documento de habilitação)" e o emissor vai junto do nome do documento.
- Nenhum modelo novo na Meta: o WhatsApp usa o modelo já previsto para "documento vencendo" (sgo_licitacao_prazo).

### Aba "Habilitação" da ficha

A faixa de cima acompanha a situação: no radar, "ainda não está em análise" (a habilitação entra nas pendências a partir de "Em análise"); em Resultado e em Contrato, a habilitação da licitação está concluída (ou contratada): a conferência continua visível para consulta e não gera pendência nova no Hoje nem no Painel.

Nota da análise (03/11/2026): com documento em uso no cadastro, o critério Documentação da nota sai deste cruzamento (veja a tabela da seção 6.6). Para não refazer todas as análises de uma vez, a nota de uma oportunidade só fica "desatualizada" quando a habilitação DELA muda (documento cadastrado ou vencido que muda uma exigência dela, decisão "atende" ou "não atende"), e só a partir da primeira análise feita com esta regra; as análises anteriores passam a usá-la na próxima análise ("Refazer análise" ou arquivos novos).

1. As exigências vêm do checklist "O que realmente precisamos" da leitura do edital (temas de habilitação: jurídica, fiscal, econômico-financeira, qualificação técnica, atestados, equipe e responsável técnico, RBC e Inmetro, visita técnica), com a frase literal, o arquivo, a página e a linha, e das exigências de documentação da análise concluída (sem repetir o mesmo trecho).
2. Para cada exigência, o sistema sugere o documento pela regra de palavras do código (não é a IA) e confere a validade contra a data da sessão (a abertura da sessão pública da agenda; sem ela, o fim das propostas da fonte):
   - **Atende**: há documento em uso, com arquivo, válido na data da sessão.
   - **Vence antes da sessão**: a validade acaba antes da sessão (documento vencido na data da sessão não se corrige depois, art. 64). Nas certidões fiscais e trabalhistas, a observação da regularidade tardia da EPP.
   - **Falta**: não há documento em uso, ou está sem arquivo. Acreditação RBC aparece como falta, com o motivo.
   - **A conferir**: atestado (quantidade e parcela de maior relevância); escopo da acreditação, do Inmetro, do conselho profissional (CREA, CRQ, CRF...), do responsável técnico, do cadastro (SICAF, CRC de prefeitura) e do alvará ou licença; padrões (o cadastro da Metrologia); declaração por certame; documento "emitir na data"; registro do Inmetro ainda não cadastrado; exigência em mais de uma esfera ("Fazenda Nacional, Estadual e Municipal") ou de município ou estado que não é o da matriz; prazo de emissão ("emitida há no máximo 60 dias") sem a data de emissão no cadastro; exceção perto do trecho; documentos alternativos ("ou", "salvo", "substituído"); ou o sistema não reconheceu o documento.
   - Prazo de emissão: com a data de emissão no cadastro, emissão anterior ao prazo pedido (contado da sessão) vira "vence antes da sessão". "Rastreável ao Inmetro" ou "rastreável à RBC" é rastreabilidade dos padrões, não registro nem acreditação.
3. A Diretoria marca "atende" (com o documento, se houver) ou "não atende", sempre com o motivo. Cada decisão é uma linha nova (LIC_HAB_CONFERENCIAS, com o hash); a última vale e as anteriores ficam no histórico. Com o documento indicado, a validade dele continua conferida contra a sessão.
4. Falta, vence antes da sessão e "não atende" são pendências: aparecem no Hoje em Licitações e no Painel, com a fonte da contagem (licitações em análise, decisão, proposta ou disputa com a sessão por vir).
5. **Gerar relação para conferência (A4)**: abre em nova aba a lista dos documentos desta licitação (exigência, documento, número, emissão, validade, versão e SHA-256 do arquivo) e as pendências. Cada relação é uma versão que não muda (LIC_HAB_PACOTES, com o hash). Nada é enviado a portal.

## Proposta (aba Proposta da ficha)

Pedido do dono: "Gerar proposta com IA em HTML A4 e imagens e características técnicas, fazer relatório em A4 HTML, salvar tudo e rastreabilidade de tudo." Só Diretoria e Administrador. Nada é enviado a portal: o SGO+ gera o documento para a Diretoria anexar.

### O que entra na proposta

- **Planilha de preços**: é sempre a última simulação salva da aba Preço, exatamente (preço da proposta de cada item vezes a quantidade, com o mesmo arredondamento), com a versão e o hash da simulação. Sem simulação salva não há proposta comercial: o rascunho pode ser montado, mas não é aprovado nem emitido. Item com preço da proposta e sem custo conferido na simulação também impede a aprovação (resolva na aba Preço).
- **Itens do edital**: os da simulação e, com o coletor, os do PNCP que ficaram fora dela. Item sem serviço do catálogo, sem preço da proposta ou fora da simulação sai como "não cotado", com o motivo (no documento: "Serviço fora do escopo de atendimento da licitante" ou "Item não cotado nesta proposta").
- **Características técnicas**: do catálogo oficial do Comercial, como estão: descrição técnica (com os pontos, as condições ou processos e os parâmetros padrão do serviço), normas citadas no catálogo, entregáveis que o catálogo descreve (certificado, relatório, ART) e as observações técnicas. Nenhuma característica é escrita fora do catálogo.
- **Edital**: objeto, órgão, processo, modalidade e local (PNCP); prazo de execução, pagamento e garantia com a frase literal do checklist da leitura do edital, com o arquivo e a página. Sem leitura, "conforme o edital" e um aviso para conferir.
- **Licitante**: matriz de Goiânia/GO, porte da configuração do radar (EPP), razão social e CNPJ da configuração dos documentos A4. Validade da proposta: os dias informados ao montar (padrão 60; quando o edital fala da validade, a aba avisa para conferir).
- **Imagens**: só a logomarca oficial da Metrolabs. O SGO+ não tem fotos nem ícones dos serviços: a proposta sai sem elas e a aba diz o que falta. Nenhuma imagem é gerada por IA nem vem de fora.

### Texto pela IA e o verificador

Com a chave da IA, a apresentação e a metodologia de cada serviço cotado são redigidas pela IA. Cada frase cita as fontes (catálogo, item do edital, item da leitura, campo do PNCP, dados da licitante) e copia um trecho literal de uma delas. O verificador é o mesmo da leitura do edital e da análise: fonte que existe, cada número com a unidade dentro de uma fonte citada, trecho literal com a negação conferida, sentido não trocado, sem decidir pela Diretoria, sem fabricante, sem emoji. Por cima (revisão de 02/11/2026):

- **Palavra fora das fontes**: uma palavra de 4 letras ou mais que não está nas fontes citadas já recusa a frase (as palavras comuns de proposta, como "para", "conforme", "licitante", ficam liberadas).
- **Lista de bloqueio**: credenciada, homologada, certificada (o entregável "certificado de calibração" vale), acreditada ou acreditação, única, exclusiva, líder, melhor, ótimo, ágil, ANVISA, Cgcre, ISO sem o número completo da norma, garantia e "o mais", além dos superlativos de marketing.
- **Número por extenso** conta como número ("dois dias", "um ano"): tem de estar na fonte citada.
- **RBC** só na forma fixa do sistema, "padrões com rastreabilidade a laboratórios da RBC" (os serviços de calibração trazem essa linha em "Rastreabilidade"); qualquer outra menção a RBC e qualquer menção a acreditação são recusadas. Inmetro só em balança e esfigmomanômetro.

Frase que não passa é retirada e aparece na aba com o motivo. **A frase que passa não entra sozinha no documento**: cada uma tem a caixa "Aceitar" na aba, e só a frase aceita pela Diretoria vai para o documento emitido (cada aceite ou retirada fica no histórico do trecho). Sem frase aceita, sem a chave, com a IA fora do ar ou com tudo retirado, vale o texto do sistema (o catálogo e o edital como estão). Se a IA mandar mais frases do que o limite (6 na apresentação, 8 por serviço), as que passaram do limite ficam fora e a aba avisa.

### Fluxo

1. **Montar rascunho**: validade em dias, texto técnico com ou sem a IA e, a partir da segunda versão, o motivo. Montar de novo troca o rascunho em aberto (ele fica "substituído"; nada é apagado).
2. **Revisão**: "Editar este trecho" (apresentação, metodologia de cada serviço, observações) pede o motivo e grava o de → para (LIC_PROPOSTA_EDICOES). O texto da Diretoria passa pelas mesmas regras (lista de bloqueio, superlativo, Inmetro só em balança e esfigmomanômetro, sem fabricante, número, também por extenso, só se estiver no edital, no catálogo ou na simulação). Texto que fura essas regras só grava com a caixa "Assumo este texto" e o motivo: fica marcado no trecho, no histórico e no registro da aprovação. RBC fora da forma fixa e acreditação nunca passam, nem assumidos.
3. **Aprovar** (Diretoria, motivo obrigatório): só sem bloqueio (simulação salva, íntegra e a mais nova; pelo menos um item cotado; deslocamento dentro do preço dos itens; total igual ao da simulação; o edital não mudou depois do rascunho, ou seja, nem versão nova da fonte nem leitura do edital mais nova: senão, "o edital mudou, monte de novo"). Vale para o texto daquele momento: editar ou aceitar frase depois tira a aprovação.
4. **Emitir**: congela o documento A4 (HTML guardado restrito no serviço de arquivos do SGO+, com o SHA-256; PDF ao lado quando o servidor gera). Depois de gravar, o SGO+ confere que o arquivo ficou restrito; se não ficou, o arquivo vai para a lixeira e nada é emitido. O documento do órgão não leva as observações internas do catálogo nem a referência interna da simulação (elas ficam na aba e no histórico). A versão emitida não muda nunca; "Abrir a proposta emitida" confere o SHA-256 e, se não conferir, não abre (diz o porquê). Para mudar, "Nova versão".
5. "Ver a prévia em A4" mostra o rascunho com a faixa "não vale como proposta". No computador abre em aba nova; no celular, em tela cheia. Nos dois, o documento fica numa moldura isolada do SGO+ (o botão "Imprimir ou salvar em PDF" do documento continua funcionando).

## Relatórios (Licitações › Relatórios)

- **Relatório da oportunidade**: resumo (PNCP), nota da última análise concluída com os critérios, leitura do edital (versão, cobertura e o checklist com a frase e a página), habilitação (atende, a conferir, vence antes da sessão, falta), preço (a última simulação com a versão e o hash), propostas (versões, situação e o SHA-256 da emitida), decisões e histórico. Também sai pela aba Proposta da ficha.
- **Relatório do período** (até 400 dias): oportunidades novas (primeira coleta no período) por etapa de hoje e por UF, notas por classe e a média (sem descartadas e travadas, a mesma regra do Painel), fins de proposta no período, alertas criados no período (situação, nível e sem ciência pela regra da Central de alertas), mudanças de etapa (envios para análise, descartes e reaberturas), análises, propostas emitidas e as licitações em Resultado ou Contrato. O vencedor, a colocação e o valor final de cada item ficam no relatório da disputa (seção "Disputas").
- Cada parte do documento tem a linha "Fonte" (aba do SGO+ e o filtro usado).
- Cada relatório gerado é uma versão imutável (LIC_RELATORIOS): o HTML exato fica guardado restrito com o SHA-256 e a data; "Abrir" confere o SHA-256 e, se não conferir, não abre. Gerar de novo cria a versão seguinte.

## Disputas (Central de disputas e aba Disputa da ficha)

Modo assistido: o SGO+ nunca envia lance e nunca acessa o portal da disputa (não entra com senha, não resolve verificação de segurança). Hoje nenhuma plataforma de disputa dá a sessão nem o lance por sistema de fornecedor (doc 02). A Diretoria dá o lance no portal e digita no SGO+ o que deu e o melhor lance do concorrente; o SGO+ confere o piso, calcula a sobra e sugere o próximo lance. A IA não participa da disputa.

- **Central de disputas** (menu Licitações › Central de disputas): as licitações prontas para abrir (proposta emitida, com a data da sessão pela agenda), as disputas abertas e as que já têm resultado. "Abrir o painel" leva à ficha, aba Disputa.
- **Abrir a disputa** (ficha, aba Disputa): exige a proposta emitida e a simulação de preço que ela usou, as duas conferidas pelo hash, e piso em todos os itens cotados. Cada item entra com o valor inicial (o preço da proposta emitida), o piso da simulação (sobra mínima da política, 35% no padrão), o custo mais os impostos (o preço de sobra zero, com os impostos gravados na simulação) e o intervalo mínimo entre lances (a frase do edital aparece quando a leitura achou; o valor é digitado, com a fonte; sem intervalo, R$ 0,01). A data da sessão vem da agenda ou é digitada, com a fonte. O motivo é obrigatório; a licitação vai para "Disputa" no Kanban (histórico DISPUTA_ABERTA).
- **Piso do item**: a Diretoria muda o piso de um item só com o motivo. Abaixo do piso da simulação, fica marcado. Abaixo do custo mais os impostos, a tela mostra o prejuízo em vermelho (por unidade e no item) e só grava com "Assumo o prejuízo". O piso nunca passa do valor da proposta.
- **Painel da sessão** (computador e celular): por item, o nosso lance atual, o melhor lance do concorrente, a sobra no nosso lance (a mesma conta da simulação), o piso, a distância ao piso e a sugestão. Avisos: perto do piso (até 2 intervalos ou 3%), abaixo de 50% do preço do edital (o pregoeiro pode pedir a prova do custo, IN SEGES/ME 73/2022, art. 34) e prejuízo assumido.
- **Sugestão do próximo lance** (regra fixa): melhor lance do concorrente menos o intervalo (em reais, ou em % do melhor lance). Se o valor ficar abaixo do piso, não há sugestão de valor: "cobrir passaria do piso; mantenha o lance ou desista do item". Se o nosso lance já é o menor, "não precisa dar lance agora". "Usar a sugestão" só põe o valor no campo. "Parar sugestões" (com o motivo) esconde a sugestão de todos os itens; o piso continua valendo.
- **Registrar lance**: o nosso lance abaixo do piso autorizado é recusado, com o porquê, e nada é gravado ("não dê esse lance no portal"). O nosso lance tem de ser menor que o atual. Diferença menor que o intervalo mínimo gera aviso (o portal pode ter recusado). Cada lance grava a hora de Brasília, quem registrou, a origem (digitado), o piso e a sobra daquele momento e se era igual à sugestão.
- **Desistir do item** (com o motivo): o SGO+ não registra mais lance naquele item, e ele não pode ficar como ganho.
- **Valores em reais** (lance, piso, intervalo em reais, valor final): vírgula para os centavos (185,40), ponto só como milhar junto da vírgula (1.234,56), no máximo 2 casas, sem "%". "185.40", "185.405", "177,165" e "190%" são recusados com o que fazer; a tela confere igual ao servidor. O intervalo em % aceita o sinal "%".
- **Registro imutável**: LIC_DISPUTA_LANCES tem uma linha por lance ou decisão (piso, intervalo, desistência, sugestões), numerada e ligada à anterior pelo hash; o último fica gravado na disputa. Não há como alterar nem apagar. Se uma linha for mudada ou apagada direto na planilha, o painel mostra "alterado" e o SGO+ para de gravar naquela disputa (avise o Administrador; durante a sessão, anote os lances fora do SGO+). Lance digitado errado: registre o valor certo em seguida (vale o último informado). Antes de gravar cada linha, a disputa assina o hash dela como pendente; se a gravação cair no meio (a linha gravou e a disputa não), só essa linha é aceita e a cadeia retoma sozinha na próxima gravação (histórico DISPUTA_REGISTRO_RETOMADO). Linha incluída na planilha, mesmo com o hash calculado certo, é quebra. Com quebra de verdade, só o Administrador, depois de conferir a planilha, toca em "Reconhecer a quebra": o SGO+ mostra antes a foto do estado de cada item (piso, intervalo, desistência e lances) calculada só com os registros válidos (linha mexida ou não assinada fica fora; sem nenhum válido, vale o piso da simulação) e, com o motivo (pelo menos 20 letras), grava uma âncora com o motivo, o que estava quebrado, essa foto e a marca de todos os registros anteriores. Depois da âncora, o estado de cada item parte da foto, e mexer em registro de antes dela continua sendo detectado; o painel e o relatório mostram a âncora (histórico DISPUTA_QUEBRA_RECONHECIDA). A âncora não vale quando os dados da abertura (proposta, simulação, pisos) foram alterados. Com o registro quebrado, o resultado e a conclusão continuam, com o aviso no histórico e no relatório.
- **Resultado de cada item** (depois da sessão): ganho, perdido, fracassado, deserto, desclassificado (motivo obrigatório), habilitação pendente ou em recurso; colocação, vencedor e CNPJ, valor final unitário (no ganho, obrigatório, nunca abaixo do piso autorizado e, acima do nosso último lance ou da proposta, só com o motivo), adjudicação, homologação e a fonte (obrigatória). Cada registro é uma versão nova em LIC_RESULTADOS; vale a mais nova.
- **Recurso**: diga quem recorre (nós, o concorrente ou os dois) e a data da ata ou da intimação. Os prazos de razões de recurso (3 dias úteis da ata pela Lei 14.133/2021, art. 165; 5 pela Lei 13.303/2016) e de contrarrazões (estimativa: o mesmo prazo depois das razões) entram na agenda como "Pendente de confirmação": sem alerta até alguém conferir a data no portal e tocar em "Confirmar data" (aba Prazos). Sem a data da ata, o prazo fica "a informar". O recálculo da agenda pela fonte não apaga esses prazos. Quando nenhum item continua em recurso daquele lado (o item foi ganho ou perdido, ou só um lado recorre), os prazos pendentes que vieram do resultado são cancelados com o motivo; prazo já confirmado por pessoa fica.
- **Concluir o resultado** (com o motivo; também pelo Kanban, Disputa → Resultado): só com o resultado de todos os itens. A licitação vai para "Resultado" (histórico RESULTADO_REGISTRADO) e o dado dos itens ganhos (itens, valor final, total, adjudicação, homologação, fontes e o que ainda está pendente) fica preparado em LIC_DISPUTAS.CONTRATO_JSON para a etapa de Contrato. Depois disso, o resultado de um item ainda pode ser atualizado (versão nova), sem mexer no Kanban; o dado do Contrato é refeito a cada resultado novo (histórico DISPUTA_CONTRATO_ATUALIZADO).
- **Relatório da disputa (A4)**: identificação, itens com valor inicial e pisos, decisões da Diretoria, histórico de lances (com a conferência da cadeia de hash) e o resultado, cada parte com a fonte. Versão imutável em LIC_RELATORIOS (tipo DISPUTA), com o SHA-256; aparece também em Licitações › Relatórios.
- Quem pode: só Diretoria e Administrador (o servidor confere em toda ação).

## Contratos (tela Contratos e aba Contrato da ficha)

A licitação ganha vira contrato e o contrato alimenta os outros módulos do SGO+, sempre por ação explícita da Diretoria: nada é criado em outro módulo sozinho, e nenhum cadastro é duplicado. Módulo que não existe (ou que existe sem forma segura de receber o contrato) fica como dependência declarada.

### Levantamento dos módulos do SGO+ (02/11/2026)

| Módulo da missão | Existe no SGO+? Onde | O que integra (sem cadastro duplicado) | Dependência declarada |
|---|---|---|---|
| Comercial (catálogo, propostas, resultados) | Sim: COM_OPORTUNIDADES (situação ABERTA, GANHA, PERDIDA; origem "Licitação"; ORIGEM_REF), COM_PROPOSTAS, COM_PRODUTOS (catálogo oficial); SGO_Comercial_*.js | "Registrar como ganha no Comercial": a oportunidade é criada pelas regras do Comercial (ComOpo_salvar_, com cliente, contato e próxima ação) e marcada como ganha (ComOpo_ganhar_), com ORIGEM_REF = o contrato; a que já existe com a mesma referência é só vinculada | Nenhuma proposta do Comercial é criada (a proposta é a de Licitações). Perdidas ficam só em LIC_RESULTADOS |
| CRM e Clientes (órgão, unidades, contatos) | Sim: CAD_CLIENTES e CAD_UNIDADES (SGO_Clientes.js, SGO_Unidades.js, SGO_Vinculos.js; regra de cadastro completo em SGO_CadastroQualidade.js); contatos em CAD_CONTATOS (Comercial › Contatos); utilidades de CNPJ em SGO_Utilis.js | O órgão é procurado pelo CNPJ do PNCP no cliente e na unidade. Achou: "Vincular". Não achou: "Cadastrar o órgão como cliente" com os dados públicos do PNCP preenchidos, pela regra do cadastro (completo e "Ciente"); o CNPJ nunca é duplicado | O contato do órgão é cadastrado no Comercial (Comercial › Contatos) |
| Contratos | Não há módulo de contratos de clientes (a Assistência guarda só o prazo de atendimento por cliente, ATEC_CONFIG) | O contrato de licitação fica em LIC_CONTRATOS, com versões e aditivos | Contratos que não vieram de licitação |
| Assistência e engenharia clínica (O.S.) | Sim: ATEC_CHAMADOS, ATEC_OS (SGO_Assistencia_*.js) | "Planejar a execução" lança a atividade da Assistência em Minhas atividades (sem valores) | Chamado e O.S. abertos pela Assistência: a abertura automática só existe a partir de proposta do Comercial (Assistencia_doPedidoComercial_) |
| Metrologia (calibrações, certificados) | Sim: CertCal (CERT_CALIBRACAO), Cronograma de execução, Planejamento CME | "Planejar a execução" lança a atividade no Kanban do Cronograma de execução (módulo cronograma_execucao) para os itens CAL | Calibração e certificado são feitos no CertCal depois da execução |
| Qualificação (receitas, ensaios, relatórios) | Sim: Autoclave, Lavadora, Estufa e banho (QUALIF_EMISSOES) | Igual à Metrologia, para os itens QUA | Relatório emitido no módulo do equipamento |
| NR-13 | Sim: NR13_LAUDOS | Igual à Metrologia, para os itens NR13 | Laudo emitido no módulo NR-13 |
| Estoque e Compras | Sim: CMP_REQUISICOES, CMP_PEDIDOS (SGO_Compras_*.js) | Atividade de Compras pelo "Planejar a execução", quando o contrato tem produto | A requisição é aberta em Compras (a automática só existe a partir de proposta do Comercial) |
| Financeiro (faturamento, recebimentos, garantias) | Não há módulo de faturamento nem de contas a receber (só o pagamento das compras) | Previsão de faturamento por entrega e por mês, só leitura, no contrato e no relatório | Lançamento de previsão, faturamento e recebimento |
| RH (equipes, qualificações, RT) | Usuários, ponto e Programa de conduta existem, sem alocação por contrato | A equipe é definida no planejamento da área; os documentos de RT ficam em Documentos de habilitação | Alocação de equipe por contrato |
| Logística e Veículos | Frota existe (CAD_VEICULOS, REG_FROTA_*), sem reserva por contrato | O deslocamento entra no planejamento da área | Reserva de veículo por contrato |
| Documentos e Qualidade | Documentos (DOC_DOCUMENTOS), PGT/POP, registros | O contrato e os aditivos ficam restritos em Licitações, com SHA-256 e versões | Cópia automática para Documentos |
| Notificações | Sim: alertas de Licitações (LIC_ALERTAS, SGO_Licitacoes_Alertas.js), WhatsApp oficial pelo modelo aprovado | Os prazos do contrato usam os mesmos alertas, só para a Diretoria de Licitações | — |
| Agenda única (Minhas atividades) | Sim: ATV_ATIVIDADES (SGO_Atividades.js) | "Levar à agenda única": uma atividade por marco futuro, para o responsável | — |

### Registrar o contrato

- **Pelo resultado homologado** (licitação em Resultado, disputa concluída e CONTRATO_JSON pronto: itens ganhos com a homologação, sem item pendente): os itens ganhos, o valor unitário homologado e a homologação vêm do resultado. A quantidade pode ser menor que a ganha (contrato parcial de uma ata); valor diferente do homologado, item que não foi ganho ou quantidade acima da ganha são recusados com o que fazer. Disputa alterada fora do SGO+ (hash) bloqueia o registro pelo resultado.
- **Registro manual** (resultado fora do SGO+, homologação pendente, disputa sem registro): motivo de pelo menos 20 letras e a fonte do resultado; os itens são digitados. Vale para licitação no Radar, Em análise, Decisão, Proposta ou Resultado; descartada precisa ser reaberta; disputa aberta precisa do resultado concluído.
- **Campos**: número (como está no documento), tipo (contrato ou ata de registro de preços), assinatura, vigência (início e fim; até 10 anos, Lei 14.133/2021, art. 107), itens (quantidade e valor unitário; o total é a soma), reajuste (índice, data-base e de onde vem, quando o edital disser), garantia contratual (caução, títulos, seguro-garantia, fiança ou título de capitalização, Lei 14.133/2021, art. 96; valor, validade e de onde vem), renovação (prevista e até quando decidir; vazio = 60 dias antes do fim), entregas (descrição, prazo e valor), obrigações (descrição e prazo opcional), responsável (Diretoria ou Administrador) e observações. Valores em reais com vírgula nos centavos (a mesma leitura estrita da disputa).
- **Arquivo** (contrato assinado; depois, os termos aditivos): PDF ou imagem até 10 MB, conferido pela assinatura dos bytes e guardado restrito com o SHA-256 (se não ficar restrito, nada é gravado). "Abrir" e "Baixar" conferem o SHA-256; arquivo que não confere não é entregue (histórico CONTRATO_ARQUIVO_NAO_CONFERE).
- Ao gravar (motivo obrigatório), a licitação vai para "Contrato" no Kanban pela mesma regra de passagem (histórico CONTRATO_REGISTRADO, fonte "Contratos"). No Kanban, "Resultado → Contrato" explica e abre a aba Contrato da ficha. Uma licitação tem um contrato; as ordens de uma ata são entregas.

### Versões (nada é apagado)

- "Nova versão": correção de digitação, termo aditivo (número e fonte obrigatórios), apostilamento (só reajuste: valores dos itens, índice e data-base; fonte obrigatória) ou encerramento (encerrado ou rescindido, com a fonte). Só o que mudou entra; cada versão guarda a foto completa dos dados (LIC_CONTRATO_VERSOES.DADOS_JSON), o que mudou (de → para), o motivo, quem, quando e o hash ligado ao da versão anterior. Nada mudou = nenhuma versão nova.
- Avisos: aditivo acima de 25% do valor inicial (Lei 14.133/2021, art. 125) e correção com valor diferente do homologado ficam marcados na versão e no histórico (CONTRATO_VERSAO).
- Contrato encerrado ou rescindido só aceita correção de digitação. Encerramento registrado por engano: só o Administrador reabre ("Reabertura", motivo de pelo menos 20 letras e a fonte), como versão nova; os prazos voltam para a agenda. Versão mexida ou apagada na planilha (hash) para as gravações e diz para avisar o Administrador.
- Encerramento e apostilamento mantêm o responsável da versão anterior (mesmo que ele não esteja mais ativo); trocar o responsável exige alguém ativo da Diretoria.
- Com o contrato registrado, o resultado da disputa não muda mais na aba Disputa: a mudança é uma versão do contrato (correção, aditivo ou encerramento).

### Prazos na agenda e alertas

- Marcos do contrato em LIC_EVENTOS (fonte CONTRATO, natureza confirmada, dia todo, limite interno 09:00): início, fim, decidir a renovação, reajustes (a cada 12 meses da data-base, dentro da vigência; Lei 14.133/2021, art. 25, § 7º, e art. 92, § 3º), validade da garantia, entregas e obrigações com prazo.
- Versão nova que muda um marco cria a versão nova do prazo (a anterior fica "substituída", com o motivo); marco que saiu, ou contrato encerrado, fica "cancelado" com o motivo (histórico AGENDA_CONTRATO). O recálculo da agenda pela fonte (retificação, suspensão, revogação) não mexe nos marcos do contrato.
- Alertas: os mesmos da etapa 3 (Central de alertas, e-mail e WhatsApp pelo modelo aprovado sgo_licitacao_prazo; ciência e escalonamento), só para a Diretoria de Licitações. Antecedências padrão (ajustáveis em Regras dos alertas): início 7 dias e 1 dia; entregas e obrigações 7 dias, 2 dias e 1 dia; reajuste 30 e 7 dias; garantia, renovação e fim 30 dias, 7 dias e 1 dia.

### Integração (ação explícita, com confirmação; tudo em LIC_CONTRATO_VINCULOS)

- **Cliente**: vincular ao cliente do cadastro com o mesmo CNPJ (cliente ou unidade); cliente com outro CNPJ só com o motivo; cliente inativo é mostrado com a orientação de reativar em Cadastros › Clientes. Cadastrar o órgão abre o formulário com os dados do PNCP (razão social, CNPJ, cidade e UF); o cadastro segue a regra de Cadastros › Clientes (completo e "Ciente"; cria a unidade principal); CNPJ já cadastrado é recusado antes ("vincule").
- **Comercial**: exige o cliente vinculado e um contato do órgão no Comercial. Cria a oportunidade "Contrato de licitação ..." (funil Engenharia, etapa Aprovado, origem Licitação, valor do contrato, ORIGEM_REF LIC-CONTRATO:...) e a marca como ganha; a próxima ação obrigatória do Comercial é concluída na hora pela regra do "ganhar". A oportunidade que já existe com a mesma referência é vinculada ("Vincular a existente"): aberta, é marcada como ganha; perdida ou cancelada é recusada, com o caminho (reabertura em Comercial › Oportunidades). Se o "ganhar" falhar depois de criar, nada é duplicado: a tela oferece vincular a existente.
- **Agenda única**: uma atividade por marco futuro em Minhas atividades (módulo Licitações › Contratos, restrita), para o responsável; marco já levado não se repete; marco de hoje vira atividade para o próximo dia útil (nenhuma nasce atrasada). Quando uma versão muda a data de um marco, a atividade aberta é replanejada pela própria API de Minhas atividades; quando o marco sai, ou o contrato é encerrado ou rescindido, a atividade aberta é cancelada com o motivo (o planejamento da execução aberto também). Atividade já concluída não é mexida; se Minhas atividades não responder, a resposta diz qual ajustar lá. Atividade concluída (ou cancelada) antes de um aditivo que muda a data: o marco volta a "a levar", com a explicação ao lado ("a atividade anterior foi concluída antes da mudança da data"), e "Levar à agenda única" lança a atividade da data nova.
- **Reserva**: antes de criar no outro módulo (oportunidade do Comercial, atividade, planejamento), o SGO+ reserva a chave em LIC_CONTRATO_VINCULOS sob a trava; dois toques ao mesmo tempo não duplicam (o segundo é recusado com o que fazer) e a falha desfaz a reserva (RESERVA_DESFEITA, com o erro). Reserva com mais de 10 minutos deixa de valer. A atividade criada leva no texto a marca da reserva ("[Ref. Licitações: reserva ...]"): se a gravação parar depois de criar a atividade e antes de ligar ao contrato, a resposta avisa para não lançar outra; vencida a reserva, o SGO+ procura em Minhas atividades a atividade com a marca e refaz o vínculo em vez de criar de novo (na agenda única e no planejamento).
- **Planejar a execução**: os itens por área pelo código do catálogo (CAL Metrologia, QUA Qualificação, NR13 NR-13, produto Compras, os demais Assistência). "Criar o planejamento" (quem planeja e prazo de amanhã em diante; padrão o início do contrato ou 2 dias úteis) lança uma atividade por área com os itens, as quantidades e as entregas, sem valores; Metrologia, Qualificação e NR-13 caem no Kanban do Cronograma de execução. Uma por área; nunca O.S., chamado, requisição, certificado ou laudo.
- **Previsão de faturamento**: por entrega (entregas com valor somadas por mês; aviso se a soma difere do valor total) ou estimativa linear pela vigência. Só leitura (dependência declarada do Financeiro).

### Tela Contratos e relatório

- **Contratos** (menu Licitações › Contratos): vigentes, a vencer em 90 dias, vigência terminada sem registro e o valor dos vigentes; busca e filtro por situação; "Resultados prontos para virar contrato" leva à aba Contrato.
- **Relatório do contrato (A4)**: identificação, itens, condições, entregas e obrigações, prazos na agenda, previsão de faturamento, integração e versões, cada parte com a fonte. Versão imutável em LIC_RELATORIOS (tipo CONTRATO, número REL-CTR-...), com o SHA-256; aparece também em Licitações › Relatórios.
- Quem pode: só Diretoria e Administrador (o servidor confere em toda ação). Quem recebe uma atividade a vê em Minhas atividades.

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
| "A última tentativa foi recusada pelo verificador" | Falhou o que é da resposta toda (resumo, justificativa, nenhum item de capacidade ou nenhuma trava conferida, mais da metade caída); a nota anterior vale. Use "Refazer análise" com o motivo |
| "N pontos da resposta da IA não conferiram" | A análise passou em parte: o que caiu ficou fora da nota e está em Pendências como "Não conferido (motivo)". Confira no edital antes de decidir |
| "Escreva o motivo para refazer a análise" | Pelo menos 10 letras; nada foi alterado |
| "WhatsApp aguardando aprovação do modelo na Meta" | O dono cadastra o modelo sgo_licitacao_prazo em Chaves e senhas › Cadastrar modelos na Meta e confere a situação; até lá os alertas vão pelo SGO+ e pelo e-mail |
| "Sem celular no cadastro" num alerta | O administrador preenche o celular em Administração › Usuários |
| "Retido pelo piloto do WhatsApp" num alerta | O celular não está na lista da Diretoria de Licitações do piloto; confira o celular no cadastro (a lista é refeita a cada envio) |
| Entregue e Lido nunca aparecem | A Meta ainda não mandou o retorno de status (webhook assinado do número do sistema). O último estado garantido é "Aceito pela Meta" |
| "A rotina dos alertas está parada" | Avise o responsável pelo sistema: o agendador do servidor pode ter parado |
| "Escreva onde você conferiu a data" | Pelo menos 10 letras (documento e item); nada foi alterado |
| Um alerta de 7 dias não saiu | A oportunidade entrou quando a antecedência já tinha passado; sai só o aviso mais recente |
| Kanban: "Escreva o motivo da mudança de etapa" | Pelo menos 10 letras; nada foi alterado |
| Kanban: botão de etapa apagado | O texto embaixo do botão diz o porquê (passagem que ainda não existe ou etapa futura) |
| Kanban: "alguém mudou agora há pouco" | Outra pessoa (ou a ficha) mudou a oportunidade; toque em "Atualizar". Nada foi alterado |
| Gantt vazio | Mude o zoom para "Mês", use "Próximo" ou limpe os filtros; prazos sem data ficam na lista acima do gráfico |
| Painel: tempo médio "sem medida ainda" | Nenhuma análise foi feita desde que a duração passou a ser gravada |

## 8. Rastreabilidade

- Toda chamada a portal: registro no servidor (lic_conexoes_log).
- Toda resposta original: guardada com hash no servidor (prova do que estava publicado na data).
- Toda versão da fonte: linha própria, ligada à anterior, nunca alterada.
- Todo fato no SGO+ (entrada no radar, retificação, triagem refeita, descarte, análise, reabertura, parâmetro de portal, teste de conexão, regras do radar, coleta pedida): histórico com quem, quando, o quê, versão, fonte e hash.
- Arquivos do edital: cada um com SHA-256, tamanho, nome, origem e datas (lic_arquivos no servidor); versão nova quando muda na fonte; o histórico registra os arquivos lidos (ARQUIVOS_DA_FONTE, com o hash da base) e quem abriu ou baixou (ARQUIVO_ABERTO, com o SHA-256).
- Análise por IA: uma linha por versão em LIC_ANALISES, com o hash; no histórico, ANALISE_IA (ou recusada, ou falhou) com a versão, o modelo, a versão da fonte e os arquivos lidos com o SHA-256.
- Agenda: uma linha por versão de cada prazo em LIC_EVENTOS (natureza, fonte, regra, fuso, versão, quem conferiu, hash); no histórico, AGENDA_MONTADA, AGENDA_RETIFICADA, AGENDA_SUSPENSA, AGENDA_REVOGACAO, AGENDA_ANULACAO, AGENDA_REABERTA, AGENDA_CONFIRMADA, AGENDA_CONFERIDA e AGENDA_RECURSO.
- Alertas: uma linha por prazo, antecedência e pessoa em LIC_ALERTAS (e por mudança, escalonamento e reenvio), cada canal com a situação e o motivo; no histórico, ALERTA_ENVIADO, ALERTA_FALHOU, ALERTA_WHATSAPP_ENVIADO, ALERTA_WHATSAPP_ENTREGUE, ALERTA_WHATSAPP_LIDO, ALERTA_WHATSAPP_FALHOU, ALERTA_CIENCIA (quem, quando, canal), ALERTA_ESCALONADO e ALERTA_REENVIO_PEDIDO. Regras dos alertas: REGRAS_DOS_ALERTAS (de, para, versão, motivo).
- Kanban: a mudança de etapa grava o mesmo fato da lista (ENVIADA_PARA_ANALISE, DESCARTADA_PELA_DIRETORIA, REABERTA) com a fonte "Kanban", o motivo, de → para e o hash.
- Análise por IA: DURACAO_MS em LIC_ANALISES (desde a etapa 4) guarda quanto a análise levou, para o tempo médio do Painel.
- Documentos de habilitação: LIC_HAB_DOCUMENTOS (estado atual), LIC_HAB_VERSOES (uma linha por versão, com a fotografia, o arquivo e o hash), LIC_HAB_CONFERENCIAS (decisões da Diretoria por exigência) e LIC_HAB_PACOTES (relações geradas); no histórico, DOCUMENTO_CADASTRADO, DOCUMENTO_VERSAO, DOCUMENTO_RETIRADO, DOCUMENTO_REATIVADO, ARQUIVO_ABERTO, ARQUIVO_NAO_CONFERE, HABILITACAO_CONFERENCIA e HABILITACAO_RELACAO.
- Proposta: LIC_PROPOSTAS (uma linha por versão, com a simulação usada, o hash do conteúdo, a aprovação e a emissão; a emitida guarda o SHA-256 do HTML congelado e do PDF), LIC_PROPOSTA_EDICOES (de → para de cada trecho, com o hash); no histórico, PROPOSTA_RASCUNHO, PROPOSTA_TRECHO_EDITADO, PROPOSTA_APROVADA, PROPOSTA_EMITIDA, PROPOSTA_NOVA_VERSAO e PROPOSTA_SUBSTITUIDA.
- Relatórios: LIC_RELATORIOS (uma linha por relatório gerado, com a versão, o SHA-256 do HTML guardado e o hash do registro); no histórico, RELATORIO_GERADO.
- Disputas: LIC_DISPUTAS (uma por licitação, com a proposta e a simulação usadas, o hash da abertura e o dado preparado para o Contrato), LIC_DISPUTA_LANCES (lances e decisões, imutável, hash encadeado) e LIC_RESULTADOS (uma linha por versão do resultado de cada item); no histórico, DISPUTA_ABERTA, DISPUTA_LANCE, DISPUTA_PISO, DISPUTA_INTERVALO, DISPUTA_DESISTENCIA, DISPUTA_SUGESTOES, DISPUTA_RESULTADO_ITEM, RESULTADO_REGISTRADO, DISPUTA_CONTRATO_ATUALIZADO, DISPUTA_REGISTRO_RETOMADO, DISPUTA_QUEBRA_RECONHECIDA, AGENDA_RECURSO e AGENDA_PRAZO_CANCELADO.
- Nada é apagado: a situação muda.

### 8.1 Regra de guarda (aprovada pelo dono em 02/11/2026)

| O quê | Quanto tempo |
|---|---|
| Oportunidade em que a Diretoria mexeu (análise, decisão, descarte manual, reabertura, arquivo pedido ou aberto, análise por IA pedida, proposta, resultado, contrato), com o histórico e os arquivos do edital | Para sempre |
| Candidata ou travada nunca tocada por pessoa | 2 anos a partir da publicação; depois sai da lista, com o resumo do que saiu no histórico |
| Fora do ramo (sem termo de interesse, ou descartada só pela regra e nunca tocada) | Só o resumo (órgão, objeto, valor, UF, modalidade, datas, número de controle, hash) por 1 ano; os dados brutos da fonte, 30 dias |
| Registro das chamadas aos portais | 6 meses |

Os dados brutos das oportunidades que ficam (para sempre ou nos 2 anos) nunca são apagados: são a prova do que estava publicado. A limpeza roda sozinha toda segunda às 06:30, dentro do servidor (a manutenção semanal só pede), com a coleta e a leitura de arquivos pausadas enquanto ela roda, em lotes de 20 que soltam a trava entre eles (os outros módulos não esperam) e com tempo máximo por execução (o resto fica para a semana seguinte; registro de saída sem remoção é estornado na execução seguinte), e o resumo (quantas linhas saíram de cada tabela e o espaço) vem no e-mail da manutenção. Enquanto o resumo existe, a mesma licitação não volta como "nova"; depois de 1 ano, se reaparecer na fonte, entra como nova. Se algo der errado na conferência do que é protegido, nada das licitações é apagado.

## 9. Para o Administrador

- Chave geral do coletor: propriedade LIC_COLETOR_LIGADO ("1" liga). A tela grava a chave quando a Diretoria salva as Regras do radar; antes disso, vale o que estiver na propriedade.
- Parâmetros que o servidor lê: propriedade LIC_CFG_COLETOR (gravada pela tela; não editar à mão).
- Coleta real sob demanda no servidor: `npx tsx scripts/licitacoes_coletar.ts` (opções `--dias`, `--modalidades`, `--propostas`, `--testar`, `--sincronizar`).
- A sentinela de infraestrutura mostra o item "Coletor de licitações (PNCP e Compras.gov.br)" em Saúde da infraestrutura.
- Arquivos do edital: tabelas lic_arquivos e lic_arquivos_estado no servidor; o conteúdo fica no serviço de arquivos do servidor, restrito (RESTRITO:LICITACOES). A rotina roda a cada 5 minutos com o coletor ligado (os pedidos da tela rodam sempre).
- Regra de guarda: `npx tsx scripts/licitacoes_guarda.ts --previa` conta sem apagar; sem `--previa` aplica (a manutenção semanal já chama). O script só chama a rota interna POST /interno/licitacoes/guarda do próprio servidor (aceita só de dentro do contêiner), que pausa o coletor e os arquivos, roda Lic_guarda_ (SGO_Licitacoes_Guarda.js) no pool principal, com a mesma trava da sincronização, e depois servicos/licitacoes/guarda.ts. Tudo que ainda está em LIC_OPORTUNIDADES fica com a contratação, os itens e os arquivos no servidor.
- Análise por IA: chave GEMINI_API_KEY e modelo IA_MODEL (as mesmas do SGO+); pesos da nota em LIC_CONFIG, chave NOTA (sem linha, vale o padrão do doc 03, B6).
- Fila da análise automática: rotina Licitacoes_rotinaAnalise, gatilho de uma vez (1 minuto depois), que se instala sozinho quando há análise na fila e se remove sem fila; a rotina dos alertas confere a fila a cada 5 minutos (passo filaAnalise). Colunas ANALISE_PENDENTE_SITUACAO (NA_FILA, FEITA, FALHOU), _BASE, _EM, _TENTATIVAS, _PROXIMA e _ERRO em LIC_OPORTUNIDADES (entram por merge). Coluna ANALISE_PENDENTE_RESERVA_ATE (reserva comum com "Analisar agora"). Teto por dia em LIC_CONFIG, chave FILA_ANALISE. Propriedades: LIC_FILA_GATILHO_EM, LIC_FILA_VARRIDA_EM, LIC_FILA_ULTIMA_RODADA, LIC_FILA_RODANDO_ATE (uma rodada por vez, validade de 330 s), LIC_FILA_PAUSA (chave recusada), LIC_FILA_DIA (análises automáticas de hoje).
- Alerta de nova oportunidade de alta aderência (03/11/2026): Lic_altaAvaliar_ (SGO_Licitacoes_Alertas.js), chamado no fim de Lic_analisar_ (só análise concluída), em Lic_acertarNotasPendentes_ e depois de "Confirmar trava" ou "Não é trava". Regras em LIC_CONFIG, chave ALERTAS, campo altaAderencia { ligado, limite }. Colunas ALTA_ADERENCIA_ESTADO (ALTA ou CAIU), ALTA_ADERENCIA_CICLO, ALTA_ADERENCIA_EM e ALTA_ADERENCIA_NOTA em LIC_OPORTUNIDADES (entram por merge, versão V9 das abas). Em LIC_ALERTAS: TIPO ALTA_ADERENCIA, CHAVE H|oportunidade|ciclo|pessoa, GRUPO H|oportunidade|ciclo, ANTECEDENCIA NOVA ou VOLTOU, ALVO_ISO = fim das propostas. Coluna ALTA_ADERENCIA_ESPERA (TRIAGEM: nota alta esperando a triagem destravar). Constantes: LIC_ALTA_EXPEDIENTE (08:00 a 18:00), LIC_ALTA_TETO_DIA (5), LIC_ALTA_TETO_RODADA_CRITICO (5), LIC_ALTA_HISTERESE (5), LIC_ALTA_VOLTOU_MS (7 dias). Na implantação nada é disparado: as oportunidades que já têm nota alta só alertam quando forem analisadas de novo (os tetos seguram uma rajada).
- Alertas: rotina Licitacoes_rotinaAlertas a cada 5 minutos (instalada sozinha quando a Diretoria abre Licitações; agenda que mudou, programar, escalonar, enviar, concluir). Regras em LIC_CONFIG, chave ALERTAS. Propriedades: LIC_ALERTAS_IMPLANTADO_EM (primeira rodada), LIC_ALERTAS_ULTIMA_RODADA, LIC_CIENCIA_SEGREDO (assinatura dos links de ciência; gerada sozinha, nunca aparece na tela).
- Modelo do WhatsApp: sgo_licitacao_prazo (categoria Utilidade, botão de link "Confirmar ciência"), definido em NTF_MODELOS_META (SGO_Notificar.js) e cadastrado como os outros (Chaves e senhas › Cadastrar modelos na Meta, ou npx tsx scripts/cadastrar_modelos_meta.ts no servidor). A aprovação na Meta é do dono.
- Piloto do WhatsApp: a lista telefonesLicitacoes (celulares da Diretoria de Licitações) libera só o modelo sgo_licitacao_prazo vindo dos alertas de licitação, no SGO+ e no servidor (regra 7 de servicos/whatsappPiloto.ts).
- Retorno de status da Meta (sent, delivered, read, failed) e resposta CIENTE: o webhook do número do sistema chega à rota do COMMAND; o servidor confere a assinatura X-Hub-Signature-256 (META_APP_SECRET; sem a chave, o segredo da rota) e repassa os status e as respostas ao SGO+ (SGO_whatsappRetornoMeta_), que atualiza os avisos da gestão e os alertas de licitação. Sem assinatura válida, nada é repassado.
