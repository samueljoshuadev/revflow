# Deploy do RevFlow em VPS Hostinger

O RevFlow é uma aplicação Next.js com Server Components, Server Actions,
proxy de sessão e rotas de webhook. Ela exige um runtime Node persistente,
então só roda em **VPS** da Hostinger — a Hospedagem Web e o Cloud Hosting
(Apache/LiteSpeed + PHP) não executam este tipo de aplicação.

Arquitetura no servidor:

```
internet → Nginx (443/80) → Next.js standalone (127.0.0.1:3000, PM2)
                                   ↓
                             Supabase (externo)
```

Layout de diretórios:

```
/var/www/loovimob/repo                  checkout do GitHub
/var/www/loovimob/shared/.env.production  segredos, root:root, chmod 600
/var/www/loovimob/releases/<timestamp>  releases
/var/www/loovimob/current               symlink para o release ativo
/var/log/loovimob                       logs do PM2
```

## 1. Preparar o VPS

Em um Ubuntu 24.04 limpo, como root:

```bash
apt update && apt upgrade -y
apt install -y nginx git curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

mkdir -p /var/www/loovimob/{releases,shared} /var/log/loovimob
git clone https://github.com/samueljoshuadev/revflow.git /var/www/loovimob/repo
```

A porta 3000 fica fechada no firewall de propósito: o app só escuta em
`127.0.0.1` e todo o tráfego externo passa pelo Nginx.

## 2. Cadastrar as variáveis de ambiente

Crie `/var/www/loovimob/shared/.env.production` usando `.env.example` como
referência, e restrinja o acesso:

```bash
chown root:root /var/www/loovimob/shared/.env.production
chmod 600 /var/www/loovimob/shared/.env.production
```

Obrigatórias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` com a URL final (`https://SEU-DOMINIO`)
- `INTEGRATION_ENCRYPTION_KEY` — **a mesma** usada na Netlify, senão as
  credenciais de integração já gravadas no Supabase não descriptografam
- `CRON_SECRET`

`SUPABASE_SERVICE_ROLE_KEY` e os segredos de webhook entram apenas neste
arquivo, nunca em variáveis `NEXT_PUBLIC_*`.

## 3. Publicar

```bash
cd /var/www/loovimob/repo
deploy/deploy.sh main
```

O script faz `npm ci`, `lint`, `typecheck`, `build`, monta a árvore standalone
(o build `output: "standalone"` não inclui `public/` nem os chunks de cliente),
troca o symlink `current`, recarrega o PM2 e só considera o release bom depois
que `/api/health` responde. Falhou, o symlink anterior continua ativo.

Para o PM2 subir junto com o servidor:

```bash
pm2 startup systemd && pm2 save
```

## 4. Nginx e TLS

```bash
cp /var/www/loovimob/current/deploy/nginx/loovimob.conf /etc/nginx/sites-available/loovimob
sed -i 's/DOMINIO/seu-dominio.com.br/g' /etc/nginx/sites-available/loovimob
ln -sfn /etc/nginx/sites-available/loovimob /etc/nginx/sites-enabled/loovimob
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br
```

Emita o certificado **só depois** que o DNS já aponta para o VPS, senão o
desafio HTTP do Let's Encrypt falha.

## 5. Cron de follow-ups

A Netlify não executava o cron (o agendamento estava em `vercel.json`, que
nenhuma plataforma lia). No VPS ele passa a rodar de fato:

```bash
crontab -u root /var/www/loovimob/current/deploy/follow-ups.cron
```

Confira com `grep loovimob-cron /var/log/syslog` depois da primeira execução.

## 6. Atualizar provedores externos

Com a URL nova no ar, atualize em cada provedor:

- **Supabase → Authentication → URL Configuration**: Site URL
  `https://SEU-DOMINIO` e Redirect URL `https://SEU-DOMINIO/auth/callback`
- **Google Cloud**: redirect URI
  `https://SEU-DOMINIO/api/integrations/google/callback`, e reconectar a
  integração no RevFlow
- **Meta / WhatsApp**: callback URL dos webhooks
  `https://SEU-DOMINIO/api/webhooks/whatsapp/meta`
- **Calendly**: `CALENDLY_REDIRECT_URI` e a URL do webhook
- **n8n e formulários**: endpoints públicos em
  `https://SEU-DOMINIO/api/public/leads/<org>/<source>`

## 7. Validar antes de virar o DNS

Com o `/etc/hosts` da sua máquina apontando o domínio para o IP do VPS:

1. `/login` e autenticação
2. criar um lead e mover no pipeline
3. Agenda e criação de reunião
4. `/api/health` retornando `status: ok`
5. **Configurações → Integrações** com as conexões ativas
6. disparar um webhook de teste de cada provedor já conectado

## 8. Virar o DNS e desligar a Netlify

1. Registro `A` do domínio (e `www`) para o IPv4 do VPS; `AAAA` para o IPv6 se
   o VPS tiver um. TTL baixo (300s) algumas horas antes da virada.
2. Esperar a propagação e confirmar `/api/health` pelo domínio real.
3. Só então remover o domínio do projeto `loovimob` na Netlify. Manter o
   projeto por alguns dias como rollback; o site da Netlify está hoje
   bloqueado por `usage_exceeded`, então ele não serve de fallback imediato.

## Operação

```bash
pm2 status
pm2 logs loovimob --lines 100
pm2 reload loovimob

deploy/deploy.sh main        # novo release
ln -sfn /var/www/loovimob/releases/<anterior> /var/www/loovimob/current && pm2 reload loovimob   # rollback
```
