# Prosewright
Write stories, cut-scenes, quests, or even complete games using natural language. Write a play script and turn it into an interactive game.

Prosewright bridges the gap between writers and game developers, if a game engine implements Prosewright, then anyone can write content or complete games without any advanced knowledge of game programming. The user defines the format they want to use to write their content and can write without being worried about programming logic getting in the way of their writing.

This repository contains the language definition and prototype for Prosewright, all implemented in JavaScript. This project is intended to be presented as the final honours project for my Honours Degree in computer science at Carleton university. 

## Concepts
- **Definitions**: Definition are the characters, the locations, the descriptions, and all other descriptions of content to be displayed or used within the game.
- **Subject**: Subjects are the definitions currently being talked about in the text.
- **Acts**: Acts divide the content into easy-to-digest chunks of text. They are very similar to the acts of traditional script plays, they contain multiple scenes and can have definitions within them. Anything created within an act cannot be used outside that act without referencing said act, working like a namespace in programming languages.
- **Scenes**: Scenes are the main building block of a piece of content in Prosewright. Scenes are played as if you were reading a play, but the writer has full control over the order in which scenes are played. A game may freely move from scene to scene, replaying previous scenes if necessary. They may contain definitions. Anything that is defined within a scene only exists within that scene and is deleted when the scene ends, it is "scoped".
- **Remembering**: Remembering is the act of telling the game to remember a specific thing in the content. For example, you may want to keep track of some score, reputation, or even health points of a character. When remembering something within an act, scene or definition, the user tells the game engine to keep that value in memory for referencing it later.
- **Asking**: Asking is a special type of action that allows the writer to receive feedback from the game itself. This can be through user interaction, or by checking definitions or remembered values.

You can read more on how to write Prosewright content in the [base format definition](/language.md).

## Prosewright for JavaScript developers
Prosewright can be seen as a language that partially transpiles to JavaScript. The engine reads the prose at runtime and interprets it, transforming the text into JavaScript objects. This makes prosewright very close to JavaScript in terms of how it is structured. The big difference is Prosewright does not care about how the code looks and will clean any language sugar the user may wish to add to their text. It looks for keywords and extracts the meaning from the text.

This section assumes you are using the base format for Prosewright. The terms used by other format may differ.

Let's look at specific concepts from Prosewright and how they compare to JavaScript.

### Statements
In Prosewright, a statement is a single line that does something. Most lines will describe things or act as dialogue, but they may also execute specific code or set variables and values. A statement may have a subject, that is a definition that is to be acted on. The first statement of a file, act or scene MUST have a subject.

Statements can be chained by creating a new line, or using the keyword ",/and/but". For example:

```
Mary's purse is red, made of leather, and contains money.
```

When using those keywords, Prosewright remembers what it last acted on and will run the other keywords on the latest subject. In this example above, the next two statements all apply to Mary's purse.

Statements can be terminated by either a new line character or with a period. Multiple statements can be added on the same line with periods. The subject will be kept in memory across statements, so any other statement that do not identify a subject will keep acting on the previous subject.

### Conditions
Conditions can be written within scenes. When the engine reads a description line starting with an "if", it will do the action followed by a "then" on the same line. Prosewright does not allow for longer ifs, a user should switch scene if they want to execute complex actions as the result of an if.

A condition is written by **asking** a question to the engine, this can be done through a few keywords:
- "is/are/has" check if something is equal to something else. For example, "mary's purse is red" transpiles to `mary.purse.color === red`.
- "is not/has not" check if something is not equal to something else. For example, "mary's purse is not blue" transpiles to `mary.purse.color !== blue`.
- "valid" can be used ot check for the existence of data, it will check for `undefined` or `null` values. For example, "mary's purse is valid" transpiles to `mary.purse !== null`.
- "less than/more than/smaller than/bigger than/lower than/higher than" checks the value of numerical values. Prosewright is looser than JavaScript with types, these keywords may not behave exactly like you'd expect in JavaScript.
- "and/or" act like the `&&` and `||` character respectively. There are no parenthesis in Prosewright, so users need to make sure their condition make sense.

