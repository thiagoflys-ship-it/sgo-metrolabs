# Cadastros e Administração redesenhados (17/10/2026)

Não publicado no Google. Testado no servidor próprio em modo ensaio, com cópia da base dev e só dados de teste.

## O que mudou para quem usa

Todas as telas de **Cadastros** (Clientes, Unidades, Equipamentos, Vínculos, Arquivo de documentos) e de **Administração** (Usuários, Configurações, Chaves e senhas) seguem o mesmo padrão da página Padrões de referência:

- **Resumo em números que filtra.** Exemplos: total, ativos, inativos, sem unidade, cadastro incompleto, documento vencido ou vencendo, sem documento, sem arquivo, sem celular, nunca entraram. Clicar no número filtra a lista; clicar de novo desfaz o filtro.
- **Barra única** com a busca (aceita nome, CNPJ com ou sem máscara, TAG, e-mail), os filtros e a ordenação. A ação principal ("Novo …") fica à direita. "Limpar filtros" só aparece quando há filtro ativo.
- **Linhas compactas.** "Editar" fica visível na linha; o resto vai para **Mais**. As ações de risco (Inativar, Excluir) aparecem em vermelho e pedem confirmação. Quando a ação não é permitida, ela aparece desabilitada e diz a quem pedir.
- **Painel lateral de detalhe** com abas:
  - Clientes: dados, árvore cliente → unidades → equipamentos, documentos.
  - Unidades: dados, equipamentos, documentos.
  - Equipamentos: dados, documentos, atendimentos do Auvo.
- **Formulários no painel**, em seções (Identificação, Endereço, Contato, Vínculo, Arquivo…). A validação aparece no próprio campo:
  - CNPJ com dígito verificador;
  - CNPJ repetido, com link "Abrir o cadastro existente";
  - TAG repetida no mesmo cliente;
  - e-mail, telefone e celular.

  "Preencher pela Receita" (SGO_CnpjConsulta) só preenche campos vazios e diz quais ficaram como a pessoa digitou. Fechar o painel com alteração não salva pede confirmação.
- **Celular.** É a mesma tela, com cartões no lugar da tabela, o painel em tela cheia abaixo da barra do topo, campos de 16 px, toques de 44 px e sem rolagem lateral. O **Voltar** fecha o painel (e fica na lista); na lista, volta ao Início. As listas antigas do celular (`renderMobileLista*` no JS_Core) ficaram só para o assistente do certificado.
- **Ajuda longa** recolhida em "Como funciona". **Avisos de resultado** curtos no canto: os de sucesso somem sozinhos; os de erro ficam até fechar.

### Por tela

- **Vínculos** virou tela de verdade. Abre por `abrir('vinculos')`, dentro do sistema, com o menu marcado, o título no casco e o Voltar do celular. Acabou a janela por cima de tudo. O fluxo é guiado:
  1. origem: tipo, busca e situação;
  2. situação: a que está ligado, o que depende dele, onde aparece nos módulos e as últimas alterações;
  3. ação e motivo: só a gestão; quem não é da gestão lê a quem pedir;
  4. prévia do impacto: impedimentos, avisos, os documentos que acompanham (de → para) e todas as alterações;
  5. confirmar com motivo.

  A aba **Histórico das alterações** (gestão) lista as operações de `SYS_VINCULOS_AUDITORIA` com motivo, autor e cada antes/depois. Os números do topo mostram clientes sem unidade, unidades com vínculo pendente, equipamentos inconsistentes, possíveis duplicidades e regulares.
- **Usuários** virou tela própria (`abrir('usuarios')`; antes era um atalho que rolava a página de Configurações).
  - Colunas: perfil, situação, e-mail, celular (WhatsApp) e último acesso (o LOGIN_OK mais recente do SYS_LOGS).
  - Destaques: "Sem celular" em evidência (o Assistente do ponto do COMMAND precisa do celular) e "Nunca entraram".
  - Filtros por perfil e por situação.
  - Em **Mais**: Redefinir senha (janela com a senha duas vezes), Inativar/Reativar e Excluir.
  - Conta de Administrador sem Editar para quem não é Administrador; a própria conta e o único Administrador ativo aparecem bloqueados no menu, com o motivo.
- **Configurações** em blocos, cada um com título, explicação curta e Salvar próprio:
  - Sessão e ociosidade: tempo em minutos e o som com chave liga/desliga;
  - Alertas de calibração: só o Administrador;
  - Sessão neste navegador;
  - Empresa e sistema: atalhos para Usuários, Chaves e senhas e Padrões.
