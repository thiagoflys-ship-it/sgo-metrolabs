# Mapa de permissões do SGO+ por pessoa

Levantamento de 10/11/2026, feito só por leitura. Nada foi alterado nem publicado.

- **Código analisado (produção):** `output/comercial-20261110/base/legado` (origem: commit 26914c8, `_ORIGEM.json`).
- **Dados reais:** `output/permissoes-20261110/cadastro-e-config.txt`, `usuarios.txt` e `tabelas-acesso*.txt` (23 contas ativas, configurações de Compras, Comercial, Assistência e Licitações, registro de entradas e da Representação).
- **Arquivo para a página visual:** `matriz.json`, com os mesmos 25 módulos e 23 pessoas desta tabela.
- **Programa de conduta em detalhe:** `CONDUTA_VISIBILIDADE.md`.

---

## 1. Resumo para o dono

1. **Hoje, "Gestor" vale como administrador, qualquer que seja a área.** O sistema
   trata o perfil GESTOR como "gestão" em quase todos os módulos, sem olhar a
   área do cadastro. Elisa (RH), Bruna e Priscilla (Metrologia), Matheus
   (Qualidade) e Ricardo (Comercial) têm praticamente os mesmos poderes. A área
   só limita quatro coisas: Comercial, Compras, Assistente do ponto e os nomes
   no Programa de conduta.
2. **Qualquer gestor aprova relatório técnico de qualificação** como
   "responsável técnico". Na prática, Elisa (RH) e Ricardo (Comercial)
   conseguem aprovar um relatório de autoclave ou de cadeia de frio.
3. **A Elisa não está no perfil RH.** Ela é Gestor da área RH. As travas que o
   sistema tem para o RH (não abrir documentos técnicos, não ver o Comercial)
   só valem para o perfil RH, que ninguém usa. Por isso ela tem o acesso
   amplo de gestor.
4. **A área de cada pessoa pode ser trocada pelos próprios gestores, inclusive
   a deles.** Quem é Gestor, Diretoria, Financeiro ou Admin muda a área de
   qualquer pessoa. Um gestor que se coloque na área Qualidade passa a ver os
   nomes do Conduta e a decidir. Na área Comercial, passa a ver todas as
   vendas e custos. Na Logística, assume a gestão de Compras. Fica só um
   registro no histórico.
5. **Gestores e o Financeiro editam a conta de outras pessoas.** Podem trocar
   o perfil (inclusive promover alguém a Gestor) e o e-mail. Como o link de
   nova senha vai para o e-mail cadastrado, trocar o e-mail e pedir o link
   permite entrar na conta de outra pessoa. As contas de Admin e Diretoria
   estão protegidas; as demais, não.
6. **O Matheus Godoi tem duas contas ativas e concentra muito poder.** A conta
   `matheusgodoi` é Gestor da Qualidade, contratado PJ. A conta `energiza2209`
   é de representada, com papel de administrador de outra representada (não a
   Brasmedical). Em 06/11, essa segunda conta cadastrou como cliente o CNPJ do
   próprio Matheus. Ele é a única pessoa fora da Diretoria que vê os nomes e
   decide no Conduta. Também é comprador, faz a triagem dos chamados e pode
   transferir O.S. por uma exceção escrita no código.
7. **Localização dos carros e bloqueio da partida ficam com qualquer gestor e
   com o Financeiro.** Isso envolve a privacidade de quem dirige e a segurança
   do veículo.
8. **O "relatório interno" (dados reconstituídos) é protegido no servidor só
   por senha, sem conferir quem está usando.** A tela aparece para o
   Administrador e, por uma exceção escrita no código, para o Bento.
9. **Resolve-se muita coisa só no cadastro, sem programar** (seção 7.2): passar
   a Elisa para o perfil RH, rever a lista de compradores e de triagem,
   inativar a conta de teste do Matheus. O resto exige mudança de código
   (seção 7.3). A principal é separar "Gestor" de "Administrador" e fazer a
   área valer em todos os módulos.

---

## 2. Como o sistema decide o acesso hoje

### 2.1 Camadas, da mais forte para a mais fraca

