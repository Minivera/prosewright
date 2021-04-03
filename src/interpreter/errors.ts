import * as Unist from '../../types/unist';

export class ParsingError extends Error {
  constructor(message: string, position: Unist.Position | undefined) {
    super(`${message}${position ? `, at line ${position.start.line}:${position.start.column}` : ''}`);
    this.name = 'ParsingError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
