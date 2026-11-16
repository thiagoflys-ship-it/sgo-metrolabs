# Programa de conduta: relato da ocorrência (16/11/2026)

**Problema relatado pelo dono.** Na lista de ocorrências, nem o dono (admin), nem o Charles (Diretoria), nem o Matheus (matheusgodoi, gestor da Qualidade) conseguiam abrir o relato de uma ocorrência. Depois de um tempo, ninguém lembrava o que tinha sido relatado.

**Situação.** O trabalho está pronto na pasta candidata `output/conduta-20261116/cand`. **Nada foi publicado.** Também não houve commit e nenhum acesso ao servidor ou ao banco.

## 1. Diagnóstico

### O relato é gravado
O relato é gravado normalmente, no campo `DESCRICAO` da aba `qual_ocorrencia`:
- o texto chega pelo formulário "O que aconteceu";
- `SGO_Conduta_Ocorrencias.js:773` lê o texto;
- `SGO_Conduta_Ocorrencias.js:828` grava o campo.

Junto com o relato ficam gravados:
- `FOTO_URL` e `FOTO_LEGENDA`;
- `FISCAL_ID` (quem registrou) e `CRIADO_EM` (quando);
- `HISTORICO_JSON`, existente desde 19/10/2026;
- os textos de contestação, recurso e julgamento.

### O servidor já devolve o relato
`Conduta_apiListarOcorrencias` (`:854`, normalização em `:941`) já devolve `DESCRICAO` para quem vê a ocorrência.

### A falha está na tela
A tela só mostra o relato em `tplConduta_detalheOcorrenciaHtml_`, dentro do módulo (`SGO_Conduta_ConteudoModulo.js`, linha 521 do HTML decodificado). Essa função é chamada **apenas** pelas janelas "Homologar" (situação Registrada) e "Julgar" (situações Contestada e Em recurso).

Para as demais situações, `tplConduta_acoesOcorrencia_` (linhas 234 a 282 do HTML decodificado) oferece só "Ver foto" e "Contestar" ou "Recorrer". Isso vale para Homologada, Firme, Anulada, Descartada e Rejeitada, que eram justamente as linhas da tela do dono. Nenhum desses botões mostra o texto.

Há um agravante desde 28/10/2026. Toda ocorrência registrada pela Diretoria ou pelo dono já nasce homologada. Por isso, ela **nunca** passa pela janela "Homologar", e o relato nunca aparecia em lugar nenhum.

### Não é problema de permissão
- O dono passa pela regra do sigilo como dono do sistema.
- O Charles passa pelo perfil Diretoria.
- O Matheus passa pela regra de `Conduta_veIdentidadeUsuario_` (`:185`): perfil GESTOR, área QUALIDADE, ativo, conforme o cadastro conferido em `output/poderes-20261110/cadastro-e-config.txt`.

Os três já viam a lista inteira, com os nomes. O que faltava era o botão.

## 2. O que mudou

### `cand/SGO_Conduta_Ocorrencias.js`
- **Nova API `Conduta_apiObterRelatoOcorrencia`** (`:564`), liberada no roteador como `apiObterRelatoOcorrencia` (`:61`). É só leitura: não grava nada e não muda nível, peso, estado nem as regras de avaliação. A ficha devolvida traz:
  - código, regra, grupo, nível e peso aplicados, e a reincidência;
  - situação, envolvido e área;
  - data do fato, competência, quem registrou e quando;
  - o relato;
  - a evidência (se tem foto, a legenda e a origem), sem o endereço do arquivo;
  - o prazo em curso;
  - os textos de contestação, recurso e julgamento;
  - o histórico.
- **Histórico.** É o que está em `HISTORICO_JSON`. Para as ocorrências antigas, os passos são reconstruídos a partir dos campos de data (`HOMOLOGADA_EM`, `CONTESTADA_EM`, `JULGADA_EM`, `RECURSO_EM`, `FIRME_EM`, `ANULADA_EM`, `DESCARTADA_EM`), marcados como "reconstruído" e sem repetir passos. A ordem é cronológica.
- **Datas e horas.** Tudo sai como texto pt-BR, nunca como `Date` cru. O `CRIADO_EM` (UTC) é convertido para o horário de Brasília. A competência que virou `Date` no Sheets também sai como texto.
- **`Conduta_podeLerRelato_`** (`:526`): a Diretoria e o dono sempre leem. Para os demais vale a mesma regra da foto, `Conduta_podeVerOcorrencia_`: o envolvido, quem registrou, e quem é da gestão com sigilo (o Gestor de Qualidade).
- **Recusa.** A mensagem diz o quê, por quê e o que fazer: "Não foi possível abrir o relato desta ocorrência: por sigilo do colaborador, o relato identifica o envolvido e só abre para (...). Se você precisa saber o que foi relatado, peça à Diretoria ou ao Gestor de Qualidade."
- **Ocorrência sem relato.** No lugar do vazio aparece o aviso "Relato não registrado: (...)", com a orientação de usar a legenda, a origem e o histórico, ou de perguntar a quem registrou.
- **Proteção de quem registrou.** Quando quem abre é o envolvido (e não é da Diretoria nem da Qualidade), o nome de quem registrou aparece como "Quem registrou (nome preservado)". O nome também é retirado dos textos do histórico. Ver a decisão pendente no item 6.

