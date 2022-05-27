import { createMemo, createSignal, batch } from 'solid-js'
import { read, write, owrite } from './play'

import { Vec2 } from 'soli2d'



const make_id_gen = () => { let id = 0; return () => ++id }
const id_gen = make_id_gen()

export function make_position(x, y) {
  let _x = createSignal(x, { equals: false })
  let _y = createSignal(y, { equals: false })

  let m_p = createMemo(() => point(read(_x), read(_y)))

  let m_vs = createMemo(() => Vec2.make(read(_x), read(_y)))

  return {
    get point() { return m_p() },
    get x() { return read(_x) },
    set x(v: number) { owrite(_x, v) },
    get y() { return read(_y) },
    set y(v: number) { owrite(_y, v) },
    set vs(vs: Vec2) { batch(() => {
      owrite(_x, _ => lerp(_, vs.x)), owrite(_y, _ => lerp(_, vs.y))
     })
    },
    get vs() { return m_vs() },
    get clone() {
      return make_position(read(_x), read(_y))
    }
  }
}

export type Point = string

export function point(x: number, y: number) {
    return `${x} ${y} ${id_gen()}`
}

export function point_xy(p: Point) {
    return p.split(' ').map(_ => parseFloat(_))
}

export const point_zero = point(0, 0)




