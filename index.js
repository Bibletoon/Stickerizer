const nodeHtmlToImage = require('node-html-to-image')
const fs = require('node:fs')

const html = fs.readFileSync('./index.html').toString();

const colorsMap = {
    0: '#5dadde',
    1: '#79ca7b',
    2: '#e39552',
    3: '#e35a62',
    4: '#a480dd',
    5: '#5ac1d0',
    6: '#e75089'
}

const parameters = {
    name: 'Bibletoon',
    content: 'Тильт',
    avatarUrl: 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRg4ssN2cbXadGOtKZm2b4e1tTTzjQV_tpxau2wFoOJgurg_KPR',
    titleColor: colorsMap[6]
}

nodeHtmlToImage({
    output: './image.png',
    html: html,
    transparent: true,
    selector: '.container',
    handlebarsHelpers: {
        firstChar: (s) => s[0],
        isEmpty: (s) => (!s || s.length === 0 )
    },
    content: parameters
}).then(() => console.log('Image generated successfully'));

