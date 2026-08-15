"use client";

import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Columns3,
  Home,
  Inbox,
  RefreshCw,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import styles from "./product-demo.module.css";

export type DemoVertical = "agency" | "real-estate";

type DemoStage = {
  title: string;
  eyebrow: string;
  description: string;
  nextAction: string;
  Icon: typeof Inbox;
};

const agencyStages: DemoStage[] = [
  {
    title: "Lead recebido",
    eyebrow: "Entrada organizada",
    description:
      "O interesse entra no fluxo com origem e contexto preservados.",
    nextAction: "Revisar o novo contato",
    Icon: Inbox,
  },
  {
    title: "Contexto qualificado",
    eyebrow: "Perfil comercial",
    description: "Serviço, urgência e informações importantes ficam visíveis.",
    nextAction: "Validar oportunidade",
    Icon: Sparkles,
  },
  {
    title: "Responsável definido",
    eyebrow: "Distribuição clara",
    description: "A equipe sabe quem conduz a oportunidade a partir de agora.",
    nextAction: "Preparar abordagem",
    Icon: UserRoundCheck,
  },
  {
    title: "Reunião agendada",
    eyebrow: "Agenda conectada",
    description: "O compromisso passa a fazer parte do histórico comercial.",
    nextAction: "Realizar diagnóstico",
    Icon: CalendarCheck2,
  },
  {
    title: "Follow-up preparado",
    eyebrow: "Próxima ação",
    description: "O retorno deixa de depender da memória de quem atende.",
    nextAction: "Retomar negociação",
    Icon: ClipboardCheck,
  },
  {
    title: "Pipeline atualizado",
    eyebrow: "Gestão com contexto",
    description: "A evolução da oportunidade fica clara para toda a equipe.",
    nextAction: "Acompanhar avanço",
    Icon: Columns3,
  },
];

const realEstateStages: DemoStage[] = [
  {
    title: "Lead recebido",
    eyebrow: "Entrada organizada",
    description: "O interesse entra no fluxo sem se perder entre os canais.",
    nextAction: "Identificar necessidade",
    Icon: Inbox,
  },
  {
    title: "Perfil identificado",
    eyebrow: "Preferências registradas",
    description: "Região, finalidade e faixa de investimento ganham contexto.",
    nextAction: "Validar preferências",
    Icon: Sparkles,
  },
  {
    title: "Corretor responsável",
    eyebrow: "Atendimento distribuído",
    description: "A oportunidade tem responsável e continuidade definida.",
    nextAction: "Selecionar opções",
    Icon: UserRoundCheck,
  },
  {
    title: "Imóvel recomendado",
    eyebrow: "Matching comercial",
    description: "O perfil é relacionado a uma opção compatível e disponível.",
    nextAction: "Apresentar imóvel",
    Icon: Home,
  },
  {
    title: "Visita agendada",
    eyebrow: "Agenda conectada",
    description: "Imóvel, oportunidade e compromisso ficam no mesmo histórico.",
    nextAction: "Confirmar visita",
    Icon: CalendarCheck2,
  },
  {
    title: "Follow-up preparado",
    eyebrow: "Próxima ação",
    description:
      "O retorno após a visita fica definido antes de ser esquecido.",
    nextAction: "Registrar percepção",
    Icon: ClipboardCheck,
  },
  {
    title: "Pipeline atualizado",
    eyebrow: "Gestão imobiliária",
    description:
      "A liderança acompanha a negociação com o contexto necessário.",
    nextAction: "Acompanhar proposta",
    Icon: Columns3,
  },
];