### `cand/JS_Core.html` (vale para o computador e o celular)
- **Novas funções.** `SGO_condutaVerRelato_(id)` (`:5697`), `SGO_condutaMostrarRelato_` e `SGO_condutaRelatoHtml_` abrem a ficha numa janela por cima da tela:
  - botão "Fechar" com 44 px de altura; também fecha com Esc ou tocando fora;
  - o relato e os textos de defesa ficam justificados;
  - quebra de palavras longas, sem rolagem lateral;
  - "Ver a foto" abre a foto por cima, pela função que já existia.
- **No celular**, cada cartão de "Minhas ocorrências recentes" ganhou o botão "Ver relato" (`:5872`). A tela de contestar ou recorrer ganhou "Ver o relato completo" (`:5735`).

### `cand/SGO_Conduta_ConteudoModulo.js` (tela do computador)
A edição foi feita no HTML decodificado e regravada pelo mesmo método de ida e volta, que foi conferido. A função `Conduta_obterConteudoModulo` continua no arquivo, e o `<script>` passa no `node --check`.
- A lista de ocorrências ganhou o botão "Ver relato" em **toda** linha, em qualquer situação.
- As janelas "Contestar" e "Recorrer" ganharam "Ver o relato completo".
- As janelas "Homologar" e "Julgar" ganharam "Ver o relato completo e o histórico".

### `cand/SGO_Ajuda_Conduta.js`
- Novo passo "Ler o relato de uma ocorrência".
- O passo de contestar agora orienta a ler o relato antes de escrever a defesa.
- Dois problemas novos: a recusa por sigilo e o aviso "Relato não registrado".
- Em `conduta/ocorrencias`, novo passo "Reler o relato de uma ocorrência já decidida".
- O texto de quem pode foi ajustado.

### Manuais
- **`docs/MANUAL_CONDUTA_FISCAL.md`**: nova seção "Reler o relato de uma ocorrência (16/11/2026)", com a tabela de quem abre.
- **`docs/MANUAL_CONDUTA_COLABORADOR.md`**:
  - nova seção "Ler o relato de uma ocorrência (16/11/2026)";
  - o passo de contestar passou a ler o relato antes;
  - duas linhas novas em "Erros comuns".

Os dois arquivos já tinham alterações de outros trabalhos, ainda sem commit. Elas foram mantidas.

### `SGO_Poderes.js`
Sem alteração, porque não foi preciso criar caixa nova.

## 3. Quem passa a ver o relato

| Quem | Vê o relato? |
|---|---|
| Dono (admin) e perfil Diretoria (Charles) | Sim, de todas as ocorrências |
| Gestor ou Administrador da área Qualidade (Matheus) | Sim, de todas as ocorrências |
| Quem registrou | Sim, das que registrou |
| Envolvido | Sim, das ocorrências em seu nome, com o nome de quem registrou preservado |
| Demais gestores, RH e equipe | Não, salvo as que registraram ou em que são o envolvido. O sistema recusa com a mensagem do sigilo |

**O que o dono precisa marcar para o Matheus: nada.** O Matheus já passa pela regra atual (perfil GESTOR, área QUALIDADE, ativo). Isso vale enquanto o cadastro dele continuar assim; se a área ou o perfil mudar, ele perde o acesso.

## 4. Caixas de acesso: um ponto para o dono saber

A regra usada é exatamente o padrão da caixa `CONDUTA_VER_NOMES` («Ver quem é o envolvido (sigilo)»), que é `c.gd && c.sigilo()` em `SGO_Poderes.js:319`.

As caixas `CONDUTA_*` (lote 2), porém, **ainda não estão ligadas**: não estão em `SGO_PODERES_LIGADOS`. Na prática:
- marcar ou desmarcar essa caixa em Administração > Acessos hoje **não tem efeito** no Conduta, nem na lista, nem na foto, nem no relato;
- eu não liguei a caixa só para o relato, porque o acesso por caixas no Conduta está em "só discutir, não mexer";
- ligar apenas o relato também ficaria incoerente: a pessoa liberada não veria a linha da lista para tocar no botão.

Quando o lote do Conduta for ligado, a função `Conduta_podeLerRelato_` é o único ponto a trocar.

## 5. Testes

