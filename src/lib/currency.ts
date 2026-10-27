const configuredUsdChfRate = Number(process.env.USD_CHF_RATE ?? 0.88);

/** Gemeinsamer USD→CHF-Prototypkurs für Katalogpreise und Budgetfunktionen. */
export const USD_CHF_RATE =
  Number.isFinite(configuredUsdChfRate) && configuredUsdChfRate > 0
    ? configuredUsdChfRate
    : 0.88;