export function ProductDemo({
  initialVertical = "agency",
  allowVerticalChange = true,
  compact = false,
}: {
  initialVertical?: DemoVertical;
  allowVerticalChange?: boolean;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [vertical, setVertical] = useState<DemoVertical>(initialVertical);
  const [activeStage, setActiveStage] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);
  const stages = useMemo(
    () => (vertical === "agency" ? agencyStages : realEstateStages),
    [vertical],
  );
  const stage = stages[activeStage] ?? stages[0];
  const StageIcon = stage.Icon;
  const isRealEstate = vertical === "real-estate";

  useEffect(() => {
    if (!autoPlaying || reduceMotion) return;
    if (activeStage >= stages.length - 1) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveStage((current) => current + 1);
    }, 2100);

    return () => window.clearTimeout(timer);
  }, [activeStage, autoPlaying, reduceMotion, stages.length]);

  function selectVertical(nextVertical: DemoVertical) {
    setVertical(nextVertical);
    setActiveStage(0);
    setAutoPlaying(true);
  }

  function moveStage(direction: -1 | 1) {
    setAutoPlaying(false);
    setActiveStage((current) =>
      Math.min(Math.max(current + direction, 0), stages.length - 1),
    );
  }

  function restart() {
    setActiveStage(0);
    setAutoPlaying(true);
  }

  return (
    <section
      className={`${styles.demo} ${isRealEstate ? styles.realEstate : ""} ${compact ? styles.compact : ""}`}
      aria-label="Demonstração interativa do RevFlow"
    >
      <div className={styles.demoHeader}>
        <div>
          <span className={styles.demoLabel}>
            <span /> Demonstração
          </span>
          <strong>Veja o fluxo acontecer</strong>
        </div>
        {allowVerticalChange ? (
          <div
            className={styles.verticalTabs}
            role="tablist"
            aria-label="Escolher fluxo"
          >
            <button
              type="button"
              role="tab"
              aria-selected={vertical === "agency"}
              onClick={() => selectVertical("agency")}
            >
              Agências
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vertical === "real-estate"}
              onClick={() => selectVertical("real-estate")}
            >
              Imobiliárias
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.window}>
        <div className={styles.windowTopbar}>
          <span className={styles.windowDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Fluxo comercial</span>
          <span className={styles.secureStatus}>
            <Check size={12} aria-hidden="true" /> Contexto atualizado
          </span>
        </div>
        <div className={styles.windowBody}>
          <aside className={styles.demoRail} aria-hidden="true">
            <span className={styles.railBrand}>
              {isRealEstate ? <Building2 /> : <ArrowRight />}
            </span>
            <span />
            <span className={styles.railActive} />
            <span />
            <span />
          </aside>
          <div className={styles.demoContent}>
            <div
              className={styles.flowSteps}
              aria-label="Etapas da demonstração"
            >
              {stages.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={index === activeStage ? styles.activeFlowStep : ""}
                  aria-current={index === activeStage ? "step" : undefined}
                  aria-label={`Etapa ${index + 1}: ${item.title}`}
                  onClick={() => {
                    setActiveStage(index);
                    setAutoPlaying(false);
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i />
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${vertical}-${activeStage}`}
                className={styles.stageGrid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                <div className={styles.stageMain}>
                  <span className={styles.stageIcon}>
                    <StageIcon size={21} aria-hidden="true" />
                  </span>
                  <small>{stage.eyebrow}</small>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                  <div className={styles.contextTags}>
                    <span>Histórico preservado</span>
                    <span>Responsável visível</span>
                  </div>
                </div>
                <div className={styles.stageAside}>
                  <small>Próxima ação</small>
                  <strong>{stage.nextAction}</strong>
                  <span className={styles.nextActionIcon}>
                    <ArrowRight size={17} aria-hidden="true" />
                  </span>
                  <div className={styles.progressCard}>
                    <span>Avanço do fluxo</span>
                    <i>
                      <motion.b
                        animate={{
                          width: `${((activeStage + 1) / stages.length) * 100}%`,
                        }}
                        transition={{ duration: 0.35 }}
                      />
                    </i>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className={styles.demoControls}>
        <button
          type="button"
          onClick={() => moveStage(-1)}
          disabled={activeStage === 0}
        >
          <ChevronLeft size={16} aria-hidden="true" /> Anterior
        </button>
        <span aria-live="polite">
          {activeStage + 1} de {stages.length}
        </span>
        {activeStage === stages.length - 1 ? (
          <button type="button" onClick={restart}>
            <RefreshCw size={15} aria-hidden="true" /> Reiniciar
          </button>
        ) : (
          <button type="button" onClick={() => moveStage(1)}>
            Próximo <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
