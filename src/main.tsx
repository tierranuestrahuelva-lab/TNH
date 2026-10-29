import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/500.css'
import '@fontsource/fira-sans/600.css'
import '@fontsource/fira-sans/700.css'
import '@fontsource/fira-sans-condensed/500.css'
import '@fontsource/fira-sans-condensed/600.css'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js')
