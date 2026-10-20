/**
 * SGO_Ajuda_Email.js — ajuda "Como usar esta tela" do E-mail integrado (21/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Tela: JS_Email.html. Regras: SGO_Email.js e sgo_servidor/src/servicos/emailPessoal.ts.
 */
function SGO_ajudaTelas_Email_() {
  return {
    'email': {
      titulo: 'E-mail',
      paraQueServe: 'A sua caixa de e-mail da Metrolabs dentro do SGO+: ler, escrever, responder o cliente, encaminhar, anexar arquivos, mover e apagar, sem sair do sistema. O sistema reconhece quando o remetente é cliente cadastrado, avisa quando chega e-mail novo e cobra o e-mail de cliente que ficou sem leitura ou sem resposta, para nenhum atendimento ficar esquecido.',
      antesDeComecar: [
        'Conecte a sua caixa uma vez: aba "Minha caixa e assinatura", informe o endereço @metrolabs.com.br e a senha da caixa (a do webmail, não a do SGO+) e toque em "Testar e conectar".',
        'A senha é testada antes de gravar e fica guardada cifrada no servidor da Metrolabs. Ela nunca aparece na tela de novo e ninguém lê: nem o Administrador, nem a gestão.',
        'A sua caixa só você abre. Caixas compartilhadas (comercial@, financeiro@...) aparecem para quem o Administrador liberou.'
      ],
      passos: [
        { titulo: 'Ler as mensagens', itens: ['Toque em "E-mail" no menu (grupo Principal).', 'Escolha a pasta à esquerda (no celular, na lista do topo): Entrada, Enviados, Rascunhos, Lixeira e as outras da sua caixa.', 'Toque na mensagem para ler. Em negrito estão as não lidas.', 'Use "Procurar" (remetente, destinatário ou assunto) e os filtros "Não lidas", "Com anexo" e "De cliente".'] },
        { titulo: 'Responder o cliente', itens: ['Abra a mensagem e toque em "Responder" (ou "Responder a todos").', 'Escreva a resposta. A sua assinatura entra sozinha no fim e a mensagem original fica citada abaixo.', 'Para anexar, toque em "Anexar arquivo".', 'Toque em "Enviar". A cópia fica em Enviados e a mensagem original ganha o selo "Respondida".'] },
        { titulo: 'Escrever um e-mail novo', itens: ['Toque em "Escrever" no topo da tela.', 'Preencha Para (vários separados por vírgula), Cc e Cco se precisar, e o Assunto.', 'Escreva o texto; use os botões N, I, S, lista e link para formatar.', 'Toque em "Salvar rascunho" para continuar depois ou em "Enviar".'] },
        { titulo: 'Cliente reconhecido', itens: ['Quando o remetente é cliente cadastrado, aparece a faixa verde "Cliente: nome".', 'Toque em "Abrir cadastro" para ir ao cadastro do cliente.', 'Toque em "Registrar no cliente" para guardar um resumo do e-mail no histórico do cliente (com assunto, data e quem registrou).'] },
        { titulo: 'Anexos e imagens', itens: ['Toque no anexo para baixar.', 'Imagens de fora ficam bloqueadas (elas avisam o remetente que você abriu). Se confia no remetente, toque em "Mostrar imagens".', 'Ao tocar num link, o sistema mostra o site de destino e pede confirmação.'] },
        { titulo: 'Organizar', itens: ['"Mover para..." leva a mensagem para outra pasta.', '"Apagar" manda para a Lixeira (dá para mover de volta).', 'Só dentro da Lixeira aparece "Apagar para sempre", com confirmação.', '"Marcar como não lida" volta a mensagem para negrito.'] },
        { titulo: 'Caixa compartilhada', itens: ['Se você tem acesso, escolha a caixa no seletor acima das pastas.', 'Ao tocar em "Responder", o sistema marca que você está respondendo; quem abrir a mesma mensagem vê o aviso.', 'Depois do envio, a mensagem mostra "Respondida por" com o seu nome.'] }
      ],
      cores: [
        { nome: 'Número no menu E-mail', significado: 'Mensagens não lidas na Entrada (a sua caixa e as compartilhadas). Laranja: a caixa está sem conexão; abra E-mail para ver o motivo.' },
        { nome: 'Selo verde "Cliente: nome"', significado: 'O remetente é e-mail (ou domínio) de um cliente do cadastro.' },
        { nome: 'Selo azul "Respondida"', significado: 'A mensagem já foi respondida por esta caixa.' },
        { nome: 'Selo laranja "Respondendo" ou "Respondida por"', significado: 'Caixa compartilhada: alguém da equipe está respondendo ou já respondeu.' },
        { nome: 'Faixa vermelha "senha recusada"', significado: 'A senha da caixa mudou no webmail. Grave a senha nova em "Minha caixa e assinatura" > "Trocar a senha guardada".' }
      ],
      problemas: [
        { situacao: 'Aparece "O servidor de e-mail recusou a senha".', oQueFazer: 'Confira a senha no webmail. Se você trocou a senha da caixa, toque em "Trocar a senha guardada" e grave a atual. O sistema para de tentar até lá, para o provedor não bloquear a caixa.' },
        { situacao: '"Só dá para conectar caixas da empresa".', oQueFazer: 'O sistema aceita só endereços @metrolabs.com.br. E-mail pessoal (Gmail, Hotmail) não entra, para proteger os dados dos clientes.' },
        { situacao: '"Limite de envio atingido".', oQueFazer: 'Na última hora você passou do limite de mensagens ou de destinatários (proteção contra envio em massa). Salve como rascunho e envie mais tarde. Para comunicado a muitas pessoas, fale com a gestão.' },
        { situacao: 'Uma pendência "e-mail de cliente não lido" apareceu no Início.', oQueFazer: 'Abra E-mail e leia. Se a mensagem pede resposta, responda. Se não precisa, mova para outra pasta: ela deixa de ser cobrada.' },
        { situacao: 'A mensagem sumiu da lista.', oQueFazer: 'Ela pode ter sido movida ou apagada pelo webmail ou pelo celular. Procure nas outras pastas e na Lixeira.' },
        { situacao: 'Anexo grande não baixa.', oQueFazer: 'O limite para baixar pelo sistema é 25 MB. Baixe pelo webmail da empresa.' }
      ],
      quemPode: [
        { perfil: 'TODOS', pode: 'Conectar a própria caixa, ler, escrever, responder, anexar, mover, apagar, salvar rascunho, assinatura e registrar e-mail no cliente. Só o dono abre a própria caixa.' },
        { perfil: 'ADMIN', pode: 'Tudo acima e cadastrar caixas compartilhadas (áreas e pessoas com acesso), ver a trilha de acesso delas e ajustar os prazos dos avisos. Não abre a caixa pessoal de ninguém.' },
        { perfil: 'GESTOR,DIRETORIA', pode: 'Recebem na Caixa de decisões quando alguém da área fica com e-mail de cliente sem resposta além do prazo: só o nome, o cliente e há quanto tempo. Não veem assunto nem texto.' },
        { perfil: 'CLIENTE', pode: 'Não usa esta tela.' }
      ],
      perguntas: [
        { p: 'O Administrador ou o meu gestor conseguem ler os meus e-mails?', r: 'Não. A caixa pessoal só abre para quem conectou. A senha fica cifrada no servidor e não volta para nenhuma tela. A gestão só fica sabendo que existe e-mail de cliente parado, sem o conteúdo.' },
        { p: 'Os meus e-mails ficam copiados no sistema?', r: 'Não. A leitura é feita direto na caixa, na hora. O sistema guarda só remetente, assunto e data das mensagens novas da Entrada por 30 dias, para o contador e as pendências.' },
        { p: 'Quando o e-mail de cliente vira pendência?', r: 'Não lido há mais de 4 horas úteis, ou lido e sem resposta há mais de 8 horas úteis, aparece no seu Início. Sem resposta há mais de 2 dias úteis, entra na Caixa de decisões do gestor da sua área. Os prazos são ajustáveis pelo Administrador.' },
        { p: 'Vou receber WhatsApp a cada e-mail?', r: 'Não. Aviso de e-mail é só no sistema (número no menu e balão). Quando um e-mail de cliente fica parado, a gestão é avisada pela escada de cobrança, com no máximo um resumo por dia.' },
        { p: 'O que acontece se eu desconectar?', r: 'A senha guardada é apagada do servidor e os avisos param. As mensagens continuam na sua caixa (webmail e celular). Para voltar, conecte de novo.' },
        { p: 'Funciona no COMMAND?', r: 'Sim, na tela E-mail do COMMAND, com o mesmo funcionamento. Lá a conexão é feita uma vez também (a mesma senha da caixa).' }
      ],
      secoesManual: [
        { titulo: 'Segurança da leitura', paragrafos: [
          'O conteúdo da mensagem é limpo no servidor antes de chegar à tela: saem scripts, formulários, quadros embutidos e qualquer código. A mensagem é mostrada num quadro isolado, sem permissão para rodar nada.',
          'Imagens de fora ficam bloqueadas até você tocar em "Mostrar imagens". Links pedem confirmação mostrando o site de destino; quando o texto do link mostra um endereço diferente do destino, o aviso destaca a diferença (sinal comum de golpe).',
          'Nunca digite a senha do e-mail ou do SGO+ em site aberto por link de e-mail.'
        ] },
        { titulo: 'Caixas compartilhadas (Administrador)', paragrafos: [
          'Na aba "Caixas compartilhadas", toque em "Cadastrar caixa compartilhada", informe o endereço, o nome que o cliente vê e a senha, marque as áreas e as pessoas com acesso e toque em "Testar e gravar".',
          'Uma caixa é pessoal ou compartilhada, nunca as duas. "Ver trilha de acesso" mostra quem abriu, leu, respondeu ou mudou a caixa, sem o conteúdo das mensagens.',
          '"Remover do sistema" apaga a senha guardada; as mensagens continuam no servidor de e-mail.'
        ] },
        { titulo: 'Limites', paragrafos: [
          'Até 30 mensagens ou 100 destinatários por hora por pessoa, até 50 destinatários por mensagem e até 18 MB de anexos somados (padrões do servidor). Os envios feitos por outras telas em seu nome também contam.'
        ] }
      ]
    }
  };
}
