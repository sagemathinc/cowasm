import debug from "debug";
import { nonzeroPositions } from "./util";

const log = debug("dylink:function-table");

const GROW_THRESH = 50;

export default class FunctionTable {
  private table: WebAssembly.Table;

  // indexes into the function table that are null, but
  // maybe less than nextTablePos.
  private availableTableIndexes: Set<number> = new Set<number>();

  // next available table position at the very end. Use this if
  // availableTableIndexes is empty.
  private nextTablePos: number = 0;

  constructor(table: WebAssembly.Table) {
    log("constructor");
    this.table = table;
  }

  updateAfterImport(): void {
    this.nextTablePos = Math.max(0, ...nonzeroPositions(this.table)) + 1;
  }

  prepareForImport(tableSize: number): void {
    this.nextTablePos += tableSize;
    if (this.table.length <= this.nextTablePos + GROW_THRESH) {
      this.table.grow(this.nextTablePos + GROW_THRESH - this.table.length);
    }
  }

  getNextTablePos(): number {
    return this.nextTablePos;
  }

  // gets the next available index, then marks it
  // as no longer available, so it can be used.
  private getNextAvailableIndex(): number {
    for (const index of this.availableTableIndexes) {
      this.availableTableIndexes.delete(index);
      log("getNextAvailableIndex: from availalbeTableIndex", index);

      return index;
    }
    const index = this.nextTablePos;
    log("getNextAvailableIndex: from nextTablePos", index);
    this.nextTablePos += 1;
    if (this.table.length <= this.nextTablePos + GROW_THRESH) {
      this.table.grow(this.nextTablePos + GROW_THRESH - this.table.length);
    }
    return index;
  }

  setLater(): { index: number; set: (f: Function) => void } {
    const index = this.getNextAvailableIndex();
    return {
      index,
      set: (f) => {
        this.set(f, index);
      },
    };
  }

  set(f: Function, _index?: number): number {
    const index = _index ?? this.getNextAvailableIndex();
    if (this.table.get(index) != null) {
      throw Error("BUG: trying to set a table index that is already set");
    }
    this.table.set(index, f);
    return index;
  }

  get(index: number): Function | null | undefined {
    return this.table.get(index);
  }

  delete(index: number): void {
    this.table.set(index, null);
    this.availableTableIndexes.add(index);
  }
}
