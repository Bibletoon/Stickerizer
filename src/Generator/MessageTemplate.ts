import handlebars from "handlebars";

const MessageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --border-color: #fff;
            --background-color:  #182533;
            --title-color: {{ titleColor }};
            --text-color: #fff;
        }

        body {
            margin: 0;
            padding: 0;
            border: 0;
            font-family: 'Open Sans', sans-serif;
            font-size: 20px;
        }

        .sizer {
            width: 512px;
            height: 512px;
        }

        .container {
            transform-origin: top left;
            display: flex;
            flex-direction: row;
            width: fit-content;
            max-width: 512px;
            max-height: 512px;
            overflow-y: hidden;
            align-items: flex-end;
        }

        .avatar-container {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid white;
            margin-right: -10px;
            background: white;
        }

        .avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
        }

        .avatar-alt {
            background-color: var(--title-color);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            text-align: center;
            font-family: 'Open Sans', sans-serif;
            font-size: 40px;
            line-height: 48px;
        }

        .message {
            --r: 25px;
            --t: 25px;
            background-color: var(--border-color);
            -webkit-mask:
                    radial-gradient(var(--t) at var(--_d) 0,#0000 98%,#000 102%)
                    var(--_d) 100%/calc(100% - var(--r)) var(--t) no-repeat,
                    conic-gradient(at var(--r) var(--r),#000 75%,#0000 0)
                    calc(var(--r)/-2) calc(var(--r)/-2) padding-box,
                    radial-gradient(50% 50%,#000 98%,#0000 101%)
                    0 0/var(--r) var(--r) space padding-box;
            --_d: 0%;
            border-left: 25px solid #0000;
            place-self: start;
        }

        .bubble {
            --r: 25px;
            --t: 15px;
            min-width: 80px;

            padding: calc(2 * var(--r) / 4) calc(2 * var(--r) / 3);
            -webkit-mask: radial-gradient(var(--t) at var(--_d) 0, #0000 98%, #000 102%) var(--_d) 100%/calc(100% - var(--r)) var(--t) no-repeat,
            conic-gradient(at var(--r) var(--r), #000 75%, #0000 0) calc(var(--r) / -2) calc(var(--r) / -2) padding-box,
            radial-gradient(50% 50%, #000 98%, #0000 101%) 0 0/var(--r) var(--r) space padding-box;
            background: var(--background-color) border-box;
            color: var(--text-color);
            --_d: 0%;
            border-left: 15px solid #0000;
            margin: 2px 2px 2px -13px;
            place-self: start;
            display: flex;
            flex-direction: column;
        }

        .title {
            color: var(--title-color);
            font-weight: 600;
        }
    </style>
    <title>Document</title>
</head>
<body>
<div class="sizer">
    <div class="container">
        <div class="avatar-container">
            {{#if (isEmpty avatarUrl) }}
                <div class="avatar-alt">
                    <span>{{ firstChar name }}</span>
                </div>
            {{ else }}
                <img class="avatar" src="{{ avatarUrl }}"/>
            {{/if }}
        </div>
        <div class="message">
            <div class="bubble left">
                <span class="title">{{ name }}</span>
                <span class="content">{{ content }}</span>
            </div>
        </div>
    </div>
</div>
<script>
    let scaledWrapper = document.getElementsByClassName('sizer')[0];
    let scaledContent = scaledWrapper.getElementsByClassName('container')[0];
    scaledContent.style.transform = 'scale(1, 1)';

    let { width: cw, height: ch } = scaledContent.getBoundingClientRect();
    let { width: ww, height: wh } = scaledWrapper.getBoundingClientRect();

    let scale = Math.min(ww / cw, wh / ch);

    scaledContent.style.transform = 'scale('+scale+','+scale+')';
</script>
</body>
</html>
`

handlebars.registerHelper('firstChar', (s: string) => s[0])
handlebars.registerHelper('isEmpty', (s: string) => (!s || s.length === 0))

const MessageTemplate = handlebars.compile(MessageHtml);

export default MessageTemplate;