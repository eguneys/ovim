import { createSignal } from 'solid-js'
import { Vec2 } from 'soli2d'


export function owrite(signal, fn) {
  if (typeof fn === 'function') {
    return signal[1](fn)
  } else {
    signal[1](_ => fn)
  }
}

export function write(signal, fn) {
  return signal[1](_ => {
    fn(_)
    return _
  })
}

export function read(signal) {
  if (Array.isArray(signal)) {
    return signal[0]()
  } else {
    return signal()
  }
}



export class DragDecay {
  static make = (drag: MouseDrag, orig: Vec2, target: any, no_start: boolean = false) => {
    return new DragDecay(drag, orig, target, no_start)
  }


  get move() {
    return Vec2.make(...this.drag.move).add(this.decay)
  }

  get translate() {
    return Vec2.make(...this.drag.move).sub(this.start)
  }

  get drop() {
    return this.drag.drop
  }


  constructor(readonly drag: MouseDrag,
              readonly orig: Vec2, 
              readonly target: any,
              readonly no_start: boolean) {
                this.start = Vec2.make(...(no_start ? drag.move : drag.start))
                this.decay = orig.sub(this.start)
              }
}