- **Chaves e senhas** agrupadas por integração: IA, Auvo, E-mail, WhatsApp oficial (Meta), Z-API, Rastreador, Relatórios técnicos e COMMAND.
  - Situação de cada grupo: **Configurada**, **Falta configurar** (diz o que falta) ou **Com erro no teste** (último teste falhou e nenhuma chave do grupo mudou depois).
  - "Testar" ao lado do grupo; o resultado do último teste fica guardado (`CHV_TESTE_<tipo>`, sem segredo).
  - Liga/desliga e provedor do WhatsApp escolhidos em lista, sem digitar "1" ou "meta".
  - "Apagar" em vermelho com confirmação; ajuda de cada chave recolhida.
  - O valor gravado continua nunca aparecendo: das chaves de API, só os 4 últimos caracteres.
- **Arquivo de documentos**: a tela saiu do Index.html e foi para o JS_Admin.html.
  - Resumo: vencidos, vencendo em 30 dias e sem arquivo.
  - Filtros: categoria e cliente.
  - Para quem não é da gestão, o vínculo já preenchido fica travado na edição.
  - Na edição, enquanto as listas de unidade e equipamento carregam, vale o vínculo atual. Sem isso, salvar cedo apagaria o equipamento.
- **Inventário de equipamentos**: não foi alterado. Ele é um gerador de relatório (`SGO_Inventario_ConteudoModulo.js`) e já tem indicadores e filtros; só foi conferido nas capturas.

## Regras de negócio conferidas (todas mantidas no servidor)

| Regra | Como foi conferida |
|---|---|
| Só um Administrador mexe em conta Administrador; nunca fica sem Administrador ativo | Gestor: sem Editar e sem Redefinir senha em conta Administrador. O servidor recusa a troca de senha ("contas de Administrador só podem ser criadas ou alteradas por um Administrador"). O perfil Administrador não é oferecido ao Gestor. A própria conta não é inativada. |
| Sessão de inativado é encerrada | Mantida (SGO_Auth › validarSessao, até 5 min); a mensagem diz isso. |
| Edição nunca apaga campo ausente | Editar cliente, unidade, equipamento e documento e conferir pelo servidor que CNPJ, e-mail, endereço, cidade/UF, série, TAG, vencimento e vínculo ficaram. Redefinir senha não mexeu em e-mail, celular nem perfil. |
| Cliente só vê a própria empresa | `cadastrosPainel`/`cadastrosDetalhe` recortam pelo `clienteId` da sessão; o perfil Cliente lista só os dados dele e recebe "não encontrado" no detalhe de outro cliente. |
| Excluir e mudar vínculo só pela gestão | Técnico e Comercial: Excluir desabilitado com a quem pedir; Vínculos sem ações; o servidor recusa trocar o vínculo de documento. |
| Documentos acompanham unidade/equipamento que muda de cliente | A transferência da unidade "Anexo Norte" levou 2 documentos e o equipamento. A prévia listou os documentos e o histórico mostra "2 documento(s) acompanharam". SYS_VINCULOS_AUDITORIA tem as linhas de DOC_DOCUMENTOS. |
| Equipamento com documento não é excluído | O menu deixa Excluir desabilitado ("use Inativar") e o servidor também recusa. |
| Chaves e senhas só para o dono, nunca mostra valor | Depois de gravar, a página não contém o valor (só "••••" e o final); apagar confirmado; quem não é dono não vê o item no menu. |
| CNPJ pela Receita | Mantido (`SGO_apiConsultarCnpjDados`), agora sem sobrescrever o que foi digitado. |
| E-mail e celular dos usuários | Colunas próprias, "Sem celular" destacado e filtrável. |

## Servidor (portal)

- **SGO_CadastrosPainel.js (novo, só leitura)**:
  - `cadastrosPainel(sessionId, tipo)`: lista com contagens e pendências.
  - `cadastrosDetalhe(sessionId, tipo, id)`: vínculos para o painel.
  - Regra de vencimento igual à da central: vencido ou vence hoje = Vencido; até 30 dias = Vencendo.
- **SGO_Usuarios.js**: `usuariosPainel` (mesma permissão da lista, com último acesso e "sem celular"; a senha não sai).
- **SGO_Vinculos.js**: `vinculosHistorico` (só a gestão; agrupa a auditoria por operação).
- **SGO_Chaves.js**:
  - grupos por integração;
  - `opcoes` para liga/desliga e para o provedor;
  - último teste guardado em `CHV_TESTE_<tipo>` e devolvido em `Chaves_apiListar.testes`;
  - `alteradoIso` em cada item.

  Validações e gravação não mudaram.