| Camada | Regra | Onde |
|---|---|---|
| Sessão | Toda função do servidor exige sessão válida. A conta REPRESENTADA é recusada fora do módulo Representação. | `SGO_Auth.js:661-675` |
| Dono do sistema | `SGO_DONOS = ['admin']`. Só ele abre Chaves e senhas, aciona a porta da Diretoria por padrão e é tratado como Diretoria em vários módulos. | `SGO_Chaves.js:32, 135-150`; `SGO_Automacao_Predial.js:82-98, 330` |
| "Gestão de decisões" | `isAdminPerfilAuth_`: **ADMIN, DIRETORIA ou GESTOR, sem olhar a área**. É a regra mais usada (Conduta, Atividades, Auvo, Painel de qualidade, Frota, excluir cadastros, Segurança do acesso, e-mail, bate-papo e alertas). | `SGO_Auth.js:692-708` |
| "Rotina da empresa" | `SGO_PERFIS_ROTINA = ADMIN, DIRETORIA, GESTOR, RH, FINANCEIRO`. Cobre usuários e áreas, frota, avisos, atividades da equipe, Caixa de decisões, regras de compras, configuração do ponto e piloto do WhatsApp. | `SGO_Auth.js:731-776` |
| Perfil RH | Travas próprias: sem documentos técnicos, sem Comercial, sem Chaves. **Nenhuma conta usa esse perfil.** | `SGO_Auth.js:711-786`; menu `JS_Core.html:877-884`, `:898-907` |
| Área do cadastro | Só alguns módulos olham a área (tabela 2.2). | `SGO_Areas.js` (coluna `CAD_USUARIOS.AREA`) |
| Listas de configuração | Compradores, triagem, gestores comerciais, responsáveis por área e outras (tabela 2.3). | abas `*_CONFIG` |
| Exceções no código | IDs e logins escritos no programa (tabela 2.4). | vários |
| Menu (tela) | Esconde quase nada: só o cliente, a representada, o RH e alguns grupos que esperam a resposta do servidor. **Quem decide de verdade é o servidor.** | `JS_Core.html:831-885` |

### 2.2 Onde a área do cadastro faz diferença

| Módulo | Como a área entra | Onde |
|---|---|---|
| Comercial | Gestão = ADMIN, DIRETORIA, dono, **GESTOR com área COMERCIAL** ou lista de gestores. Vendedor = perfil COMERCIAL ou área COMERCIAL. Financeiro = perfil ou área FINANCEIRO. | `SGO_Comercial_Config.js:813-840` |
| Compras | Gestão = ADMIN, DIRETORIA, dono ou **GESTOR da área de Compras** (`areaCompras = LOGISTICA`). Todo GESTOR vê a fila e os valores. | `SGO_Compras_Config.js:427-443` |
| Assistência técnica | Gestão = ADMIN, DIRETORIA, dono, **GESTOR da área TECNICA** ou responsável TECNICA na Caixa de decisões. Técnico = perfil TECNICO ou área TECNICA. Mas as regras, a exclusão e os valores ficam com **qualquer GESTOR**. | `SGO_Assistencia_Config.js:941-966` |
| Assistente do ponto | **Área RH** vê e trata o ponto de todos. GESTOR vê só a própria área. A configuração geral é da rotina (inclui o Financeiro). | `SGO_Ponto_Config.js:339-344, 382-410` |
| Programa de conduta (nomes) | Só a Diretoria, o dono e **GESTOR/ADMIN da área QUALIDADE** veem quem é o envolvido e decidem. | `SGO_Conduta_Ocorrencias.js:170-207` |
| Caixa de decisões (sigilo) | Itens sigilosos só para Diretoria e Qualidade. Fora isso, **todo GESTOR vê as pendências de todas as áreas**. O Financeiro só vê os itens dele. | `SGO_Gestao_Decisoes.js:362-364, 750-757` |
| Relatórios da empresa (com nomes) | Mesma regra do sigilo do Conduta. | `SGO_Gestao_RelatoriosEmpresa.js:70-82` |

**Em todos os outros módulos a área não conta:** um GESTOR do RH e um GESTOR da
Metrologia têm o mesmo acesso.

### 2.3 Listas de configuração em uso (dados de produção)

| Lista | Quem está | Efeito | Onde |
|---|---|---|---|
| Compradores (`CMP_CONFIG.REGRAS.compradores`) | charles, guilherme, matheusgodoi, monica, ricardo | Cotam, veem a fila e os valores de todas as compras, aprovam até R$ 1.000 e veem os cartões. | `SGO_Compras_Config.js:433-441`; `SGO_Compras_Cotacoes.js:133-140` |
| Substitutos de compras | vazia | — | idem |
| Área de Compras | LOGISTICA (ninguém é GESTOR nela) | A "gestão de Compras" fica só com Admin e Diretoria. | `SGO_Compras_Config.js:432` |
| "financeiros" de Compras | elisa, matheusgodoi | **O código não lê essa chave** (ignora chave fora do padrão). Não dá acesso nenhum. | `SGO_Compras_Config.js:317-339` |
| Triagem da Assistência (`ATEC_CONFIG.REGRAS.triagem.responsaveis`) | bruna, charles, bento, matheusgodoi, ricardo | Recebem os chamados novos e fazem a triagem antes da fila livre. | `SGO_Assistencia_Chamados.js:41-63` |
| Responsáveis pela Representação | vazia | Administração da Representação fica com ADMIN, DIRETORIA e todo GESTOR. | `SGO_Representacao.js:506` |
| Gestores do Comercial (`COM_CONFIG.METODOLOGIA.gestores`) | vazia | A gestão comercial vem só do Ricardo (GESTOR + área COMERCIAL), da Diretoria e do Admin. | `SGO_Comercial_Config.js:813-817` |
| Permissões da automação (`AUT_PERMISSOES`) | vazia | Valem as regras padrão: portões para toda a equipe, porta da Diretoria para o dono. | `SGO_Automacao_Predial.js:307-336` |
| Responsáveis por área (Caixa de decisões, `GES_CONFIG.gestoresPorArea`) | **não extraída** | Pode tornar alguém gestão da Assistência (TECNICA), do Comercial, de Compras ou do ponto. Conferir. | `SGO_Gestao_Decisoes.js:235-238, 305-311` |

