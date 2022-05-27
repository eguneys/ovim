import { Pen } from './pen'

let mode_text = ['', 'Normal', 'Insert']
let mode_klass = ['', 'normal', 'insert']

function format_char(char: string) {
  if (char === undefined || char === '') {
    return ' '
  }
  return char
}

const App = () => {

  let pen = new Pen()


  return (<>
   <vi-editor autofocus={true} tabindex="0" onKeyDown={_ => pen.keyDown(_.key, _)}>
   <div class='content'>
   <For each={pen.lines.lines}>{ (line, i) => 
   <Show when={i() === pen.lines.cursor.y}
   fallback={<span>{format_char(line)}</span>}
   >
   <span>{line.slice(0, pen.lines.cursor.x)}<span class='cursor'>{format_char(line[pen.lines.cursor.x])}</span>{line.slice(pen.lines.cursor.x+1)}</span>
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
