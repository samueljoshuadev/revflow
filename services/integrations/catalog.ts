import type { IntegrationProvider } from "@/services/integrations/credentials";

export type HelpStep = {
  title: string;
  description: string;
  link?: { label: string; href: string };
};

export type IntegrationDefinition = {
  provider: IntegrationProvider;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  help: HelpStep[];
};

export const integrationCatalog: IntegrationDefinition[] = [
  {
    provider: "google_calendar",
    name: "Google Calendar",
    shortName: "G",
    description:
      "Crie reuniões, links do Meet e mantenha a agenda sincronizada.",
    accent: "bg-blue-50 text-blue-700 ring-blue-100",
    help: [
      {
        title: "Clique em Conectar",
        description:
          "Você será levado ao Google. Use a conta que administra sua agenda de reuniões.",
      },
      {
        title: "Autorize o calendário",
        description:
          "Confira o nome RevFlow e permita o acesso solicitado. Sua senha nunca passa pelo RevFlow.",
      },
      {
        title: "Volte e teste",
        description:
          "Ao retornar, escolha o calendário principal e clique em Testar conexão.",
        link: {
          label: "Ajuda oficial do Google",
          href: "https://support.google.com/calendar/",
        },
      },
    ],
  },
  {
    provider: "openai",
    name: "OpenAI",
    shortName: "AI",
    description: "Qualifique leads e sugira a próxima ação comercial com IA.",
    accent: "bg-slate-100 text-slate-800 ring-slate-200",
    help: [
      {
        title: "Crie uma chave da API",
        description:
          "Abra a plataforma da OpenAI, entre em sua conta e crie uma nova chave secreta para o CRM.",
        link: {
          label: "Abrir chaves da OpenAI",
          href: "https://platform.openai.com/api-keys",
        },
      },
      {
        title: "Cole a chave uma vez",
        description:
          "A chave será criptografada. Depois de salvar, mostraremos somente os últimos caracteres.",
      },
      {
        title: "Defina um limite",
        description:
          "Escolha quantos leads podem ser analisados por mês e faça o teste de conexão.",
      },
    ],
  },
  {
    provider: "whatsapp",
    name: "WhatsApp Business (Meta)",
    shortName: "WA",
    description: "Centralize conversas, confirmações e lembretes dos clientes.",
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    help: [
      {
        title: "Clique em Conectar com Meta",
        description:
          "Entre com a conta do Facebook que administra o Portfólio Empresarial da sua empresa. Sua senha não passa pelo RevFlow.",
        link: {
          label: "Conhecer o WhatsApp Business",
          href: "https://whatsappbusiness.com/developers/developer-hub/",
        },
      },
      {
        title: "Escolha a empresa e o número",
        description:
          "A própria Meta mostrará as contas WhatsApp Business disponíveis. Selecione a empresa e o número que o RevFlow deverá atender.",
      },
      {
        title: "Autorize e confirme",
        description:
          "Autorize as permissões solicitadas. O RevFlow valida o número, protege a credencial e ativa o recebimento de eventos automaticamente.",
      },
    ],
  },
  {
    provider: "calendly",
    name: "Calendly",
    shortName: "C",
    description:
      "Importe agendamentos, cancelamentos e reagendamentos do Calendly.",
    accent: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    help: [
      {
        title: "Abra Integrações no Calendly",
        description:
          "Para uso interno, crie um Personal Access Token na área API e Webhooks.",
        link: {
          label: "Abrir Calendly",
          href: "https://calendly.com/integrations/api_webhooks",
        },
      },
      {
        title: "Copie o token",
        description:
          "O Calendly mostra o token uma única vez. Copie e cole no CRM sem enviar para outras pessoas.",
      },
      {
        title: "Teste a conexão",
        description:
          "O CRM consultará sua conta e só então mostrará o estado Conectada.",
      },
    ],
  },
];