### 2.4 Exceções escritas no código (por ID ou login)

| Exceção | Pessoa | Efeito | Onde |
|---|---|---|---|
| Dono do sistema | `admin` | Chaves e senhas, porta da Diretoria, tratado como Diretoria. | `SGO_Chaves.js:32` |
| "Conta do sistema" | `admin` | A conta pessoal do Thiago é tratada como conta técnica: fica fora das listas da equipe e do cálculo do Conduta. | `SGO_Areas.js:140-143`; `SGO_Conduta_Ciencia.js:35`; `SGO_Usuarios.js:1136` |
| Transferir O.S. | Bruna e Matheus (IDs fixos) | Distribuem O.S. sem ser da gestão técnica. | `SGO_Assistencia_OS.js:628-633` |
| Relatório interno | Bento (ID e login fixos) | A tela de dados reconstituídos aparece para ele. Está em 4 módulos (Autoclave, Lavadora, Cadeia de frio, Estufa). | `SGO_AutoRel_ConteudoModulo.js`, `SGO_LavRel_ConteudoModulo.js`, `SGO_CadeiaFrioRel_ConteudoModulo.js`, `SGO_EstufaBanhoRel_ConteudoModulo.js` (função `SGO_podeRelatorioInterno_`) |

### 2.5 Quem aprova relatório técnico

Os relatórios de qualificação (Autoclave, Lavadora, Cadeia de frio,
Estufa/Banho-maria) são aprovados pelos perfis **ADMIN, DIRETORIA, GESTOR e
METROLOGIA**. Baixa temperatura: ADMIN, DIRETORIA e GESTOR. A conferência
olha só o perfil (`SGO_QualifEmissao.js:34-37`). Listas em
`SGO_AutoRel_Config.js:341`, `SGO_LavRel_Config.js:257`,
`SGO_CadeiaFrioRel_Qualificacao.js:38`, `SGO_EstufaBanhoRel_Qualif.js:39` e
`SGO_BaixaTemp_Config.js:43`.

Comercial e Financeiro só consultam a Calibração e a NR-13
(`SGO_CertCal_Main.js`, função `CertCal_perfilSoConsulta_`;
`SGO_NR13_Main.js:73-74`). Nas qualificações térmicas não há essa trava.

---

## 3. Legenda dos níveis

| Código | Nível | Significa |
|---|---|---|
| — | nenhum | Não abre, ou o servidor recusa. |
| V | ver | Consulta (às vezes só uma parte, ver a observação no `matriz.json`). |
| O | operar | Cria e edita o próprio trabalho no módulo. |
| Ap | aprovar | Decide, aprova ou vê dados de toda a equipe. |
| Ad | administrar | Muda regras, configura ou exclui; vê tudo. |

---

## 4. Matriz real por pessoa

¹ hidelbrandosampaio, paulohenrique, gabrielpereira, joaopedro, rafael.marques e
gabrieldias têm o mesmo acesso (TECNICO, área TECNICA, CLT).
² hst, hcn e ndi (perfil CLIENTE, cada um ligado ao próprio cliente).

