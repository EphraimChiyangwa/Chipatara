import './style.css'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import App from './App'

createRoot(document.getElementById('app')!).render(createElement(App))
