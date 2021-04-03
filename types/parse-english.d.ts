import * as Nlcst from './nlcst';
import * as Unist from './unist';

declare module 'parse-english' {
  export default class English {
    constructor();
    constructor(value: string);

    parse: (text?: string) => Nlcst.Root;
    tokenize: (text?: string) => Unist.Node[];
  }
}