| Módulo | admin | charles | matheusgodoi | elisa | bruna | priscilla | ricardo | wanessa | monica | beatriz | bento | guilherme | 6 técnicos TECNICA¹ | 3 clientes² | qualidade (Brasmedical) | energiza2209 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Início e minhas atividades | O | O | O | O | O | O | O | O | O | O | O | O | O | — | — | — |
| Atividades da equipe | Ad | Ad | Ad | Ad | Ad | Ad | Ad | Ad | V | V | V | V | V | — | — | — |
| Avisos e bate-papo | Ad | Ad | Ad | Ad | Ad | Ad | Ad | O | O | O | O | O | O | — | — | — |
| Assistente do ponto | Ad | Ad | O | Ad | O | O | O | O | V | V | — | V | V | — | — | — |
| E-mail integrado | Ad | O | O | O | O | O | O | O | O | O | O | O | O | — | — | — |
| Qualificações térmicas e NR-13 | Ad | Ap | Ap | Ap | Ap | Ap | Ap | O | O | Ap | O | O | O | — | — | — |
| Calibração e padrões | Ad | O | O | O | O | O | O | V | V | O | O | O | O | — | — | — |
| Documentos técnicos e planejamento | Ad | O | O | O | O | O | O | O | O | O | O | O | O | — | — | — |
| Assistência técnica (chamados/O.S.) | Ad | Ad | Ad | Ap | Ap | Ap | Ap | V | V | V | O | O | O | — | — | — |
| Integração Auvo e painel de qualidade | Ad | Ad | Ad | Ad | Ad | Ad | Ad | — | — | — | — | — | — | — | — | — |
| Frota (uso) | O | O | O | O | O | O | O | O | O | O | O | O | O | — | — | — |
| Frota (gestão, rastreamento e bloqueio) | Ad | Ad | Ad | Ad | Ad | Ad | Ad | Ad | — | — | — | — | — | — | — | — |
| Comercial | Ad | Ad | V | V | V | V | Ad | O | O | — | — | — | — | — | — | — |
| Compras (pedidos e fila) | Ad | Ad | Ap | Ap | Ap | Ap | Ap | Ad | Ap | O | O | Ap | O | — | — | — |
| Compras (financeiro e cartões) | Ad | Ad | V | V | V | V | V | Ad | V | — | — | V | — | — | — | — |
| Licitações | Ad | Ad | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Representação | Ad | Ad | Ad | Ad | Ad | Ad | Ad | V | V | V | V | V | V | — | O | Ad |
| Cadastros e documentos | Ad | Ad | Ad | Ad | Ad | Ad | Ad | O | O | O | O | O | O | — | — | — |
| Caixa de decisões e desempenho | Ad | Ad | Ap | Ap | Ap | Ap | Ap | O | — | — | — | — | — | — | — | — |
| Programa de conduta | Ad | Ad | Ad | Ap | Ap | Ap | Ap | O | O | O | O | O | O | — | — | — |
| Usuários e áreas | Ad | Ad | Ad | Ad | Ad | Ad | Ad | Ad | — | — | — | — | — | — | — | — |
| Segurança do acesso | Ad | V | V | V | V | V | V | — | — | — | — | — | — | — | — | — |
| Chaves, integrações e configurações | Ad | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Automação predial | Ad | Ad | O | O | O | O | O | O | O | O | O | O | O | — | — | — |
| Portal do cliente | — | — | — | — | — | — | — | — | — | — | — | — | — | O | — | — |

**Leitura rápida das colunas dos gestores:** as cinco colunas de GESTOR são
quase iguais. A diferença vem só da área (Comercial para o Ricardo, ponto de
todos para a Elisa, nomes do Conduta para o Matheus) e das listas (comprador,
triagem).

**"Comercial = V" para Matheus, Elisa, Bruna e Priscilla:** eles não entram nas
vendas, mas o servidor abre para qualquer GESTOR os **contatos dos clientes**
(nome, telefone, e-mail), que são dados pessoais
(`SGO_Comercial_Contatos.js:22`).

**Valores e dados sigilosos:**

| Tipo de dado | Quem vê hoje |
|---|---|
| Valor de venda | Gestão comercial (admin, charles, ricardo), Mônica (só as dela), Wanessa (só os pedidos aprovados). |
| Custo de produtos e serviços | admin, charles, ricardo e Wanessa (catálogo completo). Mônica não vê. |
| Valores de compras | Compradores, **todo GESTOR**, Financeiro e Diretoria. Os demais acompanham os próprios pedidos sem valor. |
| Valores de orçamento da Assistência | Gestão, **todo GESTOR**, Comercial e Financeiro. Técnicos não veem. |
| Cartões da empresa | Financeiro, Diretoria e Admin editam. Compradores e todo GESTOR veem. |
| Nomes no Programa de conduta | admin, charles e matheusgodoi. |
| Valores do Conduta por pessoa (bônus e missões) | **Todo GESTOR**, Diretoria e Admin. |
| Ponto de todos | admin, charles e elisa (área RH). Gestores veem só a própria área. |
| Localização dos veículos | **Todo GESTOR**, Financeiro, Diretoria e Admin. |
| Registro de entradas (IP, aparelho, horário) | **Todo GESTOR**, Diretoria e Admin. |
| Chaves e senhas das integrações | Só admin. |

---

## 5. Ficha de cada pessoa