## Tela (portal)

- `JS_Cadastros.html`: componentes comuns (`CadUI_*`, `CadTela_*`), Clientes e Unidades.
- `JS_Equipamentos.html`: Equipamentos e QR Code.
- `JS_Admin.html`: Arquivo de documentos, Usuários e Configurações.
- `JS_Vinculos.html`, `JS_Chaves.html`.
- `Index.html`: Vínculos e Usuários viraram itens de menu com `data-mod`; o render antigo de Documentos saiu.
- `JS_Core.html`: rotas `vinculos` e `usuarios`, nomes no `atualizarBadgeModulo_` e as telas de cadastro iguais no celular.
- Os nomes antigos chamados por outras partes continuam existindo, como `clientesPesquisar_` (busca rápida Ctrl K), `clientesEditar_`, `vincOpen_`, `equipamentosGerarQR_` e `SGO_rotuloPerfil_`.

## Estilos

- Seção `/* CADASTROS E ADMINISTRAÇÃO 17/10 */` no fim do `UI_Estilos.html` (prefixo `cadx-`), sem mexer nas regras globais.
- Para as duas reformulações ficarem iguais, a mesma seção traz os componentes `bc-*` da página Padrões (`bc-resumo`, `bc-resumo-item`, `bc-resumo-num`, `bc-resumo-rot`, `bc-faixa`, `bc-selo`, `bc-mais-menu`, `bc-perigo`, `bc-painel*`, `bc-vazio`), com os mesmos valores de `pdrEstilos_`, agora globais.
- As telas de Cadastros e Administração usam essas classes junto com as `cadx-`.
- `pdrEstilos_` não foi alterado. A página de Padrões foi conferida no Playwright depois da mudança e ficou igual.

## Como foi testado

- Cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_cadadm\pglite`. O servidor rodou com `SGO_ENSAIO=1 SGO_AGENDADOR=0 PORTA=8191 WORKERS=2`, com o portal lido direto da pasta, e foi parado no fim.
- Dados de teste:
  - 5 clientes (um agrupador sem unidade e um inativo);
  - 6 unidades;
  - 6 equipamentos;
  - 6 documentos (vencido, vencendo, em dia, sem arquivo);
  - 11 usuários de todos os perfis (com e sem celular, um inativo, dois Administradores).
- Fluxos pela tela (Playwright), **90 de 90 passaram** numa base zerada:
  - criar, editar, inativar, reativar e excluir em Clientes, Unidades, Equipamentos e Documentos;
  - transferência no Vínculos com os documentos acompanhando;
  - usuário novo, login, redefinição de senha, inativação e Administrador protegido;
  - Chaves: gravar, testar e apagar uma chave de teste sem mostrar o valor, e provedor por lista;
  - Configurações;
  - perfis ADMIN, GESTOR, TÉCNICO, COMERCIAL e CLIENTE;
  - iPhone 13: sem rolagem lateral, campos de 16 px, toques de 44 px, Voltar fechando o painel.
- Capturas antes e depois em 1366, 1920 e iPhone 13, com ADMIN, GESTOR, TÉCNICO, COMERCIAL e CLIENTE.
- Erros de console: só o 404 do logotipo do Drive, que não existe na base de teste (já registrado nas verificações anteriores).
- Defeitos achados e corrigidos durante os testes:
  - salvar documento antes de as listas carregarem;
  - painel aberto depois de trocar de tela (resposta atrasada);
  - menu "Mais" fechando ao rolar.
- `npx vitest run` no sgo_servidor: 21 arquivos, 102 testes, todos passando.
- Scripts: `…\scratchpad\cad\` (`seed.mjs`, `fluxos.mjs`, `capturar.mjs`). Capturas: `%TEMP%\sgo_cadadm\capturas\antes`, `…\depois` e `…\fluxos`.

## Pendências e notas

- Dados continuam gravados em maiúsculas (normalização antiga; decisão do dono).
- Último acesso vem do SYS_LOGS (últimas 40 mil linhas, guardado por 60 s). Quem entrou antes disso aparece como "Nunca entrou".
- As listas antigas do celular (`renderMobileLista*`, `renderMobileForm*`) continuam no JS_Core para o assistente do certificado; podem ser enxugadas depois.
- O `sgo_servidor/legado` (retrato do portal usado nos testes do servidor) precisa ser atualizado quando o dono do servidor trouxer este portal.
