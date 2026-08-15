"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BrainCircuit,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Home,
  Menu,
  MessageCircle,
  MessageCircleMore,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import { motion } from "motion/react";

import { ProductDemo, type DemoVertical } from "./product-demo";
import styles from "./revflow-marketing.module.css";

type MarketingVariant =
  "home" | "agency" | "real-estate" | "how-it-works" | "pricing";

const salesWhatsAppNumber =
  process.env.NEXT_PUBLIC_SALES_WHATSAPP_NUMBER ?? "5511988407914";

function salesWhatsAppUrl(context: string) {
  return `https://wa.me/${salesWhatsAppNumber}?text=${encodeURIComponent(
    `Olá! ${context}`,
  )}`;
}

const agencySteps = [
  "Lead",
  "Diagnóstico",
  "Proposta",
  "Negociação",
  "Contrato",
];
const realEstateSteps = [
  "Novo lead",
  "Perfil",
  "Imóvel",
  "Visita",
  "Proposta",
  "Contrato",
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ y: 16 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BrandMark({ variant }: { variant: MarketingVariant }) {
  const isRealEstate = variant === "real-estate";

  return (
    <span className={styles.brand}>
      <Image
        src={
          isRealEstate ? "/revflow-imobiliarias.png" : "/revflow-agencias.png"
        }
        alt={isRealEstate ? "RevFlow para Imobiliárias" : "RevFlow"}
        width={177}
        height={50}
        className={styles.brandImage}
      />
    </span>
  );
}

function Header({ active }: { active: MarketingVariant }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegação principal">
        <Link href="/" aria-label="Página inicial RevFlow">
          <BrandMark variant={active} />
        </Link>
        <div
          className={`${styles.navLinks} ${open ? styles.navLinksOpen : ""}`}
        >
          <Link
            className={active === "agency" ? styles.activeLink : ""}
            href="/agencias"
            onClick={() => setOpen(false)}
          >
            Para Agências
          </Link>
          <Link
            className={active === "real-estate" ? styles.activeLink : ""}
            href="/imobiliarias"
            onClick={() => setOpen(false)}
          >
            Para Imobiliárias
          </Link>
          <Link
            className={active === "pricing" ? styles.activeLink : ""}
            href="/precos"
            onClick={() => setOpen(false)}
          >
            Preços
          </Link>
          <Link
            className={active === "how-it-works" ? styles.activeLink : ""}
            href="/como-funciona"
            onClick={() => setOpen(false)}
          >
            Como funciona
          </Link>
          <Link
            className={styles.loginLink}
            href="/login"
            onClick={() => setOpen(false)}
          >
            Entrar <ArrowRight size={15} />
          </Link>
          <a
            className={styles.headerCta}
            href={salesWhatsAppUrl(
              "Conheci o RevFlow e quero solicitar uma demonstração.",
            )}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Solicitar demonstração
          </a>
        </div>
        <button
          className={styles.menuButton}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
    </header>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className={styles.kicker}>
      <span />
      {children}
    </p>
  );
}

function Footer({ variant }: { variant: MarketingVariant }) {
  const context =
    variant === "real-estate"
      ? "Vim pela página do RevFlow para Imobiliárias e quero uma demonstração."
      : variant === "agency"
        ? "Vim pela página do RevFlow para Agências e quero uma demonstração."
        : "Quero conhecer o RevFlow.";
  return (
    <footer className={styles.footer}>
      <BrandMark variant={variant} />
      <div>
        <Link href="/agencias">Agências</Link>
        <Link href="/imobiliarias">Imobiliárias</Link>
        <Link href="/como-funciona">Como funciona</Link>
        <Link href="/precos">Preços</Link>
        <Link href="/login">Entrar</Link>
        <a href={salesWhatsAppUrl(context)} target="_blank" rel="noreferrer">
          Contato
        </a>
      </div>
    </footer>
  );
}

