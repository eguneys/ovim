import { onMount, onCleanup } from 'solid-js'
import { Pen } from './pen'

let mode_text = ['', 'Normal', 'Insert']
let mode_klass = ['', 'normal', 'insert']

function format_char(char: string) {
  if (char === undefined || char === '') {
    return ' '
  }
  return char
}

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): Unbind {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

type Unbind = () => void


const App = () => {

  let pen = new Pen()

  let unbinds = []

  unbinds.push(unbindable(document, 'scroll', () => pen.onScroll(), { capture: true, passive: true }))
  unbinds.push(unbindable(window, 'resize', () => pen.onScroll(), { passive: true }))
 
  onCleanup(() => {
    unbinds.forEach(_ => _())
      })



  return (<>
   <vi-editor autofocus={true} tabindex="0" onKeyDown={_ => pen.keyDown(_.key, _)}>
   <div ref={_ => setTimeout(() => pen.$content_ref = _)} class='content'>
   <For each={pen.lines.lines}>{ (line, i) => 
   <Show when={i() === pen.lines.cursor.y}
   fallback={<span>{format_char(line)}</span>}
   >
   <span>{line.slice(0, pen.lines.cursor_x)}<span ref={_ => setTimeout(() => pen.$cursor_ref = _)} class='cursor'>{format_char(line[pen.lines.cursor_x])}</span>{line.slice(pen.lines.cursor_x+1)}</span>
   </Show>
   }</For>
   <For each={pen.empty_lines()}>{line =>
     <span>~</span>
   }</For>
   </div>
   <div class='status'>
     <span class={['mode', mode_klass[pen.mode]].join(' ')}>{mode_text[pen.mode]}</span>
   </div>
   </vi-editor>
      </>)
}

export default App
