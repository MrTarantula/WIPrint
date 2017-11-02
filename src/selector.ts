export class FieldsSelector {
  dirty: boolean;
  LHS: Selector;

  RHS: Selector;

  constructor(
    lhs: any[],
    rhs: any[],
    index: number | string,
    value?: number | string
  ) {
    this.dirty = false;

    this.LHS = new Selector(lhs, index, value || null);
    this.RHS = new Selector(rhs, index, value || null);
  }

  push() {
    const items = this.LHS.selected.map(i => this.LHS.items[i]);
    this.LHS.remove();
    this.RHS.add(items);

    this.dirty = true;
  }

  pop() {
    const items = this.RHS.selected.map(i => this.RHS.items[i]);
    this.RHS.remove();
    this.LHS.add(items);

    this.dirty = true;
  }

  up() {
    this.RHS.up();
    this.dirty = true;
  }

  down() {
    this.RHS.down();
    this.dirty = true;
  }

  top() {
    this.RHS.top();
    this.dirty = true;
  }

  bottom() {
    // this.dirty = true;
    // this.check();
  }

  click(list: string, index: number, ctrl?: boolean, shift?: boolean) {
    if (list === "print") {
      this.RHS.select(index, ctrl || false, shift || false);
    } else {
      this.LHS.select(index, ctrl || false, shift || false);
    }
  }
}

export class Selector {
  items: ISelectorItem[];
  selected: number[];
  index: string | number;
  value: string | number;

  constructor(input: any[], index: string | number, value: string | number) {
    this.index = index;
    this.value = value;
    this.items = input.map(i => new SelectorItem(i[this.index], i[this.value]));
    this.selected = [];
  }

  add(items: any[]) {
    if (items.length > 0) {
      items.reverse();
      let insertPosition =
        this.selected[this.selected.length - 1] + 1 || this.items.length || 0;
      this.selected = [];

      for (let i = 0; i < items.length; i++) {
        this.items.splice(insertPosition, 0, items[i]);
        this.selected.push(insertPosition + i);
      }
    }
  }

  remove() {
    if (this.items.length > 0) {
      this.selected.sort().reverse(); // remove last items first so positions of others do not change
      let placeholder = this.selected[this.selected.length - 1 || 0];
      this.selected.forEach(p => {
        this.items.splice(p, 1);
      });
      this.selected = [];
      if (placeholder !== 0) {
        this.selected = [
          this.items[placeholder] ? placeholder : placeholder - 1
        ];
      }
    }
  }

  up() {
    let newPositions = this.selected.map(s => {
      if (s !== 0 && !this.selected.some(sel => sel === s - 1)) {
        const mover = this.items.splice(s, 1);
        this.items.splice(s - 1, 0, ...mover);
        return s - 1;
      } else {
        return s;
      }
    });
    this.selected = newPositions;
  }

  down() {
    let newPositions = this.selected.map(s => {
      if (s < this.items.length && !this.selected.some(sel => sel === s + 1)) {
        const mover = this.items.splice(s, 1);
        this.items.splice(s + 1, 0, ...mover);
        return s + 1;
      } else {
        return s;
      }
    });
    this.selected = newPositions;
  }

  top() {
    this.selected.sort().reverse();
    const topItems = [];
    this.selected.forEach(s => {
      topItems.push(this.items.splice(s, 1));
    });

    this.items.unshift(...topItems);

    this.selected = [];
    for (let i = 0; i < topItems.length; i++) {
      this.selected.push[i];
    }
  }

  bottom() {}

  select(position: number, ctrl?: boolean, shift?: boolean) {
    if (ctrl && !shift) {
      this.selected.push(position);
    } else if (shift) {
      this.selected.push(position);
      const min = this.selected.reduce((a, b) => Math.min(a, b));
      const max = this.selected.reduce((a, b) => Math.max(a, b));

      this.selected = [];
      for (let i = min; i <= max; i++) {
        this.selected.push(i);
      }
    } else {
      this.selected = [];
      this.selected.push(position);
    }
  }

  sort() {
    const indexRef = this.selected.map(s => {
      return this.items[s].index;
    });

    this.items.sort((a, b) => (a.index > b.index ? 1 : -1));

    this.selected = indexRef.map(item => {
      for (let i = 0; i < this.items.length; i++) {
        if (this.items[i].index === item) {
          return i;
        }
      }
    });
  }

  sync(source: any[]) {
    // not implemented
  }
}

interface ISelectorItem {
  index: string | number;
  value: string;
}

export class SelectorItem implements ISelectorItem {
  index: string | number;
  value: string;
  constructor(index: string, value?: string) {
    this.index = index;
    this.value = value || index;
  }
}
