import { ProseWrightParser } from '../interpreter/parser';
import { ValuesStore } from '../valuesStore';
import {
  Act,
  ActiveStatements,
  Condition,
  ConditionOperators,
  ConditionSuboperators,
  Definition,
  If,
  IntegerOperators,
  Play,
  Possession,
  Program,
  Remember,
  Scene,
  Setter,
  StatementTypes,
  Subject,
} from '../types';
import { RuntimeError } from './errors';
import { getValueType, subjectToPath } from './helpers';

export interface ActionData {
  action: string;
  values: unknown;
}

export class RuntimeEngine {
  private readonly parser: ProseWrightParser;
  private readonly dataStore: ValuesStore;

  private definitions: Definition[] = [];
  private acts: Act[] = [];

  private currentAct: Act | null = null;
  private currentScene: Scene | null = null;
  private currentStatement: ActiveStatements | null = null;
  private currentStatementIndex = -1;
  private currentSubject: Subject | null = null;

  constructor(parser: ProseWrightParser, dataStore: ValuesStore) {
    this.parser = parser;
    this.dataStore = dataStore;
  }

  parse(code: string): void {
    const parsedProgram: Program = this.parser.parse(code);

    // Extract all definitions and acts from the root program
    parsedProgram.children.forEach(child => {
      switch (child.type) {
        case StatementTypes.Act:
          this.acts.push(child);
          break;
        case StatementTypes.Definitions:
          this.definitions.push(child);
          break;
      }
    });

    // Get the first scene of the first act (In processing order)
    let currentAct = this.acts[0];
    let currentScene = currentAct.children.find(child => child.type === StatementTypes.Scene) as Scene;

    // Try to find the main scene
    for (const actKey in this.acts) {
      const act = this.acts[actKey];

      for (const childKey in act.children) {
        const child = act.children[childKey];
        if (child.type === StatementTypes.Scene && child.name.match(this.parser.getTokens().main)) {
          currentScene = child;
          currentAct = act;
          break;
        }
      }

      if (currentScene) {
        break;
      }
    }

    // Execute the local definitions
    this.definitions.forEach(def => this.runDefinitions(def));

    // Switch to the first scene and set the statement
    this.switchScene(currentAct, currentScene);
  }

  public hasNext(): boolean {
    return !!this.currentStatement;
  }

