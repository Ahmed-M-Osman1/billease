"use client";
import type { BillDetails, BillItem, Person } from '@/lib/types';
import React, { createContext, useReducer, useContext, type ReactNode, type Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractBillItemsOutput } from '@/ai/flows/bill-item-extraction';

interface BillState {
  billImageName: string | null;
  billImageDataUri: string | null;
  items: BillItem[];
  people: Person[];
  billDetails: BillDetails;
  isLoadingOCR: boolean;
  isOcrCompleted: boolean;
  isLoadingSuggestion: boolean;
  error: string | null;
}

const initialState: BillState = {
  billImageName: null,
  billImageDataUri: null,
  items: [],
  people: [],
  billDetails: {
    subtotal: 0,
    vat: 0,
    serviceCharge: 0,
  },
  isLoadingOCR: false,
  isOcrCompleted: false,
  isLoadingSuggestion: false,
  error: null,
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
  | { type: 'ASSIGN_ITEM'; payload: { itemId: string; personId: string | null } }
  | { type: 'RESET_ASSIGNMENTS' }
  | { type: 'START_SUGGESTION' }
  | { type: 'SUGGESTION_SUCCESS'; payload: { assignments: Record<string, string> } } // { itemName: personName }
  | { type: 'SUGGESTION_FAILURE'; payload: string }
  | { type: 'RESET_ALL_DATA' };


function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) {
    case 'SET_BILL_IMAGE':
      return { ...state, billImageName: action.payload.name, billImageDataUri: action.payload.dataUri, isOcrCompleted: false, items: [], billDetails: initialState.billDetails, error: null };
    case 'CLEAR_BILL_IMAGE':
      return { ...state, billImageName: null, billImageDataUri: null, isOcrCompleted: false, items: [], billDetails: initialState.billDetails, error: null };
    case 'START_OCR':
      return { ...state, isLoadingOCR: true, error: null };
    case 'OCR_SUCCESS': {
      const newItems = action.payload.items.map(item => ({
        id: uuidv4(),
        name: item.name,
        price: item.price,
        assignedTo: null,
      }));
      return {
        ...state,
        isLoadingOCR: false,
        isOcrCompleted: true,
        items: newItems,
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
      // Unassign items from people who are removed
      const newPeopleIds = new Set(newPeople.map(p => p.id));
      const updatedItems = state.items.map(item => 
        item.assignedTo && !newPeopleIds.has(item.assignedTo) 
        ? { ...item, assignedTo: null } 
        : item
      );
      return { ...state, people: newPeople, items: updatedItems };
    }
    case 'UPDATE_PERSON_NAME':
      return {
        ...state,
        people: state.people.map(person => person.id === action.payload.id ? { ...person, name: action.payload.name } : person),
      };
    case 'ASSIGN_ITEM':
      return {
        ...state,
        items: state.items.map(item => item.id === action.payload.itemId ? { ...item, assignedTo: action.payload.personId } : item),
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
        const personName = assignments[item.name];
        if (personName) {
          const person = state.people.find(p => p.name === personName);
          if (person) {
            return { ...item, assignedTo: person.id };
          }
        }
        return item;
      });
      return { ...state, isLoadingSuggestion: false, items: updatedItems, error: null };
    }
    case 'SUGGESTION_FAILURE':
      return { ...state, isLoadingSuggestion: false, error: action.payload };
    case 'RESET_ALL_DATA':
      return initialState;
    default:
      return state;
  }
}

const BillContext = createContext<{ state: BillState; dispatch: Dispatch<BillAction> } | undefined>(undefined);

export const BillProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(billReducer, initialState);
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
