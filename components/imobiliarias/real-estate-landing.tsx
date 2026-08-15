"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BrainCircuit,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  Home,
  MessageCircleMore,
  Route,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import styles from "./real-estate-landing.module.css";

const benefits = [
  {
    icon: Route,
    title: "Leads centralizados",
    description:
      "Cada conversa começa no mesmo lugar e segue um caminho claro.",
  },
  {
    icon: CalendarCheck2,
    title: "Visitas organizadas",
    description: "A agenda comercial deixa de depender de mensagens soltas.",
  },
  {
    icon: UserRoundCheck,
    title: "Próxima ação clara",
    description: "Corretores sabem exatamente quem atender e quando agir.",
  },
];

const steps = [
  ["Novo lead", "O interesse chega com contexto."],
  ["Perfil identificado", "Necessidades e momento de compra."],
  ["Imóvel recomendado", "Opções alinhadas ao perfil."],
  ["Visita", "Atendimento preparado e confirmado."],
  ["Proposta", "Negociação com histórico completo."],
  ["Contrato", "A operação continua rastreável."],
] as const;

const features = [
  {
    icon: Sparkles,
    title: "Matching lead + imóvel",
    description: "Conecte demanda, perfil e disponibilidade com mais contexto.",
  },
  {
    icon: CalendarCheck2,
    title: "Agenda integrada",
    description: "Crie e acompanhe visitas com o Google Calendar.",
  },
  {
    icon: BrainCircuit,
    title: "Qualificação com IA",
    description:
      "Transforme informações do atendimento em próxima ação comercial.",
  },
  {
    icon: MessageCircleMore,
    title: "Follow-ups e WhatsApp",
    description:
      "Mantenha o interesse ativo sem perder o momento certo de contato.",
  },
  {
    icon: UserRoundCheck,
    title: "Gestão por corretor",
    description: "Distribua oportunidades e dê visão ao coordenador.",
  },
  {
    icon: Clock3,
    title: "Histórico comercial",
    description: "Entenda cada interação antes de retomar uma negociação.",
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CrmPreview() {
  const reduceMotion = useReducedMotion();
  const floatTransition = reduceMotion
    ? undefined
    : {
        duration: 4.8,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror" as const,
        ease: "easeInOut" as const,
      };

  return (
    <motion.div
      className={styles.previewWrap}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97, x: 18 }}
      animate={reduceMotion ? {} : { opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Representação ilustrativa do fluxo comercial imobiliário"
    >
      <div className={styles.previewGlow} />
      <div className={styles.previewWindow}>
        <div className={styles.previewTopbar}>
          <div className={styles.previewDots}>
            <i />
            <i />
            <i />
          </div>
          <span>Fluxo de atendimento</span>
          <span className={styles.liveDot}>Ao vivo</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.previewRail}>
            <span className={styles.railMark} />
            <span />
            <span />
            <span />
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewHeading}>
              <div>
                <p>Oportunidade em andamento</p>
                <strong>Visita em preparação</strong>
              </div>
              <span className={styles.statusPill}>
                <Check size={13} /> Qualificado
              </span>
            </div>
            <div className={styles.previewColumns}>
              <article className={styles.leadCard}>
                <div className={styles.cardLabel}>
                  <span>Lead recebido</span>
                  <ArrowDownRight size={16} />
                </div>
                <strong>Perfil residencial</strong>
                <p>Preferências registradas e próxima conversa definida.</p>
                <div className={styles.tagRow}>
                  <span>Compra</span>
                  <span>Prioridade</span>
                </div>
              </article>
              <article className={styles.propertyCard}>
                <div className={styles.propertyVisual}>
                  <Home size={22} strokeWidth={1.6} />
                  <span>Imóvel recomendado</span>
                </div>
                <strong>Opções alinhadas</strong>
                <p>Compatibilidade analisada para seguir com a visita.</p>
              </article>
            </div>
            <div className={styles.appointmentCard}>
              <div className={styles.calendarIcon}>
                <CalendarCheck2 size={17} />
              </div>
              <div>
                <span>Próxima etapa</span>
                <strong>Visita agendada</strong>
              </div>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
      <motion.div
        className={`${styles.floatingCard} ${styles.floatingOne}`}
        animate={reduceMotion ? {} : { y: [-5, 5] }}
        transition={floatTransition}
      >
        <span className={styles.floatingIcon}>
          <Sparkles size={14} />
        </span>
        <div>
          <span>Recomendação</span>
          <strong>Próximo imóvel</strong>
        </div>
      </motion.div>
      <motion.div
        className={`${styles.floatingCard} ${styles.floatingTwo}`}
        animate={reduceMotion ? {} : { y: [5, -5] }}
        transition={{ ...floatTransition, delay: 0.5 }}
      >
        <span className={styles.floatingIcon}>
          <Check size={14} />
        </span>
        <div>
          <span>Negociação</span>
          <strong>Proposta enviada</strong>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RealEstateLanding() {
  const reduceMotion = useReducedMotion();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <nav className={styles.nav} aria-label="Navegação principal">
          <Link
            href="/imobiliarias"
            className={styles.logoLink}
            aria-label="RevFlow para Imobiliárias"
          >
            <Image
              src="/revflow-imoveis-logo.png"
              alt="RevFlow"
              width={380}
              height={110}
              priority
              className={styles.logo}
            />
          </Link>
          <a href="#fluxo" className={styles.navLink}>
            Conhecer o fluxo <ArrowRight size={15} />
          </a>
        </nav>

        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroCopy}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.eyebrow}>
              <span /> Operação comercial para imobiliárias
            </div>
            <h1>
              Cada lead merece <em>virar uma visita.</em>
            </h1>
            <p>
              Centralize leads, imóveis, visitas, follow-ups e negociações para
              sua imobiliária vender com mais previsibilidade.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/login">
                Solicitar demonstração <ArrowRight size={17} />
              </Link>
              <a className={styles.secondaryButton} href="#fluxo">
                Conhecer o fluxo <ArrowDownRight size={17} />
              </a>
            </div>
          </motion.div>
          <CrmPreview />
        </div>
        <div className={styles.heroFootnote}>
          <span className={styles.line} />
          Do primeiro contato ao contrato, uma operação que sua equipe consegue
          acompanhar.
        </div>
      </section>

      <section className={styles.section} aria-labelledby="benefits-title">
        <Reveal>
          <p className={styles.sectionKicker}>Clareza para o time comercial</p>
          <h2 id="benefits-title">
            Menos lead perdido.
            <br />
            <em>Mais visitas realizadas.</em>
          </h2>
        </Reveal>
        <div className={styles.benefitGrid}>
          {benefits.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.1}>
              <article className={styles.benefitCard}>
                <span className={styles.featureIcon}>
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="fluxo"
        className={`${styles.section} ${styles.flowSection}`}
        aria-labelledby="flow-title"
      >
        <Reveal>
          <p className={styles.sectionKicker}>
            Um fluxo que acompanha a negociação
          </p>
          <h2 id="flow-title">
            O comercial da sua imobiliária,
            <br />
            <em>sem ponto cego.</em>
          </h2>
        </Reveal>
        <div className={styles.flowLine}>
          {steps.map(([title, description], index) => (
            <Reveal key={title} delay={index * 0.06}>
              <article className={styles.flowStep}>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                {index < steps.length - 1 ? (
                  <ArrowRight
                    className={styles.stepArrow}
                    size={18}
                    aria-hidden
                  />
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.featuresSection}`}
        aria-labelledby="features-title"
      >
        <Reveal>
          <div className={styles.featuresHeading}>
            <div>
              <p className={styles.sectionKicker}>
                Ferramentas para fechar melhor
              </p>
              <h2 id="features-title">
                O contexto certo,
                <br />
                <em>na hora de vender.</em>
              </h2>
            </div>
            <p>
              Uma base comercial pensada para as decisões que acontecem entre
              uma mensagem, uma visita e uma proposta.
            </p>
          </div>
        </Reveal>
        <div className={styles.featuresGrid}>
          {features.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={(index % 3) * 0.07}>
              <article className={styles.featureCard}>
                <Icon size={19} strokeWidth={1.65} />
                <h3>{title}</h3>
                <p>{description}</p>
                <span className={styles.cardArrow}>
                  <ArrowRight size={16} />
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="demonstracao"
        className={styles.finalCta}
        aria-labelledby="cta-title"
      >
        <div className={styles.finalGlow} />
        <Reveal className={styles.finalContent}>
          <p className={styles.sectionKicker}>RevFlow para Imobiliárias</p>
          <h2 id="cta-title">
            Sua equipe sabe qual lead
            <br />
            <em>atender agora?</em>
          </h2>
          <p>
            Feito para imobiliárias que querem transformar atendimento em
            vendas.
          </p>
          <Link className={styles.primaryButton} href="/login">
            Quero ver o RevFlow em ação <ArrowRight size={17} />
          </Link>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <div>
          <Image
            src="/revflow-imoveis-logo.png"
            alt="RevFlow"
            width={242}
            height={70}
            className={styles.footerLogo}
          />
          <p>RevFlow para Imobiliárias.</p>
        </div>
        <nav aria-label="Links institucionais">
          <a href="#privacidade">Privacidade</a>
          <a href="#termos">Termos</a>
          <a href="#demonstracao">Contato</a>
        </nav>
      </footer>
      <div id="privacidade" className={styles.visuallyHidden}>
        Privacidade: o RevFlow trata dados comerciais da imobiliária com acesso
        controlado por organização.
      </div>
      <div id="termos" className={styles.visuallyHidden}>
        Termos: a disponibilidade do RevFlow é definida no contrato da empresa
        contratante.
      </div>
    </main>
  );
}
