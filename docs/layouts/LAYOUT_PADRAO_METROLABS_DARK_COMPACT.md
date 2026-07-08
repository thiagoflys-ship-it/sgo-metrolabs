# Layout Padrao METROLABS Comfort Dark Compact

Status: fonte da verdade para revisoes visuais do Portal SGO+.
Atualizado em: 2026-07-07.
Base real validada: projeto modelo Apps Script `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`, bloco `METROLABS COMFORT DARK - paleta ergonomica para uso prolongado` em `UI_Estilos.html`.
Projeto destino: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`.

## Objetivo

Este padrao existe para uso prolongado por colaboradores, com baixa fadiga visual. A interface deve parecer tecnica, escura, compacta e calma. O foco nao e deixar tudo mais chamativo; e reduzir ruido, controlar contraste e manter leitura confortavel durante o dia inteiro.

## Principios obrigatorios

- Fundo escuro suave, nao preto puro como base dominante.
- Sem gradientes coloridos fortes como padrao de cards ou paineis.
- Verde e azul em versoes dessaturadas para reduzir estridencia.
- Amarelo, laranja, vermelho e roxo apenas para alerta/status real, sempre com baixa saturacao.
- Cards com raio de 8px ou 10px, borda discreta e sombra leve.
- Botao primario sem brilho forte, sem sombra verde pesada.
- Hover sem transformacao agressiva e sem salto visual.
- Texto comum entre 13px e 15px conforme densidade da tela.
- Labels 12px a 13px, fortes, mas sem caixa alta forcada em formularios longos.
- Inputs com fundo `--input`, foco azul suave e sombra curta.
- Tabelas densas e legiveis, com hover de baixa opacidade.
- Nao alterar layouts A4, documentos oficiais, PDFs, validadores publicos, QR publico, iframes de documento, `srcdoc`, canvas de assinatura ou impressoes.

## Tokens oficiais Comfort

```css
:root {
  color-scheme: dark;
  --bg: #111827;
  --bg-2: #172033;
  --card: #1f2937;
  --card-soft: #273244;
  --panel: #1f2937;
  --panel-2: #172033;
  --panel-soft: #273244;
  --surface: #1f2937;
  --surface-2: #172033;
  --surface-3: #273244;
  --input: #172033;
  --input-hover: #1d293a;
  --text: #d9e2ec;
  --text-strong: #eef3f8;
  --muted: #9aa8b8;
  --muted-2: #7f8da0;
  --border: #3a4657;
  --border-strong: #4a5870;
  --accent: #6fbf8f;
  --accent-2: #7aa7c7;
  --metrolabs: #6fbf8f;
  --metrolabs-dark: #4f9f75;
  --metro-green: #6fbf8f;
  --metro-green-dark: #4f9f75;
  --metro-blue: #7aa7c7;
  --metro-blue-dark: #9bbad2;
  --metro-gold: #d6a94f;
  --success: #6fbf8f;
  --info: #7aa7c7;
  --warning: #d6a94f;
  --danger: #e08a8a;
  --success-bg: rgba(111,191,143,.14);
  --info-bg: rgba(122,167,199,.14);
  --warning-bg: rgba(214,169,79,.14);
  --danger-bg: rgba(224,138,138,.13);
  --pending-bg: rgba(214,169,79,.14);
  --pending: #d6a94f;
  --shadow: 0 10px 28px rgba(0,0,0,.22);
  --shadow-soft: 0 8px 22px rgba(0,0,0,.18);
  --shadow-hover: 0 12px 30px rgba(0,0,0,.24);
  --shadow-strong: 0 14px 36px rgba(0,0,0,.28);
  --radius: 8px;
  --radius-sm: 6px;
}
```

## Regras de aplicacao no portal destino

- A camada base deve substituir a versao mais forte que usa `#0d1117`, `#22c55e` e `#38bdf8` como protagonistas.
- Cards e modais devem preferir `background: #1f2937` ou `#172033`, nao gradiente forte em todos os componentes.
- Botoes primarios devem usar `#6fbf8f`, texto escuro `#102016`, sem sombra neon.
- Botoes secundarios devem usar `#273244`, texto `#d9e2ec`, borda `#3a4657`.
- Foco deve usar `#7aa7c7` com `box-shadow: 0 0 0 3px rgba(122,167,199,.16)`.
- Alertas devem ser suaves: sucesso `rgba(111,191,143,.14)`, info `rgba(122,167,199,.14)`, warning `rgba(214,169,79,.14)`, danger `rgba(224,138,138,.13)`.
- Hover nao deve usar `transform: translateY`, brilho forte ou sombra pesada em telas operacionais.

## Antipadroes encontrados no destino em 2026-07-07

- Verde `#22c55e` usado como acento principal em excesso.
- Azul `#38bdf8` usado como foco/destaque muito luminoso em muitos pontos.
- Fundo `#0d1117` e `#0b1020` deixam a interface mais contrastada que o modelo Comfort.
- Muitas sombras `0 22px 60px` e `--shadow-lg` cansam em modais e cards.
- Gradientes fortes aplicados como padrao em cards, headers e botoes.
- Mobile recebeu tema escuro por CSS geral, mas precisa de suavizacao Comfort e revisao visual em tela real.

## Zonas protegidas

Nao aplicar esta camada em:

- `Validacao_Documento.html`.
- `SGO_DocumentFactory.js`.
- `SGO_Documentos.js` quando estiver gerando HTML oficial, PDF, A4, etiquetas, validacao ou QR.
- `SGO_QRCode.js` publico.
- `SGO_Validacao.js` publico.
- `JS_Fin_Termo.html`.
- `JS_Fin_Prestacao.html`.
- Previews A4, iframes, `srcdoc`, canvas de assinatura e areas de impressao.

## Referencias locais usadas

- Projeto modelo baixado temporariamente em `_tmp_metrolabs_model/`.
- `_tmp_metrolabs_model/UI_Estilos.html`, linhas do bloco `METROLABS COMFORT DARK`.
- `apps-script-imports/projeto_exec_3_akfycbyv/Index.html`.
- `apps-script-imports/metrolabs_planejamento_cme/Index.html`.