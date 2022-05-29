import { batch, on, createEffect, createSignal, createMemo } from 'solid-js'
import { read, write, owrite } from './play'
import { make_array, make_position } from './make_util'
import { tutor } from './tutor'

const key_motion = ['h', 'j', 'k', 'l', 'b', 'w', 'e', '$', '0']

function out_of_ctx(p: string, n: string) {
  let w = !!p.match(/[a-zA-Z0-9]/),
    wn = !!n.match(/[a-zA-Z0-9 ]/)

  return (w !== wn)
}

// TODO cache
function wordize(line: string) {
  let res = []

  let ctx = ''
  for (let i = 0; i < line.length - 1; i++) {
    ctx += line[i]
    if (out_of_ctx(line[i], line[i+1])) {
      res.push(ctx)
      ctx = ''
    }
  }
  ctx += line[line.length - 1]
  if (ctx !== '') {
    res.push(ctx)
  }
  return res
}

function words_n(words: Array<string>, n: number) {
  let res = 0
  for (let i = 0; i < words.length; i++) {
    res += words[i].length
    if (res - 1 >= n) {
      return i
    }
  }
}

function words_count(words: Array<string>, n: number) {
  let res = 0
  for (let i = 0; i <= n; i++) {
    res += words[i].length
  }
  return res
}

function beginning_of_word(line: string, n: number) {
  let wz = wordize(line)
  let i = words_n(wz, n)
  return words_count(wz, i-1)
}

function end_of_word(line: string, n: number) {
  let wz = wordize(line)
  let i = words_n(wz, n)
  return words_count(wz, i) - 1
}

