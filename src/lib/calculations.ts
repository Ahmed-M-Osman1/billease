import type {
  BillItem,
  BillDetails,
  Person,
  CustomSharedPool,
  CalculatedPersonSummary,
} from '@/lib/types'

export interface CalculationInput {
  items: BillItem[]
  people: Person[]
  billDetails: BillDetails
  customSharedPools: CustomSharedPool[]
  tipAmount?: number
  tipMode?: 'none' | 'pre_tax' | 'post_tax'
}

export function calculatePersonSummaries(input: CalculationInput): {
  summaries: CalculatedPersonSummary[]
  grandTotal: number
} {
  const { items, people, billDetails, customSharedPools, tipAmount = 0, tipMode = 'none' } = input

  const billGrandTotal =
    billDetails.subtotal +
    billDetails.vat +
    billDetails.serviceCharge +
    billDetails.delivery +
    (tipMode !== 'none' ? tipAmount : 0)

  if (people.length === 0) {
    return { summaries: [], grandTotal: billGrandTotal }
  }

  // Shared all items
  const sharedAllItems = items.filter((item) => item.assignedTo === 'SHARED_ALL_PEOPLE')
  const totalSharedAllValue = sharedAllItems.reduce((sum, item) => sum + item.price, 0)
  const sharedAllPerPerson = people.length > 0 ? totalSharedAllValue / people.length : 0

  // Custom pool summaries
  const poolSummaries = customSharedPools.map((pool) => {
    const poolItems = items.filter((item) => item.assignedTo === pool.id)
    const totalValue = poolItems.reduce((sum, item) => sum + item.price, 0)
    const numMembers = pool.personIds.length
    const perPerson = numMembers > 0 ? totalValue / numMembers : 0
    return { id: pool.id, name: pool.name, totalValue, perPerson, personIds: pool.personIds }
  })

  // Subtotal base for proportions
  const ocrSubtotal = billDetails.subtotal
  const sumAllItemPrices = items.reduce((sum, item) => sum + item.price, 0)
  const subtotalBase =
    ocrSubtotal > 0 && ocrSubtotal >= sumAllItemPrices ? ocrSubtotal : sumAllItemPrices

  const summaries: CalculatedPersonSummary[] = people.map((person) => {
    const directItems = items.filter((item) => item.assignedTo === person.id)
    const directSubtotal = directItems.reduce((sum, item) => sum + item.price, 0)

    let totalContribution = directSubtotal + sharedAllPerPerson
    const customPoolContributions: CalculatedPersonSummary['customSharedPoolContributions'] = []

    poolSummaries.forEach((ps) => {
      if (ps.personIds.includes(person.id)) {
        totalContribution += ps.perPerson
        customPoolContributions.push({
          poolName: ps.name,
          poolId: ps.id,
          amount: ps.perPerson,
        })
      }
    })

    let vatShare = 0
    let serviceChargeShare = 0
    let tipShare = 0

    if (subtotalBase > 0) {
      const proportion = totalContribution / subtotalBase
      vatShare = billDetails.vat * proportion
      serviceChargeShare = billDetails.serviceCharge * proportion
      if (tipMode !== 'none') {
        tipShare = tipAmount * proportion
      }
    } else if (people.length > 0) {
      vatShare = billDetails.vat / people.length
      serviceChargeShare = billDetails.serviceCharge / people.length
      if (tipMode !== 'none') {
        tipShare = tipAmount / people.length
      }
    }

    const totalDue = totalContribution + vatShare + serviceChargeShare + tipShare

    return {
      ...person,
      items: directItems,
      itemsSubtotal: directSubtotal,
      vatShare,
      serviceChargeShare,
      sharedItemsPortionValue: sharedAllPerPerson,
      customSharedPoolContributions: customPoolContributions,
      totalDue,
    }
  })

  return { summaries, grandTotal: billGrandTotal }
}
