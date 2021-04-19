# Prosewright
Write stories, cut-scenes, quests, or even complete games using natural language. Write a play script and turn it into
an interactive game.

Prosewright bridges the gap between writers and game developers, if a game engine implements Prosewright, then anyone
can write content or complete games without any advanced knowledge of game programming. The user defines the format they
want to use to write their content and can write without being worried about programming logic getting in the way of
their writing.

This repository contains the language definition and prototype for Prosewright, all implemented in JavaScript.

## Concepts
- **Definitions**: Definition are the characters, the locations, the descriptions, and all other descriptions of content
  to be displayed or used within the game.
- **Subject**: Subjects are the definitions currently being talked about or acted on in the text.
- **Acts**: Acts divide the content into easy-to-digest chunks of text. They are very similar to the acts of traditional
  script plays, they contain multiple scenes and can have definitions within them. Anything created within an act cannot
  be used outside that act without referencing said act, working like a namespace in traditional programming languages.
- **Scenes**: Scenes are the main building block of a piece of content in Prosewright. Scenes are played as if you were
  reading a play, but the writer has full control over the order in which scenes are played. A game may freely move from
  scene to scene, replaying previous scenes if necessary. They may contain definitions. Anything that is defined within
  a scene only exists within that scene and is deleted when the scene ends, it is "scoped".
- **Remembering**: Remembering is the act of telling the game to remember a specific thing in the content. For example,
  you may want to keep track of some score, reputation, or even health points of a character. When remembering something
  within an act, scene or definition, the user tells the game engine to keep that value in memory for referencing it
  later.
- **Asking**: Asking is a special type of action that allows the writer to receive feedback from the game itself. This
  can be through user interaction, or by checking definitions or remembered values.

You can read more on how to write Prosewright content in the [base format definition](/language.md).

## Prosewright for JavaScript developers
Prosewright can be seen as a language that partially transpiles to JavaScript. The engine reads the prose at runtime and
interprets it, transforming the text into JavaScript objects. Thanks to this, Prosewright is very close to JavaScript in terms
of how it is structured. The big difference is Prosewright does not care about how the code looks and will clean any
language sugar the user may wish to add to their text. It looks for keywords and extracts the meaning from the text.

This section assumes you are using the base format for Prosewright. The terms used by other format may differ. See the
dedicated section for writing custom format to know how to write your own scene format.

Let's look at specific concepts from Prosewright and how they compare to JavaScript.

### Statements
In Prosewright, a statement is a single line that does something. Most lines will describe things or act as dialogue,
but they may also execute specific code, or set variables and values. A statement may have a subject, that is a
definition that is to be acted on. The first statement of a file, act or scene MUST have a subject.

Statements can be chained by creating a new line, or using the keyword ",/and/but". For example:

```
Mary's purse is red, made of leather, and contains money.
```

When using those keywords, Prosewright remembers what it last acted on and will run the other keywords on the latest
subject. In this example above, the next two statements all apply to Mary's purse.

Statements can be terminated by either a new line character or with a period. Multiple statements can be added on the
same line with periods. The subject will be kept in memory across statements, so any other statement that do not
identify a subject will keep acting on the previous subject.

