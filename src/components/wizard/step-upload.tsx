'use client';

import {useRef, useState} from 'react';
import {useBillStore} from '@/stores/bill-store';
import {extractBillItems} from '@/ai/flows/bill-item-extraction';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {CURRENCIES} from '@/lib/constants';
import {useToast} from '@/hooks/use-toast';
import {
  Upload,
  Camera,
  Loader2,
  Trash2,
  Plus,
  FileText,
  X,
} from 'lucide-react';
import {WizardNavigation} from './wizard-navigation';

export function StepUpload() {
  const store = useBillStore();
  const {toast} = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.setBillImage(file.name, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!store.billImageDataUri) return;
    store.startOCR();
    try {
      const result = await extractBillItems({
        photoDataUri: store.billImageDataUri,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      store.ocrSuccess(result.data);
      toast({
        title: 'Items extracted',
        description: `Found ${result.data.items.length} items`,
      });
    } catch (err: any) {
      store.ocrFailure(err.message ?? 'OCR failed');
      toast({
        variant: 'destructive',
        title: 'Extraction failed',
        description: err.message,
      });
    }
  };

  const canProceed = store.items.length > 0;

  return (
    <div className="space-y-6">
      {/* Bill Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billTitle">Restaurant / Title</Label>
          <Input
            id="billTitle"
            placeholder="e.g. Pizza Hut"
            value={store.billTitle}
            onChange={(e) => store.setBillTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billDate">Date</Label>
          <Input
            id="billDate"
            type="date"
            value={store.billDate}
            onChange={(e) => store.setBillDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={store.currency}
            onValueChange={store.setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Zone */}
      {!store.billImageDataUri ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload a photo of your bill to extract items
              automatically
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Choose file
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="lg:hidden">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={store.billImageDataUri}
                  alt="Bill"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {store.billImageName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to extract
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={store.clearBillImage}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="priceMode" className="text-sm">
                  OCR price is per-unit
                </Label>
                <Switch
                  id="priceMode"
                  checked={store.ocrPriceMode === 'unit'}
                  onCheckedChange={(checked) =>
                    store.setOcrPriceMode(checked ? 'unit' : 'total')
                  }
                />
              </div>
              <Button
                onClick={handleExtract}
                disabled={store.isLoadingOCR}>
                {store.isLoadingOCR ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Extract Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Items */}
      {store.items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Items ({store.items.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => store.addItem()}>
              <Plus className="h-3 w-3 mr-1" />
              Add item
            </Button>
          </div>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {store.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      store.updateItem({
                        ...item,
                        name: e.target.value,
                      })
                    }
                    placeholder="Item name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={item.price || ''}
                    onChange={(e) =>
                      store.updateItem({
                        ...item,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Price"
                    className="w-28 text-right"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-destructive"
                    onClick={() => store.deleteItem(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Bill Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtotal</Label>
              <Input
                type="number"
                value={store.billDetails.subtotal || ''}
                onChange={(e) =>
                  store.updateBillDetails({
                    subtotal: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-right"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VAT</Label>
              <Input
                type="number"
                value={store.billDetails.vat || ''}
                onChange={(e) =>
                  store.updateBillDetails({
                    vat: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-right"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Service</Label>
              <Input
                type="number"
                value={store.billDetails.serviceCharge || ''}
                onChange={(e) =>
                  store.updateBillDetails({
                    serviceCharge: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-right"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivery</Label>
              <Input
                type="number"
                value={store.billDetails.delivery || ''}
                onChange={(e) =>
                  store.updateBillDetails({
                    delivery: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-right"
              />
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        canGoBack={false}
        canGoNext={canProceed}
        onBack={() => {}}
        onNext={() => store.nextStep()}
      />
    </div>
  );
}