  public next(): ActionData | undefined {
    while (this.currentStatement) {
      switch (this.currentStatement?.type) {
        case StatementTypes.Action: {
          const subject = this.findSubject(this.currentStatement?.subject);
          if (!subject) {
            throw new RuntimeError(
              `Received statement expecting a subject, subject ${subjectToPath(
                this.currentStatement?.subject
              )} was not found in current or previous subjects`,
              this.currentStatement.position
            );
          }

          this.currentSubject = subject;

          const data = {
            action: StatementTypes.Action,
            values: {
              subject: subjectToPath(subject),
              text: this.currentStatement?.text,
            },
          };
          this.incrementStatement();
          return data;
        }
        case StatementTypes.Ask: {
          const data = {
            action: StatementTypes.Ask,
            values: {
              question: this.currentStatement?.question,
              answers: this.currentStatement?.answers,
            },
          };
          this.incrementStatement();
          return data;
        }
        case StatementTypes.CustomAction: {
          const subject = this.findSubject(this.currentStatement?.subject);
          if (!subject) {
            throw new RuntimeError(
              `Received statement expecting a subject, subject ${subjectToPath(
                this.currentStatement?.subject
              )} was not found in current or previous subjects`,
              this.currentStatement.position
            );
          }
          this.currentSubject = subject;

          const data = {
            action: StatementTypes.CustomAction,
            values: {
              action: this.currentStatement?.action,
              subject: subjectToPath(subject),
              value: this.currentStatement?.value,
            },
          };
          this.incrementStatement();
          return data;
        }
        case StatementTypes.Dialogue: {
          const subject = this.findSubject(this.currentStatement?.subject);
          if (!subject) {
            throw new RuntimeError(
              `Received statement expecting a subject, subject ${subjectToPath(
                this.currentStatement?.subject
              )} was not found in current or previous subjects`,
              this.currentStatement.position
            );
          }
          this.currentSubject = subject;

          const data = {
            action: StatementTypes.Dialogue,
            values: {
              subject: subjectToPath(subject),
              text: this.currentStatement?.text,
            },
          };
          this.incrementStatement();
          return data;
        }
        case StatementTypes.Forget: {
          const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

          this.dataStore.unset(prefix, [this.currentStatement.value]);
          this.dataStore.unset(actPrefix, [this.currentStatement.value]);
          this.dataStore.unset(rootPrefix, [this.currentStatement.value]);
          this.incrementStatement();
          break;
        }
        case StatementTypes.If: {
          this.runIf(this.currentStatement);
          break;
        }
        case StatementTypes.Play: {
          const foundAct = this.currentStatement.act
            ? this.acts.find(act => act.name === (this.currentStatement as Play).act)
            : this.currentAct;
          if (!foundAct) {
            throw new RuntimeError(
              `Could not find act ${this.currentStatement.act}, act names are CaSe SeNsItIvE`,
              this.currentStatement.position
            );
          }

          const foundScene = foundAct
            ? foundAct.children.find(
                child => child.type === StatementTypes.Scene && child.name === (this.currentStatement as Play).scene
              )
            : this.currentScene;

          if (!foundScene) {
            throw new RuntimeError(
              `Could not find scene ${this.currentStatement.scene}, scene names are CaSe SeNsItIvE`,
              this.currentStatement.position
            );
          }

          this.switchScene(foundAct as Act, foundScene as Scene);
          break;
        }
        case StatementTypes.Possession: {
          const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

          const subject =
            this.processPossessionValueType(prefix, this.currentStatement) ||
            this.processPossessionValueType(actPrefix, this.currentStatement) ||
            this.processPossessionValueType(rootPrefix, this.currentStatement);
          if (subject) {
            this.currentSubject = subject;
            this.incrementStatement();
            break;
          }

          // If not found in any scope, throw an error.
          throw new RuntimeError(`Trying to set a value on an unknown subject`, this.currentStatement.position);
        }
        case StatementTypes.Remember: {
          const foundAct = this.currentStatement.actScope
            ? this.acts.find(act => act.name === (this.currentStatement as Remember).actScope)
            : this.currentAct;
          const foundScene = (foundAct && this.currentStatement.sceneScope
            ? foundAct.children.find(
                child =>
                  child.type === StatementTypes.Scene && child.name === (this.currentStatement as Remember).sceneScope
              )
            : this.currentScene) as Scene;

          const prefix = this.generatePrefixFromActAndScene(foundAct, foundScene);
          this.dataStore.set(prefix, [this.currentStatement.value], true);
          this.incrementStatement();
          break;
        }
        case StatementTypes.Setter: {
          const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

          const subject =
            this.processSetterValueType(prefix, this.currentStatement) ||
            this.processSetterValueType(actPrefix, this.currentStatement) ||
            this.processSetterValueType(rootPrefix, this.currentStatement);
          if (subject) {
            this.currentSubject = subject;
            this.incrementStatement();
            break;
          }

          // If not found in any scope, throw an error.
          throw new RuntimeError(`Trying to set a value on an unknown subject`, this.currentStatement.position);
        }
      }
    }

    return undefined;
  }

  public saveAnswer(answer: string): void {
    this.dataStore.set(this.generatePrefixFromActAndScene(this.currentAct, this.currentScene), [answer], true);
  }

  private runDefinitions(definition: Definition, act?: Act, scene?: Scene) {
    const prefix = this.generatePrefixFromActAndScene(act, scene);

    definition.children.forEach(def => {
      switch (def.type) {
        case StatementTypes.Setter: {
          const subject = this.obtainSubject(prefix, def.subject, true);
          if (!subject) {
            throw new RuntimeError(
              `Received statement expecting a subject, subject ${subjectToPath(
                def.subject
              )} was not found in current or previous subjects`,
              def.position
            );
          }

          this.dataStore.set(prefix, [...subjectToPath(subject), def.value], getValueType(def.value));
          this.currentSubject = subject;
          break;
        }
        case StatementTypes.Possession: {
          const subject = this.obtainSubject(prefix, def.subject);
          if (!subject) {
            throw new RuntimeError(
              `Received statement expecting a subject, subject ${subjectToPath(
                def.subject
              )} was not found in current or previous subjects`,
              def.position
            );
          }

          this.dataStore.set(
            prefix,
            [...subjectToPath(subject), def.value],
            def.numericalValue ? getValueType(def.numericalValue) : true
          );
          this.currentSubject = subject;
          break;
        }
        default:
          throw new RuntimeError(`Could not process definition ${def.type}, unexpected type`, def.position);
      }
    });
  }

