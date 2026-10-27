/* ============================================================================
   Draft the ranged payout table from the shipped engine's own sales.

   The designer's Revenue proposal pays by BAND: count the units of demand a company
   reaches, and pay $ / $$ / $$$ of the price by where that count falls between two
   thresholds, with a floor so that a company reaching nothing still earns its
   lowest multiplier. This script writes that table - two thresholds and three
   multipliers for every industry and level - from the real distribution of reach,
   so the draft is read off the game rather than typed.

   HOW. audit_revenue.js --dump writes every sale under the shipped rule: units
   reached, price, production, revenue. For each industry and level with enough
   sales, the top threshold b is where a company is FULLY SERVED - its production or
   the 90th percentile of reach, whichever is lower - and a sits at 60% of b, which
   is the designer's own shape (Retail L3: 10 / 15 on production 16). Each
   multiplier is the mean revenue the shipped rule pays inside that band divided by
   the mean price there, rounded to a whole number and never below 1: the floor is
   deliberate, and is what pays an empty-reach company its price instead of $1 a
   unit of recycling. Levels with under thirty sales double the level below, as
   production does. By construction the draft pays within a dollar of today at
   every industry and level; what the bots then do with it is measured separately,
   with audit_revenue.js --ranged, which reads ranged_table.json.

   Run: node audit_revenue.js 300 3 4 --current --dump reach_sales.json
        node draft_ranged_table.js reach_sales.json ranged_table.json
   ========================================================================== */
