"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { CalculatedPersonSummary, BillItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Printer, ClipboardList, UserCircle, ShoppingBag, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SummaryDisplay() {
  const { state } = useBillContext();
  const [summaries, setSummaries] = useState<CalculatedPersonSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const { items, people, billDetails } = state;
    if (people.length === 0) {
      setSummaries([]);
      setGrandTotal(0);
      return;
    }

    const totalBillItemsValue = items.reduce((sum, item) => sum + item.price, 0);
    // If OCR subtotal is available and seems reasonable (e.g. close to sum of items), prefer it.
    // For simplicity, let's use sum of items if subtotal is 0, otherwise use provided subtotal.
    // This logic can be refined. If subtotal from OCR is significantly different from item sum, it might indicate OCR error or missed items.
    const effectiveSubtotal = billDetails.subtotal > 0 ? billDetails.subtotal : totalBillItemsValue;
    
    // If effectiveSubtotal is 0, no VAT/Service Charge can be distributed.
    const canDistribute = effectiveSubtotal > 0;

    const calculatedSummaries: CalculatedPersonSummary[] = people.map(person => {
      const personItems = items.filter(item => item.assignedTo === person.id);
      const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
      
      let vatShare = 0;
      let serviceChargeShare = 0;

      if (canDistribute) {
        const personSharePercentage = itemsSubtotal / effectiveSubtotal;
        vatShare = billDetails.vat * personSharePercentage;
        serviceChargeShare = billDetails.serviceCharge * personSharePercentage;
      }
      
      // If totalBillItemsValue is 0 but there's overall VAT/ServiceCharge (e.g. cover charge), distribute equally.
      // This is an edge case, typically VAT/SC are item-based.
      // For now, if itemsSubtotal is 0, their share of VAT/SC is 0 based on proportional logic.
      // If no items assigned but there is VAT/SC, this needs policy (e.g. equal split or manual assignment of these costs).
      // Current logic: if a person has no items, their VAT/SC share is 0.

      const totalDue = itemsSubtotal + vatShare + serviceChargeShare;

      return {
        ...person,
        items: personItems,
        itemsSubtotal,
        vatShare,
        serviceChargeShare,
        totalDue,
      };
    });

    setSummaries(calculatedSummaries);
    setGrandTotal(effectiveSubtotal + billDetails.vat + billDetails.serviceCharge);

  }, [state]);

  const handlePrint = () => {
    window.print();
  };
  
  if (state.people.length === 0 && state.items.length === 0) {
    return (
       <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Bill Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Summary will appear here once items are assigned to people.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg mt-6 print-container">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-7 w-7 text-primary" />
              Final Bill Summary
            </CardTitle>
            <CardDescription>Review each person's share of the bill.</CardDescription>
          </div>
          <Button onClick={handlePrint} variant="outline" size="icon" className="print-hide">
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print Summary</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summaries.map(summary => (
          <div key={summary.id} className="p-4 border rounded-lg bg-card/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
              <UserCircle className="h-6 w-6" /> {summary.name}
            </h3>
            <Separator className="my-2" />
            {summary.items.length > 0 && (
              <div className="mb-2">
                <h4 className="text-sm font-medium flex items-center gap-1 mb-1"><ShoppingBag className="h-4 w-4 text-muted-foreground"/>Items:</h4>
                <ul className="list-disc list-inside pl-1 text-sm space-y-0.5">
                  {summary.items.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>${item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-sm space-y-1 mt-2 pt-2 border-t border-dashed">
              <p className="flex justify-between"><span>Items Subtotal:</span> <span>${summary.itemsSubtotal.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>VAT/Tax Share:</span> <span>${summary.vatShare.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>Service Charge Share:</span> <span>${summary.serviceChargeShare.toFixed(2)}</span></p>
              <Separator className="my-1" />
              <p className="flex justify-between font-bold text-md">
                <span>Total Due:</span> 
                <span className="text-primary">${summary.totalDue.toFixed(2)}</span>
              </p>
            </div>
          </div>
        ))}
        {summaries.length === 0 && state.people.length > 0 && (
            <p className="text-muted-foreground text-center py-4">No items assigned yet, or no items on the bill.</p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="w-full text-right">
          <p className="text-xl font-bold flex items-center justify-end gap-2">
             <FileText className="h-6 w-6 text-foreground"/>
            Grand Total Bill: ${grandTotal.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Calculated as Subtotal: ${state.billDetails.subtotal.toFixed(2)} + VAT: ${state.billDetails.vat.toFixed(2)} + Service: ${state.billDetails.serviceCharge.toFixed(2)})
          </p>
        </div>
      </CardFooter>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none;
          }
        }
      `}</style>
    </Card>
  );
}
