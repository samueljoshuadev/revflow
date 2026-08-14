# Deploy do RevFlow na Netlify

O projeto já está preparado para rodar como aplicação Next.js na Netlify. O
arquivo `netlify.toml` configura o build, o runtime Next.js e o Node 20.

## 1. Importar o projeto

No painel da Netlify, escolha **Add new site → Import an existing project** e
conecte o repositório do RevFlow. Não é necessário trocar o comando de build:

- Build command: `npm run build`
- Publish directory: `.next`
- Node: `20`

## 2. Cadastrar variáveis de ambiente

Copie os nomes de `.env.example` para as variáveis do site na Netlify. As
variáveis públicas necessárias são:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` com a URL final do site

Cadastre também os segredos das integrações que serão usadas, sempre como
variáveis de ambiente da Netlify e nunca no código ou em variáveis
`NEXT_PUBLIC_*`.

## 3. Atualizar o Supabase

Em **Authentication → URL Configuration**, adicione:

- Site URL: a URL final da Netlify
- Redirect URL: `https://SEU-DOMINIO/auth/callback`

Se o Google Calendar estiver conectado, atualize também no Google Cloud o
redirect URI para:

`https://SEU-DOMINIO/api/integrations/google/callback`

Depois de alterar a URL, reconecte a integração do Google no RevFlow.

## 4. Validar após publicar

1. Acesse `/login` e faça login.
2. Crie um lead e confirme o pipeline.
3. Abra a Agenda e teste uma reunião.
4. Confira `/api/health`; o retorno esperado é `status: ok`.
5. Confirme as integrações em **Configurações → Integrações**.

O funcionamento real depende das variáveis de ambiente, das migrations já
aplicadas no Supabase e das autorizações de cada provedor. A Netlify não deve
receber a `SUPABASE_SERVICE_ROLE_KEY` no navegador; ela deve ficar somente nas
variáveis server-side quando for necessária.
