import './index.css'
import { render } from 'solid-js/web'

import App from './view'

export default function VPro(element: HTMLElement) {
  render(App, element)
}
