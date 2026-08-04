import type { Indicator } from "@/lib/types";
import { LABELS } from "@/constants/labels";
import { zoneThresholds } from "@/constants/zones";
import StatusBadge from "./StatusBadge";
import IndicatorChart from "./IndicatorChart";
import IndicatorGauge from "./IndicatorGauge";

// 게이지 스케일: 50% ~ 250% (현재 ~218%를 담기 위해)
const GAUGE_MIN = 50;
const GAUGE_MAX = 250;

export default function BuffettHero({ indicator }: { indicator: Indicator }) {
  const L = LABELS.buffett;
  const { value, zone, error } = indicator;
  const color = zone?.color ?? "var(--zone-orange)";

  return (
    <section
      className="rowGrid heroPad"
      style={{
        background: "var(--surface-hero)",
        border: "var(--border-width) solid var(--border)",
        borderRadius: "var(--radius-hero)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--stack-card)",
          minWidth: 0,
        }}
      >
        <p
          style={{
            fontSize: "var(--fs-eyebrow)",
            fontWeight: "var(--fw-bold)",
            color: "var(--fg)",
          }}
        >
          {L.ko}{" "}
          <span
            style={{
              fontWeight: "var(--fw-medium)",
              color: "var(--muted)",
              fontSize: "var(--fs-eyebrow-en)",
            }}
          >
            · {L.en}
          </span>
        </p>

        <div
          style={{
            fontSize: "var(--fs-hero-value)",
            fontWeight: "var(--fw-extrabold)",
            lineHeight: "var(--lh-value)",
            fontVariantNumeric: "var(--numeric-metric)",
            letterSpacing: "var(--ls-hero-value)",
            color,
          }}
        >
          {value != null ? `${value.toFixed(L.decimals)}${L.unit}` : "—"}
        </div>

        <StatusBadge zone={zone} />

        <p
          style={{
            fontSize: "var(--fs-blurb-hero)",
            lineHeight: "var(--lh-blurb-hero)",
            color: "var(--muted)",
            maxWidth: "var(--measure-blurb)",
          }}
        >
          {L.blurbKo}
          <span
            style={{
              display: "block",
              color: "var(--faint)",
              fontSize: "var(--fs-blurb-hero-en)",
              marginTop: "var(--space-3)",
            }}
          >
            {L.blurbEn}
          </span>
        </p>

        <IndicatorGauge value={value} min={GAUGE_MIN} max={GAUGE_MAX} />

        <p
          style={{
            fontSize: "var(--fs-asof)",
            color: "var(--muted)",
            marginTop: "auto",
          }}
        >
          {error
            ? "일시적으로 불러올 수 없음 · Temporarily unavailable"
            : indicator.asOf}{" "}
          · {L.source}
        </p>
      </div>

      <div style={{ minWidth: 0, display: "flex", alignItems: "center" }}>
        <IndicatorChart
          data={indicator.history}
          color={color}
          thresholds={zoneThresholds("buffett")}
          unit="%"
          decimals={0}
          height={280}
        />
      </div>
    </section>
  );
}
