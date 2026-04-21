export type Transaction = {
  id: string
  date: string
  description: string
  category: string
  type: "income" | "expense"
  amount: number
}

export type SuspiciousAlert = {
  id: string            
  rule: "duplicate" | "high-amount" | "many-small"
  message: string
  riskScore: number     
  transactions: Transaction[]
}

type TxWithAbs = Transaction & { absAmount: number }

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

  const txs: TxWithAbs[] = transactions.map(t => ({
    ...t,
    absAmount: Math.abs(t.amount),
  }))

  // 1) Duplicate transactions: same date, description (case-insensitive), and abs amount
  const duplicateMap = new Map<string, TxWithAbs[]>()
  for (const t of txs) {
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

// 2) High-amount single transactions (expenses only)
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


  // 3) Many small transactions in a single day
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

  // Sort by risk, descending
  alerts.sort((a, b) => b.riskScore - a.riskScore)
  return alerts
}