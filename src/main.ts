import './index.css'
import { render } from 'solid-js/web'

import { Pen } from './pen'
import App from './view'

export default function VPro(element: HTMLElement, options = {}) {

  let pen = new Pen(options.on_command)
  render(App(pen), element)

  return {
    get content() {
      return pen.content
    }
  }
}
