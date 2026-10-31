# Manual da gestão: relatório do ciclo da lavadora

Complementa o MANUAL_RELATORIO_CICLO_LAVADORA.md com o que é da equipe da Metrolabs: nova versão, referências por receita, onde os arquivos ficam e o controle de acesso. Vale a partir de 31/10/2026.

## 1. Nova versão de um relatório

1. Em "Relatórios gerados", toque em "Versões e histórico" no relatório.
2. Toque em "Gerar nova versão".
3. Escreva o motivo (pelo menos 10 letras), por exemplo "série da máquina completada no cadastro".
4. Toque em "Gerar nova versão".

A nova versão é feita do mesmo arquivo do ciclo, com o cadastro atual do cliente e da lavadora e com a conclusão refeita. Ela mantém o número (RCL-aaaa-nnnn), sobe a revisão no cabeçalho e traz o motivo no rodapé da folha. A versão anterior continua guardada, marcada como substituída, com os arquivos e a assinatura que tinha. A nova precisa ser assinada de novo. O cliente não gera nova versão: pede à Metrolabs.

## 2. Referências por receita

O arquivo da lavadora não traz a temperatura nem o tempo programados na receita (o alvo fica na memória da máquina e pode ser mudado pelo operador). Por isso o padrão é não ter referência: o relatório mostra o que a lavadora registrou, sem comparar.

Para comparar, cadastre a referência da receita na aba "Referências por receita":

1. Toque em "Cadastrar referência" na receita (as receitas aparecem depois do primeiro relatório) ou em "Cadastrar referência de outra receita".
2. Informe a temperatura mínima e o tempo mínimo esperados da desinfecção térmica (um dos dois ou os dois).
3. Escreva a fonte ou o motivo do valor (pelo menos 10 letras), por exemplo "parâmetro validado na qualificação de outubro de 2026".
4. Só o responsável técnico marca "Sou o responsável técnico e confirmo este valor". Sem a marca, a folha escreve "a confirmar pelo responsável técnico".
5. Toque em "Salvar".

Quem cadastra: Administrador, Diretoria, gestão e Metrologia. A mudança vale para os relatórios gerados depois; os já emitidos não mudam (gere nova versão se precisar). Toda mudança fica registrada no histórico do módulo.

A comparação usa a temperatura máxima registrada na fase de desinfecção e a duração dessa fase. O arquivo não traz a temperatura mínima da fase, então a folha não afirma que o patamar foi mantido o tempo todo.

## 3. Conclusão escrita por inteligência artificial

Com a chave da IA cadastrada em Configurações, Chaves e senhas, a conclusão é redigida pela IA só com os dados do arquivo e conferida automaticamente: todo número citado precisa existir no arquivo, o resultado precisa ser o mesmo, e a temperatura e a duração da desinfecção precisam aparecer. Se a conferência falhar, ou sem chave, vale a conclusão por regra fixa. A folha diz qual das duas foi usada, e o motivo fica no histórico.

## 4. Onde os arquivos ficam

Pasta "Relatórios de ciclo da lavadora", subpasta do cliente (CNPJ ou nome), subpasta da lavadora (TAG e tipo), subpasta "Relatórios de ciclo". Ficam lá o HTML e o PDF de cada versão (sem assinatura e assinado), o arquivo .sgolav original e a imagem da assinatura. O .sgolav e a imagem da assinatura são restritos: não abrem por link.

Abas no banco: LAVCIC_RELATORIOS (um registro por versão) e LAVCIC_HISTORICO (geração, assinatura, nova versão, referências).

## 5. Acesso

- Equipe interna: todas as lavadoras.
- Cliente: só as lavadoras do cliente ligado ao usuário. Na rota de arquivos do servidor, o cliente só abre o HTML e o PDF dos relatórios das lavadoras dele.
- Usuário de cliente sem cliente ligado não entra; a tela diz para pedir à Metrolabs a ligação.
- O mesmo lote nunca é importado duas vezes para a mesma lavadora.
- Quando o firmware da lavadora passar a gravar SERIE= ou EQUIPAMENTO= no arquivo, a importação confere com o cadastro e recusa arquivo de outra máquina.