| Login | Perfil / área / vínculo | Fonte das permissões | Destaques |
|---|---|---|---|
| admin (Thiago) | ADMIN / DIRETORIA / DIRETORIA | Perfil ADMIN e dono no código | Tudo. Único em Chaves e senhas, em excluir contas e em mexer em contas Admin. Aciona a porta da Diretoria. Usa o relatório interno. É tratado também como "conta do sistema". |
| charles | DIRETORIA / DIRETORIA / DIRETORIA | Perfil DIRETORIA; compradores; triagem | Gestão em quase tudo, Licitações, decide o Conduta, aprova a faixa da Diretoria em Compras. Não abre Chaves. Porta da Diretoria: só vê. |
| matheusgodoi | GESTOR / QUALIDADE / PJ | GESTOR; área QUALIDADE; compradores; triagem; ID fixo (O.S.); "financeiros" (sem efeito) | Tudo de gestor, mais: vê nomes e decide no Conduta, comprador, triagem, transfere O.S. Tem a segunda conta `energiza2209`. |
| elisa | GESTOR / RH / CLT | GESTOR; área RH; "financeiros" (sem efeito) | Tudo de gestor, inclusive aprovar relatório técnico e administrar Representação. Ponto de todos pela área RH. As travas do perfil RH não se aplicam a ela. |
| bruna | GESTOR / METROLOGIA / CLT | GESTOR; triagem; ID fixo (O.S.) | Tudo de gestor, mais triagem e transferência de O.S. |
| priscilla | GESTOR / METROLOGIA / CLT | GESTOR | Tudo de gestor. |
| ricardo | GESTOR / COMERCIAL / PJ | GESTOR; área COMERCIAL; compradores; triagem | Gestão comercial completa (com custo), mais tudo de gestor: aprova relatório técnico, administra usuários, frota, Conduta (missões e fechamento). |
| wanessa | FINANCEIRO / FINANCEIRO / CLT | Perfil FINANCEIRO (rotina) | Conferência de compras, cartões e faturas. Também: usuários e áreas, rastreamento e bloqueio da frota, regras de compras, configuração do ponto. Comercial: pedidos aprovados e catálogo com custo. Pode gerar relatório técnico, não aprova. |
| monica | COMERCIAL / COMERCIAL / CLT | Perfil COMERCIAL; compradores | Vendedora (só as próprias oportunidades), compradora (aprova até R$ 1.000, vê todas as compras). Vê todos os chamados com valor. |
| beatriz | METROLOGIA / METROLOGIA / CLT | Perfil METROLOGIA | Aprova relatório técnico. Vê todos os chamados (sem valor). Pede compras. |
| bento | TECNICO / METROLOGIA / PJ | TECNICO; triagem; exceção no código | Técnico, faz triagem de chamados, tela do relatório interno liberada. PJ: fora do ponto. |
| guilherme | TECNICO / LOGISTICA / CLT | TECNICO; compradores | Técnico e comprador: vê todas as compras, aprova até R$ 1.000, vê cartões. |
| 6 técnicos TECNICA | TECNICO / TECNICA / CLT | Perfil TECNICO | Trabalho técnico, os próprios chamados e O.S., frota, pedir compras, o próprio Conduta. `rafael.marques` não tem entrada no registro. |
| hst, hcn, ndi | CLIENTE | Perfil CLIENTE + CLIENTE_ID | Só o portal da própria empresa. Nenhum entrou no período do registro. |
| qualidade | REPRESENTADA / ATENDENTE | Papel na Representação | Brasmedical: abre pedidos, cadastra cliente/equipamento, conversa, cancela. |
| energiza2209 | REPRESENTADA / ADMIN | Papel na Representação | Matheus como administrador de **outra** representada (id 82fb2242…). Usada em 06/11 (buscas de teste e cadastro do CNPJ 46.809.235/0001-20 "MATHEUS TEIXEIRA DE GODOI"). |

As observações por módulo e por pessoa estão no `matriz.json` (campo `obs`).

---

## 6. Confusões e riscos

### 6.1 Gravidade alta

| # | O que acontece | Quem | Caminho no código |
|---|---|---|---|
| A1 | **Gestor = administrador, em qualquer área.** A regra de "gestão" aceita qualquer GESTOR. O gestor do RH, da Metrologia, da Qualidade e do Comercial têm o mesmo poder em Conduta, Atividades, Auvo, Painel de qualidade, Frota, Segurança do acesso, exclusão de cadastros, Representação e bate-papo. | elisa, bruna, priscilla, matheusgodoi, ricardo | `SGO_Auth.js:705-708` e usos em `SGO_Conduta_Ocorrencias.js:157-168`, `SGO_Atividades.js:160-167`, `SGO_Frota_Main.js:620-624`, `SGO_Qualidade_Main.js:15-19`, `SGO_Auvo_Main.js:34-35`, `SGO_SegurancaAcesso.js:1046-1048`, `SGO_Representacao.js:506`, `SGO_ComunicacaoAdaptador.js:101-102` |
| A2 | **Aprovação de relatório técnico por quem não é da área técnica.** Todo GESTOR é "responsável técnico" nas qualificações. | elisa, ricardo (e os demais gestores) | `SGO_QualifEmissao.js:34-37`; listas na seção 2.5 |
| A3 | **A Elisa não tem as travas do RH.** O perfil RH foi feito para impedir documentos técnicos e o Comercial, mas ela é GESTOR. | elisa | `SGO_Auth.js:711-786`; `JS_Core.html:877-884` |
| A4 | **Qualquer um da rotina muda a própria área** (e a dos outros) e ganha o acesso daquela área: Qualidade (nomes do Conduta), Comercial (vendas e custos), Logística (gestão de Compras), RH (ponto de todos), Técnica (gestão da Assistência). | todos os GESTOR, wanessa, charles | `SGO_Areas.js:187-193, 291-307`; `SGO_Usuarios.js:357, 409, 641` |
| A5 | **Edição de contas alheias por gestores e Financeiro:** troca de perfil (até para GESTOR) e de e-mail. Com o e-mail trocado, o link de nova senha vai para quem fez a troca. Só ADMIN e DIRETORIA estão protegidos. | todos os GESTOR, wanessa | `SGO_Usuarios.js:74-79, 247-260, 329-421, 581` |
| A6 | **Duas contas da mesma pessoa, uma de teste em produção.** `energiza2209` é administradora de outra representada e criou um cliente com o CNPJ do próprio Matheus. Some-se a isso a concentração de papéis na conta `matheusgodoi` (Conduta, compras, triagem, O.S.), que é de um PJ. | matheusgodoi / energiza2209 | `REP_ACESSOS` de 06/11; `SGO_Assistencia_OS.js:628-633`; `SGO_Conduta_Ocorrencias.js:180-188` |
| A7 | **Relatório interno protegido só por senha no servidor.** A função que gera os dados reconstituídos (com resultado "aprovado" ou "reprovado" escolhido) não confere o perfil. A tela é liberada por exceção ao Bento. | bento, admin | `SGO_AutoRel_Simulador.js:7-11`; `SGO_AutoRel_ConteudoModulo.js` (`bentoAutorizado`) e as 3 cópias |
| A8 | **Rastreamento e bloqueio da partida** com qualquer GESTOR e o Financeiro. | todos os GESTOR, wanessa | `SGO_Frota_Rastreamento.js:358-362`; `SGO_Frota_Bloqueio.js:1193-1196`; `SGO_Frota_Rastreador.js:1091-1095` |

