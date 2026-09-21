/* ============================================================================
   A traducao ainda descreve o mesmo jogo?

   O manual em ingles e a fonte das regras; o portugues e uma traducao dele. As
   duas coisas que podem se separar sem ninguem notar sao a ESTRUTURA (alguem
   acrescenta um paragrafo em um lado so) e os NUMEROS (alguem corrige $20 para
   $25 no ingles e esquece do portugues). As duas sao checadas aqui, celula por
   celula, e nao "no olho".

   O que NAO e checado e a qualidade da prosa - isso e trabalho de quem le.

   Uso:  node check_rulebook_pt.mjs
   ========================================================================== */
import { RULEBOOK } from "./rulebook.data.mjs";
import { RULEBOOK_PT } from "./rulebook.pt.mjs";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};

/* Todo numero, valor em dolar, porcentagem, codigo de setor e rotulo de
   trimestre tem de sobreviver a traducao. Compara-se o MULTICONJUNTO: a ordem
   pode mudar (a ordem das palavras muda), a contagem nao. */
const TOKENS = /\$?\d+(?:[.,]\d+)?%?|\b(?:UT|RE|HO|MA|HC|TE)\b|\bQ\d{1,2}\b/g;
const tokensOf = (s) => (String(s).match(TOKENS) || []).sort();
const strings = (x, out = []) => {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === "object") Object.entries(x).forEach(([k, v]) => { if (k !== "id" && k !== "only") strings(v, out); });
  return out;
};

check(`mesmo numero de secoes (${RULEBOOK.length})`, RULEBOOK.length === RULEBOOK_PT.length,
  `pt tem ${RULEBOOK_PT.length}`);

RULEBOOK.forEach((en, i) => {
  const pt = RULEBOOK_PT[i];
  if (!pt) { check(`secao ${en.id} existe em portugues`, false); return; }
  const problems = [];
  if (pt.id !== en.id) problems.push(`id ${pt.id} != ${en.id}`);
  if (pt.only !== en.only) problems.push(`only ${pt.only} != ${en.only}`);
  if (pt.blocks.length !== en.blocks.length) problems.push(`${pt.blocks.length} blocos != ${en.blocks.length}`);
  en.blocks.forEach((eb, j) => {
    const pb = pt.blocks[j];
    if (!pb) { problems.push(`bloco ${j} faltando`); return; }
    const ek = Object.keys(eb).sort().join(","), pk = Object.keys(pb).sort().join(",");
    if (ek !== pk) problems.push(`bloco ${j}: ${pk} != ${ek}`);
    if (eb.table && pb.table) {
      if (eb.table.head.length !== pb.table.head.length) problems.push(`bloco ${j}: tabela com largura diferente`);
      if (eb.table.rows.length !== pb.table.rows.length) problems.push(`bloco ${j}: tabela com ${pb.table.rows.length} linhas != ${eb.table.rows.length}`);
      eb.table.rows.forEach((r, k) => {
        const pr = pb.table.rows[k];
        if (pr && r.length !== pr.length) problems.push(`bloco ${j} linha ${k}: ${pr.length} celulas != ${r.length}`);
      });
    }
    if (eb.ul && pb.ul && eb.ul.length !== pb.ul.length) problems.push(`bloco ${j}: lista com ${pb.ul.length} itens != ${eb.ul.length}`);
  });
  check(`${en.id}: mesma estrutura`, problems.length === 0, problems.slice(0, 3).join("; "));

  const a = tokensOf(strings(en).join(" ")), b = tokensOf(strings(pt).join(" "));
  const miss = [], extra = [];
  const bag = b.slice();
  a.forEach((x) => { const k = bag.indexOf(x); if (k < 0) miss.push(x); else bag.splice(k, 1); });
  extra.push(...bag);
  check(`${en.id}: mesmos numeros e codigos (${a.length})`, miss.length === 0 && extra.length === 0,
    [miss.length ? `faltam ${miss.slice(0, 6).join(" ")}` : "", extra.length ? `sobram ${extra.slice(0, 6).join(" ")}` : ""].filter(Boolean).join(" / "));
});

/* Nenhuma secao pode ter ficado em ingles por engano. Palavras funcionais que
   so existem em ingles denunciam um bloco esquecido. */
RULEBOOK_PT.forEach((pt) => {
  const text = strings(pt).join(" ");
  const english = (text.match(/\b(?:the|and|with|that|which|your|from|their)\b/gi) || []).length;
  const words = text.split(/\s+/).length;
  check(`${pt.id}: esta em portugues`, english / Math.max(1, words) < 0.02,
    `${english} palavras inglesas em ${words}`);
});

console.log(fails ? `\n${fails} de ${n} checagem(ns) falharam\n` : `\ntodas as ${n} checagens passaram\n`);
process.exit(fails ? 1 : 0);
