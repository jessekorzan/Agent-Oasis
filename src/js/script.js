
// Main client-side script for interacting with the Oasis AI agent

// Get reference to output container
const target = document.querySelector('.out');

// Function to read Server-Sent Events stream
function readStream(reader) {
    const decoder = new TextDecoder();
    reader.read().then(({done, value}) => {
        if (done) return;

        // Parse incoming SSE data
        const events = decoder.decode(value).split('\n\n');
        events.forEach(event => {
            if (event.startsWith('data: ')) {
                const data = JSON.parse(event.slice(6));

                // Handle status updates
                if (data.status) {
                    const botSpans = target.querySelectorAll('.bot.status span');
                    const lastBotSpan = botSpans[botSpans.length - 1];
                    if (lastBotSpan) {
                        lastBotSpan.textContent = data.status;
                    }
                } else if (data.result) {
                    // Handle final response
                    handleOutput(data.result);
                }
            }
        });

        // Continue reading stream
        readStream(reader);
    });
}

// Function to display bot responses
async function handleOutput(payload) {
    const botSpans = target.querySelectorAll('.bot.status span');
    const lastBotSpan = botSpans[botSpans.length - 1];
    if (lastBotSpan) {
        lastBotSpan.innerHTML = payload;
    } else {
        target.innerHTML += `<div class="bot"><span>${payload}</span></div>`;
    }
    // Remove status indicators
    const elementsWithStatus = document.querySelectorAll('.status');
    elementsWithStatus.forEach(elem => elem.classList.remove('status'));
    // Auto-scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
}

// Function to handle user input
function handleInput(msg) {
    // Display user message
    target.innerHTML += `<div class="user"><span>${msg}</span></div>`;
    // Add loading indicator
    target.innerHTML += `<div class="bot status"><span>***</span></div>`;
    // Auto-scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
    
    // Send message to server
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

// Handle button clicks
function handleButtonClick(event) {
    const action = event.target.getAttribute('data-action');
    switch (action) {
        case 'input':
            // Handle send button click
            const input = document.querySelector('textarea').value;
            // Clear and refocus input
            document.querySelector('textarea').value = '';
            document.querySelector('textarea').focus();
            handleInput(input);
            break;
        case 'action2':
            // Reserved for future actions
            break;
        default:
            console.log('No valid action specified');
    }
}

// Initialize event listeners when page loads
window.addEventListener("load", ()=>{
    console.log("boooooooom!");
    // Add click handlers to all buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });

    // Add Enter key handler to textarea
    const textarea = document.querySelector('textarea');
    textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleButtonClick({ target: { getAttribute: () => 'input' } });
            event.preventDefault(); // Prevents newline on Enter
        }
    });

    // Display initial message
    handleOutput(`<p>'I find words really hard.' &mdash; Liam Gallagher</p>`);
    handleInput('help');
});
