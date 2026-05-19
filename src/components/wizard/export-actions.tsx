'use client';

import {useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Download, FileText, Share, Copy} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import type {CalculatedPersonSummary} from '@/lib/types';
import {getCurrencySymbol} from '@/lib/constants';

interface ExportActionsProps {
  summaries: CalculatedPersonSummary[];
  currency: string;
  billTitle: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
}

export function ExportActions({
  summaries,
  currency,
  billTitle,
  captureRef,
}: ExportActionsProps) {
  const {toast} = useToast();
  const sym = getCurrencySymbol(currency);

  const generatePNG = async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(captureRef.current, {scale: 2});
    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/png'),
    );
  };

  const handlePNG = async () => {
    try {
      const blob = await generatePNG();
      if (!blob) return;
      const link = document.createElement('a');
      link.download = `${billTitle || 'bill'}-summary.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast({title: 'PNG downloaded'});
    } catch {
      toast({variant: 'destructive', title: 'Export failed'});
    }
  };

  const handleCopyText = () => {
    const text = summaries
      .map((s) => `${s.name}: ${sym} ${s.totalDue.toFixed(2)}`)
      .join('\n');
    const full = `${billTitle || 'Bill'} Summary\n\n${text}`;
    navigator.clipboard.writeText(full);
    toast({title: 'Copied to clipboard'});
  };

  const handleWhatsApp = async () => {
    try {
      const blob = await generatePNG();
      if (
        blob &&
        navigator.canShare?.({
          files: [
            new File([blob], 'summary.png', {type: 'image/png'}),
          ],
        })
      ) {
        const file = new File(
          [blob],
          `${billTitle || 'bill'}-summary.png`,
          {type: 'image/png'},
        );
        await navigator.share({
          files: [file],
          title: `${billTitle || 'Bill'} Summary`,
        });
        toast({title: 'Shared'});
        return;
      }
    } catch (err: any) {
      // User cancelled or share failed — fall through to text share
      if (err?.name === 'AbortError') return;
    }
    // Fallback: share as text via WhatsApp link
    const text = summaries
      .map((s) => `• ${s.name}: ${sym} ${s.totalDue.toFixed(2)}`)
      .join('\n');
    const full = `*${billTitle || 'Bill'} Summary*\n\n${text}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(full)}`,
      '_blank',
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePNG}>
        <Download className="h-3.5 w-3.5 mr-1" />
        PNG
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopyText}>
        <Copy className="h-3.5 w-3.5 mr-1" />
        Copy
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsApp}>
        <Share className="h-3.5 w-3.5 mr-1" />
        WhatsApp
      </Button>
    </div>
  );
}
