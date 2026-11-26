/* ============================================================================
   THE PRINTED COMPONENTS, DRAWN FOR A SCREEN.

   The online game used to look like a dashboard and the table like a set of printed
   components, and a player who learnt one had to learn the other again: a card that
   read "Setup $10 · Opex $5 · Prod 4" on screen was a different object from the card in
   their hand. These are the pieces of the printed set - the Blueprint, the price track,
   the phase strip, the worker slot - laid out the way the print lays them out, so the
   same eye reads both.

   They are deliberately dumb. Nothing here knows a rule: the engine's cardFace() says
   what a card prints, and these only draw it. That is what keeps the screen from ever
   showing a number the Closing does not pay.
   ========================================================================== */
import React from "react";
import { t } from "./i18n.js";
import { IND_LOGO } from "./ind_logos.js";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ---- colour: one industry colour, three uses ---- */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
export function mix(hex, into, k) {
  const a = rgb(hex), b = rgb(into);
  return "#" + a.map((v, i) => hex2(v + (b[i] - v) * k)).join("");
}
/* A pale cell of the colour, as the demand rows and pots are printed. */
export const tintOf = (hex, k = 0.8) => mix(hex, "#ffffff", k);
/* The colour dark enough to be read as text on the light ground. */
export const inkOf = (hex, k = 0.45) => mix(hex, "#1d1f20", k);

/* The industry's logo from the printed set: a black square carrying its mark. */
export function IndLogo({ ind, size = 16, title }) {
  return (
    <img className="pu-logo" src={IND_LOGO[ind]} alt={ind} title={title} draggable={false}
      style={{ width: size, height: size }} />
  );
}

/* ---- the phase strip and the quarter track ---- */
const PHASES = [["planning", "Planning"], ["resolving", "Action"], ["closing", "Closing"]];
export function PhaseClock({ phase, detail, quarter, lastQuarter }) {
  const year = Math.ceil(quarter / 4);
  return (
    <div className="pu-clock">
      <div className="pu-phases">
        {PHASES.map(([k, label], i) => (
          <span key={k} className={"pu-phase" + (k === phase ? " on" : "")}><b>{i + 1}</b>{t(label)}</span>
        ))}
      </div>
      <div className="pu-quarters">
        {Array.from({ length: lastQuarter }, (_, i) => i + 1).map((q) => (
          <span key={q} title={q % 4 === 0 ? t("Year end") : undefined}
            className={"pu-q" + (q === quarter ? " on" : q < quarter ? " done" : "") + (q % 4 === 0 ? " yearend" : "")}>
            {String(q).padStart(2, "0")}
          </span>
        ))}
      </div>
      {/* The quarter within the year, in words as well as on the track: the rulebook and the
          log both say "Q3", and a number on a strip is not something a player can quote. */}
      <span className="pu-year">{t("Year {0}, Q{1}", year, ((quarter - 1) % 4) + 1)}</span>
      {detail && <span className="pu-detail">{detail}</span>}
    </div>
  );
}

