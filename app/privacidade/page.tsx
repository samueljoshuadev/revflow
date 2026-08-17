import { LegalPage, LegalSection } from "@/components/legal/legal-page";
export const metadata = { title: "Política de Privacidade" };
export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="15 de agosto de 2026">
      <LegalSection title="Escopo">
        <p>
          Esta versão descreve como o RevFlow trata dados usados por empresas
          para organizar leads, reuniões, propostas e atividades comerciais.
        </p>
      </LegalSection>
      <LegalSection title="Dados tratados">
        <p>
          Podem ser tratados dados de conta, organização, contatos comerciais,
          atividades do CRM, registros técnicos de segurança e informações
          fornecidas nas integrações autorizadas.
        </p>
      </LegalSection>
      <LegalSection title="Finalidades">
        <p>
          Os dados são usados para autenticação, execução do serviço contratado,
          organização do processo comercial, prevenção de fraude, suporte e
          cumprimento de obrigações aplicáveis.
        </p>
      </LegalSection>
      <LegalSection title="Compartilhamento e operadores">
        <p>
          O funcionamento pode envolver provedores de infraestrutura, banco de
          dados, calendário, e-mail, inteligência artificial e canais de
          comunicação escolhidos pela organização. Cada integração depende de
          autorização e configuração próprias.
        </p>
      </LegalSection>
      <LegalSection title="Retenção e segurança">
        <p>
          O RevFlow aplica isolamento por organização, controle de acesso,
          trilha de eventos e proteção de credenciais. Os prazos definitivos de
          retenção devem constar no contrato e na versão revisada desta
          política.
        </p>
      </LegalSection>
      <LegalSection title="Direitos">
        <p>
          Titulares podem solicitar acesso, correção, portabilidade ou exclusão
          conforme a legislação aplicável e os limites de retenção obrigatória.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
