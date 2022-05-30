import { onMount, onCleanup } from 'solid-js'

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


const App = pen => () => {

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
     <Line pen={pen} line={line} i={i()}/>
     }</For>
   <For each={pen.empty_lines()}>{line =>
     <span>~</span>
   }</For>
   </div>
   <div class='status'>
     <Show when={pen.lines.command}
     fallback= {
     <span class={['mode', mode_klass[pen.mode]].join(' ')}>{mode_text[pen.mode]}</span>
     }>{ value =>
      <span>{value}</span>
     }</Show>
   </div>
   <div class='prompt'>
     <span>{pen.prompt}</span>
   </div>
   </vi-editor>
      </>)
}

const Line = props => {


  let { pen } = props

  let klass = () => (pen.line_klasses(props.i) || []).join(' ')

  return (<Show when={props.i === pen.lines.cursor.y}
      fallback={<span class={klass()}>{format_char(props.line)}</span>}
      >
      <span class={klass()}>{props.line.slice(0, pen.lines.cursor_x)}<span ref={_ => setTimeout(() => pen.$cursor_ref = _)} class='cursor'>{format_char(props.line[pen.lines.cursor_x])}</span>{props.line.slice(pen.lines.cursor_x+1)}</span>
      </Show>)

}

export default App