  private runIf(ifStatement: If): void {
    const checkConditions = (conditions: Condition[]): boolean =>
      conditions.every(condition => {
        const getVal = (): string | number | boolean | undefined | Record<string, string | number | boolean> => {
          if (!condition.subject) {
            throw new RuntimeError('Trying to run a condition without a subject', condition.position);
          }

          const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

          // Trying to find in the scene scope
          let subject = this.obtainSubject(prefix, condition.subject);
          if (subject && this.dataStore.has(prefix, subjectToPath(subject))) {
            this.currentSubject = subject;

            return this.dataStore.get(prefix, subjectToPath(subject));
          }

          // If scene scope does not exists, try finding in the act scope
          subject = this.obtainSubject(actPrefix, condition.subject);
          if (subject && this.dataStore.has(actPrefix, subjectToPath(subject))) {
            this.currentSubject = subject;

            return this.dataStore.get(actPrefix, subjectToPath(subject));
          }

          // If act scope does not exists, try finding in the root scope
          subject = this.obtainSubject(rootPrefix, condition.subject);
          if (subject && this.dataStore.has(rootPrefix, subjectToPath(subject))) {
            this.currentSubject = subject;

            return this.dataStore.get(actPrefix, subjectToPath(subject));
          }

          return undefined;
        };

        switch (condition.operator) {
          case ConditionOperators.Is:
          case ConditionOperators.IsNot: {
            const value = getVal();

            switch (condition.suboperator) {
              case ConditionSuboperators.BiggerThan: {
                if (typeof value !== 'number' && typeof value !== 'string') {
                  throw new RuntimeError(
                    'Conditions using bigger than should only compare strings and numbers',
                    condition.position
                  );
                }

                return condition.operator === ConditionOperators.Is
                  ? condition.value && value && value >= condition.value
                  : condition.value && value && !(value >= condition.value);
              }
              case ConditionSuboperators.SmallerThan: {
                if (typeof value !== 'number' && typeof value !== 'string') {
                  throw new RuntimeError(
                    'Conditions using bigger than should only compare strings and numbers',
                    condition.position
                  );
                }

                return condition.operator === ConditionOperators.Is
                  ? condition.value && value && value <= condition.value
                  : condition.value && value && !(value <= condition.value);
              }
              case ConditionSuboperators.Valid:
                return condition.operator === ConditionOperators.Is ? !!value : !value;
              default:
                return condition.operator === ConditionOperators.Is
                  ? value === condition.value ||
                      (condition.value &&
                        typeof value === 'object' &&
                        Object.prototype.hasOwnProperty.call(value, condition.value))
                  : value !== condition.value ||
                      !(
                        condition.value &&
                        typeof value === 'object' &&
                        Object.prototype.hasOwnProperty.call(value, condition.value)
                      );
            }
          }
          case ConditionOperators.Recall: {
            const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

            if (!condition.value) {
              throw new RuntimeError('Trying to recall an invalid value, was undefined', condition.position);
            }

            return (
              this.dataStore.has(prefix, [condition.value]) ||
              this.dataStore.has(actPrefix, [condition.value]) ||
              this.dataStore.has(rootPrefix, [condition.value])
            );
          }
          default:
            return false;
        }
      });

    if (checkConditions(ifStatement.conditions)) {
      if (!ifStatement.child) {
        throw new RuntimeError('Received an if without any then statement', ifStatement.position);
      }

      this.currentStatement = ifStatement.child;
      return;
    }

    if (ifStatement.else) {
      for (const elseKey in ifStatement.else) {
        const elseEl = ifStatement.else[elseKey];

        if (!elseEl.conditions) {
          if (!elseEl.child) {
            throw new RuntimeError('Received an if without any then statement', elseEl.position);
          }

          this.currentStatement = elseEl.child;
          return;
        }

        if (checkConditions(elseEl.conditions)) {
          if (!elseEl.child) {
            throw new RuntimeError('Received an if without any then statement', elseEl.position);
          }

          this.currentStatement = elseEl.child;
          return;
        }
      }
    }
  }

  private switchScene(act: Act, scene: Scene): void {
    if (act !== this.currentAct) {
      // Execute the definitions from the act
      act.children.forEach(child => {
        switch (child.type) {
          case StatementTypes.Definitions:
            this.runDefinitions(child, act);
            break;
        }
      });
    }

    this.currentAct = act;

    if (scene !== this.currentScene) {
      // Execute the definitions from the scene
      scene.children.forEach(child => {
        switch (child.type) {
          case StatementTypes.Definitions:
            this.runDefinitions(child, act, scene);
            break;
        }
      });
    }

    this.currentScene = scene;

    // Set the first statement that is not a definition as the current statement
    this.currentStatementIndex = this.currentScene.children.findIndex(
      child => child.type !== StatementTypes.Definitions
    );
    this.currentStatement = this.currentScene.children[this.currentStatementIndex] as ActiveStatements;
  }