### 6.2 Gravidade média

| # | O que acontece | Caminho no código |
|---|---|---|
| M1 | Contatos dos clientes do Comercial abertos a qualquer GESTOR, que o próprio Comercial recusa. | `SGO_Comercial_Contatos.js:22` × `SGO_Comercial_Config.js:823-840` |
| M2 | Lista de compradores com Diretoria, dois PJ, a vendedora e um técnico. Todos veem todas as compras e aprovam até R$ 1.000. A área de Compras (LOGISTICA) não tem gestor. | `CMP_CONFIG`; `SGO_Compras_Config.js:433-442, 485-492` |
| M3 | A lista "financeiros" (Elisa e Matheus) está gravada nas regras de Compras, mas o código a ignora. | `SGO_Compras_Config.js:329-335` |
| M4 | Regras de compras (compradores, faixas) editáveis por qualquer GESTOR e pelo Financeiro: alguém pode se colocar como comprador. | `SGO_Compras_Config.js:440-442` |
| M5 | Regras e prazos da Assistência e exclusão de chamados com qualquer GESTOR. Não há GESTOR da área TECNICA, então a gestão técnica de fato é só admin e charles. Triagem com pessoas da Qualidade e do Comercial. | `SGO_Assistencia_Config.js:950-964`; `ATEC_CONFIG.triagem` |
| M6 | Conduta: qualquer gestor aprova missão (R$ 300), lança e remove ausência, fecha o mês e vê o valor de cada pessoa. O relatório de missões revela quem teve infração gravíssima. Detalhes em `CONDUTA_VISIBILIDADE.md`. | `SGO_Conduta_Missao.js:157-158`; `SGO_Conduta_Ausencia.js:14, 56`; `SGO_Conduta_Fechamento.js:17, 116`; `SGO_Conduta_RelatoriosGerenciais.js:181` |
| M7 | Registro de entradas de todos (IP, aparelho, horários) visível a qualquer GESTOR. | `SGO_SegurancaAcesso.js:1046-1048` |
| M8 | Atividades restritas do Conduta de outras pessoas visíveis a qualquer GESTOR. | `SGO_Atividades.js:164-172` |
| M9 | Caixa de decisões: todo GESTOR vê as pendências de todas as áreas. | `SGO_Gestao_Decisoes.js:750-764` |
| M10 | Qualquer GESTOR administra representadas, catálogo e usuários delas. | `SGO_Representacao.js:506-507` |
| M11 | Bate-papo: qualquer GESTOR lê "Recebidas pelo WhatsApp", publica comunicados e edita qualquer grupo. | `SGO_ComunicacaoAdaptador.js:101-102`; `Comunicacao.js:547, 594, 1058` |
| M12 | O Financeiro faz "rotina" ampla: usuários, frota com rastreamento, regras de compras, configuração do ponto. | `SGO_Auth.js:750`; `SGO_Usuarios.js:70-79`; `SGO_Ponto_Config.js:398` |
| M13 | Regras diferentes em módulos parecidos: Comercial e Financeiro só consultam Calibração e NR-13, mas podem gerar qualificações térmicas. | `SGO_NR13_Main.js:73-74`; `CertCal_perfilSoConsulta_` |
| M14 | Exceções por pessoa escritas no código (Bruna e Matheus nas O.S., Bento no relatório interno). Mudar a pessoa exige programar e publicar. | seção 2.4 |

### 6.3 Gravidade baixa

