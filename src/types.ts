/* eslint-disable no-use-before-define */
import * as Unist from '../types/unist';

export enum StatementTypes {
  Definitions = 'definitions',
  Act = 'act',
  Scene = 'scene',
  Dialogue = 'dialogue',
  Action = 'action',
  Play = 'play',
  Condition = 'condition',
  If = 'if',
  Else = 'else',
  Remember = 'remember',
  Forget = 'forget',
  Ask = 'ask',
  Possession = 'possess',
  Setter = 'set',
  CustomAction = 'custom',
}

export enum ConditionOperators {
  IsNot = 'isnot',
  Is = 'is',
  Recall = 'recall',
}

export enum IntegerOperators {
  Decrease = 'decrease',
  Increase = 'increase',
}

export enum ConditionSuboperators {
  Valid = 'valid',
  BiggerThan = 'biggerthan',
  SmallerThan = 'smallthan',
}

export interface Subject {
  subject: string;
  parent?: Subject;
}

export interface Statement {
  type: string;
  position?: Unist.Position;
}

export type RootStatements = Definition | Act | Scene;
export type ActiveStatements =
  | Dialogue
  | Action
  | Play
  | If
  | Else
  | Remember
  | Forget
  | Ask
  | Possession
  | Setter
  | CustomAction;

export interface Program {
  children: RootStatements[];
}

export interface Definition extends Statement {
  type: StatementTypes.Definitions;
  children: ActiveStatements[];
}

export interface Act extends Statement {
  type: StatementTypes.Act;
  name: string;
  children: (Definition | Scene)[];
}

export interface Scene extends Statement {
  type: StatementTypes.Scene;
  name: string;
  children: (Definition | ActiveStatements)[];
}

export interface Dialogue extends Statement {
  type: StatementTypes.Dialogue;
  subject: Subject;
  text: string;
}

export interface Action extends Statement {
  type: StatementTypes.Action;
  subject: Subject;
  text: string;
}

export interface Play extends Statement {
  type: StatementTypes.Play;
  scene: string;
  act?: string;
}

export interface Condition extends Statement {
  type: StatementTypes.Condition;
  subject?: Subject;
  operator?: ConditionOperators;
  suboperator?: ConditionSuboperators;
  value?: string;
}

export interface If extends Statement {
  type: StatementTypes.If;
  conditions: Condition[];
  child?: ActiveStatements;
  else?: Else[];
}

export interface Else extends Statement {
  type: StatementTypes.Else;
  conditions?: Condition[];
  child?: ActiveStatements;
}

export interface Remember extends Statement {
  type: StatementTypes.Remember;
  value: string;
  actScope?: string;
  sceneScope?: string;
}

export interface Forget extends Statement {
  type: StatementTypes.Forget;
  value: string;
}

export interface Ask extends Statement {
  type: StatementTypes.Ask;
  question: string;
  answers: string[];
}

export interface Possession extends Statement {
  type: StatementTypes.Possession;
  subject: Subject;
  value: string;
  numericalValue?: string;
}

export interface Setter extends Statement {
  type: StatementTypes.Setter;
  subtype?: IntegerOperators;
  subject: Subject;
  value: string;
}

export interface CustomAction extends Statement {
  type: StatementTypes.CustomAction;
  subject: Subject;
  action: string;
  value: string;
}
