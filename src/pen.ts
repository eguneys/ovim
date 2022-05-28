import { createEffect, createSignal, createMemo } from 'solid-js'
import { read, write, owrite } from './play'
import { make_position } from './make_util'
import { tutor } from './tutor'

const key_motion = ['h', 'j', 'k', 'l']

export class Pen {

  get mode() {
    return read(this._mode)
  }

  set mode(m: Mode) {
    return owrite(this._mode, m)
  }

  _$content_ref: Signal<HTMLElement>
  _$cursor_ref: Signal<HTMLElement>


  set $content_ref(ref: HTMLElement) {
    owrite(this._$content_ref, ref)
  }

  set $cursor_ref(ref: HTMLElement) {
    owrite(this._$cursor_ref, ref)
  }

  onScroll() {
    owrite(this._$clear_bounds)
  }

  constructor() {

    this._$clear_bounds = createSignal(undefined, { equals: false })

    this._$content_ref = createSignal(undefined, { equals: false })
    this._$cursor_ref = createSignal(undefined, { equals: false })

    this._mode = createSignal(1)


    this.lines = make_lines(tutor.trim())

    this.empty_lines = createMemo(() => {
      let nb = this.lines.lines.length
      return [...Array(80 - nb).keys()]
    })

    this.m_content_rect = createMemo(() => {
      read(this._$clear_bounds)
      return read(this._$content_ref)?.getBoundingClientRect()
    })

    this.m_cursor_rect = createMemo(() => {
      read(this._$clear_bounds)
      return read(this._$cursor_ref)?.getBoundingClientRect()
    })


    this.m_top_off = () => {
      let content_rect = this.m_content_rect(),
        cursor_rect = this.m_cursor_rect()

      if (content_rect && cursor_rect) {
        return content_rect.top - cursor_rect.top
      }
    }


    this.m_bottom_off = () => {
      let content_rect = this.m_content_rect(),
        cursor_rect = this.m_cursor_rect()

      if (content_rect && cursor_rect) {
        return content_rect.bottom - cursor_rect.bottom
      }
    }

    createEffect(() => {
      let res = this.m_bottom_off()
      if (res < 0) {
        read(this._$content_ref).scrollBy(0, -res)
      }
    })

    createEffect(() => {
      let res = this.m_top_off()
      if (res > 0) {
        read(this._$content_ref).scrollBy(0, -res)
      }
    })
  }

  keyDown(code: string, e: EventHandler) {
    if (this.mode === 1) {
      this.normal_down(code, e)
    } else if (this.mode === 2) {
      this.insert_down(code, e)
    }
  }

  insert_down(code: string, e: EventHandler) {
    if (e.altKey) {
    } else if (e.ctrlKey) {

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
          this.lines.delete(code)
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
      case 'x':
        this.lines.delete_under_cursor()
        break
      case 'A':
        this.lines.end_of_line()
        this.mode = 2
      default:
        this.lines.motion(code)
    }
  }
}


export const make_lines = (msg: string) => {

  let _arr = createSignal(msg.split('\n'), { equals: false })

  let _cursor = make_position(0, 0)

  function cursor_up() {
    _cursor.y--;
  }

  function cursor_down() {
    _cursor.y++
  }

  let m_x = createMemo(() => {
    let line = read(_arr)[_cursor.y]

    let l = line.length

    return Math.min(l, _cursor.x)
  })

  return {
    get cursor_x() {
      return m_x()
    },
    break_line() {
      write(_arr, _ => {
        let broke_lines = _[_cursor.y].slice(_cursor.x)
        _[_cursor.y] = _[_cursor.y].slice(0, _cursor.x)
        _.splice(_cursor.y + 1, 0, broke_lines)
      })

      _cursor.x = 0
      cursor_down()
    },
    newline() {

      write(_arr, _ => _.splice(_cursor.y + 1, 0, ""))
      _cursor.x = 0
      cursor_down()
    },
    end_of_line() {
      _cursor.x = read(_arr)[_cursor.y].length
    },
    motion(code: string) {
      let motion = key_motion.indexOf(code)

      let x = m_x()
      switch (motion) {
        case 0:
          if (x > 0) {
           _cursor.x = x - 1;
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
          if (x < read(_arr)[_cursor.y].length - 1) {
          _cursor.x = x + 1;
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
    delete_under_cursor() {
      write(_arr, _ => {
        let line = _[_cursor.y]
        _[_cursor.y] = line.slice(0, _cursor.x) + line.slice(_cursor.x + 1)
      })
    },
    delete() {
      if (_cursor.x === 0) {
        return
      }
      write(_arr, _ => {
        let line = _[_cursor.y]
        _[_cursor.y] = line.slice(0, _cursor.x - 1) + line.slice(_cursor.x)
      })
      _cursor.x--;
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
