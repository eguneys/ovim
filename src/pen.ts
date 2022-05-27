import { createSignal, createMemo } from 'solid-js'
import { read, write, owrite } from './play'
import { make_position } from './make_util'

const key_motion = ['h', 'j', 'k', 'l']

export class Pen {

  get mode() {
    return read(this._mode)
  }

  set mode(m: Mode) {
    return owrite(this._mode, m)
  }

  constructor() {

    this._mode = createSignal(1)


    this.lines = make_lines()

    this.empty_lines = createMemo(() => {
      let nb = this.lines.lines.length
      return [...Array(80 - nb).keys()]
    })
  }

  keyDown(code: string, e: EventHandler) {
    console.log(this.lines.cursor.vs)
    if (this.mode === 1) {
      this.normal_down(code, e)
    } else if (this.mode === 2) {
      this.insert_down(code, e)
    }
  }

  insert_down(code: string, e: EventHandler) {
    if (e.ctrlKey) {

      switch (code) {
        case 'j':
          this.lines.break_line()
          e.preventDefault()
          break
      }
    } else {
      switch (code) {
        case 'Enter':
          break
        case 'Shift':
          break
        case 'Ctrl':
          break
        case 'Space':
          break
        case 'Backspace':
          break
        case 'Escape':
          this.mode = 1
        break
        default:
          this.lines.insert(code)
        break
      }
    }
  }

  normal_down(code: string) {
    switch (code) {
      case 'Enter':
        break
      case 'Shift':
        break
      case 'Ctrl':
        break
      case 'Space':
        break
      case 'Backspace':
        break
      case 'o':
        this.lines.newline()
        this.mode = 2
        break
      case 'i':
        this.mode = 2
        break
      default:
        this.lines.motion(code)
    }
  }
}


export const make_lines = () => {

  let _arr = createSignal(["Online Vim Inspired Editor"], { equals: false })

  let _cursor = make_position(0, 0)
  let _pcursor = make_position(0, 0)

  function cursor_up() {
    align_x_to_line(_cursor.y - 1)
    _cursor.y--;
  }

  function cursor_down() {
    align_x_to_line(_cursor.y + 1)
    _cursor.y++
  }

  function align_x_to_line(y: number) {

    let line = read(_arr)[y]

    let l = line.length

    _cursor.x = Math.min(l, _pcursor.x)
  }

  return {
    break_line() {
      write(_arr, _ => {
        let broke_lines = _[_cursor.y].slice(_cursor.x)
        _[_cursor.y] = _[_cursor.y].slice(0, _cursor.x)
        _.splice(_cursor.y + 1, 0, broke_lines)
      })

      _pcursor.x = 0
      cursor_down()
    },
    newline() {

      write(_arr, _ => _.splice(_cursor.y + 1, 0, ""))
      _pcursor.x = 0
      cursor_down()
    },
    motion(code: string) {
      let motion = key_motion.indexOf(code)

      switch (motion) {
        case 0:
          if (_cursor.x > 0) {
           _pcursor.x = _cursor.x - 1;
          }
          break
        case 1:
          if (_cursor.y < read(_arr).length - 1) {
           _cursor.y++;
          }
          break
        case 2:
          if (_cursor.y > 0) {
           _cursor.y--;
          }
          break
        case 3:
          if (_pcursor.x < read(_arr)[_cursor.y].length - 1) {
          _pcursor.x++;
        }
          break
      }
    },
    get cursor() {
      return _cursor;
    },
    get lines() {
      return read(_arr)
    },
    insert(code: string) {

      write(_arr, _ => {
        let line = _[_cursor.y]
        _[_cursor.y] = line.slice(0, _cursor.x) + code + line.slice(_cursor.x)
      })

      _cursor.x++
    }
  }

}
