/**
 * SGO_Ajuda_Assistencia.js — ajuda "Como usar esta tela" da Assistência técnica nativa (21/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Telas: JS_Assistencia.html. Regras: SGO_Assistencia_*.js.
 * Manual completo: docs/MANUAL_MODULO_ASSISTENCIA.md. Aplicativo do técnico: docs/MANUAL_APP_CAMPO.md.
 */
function SGO_ajudaTelas_Assistencia_() {
  var quem = [
    { perfil: 'TODOS', pode: 'Toda a equipe interna abre chamado (telefone, e-mail, presencial) e acompanha os chamados.' },
    { perfil: 'TECNICO', pode: 'Vê e registra as próprias O.S.: chegada, checklist, fotos, relato, peças, assinatura e conclusão (no aplicativo do técnico ou nesta tela). Não vê valores de orçamento.' },
    { perfil: 'GESTOR', pode: 'O gestor da área Técnica faz a triagem, agenda, reagenda, cancela, confere série divergente e acompanha os indicadores. Os gestores alteram as Regras da assistência.' },
    { perfil: 'COMERCIAL,FINANCEIRO', pode: 'Preenchem, emitem e registram a resposta do orçamento do chamado (com valores).' },
    { perfil: 'DIRETORIA,ADMIN', pode: 'Tudo. Sem gestor da área Técnica, a triagem vai para a Diretoria. Só o Administrador marca "Auvo desligado" na Transição do Auvo.' },
    { perfil: 'CLIENTE', pode: 'Em "Meus chamados": pede atendimento para os próprios equipamentos, acompanha em 5 etapas, responde os orçamentos (aprovar com assinatura, pedir ajuste ou recusar) e baixa os relatórios emitidos.' }
  ];
  var prazos = { p: 'Quais são os prazos?', r: 'Padrão em horas úteis do expediente: P1 (crítica) 4 horas, P2 (alta) 1 dia útil, P3 (normal) 3 dias úteis, P4 (baixa) 7 dias úteis, contados da abertura até a execução concluída. Contrato do cliente com prazo próprio prevalece (Regras da assistência).' };
  var whats = { p: 'Vou receber WhatsApp a cada chamado?', r: 'Não. Os avisos ficam no sistema e no e-mail, pela matriz de avisos. WhatsApp só na exceção do chamado P1 ao gestor da área Técnica (no expediente, uma vez por dia) e na contagem do resumo do dia. O cliente recebe só e-mail.' };
  return {
    'assistencia': {
      titulo: 'Chamados',
      paraQueServe: 'Acompanhar cada pedido de atendimento técnico, do recebimento ao relatório: triagem, prazo, agenda, O.S., orçamento e histórico. Em uso junto com o Auvo: atendimento novo nasce aqui; o que já estava no Auvo termina no Auvo.',
      antesDeComecar: ['O cliente e o equipamento precisam estar no cadastro (Cadastros > Clientes e Equipamentos). Equipamento fora do cadastro pode entrar como "não identificado".', 'A triagem é do gestor da área Técnica (Caixa de decisões > Regras e responsáveis).'],
      passos: [
        { titulo: 'Fazer a triagem', itens: ['Toque no chamado (selo "Aberto" ou "Em triagem").', 'Preencha os sintomas confirmados, o risco de continuar usando e o diagnóstico preliminar.', 'Ajuste a prioridade, se precisar (escreva o motivo: o prazo é recalculado).', 'Escolha o tipo de serviço e o caminho: resolvido remotamente, precisa de orçamento, precisa de peça ou planejar visita.', 'Toque em "Concluir a triagem".'] },
        { titulo: 'Agendar o atendimento', itens: ['No chamado "Planejado", escolha o técnico, a data, a hora, a duração e o tipo de serviço.', 'Confirme o preparo (ferramentas, instrumentos calibrados, acesso, documentação, peças e risco).', 'Toque em "Agendar". Se o técnico já tiver compromisso no horário, a tela mostra o conflito: escolha outro horário ou confirme com o motivo.', 'Na janela seguinte, reserve o veículo livre sugerido (Frota), se for preciso.'] },
        { titulo: 'Reagendar', itens: ['Abra o chamado agendado, mude o técnico ou o horário e escreva o motivo.', 'O técnico e o cliente recebem o horário novo; a O.S. continua a mesma.'] },
        { titulo: 'Peça ou orçamento', itens: ['Peça em falta abre o pedido em Compras sozinho, ligado ao cliente e ao chamado.', 'Orçamento vira atividade do Comercial: "Preencher valores", "Emitir o A4" e "Enviar com link de aceite". O cliente aprova (nome, cargo, e-mail e assinatura na tela), pede ajuste ou recusa pelo link, sem login; a resposta é única e fica registrada com data, hora e IP.', 'Aprovado pelo link: o chamado vai sozinho a "Planejado" (ou "Aguardando peça", com o pedido em Compras), sai o comprovante de aprovação e o cliente recebe a confirmação por e-mail. Recusa ou ajuste entram na Caixa de decisões para a gestão decidir.', 'Bloco "Aceite do cliente": situação do link (visto em, respondido em), "Gerar e copiar link", "Invalidar link" e o comprovante. Quem responde por telefone ou e-mail continua em "Registrar a resposta do cliente", com o aceite anexado.', 'Peça recebida e conferida por Compras: o chamado volta sozinho a "Planejado" com a faixa "Peça disponível", entra na Caixa como "retorno a agendar" e o cliente recebe o e-mail "peça chegou". Toque em "Agendar o retorno": a mesma O.S. volta à agenda e o cliente recebe a data.', 'Peça que chegou por fora de Compras: toque em "Liberar para agendar" e agende (o cliente também recebe "retorno agendado").', 'O técnico descobriu em campo que precisa de orçamento ou de outro diagnóstico: "Voltar à triagem", com o motivo (a O.S. fica pausada).'] },
        { titulo: 'Cancelar ou registrar contato', itens: ['"Registrar contato ou observação" guarda ligações e e-mails no histórico.', '"Registrar reclamação" abre um caso com dono e prazo.', '"Cancelar o chamado" pede o motivo e cancela a O.S. aberta junto.'] },
        { titulo: 'Conferir cadastros criados em campo', itens: ['O quadro "Cadastros criados em campo a conferir" lista cliente, unidade ou equipamento que o técnico cadastrou pelo aplicativo, fora da agenda.', 'Confira em Cadastros (Clientes, Unidades, Equipamentos ou Vínculos) se não é repetido e se o vínculo está certo; corrija se precisar.', 'Toque em "Conferido" e escreva o que foi conferido. A pendência sai da Caixa de decisões. Nada fica bloqueado enquanto isso.'] }
      ],
      cores: [
        { nome: 'Selo verde "Aberta em campo"', significado: 'O técnico abriu o atendimento pelo aplicativo, fora da agenda: a triagem foi feita no local e a O.S. nasceu em andamento. A gestão foi avisada.' },
        { nome: 'Selo verde "Em dia"', significado: 'O prazo de atendimento está dentro do combinado.' },
        { nome: 'Selo laranja "Em risco"', significado: 'Resta um quarto do prazo ou menos (horas úteis).' },
        { nome: 'Selo vermelho "Prazo estourado"', significado: 'Passou do prazo. Aparece na Caixa de decisões da área Técnica até resolver.' },
        { nome: 'Selo "Reincidência de CH-..."', significado: 'O mesmo equipamento teve outro chamado nos últimos 30 dias.' },
        { nome: 'Borda vermelha no cartão', significado: 'Chamado P1 (crítico).' }
      ],
      problemas: [
        { situacao: 'Aparece "esse caminho não é permitido".', oQueFazer: 'O chamado segue uma ordem (aberto, triagem, planejado, agendado, campo, documentação, encerrado). Veja o "Próximo passo" na ficha e faça esse primeiro.' },
        { situacao: 'Não consigo concluir a triagem.', oQueFazer: 'Preencha os três itens com * (sintomas confirmados, risco e diagnóstico preliminar) e escolha o caminho.' },
        { situacao: 'O técnico não aparece na lista.', oQueFazer: 'Técnico é usuário ativo com perfil Técnico ou da área Técnica. Ajuste em Administração > Usuários.' },
        { situacao: 'O equipamento já tem chamado em aberto.', oQueFazer: 'Se é o mesmo problema, registre o contato no chamado aberto. Se é outro problema, toque em "Abrir mesmo assim".' }
      ],
      quemPode: quem,
      perguntas: [prazos, whats, { p: 'O chamado fecha sozinho?', r: 'Fecha quando a O.S. tem a documentação completa do tipo de serviço. Até lá fica "Execução concluída, documentação pendente" e vira cobrança.' }]
    },
    'assistencia_abrir': {
      titulo: 'Abrir chamado',
      paraQueServe: 'Registrar o pedido de atendimento recebido por telefone, e-mail ou pessoalmente. Pedido feito pelo cliente no portal ou no QR entra em "Solicitações dos clientes".',
      passos: [
        { titulo: 'Abrir um chamado', itens: ['Digite o nome ou o CNPJ do cliente e toque nele.', 'Escolha a unidade e o equipamento. Se o equipamento não está no cadastro, marque "Equipamento não identificado" e descreva.', 'Escreva o problema relatado, quem pediu e o contato.', 'Escolha a prioridade (P1 só para equipamento parado que afeta o paciente) e se o equipamento está parado.', 'Toque em "Abrir o chamado". A triagem é avisada na hora.'] },
        { titulo: 'Abrir a partir de um e-mail', itens: ['Abra a mensagem em E-mail.', 'Toque em "Abrir chamado": o texto, o remetente e o cliente (quando reconhecido) já vêm preenchidos.', 'Complete o equipamento e a prioridade e toque em "Abrir o chamado".'] }
      ],
      problemas: [{ situacao: 'O cliente não aparece na busca.', oQueFazer: 'Cadastre em Cadastros > Clientes e volte aqui. Cadastro repetido? Use Cadastros > Vínculos.' }],
      quemPode: quem, perguntas: [prazos]
    },
    'assistencia_os': {
      titulo: 'Ordens de serviço',
      paraQueServe: 'Registrar o atendimento em campo pelo computador ou tablet (no celular, use o aplicativo do técnico, que funciona sem internet). A O.S. só fecha com a documentação completa e gera o relatório A4 sozinha.',
      antesDeComecar: ['A O.S. nasce quando a gestão agenda o chamado, ou quando o técnico abre um atendimento fora da agenda pelo aplicativo (selo "Aberta em campo").', 'Localização: só nos toques "Cheguei" e "Concluí a execução", se o navegador permitir. Nunca o tempo todo.'],
      passos: [
        { titulo: 'Registrar o atendimento', itens: ['Abra a O.S. e toque em "Cheguei" ao chegar ao cliente.', 'Responda o checklist (os itens com * são obrigatórios).', 'Escolha as fotos de cada pergunta de foto e as fotos gerais (a foto é reduzida antes de enviar).', 'Preencha condição encontrada, causa, serviço realizado, teste funcional, recomendações e o número de série conferido.', 'Lance as peças aplicadas. Peça em falta: escolha "Em falta" (abre o pedido em Compras e a O.S. fica aguardando peça).', 'Peça ao cliente para assinar no quadro, escreva o nome e toque em "Guardar a assinatura". Sem o responsável: "Responsável ausente", com quem recebeu e a justificativa.', 'Toque em "Salvar o que preenchi" e, ao terminar, em "Concluí a execução".'] },
        { titulo: 'Encerrar e enviar o relatório', itens: ['Se faltou algo, a faixa vermelha diz o que é. Complete e salve: a O.S. fecha sozinha e o relatório A4 é gerado uma vez só, na pasta "4. Ordens de Serviço" do equipamento e no Arquivo de documentos.', 'No bloco "Documento e envio": "Abrir o PDF" reabre o mesmo relatório (nenhuma versão nova sem motivo); "Enviar ao cliente" abre o Enviar documento com os contatos do cliente (confira o e-mail). O bloco mostra "Enviado ao cliente em ... por ... (e-mail) para ...".', 'O técnico também envia pelo aplicativo, na O.S. encerrada. Sem envio em 1 dia útil, a pendência "relatório não enviado" entra na Caixa de decisões da gestão.', 'Precisa corrigir um relatório emitido? Gestão: "Abrir para corrigir", com o motivo: sai a Rev. 01 do mesmo número, a anterior fica arquivada e a revisão precisa ser enviada de novo.', 'Calibração ou qualificação: emita o documento no módulo e toque em "Ligar o documento técnico emitido" (o do mesmo equipamento é ligado sozinho ao encerrar).'] }
      ],
      cores: [
        { nome: 'Faixa vermelha "Para fechar a O.S. falta"', significado: 'Lista o que falta. Enquanto houver, a O.S. fica em "Documentação pendente" e aparece nas pendências.' },
        { nome: 'Selo "Série divergente"', significado: 'A série conferida no local é diferente do cadastro. A gestão é avisada e confere; o cadastro não muda sozinho.' },
        { nome: 'Selo "Aguardando peça"', significado: 'Falta peça: o pedido de compra foi aberto e o retorno é agendado quando a peça chegar.' },
        { nome: 'Selo "Aberta em campo"', significado: 'O técnico abriu a O.S. pelo aplicativo, fora da agenda; o cadastro usado pode estar marcado "criado em campo" (confira em Chamados).' }
      ],
      problemas: [
        { situacao: 'Aparece "a chegada ainda não foi registrada".', oQueFazer: 'Toque em "Cheguei" primeiro e salve de novo.' },
        { situacao: 'A foto não subiu.', oQueFazer: 'Verifique a conexão e salve de novo. As fotos que já subiram não se repetem.' },
        { situacao: 'Aparece "a O.S. é de outro técnico".', oQueFazer: 'Só o técnico responsável (ou a gestão da área Técnica) registra. Fale com a gestão se ela deveria ser sua.' },
        { situacao: 'O cliente não quer ou não pode assinar.', oQueFazer: 'Use "Responsável ausente": nome de quem recebeu e a justificativa (pelo menos 10 letras). Fica no relatório.' },
        { situacao: 'O WhatsApp aparece desligado na janela "Enviar documento".', oQueFazer: 'O piloto do WhatsApp oficial está ligado e o número oficial ainda não envia documentos. Envie por e-mail; quando o canal for ligado, a opção volta sozinha.' },
        { situacao: 'Toquei em "Abrir o PDF" e não saiu versão nova.', oQueFazer: 'É assim mesmo: o relatório da O.S. encerrada é um só. Para corrigir, a gestão usa "Abrir para corrigir", com o motivo.' }
      ],
      quemPode: quem,
      perguntas: [{ p: 'Preciso de internet?', r: 'Nesta tela, sim. O aplicativo do técnico no celular guarda tudo no aparelho e envia quando a internet volta, sem registrar em dobro.' }, whats]
    },
    'assistencia_agenda': {
      titulo: 'Agenda dos técnicos',
      paraQueServe: 'Ver por técnico, no dia ou na semana, os atendimentos do SGO+ e do Auvo, as reservas de veículo e as ausências (férias, afastamentos, dispensas do ponto).',
      passos: [
        { titulo: 'Ver a agenda', itens: ['Escolha a data e "Dia" ou "Semana". Use Anterior, Hoje e Próximo.', 'Toque num atendimento do SGO+ para abrir a O.S.', 'Itens cinza são do Auvo (só leitura); itens laranja são ausências ou reservas de veículo.'] },
        { titulo: 'Rota do dia', itens: ['Toque em "Rota do dia" no nome do técnico.', 'Veja as paradas na ordem e abra o caminho no mapa.', 'A gestão muda a ordem com "Subir" e salva; o técnico vê a mesma ordem no Meu dia.'] }
      ],
      quemPode: quem, perguntas: [{ p: 'O sistema monta a rota sozinho?', r: 'Não. A ordem do dia é da gestão; o mapa mostra o caminho na ordem escolhida.' }]
    },
    'assistencia_solicitacoes': {
      titulo: 'Solicitações dos clientes',
      paraQueServe: 'Pedidos feitos pelo cliente no portal ou no QR do equipamento. O chamado não nasce sozinho, para não abrir chamado duplicado ou errado: alguém da equipe confere e abre.',
      passos: [{ titulo: 'Tratar a fila', itens: ['Leia o pedido (equipamento, descrição e contato).', 'Toque em "Abrir chamado", escolha a prioridade e confirme.', 'Se for repetido ou engano, toque em "Descartar" e escreva o motivo.'] }],
      quemPode: quem, perguntas: [whats]
    },
    'assistencia_casos': {
      titulo: 'Reclamações',
      paraQueServe: 'Reclamação do cliente ou problema que se repete vira um caso com dono e prazo, até a causa, a ação e a resposta ao cliente estarem registradas.',
      passos: [{ titulo: 'Registrar e tratar', itens: ['Toque em "Registrar reclamação" (ou, dentro do chamado, em "Registrar reclamação").', 'O dono (gestor da área Técnica, no padrão) recebe o aviso com o prazo.', 'Em "Tratar", registre a causa, a ação tomada e a resposta ao cliente e marque "Resolvido".'] }],
      cores: [{ nome: 'Borda vermelha', significado: 'Prazo vencido: o caso vai à Caixa de decisões.' }],
      quemPode: quem
    },
    'assistencia_indicadores': {
      titulo: 'Indicadores da assistência',
      paraQueServe: 'Acompanhar o mês: atendimentos no prazo, tempo médio de atendimento em horas úteis, reincidência por equipamento, O.S. por técnico e prazos estourados. O relatório mensal A4 entra no e-mail mensal da Diretoria.',
      passos: [{ titulo: 'Ver e gerar o relatório', itens: ['Escolha o mês.', 'Toque em "Relatório mensal A4" para ver, imprimir ou salvar em PDF (fica guardado na pasta dos relatórios da assistência).'] }],
      quemPode: quem
    },
    'assistencia_regras': {
      titulo: 'Regras da assistência',
      paraQueServe: 'Configurar prazos por prioridade, contratos com prazo próprio, avisos, o interruptor "Assistência do SGO+ ligada", os tipos de serviço e os modelos de checklist. Cada mudança vira uma versão com o motivo.',
      passos: [
        { titulo: 'Mudar prazos e avisos', itens: ['Ajuste as horas úteis de cada prioridade e as opções.', 'Escreva o que mudou e por quê e toque em "Salvar as regras".'] },
        { titulo: 'Contrato com prazo próprio', itens: ['Toque em "Mais um contrato", escolha o cliente e preencha as horas das prioridades que o contrato define (em branco vale o padrão).', 'Marque se o contrato permite pausar o prazo ao aguardar cliente ou peça.', 'Salve com o motivo.'] },
        { titulo: 'Tipos de serviço e checklists', itens: ['Em "Tipos de serviço", toque em "Editar" para mudar relato, assinatura, fotos mínimas, conferência do equipamento, checklist e documento técnico.', 'Em "Modelos de checklist", edite as perguntas (texto, tipo de resposta, opções, obrigatória). A versão nova vale para as próximas O.S.', '"Trazer os questionários do Auvo" lê os 13 questionários copiados no acervo e cria os modelos, sem apagar nada.', 'Sem a lista de questionários no acervo, toque em "Montar os checklists a partir das tarefas do Auvo": cada toque lê um lote de tarefas copiadas; no fim, cada questionário vira um modelo inativo para revisar e ativar.'] },
        { titulo: 'Ligar ou desligar', itens: ['"Desligar" faz o aplicativo do técnico parar de receber O.S. novas. Nada é apagado e o Auvo continua como está.'] },
        { titulo: 'Link de aceite do orçamento', itens: ['"Link de aceite do orçamento vale (dias)": de 1 a 90, padrão 30. Vale para os próximos envios; os links já enviados mantêm a validade que tinham.'] }
      ],
      problemas: [{ situacao: 'Os campos estão travados.', oQueFazer: 'As regras são alteradas pelo Administrador, pela Diretoria e pelos gestores. Os demais só consultam.' }],
      quemPode: quem, perguntas: [prazos]
    },
    'assistencia_transicao': {
      titulo: 'Transição do Auvo',
      paraQueServe: 'Mostrar os seis critérios do projeto para deixar de usar o Auvo e registrar quem conferiu cada um. Nada é desligado sozinho.',
      passos: [
        { titulo: 'Acompanhar os critérios', itens: ['Cada critério mostra o que o sistema mediu e o que precisa de confirmação da gestão.', 'Toque no botão da confirmação, escreva o que foi conferido e confirme.', 'Aceitar faltas do acervo é decisão do dono (Diretoria).'] },
        { titulo: 'O.S. abertas no Auvo', itens: ['Para cada tarefa aberta no Auvo, registre o destino: vai ser fechada no Auvo, recriar como chamado no SGO+ (abre o chamado) ou não houve atendimento.'] },
        { titulo: 'Histórico do Auvo nos equipamentos', itens: ['A rotina liga o histórico copiado do Auvo aos equipamentos em lotes, de hora em hora. "Ligar um lote agora" adianta.', 'Tarefas sem equipamento vão para a revisão; nada se perde.'] },
        { titulo: 'Auvo desligado', itens: ['Com os seis critérios cumpridos, o Administrador marca "Auvo desligado" com a decisão.', 'Depois: desligar os gatilhos em Integração Auvo e cancelar o contrato.'] }
      ],
      quemPode: quem
    },
    'assistencia_portal': {
      titulo: 'Meus chamados',
      paraQueServe: 'Pedir atendimento técnico para os equipamentos da sua empresa, acompanhar cada chamado e baixar o relatório do atendimento.',
      passos: [
        { titulo: 'Pedir atendimento', itens: ['Toque em "Pedir atendimento".', 'Escolha o equipamento, conte o que está acontecendo e se ele está parado.', 'Informe um telefone ou e-mail e toque em "Enviar o pedido".', 'A equipe técnica confere e abre o chamado; ele aparece na lista.'] },
        { titulo: 'Acompanhar', itens: ['Cada chamado mostra a etapa: Recebido, Em análise, Visita agendada, Em atendimento e Concluído.', 'Concluído, toque em "Baixar o relatório do atendimento".'] },
        { titulo: 'Responder um orçamento', itens: ['Em "Orçamentos", confira os itens, o total, a validade e as condições (o PDF baixa pelo link "Baixar o orçamento em PDF").', 'Toque em "Aprovar" (nome completo, cargo, CPF opcional, e-mail, assinatura no quadro e "Li e concordo"), "Pedir ajuste" (o que precisa mudar) ou "Recusar" (o motivo).', 'A resposta é única: depois dela o orçamento mostra "Respondido em ... por ...". A confirmação chega por e-mail; na aprovação, com o comprovante em PDF.', 'Recebeu o orçamento por e-mail? O link "Ver e responder o orçamento" faz o mesmo, sem precisar entrar no portal.'] }
      ],
      quemPode: [{ perfil: 'CLIENTE', pode: 'Vê só os chamados e os equipamentos da própria empresa.' }],
      perguntas: [{ p: 'Recebo aviso?', r: 'Sim, por e-mail: quando o pedido é recebido, quando a visita é reagendada, quando o atendimento é concluído e quando você responde um orçamento (a confirmação, com o comprovante na aprovação).' }, { p: 'O orçamento venceu. E agora?', r: 'Não dá para aprovar um orçamento vencido. Toque em "Pedir ajuste" ou fale com a Metrolabs: a equipe faz uma revisão com a validade nova e envia de novo.' }]
    }
  };
}
