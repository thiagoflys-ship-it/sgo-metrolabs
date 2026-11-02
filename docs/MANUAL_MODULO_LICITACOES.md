# Manual do módulo Licitações (SGO+) — etapas 1, 2, 3 e 4

Versão de 02/11/2026 (etapa 2: arquivos do edital e nota 0–100 pela IA; etapa 3: agenda de prazos e alertas com ciência e escalonamento; etapa 4: Kanban, Gantt e Painel; leitura especialista do edital, seção 6.6.1). Quem usa: Diretoria e Administrador. Os demais perfis não veem o módulo.

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
- Portais e configurações

No celular, a tela inicial ganha o atalho "Licitações" e cada tela do módulo abre com a barra de seções no topo (Hoje, Painel, Oportunidades, Kanban, Gantt, Agenda, Alertas, Portais e configurações). Em Oportunidades, Kanban e Gantt, a barra "Lista · Kanban · Gantt" troca a forma de ver as mesmas licitações.

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
| Documentação | 15 | IA, conferida: as exigências de habilitação com o trecho. No máximo 7,5 (metade, como pendência) enquanto o SGO+ não tiver o cadastro de habilitação |
| Localização | 15 | Sistema: prioridade da UF (até 8) + distância (até 7; metade como pendência até a distância rodoviária ser confirmada; Goiânia vale 7) |
| Prazo | 10 | Sistema: dias úteis até o fim das propostas, contados com os feriados do SGO+ (a IA não conta datas) |
| Valor | 10 | Sistema: pelo valor estimado da fonte |
| Riscos | 5 | IA, conferida: perde 1 ponto por risco provado com trecho (registro de preços sem mínimo, garantia acima de 5%, garantia de proposta, peças sem teto, atendimento em horas, medição longa, multa acima de 10%, vistoria obrigatória) |

Trava encontrada pela IA (exige laboratório acreditado RBC sem aceitar rastreabilidade, dedicação exclusiva, software próprio, vistoria vencida, empresa impedida, contratação direta já decidida, tudo fora do catálogo, produto sem catálogo) nunca zera a nota sozinha: ela fica como "trava a confirmar". A nota calculada continua visível, a classe mostra "candidata a descarte (trava a confirmar)", e a lista de Oportunidades e o Hoje mostram o selo "Trava a confirmar". Na aba Análise, cada trava tem os botões "Confirmar trava" e "Não é trava", os dois com motivo obrigatório (pelo menos 10 letras); a decisão fica no histórico com quem, quando, o motivo, o trecho e a nota de antes e de depois, com o número da decisão. Só depois de "Confirmar trava" a nota vai a 0 (a soma sem a trava fica registrada); "Não é trava" devolve a nota calculada. A decisão vale para a mesma trava e o mesmo trecho quando a análise é refeita, desde que o parágrafo do trecho no edital não tenha mudado e não tenha surgido exceção perto dele (para "Confirmar trava", também o arquivo inteiro: uma errata em outro parágrafo do mesmo arquivo, ou uma versão nova da fonte quando a trava cita um campo do PNCP, pede confirmação de novo); se mudou (edital retificado), a trava volta a "a confirmar", com a decisão anterior ao lado ("reconfirmar"). Trava nova pede confirmação nova. O trecho da trava tem de falar do assunto dela (RBC ou acreditação para a trava de RBC, dedicação exclusiva para a de dedicação exclusiva...), senão o verificador recusa; a trava "tudo fora do catálogo" precisa da frase do catálogo (REGRA:catalogo). Só o prazo vencido, calculado pelo sistema, zera a nota direto. Classes: 75 ou mais alta, 50 a 74 média, 30 a 49 baixa, abaixo de 30 ou com trava confirmada "candidata a descarte". A oportunidade continua no radar e os alertas continuam: quem descarta é a Diretoria, pela ação de descartar.

