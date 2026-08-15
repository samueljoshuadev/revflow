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

import styles from "./revflow-marketing.module.css";

type MarketingVariant = "home" | "agency" | "real-estate" | "pricing";

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
          isRealEstate
            ? "/revflow-imobiliarias.png"
            : "/revflow-agencias.png"
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
          <a href="#como-funciona" onClick={() => setOpen(false)}>
            Como funciona
          </a>
          <Link
            className={styles.loginLink}
            href="/login"
            onClick={() => setOpen(false)}
          >
            Entrar <ArrowRight size={15} />
          </Link>
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
              href={salesWhatsAppUrl("Quero entender qual fluxo RevFlow combina com a minha empresa.")}
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

function PricingPage() {
  return (
    <main className={`${styles.page} ${styles.pricingPage}`}>
      <Header active="pricing" />
      <section className={styles.pricingHero}>
        <div className={styles.gridBackdrop} />
        <Reveal className={styles.pricingCopy}>
          <Kicker>Planos RevFlow</Kicker>
          <h1>
            Um fluxo comercial claro.
            <br />
            <em>Um preço que você entende.</em>
          </h1>
          <p>
            Comece com o time que você já tem e escale conforme sua operação
            comercial cresce.
          </p>
        </Reveal>
      </section>
      <section className={styles.pricingSection}>
        <Reveal>
          <article className={styles.pricingCard}>
            <div>
              <Kicker>RevFlow Essencial</Kicker>
              <h2>Para equipes que querem parar de perder contexto.</h2>
              <p className={styles.pricingValue}>
                R$ 97 <small>por usuário ativo / mês</small>
              </p>
              <p className={styles.pricingNote}>
                Para agências e imobiliárias. Implantação e configuração das
                integrações são alinhadas na demonstração.
              </p>
            </div>
            <ul>
              <li><Check size={16} /> Leads, pipeline e histórico comercial</li>
              <li><Check size={16} /> Agenda, Google Calendar e tarefas</li>
              <li><Check size={16} /> Follow-ups, qualificações e WhatsApp</li>
              <li><Check size={16} /> Imóveis, visitas e matching para imobiliárias</li>
            </ul>
            <a
              className={styles.primaryButton}
              href={salesWhatsAppUrl("Quero conhecer os planos e solicitar uma demonstração do RevFlow.")}
              target="_blank"
              rel="noreferrer"
            >
              Solicitar demonstração <MessageCircle size={17} />
            </a>
          </article>
        </Reveal>
      </section>
      <section className={styles.pricingFaq}>
        <Reveal>
          <h2>Sem cobrança automática nesta etapa.</h2>
          <p>
            Você conversa com o time RevFlow, entende a implantação e só então
            decide se o fluxo faz sentido para sua operação.
          </p>
        </Reveal>
      </section>
      <Footer variant="pricing" />
      <WhatsAppFloat variant="pricing" />
    </main>
  );
}

export function MarketingPage({ variant }: { variant: MarketingVariant }) {
  if (variant === "home") return <HomePage />;
  if (variant === "pricing") return <PricingPage />;
  return <NichePage niche={variant} />;
}
