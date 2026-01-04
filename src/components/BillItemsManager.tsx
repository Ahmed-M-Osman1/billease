'use client';
import {useBillContext} from '@/contexts/BillContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {ListChecks, Trash2, PlusCircle} from 'lucide-react';
import type {BillItem} from '@/lib/types';
import type {ChangeEvent} from 'react';

export function BillItemsManager() {
  const {state, dispatch} = useBillContext();

  const handleItemChange = (
    id: string,
    field: keyof BillItem,
    value: string | number
  ) => {
    const item = state.items.find((i) => i.id === id);
    if (item) {
      const updatedItem = {
        ...item,
        [field]:
          field === 'price'
            ? parseFloat(value as string) || 0
            : value,
      };
      dispatch({type: 'UPDATE_ITEM', payload: updatedItem});
    }
  };

  const handleBillDetailChange = (
    field: keyof typeof state.billDetails,
    value: string
  ) => {
    dispatch({
      type: 'UPDATE_BILL_DETAILS',
      payload: {[field]: parseFloat(value) || 0},
    });
  };

  const addNewItem = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {name: 'New Item', price: 0},
    });
  };

  if (!state.isOcrCompleted && state.items.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Bill Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload a bill and extract items to manage them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Bill Items & Totals
        </CardTitle>
        <CardDescription>
          Review and edit extracted items, or add them manually.
          Adjust bill totals if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-md font-semibold">Items</h3>
        <ScrollArea className="h-64 pr-3">
          {state.items.length === 0 ? (
            <p className="text-muted-foreground">
              No items yet. Add items manually or extract them from a
              bill.
            </p>
          ) : (
            <ul className="space-y-3">
              {state.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 p-2 border rounded-md bg-background">
                  <Input
                    type="text"
                    aria-label="Item name"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        'name',
                        e.target.value
                      )
                    }
                    className="flex-grow"
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      aria-label="Item price"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          'price',
                          e.target.value
                        )
                      }
                      className="w-28 text-right pr-10"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      EGP
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      dispatch({
                        type: 'DELETE_ITEM',
                        payload: item.id,
                      })
                    }
                    aria-label="Delete item">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <Button
          onClick={addNewItem}
          variant="outline"
          className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
        </Button>

        <div className="space-y-3 pt-4 border-t mt-4">
          <h3 className="text-md font-semibold">Bill Totals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <div className="relative mt-1">
                <Input
                  id="subtotal"
                  type="number"
                  value={state.billDetails.subtotal}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleBillDetailChange('subtotal', e.target.value)
                  }
                  className="text-right pr-10"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  EGP
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="vat">VAT/Tax</Label>
              <div className="relative mt-1">
                <Input
                  id="vat"
                  type="number"
                  value={state.billDetails.vat}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleBillDetailChange('vat', e.target.value)
                  }
                  className="text-right pr-10"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  EGP
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="serviceCharge">Service Charge</Label>
              <div className="relative mt-1">
                <Input
                  id="serviceCharge"
                  type="number"
                  value={state.billDetails.serviceCharge}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleBillDetailChange(
                      'serviceCharge',
                      e.target.value
                    )
                  }
                  className="text-right pr-10"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  EGP
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="delivery">delivery</Label>
              <div className="relative mt-1">
                <Input
                  id="delivery"
                  type="number"
                  value={state.billDetails.delivery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleBillDetailChange('delivery', e.target.value)
                  }
                  className="text-right pr-10"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  EGP
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Total (auto-calculated from above):{' '}
          {(
            state.billDetails.subtotal +
            state.billDetails.vat +
            state.billDetails.serviceCharge +
            state.billDetails.delivery
          ).toFixed(2)}{' '}
          EGP
        </p>
      </CardFooter>
    </Card>
  );
}
