import low from 'lowdb';
import Memory from 'lowdb/adapters/Memory';
import { snakeCase } from 'snake-case';

interface Database {
  [s: string]: unknown;
}

export class ValuesStore {
  private database: low.LowdbSync<Database>;

  constructor(baseData: Database) {
    const adapter = new Memory<Database>('test');
    this.database = low(adapter);
    this.database.defaults(baseData);
  }

  public set(prefix: string, path: string[], value: string | number | boolean): void {
    this.database.set(`${prefix}.${path.map(val => snakeCase(val)).join('.')}`, value).write();
  }

  public unset(prefix: string, path: string[]): void {
    this.database.unset(`${prefix}.${path.map(val => snakeCase(val)).join('.')}`).write();
  }

  public get(prefix: string, path: string[]): string | number | boolean | undefined {
    return this.database.get(`${prefix}.${path.map(val => snakeCase(val)).join('.')}`).value() as
      | string
      | number
      | boolean
      | undefined;
  }

  public has(prefix: string, path: string[]): boolean {
    return this.database.has(`${prefix}.${path.map(val => snakeCase(val)).join('.')}`).value();
  }

  public save(): Database {
    return this.database.getState();
  }
}
