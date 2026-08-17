import { LegalPage, LegalSection } from "@/components/legal/legal-page";
export const metadata = { title: "Termos de Uso" };
export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="15 de agosto de 2026">
      <LegalSection title="Uso do serviço">
        <p>
          O RevFlow é uma ferramenta de apoio à operação comercial. A empresa
          contratante é responsável pelos dados cadastrados, pelas permissões
          concedidas aos usuários e pela legalidade de suas comunicações.
        </p>
      </LegalSection>
      <LegalSection title="Contas e acesso">
        <p>
          Credenciais são pessoais. Administradores devem remover acessos que
          não sejam mais necessários e manter informações da organização
          atualizadas.
        </p>
      </LegalSection>
      <LegalSection title="Integrações">
        <p>
          Google, Meta, OpenAI, Calendly e outros serviços possuem termos,
          disponibilidade e cobrança próprios. O RevFlow não promete
          funcionamento de integrações que não estejam autorizadas ou
          configuradas.
        </p>
      </LegalSection>
      <LegalSection title="Automações">
        <p>
          Regras automáticas auxiliam o fluxo comercial, mas decisões críticas
          devem ser supervisionadas. A inteligência artificial não substitui a
          validação humana.
        </p>
      </LegalSection>
      <LegalSection title="Disponibilidade e suporte">
        <p>
          Níveis definitivos de serviço, suporte, cancelamento, responsabilidade
          e pagamento devem ser definidos no contrato comercial e revisados
          juridicamente.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
