import { ProseWrightParser } from './interpreter/parser';
import { ValuesStore } from './valuesStore';
import { RuntimeEngine } from './runtime/engine';
import { tokens } from './interpreter/tokens';

const dataStore = new ValuesStore({});
const parser = new ProseWrightParser(tokens, {
  test: /test/,
});

const engine = new RuntimeEngine(parser, dataStore);
engine.parse(`
Act One

Definitions
John is a warrior, he has 5 health points and is drowning.
John has a knapsack.
John's knapsack contains 1 apple.

Scene Loop
John test something.
John's health points are decreased by 1.
Remember John is alive

if I recall John is alive, John is drowning and his health points are higher than 0, then play scene Loop from act One.
otherwise, play scene End loop from act One.

Scene End loop
John: died from drowning.
`);

while (engine.hasNext()) {
  // @ts-ignore
  const { action, values } = engine.next();

  console.log(action, values);
}
