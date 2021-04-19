import * as Unist from '../../types/unist';

export class RuntimeError extends Error {
  constructor(message: string, position: Unist.Position | undefined) {
    super(`${message}${position ? `, at line ${position.start.line}:${position.start.column}` : ''}`);
    this.name = 'RuntimeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
