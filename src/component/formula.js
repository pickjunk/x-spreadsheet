import { stringAt } from '../core/alphabet';
import { setCaretPosition, getCaretPosition } from '../core/caret';

export default class Formula {
  constructor(editor) {
    this.editor = editor;
    this.el = this.editor.textEl.el;

    this.cells = [];
    this.cell = null;
    document.addEventListener("selectionchange", () => {
      if (document.activeElement !== this.el) return;
      if (this.editor.inputText[0] != '=') return;

      const index = getCaretPosition(this.el);

      this.cell = null;
      for (let { from, to } of this.cells) {
        if (from <= index && index <= to) {
          this.cell = {
            from,
            to,
          };
          // console.log('formula cell', this.cell);
          return;
        }
      }
    });
  }

  selectCell(ri, ci) {
    if (this.cell) {
      const row = String(ri + 1);
      const col = stringAt(ci);
      const text = this.editor.inputText;
      const cell = this.cell;

      this.editor.inputText = text.slice(0, cell.from) + col + row + text.slice(cell.to);
      this.editor.render();
      setTimeout(() => {
        setCaretPosition(this.el, cell.from + col.length + row.length);
      });

      this.cell = null;
    }
  }

  render() {
    const text = this.editor.inputText;
    this.cells = [];

    let i = 0;
    let m = null;
    let html = "";

    const goldenRatio = 0.618033988749895;
    let h = 34 / 360;
    function pickColor() {
      const color = `hsl(${Math.floor(h * 360)}, 90%, 50%)`;
      h += goldenRatio;
      h %= 1;
      return color;
    }

    let pre = 0;
    while (i < text.length) {
      const sub = text.slice(i);
      if ((m = sub.match(/^[A-Za-z]+[1-9][0-9]*/))) {
        // cell
        const color = pickColor();
        html += `<span class="formula-token" style="color:${color}">${m[0]}</span>`;
        this.cells.push({
          from: i,
          to: i + m[0].length,
          color,
        });
        pre = 1;
        i = i + m[0].length;
      } else if ((m = sub.match(/^[A-Za-z]+/))) {
        // function
        html += `<span class="formula-token">${m[0]}</span>`;
        pre = 2;
        i = i + m[0].length;
      } else if ((m = sub.match(/^[0-9.]+/))) {
        // number
        html += `<span class="formula-token">${m[0]}</span>`;
        pre = 3;
        i = i + m[0].length;
      } else if ((m = sub.match(/^[\+\-\*\/\,\=]/))) {
        // operator
        html += `<span class="formula-token">${m[0]}</span>`;
        if (pre == 4) {
          // between two operators
          this.cells.push({
            from: i,
            to: i,
          });
        }
        if (text[i - 1] == '(') {
          // between '(' and operator
          this.cells.push({
            from: i,
            to: i,
          });
        }
        pre = 4;
        i = i + 1;
      } else if ((m = sub.match(/^[\(\)]/))) {
        // parenthesis
        html += `<span class="formula-token">${m[0]}</span>`;
        if (text[i - 1] == '(' && text[i] == ')') {
          // between parenthesis pair
          this.cells.push({
            from: i,
            to: i,
          });
        }
        if (pre == 4 && text[i] == ')') {
          // between operator and ')'
          this.cells.push({
            from: i,
            to: i,
          });
        }
        pre = 5;
        i = i + 1;
      } else {
        // unknown
        html += `<span class="formula-token">${text.charAt(i)}</span>`;
        pre = 6;
        i = i + 1;
      }
    }

    if (pre == 4) {
      // between operator and the end of text
      this.cells.push({
        from: text.length,
        to: text.length,
      });
    }

    // console.log('formula cells', this.cells);

    this.el.innerHTML = html;
  }
}