Regras do dono que a IA recebe: a Metrolabs não é acreditada RBC (é rastreável); tem autorização do Inmetro para balanças e esfigmomanômetros; participa a matriz de Goiânia, empresa de pequeno porte (EPP); prioridade GO, DF, vizinhos e RJ. O texto do sistema nunca cita fabricante.

O verificador: antes de valer, a resposta da IA é conferida. Todo FATO precisa da fonte, e o trecho (pelo menos 3 palavras seguidas) é procurado palavra por palavra no texto inteiro daquela fonte, na mesma ordem e com limite de palavra ("necessária" não vale dentro de "desnecessária"). Não contam acento, caixa, espaço, quebra de linha, pontuação solta, aspas tipográficas e o hífen que o PDF põe no fim da linha ("Con-tratada"). Número vale inteiro e com o separador ("1,5%" não é "15%", "1/12" não é "11/2", "R$ 15.000,00" não é "R$ 1.500.000"), e contam os sinais ≥, ≤, <, >, ± e o de número negativo ("-20 °C" não é "20 °C"). Trecho com negação antes dele na mesma frase ou oração ("Não será, sob qualquer pretexto, exigida ...", "é vedada ...", "é inaplicável ...", "fica isenta ..."; para trás até o começo da frase, parando em ponto, ponto e vírgula, interrogação, linha em branco ou item numerado que abre a linha, no máximo 40 palavras) é recusado. Também é recusado o que corta uma negação logo depois, separada por pontuação ou quebra de linha ("...laboratório? Não.", "... – Não", "...: não"), e, com qualquer separador, a negação que vem sozinha no fim da linha ou da frase ("...laboratório Não", "...laboratório. Não."). Negação que abre outra oração com conteúdo ("...; não se aplica aos itens de balança") não recusa. Item de lista fica sob a negação do cabeçalho da lista ("Não serão exigidos os seguintes documentos: alvará; certificado de acreditação RBC" ou com os itens numerados embaixo), e item numerado só começa outra frase quando a linha de cima termina em ponto, ponto de exclamação ou ponto e vírgula.

Rede de segurança: perto do trecho (o parágrafo inteiro dele, desde a última linha em branco, e o parágrafo seguinte), o sistema procura palavras de negação ou de exceção ("não", "exceto", "dispensado", "facultativo", "alternativamente", "opcional", "subcontratar", "rastreável", "poderá", "aceito"...; "não-obrigatoriedade" conta, o hífen separa as palavras). Na trava, isso aparece como alerta de exceção para quem vai confirmar. Fato ou exigência que diga que o edital exige algo impeditivo (RBC, acreditação, ISO 17025, registro, atestado, Inmetro), com negação ou exceção perto, não vale como prova: vira a pendência "Confirmar no edital: há negação ou exceção perto do trecho ...", com o trecho e a palavra encontrada. Só no texto que foi enviado à IA, também valem: a numeração de cláusula que abre a linha e que a IA tirou ("1.3.1."); o rótulo que a IA pôs na frente ("Item 1", "LOTE 02 ITEM 01 UND"), desde que o número dele seja o da fonte; reticências "(...)" entre pedaços da mesma frase (5 palavras ou mais cada, até 300 caracteres, sem ponto final nem negação no que foi pulado); e a quebra de página no meio da frase (só rodapé e cabeçalho repetidos entre os dois pedaços, 5 palavras ou mais de cada lado). Reticências e quebra de página não valem em capacidade técnica nem em trava. O que fica gravado como prova é sempre o texto do edital, recortado do arquivo (a quebra de página aparece como "[quebra de página]"), nunca o que a IA escreveu. Trecho longo é aceito até 1.200 caracteres (a tela mostra até 600). Quando o trecho não está lá, a nova tentativa recebe o pedaço da fonte mais parecido, ou a ref certa se o trecho estiver em outro arquivo (nas primeiras 15 recusas de cada resposta). Os números calculados pelo sistema também podem ser citados, só em afirmação, com a ref SISTEMA. Cada fonte vai para a IA entre marcadores sorteados a cada análise, com a ordem de tratar o conteúdo como dado: instrução escrita dentro do edital é ignorada. Número ou citação no resumo e nas justificativas tem de estar nas fontes ou nos cálculos do sistema (com tolerância de arredondamento: "R$ 8,4 mil" para R$ 8.431,44 passa; anos, dias de datas e números menores que 10 não são conferidos; número inventado é recusado). Se a triagem por regras travou a oportunidade, a IA tem de provar a trava ou deixar a pendência "trava". Trecho que não está lá, fonte inexistente, pontos fora do peso, código de risco ou trava fora da lista, frase de decisão ("recomendo participar"), afirmação de acreditação RBC, fabricante citado, emoji ou markdown fazem a resposta ser recusada e refeita (até 2 vezes, com os problemas apontados). Recusada de novo, fica registrada como "recusada pelo verificador" e a nota anterior continua valendo. A tela diz em linguagem simples o que faltou e o que fazer (por exemplo: os arquivos do edital ainda não foram baixados porque o PNCP estava fora do ar; tente de novo depois que os arquivos chegarem). O detalhe técnico fica recolhido em "Ver o motivo técnico", e a resposta crua da IA de cada tentativa (até 24 mil caracteres cada; se não couber na célula, a mais antiga é cortada primeiro) fica guardada na análise (coluna RESPOSTAS_IA_JSON) e aparece em "Ver respostas da IA". Só a Diretoria e o Administrador veem.

