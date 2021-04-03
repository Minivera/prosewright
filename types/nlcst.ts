import * as Unist from './unist';

/* eslint-disable no-use-before-define */
export enum NodeType {
  RootNode = 'RootNode',
  ParagraphNode = 'ParagraphNode',
  SentenceNode = 'SentenceNode',
  WordNode = 'WordNode',
  SymbolNode = 'SymbolNode',
  PunctuationNode = 'PunctuationNode',
  WhiteSpaceNode = 'WhiteSpaceNode',
  SourceNode = 'SourceNode',
  TextNode = 'TextNode',
}

export interface Parent extends Unist.Parent {
  children: (Text | Paragraph | Sentence | Word | NlcstSymbol | Punctuation | WhiteSpace | Source)[];
}

export interface Literal extends Unist.Literal {
  value: string;
}

export interface Root extends Parent {
  type: NodeType.RootNode;
}

export interface Paragraph extends Parent {
  type: NodeType.ParagraphNode;
  children: (Sentence | WhiteSpace | Source)[];
}

export interface Sentence extends Parent {
  type: NodeType.SentenceNode;
  children: (Word | NlcstSymbol | Punctuation | WhiteSpace | Source)[];
}

export interface Word extends Parent {
  type: NodeType.WordNode;
  children: (Text | NlcstSymbol | Punctuation | Source)[];
}

export interface NlcstSymbol extends Literal {
  type: NodeType.SymbolNode;
}

export interface Punctuation extends Literal {
  type: NodeType.PunctuationNode;
}

export interface WhiteSpace extends Literal {
  type: NodeType.WhiteSpaceNode;
}

export interface Source extends Literal {
  type: NodeType.SourceNode;
}

export interface Text extends Literal {
  type: NodeType.TextNode;
}
