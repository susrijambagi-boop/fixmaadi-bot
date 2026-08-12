const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const SERVICES = {
    '1': 'Purohits & Pujas 🙏',
    '2': 'Mixie / Appliance Repair 🔧',
    '3': 'Plumber 💧',
    '4': 'Electrician ⚡',
    '5': 'Beautician ✂️'
};

const userStates = {};

async function startBot() {
    console.log('\n===================================================');
    console.log('🚀 Starting FixMaadi Automated WhatsApp Engine...');
    console.log('===================================================\n');

    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n===================================================');
            console.log('📱 FIXMAADI BOT PAIRING QR CODE');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Go to Settings / Menu -> Linked Devices -> Link a Device');
            console.log('3. Point your phone camera at the QR code below:');
            console.log('===================================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`\nConnection dropped (code ${statusCode}). Reconnecting: ${shouldReconnect}...`);
            if (shouldReconnect) {
                setTimeout(startBot, 2000);
            }
        } else if (connection === 'open') {
            console.log('\n===================================================');
            console.log('✅ FIXMAADI WHATSAPP BOT IS LIVE AND CONNECTED!');
            console.log('📱 Phone number linked successfully.');
            console.log('💬 Ask your friend to send "Hi" to this number now!');
            console.log('===================================================\n');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (msg.key.fromMe) continue;
            
            const userId = msg.key.remoteJid;
            if (!userId || !userId.endsWith('@s.whatsapp.net')) continue;

            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
            if (!text) continue;

            const lowerText = text.toLowerCase();
            const senderPhone = userId.replace('@s.whatsapp.net', '');
            console.log(`\n📩 [Incoming Message] From: +${senderPhone} | Content: "${text}"`);

            if (!userStates[userId]) {
                userStates[userId] = { step: 'NEW' };
            }

            const currentState = userStates[userId];

            if (currentState.step === 'NEW' || lowerText === 'hi' || lowerText === 'hello' || lowerText === 'start') {
                const welcomeMsg = `Namaskara! 🙏 Welcome to *FixMaadi Bagalkot*.\nWe provide trusted local professionals right to your doorstep.\n\nPlease reply with the *number* of the service you need:\n\n1. Purohit & Pujas 🙏\n2. Mixie / Appliance Repair 🔧\n3. Plumber 💧\n4. Electrician ⚡\n5. Beautician ✂️`;
                
                await sock.sendMessage(userId, { text: welcomeMsg });
                userStates[userId].step = 'AWAITING_SERVICE';
                console.log(`📤 [Reply Sent to +${senderPhone}]: Welcome & Service Menu`);
            }
            else if (currentState.step === 'AWAITING_SERVICE') {
                const selectedService = SERVICES[lowerText];
                if (selectedService) {
                    userStates[userId].service = selectedService;
                    userStates[userId].step = 'AWAITING_LOCATION';
                    
                    const promptMsg = `Great! You selected *${selectedService}*.\n\nPlease reply with your *Area/Address* (e.g., Navanagar Sector 4) and *Preferred Time* (e.g., Today 5 PM).`;
                    await sock.sendMessage(userId, { text: promptMsg });
                    console.log(`📤 [Reply Sent to +${senderPhone}]: Prompted for Location & Time`);
                } else {
                    await sock.sendMessage(userId, { text: `Please reply with a number from 1 to 5:\n\n1. Purohit\n2. Mixie Repair\n3. Plumber\n4. Electrician\n5. Beautician` });
                }
            }
            else if (currentState.step === 'AWAITING_LOCATION') {
                const locationAndTime = text;
                const service = userStates[userId].service;
                userStates[userId].step = 'COMPLETED';

                const confirmMsg = `✅ *Booking Received!*\n\n• Service: ${service}\n• Location & Time: ${locationAndTime}\n\nBhuvan is assigning a trusted local professional to you right now. We will call you in 10 minutes to confirm.\n\nThank you for choosing FixMaadi!`;
                await sock.sendMessage(userId, { text: confirmMsg });

                console.log(`\n🎉 ===================================================`);
                console.log(`🎉 NEW FIXMAADI BOOKING RECEIVED!`);
                console.log(`   Customer Phone: +${senderPhone}`);
                console.log(`   Service:        ${service}`);
                console.log(`   Location/Time:  ${locationAndTime}`);
                console.log(`🎉 ===================================================\n`);

                delete userStates[userId];
            }
        }
    });
}

startBot();
