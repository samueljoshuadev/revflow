"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  parseMetaEmbeddedSignupMessage,
  type MetaEmbeddedSignupResult,
} from "@/lib/meta-embedded-signup";

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type FacebookSdk = {
  init(options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

type MetaSession = {
  appId: string;
  configurationId: string;
  graphVersion: string;
  sessionToken: string;
};

export function MetaWhatsAppConnect({
  disabled,
  reconnect,
}: {
  disabled: boolean;
  reconnect: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (disabled || status === "loading") return;
    setStatus("loading");
    setError(null);

    try {
      const sessionResponse = await fetch("/api/integrations/meta/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!sessionResponse.ok) throw new Error("meta_platform_not_ready");
      const session = (await sessionResponse.json()) as MetaSession;
      const facebook = await loadFacebookSdk(session);
      await launchEmbeddedSignup(facebook, session);
      router.push(
        "/settings/integrations?message=" +
          encodeURIComponent("WhatsApp Business conectado com a Meta."),
      );
      router.refresh();
    } catch (connectionError) {
      const code =
        connectionError instanceof Error
          ? connectionError.message
          : "meta_connection_failed";
      setError(friendlyMetaError(code));
      setStatus("error");
    }
  }

  return (
    <div>
      <Button
        type="button"
        onClick={connect}
        disabled={disabled || status === "loading"}
      >
        {status === "loading" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <span className="flex size-4 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-600">
            f
          </span>
        )}
        {status === "loading"
          ? "Abrindo a Meta..."
          : reconnect
            ? "Reconectar com Meta"
            : "Conectar com Meta e Facebook"}
      </Button>
      {error && (
        <p className="mt-2 max-w-sm text-[11px] leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

async function loadFacebookSdk(session: MetaSession): Promise<FacebookSdk> {
  if (!window.FB) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        const deadline = window.setInterval(() => {
          if (window.FB) {
            window.clearInterval(deadline);
            resolve();
          }
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(deadline);
          reject(new Error("meta_sdk_timeout"));
        }, 10_000);
        return;
      }
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("meta_sdk_failed"));
      document.head.appendChild(script);
    });
  }
  if (!window.FB) throw new Error("meta_sdk_failed");
  window.FB.init({
    appId: session.appId,
    cookie: true,
    xfbml: false,
    version: session.graphVersion,
  });
  return window.FB;
}

async function launchEmbeddedSignup(
  facebook: FacebookSdk,
  session: MetaSession,
) {
  await new Promise<void>((resolve, reject) => {
    let authorizationCode: string | null = null;
    let signupResult: MetaEmbeddedSignupResult | null = null;
    let finished = false;
    const timeout = window.setTimeout(
      () => finish(new Error("meta_signup_timeout")),
      10 * 60 * 1000,
    );

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      if (error) reject(error);
      else resolve();
    };

    const complete = async () => {
      if (!authorizationCode || !signupResult || finished) return;
      try {
        const response = await fetch("/api/integrations/meta/complete", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: authorizationCode,
            sessionToken: session.sessionToken,
            businessAccountId: signupResult.businessAccountId,
            phoneNumberId: signupResult.phoneNumberId,
          }),
        });
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!response.ok)
          throw new Error(body?.error ?? "meta_complete_failed");
        finish();
      } catch (error) {
        finish(
          error instanceof Error ? error : new Error("meta_complete_failed"),
        );
      }
    };

    const onMessage = (event: MessageEvent) => {
      const parsed = parseMetaEmbeddedSignupMessage({
        origin: event.origin,
        data: event.data,
      });
      if (!parsed) return;
      if (parsed.type === "cancelled") {
        finish(new Error("meta_signup_cancelled"));
        return;
      }
      if (parsed.type === "error") {
        finish(new Error("meta_signup_failed"));
        return;
      }
      signupResult = parsed.result;
      void complete();
    };
    window.addEventListener("message", onMessage);

    facebook.login(
      (response) => {
        authorizationCode = response.authResponse?.code ?? null;
        if (!authorizationCode) {
          finish(new Error("meta_login_cancelled"));
          return;
        }
        void complete();
      },
      {
        config_id: session.configurationId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: "3",
        },
      },
    );
  });
}

function friendlyMetaError(code: string) {
  if (code.includes("cancelled"))
    return "A conexão foi cancelada. Nenhum dado foi alterado.";
  if (code.includes("permission"))
    return "Autorize as permissões do WhatsApp Business para continuar.";
  if (code.includes("phone"))
    return "A Meta não confirmou o número selecionado. Escolha um número do WhatsApp Business.";
  if (code.includes("platform_not_ready"))
    return "O aplicativo Meta do RevFlow ainda precisa ser configurado pelo administrador.";
  if (code.includes("timeout"))
    return "A autorização demorou demais. Feche a janela e tente novamente.";
  return "Não foi possível concluir a conexão com a Meta. Tente novamente ou consulte a ajuda.";
}