O que vai para a IA: o verificador confere contra o texto inteiro dos arquivos, mas o pedido à IA leva até 140 mil caracteres, escolhidos por página: termo de referência, edital e aviso primeiro; páginas com itens, especificação, habilitação, qualificação técnica, RBC e Inmetro, garantia, multa, prazo de atendimento, peças, pagamento e registro de preços sobem; página repetida (o mesmo termo de referência em dois arquivos ou dentro do .zip) vai uma vez só; minuta de contrato e modelos de declaração e de proposta ficam por último. Página que não coube aparece para a IA como "[... página(s) não enviada(s) à IA ...]", e ela escreve pendência se faltar algo. A IA responde em JSON, com raciocínio limitado e trechos curtos, para caber no tempo da chamada (120 s).

Quando roda: sozinha, quando chegam arquivos novos ou mudados ou a fonte tem versão nova, só nas oportunidades no radar ou em análise com prazo aberto, e só se a base mudou (assim não gasta à toa). "Analisar agora" faz a primeira; "Refazer análise" pede o motivo (pelo menos 10 letras). Leva de 1 a 3 minutos.

Sem a chave da IA: nada é calculado nem inventado; a tela diz "análise por IA indisponível: falta a chave" e o botão fica desligado. O Administrador cadastra a chave GEMINI_API_KEY em Administração > Chaves e senhas (o modelo é o de IA_MODEL, o mesmo do restante do SGO+).

Versões: cada análise é uma linha nova em LIC_ANALISES (versão, data, quem pediu, motivo, modelo, a base analisada, os arquivos com o SHA-256 e o hash da própria análise). "Todas as versões da análise" mostra as anteriores.

### 6.6.1 Leitura especialista do edital (aba Leitura do edital da ficha)

Pedido do dono (02/11/2026): uma IA que resuma o edital e diga o que realmente precisamos, com palavras-chave da Diretoria, sem inventar e sem só passar o olho: lendo linha por linha, como um especialista, e depois passando a estratégia. Só Diretoria e Administrador.

**Palavras-chave.** Há duas listas: as gerais da Diretoria (Portais e configurações > Leitura do edital; valem para todas as oportunidades) e as desta oportunidade ("Editar as palavras desta oportunidade"). Uma por linha; acento e maiúscula não contam; o plural simples entra sozinho ("atestado" acha "atestados"; "calibração" acha "calibrações"); "*" no fim procura o começo da palavra (calibr*). Motivo obrigatório; cada salvamento vira versão nova; se outra pessoa salvou antes, só o que você tirou e pôs é aplicado sobre a lista de agora (nada se perde). A busca é feita pelo SISTEMA, não pela IA: em todas as páginas de todos os arquivos com texto, com a palavra partida no fim da linha do PDF ("pri-" e "vado") juntada. Cada ocorrência mostra o arquivo, a página, a linha e a frase, com a palavra marcada. Palavra que não aparece: "não encontrada em nenhuma das N páginas", e os arquivos sem texto legível (escaneados) aparecem como não procurados.

