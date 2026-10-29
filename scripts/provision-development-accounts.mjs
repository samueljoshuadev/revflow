#!/usr/bin/env node
/**
 * Provisiona uma conta (organização da vertical imobiliária) por empreendimento,
 * importa o espelho de vendas oficial e concede acesso aos usuários informados.
 *
 * Requer, no ambiente: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 * A service role nunca é usada em fluxo de usuário: este script é um job confiável.
 *
 * Uso:
 *   node scripts/provision-development-accounts.mjs \
 *     --config supabase/seed/development-accounts.json [--dry-run] [--send-invite]
 *
 * Idempotente: rodar de novo atualiza cadastro, preços e status sem duplicar nada.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(`--${name}`);
}

function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const DRY_RUN = flag("dry-run");
const SEND_INVITE = flag("send-invite");
const CONFIG_PATH = option("config", "supabase/seed/development-accounts.json");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(message) {
  console.error(`erro: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/** Resolve o usuário pelo e-mail. Só cria conta quando --send-invite é passado. */
async function resolveUser(email) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`não foi possível listar usuários: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return { id: found.id, created: false };
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!SEND_INVITE) {
    fail(
      `usuário ${normalized} não existe. Peça o cadastro pelo app ou rode novamente com --send-invite para enviar o convite por e-mail.`,
    );
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] convidaria ${normalized}`);
    return { id: null, created: true };
  }
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalized);
  if (error) fail(`não foi possível convidar ${normalized}: ${error.message}`);
  return { id: data.user.id, created: true };
}

function validateDevelopment(development, slug) {
  const required = ["slug", "name", "property_type", "city"];
  for (const field of required) {
    if (!development?.[field]) {
      fail(
        `${slug}: campo "${field}" ausente no espelho. Preencha o dado oficial antes de importar — nenhum valor é inventado.`,
      );
    }
  }
}

async function main() {
  const config = await readJson(CONFIG_PATH);
  const baseDir = path.dirname(CONFIG_PATH);
  if (!Array.isArray(config.accounts) || config.accounts.length === 0) {
    fail("configuração sem contas em \"accounts\".");
  }

  const ownerEmail = config.owner_email;
  if (!ownerEmail) fail('configuração sem "owner_email".');

  const owner = await resolveUser(ownerEmail);
  console.log(`owner: ${ownerEmail}${owner.created ? " (convidado agora)" : ""}`);

  const memberIds = new Map();
  for (const email of config.members ?? []) {
    const member = await resolveUser(email);
    memberIds.set(email, member.id);
    console.log(`membro: ${email}${member.created ? " (convidado agora)" : ""}`);
  }

  for (const account of config.accounts) {
    const { organization_name: name, organization_slug: slug, sales_table: table } = account;
    if (!name || !slug) fail("conta sem organization_name/organization_slug.");

    const payload = table ? await readJson(path.join(baseDir, table)) : null;
    const development = payload?.development ?? account.development;
    validateDevelopment(development, slug);

    console.log(`\n== ${name} (${slug})`);
    if (DRY_RUN) {
      console.log(
        `  [dry-run] provisionaria a conta e importaria ${payload?.units?.length ?? 0} unidades`,
      );
      continue;
    }

    const { data: provisioned, error: provisionError } = await supabase.rpc(
      "provision_development_account",
      {
        p_name: name,
        p_slug: slug,
        p_owner_user_id: owner.id,
        p_development: development,
      },
    );
    if (provisionError) fail(`${slug}: ${provisionError.message}`);
    console.log(`  conta: ${provisioned.organization_id}`);
    console.log(`  empreendimento: ${provisioned.development_id}`);

    for (const [email, userId] of memberIds) {
      if (!userId) continue;
      const { error: accessError } = await supabase.rpc("grant_development_account_access", {
        p_organization_slug: slug,
        p_user_id: userId,
        p_role: account.member_role ?? "member",
      });
      if (accessError) fail(`${slug}: acesso de ${email} falhou: ${accessError.message}`);
      console.log(`  acesso concedido: ${email} (${account.member_role ?? "member"})`);
    }

    if (!payload?.units?.length) {
      console.log("  espelho de vendas ainda não recebido: nenhuma unidade importada.");
      continue;
    }

    const { data: imported, error: importError } = await supabase.rpc("import_sales_table", {
      p_organization_id: provisioned.organization_id,
      p_development_id: provisioned.development_id,
      p_units: payload.units,
      p_source_reference: payload.source_reference ?? null,
    });
    if (importError) fail(`${slug}: importação falhou: ${importError.message}`);
    console.log(
      `  espelho importado: ${imported.created} criadas, ${imported.updated} atualizadas, ${imported.without_price} sem valor na tabela`,
    );
  }

  console.log("\nconcluído.");
}

main().catch((error) => fail(error.message));