  private incrementStatement(): void {
    this.currentStatementIndex += 1;
    this.currentStatement = this.currentScene?.children[this.currentStatementIndex] as ActiveStatements;
  }

  private processSetterValueType(prefix: string, setterStatement: Setter): Subject | undefined {
    const subject = this.obtainSubject(prefix, setterStatement.subject, true);
    if (!subject) {
      throw new RuntimeError(
        `Received statement expecting a subject, subject ${subjectToPath(
          setterStatement.subject
        )} was not found in current or previous subjects`,
        setterStatement.position
      );
    }

    if (this.dataStore.has(prefix, subjectToPath(subject))) {
      const valueType = getValueType(setterStatement.value);
      if (setterStatement.subtype) {
        const prevValue = this.dataStore.get(prefix, subjectToPath(subject));

        if (typeof prevValue === 'number' && typeof valueType === 'number') {
          this.dataStore.set(
            prefix,
            subjectToPath(subject),
            setterStatement.subtype === IntegerOperators.Increase ? prevValue + valueType : prevValue - valueType
          );
          return subject;
        }
      }

      this.dataStore.set(prefix, [...subjectToPath(subject), setterStatement.value], valueType);
      return subject;
    }

    return undefined;
  }

  private processPossessionValueType(prefix: string, possessionStatement: Possession): Subject | undefined {
    const subject = this.obtainSubject(prefix, possessionStatement.subject);
    if (!subject) {
      throw new RuntimeError(
        `Received statement expecting a subject, subject ${subjectToPath(
          possessionStatement.subject
        )} was not found in current or previous subjects`,
        possessionStatement.position
      );
    }

    if (this.dataStore.has(prefix, subjectToPath(subject))) {
      this.dataStore.set(
        prefix,
        [...subjectToPath(subject), possessionStatement.value],
        possessionStatement.numericalValue ? getValueType(possessionStatement.numericalValue) : true
      );
      return subject;
    }

    return undefined;
  }

  private obtainSubject(prefix: string, givenSubject: Subject, returnOnNotFound = false): Subject | undefined {
    // Check if we can find the subject directly
    if (this.dataStore.has(prefix, subjectToPath(givenSubject))) {
      return givenSubject;
    }

    if (!this.currentSubject) {
      if (returnOnNotFound) {
        return givenSubject;
      }

      throw new RuntimeError(
        `Received statement expecting a subject, subject ${subjectToPath(
          givenSubject
        )} was not found and there were no previous subjects`,
        undefined
      );
    }

    // Check if we can't find the subject by combining it with the current subject
    const temporary: Subject = { subject: '' };
    let looper: Subject | undefined = temporary;
    let last: Subject | undefined = temporary;
    let current: Subject | undefined = givenSubject;
    // Recreate the hierarchy of the given subject first
    while (current && looper) {
      last = looper;
      looper.subject = current.subject;
      looper.parent = { subject: '' };
      current = current.parent;
      looper = looper.parent;
    }
    // Then assign the current subject
    current = this.currentSubject;
    looper = last;
    looper.parent = {
      subject: current.subject,
      parent: { subject: '' },
    };
    looper = looper.parent;
    current = current.parent;
    // Finally, try to loop in the hierarchy of the current subject if any
    while (current && looper) {
      looper.subject = current.subject;
      looper.parent = { subject: '' };
      current = current.parent;
      looper = looper.parent;
    }

    if (this.dataStore.has(prefix, subjectToPath(temporary))) {
      return temporary;
    }

    // Check if we have a current subject and it is in the current prefix
    if (this.currentSubject && this.dataStore.has(prefix, subjectToPath(this.currentSubject))) {
      return this.currentSubject;
    }

    if (returnOnNotFound) {
      return givenSubject;
    }

    return undefined;
  }

  private findSubject(subject: Subject): Subject | undefined {
    const [prefix, actPrefix, rootPrefix] = this.generatePrefixes();

    return (
      this.obtainSubject(prefix, subject) ||
      this.obtainSubject(actPrefix, subject) ||
      this.obtainSubject(rootPrefix, subject)
    );
  }

  private generatePrefixFromActAndScene(act?: Act | null, scene?: Scene | null): string {
    return `root${act ? `|${act?.name}` : ''}${scene ? `|${scene?.name}` : ''}`;
  }

  private generatePrefixes(): [string, string, string] {
    return [
      `root|${this.currentAct?.name || ''}|${this.currentScene?.name || ''}`,
      `root|${this.currentAct?.name || ''}`,
      'root',
    ];
  }
}