/* ---- the price track: one line from the lowest price to the highest, one marker ---- */
export function PriceTrack({ cell, cells, min, max, base, color }) {
  const n = max - min;
  return (
    <div className="pu-track">
      <i className="pu-track-line" />
      {Array.from({ length: n + 1 }, (_, i) => (
        <i key={i} className={"pu-tick" + (min + i === base ? " base" : "")} style={{ left: `${(i / n) * 100}%` }} />
      ))}
      <i className="pu-marker" style={{ left: `${(cell / cells) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

/* ---- a worker in a slot, and an empty slot ---- */
export function WorkerSlot({ color, label, locked, n, hatched, title }) {
  if (locked) return <span className={cx("pu-slot", "locked")} title={title}><LockGlyph /></span>;
  if (!color) return <span className={"pu-slot" + (hatched ? " hatched" : "")} title={title}>{n}</span>;
  return (
    <span className={cx("pu-slot", "filled")} title={title} style={{ backgroundColor: color, borderColor: mix(color, "#1d1f20", 0.35) }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
      {label && <em>{label}</em>}
    </span>
  );
}
function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ---- the Blueprint ----
   Read top to bottom the way the printed card is: the plate with the logo and level,
   the name, what the company does EVERY QUARTER - pay each supplier, earn the best tier
   it fully meets - and then a band for each status. In a hand the card shows its IN HAND
   band; built, that band is tucked away and BUILT is the one that matters.

   A number after a slash, in grey, is the same number once upgraded, exactly as printed.

   PAY names what each supplier is handed. One supplier takes the card's whole bill, two
   take the same half ("Pay each"), and the three on a card that starts at Level 3 are
   written out one by one, because the first of them takes half and the others a quarter.

   `face` comes from the engine's cardFace(). `live`, for a company on the board, is what
   it reaches right now - { icons, px, tier } - and marks the tier it is being paid. */
const money = (v) => "$" + v;
function Twin({ now, next, fmt = money }) {
  return <>{fmt(now)}{next != null && next !== now && <s>/{String(fmt(next)).replace("$", "")}</s>}</>;
}
export function BlueprintCard({ face, color, mode = "hand", grow, live, flipped, compact, footer, onClick, disabled, width, note }) {
  const f = face;
  const built = mode === "built";
  const allSame = f.pay.every((v) => v === f.pay[0]);
  const style = { "--ind": color, "--ind-tint": tintOf(color, 0.84), "--ind-ink": inkOf(color), width };
  const arrow = grow === "H" ? "↔" : "↕";
  const growWord = grow === "H" ? t("spreads") : t("stacks");
  const tierHead = (i, table, next) => {
    if (i === 0) return <span>{t("Minimum")}</span>;
    return (
      <>
        <span><Twin now={table.icons[i]} next={next ? next.icons[i] : null} fmt={(v) => v + "+"} /> {t("icons")}</span>
        {table.price && <span>&amp; {t("price")} <Twin now={table.price[i]} next={next && next.price ? next.price[i] : null} fmt={(v) => "$" + v + "+"} /></span>}
      </>
    );
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={"pu-card" + (built ? " is-built" : "") + (disabled ? " is-off" : "") + (onClick ? " is-click" : "") + (compact ? " is-compact" : "")}
      style={style} onClick={disabled ? undefined : onClick} disabled={onClick ? disabled : undefined} type={onClick ? "button" : undefined}>
      <div className="pu-card-plate">
        <IndLogo ind={f.ind} size={compact ? 20 : 24} />
        <span className="pu-lvl">L{f.level}</span>
        {f.upgraded && <span className="pu-up" title={t("Upgraded")}>{"▲"}</span>}
        <span className="pu-grow" title={grow === "H" ? t("Upgrading spreads onto one more owned plot.") : t("Upgrading stacks one more floor on the same plot.")}>
          {arrow} {growWord}{flipped ? " ★" : ""}
        </span>
        <span className="pu-code">{f.code}</span>
      </div>
      <div className="pu-card-title">{t(f.name)}</div>

      <div className="pu-card-q">
        <div className="pu-vert"><span>{t("Every quarter")}</span></div>
        <div className="pu-q-body">
          <div className="pu-pay">
            <span className="pu-lab">{f.trial && allSame && f.suppliers.length > 1 ? t("Pay each") : t("Pay")}</span>
            {allSame ? (
              <>
                <span className="pu-sups">{f.suppliers.map((s, i) => <IndLogo key={i} ind={s} size={15} title={s} />)}</span>
                <b className="pu-num"><Twin now={f.pay[0] || 0} next={f.payNext ? f.payNext[0] : null} /></b>
              </>
            ) : (
              <span className={cx("pu-sups", "split")}>
                {f.suppliers.map((s, i) => <span key={i}><IndLogo ind={s} size={13} title={s} /><b><Twin now={f.pay[i]} next={f.payNext ? f.payNext[i] : null} /></b></span>)}
              </span>
            )}
            <span className="pu-sub">{f.rentFlat ? t("+ ${0} rent a floor", f.rentFlat) : t("+ rent if any")}</span>
          </div>
          <div className="pu-earn">
            <span className="pu-lab">{f.trial ? t("Earn the best match") : t("Earn: price ×")}</span>
            <div className="pu-tiers">
              {[0, 1, 2].map((i) => (
                <div key={i} className={"pu-tier" + (live && live.tier === i ? " on" : "")}>
                  <div className="pu-tier-h">{tierHead(i, f.earn, f.earnNext)}</div>
                  <div className="pu-tier-v">
                    {f.trial
                      ? <Twin now={f.earn.pays[i]} next={f.earnNext ? f.earnNext.pays[i] : null} />
                      : <Twin now={f.earn.mult[i]} next={f.earnNext ? f.earnNext.mult[i] : null} fmt={(v) => "×" + v} />}
                  </div>
                </div>
              ))}
            </div>
            {live && <div className="pu-live">{t("now: {0} icons at ${1}", live.icons, live.px)}</div>}
          </div>
        </div>
      </div>

      {(built || !compact) && (
        <div className={"pu-band" + (built ? " on" : "")}>
          <div className="pu-vert"><span>{t("Built")}</span></div>
          <div className="pu-band-body">
            {f.canGrow
              ? <div><i>{t("Upgrade")}</i> <b>${f.build}</b> + {arrow} {grow === "H" ? t("1 owned plot") : t("1 floor")} = <b className="pu-ep">{"★"}+{f.epNext}</b></div>
              : <div><i>{f.upgraded ? t("Upgraded") : t("Top level")}</i></div>}
            <div><i>{t("Sell")}</i> <b>${f.sellCompany}</b> <span className="pu-dot" /> <i>{t("Liquidate")}</i> <b>${f.liquidateCompany}</b></div>
          </div>
        </div>
      )}
      {!built && (
        <div className={cx("pu-band", "on")}>
          <div className="pu-vert"><span>{t("In hand")}</span></div>
          <div className="pu-band-body">
            <div><i>{t("Build")}</i> <b>${f.build}</b> + {f.plots === 1 ? t("1 plot") : t("{0} plots", f.plots)} = <b className="pu-ep">{"★"}+{f.ep}</b></div>
            <div><i>{t("Sell")}</i> <b>${f.sellCard}</b> <span className="pu-dot" /> <i>{t("Liquidate")}</i> <b>${f.liquidateCard}</b></div>
          </div>
        </div>
      )}
      {note && <div className="pu-card-note">{note}</div>}
      {footer && <div className="pu-card-foot">{footer}</div>}
    </Tag>
  );
}
