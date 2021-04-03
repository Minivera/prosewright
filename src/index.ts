import { ProseWrightParser } from './interpreter/parser';
import { tokens } from './interpreter/tokens';

const parsed = new ProseWrightParser(
  `
Act One

Definitions
John is a warrior, he has 5 health points and is not drowning.
John has a knapsack.
John knapsack's contains one apple.

Scene Loop
if John is drowning and his health points are higher than 0, then play scene Loop from act One.
otherwise, play scene end loop from act One.

Scene End loop
John: died from drowning.
`,
  tokens
).parse();

console.log(parsed);