**Ler edital inteiro.** A IA lê TODAS as páginas de todos os arquivos com texto, sem o corte de 140 mil caracteres da nota. Cada arquivo é dividido em blocos de páginas inteiras (até 18 mil caracteres e 12 páginas); cada bloco vai sozinho à IA, que aponta, nos temas da lista fixa (habilitação jurídica, fiscal e econômica, qualificação técnica, atestado, equipe e responsável técnico, visita técnica, amostra, prazo de execução e entrega, garantia, penalidade e multa, RBC/acreditação/Inmetro, pagamento, subcontratação, consórcio, registro de preços e quantidade, outro), o TRECHO do edital de cada exigência. Decisão do coordenador (02/11/2026): o item É o trecho literal do edital. A IA devolve só o tema e o trecho (o rótulo foi retirado na reconferência de 02/11/2026: rótulo enganoso, como "visita técnica obrigatória" sobre "não será exigida", era outra forma de inverter o sentido). O SISTEMA estende o que é mostrado e guardado como prova até a FRASE INTEIRA da fonte: do começo da oração ou da frase até o fim dela (. ; : de fim, quebra de parágrafo ou item numerado), no máximo 600 caracteres, com "…" quando corta pelo limite, e marca dentro dela o pedaço que a IA citou. Assim, "A vistoria técnica é obrigatória" aparece como "A vistoria técnica é obrigatória, podendo ser substituída por declaração formal...". Frase cortada pelo limite de 600 caracteres vira Pendência "frase longa: leia o restante no edital" (a rede olha até o fim real da frase). O tema é conferido por palavras mínimas específicas na frase (por exemplo, qualificação técnica: "qualificação técnica", "capacidade técnica", "responsável técnico", "acervo técnico", "CAT"; RBC e Inmetro: "acreditação", "RBC", "17025", "Inmetro", "rastreável"; "técnica", "calibração" ou "registro" soltos não bastam); sem elas, o item vai para "Tema a confirmar".

O MESMO verificador da nota confere cada trecho: tem de estar DENTRO do bloco que a IA recebeu, palavra por palavra (número com o separador entre dígitos, "0,2%" não é "2%"); trecho que corta uma negação ("admitida a participação" quando o edital diz "Não será admitida a participação") é recusado. A página e a linha são calculadas pelo sistema (posição do trecho no arquivo), nunca pela IA. Rede de segurança em todos os temas: negação ou exceção perto do trecho (na frase e na seguinte; no item impeditivo, como RBC, acreditação, registro, atestado e Inmetro, na página e na seguinte) faz do item uma Pendência "Confirmar no edital"; a rede olha também os subitens filhos da cláusula do trecho (o 8.3.1 sob o 8.3, as alíneas a) e b) sob o item) e para na cláusula irmã ou acima (8.4, 9.); além das palavras da nota, contam "podendo", "poderá ser substituída", "substituir", "desde que", "caso", "quando", "ou declaração" e "facultado". Resposta recusada é refeita até 2 vezes com os problemas apontados.

**Progresso e retomada.** A leitura segue em segundo plano (pode fechar a tela): na tela, a IA lê os primeiros blocos; o resto fica com a rotina do servidor, que continua a cada minuto até acabar ("Lendo bloco 7 de 23"). "Continuar agora" lê os próximos blocos na hora. Bloco com o mesmo texto de outro (o mesmo termo de referência em dois arquivos) é lido uma vez só. Na leitura nova (arquivos ou palavras-chave mudaram, ou "Refazer"), os blocos com o mesmo texto, as mesmas regras e as mesmas palavras-chave de uma leitura anterior são aproveitados: cada trecho é reencontrado no arquivo atual, com o arquivo (pelo SHA-256), a página e a linha de agora; só o que mudou vai à IA. Palavra-chave nova deixa a leitura desatualizada ("Ler a versão nova"), para a IA procurá-la em cada bloco. Se o servidor não entregar o texto agora (falha passageira), a leitura para e os blocos esperam na fila; sem a chave da IA, a rotina não roda até a chave voltar (abrir a tela retoma).

