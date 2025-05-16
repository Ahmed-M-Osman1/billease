'use server';
/**
 * @fileOverview An AI agent that suggests item assignments based on past order history.
 *
 * - suggestItemAssignment - A function that suggests item assignments.
 * - SuggestItemAssignmentInput - The input type for the suggestItemAssignment function.
 * - SuggestItemAssignmentOutput - The return type for the suggestItemAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestItemAssignmentInputSchema = z.object({
  items: z
    .array(z.string())
    .describe('The list of items on the bill.'),
  people: z
    .array(z.string())
    .describe('The list of people at the table.'),
  orderHistory: z
    .record(z.string(), z.string())
    .optional()
    .describe('Past order history of the people at the table.'),
});
export type SuggestItemAssignmentInput = z.infer<
  typeof SuggestItemAssignmentInputSchema
>;

const SuggestItemAssignmentOutputSchema = z.record(z.string(), z.string()).describe('A mapping of items to people.');
export type SuggestItemAssignmentOutput = z.infer<
  typeof SuggestItemAssignmentOutputSchema
>;

export async function suggestItemAssignment(
  input: SuggestItemAssignmentInput
): Promise<SuggestItemAssignmentOutput> {
  return suggestItemAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestItemAssignmentPrompt',
  input: {schema: SuggestItemAssignmentInputSchema},
  output: {schema: SuggestItemAssignmentOutputSchema},
  prompt: `You are an expert bill splitter. You know which person ordered
  which items on the bill.

  Suggest which person should be assigned which items on the bill based on
  the provided order history.

  Items: {{{items}}}
  People: {{{people}}}
  Order history: {{{orderHistory}}}

  Return a JSON object mapping each item to a person.
  `,
});

const suggestItemAssignmentFlow = ai.defineFlow(
  {
    name: 'suggestItemAssignmentFlow',
    inputSchema: SuggestItemAssignmentInputSchema,
    outputSchema: SuggestItemAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