function WhatsAppFloat({ variant }: { variant: MarketingVariant }) {
  const context =
    variant === "real-estate"
      ? "Vim pela página do RevFlow para Imobiliárias e quero uma demonstração."
      : variant === "agency"
        ? "Vim pela página do RevFlow para Agências e quero uma demonstração."
        : "Vim pela página do RevFlow e quero saber mais.";
  return (
    <a
      className={styles.whatsAppFloat}
      href={salesWhatsAppUrl(context)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com o time RevFlow pelo WhatsApp"
    >
      <MessageCircle size={20} />
      <span>Falar no WhatsApp</span>
    </a>
  );
}

function FlowPreview({ niche }: { niche: "agency" | "real-estate" }) {
  const isAgency = niche === "agency";
  const steps = isAgency ? agencySteps : realEstateSteps;
  return (
    <motion.div
      className={styles.productPreview}
      initial={{ y: 14 }}
      animate={{ y: [14, 0] }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Representação ilustrativa da operação comercial"
    >
      <div className={styles.previewHalo} />
      <div className={styles.previewShell}>
        <div className={styles.previewTopbar}>
          <span className={styles.windowDots}>
            <i />
            <i />
            <i />
          </span>
          <span>
            {isAgency ? "Operação comercial" : "Jornada da oportunidade"}
          </span>
          <span className={styles.synced}>
            <Check size={11} /> Organizado
          </span>
        </div>
        <div className={styles.previewContent}>
          <div className={styles.previewIntro}>
            <div>
              <small>
                {isAgency
                  ? "Oportunidade em andamento"
                  : "Atendimento em andamento"}
              </small>
              <strong>
                {isAgency ? "Próxima ação definida" : "Visita em preparação"}
              </strong>
            </div>
            <span className={styles.previewIcon}>
              {isAgency ? <ClipboardCheck size={19} /> : <Home size={19} />}
            </span>
          </div>
          <div className={styles.previewSteps}>
            {steps.slice(0, 4).map((step, index) => (
              <div
                key={step}
                className={index === 2 ? styles.currentPreviewStep : ""}
              >
                <span>0{index + 1}</span>
                <strong>{step}</strong>
                <i />
              </div>
            ))}
          </div>
          <div className={styles.previewAction}>
            <span>
              <CalendarCheck2 size={16} />
            </span>
            <div>
              <small>Próxima ação</small>
              <strong>
                {isAgency ? "Reunião preparada" : "Visita confirmada"}
              </strong>
            </div>
            <ChevronRight size={17} />
          </div>
        </div>
      </div>
      <motion.div
        className={`${styles.floatingNote} ${styles.noteOne}`}
        animate={{ y: [-4, 4] }}
        transition={{
          duration: 4.4,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <Sparkles size={14} />
        {isAgency ? "Proposta com contexto" : "Imóvel recomendado"}
      </motion.div>
      <motion.div
        className={`${styles.floatingNote} ${styles.noteTwo}`}
        animate={{ y: [4, -4] }}
        transition={{
          duration: 4.7,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <Check size={14} />
        {isAgency ? "Follow-up em dia" : "Agenda sincronizada"}
      </motion.div>
    </motion.div>
  );
}

function HomePage() {
  return (
    <main className={`${styles.page} ${styles.homePage}`}>
      <Header active="home" />
      <section className={styles.homeHero}>
        <div className={styles.gridBackdrop} />
        <div className={styles.homeHeroContent}>
          <Reveal>
            <Kicker>Operação comercial em movimento</Kicker>
            <h1>
              Menos oportunidades esquecidas.
              <br />
              <em>Mais negócios em movimento.</em>
            </h1>
            <p>
              RevFlow organiza o processo comercial de equipes que vendem
              serviços e imóveis.
            </p>
          </Reveal>
          <div className={styles.segmentCards}>
            <Reveal delay={0.06}>
              <Link
                href="/agencias"
                className={`${styles.segmentCard} ${styles.agencyCard}`}
              >
                <div>
                  <span className={styles.segmentIcon}>
                    <Route size={20} />
                  </span>
                  <small>Para serviços</small>
                  <h2>
                    RevFlow
                    <br />
                    para Agências
                  </h2>
                  <p>
                    Leads, propostas, follow-ups e agenda em uma operação clara.
                  </p>
                </div>
                <div className={styles.miniBoard}>
                  <span>Lead</span>
                  <span>Diagnóstico</span>
                  <span className={styles.miniActive}>Proposta</span>
                </div>
                <span className={styles.segmentArrow}>
                  <ArrowRight size={19} />
                </span>
              </Link>
            </Reveal>
            <Reveal delay={0.12}>
              <Link
                href="/imobiliarias"
                className={`${styles.segmentCard} ${styles.estateCard}`}
              >
                <div>
                  <span className={styles.segmentIcon}>
                    <Home size={20} />
                  </span>
                  <small>Para imóveis</small>
                  <h2>
                    RevFlow
                    <br />
                    para Imobiliárias
                  </h2>
                  <p>Leads, imóveis, visitas e negociações no mesmo fluxo.</p>
                </div>
                <div className={styles.miniBoard}>
                  <span>Lead</span>
                  <span className={styles.miniActive}>Visita</span>
                  <span>Proposta</span>
                </div>
                <span className={styles.segmentArrow}>
                  <ArrowRight size={19} />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
      <section id="como-funciona" className={styles.problemSection}>
        <Reveal>
          <Kicker>Quando o processo fica disperso</Kicker>
          <h2>
            O problema não é falta de interesse.
            <br />
            <em>É falta de continuidade.</em>
          </h2>
        </Reveal>
        <div className={styles.problemGrid}>
          <Reveal delay={0.04}>
            <article className={styles.chaosCard}>
              <small>Antes</small>
              <div className={styles.chaosItems}>
                <span>Mensagem solta</span>
                <span>Retornar depois</span>
                <span>Agenda separada</span>
                <span>Quem atende?</span>
              </div>
              <p>
                Informação fragmentada faz oportunidades dependerem da memória
                da equipe.
              </p>
            </article>
          </Reveal>
          <Reveal delay={0.1}>
            <article className={styles.flowCard}>
              <small>Com RevFlow</small>
              <div className={styles.orderlyFlow}>
                <span>Lead recebido</span>
                <ArrowRight size={14} />
                <span>Responsável</span>
                <ArrowRight size={14} />
                <span>Próxima ação</span>
              </div>
              <p>
                Leads, responsáveis, reuniões, automações e histórico no mesmo
                fluxo.
              </p>
            </article>
          </Reveal>
        </div>
      </section>
      <section id="contato" className={styles.homeCta}>
        <Reveal>
          <Kicker>Escolha seu fluxo</Kicker>
          <h2>
            Seu comercial não precisa depender
            <br />
            <em>da memória da equipe.</em>
          </h2>
          <div className={styles.homeActions}>
            <Link className={styles.primaryButton} href="/agencias">
              Conhecer para Agências <ArrowRight size={17} />
            </Link>
            <Link className={styles.secondaryButton} href="/imobiliarias">
              Conhecer para Imobiliárias <ArrowRight size={17} />
            </Link>
            <a
              className={styles.contactButton}
              href={salesWhatsAppUrl(
                "Quero entender qual fluxo RevFlow combina com a minha empresa.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> Falar com especialista
            </a>
          </div>
        </Reveal>
      </section>
      <Footer variant="home" />
      <WhatsAppFloat variant="home" />
    </main>
  );
}

function NicheCta({ realEstate }: { realEstate: boolean }) {
  return (
    <section id="contato" className={styles.finalCta}>
      <div className={styles.ctaGlow} />
      <Reveal className={styles.finalCtaContent}>
        <Kicker>RevFlow para {realEstate ? "Imobiliárias" : "Agências"}</Kicker>
        <h2>
          {realEstate ? (
            <>
              Sua equipe sabe qual lead
              <br />
              <em>atender agora?</em>
            </>
          ) : (
            <>
              Seu comercial não precisa
              <br />
              <em>depender da memória.</em>
            </>
          )}
        </h2>
        <p>
          {realEstate
            ? "Feito para imobiliárias que querem transformar atendimento em vendas."
            : "Feito para agências que querem transformar oportunidades em processo comercial."}
        </p>
        <a
          className={styles.primaryButton}
          href={salesWhatsAppUrl(
            realEstate
              ? "Vim pela página do RevFlow para Imobiliárias e quero uma demonstração."
              : "Vim pela página do RevFlow para Agências e quero uma demonstração.",
          )}
          target="_blank"
          rel="noreferrer"
        >
          Quero uma demonstração <MessageCircle size={17} />
        </a>
      </Reveal>
    </section>
  );
}

function NichePage({ niche }: { niche: "agency" | "real-estate" }) {
  const realEstate = niche === "real-estate";
  const pains = realEstate
    ? [
        [
          "Lead atendido tarde",
          "O interesse esfria antes de virar uma conversa com contexto.",
        ],
        [
          "Visita sem acompanhamento",
          "Confirmação, lembrete e retorno ficam espalhados em mensagens.",
        ],
        [
          "Corretor sem próxima ação",
          "A oportunidade existe, mas ninguém sabe o que deve acontecer agora.",
        ],
      ]
    : [
        [
          "Leads esquecidos",
          "O interesse chega, mas não encontra uma próxima ação definida.",
        ],
        [
          "Propostas sem acompanhamento",
          "A negociação perde ritmo quando cada pessoa usa um canal diferente.",
        ],
        [
          "Previsibilidade limitada",
          "Sem histórico e responsável, a gestão precisa procurar respostas.",
        ],
      ];
  const features = realEstate
    ? ([
        [
          Home,
          "Matching lead + imóvel",
          "Conecte preferência, contexto e disponibilidade antes da conversa.",
        ],
        [
          CalendarCheck2,
          "Agenda integrada",
          "Organize visitas e acompanhamentos junto à rotina do corretor.",
        ],
        [
          UserRoundCheck,
          "Gestão por corretor",
          "Distribua oportunidades sem perder contexto para a liderança.",
        ],
        [
          MessageCircleMore,
          "Follow-ups e WhatsApp",
          "Mantenha o interesse ativo no momento certo da negociação.",
        ],
        [
          Clock3,
          "Histórico comercial",
          "Retome cada atendimento sabendo o que já aconteceu.",
        ],
      ] as const)
    : ([
        [
          Route,
          "Pipeline comercial",
          "Visualize cada oportunidade, sem procurar informação em vários lugares.",
        ],
        [
          BrainCircuit,
          "Qualificação com IA",
          "Transforme contexto comercial em uma próxima ação mais clara.",
        ],
        [
          ClipboardCheck,
          "Tarefas e follow-ups",
          "Dê sequência sem depender de lembretes informais.",
        ],
        [
          CalendarCheck2,
          "Agenda integrada",
          "Reuniões e compromissos conectados ao processo comercial.",
        ],
        [
          Clock3,
          "Histórico completo",
          "Decisões melhores a partir de cada interação registrada.",
        ],
      ] as const);
  const steps = realEstate ? realEstateSteps : agencySteps;
  const descriptions = realEstate
    ? [
        "Interesse organizado",
        "Necessidade registrada",
        "Opções alinhadas",
        "Atendimento confirmado",
        "Negociação acompanhada",
        "Histórico preservado",
      ]
    : [
        "Interesse capturado",
        "Contexto levantado",
        "Valor apresentado",
        "Próxima ação clara",
        "Histórico preservado",
      ];
  return (
    <main
      className={`${styles.page} ${realEstate ? styles.estatePage : styles.agencyPage}`}
    >
      <Header active={realEstate ? "real-estate" : "agency"} />
      <section className={styles.nicheHero}>
        <div className={styles.gridBackdrop} />
        <div className={styles.nicheHeroContent}>
          <Reveal className={styles.heroCopy}>
            <Kicker>
              RevFlow para {realEstate ? "Imobiliárias" : "Agências"}
            </Kicker>
            <h1>
              {realEstate ? (
                <>
                  Cada lead merece
                  <br />
                  <em>virar uma visita.</em>
                </>
              ) : (
                <>
                  Transforme cada oportunidade em
                  <br />
                  <em>um processo comercial claro.</em>
                </>
              )}
            </h1>
            <p>
              {realEstate
                ? "Centralize leads, imóveis, visitas, follow-ups e negociações para sua imobiliária vender com mais previsibilidade."
                : "Centralize leads, diagnósticos, propostas, reuniões e follow-ups para sua agência operar com mais clareza."}
            </p>
            <div className={styles.heroActions}>
              <a
                className={styles.primaryButton}
                href={salesWhatsAppUrl(
                  realEstate
                    ? "Vim pela página do RevFlow para Imobiliárias e quero uma demonstração."
                    : "Vim pela página do RevFlow para Agências e quero uma demonstração.",
                )}
                target="_blank"
                rel="noreferrer"
              >
                Solicitar demonstração <MessageCircle size={17} />
              </a>
              <a className={styles.secondaryButton} href="#como-funciona">
                Conhecer o fluxo <ArrowDownRight size={17} />
              </a>
            </div>
          </Reveal>
          <FlowPreview niche={niche} />
        </div>
      </section>
      <section className={styles.painsSection}>
        <Reveal>
          <Kicker>
            {realEstate
              ? "Onde a operação trava"
              : "Quando a operação perde ritmo"}
          </Kicker>
          <h2>
            {realEstate ? (
              <>
                Mais atendimento sem direção.
                <br />
                <em>Menos visita realizada.</em>
              </>
            ) : (
              <>
                Mais oportunidades sem contexto.
                <br />
                <em>Menos negociação avançando.</em>
              </>
            )}
          </h2>
        </Reveal>
        <div className={styles.painsGrid}>
          {pains.map(([title, text], index) => (
            <Reveal key={title} delay={index * 0.08}>
              <article>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="como-funciona" className={styles.solutionsSection}>
        <Reveal>
          <div className={styles.solutionHeading}>
            <div>
              <Kicker>
                {realEstate
                  ? "Da conversa à proposta"
                  : "Da oportunidade ao contrato"}
              </Kicker>
              <h2>
                O contexto certo,
                <br />
                <em>na hora de agir.</em>
              </h2>
            </div>
            <p>
              {realEstate
                ? "Uma rotina comercial pensada para que cada corretor saiba quem atender, qual imóvel sugerir e quando avançar."
                : "Uma rotina comercial pensada para que cada pessoa saiba quem atender, o que fazer e quando avançar."}
            </p>
          </div>
        </Reveal>
        <div className={styles.featureGrid}>
          {features.map(([Icon, title, text], index) => (
            <Reveal key={title} delay={(index % 3) * 0.07}>
              <article>
                <Icon size={20} strokeWidth={1.7} />
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowRight size={16} />
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section className={styles.journeySection}>
        <Reveal>
          <Kicker>
            {realEstate ? "Fluxo imobiliário" : "Fluxo comercial"}
          </Kicker>
          <h2>Uma etapa puxa a próxima.</h2>
        </Reveal>
        <div className={styles.journey}>
          {steps.map((step, index) => (
            <Reveal key={step} delay={index * 0.05}>
              <article>
                <span>0{index + 1}</span>
                <strong>{step}</strong>
                <p>{descriptions[index]}</p>
                {index < steps.length - 1 ? <ChevronRight size={17} /> : null}
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section className={styles.routineSection}>
        <Reveal>
          <div className={styles.routineCopy}>
            <Kicker>
              {realEstate
                ? "Antes da ligação ou visita"
                : "Antes da reunião ou follow-up"}
            </Kicker>
            <h2>
              {realEstate ? (
                <>
                  Cada conversa começa
                  <br />
                  <em>com contexto.</em>
                </>
              ) : (
                <>
                  Toda ação começa
                  <br />
                  <em>com clareza.</em>
                </>
              )}
            </h2>
            <p>
              {realEstate
                ? "O corretor encontra o perfil, os imóveis relacionados, a última conversa e a próxima ação no mesmo lugar."
                : "A equipe encontra o contexto, a última conversa, o responsável e a próxima ação no mesmo lugar."}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className={styles.contextPanel}>
            <div className={styles.contextHeader}>
              <span className={styles.contextAvatar} />
              <div>
                <small>Contexto da oportunidade</small>
                <strong>
                  {realEstate
                    ? "Atendimento em preparação"
                    : "Oportunidade em andamento"}
                </strong>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className={styles.contextRows}>
              <span>
                <i />
                Responsável definido
              </span>
              <span>
                <i />
                Histórico organizado
              </span>
              <span>
                <i />
                Próxima ação preparada
              </span>
            </div>
            <div className={styles.contextNext}>
              <CalendarCheck2 size={17} />
              <div>
                <small>Próximo passo</small>
                <strong>
                  {realEstate ? "Confirmar visita" : "Preparar reunião"}
                </strong>
              </div>
              <ChevronRight size={16} />
            </div>
          </div>
        </Reveal>
      </section>
      <section className={styles.integrationSection}>
        <Reveal>
          <Kicker>Conectado à sua rotina</Kicker>
          <h2>
            {realEstate
              ? "Menos troca de tela. Mais atendimento."
              : "Menos status solto. Mais continuidade."}
          </h2>
          <div className={styles.integrationList}>
            {[
              [CalendarCheck2, "Google Calendar"],
              [MessageCircle, "WhatsApp"],
              [BrainCircuit, "IA"],
              [Clock3, "Calendly"],
            ].map(([Icon, integration]) => {
              const IntegrationIcon = Icon as typeof CalendarCheck2;
              return (
                <span key={integration as string}>
                  <IntegrationIcon size={14} />
                  {integration as string}
                </span>
              );
            })}
          </div>
        </Reveal>
      </section>
      <NicheCta realEstate={realEstate} />
      <Footer variant={realEstate ? "real-estate" : "agency"} />
      <WhatsAppFloat variant={realEstate ? "real-estate" : "agency"} />
    </main>
  );
}

function VerticalSelector({
  value,
  onChange,
  label = "Escolha o fluxo",
}: {
  value: DemoVertical;
  onChange: (value: DemoVertical) => void;
  label?: string;
}) {
  return (
    <div className={styles.verticalSelector}>
      <span>{label}</span>
      <div role="tablist" aria-label={label}>
        <button
          type="button"
          role="tab"
          aria-selected={value === "agency"}
          onClick={() => onChange("agency")}
        >
          Para Agências
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "real-estate"}
          onClick={() => onChange("real-estate")}
        >
          Para Imobiliárias
        </button>
      </div>
    </div>
  );
}

function HowItWorksPage() {
  const [vertical, setVertical] = useState<DemoVertical>("agency");
  const realEstate = vertical === "real-estate";
  const flow = realEstate
    ? [
        ["Novo lead", "O interesse entra no fluxo com origem e responsável."],
        [
          "Perfil identificado",
          "Preferências e faixa de investimento ficam registradas.",
        ],
        [
          "Imóvel recomendado",
          "O atendimento ganha opções compatíveis e contexto.",
        ],
        ["Visita", "Agenda, imóvel e oportunidade permanecem relacionados."],
        ["Proposta", "A negociação avança com histórico e próxima ação."],
        ["Contrato", "O resultado preserva toda a jornada comercial."],
      ]
    : [
        ["Novo lead", "O interesse entra no fluxo com origem e responsável."],
        ["Qualificação", "Serviço, contexto e urgência ficam visíveis."],
        ["Reunião", "O compromisso passa a integrar o histórico comercial."],
        ["Proposta", "A negociação avança sem perder decisões importantes."],
        ["Projeto", "A passagem comercial mantém o contexto conquistado."],
        ["Pós-venda", "O relacionamento continua depois do fechamento."],
      ];
  const pains = [
    [
      MessageCircleMore,
      "Leads espalhados",
      "Conversas importantes chegam por canais diferentes e perdem continuidade.",
    ],
    [
      Clock3,
      "Retornos esquecidos",
      "Sem uma próxima ação clara, a oportunidade depende da memória da equipe.",
    ],
    [
      CalendarCheck2,
      "Agenda desconectada",
      "Reuniões e visitas ficam distantes do histórico da negociação.",
    ],
    [
      Route,
      "Gestão sem contexto",
      "A liderança precisa procurar informações antes de conseguir decidir.",
    ],
  ] as const;
  const integrations = [
    [
      CalendarCheck2,
      "Google Calendar",
      "Compromissos conectados ao fluxo comercial.",
    ],
    [
      MessageCircle,
      "WhatsApp",
      "Conversas e acompanhamentos centralizados quando configurados.",
    ],
    [
      BrainCircuit,
      "OpenAI",
      "Qualificação assistida com retorno validado pela aplicação.",
    ],
    [Clock3, "Calendly", "Agendamentos incorporados à rotina de atendimento."],
  ] as const;

  return (
    <main
      className={`${styles.page} ${styles.howPage} ${realEstate ? styles.publicEstateTheme : ""}`}
    >
      <Header active="how-it-works" />
      <section className={styles.howHero}>
        <div className={styles.gridBackdrop} />
        <div className={styles.howHeroInner}>
          <Reveal>
            <Kicker>Como o RevFlow funciona</Kicker>
            <h1>
              Do primeiro contato à próxima ação,
              <br />
              <em>tudo dentro do mesmo fluxo.</em>
            </h1>
            <p>
              O RevFlow organiza leads, responsáveis, reuniões, follow-ups e
              negociações para sua equipe saber o que fazer agora.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#demonstracao">
                Ver demonstração <ArrowDownRight size={17} />
              </a>
              <Link className={styles.secondaryButton} href="/precos">
                Conhecer os planos <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
          <VerticalSelector value={vertical} onChange={setVertical} />
        </div>
      </section>

      <section className={styles.howProblemSection}>
        <Reveal>
          <Kicker>Onde o processo perde força</Kicker>
          <h2>
            Oportunidade não deveria desaparecer
            <br />
            <em>entre uma conversa e outra.</em>
          </h2>
        </Reveal>
        <div className={styles.howProblemGrid}>
          {pains.map(([Icon, title, description], index) => (
            <Reveal key={title} delay={index * 0.05}>
              <article>
                <Icon size={19} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={styles.howFlowSection}>
        <Reveal>
          <Kicker>
            {realEstate ? "Fluxo imobiliário" : "Fluxo para agências"}
          </Kicker>
          <h2>Uma etapa prepara a próxima.</h2>
        </Reveal>
        <div className={styles.howFlowLine}>
          {flow.map(([title, description], index) => (
            <article key={title} tabIndex={0}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <i />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demonstracao" className={styles.demoSection}>
        <div className={styles.demoHeading}>
          <Reveal>
            <Kicker>Veja antes de entrar</Kicker>
            <h2>
              Uma demonstração guiada,
              <br />
              <em>sem cadastro e sem dados reais.</em>
            </h2>
          </Reveal>
          <p>
            A experiência abaixo reproduz o fluxo com informações genéricas e
            não grava nada no CRM.
          </p>
        </div>
        <ProductDemo key={vertical} initialVertical={vertical} />
      </section>

      <section className={styles.publicIntegrationsSection}>
        <Reveal>
          <Kicker>Conectado à rotina</Kicker>
          <h2>Menos troca de tela. Mais continuidade.</h2>
        </Reveal>
        <div className={styles.integrationCards}>
          {integrations.map(([Icon, title, description], index) => (
            <Reveal key={title} delay={index * 0.05}>
              <article>
                <span>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <p className={styles.integrationDisclaimer}>
          A disponibilidade de cada integração depende da configuração da conta
          e das regras do respectivo provedor.
        </p>
      </section>

      <section className={styles.howFinalCta}>
        <div className={styles.ctaGlow} />
        <Reveal>
          <ShieldCheck size={25} aria-hidden="true" />
          <h2>Seu processo comercial pode ser mais simples de acompanhar.</h2>
          <p>
            Organize o histórico, proteja o contexto e deixe a próxima ação
            visível para quem precisa agir.
          </p>
          <div className={styles.homeActions}>
            <a
              className={styles.primaryButton}
              href={salesWhatsAppUrl(
                "Conheci o RevFlow e quero solicitar uma demonstração.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Solicitar demonstração <MessageCircle size={17} />
            </a>
            <a
              className={styles.contactButton}
              href={salesWhatsAppUrl(
                "Conheci o RevFlow e quero falar sobre a minha operação.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar pelo WhatsApp
            </a>
            <Link className={styles.secondaryButton} href="/precos">
              Ver preços <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>
      </section>
      <Footer variant="how-it-works" />
      <WhatsAppFloat variant="how-it-works" />
    </main>
  );
}

function PricingPage() {
  const [vertical, setVertical] = useState<DemoVertical>("agency");
  const realEstate = vertical === "real-estate";
  const features = realEstate
    ? [
        "Leads, pipeline e histórico comercial",
        "Cadastro e gestão de imóveis",
        "Perfil imobiliário e matching",
        "Visitas, agenda e Google Calendar",
        "Follow-ups, tarefas e WhatsApp",
        "Gestão por corretor e permissões",
      ]
    : [
        "Leads, pipeline e histórico comercial",
        "Clientes, propostas e projetos",
        "Agenda, reuniões e Google Calendar",
        "Follow-ups, tarefas e WhatsApp",
        "Qualificação assistida por IA",
        "Gestão de equipe e permissões",
      ];
  const faq = [
    [
      "Preciso instalar alguma coisa?",
      "Não. O RevFlow funciona pelo navegador e a configuração da operação é feita com a equipe.",
    ],
    [
      "Posso usar com minha equipe?",
      "Sim. Usuários, responsáveis e permissões fazem parte da organização comercial.",
    ],
    [
      "Posso conectar o Google Calendar?",
      "Sim. A integração pode ser autorizada pela conta após a configuração do aplicativo Google.",
    ],
    [
      "Existe uma versão para imobiliárias?",
      "Sim. O fluxo imobiliário inclui imóveis, perfil do comprador, matching e visitas.",
    ],
    [
      "Como funciona a demonstração?",
      "Você conhece o fluxo primeiro e alinha a implantação com o time RevFlow antes de contratar.",
    ],
  ];

  return (
    <main
      className={`${styles.page} ${styles.pricingPage} ${realEstate ? styles.publicEstateTheme : ""}`}
    >
      <Header active="pricing" />
      <section className={styles.pricingHero}>
        <div className={styles.gridBackdrop} />
        <Reveal className={styles.pricingCopy}>
          <Kicker>Planos RevFlow</Kicker>
          <h1>
            Um plano comercial que acompanha
            <br />
            <em>o crescimento da sua operação.</em>
          </h1>
          <p>
            Comece com o time que você já tem e escale conforme sua operação
            comercial cresce.
          </p>
        </Reveal>
        <VerticalSelector value={vertical} onChange={setVertical} />
      </section>
      <section className={styles.pricingSection}>
        <div className={styles.pricingPlans}>
          {[
            {
              name: "Plano mensal",
              price: "R$ 297",
              cadence: "por empresa / mês",
              note: "Assinatura mensal para operar o RevFlow com sua equipe.",
              message: "Quero contratar o plano mensal do RevFlow por R$ 297.",
              featured: false,
            },
            {
              name: "Acesso vitalício",
              price: "R$ 549,99",
              cadence: "pagamento único",
              note: "Acesso vitalício à versão contratada do RevFlow, sem mensalidade da plataforma.",
              message:
                "Quero contratar o acesso vitalício do RevFlow por R$ 549,99.",
              featured: true,
            },
          ].map((plan) => (
            <Reveal key={plan.name}>
              <article
                className={`${styles.pricingCard} ${plan.featured ? styles.pricingFeatured : ""}`}
              >
                <div>
                  <Kicker>{plan.name}</Kicker>
                  <h2>RevFlow {realEstate ? "Imobiliárias" : "Agências"}</h2>
                  <p className={styles.pricingValue}>
                    {plan.price} <small>{plan.cadence}</small>
                  </p>
                  <p className={styles.pricingNote}>{plan.note}</p>
                </div>
                <ul>
                  {features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} /> {feature}
                    </li>
                  ))}
                </ul>
                <a
                  className={styles.primaryButton}
                  href={salesWhatsAppUrl(plan.message)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solicitar contratação <MessageCircle size={17} />
                </a>
              </article>
            </Reveal>
          ))}
        </div>
        <p className={styles.pricingProviderNote}>
          Custos de consumo da OpenAI, WhatsApp, Google e outros provedores não
          estão incluídos. Integrações dependem de contas e aprovação dos
          respectivos serviços.
        </p>
      </section>

      <section className={styles.pricingDemoSection}>
        <div className={styles.demoHeading}>
          <Reveal>
            <Kicker>Conheça antes de contratar</Kicker>
            <h2>
              Veja como o RevFlow organiza
              <br />
              <em>a próxima ação comercial.</em>
            </h2>
          </Reveal>
          <p>
            Esta demonstração é ilustrativa, não acessa sua conta e não grava
            dados no sistema.
          </p>
        </div>
        <ProductDemo
          key={vertical}
          initialVertical={vertical}
          allowVerticalChange={false}
          compact
        />
      </section>

      <section className={styles.pricingTrustSection}>
        <Reveal>
          <Kicker>Estrutura para operar em equipe</Kicker>
          <h2>O contexto permanece com a organização.</h2>
        </Reveal>
        <div className={styles.trustGrid}>
          {[
            [
              ShieldCheck,
              "Dados por organização",
              "O isolamento entre empresas é protegido pelas regras de acesso do banco.",
            ],
            [
              Clock3,
              "Histórico centralizado",
              "Interações relevantes permanecem ligadas à oportunidade comercial.",
            ],
            [
              UserRoundCheck,
              "Responsáveis e permissões",
              "A operação deixa claro quem acompanha cada próxima ação.",
            ],
          ].map(([Icon, title, description]) => {
            const TrustIcon = Icon as typeof ShieldCheck;
            return (
              <article key={title as string}>
                <TrustIcon size={20} aria-hidden="true" />
                <h3>{title as string}</h3>
                <p>{description as string}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.pricingFaq}>
        <Reveal>
          <Kicker>Dúvidas antes de começar</Kicker>
          <h2>Informação clara, antes da decisão.</h2>
        </Reveal>
        <div className={styles.faqList}>
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.pricingFinalCta}>
        <Reveal>
          <h2>Pronto para ver o RevFlow na sua operação?</h2>
          <p>
            Entenda a implantação, tire suas dúvidas e conheça o fluxo antes de
            decidir.
          </p>
          <div className={styles.homeActions}>
            <a
              className={styles.primaryButton}
              href={salesWhatsAppUrl(
                "Conheci o RevFlow e quero solicitar uma demonstração.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Solicitar demonstração <MessageCircle size={17} />
            </a>
            <a
              className={styles.contactButton}
              href={salesWhatsAppUrl(
                "Conheci o RevFlow e quero falar sobre os planos.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar pelo WhatsApp
            </a>
          </div>
        </Reveal>
      </section>
      <Footer variant="pricing" />
      <WhatsAppFloat variant="pricing" />
    </main>
  );
}

export function MarketingPage({ variant }: { variant: MarketingVariant }) {
  if (variant === "home") return <HomePage />;
  if (variant === "how-it-works") return <HowItWorksPage />;
  if (variant === "pricing") return <PricingPage />;
  return <NichePage niche={variant} />;
}
