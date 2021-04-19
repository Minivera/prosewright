import English from 'parse-english';

import * as Unist from '../../types/unist';
import * as Nlcst from '../../types/nlcst';
import { wordNodeToText } from './helpers';

import { tokens, tokens as BaseTokens } from './tokens';
import {
  Act,
  ActiveStatements,
  Ask,
  Condition,
  ConditionOperators,
  ConditionSuboperators,
  CustomAction,
  Definition,
  Else,
  Forget,
  If,
  IntegerOperators,
  Play,
  Program,
  Remember,
  Scene,
  StatementTypes,
  Subject,
} from '../types';
import { ParsingError } from './errors';

// noinspection UnnecessaryContinueJS
export class ProseWrightParser {
  private readonly internalTokens: typeof BaseTokens;
  private readonly additionalTokens: Record<string, string | RegExp>;
  private readonly internalParser: English;

  constructor(tokens: typeof BaseTokens, additionalTokens: Record<string, string | RegExp> = {}) {
    this.internalTokens = tokens;
    this.additionalTokens = additionalTokens;
    this.internalParser = new English();
  }

  public parse(text: string): Program {
    const program: Program = {
      children: [],
    };
    const generatedTokens = this.internalParser.tokenize(text).reverse();

    while (generatedTokens.length) {
      const currentToken = generatedTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        // When running into white spaces, keep going until we hit the first statement
        continue;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.act)) {
          program.children.push(this.parseAct(currentToken, generatedTokens));
        } else if (text.match(this.internalTokens.definitions)) {
          program.children.push(this.parseDefinitions(currentToken, generatedTokens, {}));
        } else {
          throw new ParsingError('Program root expects to start with an act or definition', currentToken.position);
        }
      } else {
        throw new ParsingError(
          `Program root expects to start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return program;
  }

  private parseAct(currentToken: Unist.Node, allTokens: Unist.Node[]): Act {
    const act: Act = {
      type: StatementTypes.Act,
      children: [],
      name: '',
      position: currentToken.position,
    };

    // Start by processing the act's name
    let startedName = false;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // End the current loop when we reach the end of a statement
          break;
        }
        // When running into white spaces before we started processing the name
        if (!startedName) {
          continue;
        }
        // Otherwise, add it to the name
        act.name += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // End the current loop when we reach the end of a statement
          break;
        }
        // Otherwise, add it to the name
        act.name += (currentToken as Nlcst.WhiteSpace).value;
        startedName = true;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        act.name += text;
        startedName = true;
      } else {
        throw new ParsingError(
          `An act's name should be made up of words, white spaces, and punctuations. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    // Then process the other statements
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        // Ignore initial white spaces for this type of statement
        continue;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.act)) {
          // If hitting a new act, then this act is completed. Process and return.
          this.parseAct(currentToken, allTokens);
          return act;
        } else if (text.match(this.internalTokens.scene)) {
          act.children.push(...this.parseScene(act, currentToken, allTokens));
        } else if (text.match(this.internalTokens.definitions)) {
          act.children.push(this.parseActDefinitions(act, currentToken, allTokens));
        } else {
          throw new ParsingError('Program root expects to start with an act or definition', currentToken.position);
        }
      } else {
        throw new ParsingError(
          `A root statement for an act should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return act;
  }

  private parseScene(act: Act, currentToken: Unist.Node, allTokens: Unist.Node[]): Scene[] {
    const scene: Scene = {
      type: StatementTypes.Scene,
      children: [],
      name: '',
      position: currentToken.position,
    };

    // Start by processing the scene's name
    let startedName = false;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // End the current loop when we reach the end of a statement
          break;
        }
        // When running into white spaces before we started processing the name
        if (!startedName) {
          continue;
        }
        // Otherwise, add it to the name
        scene.name += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // End the current loop when we reach the end of a statement
          break;
        }
        // Otherwise, add it to the name
        scene.name += (currentToken as Nlcst.WhiteSpace).value;
        startedName = true;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        scene.name += text;
        startedName = true;
      } else {
        throw new ParsingError(
          `A scene's name should be made up of words, white spaces, and punctuations. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    // Then process the other statements
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        // Ignore initial white spaces for this type of statement
        continue;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.act)) {
          // If hitting a new act, then this scene is completed. Process and return.
          this.parseAct(currentToken, allTokens);
          break;
        } else if (text.match(this.internalTokens.scene)) {
          // If hitting a new scene, then this scene is completed. Process and return.
          return [scene, ...this.parseScene(act, currentToken, allTokens)];
        } else if (text.match(this.internalTokens.definitions)) {
          scene.children.push(this.parseSceneDefinitions(act, scene, currentToken, allTokens));
        } else if (this.isActiveStatement(text)) {
          scene.children.push(...this.parseStatement(currentToken, allTokens, act, true));
        } else {
          throw new ParsingError(
            'Scene expects to contain valid statements, or an act, scene or definition.',
            currentToken.position
          );
        }
      } else {
        throw new ParsingError(
          `A root statement for a scene should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return [scene];
  }

  private parseDefinitions(
    currentToken: Unist.Node,
    allTokens: Unist.Node[],
    options: { act?: Act; scene?: Scene }
  ): Definition {
    const definition: Definition = {
      type: StatementTypes.Definitions,
      children: [],
      position: currentToken.position,
    };

    // Process all children until we hit something invalid
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        // Ignore initial white spaces for this type of statement
        continue;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.act)) {
          // If hitting a act, then this definition is completed. Process and return.
          allTokens.push(currentToken);
          return definition;
        } else if (text.match(this.internalTokens.scene)) {
          // If hitting a scene, then this definition is completed. Process and return.
          if (options.act) {
            allTokens.push(currentToken);
            return definition;
          } else {
            throw new ParsingError(
              'Scenes should be added to acts and never at the root of a program.',
              currentToken.position
            );
          }
        } else if (text.match(this.internalTokens.definitions)) {
          throw new ParsingError(
            'Already parsing a definitions, cannot add a second definitions section.',
            currentToken.position
          );
        } else if (this.isObjectStatement(text)) {
          definition.children.push(...this.parseObjectStatement(currentToken, allTokens));
        } else {
          throw new ParsingError(
            'A definition should only contain object statements, acts, or scenes.',
            currentToken.position
          );
        }
      } else {
        throw new ParsingError(
          `A root statement for a definition should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return definition;
  }

  private parseActDefinitions(act: Act, currentToken: Unist.Node, allTokens: Unist.Node[]): Definition {
    return this.parseDefinitions(currentToken, allTokens, { act });
  }

  private parseSceneDefinitions(act: Act, scene: Scene, currentToken: Unist.Node, allTokens: Unist.Node[]): Definition {
    return this.parseDefinitions(currentToken, allTokens, { scene, act });
  }

  private parseStatement(
    currentToken: Unist.Node,
    allTokens: Unist.Node[],
    act?: Act,
    processSceneOrAct?: boolean
  ): ActiveStatements[] {
    const currentStatements: ActiveStatements[] = [];

    allTokens.push(currentToken);
    // Process all children until we hit something invalid
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.act) && processSceneOrAct) {
          allTokens.push(currentToken);
          return currentStatements;
        } else if (text.match(this.internalTokens.scene) && processSceneOrAct) {
          if (!act) {
            throw new ParsingError(
              `Tried to process a scene statement with no reference to an act`,
              currentToken.position
            );
          }
          allTokens.push(currentToken);
          return currentStatements;
        } else if (text.match(this.internalTokens.play)) {
          currentStatements.push(this.parsePlay(currentToken, allTokens));
        } else if (text.match(this.internalTokens.remember)) {
          currentStatements.push(...this.parseRemember(currentToken, allTokens));
        } else if (text.match(this.internalTokens.forget)) {
          currentStatements.push(...this.parseForget(currentToken, allTokens));
        } else if (text.match(this.internalTokens.ask)) {
          currentStatements.push(this.parseAsk(currentToken, allTokens));
        } else if (text.match(this.internalTokens.if)) {
          currentStatements.push(this.parseIf(currentToken, allTokens));
        } else if (this.isObjectStatement(text)) {
          currentStatements.push(...this.parseObjectStatement(currentToken, allTokens));
        } else {
          throw new ParsingError(
            `Invalid or unprocessable statement parsed. ${text} could not be parsed`,
            currentToken.position
          );
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    if (!currentStatements.length) {
      throw new ParsingError('Could not parse statement, no statement detected.', currentToken.position);
    }

    return currentStatements;
  }

  private parsePlay(currentToken: Unist.Node, allTokens: Unist.Node[]): Play {
    const play: Play = {
      type: StatementTypes.Play,
      scene: '',
      position: currentToken.position,
    };

    // Process all children until we hit something invalid
    let isParsingAct = false;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }

        if (isParsingAct) {
          play.act = play.act
            ? play.act + (currentToken as Nlcst.WhiteSpace).value
            : (currentToken as Nlcst.WhiteSpace).value;
        } else {
          play.scene += (currentToken as Nlcst.WhiteSpace).value;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.scene)) {
          // Skip any mention of the word scene.
          continue;
        } else if (text.match(this.internalTokens.act)) {
          // Skip any mention of the word scene.
          continue;
        } else if (text.match(this.internalTokens.from)) {
          isParsingAct = true;
        } else {
          if (isParsingAct) {
            play.act = play.act ? play.act + text : text;
          } else {
            play.scene += text;
          }
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    play.act = play.act?.trim();
    play.scene = play.scene.trim();

    return play;
  }

  private parseRemember(currentToken: Unist.Node, allTokens: Unist.Node[]): Remember[] {
    const remembers: Remember[] = [
      {
        type: StatementTypes.Remember,
        value: '',
        position: currentToken.position,
      },
    ];

    // Process all children until we hit something invalid
    let currentRemember = 0;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }

        remembers[currentRemember].value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.comma)) {
          // When hitting a comma, create a new remember.
          remembers.push({
            type: StatementTypes.Remember,
            value: '',
            position: currentToken.position,
          });
          currentRemember += 1;
          continue;
        }

        remembers[currentRemember].value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.and)) {
          // When hitting and, check if the previous remember has any value
          if (remembers[currentRemember].value === '') {
            // If it does not, then don't change remember.
            continue;
          } else {
            remembers.push({
              type: StatementTypes.Remember,
              value: '',
              position: currentToken.position,
            });
            currentRemember += 1;
          }
        } else {
          remembers[currentRemember].value += text;
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    // Process the scopes for the remembers
    remembers.forEach(remember => {
      // Try processing an act scope
      const scopeActParts = remember.value.split(this.internalTokens.scopeAct);
      if (scopeActParts.length > 1) {
        remember.value = scopeActParts[0];
        remember.actScope = scopeActParts[1];
      }

      // Try processing an scene scope
      const scopeSceneParts = remember.value.split(this.internalTokens.scopeScene);
      if (scopeSceneParts.length > 1) {
        remember.value = scopeSceneParts[0];
        remember.sceneScope = scopeSceneParts[1];
      }

      remember.value = remember.value.trim();
      remember.sceneScope = remember.sceneScope?.trim();
      remember.actScope = remember.actScope?.trim();
    });

    return remembers;
  }

  private parseForget(currentToken: Unist.Node, allTokens: Unist.Node[]): Forget[] {
    const forgets: Forget[] = [
      {
        type: StatementTypes.Forget,
        value: '',
        position: currentToken.position,
      },
    ];

    // Process all children until we hit something invalid
    let currentForget = 0;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }

        forgets[currentForget].value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.comma)) {
          // When hitting a comma, create a new forget.
          forgets.push({
            type: StatementTypes.Forget,
            value: '',
            position: currentToken.position,
          });
          currentForget += 1;
          continue;
        }

        forgets[currentForget].value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.and)) {
          // When hitting and, check if the previous forget has any value
          if (forgets[currentForget].value === '') {
            // If it does not, then don't change forget.
            continue;
          } else {
            forgets.push({
              type: StatementTypes.Forget,
              value: '',
              position: currentToken.position,
            });
            currentForget += 1;
          }
        } else {
          forgets[currentForget].value += text;
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    forgets.forEach(forget => {
      forget.value = forget.value.trim();
    });

    return forgets;
  }

  private parseAsk(currentToken: Unist.Node, allTokens: Unist.Node[]): Ask {
    const ask: Ask = {
      type: StatementTypes.Ask,
      question: '',
      answers: [],
      position: currentToken.position,
    };

    // Process all children until we hit something invalid
    let questionParsed = false;
    let currentAnswer = 0;
    let answerReady = false;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          if (!questionParsed) {
            // When hitting the end of a statement and we're still processing the question, skip to answers
            questionParsed = true;
            ask.answers.push('');
            continue;
          } else {
            // otherwise, create a new answer
            ask.answers.push('');
            currentAnswer += 1;
          }
        }

        if (questionParsed) {
          ask.answers[currentAnswer] += (currentToken as Nlcst.WhiteSpace).value;
        } else {
          ask.question += (currentToken as Nlcst.WhiteSpace).value;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          if (!questionParsed) {
            // When hitting the end of a statement and we're still processing the question, skip to answers
            questionParsed = true;
            ask.answers.push('');
            continue;
          } else {
            // otherwise, create a new answer
            ask.answers.push('');
            currentAnswer += 1;
          }
        } else if (
          (currentToken as Nlcst.Punctuation).value.match(this.internalTokens.doubleQuotes) &&
          !questionParsed
        ) {
          // When hitting double quotes and we're still processing the question, skip
          continue;
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.listItem) && questionParsed) {
          // When hitting a list item token and we're done processing the question, set that answer as started and skip
          answerReady = true;
          continue;
        }

        if (!answerReady) {
          // If trying to add text to an answer without any list items, we've gone too far.
          allTokens.push(currentToken);
          break;
        }

        if (questionParsed) {
          ask.answers[currentAnswer] += (currentToken as Nlcst.Punctuation).value;
        } else {
          ask.question += (currentToken as Nlcst.Punctuation).value;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);

        if (!answerReady) {
          // If trying to add text to an answer without any list items, we've gone too far.
          allTokens.push(currentToken);
          break;
        }

        if (questionParsed) {
          ask.answers[currentAnswer] += text;
        } else {
          ask.question += text;
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    // Clean any empty answers
    ask.answers = ask.answers.map(answer => answer.trim()).filter(answer => answer !== '');

    return ask;
  }

  private parseIf(currentToken: Unist.Node, allTokens: Unist.Node[]): If {
    const ifElement: If = {
      type: StatementTypes.If,
      conditions: [],
      position: currentToken.position,
    };

    // Process all children until we hit something invalid
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if (
          (currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement) &&
          !this.lookaheadFor(allTokens, this.internalTokens.else)
        ) {
          // When hitting the end of a statement, end the if
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if (
          (currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement) &&
          !this.lookaheadFor(allTokens, this.internalTokens.else)
        ) {
          // When hitting the end of a statement, end the if
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);

        if (text.match(this.internalTokens.else)) {
          // If processing an else, then run the parser for else and end
          if (!ifElement.else) {
            ifElement.else = [];
          }
          ifElement.else.push(...this.parseElse(currentToken, allTokens));
          break;
        } else if (text.match(this.internalTokens.then)) {
          const nextNode = allTokens.pop();
          if (!nextNode) {
            throw new ParsingError(
              `Then statement was at the end of a file, expected child statement`,
              currentToken.position
            );
          }

          const thenChild = this.parseStatement(nextNode, allTokens);
          if (thenChild.length !== 1) {
            throw new ParsingError(
              `Then statement received more than one child statement, ${thenChild.length} received`,
              currentToken.position
            );
          }

          ifElement.child = thenChild[0];
          continue;
        }

        ifElement.conditions = this.parseCondition(currentToken, allTokens);
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return ifElement;
  }

  private parseCondition(currentToken: Unist.Node, allTokens: Unist.Node[]): Condition[] {
    let isRecall = false;
    const conditions: Condition[] = [
      {
        type: StatementTypes.Condition,
        value: '',
        position: currentToken.position,
      },
    ];

    allTokens.push(currentToken);

    // Process all children until we hit something invalid
    let currentCondition = 0;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }

        conditions[currentCondition].value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.comma)) {
          // When hitting a comma, create a new remember.
          conditions.push({
            type: StatementTypes.Condition,
            value: '',
            position: currentToken.position,
          });
          currentCondition += 1;
          isRecall = false;
          continue;
        }

        conditions[currentCondition].value += (currentToken as Nlcst.Punctuation).value;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.then)) {
          // When hitting then, the loop should end. Add back the token.
          allTokens.push(currentToken);
          break;
        } else if (text.match(this.internalTokens.and)) {
          // When hitting and, check if the previous remember has any value
          if (conditions[currentCondition].value === '') {
            // If it does not, then don't change remember.
            continue;
          } else {
            conditions.push({
              type: StatementTypes.Condition,
              value: '',
              position: currentToken.position,
            });
            currentCondition += 1;
            isRecall = false;
          }
        } else if (text.match(this.internalTokens.is) && !isRecall) {
          conditions[currentCondition].operator =
            conditions[currentCondition].operator === ConditionOperators.IsNot
              ? ConditionOperators.IsNot
              : ConditionOperators.Is;
        } else if (text.match(this.internalTokens.not) && !isRecall) {
          conditions[currentCondition].operator = ConditionOperators.IsNot;
        } else if (text.match(this.internalTokens.recall)) {
          // If recalling something, skip the subject and operators. Only get the value
          isRecall = true;
          delete conditions[currentCondition].subject;
          conditions[currentCondition].operator = ConditionOperators.Recall;
        } else if (!conditions[currentCondition].subject && !isRecall) {
          conditions[currentCondition].subject = this.parseSubject(text, allTokens);
        } else {
          conditions[currentCondition].value += text;
        }
      } else {
        throw new ParsingError(
          `A condition should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    conditions.forEach(condition => {
      if (condition.value?.match(this.internalTokens.bigger)) {
        condition.value = condition.value?.replace(this.internalTokens.bigger, '');
        condition.suboperator = ConditionSuboperators.BiggerThan;
      } else if (condition.value?.match(this.internalTokens.smaller)) {
        condition.value = condition.value?.replace(this.internalTokens.smaller, '');
        condition.suboperator = ConditionSuboperators.SmallerThan;
      } else if (condition.value?.match(this.internalTokens.valid)) {
        condition.value = condition.value?.replace(this.internalTokens.valid, '');
        condition.suboperator = ConditionSuboperators.Valid;
      }
      condition.value = condition.value?.trim();
    });

    // Clean the invalid conditions
    return conditions.filter(condition =>
      condition.operator && condition.operator !== ConditionOperators.Recall
        ? condition.subject && condition.value
        : condition.value
    );
  }

  private parseElse(currentToken: Unist.Node, allTokens: Unist.Node[]): Else[] {
    const elseElement: Else = {
      type: StatementTypes.Else,
      position: currentToken.position,
    };

    // Process all children until we hit something invalid
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, end the else
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, end the else
          break;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);

        if (text.match(this.internalTokens.else)) {
          // If processing an else, then run the parser for else and return current else
          return [elseElement, ...this.parseElse(currentToken, allTokens)];
        } else if (text.match(this.internalTokens.if)) {
          // If processing an if, then add the condition
          elseElement.conditions = this.parseCondition(currentToken, allTokens);
        } else if (text.match(this.internalTokens.then)) {
          const nextNode = allTokens.pop();
          if (!nextNode) {
            throw new ParsingError(
              `Then statement was at the end of a file, expected child statement`,
              currentToken.position
            );
          }

          const thenChild = this.parseStatement(nextNode, allTokens);
          if (thenChild.length !== 1) {
            throw new ParsingError(
              `Then statement received more than one child statement, ${thenChild.length} received`,
              currentToken.position
            );
          }

          elseElement.child = thenChild[0];
          if (!this.lookaheadFor(allTokens, this.internalTokens.else)) {
            // If there are not else ahead, break.
            break;
          }
        } else if (!elseElement.conditions) {
          const thenChild = this.parseStatement(currentToken, allTokens);
          if (thenChild.length !== 1) {
            throw new ParsingError(
              `Else statement received more than one child statement, ${thenChild.length} received`,
              currentToken.position
            );
          }

          elseElement.child = thenChild[0];
          if (!this.lookaheadFor(allTokens, this.internalTokens.else)) {
            // If there are not else ahead, break.
            break;
          }
        }
      } else {
        throw new ParsingError(
          `A statement should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return [elseElement];
  }

  private parseObjectStatement(currentToken: Unist.Node, allTokens: Unist.Node[]): ActiveStatements[] {
    enum StatementType {
      None,
      DialogOrOption,
      Set,
      SubObject,
    }

    // Start by getting the subject
    let subject: Subject | null = null;
    if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode || currentToken.type === Nlcst.NodeType.PunctuationNode) {
      subject = this.parseSubject((currentToken as Nlcst.WhiteSpace).value, allTokens);
    } else if (currentToken.type === Nlcst.NodeType.WordNode) {
      // Extract the text from the first word encountered
      const text = wordNodeToText(currentToken as Nlcst.Word);
      subject = this.parseSubject(text, allTokens);
    } else {
      throw new ParsingError(
        `A statement should start with a word. ${currentToken.type} received`,
        currentToken.position
      );
    }

    if (!subject) {
      throw new ParsingError('Statement did not have a subject', currentToken.position);
    }

    // Try to find which object operation will be ran on this object.
    let statementType: StatementType = StatementType.None;
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // Should never hit the end of a statement before we process the operator
          throw new ParsingError('Incomplete statement was terminated early', currentToken.position);
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // Should never hit the end of a statement before we process the operator
          throw new ParsingError('Incomplete statement was terminated early', currentToken.position);
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.subjectIdentified)) {
          // if hitting a subject identified, then this is a dialog or option
          statementType = StatementType.DialogOrOption;
          break;
        } else {
          // If running into any punctuation at this stage, throw an error.
          throw new ParsingError(
            `${(currentToken as Nlcst.Punctuation).value} is not a valid operation for an object statement`,
            currentToken.position
          );
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);

        if (text.match(this.internalTokens.possession)) {
          statementType = StatementType.SubObject;
          break;
        } else if (text.match(this.internalTokens.is)) {
          statementType = StatementType.Set;
          break;
        } else {
          // If running into any word that is not an operation at this stage, move to parsing an action
          allTokens.push(currentToken);
          break;
        }
      } else {
        throw new ParsingError(
          `An object statement should be operated on by a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    const generateStatement = (value: string): ActiveStatements => {
      let trimmed = value
        .trim()
        .replace(/^(an?|,)/i, '')
        .replace(/,$/i, '')
        .trim();
      switch (statementType) {
        case StatementType.DialogOrOption:
          return {
            type:
              trimmed.match('^' + this.internalTokens.doubleQuotes) &&
              trimmed.match(this.internalTokens.doubleQuotes + '$')
                ? StatementTypes.Dialogue
                : StatementTypes.Action,
            position: currentToken.position,
            subject: subject as Subject,
            text: trimmed,
          };
        case StatementType.Set: {
          let subtype: IntegerOperators | undefined;
          if (trimmed.match(this.internalTokens.decrease)) {
            subtype = IntegerOperators.Decrease;
            trimmed = trimmed.replace(this.internalTokens.decrease, '').trim();
          } else if (trimmed.match(this.internalTokens.increase)) {
            subtype = IntegerOperators.Increase;
            trimmed = trimmed.replace(this.internalTokens.increase, '').trim();
          }

          return {
            type: StatementTypes.Setter,
            subtype,
            position: currentToken.position,
            subject: subject as Subject,
            value: trimmed,
          };
        }
        case StatementType.SubObject: {
          // TODO: Make this smarter, right now it only extract the first word as a number
          const parts = /^(\d+)/g.exec(trimmed);

          return {
            type: StatementTypes.Possession,
            position: currentToken.position,
            subject: subject as Subject,
            value: trimmed.replace(/^(\d+)/g, '').trim(),
            numericalValue: parts && parts.length > 1 ? parts[1] : undefined,
          };
        }
        default:
          return this.parseAction(currentToken, trimmed, subject as Subject);
      }
    };

    // Finally, process the value
    let value = '';
    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        }

        value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, return it
          break;
        } else if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.comma)) {
          // When hitting a comma, return this generated statement and the next.
          return [generateStatement(value), ...this.parseObjectStatement(currentToken, allTokens)];
        }

        value += (currentToken as Nlcst.Punctuation).value;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(this.internalTokens.and)) {
          // When hitting and, generate a new statement with this one.
          return [generateStatement(value), ...this.parseObjectStatement(currentToken, allTokens)];
        }
        value += text;
      } else {
        throw new ParsingError(
          `An object statement's value should include words, punctuation, or whitespaces. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    return [generateStatement(value)];
  }

  private parseAction(currentToken: Unist.Node, value: string, subject: Subject): CustomAction {
    let action: CustomAction | null = null;
    Object.keys(this.additionalTokens).forEach(token => {
      const keyword = this.additionalTokens[token];

      const pattern = new RegExp('^' + (typeof keyword === 'string' ? keyword : keyword.source), 'i');
      if (value.match(pattern)) {
        action = {
          type: StatementTypes.CustomAction,
          subject: subject,
          position: currentToken.position,
          action: token,
          value: value.replace(pattern, '').trim(),
        };
      }
    });

    if (action === null) {
      throw new ParsingError(`No action found for the statement ${value}`, currentToken.position);
    }

    return action;
  }

  private parseSubject(text: string, allTokens: Unist.Node[]): Subject {
    let value = text;

    while (allTokens.length) {
      const currentToken = allTokens.pop();

      if (!currentToken) {
        break;
      }

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        value += (currentToken as Nlcst.WhiteSpace).value;
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if (this.isKeyword((currentToken as Nlcst.Punctuation).value)) {
          allTokens.push(currentToken);
          break;
        }

        value += (currentToken as Nlcst.Punctuation).value;
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);

        if (this.isKeyword(text) || this.isAdditionalAction(text)) {
          allTokens.push(currentToken);
          break;
        }

        value += text;
      } else {
        throw new ParsingError(
          `A condition should start with a word. ${currentToken.type} received`,
          currentToken.position
        );
      }
    }

    const subjectParts = value.split(/('s|s')/);
    const subject: Subject = {
      subject: (subjectParts.pop() as string).trim(),
    };

    let currentSubject = subject;
    while (subjectParts.length) {
      const element = subjectParts.pop();

      if (!element) {
        break;
      }

      if (element.match(/('s|s')/i)) {
        continue;
      }

      currentSubject.parent = {
        subject: element.trim(),
      };
      currentSubject = currentSubject.parent;
    }

    return subject;
  }

  private isKeyword(text: string): boolean {
    return !!Object.values(this.internalTokens).find(token => text.match(token));
  }

  private isObjectStatement(text: string): boolean {
    return (
      !text.match(this.internalTokens.act) &&
      !text.match(this.internalTokens.scene) &&
      !text.match(this.internalTokens.definitions) &&
      !text.match(this.internalTokens.remember) &&
      !text.match(this.internalTokens.forget) &&
      !text.match(this.internalTokens.ask) &&
      !text.match(this.internalTokens.play) &&
      !text.match(this.internalTokens.if) &&
      !text.match(this.internalTokens.else)
    );
  }

  private isActiveStatement(text: string): boolean {
    return (
      !text.match(this.internalTokens.act) &&
      !text.match(this.internalTokens.scene) &&
      !text.match(this.internalTokens.definitions)
    );
  }

  private isAdditionalAction(text: string): boolean {
    return !!Object.keys(this.additionalTokens).find(token => {
      const keyword = this.additionalTokens[token];

      const pattern = new RegExp('^' + (typeof keyword === 'string' ? keyword : keyword.source), 'i');
      return text.match(pattern);
    });
  }

  private lookaheadFor(tokens: Unist.Node[], token: RegExp): boolean {
    for (let tokensKey = tokens.length - 1; tokensKey >= 0; tokensKey--) {
      const currentToken = tokens[tokensKey];

      if (currentToken.type === Nlcst.NodeType.WhiteSpaceNode) {
        if ((currentToken as Nlcst.WhiteSpace).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, end the if
          return false;
        }

        if ((currentToken as Nlcst.WhiteSpace).value.match(token)) {
          return true;
        }
      } else if (currentToken.type === Nlcst.NodeType.PunctuationNode) {
        if ((currentToken as Nlcst.Punctuation).value.match(this.internalTokens.endStatement)) {
          // When hitting the end of a statement, end the if
          return false;
        }

        if ((currentToken as Nlcst.Punctuation).value.match(token)) {
          return true;
        }
      } else if (currentToken.type === Nlcst.NodeType.WordNode) {
        // Extract the text from the first word encountered
        const text = wordNodeToText(currentToken as Nlcst.Word);
        if (text.match(token)) {
          return true;
        }
      }
    }

    return false;
  }

  public getTokens(): typeof tokens {
    return this.internalTokens;
  }
}
