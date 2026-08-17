import { LegalPage, LegalSection } from "@/components/legal/legal-page";
export const metadata = { title: "Exclusão de Dados" };
export default function DataDeletionPage() {
  return (
    <LegalPage title="Exclusão de Dados" updatedAt="15 de agosto de 2026">
      <LegalSection title="Como solicitar">
        <p>
          Envie uma solicitação pelo contato oficial informado abaixo, indicando
          seu nome, organização, e-mail da conta e quais dados deseja excluir.
          Não envie senhas, tokens ou documentos completos pelo primeiro
          contato.
        </p>
      </LegalSection>
      <LegalSection title="Confirmação de identidade">
        <p>
          Para impedir exclusões indevidas, o RevFlow poderá confirmar a
          identidade e a autoridade do solicitante dentro da organização.
        </p>
      </LegalSection>
      <LegalSection title="Processamento">
        <p>
          Após a validação, os dados elegíveis serão excluídos ou anonimizados.
          Informações sujeitas a obrigação legal, prevenção de fraude, auditoria
          ou defesa de direitos podem ser mantidas pelo período necessário.
        </p>
      </LegalSection>
      <LegalSection title="Integrações externas">
        <p>
          A exclusão no RevFlow não remove automaticamente dados mantidos por
          provedores conectados. O titular ou administrador também deve utilizar
          os controles oferecidos por cada provedor.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
