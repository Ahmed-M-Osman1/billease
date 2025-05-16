"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { CalculatedPersonSummary, BillItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Printer, ClipboardList, UserCircle, ShoppingBag, FileText, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SummaryDisplay() {
  const { state } = useBillContext();
  const [summaries, setSummaries] = useState<CalculatedPersonSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalSharedItemsValueForDisplay, setTotalSharedItemsValueForDisplay] = useState(0);

  useEffect(() => {
    const { items, people, billDetails } = state;

    const billGrandTotal = billDetails.subtotal + billDetails.vat + billDetails.serviceCharge;
    setGrandTotal(billGrandTotal);

    if (people.length === 0) {
      setSummaries([]);
      setTotalSharedItemsValueForDisplay(items.filter(item => item.assignedTo === 'SHARED').reduce((sum, item) => sum + item.price, 0));
      return;
    }

    const sharedPoolItems = items.filter(item => item.assignedTo === 'SHARED');
    const totalSharedItemsActualValue = sharedPoolItems.reduce((sum, item) => sum + item.price, 0);
    setTotalSharedItemsValueForDisplay(totalSharedItemsActualValue);

    const numPeople = people.length;
    const sharedItemsPortionPerPerson = numPeople > 0 ? totalSharedItemsActualValue / numPeople : 0;

    // This is the subtotal that VAT and Service Charge are based on (from the bill).
    const ocrSubtotal = billDetails.subtotal; 
    
    // This is the sum of all item prices (direct + shared), used for proportioning if OCR subtotal is missing.
    const sumOfAllItemPrices = items.reduce((sum, item) => sum + item.price, 0);

    // Determine the base for calculating proportions of VAT/Service Charge.
    // Prefer OCR subtotal. If not available or zero, use sum of all items.
    const subtotalBaseForProportions = ocrSubtotal > 0 ? ocrSubtotal : sumOfAllItemPrices;


    const calculatedSummaries: CalculatedPersonSummary[] = people.map(person => {
      const personDirectItems = items.filter(item => item.assignedTo === person.id);
      const personDirectItemsSubtotal = personDirectItems.reduce((sum, item) => sum + item.price, 0);
      
      // Each person's "effective" contribution to the subtotal includes their direct items and their share of shared items.
      const personEffectiveSubtotalContribution = personDirectItemsSubtotal + sharedItemsPortionPerPerson;
      
      let personVatShare = 0;
      let personServiceChargeShare = 0;

      if (subtotalBaseForProportions > 0) {
        // Proportion relative to the determined subtotal base.
        const personProportionOfSubtotalBase = personEffectiveSubtotalContribution / subtotalBaseForProportions;
        personVatShare = billDetails.vat * personProportionOfSubtotalBase;
        personServiceChargeShare = billDetails.serviceCharge * personProportionOfSubtotalBase;
      } else if (numPeople > 0) { 
        // If no subtotal base (e.g. all items are $0, or no OCR subtotal), split VAT/SC equally.
        personVatShare = billDetails.vat / numPeople;
        personServiceChargeShare = billDetails.serviceCharge / numPeople;
      }
      
      const totalDue = personDirectItemsSubtotal + sharedItemsPortionPerPerson + personVatShare + personServiceChargeShare;

      return {
        ...person,
        items: personDirectItems,
        itemsSubtotal: personDirectItemsSubtotal,
        vatShare: personVatShare,
        serviceChargeShare: personServiceChargeShare,
        sharedItemsPortionValue: sharedItemsPortionPerPerson,
        totalDue,
      };
    });

    setSummaries(calculatedSummaries);

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
        {totalSharedItemsValueForDisplay > 0 && state.people.length > 0 && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <h3 className="text-md font-semibold flex items-center gap-2 text-accent-foreground">
              <Users className="h-5 w-5" /> Shared Items Total: ${totalSharedItemsValueForDisplay.toFixed(2)}
            </h3>
            <p className="text-xs text-muted-foreground">
              (Each of the {state.people.length} person(s) will have ${(totalSharedItemsValueForDisplay / state.people.length).toFixed(2)} added to their individual totals from these shared items, plus their share of associated tax/service charge)
            </p>
          </div>
        )}

        {summaries.map(summary => (
          <div key={summary.id} className="p-4 border rounded-lg bg-card/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
              <UserCircle className="h-6 w-6" /> {summary.name}
            </h3>
            <Separator className="my-2" />
            {summary.items.length > 0 && (
              <div className="mb-2">
                <h4 className="text-sm font-medium flex items-center gap-1 mb-1"><ShoppingBag className="h-4 w-4 text-muted-foreground"/>Directly Assigned Items:</h4>
                <ul className="list-disc list-inside pl-1 text-sm space-y-0.5">
                  {summary.items.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>${item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                 <p className="flex justify-between text-sm mt-1 pt-1 border-t border-dashed"><span>Subtotal (Direct Items):</span> <span>${summary.itemsSubtotal.toFixed(2)}</span></p>
              </div>
            )}
             {summary.items.length === 0 && (
                <p className="text-sm text-muted-foreground mb-2">No items directly assigned.</p>
             )}

            <div className="text-sm space-y-1 mt-2 pt-2 border-t border-dashed">
              <p className="flex justify-between"><span>Portion of Shared Items:</span> <span>${summary.sharedItemsPortionValue.toFixed(2)}</span></p>
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
            <p className="text-muted-foreground text-center py-4">No items assigned yet, or no items on the bill for individuals.</p>
        )}
         {state.people.length === 0 && state.items.length > 0 && (
           <p className="text-muted-foreground text-center py-4">Add people to see individual summaries.</p>
         )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="w-full text-right">
          <p className="text-xl font-bold flex items-center justify-end gap-2">
             <FileText className="h-6 w-6 text-foreground"/>
            Grand Total Bill: ${grandTotal.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Subtotal: ${state.billDetails.subtotal.toFixed(2)} + VAT/Tax: ${state.billDetails.vat.toFixed(2)} + Service Charge: ${state.billDetails.serviceCharge.toFixed(2)})
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