### Teste novo: `tests/conduta-relato-20261116.test.cjs` (9 testes)
- dono, Diretoria e Gestor de Qualidade leem o relato completo e o histórico, com a hora de Brasília e sem `Date` cru;
- a gestora de outra área e o RH recebem a recusa, e a mensagem diz o quê, por quê e o que fazer;
- id inexistente ou ausente gera mensagem clara;
- o envolvido lê a própria ocorrência sem o nome de quem registrou, e quem registrou lê a sua;
- a ocorrência antiga sem relato mostra o aviso, com o histórico reconstruído e a competência que virou `Date`;
- contestação e julgamento aparecem na ficha e no histórico, em ordem e sem passo duplicado;
- a API está liberada no roteador e não grava nada;
- no computador, o botão "Ver relato" aparece nas 8 situações e nas janelas de contestar e recorrer;
- a ajuda e os manuais tratam do relato;
- no celular, em 390 e 320 px: sem rolagem lateral, relato justificado, "Fechar" com 44 px ou mais, aviso de relato ausente, e a recusa mostrando a mensagem do servidor.

As capturas estão em `output/conduta-20261116/capturas/`: `390-relato.png`, `320-relato.png`, `390-relato-antigo.png` e `320-relato-antigo.png`.

### Lista dirigida (`rodar-lista.sh`)

| Teste | Passou | Falhou |
|---|---|---|
| conduta-relato-20261116 | 9 | 0 |
| conduta-diretoria-envolvida | 10 | 0 |
| conduta-diretoria-registra-homologada | 6 | 0 |
| conduta-fechamento-retroativo | 5 | 0 |
| conduta-foto-galeria-20261114 | 1 | 0 |
| conduta-motivo-recusa-20261114 | 1 | 0 |
| conduta-qualidade-areas | 8 | 0 |
| conduta-sigilo-envolvido | 8 | 0 |
| poderes-lote0 | 13 | 0 |
| poderes-lote1 | 5 | 0 |
| ajuda-sem-recurso-admin | 1 | 0 |

### Suíte completa (`output/conduta-20261116/suite.txt`)
- **Resultado:** 240 arquivos, 27 com saída diferente de zero, **2201 passaram e 71 falharam**.
- **Referência** (`suite-pente-fino.txt`): 239 arquivos, 27 com saída diferente de zero, 2192 passaram e 71 falharam.
- A diferença é exatamente o teste novo (+9 que passam).
- A comparação arquivo por arquivo não achou **nenhum arquivo pior**.

**Observação sobre as capturas.** O `rodar-lista.sh` aponta a variável `CAPTURAS` para `output/financeiro-20261116/capturas`. Por isso:
- o teste novo grava sempre em `output/conduta-20261116/capturas`;
- as 4 capturas do relato que caíram na pasta do financeiro na primeira rodada foram apagadas;
- o teste já existente `conduta-foto-galeria-20261114` regravou ali `390-ocorrencia-foto.png` e `320-ocorrencia-foto.png`. É o comportamento normal daquele teste, e a pasta `cand4` não foi tocada.

## 6. O que não ficou pronto ou depende do dono

1. **Nome de quem registrou para o envolvido.** Escondi o nome na ficha do relato, porque nenhuma tela do envolvido o mostrava até hoje. Porém, a lista (`apiListarOcorrencias`) já mandava `FISCAL_NOME` e `FISCAL_ID` no JSON para o envolvido, embora a tela não exibisse. Isso não foi alterado. **O dono precisa decidir:**
   - se o envolvido pode saber quem registrou; ou
   - se o nome deve ser retirado também do JSON da lista.
2. **Manual dentro do sistema.** O manual que abre em "Manuais e documentos" (HTML embutido em `SGO_Conduta_Biblioteca.js`) e a base do assistente (`SGO_AssistenteManuais.js`) não foram regenerados, seguindo a regra de não regerar manuais inteiros. Os manuais em `docs/` e a ajuda da tela estão atualizados.
3. **Ocorrências antigas.** As que foram gravadas sem `DESCRICAO` continuam sem relato. O sistema não inventa texto: mostra o aviso e orienta a perguntar.
4. **Publicação** fica para depois do ok do dono.

## 7. Arquivos alterados

**Na pasta candidata `output/conduta-20261116/cand/`:**
- `SGO_Conduta_Ocorrencias.js`
- `SGO_Conduta_ConteudoModulo.js`
- `JS_Core.html`
- `SGO_Ajuda_Conduta.js`

**Em `tests/`:**
- `tests/conduta-relato-20261116.test.cjs` (novo)

**Em `docs/`:**
- `docs/MANUAL_CONDUTA_FISCAL.md`
- `docs/MANUAL_CONDUTA_COLABORADOR.md`

**Gerados pelos testes:**
- `output/conduta-20261116/suite.txt`
- `output/conduta-20261116/suite-log.txt`
- `output/conduta-20261116/capturas/*`