| # | O que acontece |
|---|---|
| B1 | Contas ativas sem nenhuma entrada no registro: hst, hcn, ndi e rafael.marques. Confirmar se ainda são necessárias. |
| B2 | A conta pessoal do dono (`admin`) também é tratada como "conta do sistema" (`SGO_Areas.js:140-143`): fica fora das listas da equipe e do cálculo do Conduta. Se for intencional, registrar a decisão. |
| B3 | Configurações não extraídas que podem ampliar acessos: responsáveis por área na Caixa de decisões, responsáveis do modo personalizado, caixas de e-mail compartilhadas e a lista de quem abre pedido em nome da representada. |

### 6.4 Tela × servidor

- **O menu quase não esconde nada.** Para um gestor, praticamente todos os
  grupos aparecem. O servidor recusa depois com a mensagem certa (Comercial,
  Compras, Licitações). Não é falha de segurança, mas confunde a pessoa
  (`JS_Core.html:831-885`).
- **O menu do RH não serve para a Elisa**, porque a lista `SGO_TELAS_RH` só vale
  para o perfil RH.
- **Telas do Conduta oferecem funções que o servidor nega** (extrato de outra
  pessoa, relatório da equipe, sugestões e Kanban no celular). Detalhes em
  `CONDUTA_VISIBILIDADE.md`.
- **Relatório interno:** a tela esconde, mas o servidor aceita qualquer sessão
  que tenha a senha.
- **Pontos positivos:** a representada é barrada fora do módulo dela
  (`SGO_Auth.js:670-672`); o cliente só vê a própria empresa
  (`SGO_Assistencia_Chamados.js:17-18` e `CertCal_exigirAcessoCliente_`); Licitações e
  Chaves são realmente fechados; o ponto respeita a área.

---

## 7. Proposta de organização

### 7.1 Matriz recomendada: o perfil diz o nível, a área diz o alcance

Princípio: **o perfil define o que a pessoa pode fazer; a área define sobre o
quê.** Um Gestor decide na área dele, não na empresa toda. Ver tudo é da
Diretoria. Configurar o sistema é do Administrador.

| Módulo | Colaborador (Técnico, Metrologia) | Vendedor (Comercial) | Financeiro | RH | Gestor de área | Gestor de Qualidade | Diretoria | Administrador | Cliente | Representada |
|---|---|---|---|---|---|---|---|---|---|---|
| Início, atividades, avisos, bate-papo | operar | operar | operar | operar + avisos | aprovar (área) | aprovar (área) | administrar | administrar | — | — |
| Assistente do ponto | próprio | próprio | próprio | administrar | ver (área) | ver (área) | ver tudo | administrar | — | — |
| Qualificações, calibração, documentos técnicos | operar; Metrologia aprova | ver | ver | — | aprovar **só Metrologia/Técnica** | ver | aprovar | administrar | portal | — |
| Assistência técnica | operar (próprios) | ver (sem custo) | ver valores | — | aprovar **só Técnica** | ver | administrar | administrar | portal | Representação |
| Frota (uso) | operar | operar | operar | operar | operar | operar | operar | operar | — | — |
| Frota (gestão, rastreamento, bloqueio) | — | — | ver custos | ver condutores/CNH | ver (área), sem bloqueio | — | administrar | administrar | — | — |
| Comercial | — | operar (próprios) | pedidos aprovados | — | administrar **só Comercial** | — | administrar | administrar | — | — |
| Compras | pedir | pedir | conferência e pagamento | pedir | aprovar faixa da área | pedir | aprovar faixa Diretoria | administrar | — | — |
| Regras de compras | — | — | — | — | — | — | administrar | administrar | — | — |
| Licitações | — | — | — | — | — | — | administrar | administrar | — | — |
| Representação | ver | ver | ver | — | ver | ver | administrar | administrar | — | papel na empresa |
| Cadastros | operar | operar | operar | operar | aprovar (excluir) | operar | administrar | administrar | portal | — |
| Caixa de decisões | — | — | itens próprios | itens próprios | itens da área | itens da área + sigilo | tudo | tudo | — | — |
| Programa de conduta | próprio + registrar | próprio | próprio | consultar sem nomes | consultar a área, sem nomes | decidir com nomes | decidir; fechar o mês | administrar | — | — |
| Usuários e áreas | — | — | — | operar (sem mudar perfil) | — | — | administrar | administrar | — | — |
| Segurança do acesso | — | — | — | — | — | — | ver | administrar | — | — |
| Chaves e configurações | — | — | — | — | — | — | — | administrar | — | — |
| Automação predial | portões | portões | portões | portões | portões | portões | + porta Diretoria (se concedida) | tudo | — | — |

### 7.2 O que dá para resolver já, só no cadastro e nas configurações (sem programar)

Quem faz: o Administrador (ninguém muda o próprio perfil).

1. **Elisa: mudar o perfil de GESTOR para RH, mantendo a área RH.** Ela continua
   com o ponto de todos (pela área), usuários, frota, avisos, atividades da
   equipe e a consulta do Conduta. Deixa de aprovar relatório técnico, ver
   contatos de clientes, administrar Representação, Auvo e Painel de qualidade,
   ver o registro de entradas e aprovar missões do Conduta. *Conferir antes* se
   ela precisa decidir algo na Caixa de decisões: o RH vê só os itens em que é
   responsável.
