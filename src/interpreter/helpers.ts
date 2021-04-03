import { NodeType, Word } from '../../types/nlcst';

export const wordNodeToText = (node: Word): string =>
  node.children
    .map((el): string => {
      if (el.type === NodeType.TextNode) {
        return el.value;
      } else if (el.type === NodeType.PunctuationNode) {
        return el.value;
      } else if (el.type === NodeType.SymbolNode) {
        return el.value;
      }
      return '';
    })
    .join('');
