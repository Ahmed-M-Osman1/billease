
"use client";
import type { BillDetails, BillItem, Person, CustomSharedPool } from '@/lib/types';
import React, { createContext, useReducer, useContext, type ReactNode, type Dispatch, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractBillItemsOutput } from '@/ai/flows/bill-item-extraction';

interface BillState {
  billImageName: string | null;
  billImageDataUri: string | null;
  items: BillItem[];
  people: Person[];
  customSharedPools: CustomSharedPool[];
  billDetails: BillDetails;
  isLoadingOCR: boolean;
  isOcrCompleted: boolean;
  isLoadingSuggestion: boolean;
  error: string | null;
  ocrPriceMode: 'unit' | 'total';
}

const initialState: BillState = {
  billImageName: null,
  billImageDataUri: null,
  items: [],
  people: [],
  customSharedPools: [],
  billDetails: {
    subtotal: 0,
    vat: 0,
    serviceCharge: 0,
  },
  isLoadingOCR: false,
  isOcrCompleted: false,
  isLoadingSuggestion: false,
  error: null,
  ocrPriceMode: 'unit',
};

type BillAction =
  | { type: 'SET_BILL_IMAGE'; payload: { name: string; dataUri: string } }
  | { type: 'CLEAR_BILL_IMAGE' }
  | { type: 'START_OCR' }
  | { type: 'OCR_SUCCESS'; payload: ExtractBillItemsOutput }
  | { type: 'OCR_FAILURE'; payload: string }
  | { type: 'ADD_ITEM'; payload: Partial<BillItem> }
  | { type: 'UPDATE_ITEM'; payload: BillItem }
  | { type: 'DELETE_ITEM'; payload: string } // itemId
  | { type: 'UPDATE_BILL_DETAILS'; payload: Partial<BillDetails> }
  | { type: 'SET_PEOPLE_COUNT'; payload: number }
  | { type: 'UPDATE_PERSON_NAME'; payload: { id: string; name: string } }
  | { type: 'ASSIGN_ITEM'; payload: { itemId: string; targetId: string | null } } // targetId can be personId, customPoolId, 'SHARED_ALL_PEOPLE' or null
  | { type: 'RESET_ASSIGNMENTS' }
  | { type: 'START_SUGGESTION' }
  | { type: 'SUGGESTION_SUCCESS'; payload: { assignments: Record<string, string> } } // { itemName: personName }
  | { type: 'SUGGESTION_FAILURE'; payload: string }
  | { type: 'RESET_ALL_DATA' }
  | { type: 'LOAD_PEOPLE'; payload: Person[] }
  | { type: 'SET_OCR_PRICE_MODE'; payload: 'unit' | 'total' }
  | { type: 'ADD_CUSTOM_SHARED_POOL'; payload: { name: string; personIds: string[] } }
  | { type: 'UPDATE_CUSTOM_SHARED_POOL'; payload: CustomSharedPool }
  | { type: 'DELETE_CUSTOM_SHARED_POOL'; payload: string } // poolId
  | { type: 'LOAD_CUSTOM_SHARED_POOLS'; payload: CustomSharedPool[] };