2. **Matheus: inativar a conta `energiza2209`.** Se for preciso testar a
   Representação, criar uma representada de teste com nome claro e e-mail que
   não seja de colaborador. Revisar o cliente "MATHEUS TEIXEIRA DE GODOI"
   criado em 06/11.
3. **Compradores: deixar só quem compra de fato.** Avaliar retirar Matheus,
   Ricardo e Mônica da lista. Se a área de Compras é a Logística, definir quem
   é o gestor dela ou mudar `areaCompras`.
4. **Apagar a chave "financeiros" das regras de Compras** (não tem efeito e
   confunde) ou registrar que ela não vale.
5. **Triagem da Assistência:** rever se Ricardo e Matheus devem receber
   chamados novos. Definir um responsável da área TECNICA em Caixa de decisões >
   Regras e responsáveis, para a gestão técnica não depender só do admin e do
   Charles.
6. **Ricardo, se o objetivo for só o Comercial:** perfil COMERCIAL + incluí-lo em
   "gestores" da Metodologia comercial (`COM_CONFIG.METODOLOGIA.gestores`). Ele
   continua com a gestão comercial completa (`SGO_Comercial_Config.js:826`) e
   perde os poderes gerais de gestor. Perde também a Caixa de decisões e o
   acompanhamento do ponto da área: decidir antes.
7. **Contas sem uso** (hst, hcn, ndi, rafael.marques): confirmar com os
   responsáveis; inativar o que não for usado.
8. **Conferir as configurações não extraídas** (responsáveis por área na Caixa
   de decisões, responsáveis do modo personalizado, caixas de e-mail) com a
   mesma régua.
9. **Acompanhar o histórico** `USUARIOS_AREA` e `USUARIOS_ATUALIZAR` até a
   correção de código: qualquer mudança de área ou de e-mail feita por gestor
   deve ser conferida.

### 7.3 O que exige mudança de código

| Prioridade | Mudança | Resolve |
|---|---|---|
| 1 | Ninguém muda a **própria área**. Pôr ou tirar alguém das áreas QUALIDADE, COMERCIAL, RH, TECNICA ou da área de Compras fica só com Diretoria ou Administrador. | A4 |
| 1 | **Trocar e-mail e perfil de outra pessoa** só com Administrador (ou Diretoria); o link de nova senha vai também para o e-mail antigo, com aviso. Gestor e Financeiro não promovem ninguém a Gestor. | A5 |
| 1 | **Aprovador de relatório técnico pela área**, não só pelo perfil (Metrologia/Técnica/Qualidade ou lista de responsáveis técnicos), em todos os geradores. | A2 |
| 1 | **Relatório interno:** conferir o perfil no servidor (além da senha) e trocar a exceção do Bento por uma lista configurável e registrada. | A7 |
| 2 | **Separar "Gestor" de "Administrador":** a regra de gestão passa a considerar a área (o gestor vê e decide a área dele). Diretoria e Admin continuam vendo tudo. Começar por Conduta (missões, ausências, fechamento), Frota (rastreamento e bloqueio), Segurança do acesso, Auvo/Painel de qualidade, Representação e Atividades restritas. | A1, A8, M6 a M10 |
| 2 | Contatos de clientes com a mesma regra do Comercial. | M1 |
| 2 | Regras de compras e regras da Assistência só com Diretoria e Admin (ou o gestor da área correspondente). | M4, M5 |
| 3 | Trocar os IDs fixos (Bruna e Matheus nas O.S.) por uma lista na configuração da Assistência. | M14 |
| 3 | Limitar a rotina do Financeiro ao que é financeiro (tirar usuários, rastreamento e configuração do ponto, ou torná-los opcionais). | M12 |
| 3 | Mesma regra de "só consulta" para Comercial e Financeiro em todos os documentos técnicos. | M13 |
| 3 | Menu por perfil e área, alinhado ao servidor, para não oferecer telas que vão dar erro. | 6.4 |

Toda mudança de código deve seguir a regra da casa: testes, backup e
reversão, conferência da versão em produção e atualização do manual e da
ajuda de cada tela no mesmo pacote.

---

## 8. Limites desta análise

- **Fontes:** código e dados de produção listados no topo. Não houve teste em
  tela. Os níveis vêm da leitura das travas do servidor; onde só a tela foi
  vista, a observação diz isso.
- **Configurações não extraídas** (podem ampliar acessos): `GES_CONFIG`
  (responsáveis por área), responsáveis do modo personalizado (propriedades do
  script), caixas de e-mail compartilhadas e a lista de quem abre pedido em
  nome da representada.
- **Período do registro:** a ausência de entrada vale só para o período coberto
  por `SYS_SEGURANCA_ACESSO` no arquivo extraído.
- **O módulo Financeiro do servidor novo** (`sgo_servidor`), se existir, não
  faz parte deste código e não foi avaliado. Aqui o "financeiro" é o de Compras
  (conferência, cartões, faturas e contas a pagar).
