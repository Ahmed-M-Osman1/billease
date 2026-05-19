import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  BillItem,
  BillDetails,
  CustomSharedPool,
  WizardStep,
  TipMode,
  OcrPriceMode,
  WizardPerson,
} from '@/lib/types'
import { PERSON_COLORS } from '@/lib/constants'
import type { ExtractBillItemsOutput } from '@/ai/flows/bill-item-extraction'

interface BillStoreState {
  // Wizard navigation
  currentStep: WizardStep

  // Bill metadata
  billTitle: string
  billDate: string
  currency: string

  // Image
  billImageName: string | null
  billImageDataUri: string | null

  // Items
  items: BillItem[]
  billDetails: BillDetails

  // People
  people: WizardPerson[]
  customSharedPools: CustomSharedPool[]

  // Tip
  tipAmount: number
  tipMode: TipMode
  tipPercentage: number

  // Loading states
  isLoadingOCR: boolean
  isOcrCompleted: boolean
  isLoadingSuggestion: boolean
  ocrPriceMode: OcrPriceMode
  error: string | null
}

interface BillStoreActions {
  // Wizard
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void

  // Metadata
  setBillTitle: (title: string) => void
  setBillDate: (date: string) => void
  setCurrency: (currency: string) => void

  // Image
  setBillImage: (name: string, dataUri: string) => void
  clearBillImage: () => void

  // OCR
  startOCR: () => void
  ocrSuccess: (output: ExtractBillItemsOutput) => void
  ocrFailure: (error: string) => void
  setOcrPriceMode: (mode: OcrPriceMode) => void

  // Items
  addItem: (partial?: Partial<BillItem>) => void
  updateItem: (item: BillItem) => void
  deleteItem: (itemId: string) => void
  updateBillDetails: (details: Partial<BillDetails>) => void

  // People
  addPerson: (name: string) => void
  removePerson: (personId: string) => void
  updatePersonName: (id: string, name: string) => void
  setPeople: (people: WizardPerson[]) => void

  // Pools
  addCustomPool: (name: string, personIds: string[]) => void
  updateCustomPool: (pool: CustomSharedPool) => void
  deleteCustomPool: (poolId: string) => void

  // Assignment
  assignItem: (itemId: string, targetId: string | null) => void
  assignItemToPeople: (itemId: string, personIds: string[]) => void
  resetAssignments: () => void

  // AI suggestions
  startSuggestion: () => void
  suggestionSuccess: (assignments: Record<string, string>) => void
  suggestionFailure: (error: string) => void

  // Tip
  setTipAmount: (amount: number) => void
  setTipMode: (mode: TipMode) => void
  setTipPercentage: (percentage: number) => void

  // Reset
  resetAll: () => void
}

const today = new Date().toISOString().split('T')[0]

const initialState: BillStoreState = {
  currentStep: 0,
  billTitle: '',
  billDate: today,
  currency: 'EGP',
  billImageName: null,
  billImageDataUri: null,
  items: [],
  billDetails: { subtotal: 0, vat: 0, serviceCharge: 0, delivery: 0 },
  people: [],
  customSharedPools: [],
  tipAmount: 0,
  tipMode: 'none',
  tipPercentage: 0,
  isLoadingOCR: false,
  isOcrCompleted: false,
  isLoadingSuggestion: false,
  ocrPriceMode: 'unit',
  error: null,
}

function normalizePersonIds(personIds: string[]) {
  return [...new Set(personIds)].sort()
}

function getAutoPoolName(people: WizardPerson[], personIds: string[]) {
  const labels = personIds
    .map((personId) => people.find((person) => person.id === personId)?.name?.trim())
    .filter(Boolean) as string[]

  if (labels.length === 0) return 'Shared split'
  if (labels.length <= 3) return labels.join(' + ')
  return `${labels.slice(0, 2).join(' + ')} +${labels.length - 2} more`
}