function start_of_next_word(line: string, n: number) {
  let wz = wordize(line)
  let i = words_n(wz, n)
  return words_count(wz, i)
}


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
      if (nb >= 80) {
        return []
      }
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


    createEffect(on(this._mode[0], (m, pm) => {
      if (m === 1 && pm === 2) {
        this.lines.escape_insert()
      } else if (m === 2 && pm === 1) {
        this.lines.begin_insert()
      }
    }))
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
    if (this.lines.intercept_mode(code)) {
      return
    }
    switch (code) {
      case 'Enter':
        break
      case 'Shift':
        break
      case 'Control':
        break
      case 'Space':
        break
      case 'Backspace':
        break
      case 'Escape':
        this.lines.escape()
        break
      case 'g':
        this.lines.set_g()
        break
      case 'G':
        this.lines.move_end_of_file()
        break
      case 'p':
        this.lines.put()
        break
      case 'u':
        this.lines.undo()
        break
      case 'r':
        this.lines.set_replace()
        break
      case 'd':
        this.lines.set_delete()
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

  let _gg_flag = createSignal(false)
  let _replace = createSignal(false)
  let _delete = createSignal(false)
  let _arr = createSignal(msg.split('\n'), { equals: false })

  let _u_cursor = make_position(0, 0)
  let _cursor = make_position(0, 0)


  let a_undos = make_array([], _ => _)

  let _yank = createSignal()

  let a_insert_undo = []

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

  let m_cursor = createMemo(() => {
    return [m_x(), _cursor.y]
  })

  createEffect(on(m_cursor, (c, pre_c) => {
    if (read(_delete)) {
      owrite(_delete, false)

      let undos = []
      if (c[1] === pre_c[1]) {
        let min_x = Math.min(c[0], pre_c[0]),
          max_x = Math.max(c[0], pre_c[0])
        undos.push(delete_between(min_x, max_x, c[1]))
        _cursor.x = min_x
      } else if (c[1] < pre_c[1]) {
        undos.unshift(delete_lines(c[1], pre_c[1]))
        _cursor.x = 0
      } else {
        undos.unshift(delete_lines(pre_c[1], c[1]))
        _cursor.x = 0
      }

      a_undos.push(() => {
        undos.forEach(_ => _())
      })
    }
  }))

  function delete_lines(y: number, y2: number = y) {
    let removed

    batch(() => {
      write(_arr, _ => {
        removed = _.splice(y, y2-y+1)
      })
      _cursor.y = Math.min(y, read(_arr).length - 1)

      owrite(_yank, removed)
    })

    return () => {
      write(_arr, _ => {
        _.splice(y, 0, ...removed)
      })

      _cursor.y = y
    }
  }

  function delete_between(x: number, x2: number, y: number) {
    let removed
    write(_arr, _ => {
      let line = _[y]
      removed = line.slice(x, x2)
      _[y] = line.slice(0, x) + line.slice(x2)
    })

    owrite(_yank, removed)
    return () => {
      write(_arr, _ => {
        let line = _[y]
        _[y] = line.slice(0, x) + removed + line.slice(x)
      })
    }
  }


  function replace_char(r: string) {
    let x = m_x()
    let old_r
    write(_arr, _ => {
      old_r = _[_cursor.y][x]
      _[_cursor.y] = _[_cursor.y].slice(0, x) + r + _[_cursor.y].slice(x + 1)
    })
    
    let _cursor_y = _cursor.y
    return () => {

      write(_arr, _ => {
        _[_cursor_y] = _[_cursor_y].slice(0, x) + old_r + _[_cursor_y].slice(x + 1)
      })
      _cursor.y = _cursor_y
    }
  }

  return {
    put() {
      let yank = read(_yank)

      if (Array.isArray(yank)) {
        let _cursor_y = _cursor.y
        let _cursor_x = m_x()


        a_undos.push(() => {
          write(_arr, _ => {
            _.splice(_cursor_y + 1, yank.length)
          })

          _cursor.y = _cursor_y
        })


        write(_arr, _ => {
          _.splice(_cursor.y + 1, 0, ...yank)
        })
        _cursor.y++
      } else if (typeof yank === 'string') {

        let line = read(_arr)[_cursor.y]
        let _cursor_y = _cursor.y
        let _cursor_x = m_x()

        a_undos.push(() => {
          write(_arr, _ => {
            _[_cursor_y] = line
          })
          _cursor.x = _cursor_x
          _cursor.y = _cursor_y
        })

        write(_arr, _ => {
          let line = _[_cursor.y]
          _[_cursor.y] = line.slice(0, m_x()+1) + yank + line.slice(m_x()+1)
        })
        _cursor.x = m_x() + 1 + yank.length
      }
    },
    undo() {
      let undo = a_undos.pop()
      batch(() => {
        undo?.()
      })
    },
    intercept_mode(code: string) {
      if (read(_gg_flag)) {
        owrite(_gg_flag, false)
        if (code === 'g') {
          _cursor.y = 0
        }
        return true
      }
      if (read(_replace)) {
        if (code.length > 1) {
          return false
        }
        owrite(_replace, false)
        a_undos.push(replace_char(code))
        return true
      }
    },
    set_replace() {
      if (read(_delete)) {
        owrite(_delete, false)
      } else if (read(_replace)) {
        owrite(_replace, false)
        a_undos.push(replace_char('r'))
      } else {
        owrite(_replace, true)
      }
    },
    set_delete() {
      if (read(_replace)) {
        owrite(_replace, false)
        a_undos.push(replace_char('d'))
        return
      }
      if (read(_delete)) {
        owrite(_delete, false)

        a_undos.push(delete_lines(_cursor.y))
      } else {
        owrite(_delete, true)
      }
    },
    get cursor_x() {
      return m_x()
    },
    break_line() {

      write(_arr, _ => {
        let broke_lines = _[_cursor.y].slice(_cursor.x)
        _[_cursor.y] = _[_cursor.y].slice(0, _cursor.x)
        _.splice(_cursor.y + 1, 0, broke_lines)
      })

      let _cursor_y = _cursor.y,
        _cursor_x = m_x()


      a_insert_undo.push(() => {
        write(_arr, _ => {
          let broken_line = _[_cursor_y + 1]
          _[_cursor_y] = _[_cursor_y].slice(0, _cursor_x) + broken_line
          _.splice(_cursor_y + 1, 1)
        })
      })


      _cursor.x = 0
      cursor_down()
    },
    newline() {

      write(_arr, _ => _.splice(_cursor.y + 1, 0, ""))

      let _cursor_y = _cursor.y

      a_insert_undo.push(() => {
        write(_arr, _ => {
          _.splice(_cursor_y + 1, 1)
        })
        _cursor.y = _cursor_y
      })


      _cursor.x = 0
      cursor_down()
    },
    end_of_line() {
      _cursor.x = read(_arr)[_cursor.y].length
    },
    motion(code: string) {
      let motion = key_motion.indexOf(code)

      let line = read(_arr)[_cursor.y]
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
        case 4:

          if (x === 0) {
            if (_cursor.y > 0) {
              let pre_line = read(_arr)[_cursor.y - 1]
              _cursor.x = beginning_of_word(pre_line, pre_line.length-1)
              _cursor.y--;
            }
          } else {
          _cursor.x = beginning_of_word(line, x - 1)
          }
          break
        case 5:
          if (x === line.length) {
            if (_cursor.y < read(_arr).length) {
              let post_line = read(_arr)[_cursor.y + 1]
              _cursor.x = start_of_next_word(post_line, 0)
              _cursor.y++;
            }
          } else {
          _cursor.x = start_of_next_word(line, x)
          }
          break
        case 6:
          if (x >= line.length - 1) {
            if (_cursor.y < read(_arr).length) {
              let post_line = read(_arr)[_cursor.y + 1]
              _cursor.x = end_of_word(post_line, 0)
              _cursor.y++;
            }
          } else {
          _cursor.x = end_of_word(line, x + 1)
          }
          break
          case 7:
            _cursor.x = Math.max(0, line.length)
            break
            case 8:
              _cursor.x = 0
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
      if (read(_delete)) {
        owrite(_delete, false)
        return
      }
      a_undos.push(delete_between(_cursor.x, _cursor.x+1, _cursor.y))
    },
    delete() {
      if (m_x() === 0) {
        return
      }

      write(_arr, _ => {
        let line = _[_cursor.y]
        _[_cursor.y] = line.slice(0, m_x() - 1) + line.slice(m_x())
      })
      _cursor.x = m_x() - 1
    },
    insert(code: string) {
      write(_arr, _ => {
        let line = _[_cursor.y]
        _[_cursor.y] = line.slice(0, m_x()) + code + line.slice(m_x())
      })
      _cursor.x = m_x() + 1
    },
    begin_insert() {
      let line = read(_arr)[_cursor.y]
      let _cursor_y = _cursor.y
      let _cursor_x = m_x()

      a_insert_undo.push(() => {
        write(_arr, _ => {
          _[_cursor_y] = line
        })
        _cursor.x = _cursor_x
        _cursor.y = _cursor_y
      })
    },
    escape_insert() {

      let _a = a_insert_undo.slice(0).reverse()
      a_undos.push(() => {
        _a.forEach(_ => _())
      })
      
      a_insert_undo = []
    },
    escape() {
      owrite(_delete, false)
    },
    move_end_of_file() {
      _cursor.y = read(_arr).length - 1
    },
    set_g() {
      owrite(_gg_flag, true)
    }
  }

}