**Cobertura.** Por arquivo: páginas com texto lidas / total com texto, blocos lidos e o que ficou de fora. Página só com cabeçalho e rodapé (as primeiras e últimas linhas que se repetem em 3 páginas ou mais) conta à parte, como "sem texto (provável imagem)"; uma tabela de itens com linhas iguais continua sendo texto. Com página ou arquivo sem texto, a leitura fica "Concluída com páginas para ler à mão". Bloco não lido (a IA não respondeu duas vezes, recusou por conteúdo, ou a resposta foi recusada pelo verificador 3 vezes) aparece com o motivo e o botão "Ler de novo os blocos não lidos". Arquivo sem texto legível aparece para ler à mão. Arquivo maior que o corte do servidor (400 mil caracteres) é lido inteiro, em pedaços; se o servidor não entregar o resto, o arquivo aparece como "não lido inteiro", a leitura fica "Concluída com partes não lidas" e a busca das palavras-chave avisa que a palavra pode estar no resto.

**O que realmente precisamos.** Montado pelo sistema com os trechos conferidos: agrupado por tema, sem trecho repetido (o mesmo trecho, ou um trecho dentro do outro) e com todas as fontes (arquivo, página, linha, SHA-256). A tela mostra o nome do tema e, em destaque, a FRASE DO EDITAL com o pedaço citado marcado, o arquivo e a página. A IA do resumo recebe só o tema e a frase. Item marcado "Pendência" tem negação ou exceção perto: confirme no edital antes de contar como exigência.

**Resumo do edital e Estratégia sugerida.** No fim, a IA escreve o resumo e a estratégia sugerida (o que fazer primeiro, riscos, documentos a providenciar e perguntas de esclarecimento ao órgão). A tela mostra os dois sob o título "Sugestão da IA — confira nos trechos" e, junto de cada frase, os trechos dos itens citados ("Trechos citados", para abrir). Toda frase cita pelo menos um item (I1, I2...; campo do PNCP, prazo da agenda e cobertura vão junto). O prazo para pedir esclarecimento vem da agenda (calculado ou confirmado pelo sistema), nunca da IA. O verificador recusa a resposta com número (com a unidade, inclusive úteis ou corridos e "mil") ou data que não estejam inteiros em UMA das fontes citadas, fonte que não existe, frase de decisão ("vale a pena participar"), RBC sem dizer como tratar (a Metrolabs é rastreável, não acreditada), Inmetro fora de balanças e esfigmomanômetros e fabricante. Além disso, o sentido de cada frase é conferido contra os trechos dos itens citados: negação (cada "não" do trecho exige um "não" na frase; "não será inferior a" vale como "no mínimo"), exceção, limite com a direção por número (até e no máximo; no mínimo, pelo menos e a partir de; apenas e somente) e exigido ou permitido com a mesma polaridade ("não é vedada" não é "é vedada"). Frase reprovada nessa conferência é retirada da tela e listada em "Frases retiradas pelo verificador", com o motivo. A estratégia é sempre sugestão: participar ou descartar é da Diretoria. Recusado, o checklist continua valendo e "Refazer resumo e estratégia" (com motivo) tenta de novo sem reler os blocos.

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

Tetos: no máximo 3 mensagens por pessoa em cada alerta (o original, o reenvio e o escalonamento somados) e 30 mensagens de licitação por pessoa no dia (ajustáveis). O alerta crítico não entra no teto do dia. Os normais e importantes que passam do teto do dia vão juntos num resumo por e-mail (sem WhatsApp), ficam como "No resumo do dia" e continuam pendentes de ciência na faixa e na Central. O que o teto por alerta segura fica como "Não enviado", com o motivo; os dois casos ficam no histórico (ALERTA_TETO).

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

