# Layout Padrão Metrolabs - Autoclave Standalone Dark

Use este padrão quando o usuário pedir: "igual ao sistema da autoclave", "layout da autoclave", "dark standalone" ou "aquele layout que aprovamos".

## Identidade visual
- Fundo dark com gradientes radiais sutis.
- Container central com largura máxima de 1560px.
- Cabeçalho sticky em painel escuro translúcido, borda fina e linha vertical à esquerda em degradê azul/verde.
- Logo Metrolabs dentro de bloco branco no cabeçalho.
- Título curto, subtítulo técnico e widgets à direita quando fizer sentido.
- Barra de ações em painel escuro abaixo do cabeçalho.
- Conteúdo em painéis dark, com títulos uppercase e ponto verde luminoso antes do título.
- Campos com fundo `#0b1220`, borda `#30363d`, foco azul `#38bdf8`.
- Botão primário verde em degradê, texto escuro `#052e16`.
- Botões secundários em `#111827` com texto azul claro.
- Área de log/placeholder em terminal preto `#010409` com texto verde.

## Classes-base recomendadas
- `.wrap`
- `.header-card`
- `.brand`
- `.logo-img`
- `.title-area`
- `.header-widgets`
- `.status-badge`
- `.action-bar`
- `.grid-layout`
- `.panel`
- `.section-divider`
- `.form-row`
- `.form-group`
- `.form-control`
- `.btn-primary`, `.btn-secondary`, `.btn-light`
- `.terminal-wrap`, `.terminal-header`, `.terminal`
- `.card-note`

## Regra importante
Não inventar sidebar, dashboard ou estrutura SGO quando o usuário pedir este layout. Este padrão é standalone, como o sistema de autoclave publicado em `/exec`.

## Preservação de lógica
Ao aplicar em sistemas existentes, preservar IDs, `onclick`, `google.script.run`, nomes de funções e campos. Alterar somente CSS e marcação visual quando necessário.
