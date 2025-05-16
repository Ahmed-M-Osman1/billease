
"use client";
import { useState, type ChangeEvent } from 'react';
import { useBillContext } from '@/contexts/BillContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { extractBillItems } from '@/ai/flows/bill-item-extraction';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileText, XCircle, Loader2 } from 'lucide-react';

export function BillUploadForm() {
  const { state, dispatch } = useBillContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        dispatch({ type: 'SET_BILL_IMAGE', payload: { name: file.name, dataUri: reader.result as string } });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      dispatch({ type: 'CLEAR_BILL_IMAGE' });
    }
  };

  const handleExtractItems = async () => {
    if (!state.billImageDataUri) {
      toast({ title: "No image selected", description: "Please upload a bill image first.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'START_OCR' });
    try {
      const result = await extractBillItems({ photoDataUri: state.billImageDataUri });
      dispatch({ type: 'OCR_SUCCESS', payload: result });
      toast({ title: "OCR Successful", description: "Items extracted from the bill." });
    } catch (error) {
      console.error("OCR Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during OCR";
      dispatch({ type: 'OCR_FAILURE', payload: `Failed to extract items: ${errorMessage}` });
      toast({ title: "OCR Failed", description: `Could not extract items. ${errorMessage}`, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-primary" />
          Upload Bill
        </CardTitle>
        <CardDescription>Upload a photo of your restaurant bill to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bill-image" className="sr-only">Bill Image</Label>
          <Input
            id="bill-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file:text-sm file:font-medium file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:px-3 file:py-1.5 file:border-0"
            aria-describedby="file-upload-status"
          />
        </div>
        {state.billImageName && (
          <div id="file-upload-status" className="text-sm text-muted-foreground flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-foreground" />
              <span>{state.billImageName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); dispatch({ type: 'CLEAR_BILL_IMAGE' }); const input = document.getElementById('bill-image') as HTMLInputElement; if(input) input.value = ''; }} aria-label="Remove file">
              <XCircle className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-3 my-3 p-2 border rounded-md bg-muted/30">
          <Switch
            id="ocr-price-mode"
            checked={state.ocrPriceMode === 'unit'}
            onCheckedChange={(checked) => {
              dispatch({ type: 'SET_OCR_PRICE_MODE', payload: checked ? 'unit' : 'total' });
            }}
            aria-label="OCR Price Interpretation Mode Toggle"
          />
          <Label htmlFor="ocr-price-mode" className="text-sm text-foreground/90 leading-tight">
            {state.ocrPriceMode === 'unit'
              ? "Price is for one item (e.g., 2 Fries @ $5 ea.)"
              : "Price is total for quantity (e.g., 2 Fries for $10 total)"}
          </Label>
        </div>
        
        <Button onClick={handleExtractItems} disabled={!state.billImageDataUri || state.isLoadingOCR} className="w-full">
          {state.isLoadingOCR ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Extract Items
        </Button>
        {state.error && state.error.includes("OCR") && <p className="text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
