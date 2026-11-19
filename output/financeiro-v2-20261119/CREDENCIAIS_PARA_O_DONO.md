# Credenciais para o dono — o que pedir e onde gravar (Financeiro v2, 19/11/2026)

**Para que serve.** Esta lista mostra, banco por banco, o que pedir e onde gravar. Cada empresa (matriz, filial e prestadora) tem as próprias credenciais.

**O SGO+ funciona sem elas.** Enquanto uma credencial não estiver gravada, a tela mostra "não configurado" e o trabalho segue pelo arquivo OFX ou pelo Omie, como hoje.

**Onde gravar.** Na tela **Chaves e senhas** (`https://sgo.metrolabs.com.br/_sgo/segredos`, só para administrador):

- O valor gravado nunca aparece de novo. Para trocar, grave outro por cima.
- Os nomes abaixo só vão aparecer na tela depois da etapa (a) do desenvolvimento.
- Certificados (`.pem`, `.crt`, `.key`) se colam inteiros, do `-----BEGIN` ao `-----END`.
- Arquivos `.pfx` vão convertidos para texto (base64). A própria tela vai oferecer o botão "Escolher arquivo".

**Nunca** mande chave ou senha por WhatsApp ou e-mail para ninguém da equipe (nem para o desenvolvedor). Quem grava é o dono ou o Charles, direto na tela.

Nos nomes, troque `<EMPRESA>` por `MATRIZ`, `FILIAL` ou `PRESTADORA`.

---

## 0. Antes de tudo (5 minutos do dono)

1. **Os CNPJs e a razão social das 3 empresas.** Vão no cadastro de Empresas do SGO+ (etapa a). Hoje o Omie que o SGO+ usa só conhece a matriz (CNPJ final 0001-21).
2. **A filial e a prestadora têm Omie próprio?** Ou seja, um login, uma empresa e notas emitidas separadamente.
   - No Omie ligado ao SGO+ existem contas com o nome das três ("Sicredi matriz", "Sicredi filial", "Sicredi prestadora", "Itaú Unibanco Prestadora", "CAIXA FILIAL"). Mas existe **uma empresa só**.
   - Se a filial e a prestadora têm Omie próprio: peça as chaves (item 1).
   - Se não têm: diga isso. O SGO+ separa as empresas pela conta bancária e pelo departamento.
3. **De quem é cada conta bancária.** Para cada banco (Sicredi, Sicoob, Itaú, Caixa, Banco do Brasil), diga a qual CNPJ a conta pertence. A tela de Empresas terá esse vínculo.

## 1. Omie (uma chave por empresa)

**Onde pegar.** No Omie de cada empresa: Configurações → Aplicativos → **Desenvolvedor** (ou "Integrações → API") → copiar a **App Key** e o **App Secret**.

| Empresa | Gravar em |
|---|---|
| Matriz | `OMIE_APP_KEY` e `OMIE_APP_SECRET` (**já gravadas desde 06/11; não mexa**) |
| Filial (se tiver Omie próprio) | `OMIE_APP_KEY_FILIAL` e `OMIE_APP_SECRET_FILIAL` |
| Prestadora (se tiver Omie próprio) | `OMIE_APP_KEY_PRESTADORA` e `OMIE_APP_SECRET_PRESTADORA` |

## 2. Sicredi (o dono já tem a chave)

**Atenção:** em 19/11, **nenhuma chave do Sicredi** está gravada no SGO+. Quando gravar, confira **qual API** a chave abre. O Sicredi dá uma credencial **por produto e por conta**.

**O que pedir ao gerente da cooperativa, por empresa:**
1. Liberar a **API Pix**. A empresa assina o termo de adesão e recebe o "ID da adesão".
2. Liberar a **Cobrança Online (API de boletos)**, com **boleto híbrido (Pix)**. O boleto híbrido exige uma chave Pix **aleatória** na conta.
3. Liberar as APIs de **Extrato** e **Saldo de Conta Corrente**.
4. Liberar o **Multipag**, a API de pagamentos e transferências. Pergunte também: "o pagamento enviado pela API fica esperando aprovação no Internet Banking?"
5. Informar o número da **cooperativa**, do **posto** e do **código do beneficiário**.

**No portal developer.sicredi.com.br** (quem tem o login):
- **Pix.** Abrir um chamado "Acesso à API Pix" com o CNPJ e o ID da adesão. Depois, registrar o pedido de certificado (CSR) e baixar o certificado e a chave da aplicação. Por fim, gerar o Client ID e o Client Secret.
- **Boletos.** Criar uma aplicação com "API AUTH - OPENAPI - PARCEIROS" e "API COBRANÇA BOLETO" e pedir o token de produção. A "Developer Key" aparece em "Tokens de Acesso".
- **Código de Acesso dos boletos.** É gerado no Internet Banking: Cobrança → Código de Acesso → Gerar.