A user may create subconditions by using "else/otherwise". They act like an `else` in JavaScript, to write `else if`, the user needs to add the keyword if next.

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
if John is drowning and his health points are higher than 0, then decrease his health points by 1 and play scene Loop from act One.
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
Functions are represented by scenes. To play a scene is to execute that function. It is not possible to give a scene any parameters, you should use variables and definitions to store data across scenes. 

Example:

```
Act One

Scene 1
```

```js
const ActOne = {
    1() {

    }.
};
```

### Variables
Variables are defined by remembering something within the text. Only boolean variables can be created through the act of remembering something, you either remember it or not. Variables can be forgotten to set them to false. Similarly, variables can be used in conditions using the "remember" keyword or by typing something that was remembered.

Remembering something has a different scope than other elements in Prosewright. By default, remembered values are remembered globally and need to be forgotten to disappear from the story. The scope of a remembered value can be changed using the keyword "for."

Example:

```
Act One

Scene 1

Remember that mary hid her purse.
Remember for the scene that John is drowning.
Remember the player is haunted for the act.

if I remember mary hid her purse, then ...
if John is drowning, then ...
```

```js
thatMaryHidHerPurse = true;
const ActOne = {
    playerIsHaunted = true;

    1() {
        let thatJohnIsDrowning = true;
    };
};
```

### Objects
When a user defines something, they create an object that can have properties set to various values, including more definitions. There are various keywords that can be used to help define elements, including the keywords identified in other sections of this document.

- "has/possesses/owns/contains" will act as the dot operator in JavaScript. It tells Prosewright the definition has sub-objects and they can be accessed. This keyword can also be used to define how many things a definition has, which will act a little differently. See the examples.
- "'s/s'" acts as an access to something a definition has. Where "has/possesses/own" will define a sub-object, it can then be access with the possession character.
- "is/is not" sets properties to values. Prosewright will try to interpret numbers, but any other value will be saved as a string.
- "which/who" acts like the possession characters ("'s/s'") when using chained statements.

If a value is not specified when creating definitions, Prosewright will assume that the definition is a boolean.

Example:

```
John is a warrior, he owns a sword and a shield, his sword is a +1 sword, and he has a knapsack.
John's knapsack contains 5 rations.
John has 5 hit points.

Mary is a noble, she has a purse, which contains a pen and some lipstick. She loves to take walks, but despises meeting john.
Mary is not meeting john right now.
```

```js
const John = {
    warrior: true,
    sword: {
        +1Sword: true,
    },
    shield: true,
    knapsack: {
        rations: 5,
    },
    hitPoints: 5,
};

const Mary = {
    noble: true,
    purse: {
        pen: true,
        lipstick: true,
    }
    lovesToTakeWalks: true,
    despisesMeetingJohn: true,
    meetingJohn: false,
}
```

### Scopes
Scoping of variables and objects in Prosewright is similar to how scope works in JavaScript. Anything defined within the root of a file is available globally. Scenes and definitions can be defined in acts, which limits their scope to that act. Finally, definitions can be scoped to scene, which saves the global namespace from conflicting names.

Remembers are always scoped globally and must be explicitly set to be scoped differently.

### Importing and exporting elements
Anything within a file is exported by default, this includes definitions and acts. As long as a file is parsed by the engine, its values will be available. No need to manually import or export anything.

### Main method
Prosewright has a concept of the main method. The first scene of the first act is the main method by default, if using the default format for act and scene names. If not, the keyword "main" can be added before "scene" to make it the main scene. When the game starts, it will play this scene first.

## How to use

```js
import { Prosewright, ProseEngine, ValueStore, defaultLanguage } from 'prosewright':

// Can pass predefined values, useful for saving the game
const dataStore = new ValueStore({});

const parsedLanguage = new Prosewright(defaultLanguage /* Can add more language definitions here */);
const engine = new ProseEngine(parsedLanguage, dataStore);

// Game loop
while(engine.hasNext()) {
    const { action, values } = engine.next();

    // Do something with the action
}
```