function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) {
    case 'SET_BILL_IMAGE':
      return { ...state, billImageName: action.payload.name, billImageDataUri: action.payload.dataUri, isOcrCompleted: false, items: [], billDetails: initialState.billDetails, error: null };
    case 'CLEAR_BILL_IMAGE':
      return { ...state, billImageName: null, billImageDataUri: null, isOcrCompleted: false, items: [], billDetails: initialState.billDetails, error: null };
    case 'START_OCR':
      return { ...state, isLoadingOCR: true, error: null };
    case 'OCR_SUCCESS': {
      const newItemsFromPayload: BillItem[] = [];
      action.payload.items.forEach(itemFromOcr => {
        const quantity = itemFromOcr.quantity ?? 1;
        let unitPrice = itemFromOcr.price;

        if (state.ocrPriceMode === 'total' && quantity > 1 && itemFromOcr.price > 0) {
          unitPrice = parseFloat((itemFromOcr.price / quantity).toFixed(2));
        }

        for (let i = 0; i < quantity; i++) {
          newItemsFromPayload.push({
            id: uuidv4(),
            name: itemFromOcr.name,
            price: unitPrice,
            assignedTo: null,
          });
        }
      });
      return {
        ...state,
        isLoadingOCR: false,
        isOcrCompleted: true,
        items: newItemsFromPayload,
        billDetails: {
          subtotal: action.payload.subtotal ?? 0,
          vat: action.payload.vat ?? 0,
          serviceCharge: action.payload.serviceCharge ?? 0,
        },
        error: null,
      };
    }
    case 'OCR_FAILURE':
      return { ...state, isLoadingOCR: false, error: action.payload };
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, { id: uuidv4(), name: '', price: 0, assignedTo: null, ...action.payload }],
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item => item.id === action.payload.id ? action.payload : item),
      };
    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'UPDATE_BILL_DETAILS':
      return {
        ...state,
        billDetails: { ...state.billDetails, ...action.payload },
      };
    case 'SET_PEOPLE_COUNT': {
      const count = action.payload;
      const currentPeople = state.people;
      const newPeople: Person[] = [];
      for (let i = 0; i < count; i++) {
        if (i < currentPeople.length) {
          newPeople.push(currentPeople[i]);
        } else {
          newPeople.push({ id: uuidv4(), name: `Person ${i + 1}` });
        }
      }
      const newPeopleIds = new Set(newPeople.map(p => p.id));
      
      // Update items assigned to removed people
      let updatedItems = state.items.map(item => {
        if (item.assignedTo && item.assignedTo !== 'SHARED_ALL_PEOPLE' && !state.customSharedPools.find(p => p.id === item.assignedTo) && !newPeopleIds.has(item.assignedTo)) {
          return { ...item, assignedTo: null };
        }
        return item;
      });

      // Update custom shared pools
      let updatedCustomSharedPools = state.customSharedPools.map(pool => ({
        ...pool,
        personIds: pool.personIds.filter(pid => newPeopleIds.has(pid)),
      })).filter(pool => pool.personIds.length > 0); // Remove pools with no people

      // Unassign items from deleted custom shared pools
      const remainingCustomPoolIds = new Set(updatedCustomSharedPools.map(p => p.id));
      updatedItems = updatedItems.map(item => {
        if (item.assignedTo && item.assignedTo !== 'SHARED_ALL_PEOPLE' && !newPeopleIds.has(item.assignedTo) && !remainingCustomPoolIds.has(item.assignedTo)) {
           return { ...item, assignedTo: null };
        }
        return item;
      });

      return { ...state, people: newPeople, items: updatedItems, customSharedPools: updatedCustomSharedPools };
    }
    case 'UPDATE_PERSON_NAME':
      return {
        ...state,
        people: state.people.map(person => person.id === action.payload.id ? { ...person, name: action.payload.name } : person),
      };
    case 'ASSIGN_ITEM':
      return {
        ...state,
        items: state.items.map(item => item.id === action.payload.itemId ? { ...item, assignedTo: action.payload.targetId } : item),
      };
    case 'RESET_ASSIGNMENTS':
      return {
        ...state,
        items: state.items.map(item => ({ ...item, assignedTo: null })),
      };
    case 'START_SUGGESTION':
      return { ...state, isLoadingSuggestion: true, error: null };
    case 'SUGGESTION_SUCCESS': {
      const { assignments } = action.payload;
      const updatedItems = state.items.map(item => {
        if (item.assignedTo === null) {
          const personName = assignments[item.name];
          if (personName) {
            const person = state.people.find(p => p.name === personName);
            if (person) {
              return { ...item, assignedTo: person.id };
            }
          }
        }
        return item;
      });
      return { ...state, isLoadingSuggestion: false, items: updatedItems, error: null };
    }
    case 'SUGGESTION_FAILURE':
      return { ...state, isLoadingSuggestion: false, error: action.payload };
    case 'LOAD_PEOPLE':
      return { ...state, people: action.payload };
    case 'RESET_ALL_DATA':
      localStorage.removeItem('billEasePeople');
      localStorage.removeItem('billEaseCustomSharedPools');
      return initialState;
    case 'SET_OCR_PRICE_MODE':
      return { ...state, ocrPriceMode: action.payload };
    
    case 'ADD_CUSTOM_SHARED_POOL': {
      const newPool: CustomSharedPool = {
        id: uuidv4(),
        name: action.payload.name,
        personIds: action.payload.personIds,
      };
      const updatedPools = [...state.customSharedPools, newPool];
      localStorage.setItem('billEaseCustomSharedPools', JSON.stringify(updatedPools));
      return { ...state, customSharedPools: updatedPools };
    }
    case 'UPDATE_CUSTOM_SHARED_POOL': {
      const updatedPools = state.customSharedPools.map(pool => pool.id === action.payload.id ? action.payload : pool);
      localStorage.setItem('billEaseCustomSharedPools', JSON.stringify(updatedPools));
      return { ...state, customSharedPools: updatedPools };
    }
    case 'DELETE_CUSTOM_SHARED_POOL': {
      const poolIdToDelete = action.payload;
      const updatedPools = state.customSharedPools.filter(pool => pool.id !== poolIdToDelete);
      localStorage.setItem('billEaseCustomSharedPools', JSON.stringify(updatedPools));
      // Unassign items from the deleted pool
      const updatedItems = state.items.map(item => 
        item.assignedTo === poolIdToDelete ? { ...item, assignedTo: null } : item
      );
      return { ...state, customSharedPools: updatedPools, items: updatedItems };
    }
    case 'LOAD_CUSTOM_SHARED_POOLS':
      return { ...state, customSharedPools: action.payload };
    default:
      return state;
  }
}

const BillContext = createContext<{ state: BillState; dispatch: Dispatch<BillAction> } | undefined>(undefined);

export const BillProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(billReducer, initialState);

  useEffect(() => {
    const storedPeopleRaw = localStorage.getItem('billEasePeople');
    if (storedPeopleRaw) {
      try {
        const storedPeople = JSON.parse(storedPeopleRaw) as Person[];
        if (Array.isArray(storedPeople) && storedPeople.every(p => typeof p.id === 'string' && typeof p.name === 'string')) {
          dispatch({ type: 'LOAD_PEOPLE', payload: storedPeople });
        } else {
          localStorage.removeItem('billEasePeople');
        }
      } catch (error) {
        localStorage.removeItem('billEasePeople');
      }
    }

    const storedCustomPoolsRaw = localStorage.getItem('billEaseCustomSharedPools');
    if (storedCustomPoolsRaw) {
      try {
        const storedCustomPools = JSON.parse(storedCustomPoolsRaw) as CustomSharedPool[];
        if (Array.isArray(storedCustomPools) && storedCustomPools.every(p => typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.personIds))) {
          dispatch({ type: 'LOAD_CUSTOM_SHARED_POOLS', payload: storedCustomPools });
        } else {
          localStorage.removeItem('billEaseCustomSharedPools');
        }
      } catch (error) {
        localStorage.removeItem('billEaseCustomSharedPools');
      }
    }
  }, []);

  return (
    <BillContext.Provider value={{ state, dispatch }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBillContext = () => {
  const context = useContext(BillContext);
  if (context === undefined) {
    throw new Error('useBillContext must be used within a BillProvider');
  }
  return context;
};