O motivo é obrigatório. Cada salvamento vira versão nova; só o que mudou é gravado (o resto fica como estava, por merge) e cada mudança vai para o histórico (de, para). Os alertas programados passam a seguir a regra nova e os que saem dela são cancelados com o motivo.

### 6.10 Kanban

Uma coluna por etapa, na ordem do pedido do dono: Radar, Em análise, Decisão, Proposta, Disputa, Resultado e Contrato.

| Coluna | O que entra |
|---|---|
| Radar | Candidatas e travadas da triagem por regras, sem decisão da Diretoria |
| Em análise | As enviadas para análise (arquivos do edital e nota da IA na ficha) |
| Decisão | As descartadas pela Diretoria, com o motivo. "Participar" entra aqui quando a etapa de preços e proposta chegar |
| Proposta | Vazia: chega na etapa de preços e proposta (tabela de preços de licitação, simulador e proposta em A4) |
| Disputa | Vazia: chega na etapa de disputas |
| Resultado | Vazia: chega na etapa de disputas (resultado de cada item) |
| Contrato | Vazia: chega na etapa de contratos |

As descartadas só pela regra do radar ficam fora do quadro (Oportunidades › Descartadas); o quadro diz quantas são.

Cartão: órgão, objeto resumido, código LIC, cidade e UF, fim das propostas com o selo de tempo, nota da IA e a classe (ou "Sem nota da IA"), responsável, selos "Trava a confirmar", "Travada (decisão da Diretoria)", "Suspensa na fonte" e, na Decisão, quem descartou, quando e o motivo. Borda vermelha: menos de 2 dias ou trava a confirmar; amarela: menos de 5 dias ou travada; cinza: descartada.

Filtros (feitos no servidor): busca, UF (ou a prioridade GO, DF, vizinhos e RJ), nota (alta, média, baixa, descarte, trava a confirmar, sem nota), prazo das propostas (7 ou 30 dias contados por dia de calendário em Brasília, de hoje em diante, como a Agenda; encerrado; sem data), responsável, situação (todas ou só em andamento, sem as descartadas) e análise por IA (situação da última análise: concluída, recusada pelo verificador, erro da IA). Oportunidade com situação que não é etapa do Kanban não some: o quadro diz quantas ficaram fora. Dentro da coluna, o prazo mais perto vem primeiro; cada coluna mostra até 120 cartões (os demais pelos filtros).

Mudar de etapa: arrastar o cartão (computador) ou "Mover para" (qualquer aparelho). Só as passagens que já existem:

| De | Para | O que acontece |
|---|---|---|
| Radar | Em análise | Enviar para análise (você fica como responsável; o servidor lê os arquivos do edital) |
| Radar ou Em análise | Decisão | Descartar (decisão da Diretoria; os alertas pendentes são cancelados) |
| Decisão (descartada) | Radar | Reabrir (a regra do radar não descarta de novo) |

