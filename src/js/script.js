// interact with EH-JENT 

const target = document.querySelector('.out');

function readStream(reader) {
    const decoder = new TextDecoder();
    reader.read().then(({done, value}) => {
        if (done) return;

        const events = decoder.decode(value).split('\n\n');
        events.forEach(event => {
            if (event.startsWith('data: ')) {
                const data = JSON.parse(event.slice(6));

                if (data.status) {
                    const botSpans = target.querySelectorAll('.bot.status span');
                    const lastBotSpan = botSpans[botSpans.length - 1];
                    if (lastBotSpan) {
                        lastBotSpan.textContent = data.status;
                    }
                } else if (data.result) {
                    handleOutput(data.result);
                }
            }
        });

        readStream(reader);
    });
}

async function handleOutput(payload) {
    const botSpans = target.querySelectorAll('.bot.status span');
    const lastBotSpan = botSpans[botSpans.length - 1];
    if (lastBotSpan) {
        lastBotSpan.innerHTML = payload;
    } else {
        target.innerHTML += `<div class="bot"><span>${payload}</span></div>`;
    }
    // cleanup
    const elementsWithStatus = document.querySelectorAll('.status');
    elementsWithStatus.forEach(elem => elem.classList.remove('status'));
    // Scroll to the bottom of the page
    window.scrollTo(0, document.body.scrollHeight);
}

function handleInput(msg) {
    target.innerHTML += `<div class="user"><span>${msg}</span></div>`;
    target.innerHTML += `<div class="bot status"><span>***</span></div>`;
    // Scroll to the bottom of the page
    window.scrollTo(0, document.body.scrollHeight);
    fetch('/api/in', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: msg })
    }).then(response => {
        const reader = response.body.getReader();
        readStream(reader);
    })
    .catch(error => console.error('Error:', error));
}

function handleButtonClick(event) {
    const action = event.target.getAttribute('data-action');
    switch (action) {
        case 'input':
            // user sends a thing
            const input = document.querySelector('textarea').value;

            // Clear the textarea and refocus
            document.querySelector('textarea').value = '';
            document.querySelector('textarea').focus();
            handleInput(input);
            break;
        case 'action2':
            // perform action 2
            break;
        default:
            console.log('No valid action specified');
    }
}

window.addEventListener("load", ()=>{
    console.log("boooooooom!");
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });

    const textarea = document.querySelector('textarea');
    textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleButtonClick({ target: { getAttribute: () => 'input' } });
            event.preventDefault(); // Prevents newline on Enter keypress
        }
    });

    handleOutput(`<p>'I find words really hard.' &mdash; Liam Gallagher</p>`)
});