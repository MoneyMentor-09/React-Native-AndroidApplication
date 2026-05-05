export type Transaction = {
  id: string
  date: string
  description: string
  category: string
  type: "income" | "expense"
  amount: number
}

export type SuspiciousAlert = {
  // Deterministic pattern ID used for upserts and dismissals.
  id: string
  rule: "duplicate" | "high-amount" | "many-small"
  message: string
  // Higher risk scores appear first in the alert center.
  riskScore: number
  transactions: Transaction[]
}

type TxWithAbs = Transaction & { absAmount: number }

/**
 * Runs local suspicious-transaction rules over a user's transactions.
 *
 * The function is pure: it does not read or write Supabase. Screens can run it
 * repeatedly, then decide which generated alerts should be persisted.
 */
export function analyzeSuspiciousTransactions(
  transactions: Transaction[],
  options?: {
    highAmountThreshold?: number
    smallAmountThreshold?: number
    manySmallCountThreshold?: number
  }
): SuspiciousAlert[] {
  const {
    highAmountThreshold = 1000,
    smallAmountThreshold = 10,
    manySmallCountThreshold = 5,
  } = options || {}

  const alerts: SuspiciousAlert[] = []

  // Keep the signed amount for display/ownership, but add absAmount so rules
  // can compare expenses consistently even when they are stored as negatives.
  const txs: TxWithAbs[] = transactions.map(t => ({
    ...t,
    absAmount: Math.abs(t.amount),
  }))

  // 1) Duplicate transactions: same date, description (case-insensitive), and amount.
  const duplicateMap = new Map<string, TxWithAbs[]>()
  for (const t of txs) {
    // The grouped key is also part of the alert ID, so keep it stable.
    const key = `${t.date}::${t.description.trim().toLowerCase()}::${t.absAmount.toFixed(2)}`
    const list = duplicateMap.get(key) ?? []
    list.push(t)
    duplicateMap.set(key, list)
  }
  for (const [key, group] of duplicateMap.entries()) {
    if (group.length >= 2) {
      const any = group[0]
      alerts.push({
        id: `dup-${key}`,
        rule: "duplicate",
        message: `Found ${group.length} duplicate transactions on ${any.date} for "${any.description}" ($${any.absAmount.toFixed(2)}).`,
        riskScore: 75,
        transactions: group,
      })
    }
  }

  // 2) High-amount single transactions. Income is excluded because large
  // deposits are not suspicious under this rule.
  const highAmountTx: TxWithAbs[] = txs.filter(
    t => t.type === "expense" && t.absAmount >= highAmountThreshold
  )

  for (const t of highAmountTx) {
    alerts.push({
      id: `high-${t.id}`,
      rule: "high-amount",
      message: `High-value expense of $${t.absAmount.toFixed(2)} on ${t.date}: "${t.description}".`,
      riskScore: 80,
      transactions: [t],
    })
  }


  // 3) Many small transactions in a single day. This can surface accidental
  // repeated charges or unusual fragmented spending patterns.
  const byDate = new Map<string, TxWithAbs[]>()
  for (const t of txs) {
    const list = byDate.get(t.date) ?? []
    list.push(t)
    byDate.set(t.date, list)
  }
  for (const [date, list] of byDate.entries()) {
    const smalls = list.filter(t => t.absAmount > 0 && t.absAmount < smallAmountThreshold)
    if (smalls.length >= manySmallCountThreshold) {
      alerts.push({
        id: `many-small-${date}`,
        rule: "many-small",
        message: `${smalls.length} small transactions under $${smallAmountThreshold.toFixed(
          2
        )} on ${date}.`,
        riskScore: 60,
        transactions: smalls,
      })
    }
  }

  // Sort by risk so the alert center can render the most important patterns first.
  alerts.sort((a, b) => b.riskScore - a.riskScore)
  return alerts
}