### Definitions
Definitions allows a user to create an object variables within the current scope, see [objects](#objects) and [scopes](#scopes).
When a general statement is interpreted by Prosewright, the runtime will attempt to find the subject of the statement
in the definitions if there is one. If no exist in any of the available scopes, then an error will be triggered, and the
program will end.

```
Definitions
Mary is a character
John is a character
The Castle is a location
```

### Dialogue and actions
Dialogue is an integral part of story based video games and Prosewright integrates dialogue seamlessly into its 
structure. Dialogue is treated as a definition "saying" something, and an action means a definition "does" something.

To trigger either a dialogue or an action, use the definition name followed by a colon. Dialogue are represented by text
in quotes, actions are represented by text without quotes.

```
Mary: Walks towards the bench
John: "This is a fine day, is it not?"
```

### Conditions
Conditions can be written within scenes. When the runtime reads a description line starting with an "if", it will do the
action followed by a "then" on the same line. Prosewright does not allow for longer ifs, a user should switch scene if
they want to execute complex actions as the result of an if.

A condition is written by **asking** a question to the engine, this can be done through a few keywords:

- "is/are/has" check if something is equal to something else. For example, "mary's purse is red" transpiles
  to `mary.purse.color === red`.
- "is not/are not/has not" check if something is not equal to something else. For example, "mary's purse is not blue" transpiles
  to `mary.purse.color !== blue`.
- "valid" can be used to check for the existence of data, it will check for `undefined` or `null` values. For example, "
  mary's purse is valid" transpiles to `mary.purse !== null`.
- "less than/more than/smaller than/bigger than/lower than/higher than" checks the value of numerical values.
  Prosewright is looser than JavaScript with types, these keywords may not behave exactly like you'd expect in
  JavaScript.
- "and" act like the `&&` character in JavaScript. There are no or in Prosewright, users should duplicate their conditions
  to emulate an or.

A user may create subconditions by using "else/otherwise". They act like an `else` in JavaScript, `else if` can be
written by adding the keyword "if" after the "else/otherwise".

Example:

```
if mary's purse is red and is made of leather, then play scene 3 from act 1
otherwise, play scene 2 from act 2
```

```js
if (mary.purse.color === 'red' && mary.purse.madeOf === 'leather') {
  act1.scene3();
} else {
  act2.scene2();
}
```

### Loops
There are no loops in Prosewright, instead, loops can be created by playing a scene recursively.

Example:

```
Act One

Definitions
John is a warrior, he has 5 health points and is not drowning.

Scene Loop
if John is drowning and his health points are higher than 0, then his health points are decreased by 1 and play scene Loop from act One.
otherwise, play scene end loop from act One.

Scene End loop
John died from drowning.
```

```js
const ActOne = {
  John: {
    warrior: true,
    healthPoints: 5,
    drowning: false,
  },

  Loop() {
    if (this.john.drowning && this.john.healthPoints > 0) {
      this.john.healthPoints -= 1;
      this.Loop();
    } else {
      this.EndLoop();
    }
  },

  EndLoop() {
    console.log("John died from drowning.");
  },
};
```

### Functions
Functions are represented by scenes. To play a scene is to execute that function.

Example:

```
Act One

Scene 1
```

```js
const ActOne = {
  1() {

  }
};
```

#### Return values and parameters
It is not possible to give a scene any parameters, you should use variables and definitions to store data across scenes.
Similarly, scenes will not return anything. A scene ends when its last statement is reached, or it is left for another
scene. In technical terms, Prosewright doesn't use a call stack and instead only keeps a two call objects for the
current act and the current scene. To change scene is to replace that call object.

```
Act One

Definitions
John is a warrior, he has 5 health points

Scene 1
if John's health points is lower than 5, then play scene 2
some statenent <- Will not be executed after scene 2 ends.
```

If a scene ever ends without calling new scenes, then the program ends. It has reached its conclusion.

### Variables
Variables are defined by remembering something within the text. Only boolean variables can be created through the act of
remembering something, you either remember it or not. Variables can be forgotten to set them to false. Similarly,
variables can be used in conditions using the "recall" keyword and by typing something that was remembered.

Remembering something has a different scope than other elements in Prosewright. By default, remembered values are
remembered globally and need to be forgotten to disappear from the story. The scope of a remembered value can be changed
using the keyword "for."

Example:

```
Act One

Scene 1

Remember that mary hid her purse.
Remember for the scene that John is drowning.
Remember the player is haunted for the act.

if I recall mary hid her purse, then ...
if recall John is drowning, then ...
```

```js
const thatMaryHidHerPurse = true;
const ActOne = {
  playerIsHaunted: true,

  1() {
    let thatJohnIsDrowning = true;
  }
};
```

Forgetting something is done with the keyword "Forget" and has the same syntax as remember. For example:

```
Act One

Scene 1

Forget that mary hid her purse.
Forget for the scene that John is drowning.
Forget the player is haunted for the act.
```

### Asking for information
A variable may be set based on information asked by the game to the player. Prosewright doesn't provide any mechanism to
ask information or actions from the player, only a special type of statement to trigger such an action. Game engines
using the Prosewright runtime should use those actions and implement these mechanics.

Asking for information is done with the keyword "Ask", followed by a quoted statement, and a list of statements as bullet
points. Each bullet point is an "answer" offered to the player. Prosewright will not process any other information it
may receive from the game engine and will instead act based on which answer was selected. The question then becomes
the subject and can be used for conditions or for assigning variables using the "answer" keyword.

```
Ask "Should Mary move away?"
- Yes
- No

if the player answer is yes, then play scene 2
else, play scene 3
```

### Actions
Any unrecognized statement will trigger an error unless registered as an action. All subject/keyword/value pair from this
documentation is an action. More actions can be added when first creating the runtime, which allows for more customization
of the actions. See the [How to use](#how-to-use) for more information on how to add actions.

```
Mare picks up the sword <- Will return an action if recognized
```

### Objects
When a user defines something, they create an object that can have properties set to various values, including more
definitions. There are various keywords that can be used to help define elements, including the keywords identified in
other sections of this document.

- "has/possesses/owns/contains" will act as the dot operator in JavaScript. It tells Prosewright the definition has
  sub-objects and that they can be accessed. This keyword can also be used to define how many things a definition has,
  which will act a little differently. See the examples.
- "'s/s'" acts as an access to something a definition has. Where "has/possesses/own" will define a sub-object, it can
  then be accessed with the possession character.
- "is" sets properties to values. Prosewright will try to interpret numbers, but any other value will be saved as
  a string. Using "deacreased by" or "increased by" will increase or decrease an integer value by the given number.
- "which/who" acts like the possession characters ("'s/s'") when using chained statements.

If a value is not specified when creating definitions, Prosewright will assume that the definition is a boolean.

Example:

```
John is a warrior, he owns a sword and a shield, his sword is a +1 sword, and he has a knapsack.
John's knapsack contains 5 rations.
John has 5 hit points.

Mary is a noble, she has a purse, which contains a pen and some lipstick. She loves to take walks, but despises meeting john.
Mary is not meeting john right now.

John's hit point is decreased by 1
```

```js
const John = {
  warrior: true,
  sword: {
    '+1Sword': true,
  },
  shield: true,
  knapsack: {
    rations: 5,
  },
  hitPoints: 4,
};

const Mary = {
  noble: true,
  purse: {
    pen: true,
    lipstick: true,
  },
  lovesToTakeWalks: true,
  despisesMeetingJohn: true,
  meetingJohn: false,
}
```

### Scopes
Scoping of variables and objects in Prosewright is similar to how scope works in JavaScript. Anything defined within the
root of a file is available globally. Scenes and definitions can be defined in acts, which limits their scope to that
act. Finally, definitions can be scoped to scene, which saves the global namespace from conflicting names. The closest
scope takes precedence, objects or variables with similar names will never conflict or replace one another.

Remembers are always scoped globally and must be explicitly set to be scoped differently.

```
Definitions
John is a fishermen

Act One

Definitions
John is a warrior
 
Scene 1

Definitions
John is a merchant <- Takes precedence within the scene
```

### Importing and exporting elements
Anything within a file is exported by default, this includes definitions and acts. As long as a file is parsed by the
engine, its values will be available. No need to manually import or export anything.

### Main method
In Prosewright, the entry point of a program is the main scene. The keyword "main" can be added before "scene" to make 
it the main scene. When the game starts, it will play this scene first. Prosewright cannot work without a main scene
defined, it will throw an error if none is defined.

## How to use
```js
import { Prosewright, ProseEngine, ValuesStore, defaultLanguage } from 'prosewright';

// Can pass predefined values, useful for saving the game
const dataStore = new ValuesStore({});

// Actions are additional keywords added to the language
const actions = {
  pickUp: /picks up/i // An action should be either a regex or a string
}

const parsedLanguage = new Prosewright(defaultLanguage, actions);
const engine = new ProseEngine(parsedLanguage, dataStore);

engine.parse(`
Act One
...
`);

// Game loop
while (engine.hasNext()) {
  const { action, values } = engine.next();

  // Do something with the action
}

// Save data
const saveFile = dataStore.save();
```