| O que é | Gravar em |
|---|---|
| Ambiente (`homologacao` ou `producao`) | `SICREDI_AMBIENTE` |
| Pix: Client ID / Client Secret | `SICREDI_<EMPRESA>_PIX_CLIENT_ID` / `SICREDI_<EMPRESA>_PIX_CLIENT_SECRET` |
| Pix: certificado (.cer) e chave privada (.key) | `SICREDI_<EMPRESA>_PIX_CERT` / `SICREDI_<EMPRESA>_PIX_CHAVE_PRIVADA` |
| Chave Pix aleatória da conta | `SICREDI_<EMPRESA>_PIX_CHAVE` |
| Boletos: Developer Key (x-api-key) | `SICREDI_<EMPRESA>_COB_API_KEY` |
| Boletos: Código de Acesso do Internet Banking | `SICREDI_<EMPRESA>_COB_CODIGO_ACESSO` |
| Cooperativa / posto / código do beneficiário | `SICREDI_<EMPRESA>_COOPERATIVA` / `SICREDI_<EMPRESA>_POSTO` / `SICREDI_<EMPRESA>_BENEFICIARIO` |
| Extrato e saldo: Client ID / Client Secret | `SICREDI_<EMPRESA>_CONTA_CLIENT_ID` / `SICREDI_<EMPRESA>_CONTA_CLIENT_SECRET` (se o portal usar o mesmo certificado do Pix, não há outro a gravar) |
| Pagamentos (Multipag): Client ID / Client Secret | `SICREDI_<EMPRESA>_PAG_CLIENT_ID` / `SICREDI_<EMPRESA>_PAG_CLIENT_SECRET` |

**Validade.** O certificado do Pix do Sicredi vence. O SGO+ vai avisar 30 dias antes.

## 3. Sicoob (o dono está providenciando)

**O que pedir ao gerente de Cash da cooperativa:**
- liberar as APIs **Conta Corrente** (saldo e extrato), **Cobrança Bancária v3** (boletos, com webhook), **Pix Recebimentos**, **Pix Pagamentos**, **Pagamentos** (boletos e convênios) e **SPB/TED**;
- informar o **número do cliente (cooperado)** e a **conta**.

**No portal developers.sicoob.com.br:**
1. Criar o aplicativo e marcar as APIs.
2. Responder **"Não"** a "empresa parceira".
3. Enviar a parte pública do **certificado digital e-CNPJ A1** da empresa (o mesmo da nota fiscal serve).
4. O portal gera o **Client ID**.

| O que é | Gravar em |
|---|---|
| Ambiente | `SICOOB_AMBIENTE` |
| Client ID | `SICOOB_<EMPRESA>_CLIENT_ID` |
| Certificado A1 (.pfx) e a senha dele | `SICOOB_<EMPRESA>_CERT_PFX` / `SICOOB_<EMPRESA>_CERT_SENHA` |
| Número do cliente / conta corrente | `SICOOB_<EMPRESA>_NUMERO_CLIENTE` / `SICOOB_<EMPRESA>_CONTA` |
| Chave Pix aleatória da conta (para boleto com Pix) | `SICOOB_<EMPRESA>_PIX_CHAVE` |

## 4. Itaú (o dono está providenciando)

**O que pedir ao gerente:**
1. Contratar as APIs de **Cobrança (boleto com Pix / BolePix)**, **Pix Recebimentos** e **Conciliação/Extrato de Conta Corrente PJ**.
2. Perguntar se existe **API de pagamentos (SISPAG)**. Se não existir, os pagamentos do Itaú continuam pelo arquivo SISPAG ou pelo Internet Banking.
3. O **Analista de Operações** do Itaú envia o Client ID e um token temporário.

**Geração do certificado.** O desenvolvedor gera o par de chaves e o certificado junto com o dono, numa sessão marcada, com a tela "Gerar certificado Itaú" do SGO+. O **Client Secret aparece uma única vez** nessa hora e já é gravado direto.

| O que é | Gravar em |
|---|---|
| Ambiente | `ITAU_AMBIENTE` |
| Client ID / Client Secret | `ITAU_<EMPRESA>_CLIENT_ID` / `ITAU_<EMPRESA>_CLIENT_SECRET` |
| Certificado (.crt) e chave privada (.key) | `ITAU_<EMPRESA>_CERT` / `ITAU_<EMPRESA>_CHAVE_PRIVADA` |
| Agência / conta | `ITAU_<EMPRESA>_AGENCIA` / `ITAU_<EMPRESA>_CONTA` |
| Chave Pix aleatória | `ITAU_<EMPRESA>_PIX_CHAVE` |

**Validade.** O certificado do Itaú vence em até 1 ano e só pode ser renovado no último mês. O SGO+ vai avisar.

## 5. Caju (o dono já tem a chave)

**Atenção:** em 19/11, **nenhuma chave do Caju** está gravada no SGO+.

**Onde pegar:**
- O Client ID e o Client Secret vêm do time do Caju, quando ele registra a integração.
- O ID e a senha da integração são gerados no portal RH do Caju pelo administrador da conta.

**Onde gravar.** O grupo "Caju" já existe em Administração → Chaves e senhas do SGO+.

| O que é | Gravar em |
|---|---|
| Ambiente (`homologacao` ou `producao`) | `CAJU_AMBIENTE` |
| Client ID / Client Secret | `CAJU_CLIENT_ID` / `CAJU_CLIENT_SECRET` |
| ID / senha da integração | `CAJU_INTEGRACAO_ID` / `CAJU_INTEGRACAO_SENHA` |

Se outra empresa (filial ou prestadora) também tiver conta no Caju, use os mesmos nomes com o final `_FILIAL` ou `_PRESTADORA`.

**A API do Caju não dá o extrato dos gastos do cartão.** A conferência dos gastos continua pelo CSV exportado do portal do Caju.

## 6. Opcional: guias de imposto automáticas

O Omie não emite guia de imposto pela API. Há dois caminhos:

- **Sem custo:** o contador manda as guias (PDF), a Wanessa anexa no SGO+ e o SGO+ lê o código de barras, o valor e o vencimento.
- **Com custo:** contratar a **API Integra Contador** do SERPRO, que emite a guia DAS e o DARF da DCTFWeb e cobra por guia. Exige certificado e-CNPJ ou procuração ao contador. Se quiser este caminho, peça ao contador e grave em `SERPRO_CONSUMER_KEY` e `SERPRO_CONSUMER_SECRET`.
