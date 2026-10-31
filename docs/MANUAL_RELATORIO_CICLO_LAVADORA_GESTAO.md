# Manual da gestão: relatório do ciclo da lavadora

Complementa o MANUAL_RELATORIO_CICLO_LAVADORA.md com o que é da equipe da Metrolabs: nova versão, referências por receita, onde os arquivos ficam e o controle de acesso. Vale a partir de 31/10/2026.

## 1. Nova versão de um relatório

1. Abra o relatório pelo cartão do Kanban ou pela busca (botão "Versões e histórico").
2. Toque em "Gerar nova versão".
3. Escreva o motivo (pelo menos 10 letras), por exemplo "série da máquina completada no cadastro".
4. Toque em "Gerar nova versão".

A nova versão é feita do mesmo arquivo do ciclo, com o cadastro atual do cliente e da lavadora e com a conclusão refeita. Ela mantém o número (RCL-aaaa-nnnn), sobe a revisão no cabeçalho e traz o motivo no rodapé da folha. A versão anterior continua guardada, marcada como substituída, com os arquivos e a assinatura que tinha. A nova precisa ser assinada de novo. O cliente não gera nova versão: pede à Metrolabs.

## 2. Referências por receita

O arquivo da lavadora não traz a temperatura nem o tempo programados na receita (o alvo fica na memória da máquina e pode ser mudado pelo operador). Por isso o padrão é não ter referência: o relatório mostra o que a lavadora registrou, sem comparar.

Para comparar, cadastre a referência da receita na aba "Referências por receita", ao lado do Kanban (só para a equipe interna):

1. Toque em "Cadastrar referência" na receita (as receitas aparecem depois do primeiro relatório) ou em "Cadastrar referência de outra receita".
2. Informe a temperatura mínima e o tempo mínimo esperados da desinfecção térmica (um dos dois ou os dois).
3. Escreva a fonte ou o motivo do valor (pelo menos 10 letras), por exemplo "parâmetro validado na qualificação de outubro de 2026".
4. Só o responsável técnico marca "Sou o responsável técnico e confirmo este valor". Sem a marca, a folha escreve "a confirmar pelo responsável técnico".
5. Toque em "Salvar".

Quem cadastra: Administrador, Diretoria, gestão e Metrologia. A mudança vale para os relatórios gerados depois; os já emitidos não mudam (gere nova versão se precisar). Toda mudança fica registrada no histórico do módulo.

A comparação usa a temperatura máxima registrada na fase de desinfecção e a duração dessa fase. O arquivo não traz a temperatura mínima da fase, então a folha não afirma que o patamar foi mantido o tempo todo.

## 3. Conclusão escrita por inteligência artificial

Com a chave da IA cadastrada em Configurações, Chaves e senhas, a conclusão é redigida pela IA só com os dados do arquivo e conferida automaticamente: todo número citado precisa existir no arquivo, o resultado precisa ser o mesmo, e a temperatura e a duração da desinfecção precisam aparecer. No resultado NÃO LIBERADO, o texto precisa dizer que o processo foi concluído e que a liberação foi bloqueada pela temperatura do arrefecimento; texto que chame o ciclo de aprovado, cancelado, interrompido ou reprovado, ou que fale em falha do processo, é recusado. Se a conferência falhar, ou sem chave, vale a conclusão por regra fixa. A folha diz qual das duas foi usada, e o motivo fica no histórico.

## 3A. Revisões do firmware e o arquivo .sgolav

O leitor aceita os arquivos de todas as revisões do firmware da lavadora. A revisão REV20261101 trouxe:

- o resultado NAO LIBERADO (processo concluído, liberação da carga bloqueada porque o arrefecimento terminou com a câmara acima da temperatura-alvo, código 17). No sistema é um resultado próprio: selo e indicador em âmbar, filtro "Não liberado" em "Mais filtros", contagem no índice "Cancelados ou reprovados" e coluna "Não liberado (câmara quente no fim)" no Kanban, que só aparece quando há relatório nela. Não conta como aprovado nem como cancelado ou reprovado;
- o campo PROCESSO (CONCLUIDO ou INTERROMPIDO). Arquivo sem o campo é de revisão anterior. Valor desconhecido, ou combinação de resultado e processo que a lavadora não grava, gera um aviso na tela e o relatório segue pelo resultado gravado;
- textos novos para os códigos de falha 1 a 16 (os números não mudaram) e os códigos 17 (arrefecimento não concluído) e 18 (pausa excedeu o tempo máximo). O relatório mostra o texto gravado no arquivo. A tabela completa está no item 7A do manual de uso;
- os eventos "ARREFECIMENTO PROLONGADO", "ARREFEC. NÃO CONCLUÍDO" e "CICLO NÃO LIBERADO".

Campo que o leitor não conhece fica guardado com o ciclo e não impede a leitura. Arquivo antigo com código 2 e última fase de arrefecimento recebe a nota explicativa no relatório, sem mudar o resultado gravado; a nota sai também nas novas versões e na assinatura de relatórios emitidos antes desta mudança.

## 4. Onde os arquivos ficam

Pasta "Relatórios de ciclo da lavadora", subpasta do cliente (CNPJ ou nome), subpasta da lavadora (TAG e tipo), subpasta "Relatórios de ciclo". Ficam lá o HTML e o PDF de cada versão (sem assinatura e assinado), o arquivo .sgolav original e a imagem da assinatura. O .sgolav e a imagem da assinatura são restritos: não abrem por link.

Abas no banco: LAVCIC_RELATORIOS (um registro por versão) e LAVCIC_HISTORICO (geração, assinatura, nova versão, referências).

## 5. Acesso

- A tela de entrada recebe do servidor só os números do painel e os cartões do Kanban (até 6 por coluna). As lavadoras e os relatórios só vêm na busca, que é feita no servidor com a mesma regra de acesso de sempre.
- No Kanban, a equipe vê o nome do cliente no cartão; o cliente não vê nada de outra empresa (nem nos números do painel).
- Os índices "cadastro incompleto" (dentro de "Lavadoras cadastradas") aparecem só para a equipe interna.

- Equipe interna: todas as lavadoras.
- Cliente: só as lavadoras do cliente ligado ao usuário. Na rota de arquivos do servidor, o cliente só abre o HTML e o PDF dos relatórios das lavadoras dele.
- Usuário de cliente sem cliente ligado não entra; a tela diz para pedir à Metrolabs a ligação.
- O mesmo lote nunca é importado duas vezes para a mesma lavadora.
- Quando o firmware da lavadora passar a gravar SERIE= ou EQUIPAMENTO= no arquivo, a importação confere com o cadastro e recusa arquivo de outra máquina.
