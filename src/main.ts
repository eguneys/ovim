import './index.css'
import { render } from 'solid-js/web'

import { Pen } from './pen'
import App from './view'
import { tutor } from './tutor'

export default function VPro(element: HTMLElement, options = {}) {

  let pen = new Pen(options.content || tutor.trim(), options.on_command)
  render(App(pen), element)

  return {
    set prompt(prompt: string) {
      pen.prompt = prompt
    },
    set content(content: string) {
      pen.content = content
    },
    get content() {
      return pen.content
    },
    line_klass(i: number, v: string) {
      if (!v) {
        pen.lines.clear_klass(i)
      } else {
        pen.lines.add_klass(i, v)
      }
    },
    clear_lines() {
      pen.lines.clear_lines()
    }
  }
}
