const fs = require('fs')
const path = require('path')

;(() => {
  const file = path.join(__dirname, '../dist/airdrop/index.html')
  const html = fs.readFileSync(file).toString()

  const newHtml = html.replace(
    '</head>',
    `</head>`
  )
  fs.writeFileSync(file, newHtml, 'utf-8')
})()