O motivo é obrigatório em todas (pelo menos 10 letras) e vai para o histórico da ficha com quem, quando, de → para e a fonte "Kanban". As outras passagens ficam desabilitadas com o porquê escrito embaixo do botão (Em análise não volta direto ao Radar: descarte e reabra; Proposta, Disputa, Resultado e Contrato chegam nas próximas etapas; "Participar" exige o preço mínimo aprovado). Soltar numa coluna travada abre a janela com o porquê e "Nada foi alterado". Se outra pessoa mudou a oportunidade enquanto o quadro estava aberto, a mudança é recusada com "alguém mudou agora há pouco" e nada é alterado.

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
| Prazos nos próximos 7 e 30 dias, críticos, pendentes | LIC_EVENTOS, com a mesma regra da Agenda (sem versões substituídas, sem descartadas e sem travadas): o número bate com a lista. "Pendentes de confirmação" soma os da janela e os sem data não cancelados, como o contador da Agenda | Agenda no período |
| Alertas sem ciência | LIC_ALERTAS, a mesma regra da Central de alertas | Central de alertas, "Sem ciência" |
| Travas a confirmar | TRAVAS_A_CONFIRMAR maior que zero, só as em andamento | Kanban, nota "Trava a confirmar", só em andamento |
| Saúde do coletor | Coletor do servidor (ligado, última rodada, último sucesso, falhas seguidas no PNCP, rotas com falha), registro das chamadas (as 300 mais recentes, janela de 24 h; quando as 300 são todas das últimas 24 h, mostra "300 ou mais" e "pelo menos N com erro") e LIC_PORTAIS (operacionais, com restrições, em teste, com falha, ligados) | Portais e configurações |
| Análises por IA | Concluídas, recusadas pelo verificador e erro da IA contam oportunidades do Kanban pela situação da última análise (LIC_OPORTUNIDADES, ANALISE_SITUACAO); LIC_ANALISES dá as tentativas registradas, a última e o tempo médio (só das análises com a duração gravada, desde a etapa 4) | Kanban filtrado pela situação da análise |

Fora do servidor próprio, a saúde do coletor diz que a coleta roda só lá. Os itens 4 e 8 da revisão independente de 02/11/2026 ficaram para uma rodada seguinte, por decisão do coordenador. O Painel não atualiza sozinho: "Atualizar" conta de novo.

### 6.13 Desempenho das três telas

Cada tela lê cada aba uma vez e agrega no servidor (nada de uma chamada por cartão). Medidas de 02/11/2026, no ensaio local do servidor próprio (tempo de processamento dentro do servidor, 3 repetições):

| Dados | Kanban | Gantt (semana) | Gantt (mês) | Painel |
|---|---|---|---|---|
| Cópia da produção: 186 oportunidades, 246 prazos, 1.014 alertas | 8 a 24 ms | 15 a 22 ms | 14 a 17 ms | 57 a 79 ms |
| Volume: 388 oportunidades (260 em andamento), 1.085 prazos | 43 a 64 ms | 88 a 100 ms | 63 a 125 ms | 81 a 162 ms |

No navegador, do toque no menu até a tela pronta: 77 a 131 ms no ensaio (computador e celular). O teste automático com 260 oportunidades e 960 prazos confere que cada tela lê cada aba uma só vez.

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
- Alertas: rotina Licitacoes_rotinaAlertas a cada 5 minutos (instalada sozinha quando a Diretoria abre Licitações; agenda que mudou, programar, escalonar, enviar, concluir). Regras em LIC_CONFIG, chave ALERTAS. Propriedades: LIC_ALERTAS_IMPLANTADO_EM (primeira rodada), LIC_ALERTAS_ULTIMA_RODADA, LIC_CIENCIA_SEGREDO (assinatura dos links de ciência; gerada sozinha, nunca aparece na tela).
- Modelo do WhatsApp: sgo_licitacao_prazo (categoria Utilidade, botão de link "Confirmar ciência"), definido em NTF_MODELOS_META (SGO_Notificar.js) e cadastrado como os outros (Chaves e senhas › Cadastrar modelos na Meta, ou npx tsx scripts/cadastrar_modelos_meta.ts no servidor). A aprovação na Meta é do dono.
- Piloto do WhatsApp: a lista telefonesLicitacoes (celulares da Diretoria de Licitações) libera só o modelo sgo_licitacao_prazo vindo dos alertas de licitação, no SGO+ e no servidor (regra 7 de servicos/whatsappPiloto.ts).
- Retorno de status da Meta (sent, delivered, read, failed) e resposta CIENTE: o webhook do número do sistema chega à rota do COMMAND; o servidor confere a assinatura X-Hub-Signature-256 (META_APP_SECRET; sem a chave, o segredo da rota) e repassa os status e as respostas ao SGO+ (SGO_whatsappRetornoMeta_), que atualiza os avisos da gestão e os alertas de licitação. Sem assinatura válida, nada é repassado.
