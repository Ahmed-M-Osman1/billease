'use server';

/**
 * @fileOverview Extracts line items and prices from an uploaded bill image using OCR.
 *
 * - extractBillItems - A function that handles the bill item extraction process.
 * - ExtractBillItemsInput - The input type for the extractBillItems function.
 * - ExtractBillItemsOutput - The return type for the extractBillItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBillItemsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a restaurant bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBillItemsInput = z.infer<
  typeof ExtractBillItemsInputSchema
>;

const ExtractBillItemsOutputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe('The name of the item.'),
        price: z
          .number()
          .describe(
            'The unit price of the item. If a quantity is specified, this should be the price for a single item.'
          ),
        quantity: z
          .number()
          .optional()
          .describe(
            'The quantity of this item. Defaults to 1 if not specified.'
          ),
      })
    )
    .describe(
      'The extracted line items, their unit prices, and quantities from the bill.'
    ),
  subtotal: z
    .number()
    .optional()
    .describe('The subtotal amount from the bill, if available.'),
  vat: z
    .number()
    .optional()
    .describe('The VAT amount from the bill, if available.'),
  serviceCharge: z
    .number()
    .optional()
    .describe(
      'The service charge amount from the bill, if available.'
    ),
  delivery: z
    .number()
    .optional()
    .describe('The delivery amount from the bill, if available.'),
});

export type ExtractBillItemsOutput = z.infer<
  typeof ExtractBillItemsOutputSchema
>;

export async function extractBillItems(
  input: ExtractBillItemsInput
): Promise<ExtractBillItemsOutput> {
  return extractBillItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBillItemsPrompt',
  model: 'googleai/gemini-2.5-flash-lite',
  input: {schema: ExtractBillItemsInputSchema},
  output: {schema: ExtractBillItemsOutputSchema},
  prompt: `You are an expert OCR reader and data extractor for restaurant bills.

You will receive a photo of a bill and you will extract all line items, their names, their *unit prices*, and quantities.
If an item has a quantity (e.g., "2x Fries" or "Fries ..... 2 ..... $price_each"), please return the item name as "Fries", its quantity as 2, and the price for a *single unit* of Fries.
If quantity is not specified or is 1, return quantity as 1. Ensure the price is for a single item, not the total for multiple quantities of the same line item.

Also extract subtotal, VAT, delivery and service charge from the image, if present.

Return the data in JSON format. If a value is not present in the image, omit it from the JSON.

Bill Image: {{media url=photoDataUri}}
`,
});

const extractBillItemsFlow = ai.defineFlow(
  {
    name: 'extractBillItemsFlow',
    inputSchema: ExtractBillItemsInputSchema,
    outputSchema: ExtractBillItemsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
