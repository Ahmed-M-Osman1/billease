"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { CalculatedPersonSummary, CustomSharedPool } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ClipboardList, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SummaryDisplay() {
  const { state } = useBillContext();
  const [summaries, setSummaries] = useState<CalculatedPersonSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  
  //Memoize the list of custom pools that have actual value assigned to them across all people
  const [activeCustomPools, setActiveCustomPools] = useState<CustomSharedPool[]>([]);


  useEffect(() => {
    const { items, people, billDetails, customSharedPools } = state;

    const billGrandTotal = billDetails.subtotal + billDetails.vat + billDetails.serviceCharge;
    setGrandTotal(billGrandTotal);

    if (people.length === 0) {
      setSummaries([]);
      setActiveCustomPools([]);
      return;
    }

    // Calculate SHARED_ALL_PEOPLE items
    const sharedAllPoolItems = items.filter(item => item.assignedTo === 'SHARED_ALL_PEOPLE');
    const currentTotalSharedAllPeopleValue = sharedAllPoolItems.reduce((sum, item) => sum + item.price, 0);
    const sharedAllPortionPerPerson = people.length > 0 ? currentTotalSharedAllPeopleValue / people.length : 0;

    // Calculate Custom Shared Pools
    const currentCustomPoolSummaries = customSharedPools.map(pool => {
      const poolItems = items.filter(item => item.assignedTo === pool.id);
      const totalValue = poolItems.reduce((sum, item) => sum + item.price, 0);
      const numMembers = pool.personIds.length;
      const perPersonValue = numMembers > 0 ? totalValue / numMembers : 0;
      return {
        id: pool.id,
        name: pool.name,
        totalValue,
        numMembers,
        perPersonValue,
        personIds: pool.personIds,
      };
    });
    
    // Determine subtotal base for tax/service charge proportions
    const ocrSubtotal = billDetails.subtotal; 
    const sumOfAllItemPrices = items.reduce((sum, item) => sum + item.price, 0);
    const subtotalBaseForProportions = ocrSubtotal > 0 && ocrSubtotal >= sumOfAllItemPrices ? ocrSubtotal : sumOfAllItemPrices;

    const calculatedSummaries: CalculatedPersonSummary[] = people.map(person => {
      const personDirectItems = items.filter(item => item.assignedTo === person.id);
      const personDirectItemsSubtotal = personDirectItems.reduce((sum, item) => sum + item.price, 0);
      
      let personTotalContributionToSubtotal = personDirectItemsSubtotal + sharedAllPortionPerPerson;
      const personCustomSharedPoolContributions: CalculatedPersonSummary['customSharedPoolContributions'] = []; 

      currentCustomPoolSummaries.forEach(poolSummary => {
        if (poolSummary.personIds.includes(person.id)) {
          personTotalContributionToSubtotal += poolSummary.perPersonValue;
          personCustomSharedPoolContributions.push({
            poolName: poolSummary.name,
            poolId: poolSummary.id, // Store poolId for mapping
            amount: poolSummary.perPersonValue,
          });
        }
      });
      
      let personVatShare = 0;
      let personServiceChargeShare = 0;

      if (subtotalBaseForProportions > 0) {
        const personProportionOfSubtotalBase = personTotalContributionToSubtotal / subtotalBaseForProportions;
        personVatShare = billDetails.vat * personProportionOfSubtotalBase;
        personServiceChargeShare = billDetails.serviceCharge * personProportionOfSubtotalBase;
      } else if (people.length > 0) { 
        personVatShare = billDetails.vat / people.length;
        personServiceChargeShare = billDetails.serviceCharge / people.length;
      }
      
      const totalDue = personTotalContributionToSubtotal + personVatShare + personServiceChargeShare;

      return {
        ...person,
        items: personDirectItems,
        itemsSubtotal: personDirectItemsSubtotal,
        vatShare: personVatShare,
        serviceChargeShare: personServiceChargeShare,
        sharedItemsPortionValue: sharedAllPortionPerPerson,
        customSharedPoolContributions: personCustomSharedPoolContributions,
        totalDue,
      };
    });

    setSummaries(calculatedSummaries);

    // Update active custom pools (pools that have at least one item assigned and thus a value)
    const activePools = customSharedPools.filter(pool => 
        currentCustomPoolSummaries.find(cs => cs.id === pool.id && cs.totalValue > 0)
    );
    setActiveCustomPools(activePools);

  }, [state]);

  const handleSavePrint = () => {
    window.print();
  };
  
  if (state.people.length === 0 && state.items.length === 0 && !state.isOcrCompleted) {
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

  const getPersonCustomPoolShare = (personSummary: CalculatedPersonSummary, poolId: string): number => {
    const contribution = personSummary.customSharedPoolContributions?.find(c => c.poolId === poolId);
    return contribution ? contribution.amount : 0;
  };

  return (
    <Card className="shadow-lg mt-6 summary-card-print-container">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-7 w-7 text-primary" />
              Final Bill Summary
            </CardTitle>
            <CardDescription>Review each person's share of the bill. Use the button to save as PDF or print.</CardDescription>
          </div>
          <Button onClick={handleSavePrint} variant="outline" size="icon" className="print-hide">
            <Download className="h-5 w-5" />
            <span className="sr-only">Save or Print Summary</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="summary-table-print-container">
        {summaries.length > 0 ? (
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold border-r w-[200px]">Breakdown Category</TableHead>
                {summaries.map(person => (
                  <TableHead key={person.id} className="text-center font-semibold border-r last:border-r-0">{person.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium border-r">Direct Items Subtotal</TableCell>
                {summaries.map(person => (
                  <TableCell key={person.id} className="text-right border-r last:border-r-0">{person.itemsSubtotal.toFixed(2)} EGP</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium border-r">Share from "All People" Pool</TableCell>
                {summaries.map(person => (
                  <TableCell key={person.id} className="text-right border-r last:border-r-0">{person.sharedItemsPortionValue.toFixed(2)} EGP</TableCell>
                ))}
              </TableRow>
              {/* Rows for active custom shared pools */}
              {activeCustomPools.map(pool => (
                <TableRow key={pool.id}>
                  <TableCell className="font-medium border-r">Share from "{pool.name}"</TableCell>
                  {summaries.map(personSummary => (
                    <TableCell key={personSummary.id} className="text-right border-r last:border-r-0">
                      {getPersonCustomPoolShare(personSummary, pool.id).toFixed(2)} EGP
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="bg-muted/20">
                <TableCell className="font-medium border-r">Subtotal (All Items & Shares)</TableCell>
                {summaries.map(person => (
                   <TableCell key={person.id} className="text-right font-medium border-r last:border-r-0">
                    {(
                      person.itemsSubtotal +
                      person.sharedItemsPortionValue +
                      (person.customSharedPoolContributions?.reduce((sum, c) => sum + c.amount, 0) || 0)
                    ).toFixed(2)} EGP
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium border-r">VAT/Tax Share</TableCell>
                {summaries.map(person => (
                  <TableCell key={person.id} className="text-right border-r last:border-r-0">{person.vatShare.toFixed(2)} EGP</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium border-r">Service Charge Share</TableCell>
                {summaries.map(person => (
                  <TableCell key={person.id} className="text-right border-r last:border-r-0">{person.serviceChargeShare.toFixed(2)} EGP</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-t-2 border-primary">
                <TableCell className="font-bold text-lg border-r">TOTAL DUE</TableCell>
                {summaries.map(person => (
                  <TableCell key={person.id} className="text-right font-bold text-lg text-primary border-r last:border-r-0">
                    {person.totalDue.toFixed(2)} EGP
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <>
            {state.people.length === 0 && state.items.length > 0 && (
              <p className="text-muted-foreground text-center py-4">Add people to see individual summaries.</p>
            )}
            {state.items.length === 0 && state.isOcrCompleted && (
              <p className="text-muted-foreground text-center py-4">No items found on the bill or all items have a price of 0.</p>
            )}
            {summaries.length === 0 && state.people.length > 0 && state.items.length > 0 && (
                <p className="text-muted-foreground text-center py-4">Assign items to people or shared pools to see individual summaries.</p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 summary-footer-print-container">
        <div className="w-full text-right">
          <p className="text-xl font-bold flex items-center justify-end gap-2">
             <FileText className="h-6 w-6 text-foreground"/>
            Grand Total (from Bill): {grandTotal.toFixed(2)} EGP
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Bill Subtotal: {state.billDetails.subtotal.toFixed(2)} + VAT/Tax: {state.billDetails.vat.toFixed(2)} + Service Charge: {state.billDetails.serviceCharge.toFixed(2)}) EGP
          </p>
           <p className="text-xs text-muted-foreground mt-0.5">
            (Sum of all item prices currently entered: {state.items.reduce((acc, item) => acc + item.price, 0).toFixed(2)}) EGP
          </p>
        </div>
      </CardFooter>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .summary-card-print-container,
          .summary-card-print-container *,
          .summary-table-print-container, 
          .summary-table-print-container *,
          .summary-footer-print-container,
          .summary-footer-print-container * {
            visibility: visible !important;
          }
          .summary-card-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important; /* Add some padding for print */
            border: none !important;
            box-shadow: none !important;
            background-color: #fff !important; 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important;
          }
          .summary-card-print-container .print-hide {
            display: none !important;
          }
           .summary-card-print-container .text-primary {
            color: #000 !important; /* Ensure primary text is black for printing */
          }
          .summary-card-print-container table, 
          .summary-card-print-container th, 
          .summary-card-print-container td {
            border-color: #ccc !important; /* Lighter borders for print */
            color: #000 !important; /* Ensure table text is black */
          }
           .summary-card-print-container .bg-muted\\/20 { /* Escaped slash */
            background-color: #f0f0f0 !important; /* Light gray for muted rows */
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important;
          }
          .summary-card-print-container .border-primary {
             border-color: #000 !important; /* Make sure important borders are black */
          }
          /* Ensure card header and footer are styled simply for print */
          .summary-card-print-container .card-header,
          .summary-card-print-container .card-footer {
             background-color: #fff !important;
             border-top: 1px solid #ccc !important;
             padding: 10px !important;
          }
           .summary-card-print-container .card-title,
           .summary-card-print-container .card-description,
           .summary-card-print-container .text-foreground,
           .summary-card-print-container .text-muted-foreground {
             color: #000 !important;
           }
        }
      `}</style>
    </Card>
  );
}
