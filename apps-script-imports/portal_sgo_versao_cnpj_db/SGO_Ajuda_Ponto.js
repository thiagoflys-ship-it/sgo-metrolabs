/**
 * SGO_Ajuda_Ponto.js — ajuda "Como usar esta tela" do Assistente do ponto nativo (21/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Tela: JS_Ponto.html. Regras: SGO_Ponto_*.js.
 * Manual completo: docs/MANUAL_MODULO_PONTO.md.
 */
function SGO_ajudaTelas_Ponto_() {
  return {
    'ponto': {
      titulo: 'Assistente do ponto',
      paraQueServe: 'Lembra o colaborador CLT de bater o ponto, na hora de cada marcação, e leva o "Esqueci de bater" ao RH como pedido de ajuste. O ponto oficial continua sendo o relógio da empresa (em viagem, o aplicativo de ponto que o RH libera): o SGO+ não sabe quem bateu, só recebe a confirmação de um toque. O RH trata os pedidos, a gestão acompanha a equipe e cada pessoa vê os próprios lembretes.',
      antesDeComecar: [
        'O assistente nasce desligado. Quem liga é o Administrador ou a Diretoria, na aba "Configuração".',
        'Só recebe quem é CLT: o vínculo fica em Administração > Usuários > Vínculo. PJ nunca recebe nada do ponto.',
        'Durante o piloto do WhatsApp, só as pessoas da lista do piloto participam (Administração > Piloto do WhatsApp).',
        'O lembrete chega pelo WhatsApp oficial da empresa, com o botão "Confirmar". Sem o WhatsApp (modelo ainda não aprovado ou sem celular), chega por e-mail.'
      ],
      passos: [
        { titulo: 'Colaborador: confirmar pelo lembrete', itens: ['Bata o ponto no relógio (em viagem, no aplicativo de ponto).', 'Toque em "Confirmar" na mensagem.', 'Na página que abre, toque no botão verde (por exemplo, "Já bati a entrada").', 'Pronto: o link vale uma vez só e só naquele dia.'] },
        { titulo: 'Colaborador: esqueci de bater', itens: ['Na página do lembrete, toque em "Esqueci de bater".', 'Informe o horário e escreva uma frase curta contando o que aconteceu.', 'Toque em "Enviar ao RH".', 'Se o link já venceu, abra a aba "Meus lembretes" e use "Pedir ajuste ao RH" (até 31 dias atrás).', 'A resposta do RH aparece no SGO+ e no seu e-mail.'] },
        { titulo: 'RH: tratar um pedido de ajuste', itens: ['Abra a aba "Pedidos de ajuste".', 'Leia o horário informado, a frase da pessoa e a evidência (só os horários de check-in e check-out do Auvo).', 'Lance no relógio ou no sistema de ponto.', 'Toque em "Lançado no ponto". Se não for o caso, toque em "Não lançado" e escreva o motivo.', 'A pessoa é avisada no SGO+ e por e-mail; a atividade do RH em Minhas atividades é concluída sozinha.'] },
        { titulo: 'RH: quem participa, jornada e folgas', itens: ['Abra a aba "Pessoas e jornadas".', 'Confira a coluna "Situação": quem não recebe aparece com o motivo (PJ, vínculo não informado, fora do piloto, sem celular e sem e-mail).', 'Toque em "Ajustar" para tirar a pessoa do assistente ou mudar a jornada dela. Campo vazio segue a jornada geral.', 'Para folga, atestado ou consulta, use "Folgas e dispensas" e toque em "Lançar dispensa". Férias e afastamentos do Programa de conduta já valem sozinhos.'] },
        { titulo: 'Gestão e RH: acompanhar', itens: ['Os avisos para você (pedido novo, resumo do mês, resposta do RH) aparecem no alto da tela. Toque em "Ciente" em cada um ou em "Ciente em todos".', 'Na aba "Hoje", veja cada pessoa e cada marcação do dia.', 'Na aba "Mês", veja os números por pessoa.', 'Toque em "Resumo A4 / PDF" para o resumo do mês (RH, Administrador e Diretoria).'] },
        { titulo: 'Administrador ou Diretoria: ligar', itens: ['Cadastre os modelos sgo_ponto_* em Administração > Chaves e senhas > "Cadastrar modelos na Meta" e aguarde a aprovação.', 'Abra a aba "Configuração".', 'Escolha quais marcações lembrar e confira a jornada geral.', 'Marque o RH, se for alguém sem o perfil ou a área RH.', 'Marque "Assistente ligado" e toque em "Salvar configuração".', 'Toque em "Pré-visualizar a página do link" para ver o que o colaborador vê (nada é gravado).'] }
      ],
      cores: [
        { nome: 'Selo verde "Confirmado"', significado: 'A pessoa tocou no botão depois de bater o ponto.' },
        { nome: 'Selo laranja "Lembrado, sem confirmação"', significado: 'O lembrete saiu e ainda não houve toque. No fim do dia vira "Não confirmado".' },
        { nome: 'Selo vermelho "Não confirmado"', significado: 'O dia acabou sem confirmação. Não é prova de falta: a pessoa pode ter batido sem tocar no botão.' },
        { nome: 'Selo azul "Esqueci de bater"', significado: 'A pessoa pediu o ajuste ao RH.' },
        { nome: 'Selo cinza "Não lembrado"', significado: 'O lembrete não saiu porque a pessoa estava ausente (férias, afastamento, folga) ou em atendimento no Auvo.' },
        { nome: 'Selo cinza "Lembrete não saiu"', significado: 'Nem o WhatsApp nem o e-mail funcionaram (o motivo aparece embaixo). Não conta como esquecimento.' }
      ],
      problemas: [
        { situacao: 'O colaborador diz que não recebeu o lembrete.', oQueFazer: 'Veja na aba "Pessoas e jornadas" se ele recebe. Os motivos mais comuns: vínculo não informado, fora da lista do piloto ou sem celular. Corrija em Administração > Usuários ou no Piloto do WhatsApp.' },
        { situacao: 'O lembrete chegou por e-mail e não pelo WhatsApp.', oQueFazer: 'O modelo sgo_ponto_* ainda não foi aprovado na Meta, ou a pessoa está sem celular. Confira na aba "Configuração" > Modelos do WhatsApp.' },
        { situacao: 'O link diz que já foi usado.', oQueFazer: 'Cada link vale uma vez. Se tocou por engano, peça o ajuste em "Meus lembretes" > "Pedir ajuste ao RH".' },
        { situacao: 'Não consigo tratar um pedido.', oQueFazer: 'Quem pediu não trata o próprio pedido. Outra pessoa do RH, a Diretoria ou o Administrador trata.' }
      ],
      quemPode: [
        { perfil: 'TODOS', pode: 'Ver os próprios lembretes, confirmar, pedir ajuste ao RH e acompanhar os próprios pedidos (aba "Meus lembretes").' },
        { perfil: 'RH', pode: 'Ver tudo do ponto, tratar os pedidos de ajuste, ajustar quem participa, a jornada de cada pessoa e as folgas, e gerar o resumo A4.' },
        { perfil: 'GESTOR', pode: 'Acompanhar a própria equipe (a área do cadastro e as áreas pelas quais responde na Caixa de decisões), só leitura. A justificativa dos pedidos fica com o RH.' },
        { perfil: 'ADMIN,DIRETORIA', pode: 'Tudo do RH e mais: ligar e desligar, escolher as marcações, a jornada geral, quem é o RH e os feriados do expediente comum.' }
      ],
      perguntas: [
        { p: 'Posso receber o lembrete duas vezes?', r: 'Não. Cada marcação tem um lembrete só, mesmo sem confirmação. Nada sai antes do seu horário de entrada menos 5 minutos, depois do seu horário de saída, em fim de semana ou feriado.' },
        { p: 'O assistente sabe onde eu estou?', r: 'Não. O SGO+ não usa localização. A única informação extra do pedido de ajuste é o horário do check-in e do check-out do Auvo naquele dia.' },
        { p: 'Esquecer de confirmar dá punição?', r: 'Não. A partir do 3º esquecimento no mês, o RH e a sua gestão recebem um resumo e o Programa de conduta recebe uma sugestão. Nenhuma medida é automática: quem decide é a gestão.' },
        { p: 'Estou em atendimento no cliente na hora da saída. Vou receber?', r: 'Não. Com o check-in aberto no Auvo, o assistente não lembra. Bata a saída quando terminar.' }
      ],
      secoesManual: [
        { titulo: 'Horários dos lembretes', paragrafos: [
          'Entrada: 5 minutos antes (07:55 com entrada às 08:00). Saída para o almoço: na hora (11:00). Volta do almoço: a saída para o almoço confirmada mais a pausa (padrão 1 hora; sem confirmação, conta do horário do almoço). Saída: 5 minutos antes (17:55; na sexta, 17:25).',
          'Só em dia útil: os dias e os feriados vêm do expediente comum do SGO+ (feriados nacionais, Carnaval, Sexta-feira Santa, Corpus Christi e os feriados extras cadastrados). Cada pessoa pode ter outra jornada.'
        ] },
        { titulo: 'O que vai para o RH e para a gestão', paragrafos: [
          'O pedido de ajuste aparece para o RH no Início, na aba "Pedidos de ajuste" e, se ligado, como atividade em Minhas atividades. Parado há 2 dias úteis, entra na Caixa de decisões da gestão da área RH (sem gestor, da Diretoria).',
          'O resumo do 3º esquecimento vai só pelo SGO+ e por e-mail, nunca pelo WhatsApp. O e-mail sai dentro do expediente.'
        ] }
      ]
    }
  };
}
