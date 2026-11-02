# Manual do módulo Licitações (SGO+) — etapa 1

Versão de 01/11/2026. Quem usa: Diretoria e Administrador. Os demais perfis não veem o módulo.

## 1. Para que serve

O módulo Licitações acompanha as contratações públicas que interessam à Metrolabs. Nesta etapa ele faz quatro coisas:

1. Coleta, no servidor próprio do SGO+, as contratações publicadas no PNCP (Portal Nacional de Contratações Públicas), sem depender de ninguém com a tela aberta. O Compras.gov.br dados abertos é a reserva quando o PNCP falha e a fonte dos itens de cada contratação.
2. Faz a triagem por regras: separa o que interessa (candidatas), o que tem impeditivo a decidir (travadas) e o que a regra descarta (com o motivo e o trecho da fonte).
3. Mostra tudo nas telas Hoje em Licitações e Oportunidades, com a ficha básica de cada licitação e o histórico completo.
4. Mantém o cadastro dos 33 portais da missão, com o tipo de integração, a situação, o teste de conexão real, o registro das chamadas e a parametrização.

Ficam para as próximas etapas: nota de aderência de 0 a 100, leitura do edital pela IA, agenda e prazos, alertas por WhatsApp, Kanban e Gantt, tabela de preços, simulador, proposta, disputa e contratos.

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

- Exige acreditação RBC (ISO/IEC 17025): a Metrolabs não é acreditada; as calibrações são rastreáveis. Fica a pendência "o edital aceita calibração rastreável ou subcontratação de laboratório acreditado?". Quando o objeto diz que a acreditação é opcional, não trava (selo verde "Acreditação opcional").
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

Nesta etapa não há nota de 0 a 100. A lista é ordenada pela prioridade da UF (GO e DF 8; MG, BA, TO, MT, MS e RJ 6; demais do Sudeste e Sul 3; Norte e Nordeste 2) e, depois, pelo prazo de proposta mais próximo.

### 5.7 Quando as regras mudam

Mudou uma palavra, a UF, o valor mínimo ou o porte, a próxima rodada refaz a triagem de tudo o que está em aberto. A regra só muda a situação de uma oportunidade enquanto ninguém mexeu nela (no radar, ou descartada pela regra). O que a Diretoria enviou para análise ou descartou com motivo nunca é desfeito pela regra; a mudança de triagem fica só no histórico.

## 6. Telas

### 6.1 Hoje em Licitações

- Faixa da situação do coletor: última coleta, quantos registros lidos, novos, candidatos, travados e descartados; ou o motivo da falha e o que fazer.
- Números clicáveis: Para analisar, Travadas, Em análise, Prazos de proposta em 7 dias, Descartadas pela regra (7 dias), Com versão nova da fonte (7 dias).
- Prazos de proposta nos próximos 7 dias e as últimas que entraram no radar, cada uma com "Abrir ficha".
- "Atualizar" traz o que o coletor já encontrou. "Coletar agora" pede uma rodada fora da frequência (começa em até 1 minuto).

### 6.2 Oportunidades

Partes: Para analisar, Travadas, Em análise, Descartadas. Filtros: busca, UF (ou a prioridade), selo e onde é a sessão.

Cada cartão mostra a UF e a situação, o órgão e o código LIC, município, modalidade, modo de disputa, registro de preços, onde é a sessão, os selos, o objeto com o termo destacado, o número de controle, o valor estimado, o prazo de proposta com o tempo restante, o motivo, o trecho da fonte e as pendências.

Onde é a sessão: quando a publicação veio de um portal de disputa conhecido (Compras.gov.br, BLL, BNC, Licitanet, Licitar Digital, BBMNET, Licitações-e, Portal de Compras Públicas e portais estaduais), o cartão diz qual. Quando veio de um sistema municipal de gestão, a plataforma da sessão precisa ser lida no edital.

Ações:

| Botão | O que faz | Regra |
|---|---|---|
| Abrir ficha | Resumo, Fonte e Histórico | — |
| Enviar para análise | Leva para "Em análise", com você como responsável | Observação opcional |
| Descartar | Leva para "Descartadas" | Motivo obrigatório (pelo menos 10 letras) |
| Reabrir | Devolve uma descartada ao radar | Motivo obrigatório |
| Abrir no portal | Abre o processo no sistema de origem, em nova aba | Só quando a fonte informa o link |
| Ver no PNCP | Abre a contratação no site do PNCP, em nova aba | — |

### 6.3 Ficha da licitação

- Resumo: objeto completo, triagem com o trecho, pendências, fuso e as ações.
- Fonte: de onde veio, onde é a sessão, quem publicou, links, CNPJ do órgão, número da compra no Compras.gov.br, abertura e encerramento das propostas como a fonte informou, fuso, situação na fonte, última atualização na fonte, primeira coleta, última sincronia, hash da versão (SHA-256), hash da resposta original, versão das regras da triagem, tabela das versões e tabela dos itens.
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

## 8. Rastreabilidade

- Toda chamada a portal: registro no servidor (lic_conexoes_log).
- Toda resposta original: guardada com hash no servidor (prova do que estava publicado na data).
- Toda versão da fonte: linha própria, ligada à anterior, nunca alterada.
- Todo fato no SGO+ (entrada no radar, retificação, triagem refeita, descarte, análise, reabertura, parâmetro de portal, teste de conexão, regras do radar, coleta pedida): histórico com quem, quando, o quê, versão, fonte e hash.
- Nada é apagado: a situação muda.

## 9. Para o Administrador

- Chave geral do coletor: propriedade LIC_COLETOR_LIGADO ("1" liga). A tela grava a chave quando a Diretoria salva as Regras do radar; antes disso, vale o que estiver na propriedade.
- Parâmetros que o servidor lê: propriedade LIC_CFG_COLETOR (gravada pela tela; não editar à mão).
- Coleta real sob demanda no servidor: `npx tsx scripts/licitacoes_coletar.ts` (opções `--dias`, `--modalidades`, `--propostas`, `--testar`, `--sincronizar`).
- A sentinela de infraestrutura mostra o item "Coletor de licitações (PNCP e Compras.gov.br)" em Saúde da infraestrutura.
