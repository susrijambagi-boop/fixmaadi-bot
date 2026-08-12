const http = require('http');

const PORT = 3005;

const SERVICES = {
    '1': 'Purohits & Pujas 🙏',
    '2': 'Mixie / Appliance Repair 🔧',
    '3': 'Plumber 💧',
    '4': 'Electrician ⚡',
    '5': 'Beautician ✂️'
};

const userStates = {};

function handleBotMessage(userId, input) {
    const messageText = input.trim().toLowerCase();
    
    if (!userStates[userId]) {
        userStates[userId] = { step: 'NEW' };
    }

    const state = userStates[userId];

    if (state.step === 'NEW' || messageText === 'hi' || messageText === 'hello' || messageText === 'start') {
        userStates[userId].step = 'AWAITING_SERVICE';
        return `Namaskara! 🙏 Welcome to *FixMaadi Bagalkot*.\nWe provide trusted local professionals right to your doorstep.\n\nPlease reply with the *number* of the service you need:\n\n1. Purohit & Pujas 🙏\n2. Mixie / Appliance Repair 🔧\n3. Plumber 💧\n4. Electrician ⚡\n5. Beautician ✂️`;
    } 
    else if (state.step === 'AWAITING_SERVICE') {
        const selectedService = SERVICES[messageText];
        if (selectedService) {
            userStates[userId].service = selectedService;
            userStates[userId].step = 'AWAITING_LOCATION';
            return `Great, you selected *${selectedService}*.\n\nPlease reply with your *Area/Address* (e.g., Navanagar Sector 4) and *Preferred Time* (e.g., Today 5 PM).`;
        } else {
            return `Please reply with a valid number from 1 to 5:\n1. Purohit\n2. Mixie Repair\n3. Plumber\n4. Electrician\n5. Beautician`;
        }
    }
    else if (state.step === 'AWAITING_LOCATION') {
        const locationAndTime = input.trim();
        const service = userStates[userId].service;
        delete userStates[userId];
        return `✅ *Booking Received!*\n\n• Service: ${service}\n• Location & Time: ${locationAndTime}\n\nBhuvan is assigning a trusted local professional to you right now. We will call you in 10 minutes to confirm.\n\nThank you for choosing FixMaadi!`;
    }

    userStates[userId].step = 'NEW';
    return `Send "Hi" to start booking a service.`;
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FixMaadi WhatsApp Simulator</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #0b141a; display: flex; justify-content: center; align-items: center; height: 100vh; color: #e9edef; }
        .phone { width: 380px; height: 720px; background: #111b21; border-radius: 36px; border: 8px solid #222d34; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { background: #202c33; padding: 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #2a3942; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: #00a884; display: flex; justify-content: center; align-items: center; font-weight: bold; color: white; font-size: 18px; }
        .status { font-size: 12px; color: #8696a0; }
        .chat-area { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(#202c33 1px, transparent 0); background-size: 16px 16px; }
        .msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
        .msg.bot { background: #202c33; align-self: flex-start; border-top-left-radius: 0; color: #e9edef; }
        .msg.user { background: #005c4b; align-self: flex-end; border-top-right-radius: 0; color: #e9edef; }
        .input-area { background: #202c33; padding: 12px; display: flex; gap: 8px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; padding: 10px 14px; border-radius: 20px; color: #e9edef; font-size: 14px; outline: none; }
        button { background: #00a884; border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>
    <div class="phone">
        <div class="header">
            <div class="avatar">FM</div>
            <div>
                <div style="font-weight: 600;">FixMaadi Bagalkot Bot</div>
                <div class="status">Online • Official Business Account</div>
            </div>
        </div>
        <div class="chat-area" id="chat">
            <div class="msg bot">Namaskara! 🙏 Send "Hi" to start testing the FixMaadi WhatsApp bot.</div>
        </div>
        <div class="input-area">
            <input type="text" id="input" placeholder="Type a message..." onkeypress="if(event.key==='Enter') send()">
            <button onclick="send()">➔</button>
        </div>
    </div>

    <script>
        const userId = 'user_' + Math.floor(Math.random() * 10000);
        function send() {
            const inp = document.getElementById('input');
            const txt = inp.value.trim();
            if (!txt) return;
            
            appendMsg(txt, 'user');
            inp.value = '';

            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: txt })
            })
            .then(res => res.json())
            .then(data => {
                appendMsg(data.reply, 'bot');
            });
        }

        function appendMsg(text, sender) {
            const chat = document.getElementById('chat');
            const div = document.createElement('div');
            div.className = 'msg ' + sender;
            div.innerText = text;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
    } else if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const reply = handleBotMessage(data.userId || 'default', data.message || '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n📱 FixMaadi WhatsApp Web Simulator running at: http://localhost:${PORT}`);
});