function syncAutoPools(
  pools: CustomSharedPool[],
  people: WizardPerson[]
) {
  return pools
    .map((pool) => {
      const nextPersonIds = pool.personIds.filter((personId) =>
        people.some((person) => person.id === personId)
      )

      if (nextPersonIds.length === 0) return null

      if (pool.kind === 'auto') {
        if (nextPersonIds.length < 2) return null
        return {
          ...pool,
          personIds: normalizePersonIds(nextPersonIds),
          name: getAutoPoolName(people, nextPersonIds),
        }
      }

      return {
        ...pool,
        personIds: nextPersonIds,
      }
    })
    .filter(Boolean) as CustomSharedPool[]
}

export const useBillStore = create<BillStoreState & BillStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Wizard
      setStep: (step) => set({ currentStep: Math.min(Math.max(step, 0), 2) as WizardStep }),
      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 2) as WizardStep })),
      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) as WizardStep })),

      // Metadata
      setBillTitle: (title) => set({ billTitle: title }),
      setBillDate: (date) => set({ billDate: date }),
      setCurrency: (currency) => set({ currency }),

      // Image
      setBillImage: (name, dataUri) =>
        set({
          billImageName: name,
          billImageDataUri: dataUri,
          isOcrCompleted: false,
          items: [],
          billDetails: initialState.billDetails,
          error: null,
        }),
      clearBillImage: () =>
        set({
          billImageName: null,
          billImageDataUri: null,
          isOcrCompleted: false,
          items: [],
          billDetails: initialState.billDetails,
          error: null,
        }),

      // OCR
      startOCR: () => set({ isLoadingOCR: true, error: null }),
      ocrSuccess: (output) => {
        const state = get()
        const newItems: BillItem[] = []
        output.items.forEach((itemFromOcr) => {
          const quantity = itemFromOcr.quantity ?? 1
          let unitPrice = itemFromOcr.price
          if (state.ocrPriceMode === 'total' && quantity > 1 && itemFromOcr.price > 0) {
            unitPrice = parseFloat((itemFromOcr.price / quantity).toFixed(2))
          }
          for (let i = 0; i < quantity; i++) {
            newItems.push({
              id: uuidv4(),
              name: itemFromOcr.name,
              price: unitPrice,
              assignedTo: null,
            })
          }
        })
        set({
          isLoadingOCR: false,
          isOcrCompleted: true,
          items: newItems,
          billDetails: {
            subtotal: output.subtotal ?? 0,
            vat: output.vat ?? 0,
            serviceCharge: output.serviceCharge ?? 0,
            delivery: output.delivery ?? 0,
          },
          error: null,
        })
      },
      ocrFailure: (error) => set({ isLoadingOCR: false, error }),
      setOcrPriceMode: (mode) => set({ ocrPriceMode: mode }),

      // Items
      addItem: (partial) =>
        set((s) => ({
          items: [
            ...s.items,
            { id: uuidv4(), name: '', price: 0, assignedTo: null, ...partial },
          ],
        })),
      updateItem: (item) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === item.id ? item : i)),
        })),
      deleteItem: (itemId) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== itemId),
        })),
      updateBillDetails: (details) =>
        set((s) => ({
          billDetails: { ...s.billDetails, ...details },
        })),

      // People
      addPerson: (name) =>
        set((s) => {
          const colorIndex = s.people.length % PERSON_COLORS.length
          const people = [
            ...s.people,
            { id: uuidv4(), name, color: PERSON_COLORS[colorIndex] },
          ]
          return {
            people,
            customSharedPools: syncAutoPools(s.customSharedPools, people),
          }
        }),
      removePerson: (personId) =>
        set((s) => {
          const newPeople = s.people.filter((p) => p.id !== personId)
          const updatedPools = syncAutoPools(s.customSharedPools, newPeople)
          const newPeopleIds = new Set(newPeople.map((p) => p.id))
          const poolIds = new Set(updatedPools.map((p) => p.id))
          return {
            people: newPeople,
            customSharedPools: updatedPools,
            items: s.items.map((item) => {
              if (
                item.assignedTo &&
                item.assignedTo !== 'SHARED_ALL_PEOPLE' &&
                !newPeopleIds.has(item.assignedTo) &&
                !poolIds.has(item.assignedTo)
              ) {
                return { ...item, assignedTo: null }
              }
              return item
            }),
          }
        }),
      updatePersonName: (id, name) =>
        set((s) => {
          const people = s.people.map((p) => (p.id === id ? { ...p, name } : p))
          return {
            people,
            customSharedPools: syncAutoPools(s.customSharedPools, people),
          }
        }),
      setPeople: (people) => set({ people }),

      // Pools
      addCustomPool: (name, personIds) =>
        set((s) => ({
          customSharedPools: [
            ...s.customSharedPools,
            { id: uuidv4(), name, personIds, kind: 'manual' },
          ],
        })),
      updateCustomPool: (pool) =>
        set((s) => ({
          customSharedPools: s.customSharedPools.map((p) =>
            p.id === pool.id ? pool : p
          ),
        })),
      deleteCustomPool: (poolId) =>
        set((s) => ({
          customSharedPools: s.customSharedPools.filter((p) => p.id !== poolId),
          items: s.items.map((item) =>
            item.assignedTo === poolId ? { ...item, assignedTo: null } : item
          ),
        })),

      // Assignment
      assignItem: (itemId, targetId) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === itemId ? { ...item, assignedTo: targetId } : item
          ),
        })),
      assignItemToPeople: (itemId, personIds) =>
        set((s) => {
          const normalizedIds = normalizePersonIds(personIds)

          let targetId: string | null = null
          let customSharedPools = s.customSharedPools

          if (normalizedIds.length === s.people.length && s.people.length > 1) {
            targetId = 'SHARED_ALL_PEOPLE'
          } else if (normalizedIds.length === 1) {
            targetId = normalizedIds[0]
          } else if (normalizedIds.length > 1) {
            const existingPool = s.customSharedPools.find(
              (pool) =>
                pool.kind === 'auto' &&
                normalizePersonIds(pool.personIds).join('|') === normalizedIds.join('|')
            )

            if (existingPool) {
              targetId = existingPool.id
            } else {
              const newPool = {
                id: uuidv4(),
                name: getAutoPoolName(s.people, normalizedIds),
                personIds: normalizedIds,
                kind: 'auto' as const,
              }
              customSharedPools = [...s.customSharedPools, newPool]
              targetId = newPool.id
            }
          }

          return {
            customSharedPools,
            items: s.items.map((item) =>
              item.id === itemId ? { ...item, assignedTo: targetId } : item
            ),
          }
        }),
      resetAssignments: () =>
        set((s) => ({
          items: s.items.map((item) => ({ ...item, assignedTo: null })),
        })),

      // AI suggestions
      startSuggestion: () => set({ isLoadingSuggestion: true, error: null }),
      suggestionSuccess: (assignments) =>
        set((s) => ({
          isLoadingSuggestion: false,
          items: s.items.map((item) => {
            if (item.assignedTo === null) {
              const personName = assignments[item.name]
              if (personName) {
                const person = s.people.find((p) => p.name === personName)
                if (person) return { ...item, assignedTo: person.id }
              }
            }
            return item
          }),
          error: null,
        })),
      suggestionFailure: (error) => set({ isLoadingSuggestion: false, error }),

      // Tip
      setTipAmount: (amount) => set({ tipAmount: amount }),
      setTipMode: (mode) => set({ tipMode: mode }),
      setTipPercentage: (percentage) => set({ tipPercentage: percentage }),

      // Reset
      resetAll: () => set(initialState),
    }),
    {
      name: 'billease-wizard',
      partialize: (state) => ({
        currentStep: state.currentStep,
        billTitle: state.billTitle,
        billDate: state.billDate,
        currency: state.currency,
        items: state.items,
        billDetails: state.billDetails,
        people: state.people,
        customSharedPools: state.customSharedPools,
        tipAmount: state.tipAmount,
        tipMode: state.tipMode,
        tipPercentage: state.tipPercentage,
        ocrPriceMode: state.ocrPriceMode,
      }),
    }
  )
)
