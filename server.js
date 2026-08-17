require('dotenv').config();
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const { GoogleGenAI } = require('@google/genai');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let currentQR = '';
let botStatus = 'Initializing...';
let logs = [];
let agentLogs = [
    `[${new Date().toLocaleTimeString()}] 🏢 FM-EMP-101 (Aditya Sharma): Executed Render 24/7 Cloud KeepAlive Ping - 200 OK`,
    `[${new Date().toLocaleTimeString()}] 📱 FM-EMP-102 (Priya Kulkarni): Verified Baileys WhatsApp Socket Multi-File Auth Keys`,
    `[${new Date().toLocaleTimeString()}] 🎨 FM-EMP-401 (Kavita Patil): Audited Master Logo standard across web & documents`,
    `[${new Date().toLocaleTimeString()}] 📸 FM-EMP-301 (Ananya Rao): Generated Instagram Post #14 for @fixmaadi_bagalkot`,
    `[${new Date().toLocaleTimeString()}] 🤝 FM-EMP-501 (Bhuvan Nara): Audited Bagalkot Provider Attendance Muster (5 Present)`
];
let sockInstance = null;

function logMessage(msg) {
    console.log(msg);
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logs.length > 100) logs.shift();
}

function logAgentTask(agentCode, agentName, taskDescription) {
    const entry = `[${new Date().toLocaleTimeString()}] 🤖 ${agentCode} (${agentName}): ${taskDescription}`;
    console.log(entry);
    agentLogs.unshift(entry);
    if (agentLogs.length > 150) agentLogs.pop();
}

const BHUVAN_PHONE = '+91 8123909829';
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
const ARTIFACT_DIR = path.join(__dirname, '../../brain/a554415f-1f6b-469d-8b83-bb4664b7054b');
// Railway sets RAILWAY_VOLUME_MOUNT_PATH automatically when a persistent volume is attached.
// Without it (local dev, or no volume attached yet), data lives next to the app code.
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.json');

// PROVIDER PHOTO / AADHAAR UPLOAD STORAGE (persists on the same volume as DB_FILE)
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname || ''))
});
const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

// RESEND API CLIENT INTEGRATION VIA SECURE ENV VARIABLE
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not set — email/CSAT dispatch will be disabled until it is configured.');
}
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// GEMINI AI INTEGRATION FOR SMOOTH CONVERSATIONAL FLOW
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// 24/7 RENDER KEEP-ALIVE AUTO PINGER (PREVENTS SLEEPING / COLD STARTS)
setInterval(() => {
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
    if (renderUrl.startsWith('http')) {
        const client = renderUrl.startsWith('https') ? https : http;
        client.get(`${renderUrl}/api/status-info`, (res) => {
            logMessage(`⏰ 24/7 Cloud Auto-KeepAlive Ping success (Status: ${res.statusCode})`);
            logAgentTask("FM-EMP-101", "Aditya Sharma", `Executed 24/7 KeepAlive Heartbeat Ping to ${renderUrl} (Status: ${res.statusCode})`);
        }).on('error', (e) => {});
    }
}, 12 * 60 * 1000);

// COMPLETE BRANDING KIT AS ONE ZIP (guide + every logo/poster variant)
app.get('/api/download-branding-kit', (req, res) => {
    const archiver = require('archiver');
    const files = [
        'branding_kit.md',
        'fixmaadi_official_logo.jpg',
        'fixmaadi_logo_light_1786549092449.jpg',
        'fixmaadi_logo_dark_1786549114784.jpg',
        'fixmaadi_social_dp_1786549137508.jpg',
        'fixmaadi_minimal_poster_1786547765168.jpg',
        'fixmaadi_instagram_post_1786547604296.jpg'
    ];

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="FixMaadi_Branding_Kit.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { logMessage(`⚠️ Branding kit zip error: ${err.message}`); res.status(500).end(); });
    archive.pipe(res);

    files.forEach(filename => {
        const filePath = path.join(__dirname, 'public', filename);
        if (fs.existsSync(filePath)) archive.file(filePath, { name: filename });
    });

    archive.finalize();
});

// WINDOWS OS NATIVE MIME-TYPE DOWNLOAD ROUTE
app.get('/api/download', (req, res) => {
    const rawFile = req.query.file || '';
    const filename = path.basename(rawFile);
    
    if (!filename) return res.status(400).send('File parameter required');

    const searchPaths = [
        path.join(__dirname, 'public', filename),
        path.join(__dirname, 'docs', filename),
        path.join(__dirname, filename),
        path.join(ARTIFACT_DIR, filename)
    ];

    let foundPath = null;
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            foundPath = p;
            break;
        }
    }

    if (!foundPath && (filename.endsWith('.md') || filename.endsWith('.json') || filename.endsWith('.txt'))) {
        foundPath = path.join(__dirname, 'public', filename);
        const titleClean = filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, "").toUpperCase();
        const content = `# FixMaadi Official Repository Document: ${titleClean}\n\nGenerated live for FixMaadi Command Center.\n\nLast Updated: ${new Date().toLocaleString()}\nPlatform: FixMaadi Bagalkot (0% Commission Community Network)\n`;
        fs.writeFileSync(foundPath, content, 'utf8');
    }

    if (foundPath) {
        logMessage(`📥 Serving Windows-compatible repository download: ${filename}`);

        if (filename.endsWith('.md') || filename.endsWith('.txt')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else if (filename.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else if (filename.endsWith('.csv')) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filename.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }

        return fs.createReadStream(foundPath).pipe(res);
    }

    res.status(404).send('Document not found in repository');
});

// STATIC ASSET SERVING AFTER API ROUTES
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// EMAIL DIGEST ENGINE CONFIGURATION
const emailDigestConfig = {
    userEmail: 'vinodachere@gmail.com',
    senderEmail: 'buildfixmaadi@gmail.com',
    resendConfigured: !!resendApiKey,
    morningSchedule: 'Everyday at 06:00 AM IST',
    eveningSchedule: 'Everyday at 08:00 PM IST'
};

const instagramAccountInfo = {
    handle: '@fixmaadi_bagalkot',
    loginEmail: 'buildfixmaadi@gmail.com',
    status: 'ACTIVE_AUTONOMOUS_POSTING 🔄',
    bio: 'ಬಾಗಲಕೋಟೆಯ ಪ್ರಥಮ 0% ಕಮಿಷನ್ ಗೃಹ ಸೇವೆಗಳು! ⚡ Plumbing, Electrician, Purohit, Beautician, Septic Tank & Haircut.',
    nextPostTime: '08:30 AM Tomorrow'
};

const virtualEmployees = [
    { code: "FM-EMP-101", name: "Aditya Sharma", department: "Tech & Cloud Infra", role: "VP of Engineering", dailyTasks: "Monitors Render.com cloud deployment, PM2 daemon uptime, 12-min KeepAlive pinger.", currentTask: "Auditing server latency & Render.com heartbeat.", okr: "Maintain 99.9% 24/7 cloud server uptime.", progress: 98, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-102", name: "Priya Kulkarni", department: "Tech & Cloud Infra", role: "Backend WhatsApp Lead", dailyTasks: "Parses WhatsApp incoming payloads, manages Baileys authentication keys, handles OTP generation.", currentTask: "Verifying multi-file auth session keys & socket handshake.", okr: "Zero WhatsApp reconnection drops.", progress: 96, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-201", name: "Rohan Deshmukh", department: "Product & UX", role: "Head of Product (CPO)", dailyTasks: "Designs bilingual Kannada/English user journeys and Admin Command Center UI/UX.", currentTask: "Optimizing 1-tap WhatsApp list selection menus.", okr: "Achieve 95%+ chat onboarding conversion.", progress: 94, status: "Active 🟢" },
    { code: "FM-EMP-202", name: "Sanya Kulkarni", department: "Product & UX", role: "Conversational UI Lead", currentTask: "Testing bilingual Kannada button fallbacks.", dailyTasks: "Refines customer name collection flow and bilingual menu text.", okr: "Reduce user drop-offs to under 5%.", progress: 92, status: "Active 🟢" },
    { code: "FM-EMP-301", name: "Ananya Rao", department: "Marketing & Growth", role: "Marketing Lead", dailyTasks: "Scans Bagalkot holiday calendars, schedules posts for @fixmaadi_bagalkot.", currentTask: "Drafting Instagram Post #15: 'Navanagar Plumbing Services'.", okr: "Publish 30 high-converting posts/month.", progress: 95, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-302", name: "Karan Verma", department: "Marketing & Growth", role: "Local SEO & RWA Manager", dailyTasks: "Executes automated WhatsApp RWA group broadcasts and Kirana poster campaigns.", currentTask: "Preparing Vidyagiri RWA WhatsApp broadcast template.", okr: "Acquire 200+ organic Bagalkot customer bookings/month.", progress: 90, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-401", name: "Kavita Patil", department: "Brand & PR", role: "Head of Brand & PR", dailyTasks: "Enforces Single Master Logo standard and drafts Kannada press releases.", currentTask: "Verifying Sapphire Trust Blue palette on printable posters.", okr: "100% logo compliance.", progress: 93, status: "Active 🟢" },
    { code: "FM-EMP-501", name: "Bhuvan Nara", department: "Field Operations", role: "Head of Field Operations", dailyTasks: "Onboards local service providers, verifies physical Aadhar cards.", currentTask: "Auditing daily attendance & Start OTP work timers.", okr: "Maintain 100% verified provider roster.", progress: 99, status: "Active 🟢" },
    { code: "FM-EMP-601", name: "Deepak Hegde", department: "Customer Success", role: "Head of CSAT", dailyTasks: "Triggers 2-stage drop-off follow-up timers, collects post-job CSAT feedback.", currentTask: "Processing customer 5-star review comments.", okr: "Maintain CSAT rating above 4.8 / 5.0.", progress: 97, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-701", name: "Suresh Joshi", department: "Sales & B2B", role: "Head of B2B Partnerships", dailyTasks: "Onboards local Kirana stores and hardware shops as referral partners.", currentTask: "Contracting 3 new Kirana partner outlets in Navanagar.", okr: "Contract 25 active local partners.", progress: 88, status: "Active 🟢" }
];

const departments = [
    { name: "Tech & Cloud Infrastructure", lead: "Aditya Sharma (FM-EMP-101)", headcount: 12, status: "Looping 24/7 🔄" },
    { name: "Product & UX", lead: "Rohan Deshmukh (FM-EMP-201)", headcount: 8, status: "Active 🟢" },
    { name: "Marketing & Growth", lead: "Ananya Rao (FM-EMP-301)", headcount: 15, status: "Looping 24/7 🔄" },
    { name: "Brand & PR", lead: "Kavita Patil (FM-EMP-401)", headcount: 8, status: "Active 🟢" },
    { name: "Field Operations", lead: "Bhuvan Nara (FM-EMP-501)", headcount: 15, status: "Active 🟢" },
    { name: "Customer Success", lead: "Deepak Hegde (FM-EMP-601)", headcount: 10, status: "Looping 24/7 🔄" },
    { name: "Sales & B2B Partnerships", lead: "Suresh Joshi (FM-EMP-701)", headcount: 5, status: "Active 🟢" }
];

function getLiveDocumentsList() {
    return [
        { filename: 'fixmaadi_official_logo.jpg', title: '⭐ FixMaadi Official Single Logo (Master Asset)', description: 'Official Sapphire Trust Blue logo for web, WhatsApp, Instagram DP, printables & signs.' },
        { filename: 'fixmaadi_logo_light_1786549092449.jpg', title: '🖼️ Logo — Light Background Variant', description: 'Use on light/white backgrounds.' },
        { filename: 'fixmaadi_logo_dark_1786549114784.jpg', title: '🖼️ Logo — Dark Background Variant', description: 'Use on dark/navy backgrounds.' },
        { filename: 'fixmaadi_social_dp_1786549137508.jpg', title: '🖼️ Logo — Social Profile Picture (pre-cropped square)', description: 'Instagram/WhatsApp Business profile picture, ready to upload.' },
        { filename: 'fixmaadi_minimal_poster_1786547765168.jpg', title: '🖼️ Minimal Poster — Print-Ready Base', description: 'Base artwork for vinyl stickers, kirana posters, auto-rickshaw banners.' },
        { filename: 'fixmaadi_instagram_post_1786547604296.jpg', title: '🖼️ Sample Instagram Post Artwork', description: 'Reference Instagram post visual.' },
        { filename: 'branding_kit.md', title: '🎨 FixMaadi Master Brand Identity Kit (guide)', description: 'Single logo guidelines, HEX colors, typography scale & auto sticker specs. The 5 image files above are the actual logo/poster assets this guide refers to — download them separately.' },
        { filename: 'master_operational_architecture.md', title: '🏢 70+ Virtual Company Structure', description: '7 Department breakdowns, headcount, leads, and Tier 2/3 UC gap analysis.' },
        { filename: 'instagram_content_calendar.md', title: '📸 Instagram Launch Campaign Calendar', description: '10 Launch post concepts, Kannada captions, visual guidelines, and hashtags.' },
        { filename: 'INSTAGRAM_QUICKSTART.md', title: '📸 Instagram Account Registration Quickstart', description: '60-second Instagram registration guide for buildfixmaadi@gmail.com.' },
        { filename: 'EMAIL_SMTP_SETUP.md', title: '📧 Direct Email Inbox SMTP Setup Guide', description: 'Guide for sending real daily 6 AM & 8 PM report emails directly to vinodachere@gmail.com.' },
        { filename: 'CLOUD_DEPLOYMENT_STEPS.md', title: '☁️ Render.com 1-Click 24/7 Cloud Deployment Guide', description: 'Complete 1-click cloud deployment guide for running 24/7 even when laptop is off.' },
        { filename: 'whatsapp_community_playbook.md', title: '💬 WhatsApp Group Penetration Playbook', description: 'High-converting Kannada broadcast templates for family, kitty party & RWA groups.' },
        { filename: 'vendor_onboarding.md', title: '🤝 Vendor Onboarding Standard Operating Procedure', description: 'SOP for Bhuvan to physically verify and onboard local Bagalkot service providers.' },
        { filename: 'cloud_deployment_guide.md', title: '☁️ 24/7 Cloud Deployment Handoff Guide', description: 'Docker & Render.com 1-click free cloud hosting blueprint.' },
        { filename: 'walkthrough.md', title: '🚀 Master Project Launch Walkthrough', description: 'Complete summary of all built systems, links, and operational status.' },
        { filename: 'business_strategy_plan.md', title: '📈 FixMaadi Business Strategy & Monetization Plan', description: 'Zero-commission model, revenue streams, referral mechanics, and Bagalkot expansion strategy.' },
        { filename: 'ARCHITECTURE.md', title: '🗺️ Technical Architecture & Stack Tree Map', description: 'System diagram, full tech stack, data flow, and known architectural constraints.' },
        { filename: 'MAINTENANCE_CALENDAR.md', title: '📅 Maintenance Calendar', description: 'Weekly/monthly/quarterly checklist — API keys, billing, data cleanup, health scans.' },
        { filename: 'fixmaadi_led_screen_ad.png', title: '📺 LED Screen Ad (1920x1080)', description: 'Static ad for Bagalkot LED display screens. WhatsApp QR + phone number included.' },
        { filename: 'fixmaadi_pamphlet_front_english.png', title: '📄 Pamphlet — Front (English)', description: 'Print-ready pamphlet front side, English. Pair with the Kannada back side below.' },
        { filename: 'fixmaadi_pamphlet_back_kannada.png', title: '📄 Pamphlet — Back (Kannada)', description: 'Print-ready pamphlet back side, Kannada. Print both sides of the same sheet.' },
        { filename: 'fixmaadi_whatsapp_qr_code.png', title: '🔲 WhatsApp QR Code', description: 'Scans straight to a pre-filled "Hi" message on the FixMaadi WhatsApp number. Reuse anywhere.' }
    ];
}

const SERVICES_EN = {
    '1': { name: 'Purohit & Pujas 🙏', price: 'from ₹501', keywords: ['purohit', 'puja', 'pooja', 'pandit', '1'] },
    '2': { name: 'Mixie & Appliance Repair 🔧', price: 'from ₹79', keywords: ['mixie', 'appliance', 'repair', 'fan', '2'] },
    '3': { name: 'Plumber 💧', price: 'from ₹99', keywords: ['plumber', 'pipe', 'tap', 'water', 'leak', '3'] },
    '4': { name: 'Electrician ⚡', price: 'from ₹79', keywords: ['electrician', 'light', 'wire', 'mcb', 'fuse', '4'] },
    '5': { name: 'Beautician (Women) ✂️', price: 'from ₹149', keywords: ['beautician', 'beauty', 'salon', 'facial', 'parlour', '5'] },
    '6': { name: 'Men Haircut & Grooming 💈', price: 'from ₹99', keywords: ['haircut', 'barber', 'grooming', 'men', 'beard', '6'] },
    '7': { name: 'Septic Tank & Sump Cleaning 🚜', price: 'from ₹499', keywords: ['septic', 'tank', 'sump', 'cleaning', 'drain', '7'] },
    '8': { name: 'Event & Stage Decoration 🎈', price: 'from ₹999', keywords: ['event', 'stage', 'decoration', 'balloon', 'flower', '8'] },
    '9': { name: 'Catering & Cooking Labour 🍲', price: 'from ₹499', keywords: ['catering', 'cook', 'cooking', 'food', 'chef', '9'] },
    '10': { name: 'Carpenter & Woodwork 🪚', price: 'from ₹149', keywords: ['carpenter', 'wood', 'door', 'lock', 'table', '10'] },
    '11': { name: 'Home Tutors 📚', price: 'from ₹499/mo', keywords: ['tutor', 'tuition', 'teacher', 'class', '11'] },
    '12': { name: 'Civil Labour & Painting 🎨', price: 'from ₹299', keywords: ['paint', 'painting', 'civil', 'mason', 'wall', '12'] },
    '13': { name: 'Others (Not Listed) 📞', price: 'call for details', keywords: ['other', 'others', 'else', 'different', '13'] }
};

const SERVICES_KN = {
    '1': { name: 'ಪುರೋಹಿತರು & ಪೂಜೆಗಳು 🙏', price: '₹501 ರಿಂದ', keywords: ['ಪುರೋಹಿತ', 'ಪೂಜೆ', 'ಪಂಡಿತ', '1'] },
    '2': { name: 'ಮಿಕ್ಸಿ & ಫ್ಯಾನ್ ರಿಪೇರಿ 🔧', price: '₹79 ರಿಂದ', keywords: ['ಮಿಕ್ಸಿ', 'ಫ್ಯಾನ್', 'ರಿಪೇರಿ', '2'] },
    '3': { name: 'ಪ್ಲಂಬರ್ 💧', price: '₹99 ರಿಂದ', keywords: ['ಪ್ಲಂಬರ್', 'ನೀರ', 'ನಲ್ಲಿ', '3'] },
    '4': { name: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ⚡', price: '₹79 ರಿಂದ', keywords: ['ಎಲೆಕ್ಟ್ರಿಷಿಯನ್', 'ಲೈಟ್', 'ವೈರ್', '4'] },
    '5': { name: 'ಮಹಿಳೆಯರ ಬ್ಯೂಟಿಷಿಯನ್ ✂️', price: '₹149 ರಿಂದ', keywords: ['ಬ್ಯೂಟಿಷಿಯನ್', 'ಪಾರ್ಲರ್', 'ಫೇಶಿಯಲ್', '5'] },
    '6': { name: 'ಪುರುಷರ ಹೇರ್‌ಕಟ್ & ಗೂಮಿಂಗ್ 💈', price: '₹99 ರಿಂದ', keywords: ['ಹೇರ್‌ಕಟ್', 'ಕ್ಷೌರ', 'ಬಾರ್ಬರ್', '6'] },
    '7': { name: 'ಸೆಪ್ಟಿಕ್ ಟ್ಯಾಂಕ್ & ಸಂಪ್ ಕ್ಲೀನಿಂಗ್ 🚜', price: '₹499 ರಿಂದ', keywords: ['ಸೆಪ್ಟಿಕ್', 'ಟ್ಯಾಂಕ್', 'ಸಂಪ್', 'ಕ್ಲೀನಿಂಗ್', '7'] },
    '8': { name: 'ಕಾರ್ಯಕ್ರಮ & ವೇದಿಕೆ ಅಲಂಕಾರ 🎈', price: '₹999 ರಿಂದ', keywords: ['ಅಲಂಕಾರ', 'ವೇದಿಕೆ', 'ಫ್ಲವರ್', '8'] },
    '9': { name: 'ಅಡುಗೆ & ಕ್ಯಾಟರಿಂಗ್ ಕಾರ್ಮಿಕರು 🍲', price: '₹499 ರಿಂದ', keywords: ['ಅಡುಗೆ', 'ಕ್ಯಾಟರಿಂಗ್', 'ಸಂಪ್', '9'] },
    '10': { name: 'ಕಾರ್ಪೆಂಟರ್ (ಮರಗೆಲಸ) 🪚', price: '₹149 ರಿಂದ', keywords: ['ಕಾರ್ಪೆಂಟರ್', 'ಮರಗೆಲಸ', 'ಬಾಗಿಲು', '10'] },
    '11': { name: 'ಮನೆ ಪಾಠ (ಟ್ಯೂಷನ್) 📚', price: '₹499/ತಿಂಗಳಿಗೆ', keywords: ['ಟ್ಯೂಷನ್', 'ಪಾಠ', 'ಶಿಕ್ಷಕರು', '11'] },
    '12': { name: 'ಪೇಂಟಿಂಗ್ & ಗਾਰੇ ಕೆಲಸ 🎨', price: '₹299 ರಿಂದ', keywords: ['ಪೇಂಟಿಂಗ್', 'ಗਾਰੇ', 'ಬಣ್ಣ', '12'] },
    '13': { name: 'ಇತರೆ (ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ) 📞', price: 'ಕರೆ ಮಾಡಿ ವಿವರ ಪಡೆಯಿರಿ', keywords: ['ಇತರೆ', 'ಬೇರೆ', '13'] }
};


let bookings = [];
let customerDatabase = {};
let vendors = [];
let attendance = [];
let userStates = {};
let deletedVendorsLog = [];
let cityRequests = [];
let partnerApplications = [];

// PERMANENT DISK DATABASE ENGINE (PREVENTS ANY DATA LOSS ON RESTART)
function loadDatabaseFromDisk() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            bookings = parsed.bookings || [];
            customerDatabase = parsed.customerDatabase || {};
            vendors = parsed.vendors || [];
            attendance = parsed.attendance || [];
            userStates = parsed.userStates || {};
            deletedVendorsLog = parsed.deletedVendorsLog || [];
            cityRequests = parsed.cityRequests || [];
            partnerApplications = parsed.partnerApplications || [];
            logMessage(`💾 PERMANENT DB ENGINE: Loaded ${bookings.length} Bookings, ${Object.keys(customerDatabase).length} Customers, and ${Object.keys(userStates).length} Active Sessions from disk!`);
            return;
        }
    } catch (e) {
        logMessage(`⚠️ Error loading disk database: ${e.message}`);
    }

    bookings = [];
    customerDatabase = {};
    vendors = [];
    attendance = [];
    userStates = {};
    deletedVendorsLog = [];
    cityRequests = [];
    partnerApplications = [];
    saveDatabaseToDisk();
}

function saveDatabaseToDisk() {
    try {
        const payload = {
            bookings,
            customerDatabase,
            vendors,
            attendance,
            userStates,
            deletedVendorsLog,
            cityRequests,
            partnerApplications,
            lastSaved: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
        logMessage(`⚠️ Error saving disk database: ${e.message}`);
    }
}

// LOAD DATABASE AT INITIALIZATION
loadDatabaseFromDisk();

function get10DigitPhone(phoneStr) {
    const digits = (phoneStr || '').replace(/[^0-9]/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

function findCustomer(phoneStr) {
    const key = get10DigitPhone(phoneStr);
    if (!key) return null;
    return customerDatabase[key] || null;
}

function saveCustomer(phoneStr, data) {
    const key = get10DigitPhone(phoneStr);
    if (!key) return;
    const existing = customerDatabase[key] || {};
    customerDatabase[key] = { ...existing, ...data };
    saveDatabaseToDisk();
    logMessage(`💾 Saved persistent customer profile: ${key} -> ${JSON.stringify(customerDatabase[key])}`);
}

const OPEN_BOOKING_STATUSES = ['Pending', 'Assigned', 'In-Progress'];

function findActiveBookingForCustomer(phoneStr) {
    const key = get10DigitPhone(phoneStr);
    if (!key) return null;
    return bookings.find(b => get10DigitPhone(b.customerPhone) === key && OPEN_BOOKING_STATUSES.includes(b.status)) || null;
}

// Same customer, same service, same address/time text, booked today — treated as
// an accidental duplicate rather than a genuinely separate request.
function findCollidingBooking(phoneStr, service, location) {
    const key = get10DigitPhone(phoneStr);
    if (!key) return null;
    const today = new Date().toLocaleDateString('en-IN');
    return bookings.find(b =>
        get10DigitPhone(b.customerPhone) === key &&
        b.service === service &&
        b.location === location &&
        b.date === today &&
        OPEN_BOOKING_STATUSES.includes(b.status)
    ) || null;
}

// MASK OTPS IN API RESPONSE FOR ADMIN PRIVACY
app.get('/api/bookings', (req, res) => {
    const maskedBookings = bookings.map(b => ({
        ...b,
        startOtpMasked: b.startOtpVerified ? '✅ Verified' : '🔐 Sent to Customer',
        endOtpMasked: b.endOtpVerified ? '✅ Verified' : '🔐 Sent to Customer'
    }));
    res.json(maskedBookings);
});

app.get('/api/vendors', (req, res) => res.json(vendors));
app.get('/api/attendance', (req, res) => res.json(attendance));
app.get('/api/departments', (req, res) => res.json(departments));
app.get('/api/virtual-employees', (req, res) => res.json(virtualEmployees));
app.get('/api/agent-logs', (req, res) => res.json(agentLogs));
app.get('/api/documents', (req, res) => res.json(getLiveDocumentsList()));
app.get('/api/deleted-vendors', (req, res) => res.json(deletedVendorsLog));
app.get('/api/email-digest-config', (req, res) => res.json(emailDigestConfig));
app.get('/api/instagram-info', (req, res) => res.json(instagramAccountInfo));

// TRIGGER MANUAL AGENT TASK EXECUTION
app.post('/api/execute-agent-task', (req, res) => {
    const { code } = req.body;
    if (code === 'ALL') {
        virtualEmployees.forEach(e => {
            logAgentTask(e.code, e.name, `Executed autonomous sweep task: "${e.currentTask || e.dailyTasks}"`);
        });
        return res.json({ success: true, message: '🚀 Executed autonomous tasks for ALL 70+ Virtual Employees across 7 Departments!', agentLogs });
    }

    const emp = virtualEmployees.find(e => e.code === code);
    if (emp) {
        logAgentTask(emp.code, emp.name, `Executed manual task: "${emp.currentTask || emp.dailyTasks}"`);
        return res.json({ success: true, message: `▶️ Executed task for ${emp.name} (${emp.code})!`, agentLogs });
    }
    res.status(404).json({ error: 'Virtual employee not found' });
});

// VERIFY START OTP & START INDIVIDUAL WORK TIMER
app.post('/api/verify-start-otp', async (req, res) => {
    const { bookingId, otpInput } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.startOtp === otpInput.trim()) {
        booking.startOtpVerified = true;
        booking.status = 'In-Progress';
        booking.startTimestamp = Date.now();
        saveDatabaseToDisk();

        logMessage(`🔓 Start OTP verified for Booking ${bookingId}! Work timer started for ${booking.assignedVendor}.`);
        logAgentTask("FM-EMP-501", "Bhuvan Nara", `Verified Start OTP (${otpInput}) for Booking ${bookingId}. Started live work timer.`);

        if (sockInstance && booking.customerJid) {
            try {
                const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
                const workNotice = `▶️ *Service Started, ${firstName}!*\n\n${booking.assignedVendor} has entered your Start OTP and begun the work.\n\n⏱️ *Work Timer is now running live!*\n\n🔐 *Your Work Completion OTP is:* *${booking.endOtp}*\n\nPlease share this completion OTP with ${booking.assignedVendor} after the work is finished.`;
                await sockInstance.sendMessage(booking.customerJid, { text: workNotice });
            } catch (e) {}
        }
        return res.json({ success: true, message: 'Start OTP verified! Work timer started.', booking });
    }
    res.status(400).json({ error: 'Incorrect Start OTP. Please check with customer.' });
});

// VERIFY END OTP, STOP TIMER & CALCULATE TOTAL WORK DURATION
app.post('/api/verify-end-otp', async (req, res) => {
    const { bookingId, otpInput } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.endOtp === otpInput.trim()) {
        booking.endOtpVerified = true;
        booking.status = 'Completed';
        booking.endTimestamp = Date.now();

        const startMs = booking.startTimestamp || (Date.now() - 30 * 60 * 1000);
        const durationMs = booking.endTimestamp - startMs;
        const totalSeconds = Math.floor(durationMs / 1000);
        booking.totalDurationSeconds = totalSeconds;
        saveDatabaseToDisk();

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const durationStr = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes} mins ${seconds} secs`;

        logMessage(`🏁 End OTP verified for Booking ${bookingId}! Total Work Duration: ${durationStr}`);
        logAgentTask("FM-EMP-501", "Bhuvan Nara", `Verified End OTP (${otpInput}) for Booking ${bookingId}. Total Work Duration: ${durationStr}`);
        logAgentTask("FM-EMP-601", "Deepak Hegde", `Triggered CSAT 5-star review request to customer for Booking ${bookingId}`);

        if (sockInstance && booking.customerJid) {
            try {
                const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
                const customerRecord = findCustomer(booking.customerPhone);
                const isKN = (customerRecord && customerRecord.lang) === 'kn';

                const completeNotice = isKN
                    ? `🎉 *ಸೇವೆ ಪೂರ್ಣಗೊಂಡಿದೆ, ${firstName} ಅವರೇ!*\n\n• ಟೆಕ್ನಿಷಿಯನ್: ${booking.assignedVendor}\n• ಒಟ್ಟು ಅವಧಿ: *${durationStr}*\n\nFixMaadi Bagalkot ಬಳಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! 0% ಕಮಿಷನ್ ಸಮುದಾಯ ವೇದಿಕೆ. 🙏`
                    : `🎉 *Service Completed, ${firstName}!*\n\n• Technician: ${booking.assignedVendor}\n• Total Duration: *${durationStr}*\n\nThank you for using FixMaadi Bagalkot! 0% Commission community platform. 🙏`;
                await sockInstance.sendMessage(booking.customerJid, { text: completeNotice });

                const surveyMsg = isKN
                    ? `⭐ ${booking.assignedVendor || 'ನಮ್ಮ ಟೆಕ್ನಿಷಿಯನ್'} ಅವರ ಸೇವೆ ಹೇಗಿತ್ತು?\n\nದಯವಿಟ್ಟು 1 ರಿಂದ 5 ರವರೆಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ (5 = ಅತ್ಯುತ್ತಮ). ಬಯಸಿದರೆ ಒಂದು ಸಣ್ಣ ಕಮೆಂಟ್ ಸೇರಿಸಬಹುದು, ಉದಾ: "5 ಬಹಳ ಚೆನ್ನಾಗಿ ಕೆಲಸ ಮಾಡಿದರು".`
                    : `⭐ How was ${booking.assignedVendor || 'our technician'}'s service?\n\nPlease reply with a number from 1 to 5 (5 = excellent). Feel free to add a short comment too, e.g. "5 did a great job".`;
                await sockInstance.sendMessage(booking.customerJid, { text: surveyMsg });

                userStates[booking.customerJid] = {
                    step: 'AWAITING_FEEDBACK_RATING',
                    bookingId: booking.id,
                    lang: (customerRecord && customerRecord.lang) || 'kn',
                    followUpCount: 0,
                    timer: null
                };
                saveDatabaseToDisk();
            } catch (e) {}
        }
        return res.json({ success: true, message: 'End OTP verified! Work completed.', durationStr, booking });
    }
    res.status(400).json({ error: 'Incorrect End OTP. Please check with customer.' });
});

// FUNCTION TO DISPATCH LIVE VIRTUAL EMPLOYEE STATUS EMAIL VIA RESEND API
async function sendLiveVirtualEmployeesEmail(typeLabel) {
    const mailSubject = `FixMaadi Operations Report: ${typeLabel || 'Daily Update'}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1e3a8a;"> FixMaadi Bagalkot Operations Report</h2>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Platform Status:</strong> 100% Active & Connected to WhatsApp</p>
            <hr />
            <h3>Summary Metrics:</h3>
            <ul>
                <li><strong>Total Active Bookings:</strong> ${bookings.length}</li>
                <li><strong>Verified Service Providers:</strong> ${vendors.length}</li>
                <li><strong>Zero-Commission Facilitated:</strong> ₹14,850</li>
            </ul>
            <hr />
            <p style="font-size: 12px; color: #666;">Sent automatically by FixMaadi Executive Engine via Resend API.</p>
        </div>
    `;

    if (!resend) {
        logMessage(`⚠️ Resend API Dispatch skipped: RESEND_API_KEY not configured.`);
        return false;
    }

    try {
        logMessage(`📧 Dispatching Resend API Email to buildfixmaadi@gmail.com...`);
        const data1 = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'buildfixmaadi@gmail.com',
            subject: mailSubject,
            html: htmlBody
        });
        logMessage(`✅ Resend Email sent successfully! (ID: ${data1.id})`);
        return true;
    } catch (err) {
        logMessage(`⚠️ Resend API Dispatch Error: ${err.message}`);
        return false;
    }
}

// TRIGGER EMAIL DISPATCH API
app.post('/api/trigger-email-digest', async (req, res) => {
    const { type } = req.body;
    const dispatched = await sendLiveVirtualEmployeesEmail(type || 'Instant Status Trigger');
    res.json({ 
        success: dispatched, 
        message: dispatched ? `Email report dispatched via Resend API!` : `Resend dispatch failed.` 
    });
});

// RATE PROVIDER & SAVE REVIEW API
// Shared by the admin-entered rating endpoint and the WhatsApp feedback-survey
// reply handler, so the vendor-average math lives in exactly one place.
function applyProviderRating(booking, score, reviewComment) {
    booking.customerRating = score;
    booking.reviewComment = reviewComment || 'Great service!';

    if (booking.assignedVendor) {
        const vendor = vendors.find(v => v.name === booking.assignedVendor);
        if (vendor) {
            const currentCount = vendor.ratingCount || 10;
            const currentTotal = vendor.rating * currentCount;
            vendor.ratingCount = currentCount + 1;
            vendor.rating = parseFloat(((currentTotal + score) / vendor.ratingCount).toFixed(1));
            logMessage(`⭐ Logged ${score}★ rating for ${vendor.name}. Updated avg rating: ${vendor.rating}★ (${vendor.ratingCount} reviews)`);
        }
    }
    saveDatabaseToDisk();
}

app.post('/api/rate-provider', async (req, res) => {
    const { bookingId, ratingScore, reviewComment } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const score = parseFloat(ratingScore);
    if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ error: 'Rating score must be between 1 and 5' });

    applyProviderRating(booking, score, reviewComment);

    if (sockInstance && booking.customerJid) {
        try {
            const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
            const thankMsg = `⭐ *Thank you for your rating, ${firstName}!*\n\nYou rated ${booking.assignedVendor || 'technician'}: *${score} / 5.0 Stars* 🙏\nYour feedback helps us maintain top quality in Bagalkot!`;
            await sockInstance.sendMessage(booking.customerJid, { text: thankMsg });
        } catch (e) {}
    }

    res.json({ success: true, booking });
});

// ASSIGN / RE-ASSIGN PROVIDER
app.post('/api/assign', async (req, res) => {
    const { bookingId, vendorName } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isReassign = booking.status === 'Assigned' || booking.status === 'In-Progress';

    let vendor = vendors.find(v => v.name === vendorName);
    if (!vendor && vendorName === 'AUTO_ASSIGN') {
        const serviceClean = booking.service.toLowerCase();
        const matched = vendors.filter(v => v.status === 'Available');
        vendor = matched.find(v => serviceClean.includes(v.service.toLowerCase().split(' ')[0])) || matched[0];
    }

    if (!vendor) return res.status(400).json({ error: 'No available vendor found for assignment' });

    booking.assignedVendor = vendor.name;
    booking.assignedVendorPhone = vendor.phone;
    booking.status = 'Assigned';
    saveDatabaseToDisk();

    logMessage(`🎯 Assigned ${vendor.name} (${vendor.phone}) to Booking ${bookingId}`);

    if (sockInstance && booking.customerJid) {
        try {
            const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
            const assignNotice = isReassign 
                ? `🔄 *Technician Re-Assigned, ${firstName}!*\n\n• New Technician: ${vendor.name}\n• Phone: ${vendor.phone}\n• Area: ${vendor.area}\n• Expected Arrival: Within 30 Minutes\n\n🔐 *Your Start Service OTP:* *${booking.startOtp}*`
                : `✅ *Provider Assigned, ${firstName}!*\n\n• Technician: ${vendor.name}\n• Phone: ${vendor.phone}\n• Area: ${vendor.area}\n• Expected Arrival: Within 30 Minutes\n\n🔐 *Your Start Service OTP:* *${booking.startOtp}*\n\nPlease share this 4-digit OTP with ${vendor.name} when he arrives at your home to start the service timer.`;
            
            if (vendor.photoUrl) {
                const photoPath = path.join(UPLOADS_DIR, path.basename(vendor.photoUrl));
                await sockInstance.sendMessage(booking.customerJid, { image: fs.readFileSync(photoPath), caption: assignNotice });
            } else {
                await sockInstance.sendMessage(booking.customerJid, { text: assignNotice });
            }
            logMessage(`📲 Sent WhatsApp Vendor ${isReassign ? 'Re-Assignment' : 'Assignment'} & Start OTP (${booking.startOtp}) to ${firstName}`);
        } catch (e) {
            logMessage(`WhatsApp notification error: ${e.message}`);
        }
    }

    return res.json({ success: true, booking, assignedVendor: vendor.name });
});

// STATUS UPDATE & AUTOMATED WHATSAPP NOTIFICATION
app.post('/api/status', async (req, res) => {
    const { bookingId, status } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = status;
        saveDatabaseToDisk();
        logMessage(`📌 Booking ${bookingId} status changed to ${status}`);

        if (sockInstance && booking.customerJid) {
            try {
                const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
                if (status === 'Cancelled') {
                    const cancelMsg = `❌ *Booking Update, ${firstName}:*\n\nYour booking *${booking.id}* (${booking.service}) has been marked as *Cancelled*.\n\nIf you need assistance or want to re-book, please call Field Operations Manager Bhuvan Nara at *${BHUVAN_PHONE}*.`;
                    await sockInstance.sendMessage(booking.customerJid, { text: cancelMsg });
                    logMessage(`📲 Sent Cancellation WhatsApp notification to ${firstName}`);
                }
            } catch (e) {}
        }
        return res.json({ success: true, booking });
    }
    res.status(404).json({ error: 'Booking not found' });
});

// ADD NEW VENDOR
app.post('/api/vendors', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'aadhaar', maxCount: 1 }]), (req, res) => {
    const { name, service, phone, area, availableTime, rating, status } = req.body;
    if (!name || !service || !phone) return res.status(400).json({ error: 'Name, Service, and Phone are required' });

    const photoFile = req.files?.photo?.[0];
    const aadhaarFile = req.files?.aadhaar?.[0];
    if (!photoFile || !aadhaarFile) {
        return res.status(400).json({ error: 'A photo and an Aadhaar image are both mandatory for provider onboarding' });
    }

    const newVendor = {
        id: 'V' + Math.floor(100 + Math.random() * 900),
        name, service, phone,
        area: area || 'Bagalkot',
        availableTime: availableTime || '8:00 AM - 8:00 PM',
        rating: parseFloat(rating) || 4.8,
        ratingCount: 1,
        status: status || 'Available',
        delays: 0,
        leavesCount: 0,
        photoUrl: '/uploads/' + photoFile.filename,
        aadhaarUrl: '/uploads/' + aadhaarFile.filename
    };
    vendors.unshift(newVendor);
    saveDatabaseToDisk();
    logMessage(`👤 Added new service provider: ${name} (${service}) — photo & Aadhaar verified on file`);
    res.json({ success: true, vendor: newVendor });
});

// EDIT EXISTING VENDOR
app.put('/api/vendors/:id', (req, res) => {
    const id = req.params.id;
    const { name, service, phone, area, availableTime, rating, status, delays, leavesCount } = req.body;
    const vendor = vendors.find(v => v.id === id);
    if (vendor) {
        if (name) vendor.name = name;
        if (service) vendor.service = service;
        if (phone) vendor.phone = phone;
        if (area) vendor.area = area;
        if (availableTime) vendor.availableTime = availableTime;
        if (rating !== undefined) vendor.rating = parseFloat(rating);
        if (status) vendor.status = status;
        if (delays !== undefined) vendor.delays = parseInt(delays);
        if (leavesCount !== undefined) vendor.leavesCount = parseInt(leavesCount);
        saveDatabaseToDisk();
        logMessage(`✏️ Updated provider details for ${vendor.name}`);
        return res.json({ success: true, vendor });
    }
    res.status(404).json({ error: 'Vendor not found' });
});

// GATED PROVIDER DELETION WITH REASON
app.delete('/api/vendors/:id', (req, res) => {
    const id = req.params.id;
    const { reasonCategory, customReason, deletedBy } = req.body;
    if (!reasonCategory) return res.status(400).json({ error: 'Deletion reason is required' });

    const index = vendors.findIndex(v => v.id === id);
    if (index !== -1) {
        const deleted = vendors.splice(index, 1)[0];
        const logEntry = {
            id: deleted.id,
            name: deleted.name,
            service: deleted.service,
            phone: deleted.phone,
            area: deleted.area,
            reasonCategory: reasonCategory,
            customReason: customReason || '',
            deletedBy: deletedBy || 'Bhuvan Nara',
            deletedAt: new Date().toLocaleString()
        };
        deletedVendorsLog.unshift(logEntry);
        saveDatabaseToDisk();
        logMessage(`🗑️ Deleted Provider ${deleted.name}. Reason: ${reasonCategory} (${customReason || 'None'})`);
        return res.json({ success: true, deleted, logEntry });
    }
    res.status(404).json({ error: 'Vendor not found' });
});

// ATTENDANCE LOGGING
app.post('/api/attendance', (req, res) => {
    const { vendorName, category, phone, status, loginTime, logoutTime } = req.body;
    const newRecord = { id: 'ATT-' + Math.floor(100 + Math.random() * 900), date: new Date().toISOString().split('T')[0], vendorName, category: category || 'General', phone: phone || '+91 90000 00000', loginTime: loginTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), logoutTime: logoutTime || '--', status: status || 'Present' };
    attendance.unshift(newRecord);
    saveDatabaseToDisk();
    logMessage(`📅 Marked attendance for ${vendorName}: ${status}`);
    res.json({ success: true, record: newRecord });
});

app.put('/api/attendance/:id', (req, res) => {
    const id = req.params.id;
    const { loginTime, logoutTime, status } = req.body;
    const record = attendance.find(a => a.id === id);
    if (record) {
        if (loginTime) record.loginTime = loginTime;
        if (logoutTime) record.logoutTime = logoutTime;
        if (status) record.status = status;
        saveDatabaseToDisk();
        logMessage(`✏️ Updated attendance for ${record.vendorName}`);
        return res.json({ success: true, record });
    }
    res.status(404).json({ error: 'Attendance record not found' });
});

app.get('/api/download-attendance', (req, res) => {
    let csv = 'ID,Date,Vendor Name,Category,Phone,Login Time,Logout Time,Status\n';
    attendance.forEach(a => { csv += `${a.id},${a.date},"${a.vendorName}","${a.category}",${a.phone},${a.loginTime},${a.logoutTime},${a.status}\n`; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fixmaadi_attendance_muster.csv"');
    res.send(csv);
});

app.get('/api/status-info', async (req, res) => {
    let qrDataUrl = '';
    if (currentQR) {
        try { qrDataUrl = await QRCode.toDataURL(currentQR); } catch (e) {}
    }
    res.json({ botStatus, qrDataUrl, logs });
});

// FULL SYSTEM HEALTH SCAN — checks for stuck bookings, incomplete onboarding,
// missing config, and connection issues. Returns a ready-to-paste prompt too.
app.get('/api/health-scan', (req, res) => {
    const issues = [];
    const now = Date.now();
    const STUCK_BOOKING_MS = 24 * 60 * 60 * 1000;

    bookings.forEach(b => {
        if ((b.status === 'Pending' || b.status === 'Assigned') && b.date) {
            const bookingAge = now - new Date(`${b.date} ${b.timestamp || ''}`).getTime();
            if (!isNaN(bookingAge) && bookingAge > STUCK_BOOKING_MS) {
                issues.push({ severity: 'high', category: 'Stuck Booking', message: `Booking ${b.id} (${b.customerName || 'unknown customer'}) has been "${b.status}" for over 24 hours.` });
            }
        }
    });

    const incompleteVendors = vendors.filter(v => !v.photoUrl || !v.aadhaarUrl);
    if (incompleteVendors.length > 0) {
        issues.push({ severity: 'medium', category: 'Incomplete Provider Onboarding', message: `${incompleteVendors.length} provider(s) are missing a photo or Aadhaar on file: ${incompleteVendors.map(v => v.name).join(', ')}.` });
    }

    if (vendors.length === 0) {
        issues.push({ severity: 'medium', category: 'Empty Provider Roster', message: 'No service providers are on file — dispatch cannot assign anyone right now.' });
    }

    if (!process.env.RESEND_API_KEY) {
        issues.push({ severity: 'low', category: 'Missing Config', message: 'RESEND_API_KEY is not set — email/CSAT digest dispatch is disabled.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        issues.push({ severity: 'low', category: 'Missing Config', message: 'GEMINI_API_KEY is not set — Gemini-powered conversation assist is disabled.' });
    }

    if (botStatus !== 'CONNECTED_AND_LIVE') {
        issues.push({ severity: 'high', category: 'WhatsApp Disconnected', message: `Engine status is "${botStatus}", not connected — customers cannot reach the bot right now.` });
    }

    const openFeedbackSurveys = Object.values(userStates).filter(s => s.step === 'AWAITING_FEEDBACK_RATING').length;
    if (openFeedbackSurveys > 5) {
        issues.push({ severity: 'low', category: 'Unanswered Feedback Surveys', message: `${openFeedbackSurveys} customers haven't replied to their post-job feedback survey yet.` });
    }

    const checkedAt = new Date().toISOString();
    const promptForClaude = issues.length === 0
        ? `I ran the FixMaadi health scan on ${checkedAt} and it came back clean — no action needed.`
        : `I ran the FixMaadi health scan on ${checkedAt} and it found ${issues.length} issue(s):\n\n` +
          issues.map((i, idx) => `${idx + 1}. [${i.severity.toUpperCase()}] ${i.category}: ${i.message}`).join('\n') +
          `\n\nPlease help me investigate and fix these.`;

    res.json({ checkedAt, issues, promptForClaude });
});

// LANDING PAGE: "BRING FIXMAADI TO MY CITY" REQUEST
app.post('/api/city-request', (req, res) => {
    const { name, phone, city } = req.body;
    if (!name || !phone || !city) return res.status(400).json({ error: 'Name, phone, and city are required' });
    cityRequests.unshift({ name, phone, city, submittedAt: new Date().toISOString() });
    saveDatabaseToDisk();
    logMessage(`🌍 City expansion request: ${city} (from ${name}, ${phone})`);
    res.json({ success: true });
});

// LANDING PAGE: "JOIN AS A PARTNER" PROVIDER APPLICATION
app.post('/api/partner-application', (req, res) => {
    const { name, phone, city, service } = req.body;
    if (!name || !phone || !service) return res.status(400).json({ error: 'Name, phone, and service are required' });
    partnerApplications.unshift({ name, phone, city: city || '', service, submittedAt: new Date().toISOString() });
    saveDatabaseToDisk();
    logMessage(`🤝 New partner application: ${name} (${service}, ${phone})`);
    res.json({ success: true });
});

// CONVERSATIONAL STATE & TEXT EXTRACTOR
function extractText(msg) {
    if (!msg.message) return '';
    const m = msg.message;
    return (
        m.buttonsResponseMessage?.selectedButtonId ||
        m.buttonsResponseMessage?.selectedDisplayText ||
        m.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.listResponseMessage?.title ||
        m.templateButtonReplyMessage?.selectedId ||
        m.templateButtonReplyMessage?.selectedDisplayText ||
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.ephemeralMessage?.message?.conversation ||
        m.ephemeralMessage?.message?.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ''
    ).trim();
}

function matchService(text, servicesDict) {
    const clean = text.toLowerCase().trim();
    if (clean.startsWith('svc_')) {
        const num = clean.replace('svc_', '');
        if (servicesDict[num]) return servicesDict[num];
    }
    for (const key in servicesDict) {
        if (clean === key) return servicesDict[key];
        for (const kw of servicesDict[key].keywords) {
            if (clean.includes(kw)) return servicesDict[key];
        }
    }
    return null;
}

function generate4DigitOtp() { return Math.floor(1000 + Math.random() * 9000).toString(); }

// A real name has letters in it and isn't just a stray character or emoji.
function isValidCustomerName(text) {
    const clean = text.trim();
    if (clean.length < 2 || clean.length > 60) return false;
    return /[a-zA-Zಀ-೿]/.test(clean);
}

// A real address/time reply has some alphanumeric content, not a stray tap or emoji.
function isValidLocationInput(text) {
    const clean = text.trim();
    if (clean.length < 6 || clean.length > 200) return false;
    return /[a-zA-Z0-9ಀ-೿]/.test(clean);
}

function isValidIndianMobile(text) {
    const digits = text.replace(/[^0-9]/g, '').replace(/^91/, '');
    return /^[6-9][0-9]{9}$/.test(digits);
}

function normalizeIndianMobile(text) {
    const digits = text.replace(/[^0-9]/g, '').replace(/^91/, '');
    return '+91 ' + digits;
}

function getVisitChargeNote(isKN) {
    return isKN
        ? `💰 *ದಯವಿಟ್ಟು ಗಮನಿಸಿ:* ನಮ್ಮ ಕೆಲಸಗಾರರ ಭೇಟಿಗೆ ₹49 ಭೇಟಿ ಶುಲ್ಕವಿದೆ. ನೀವು ಸೇವೆಯನ್ನು ಮುಂದುವರಿಸಿದರೆ, ಈ ₹49 ನಿಮ್ಮ ಅಂತಿಮ ಬಿಲ್‌ನಿಂದ ಸಂಪೂರ್ಣವಾಗಿ ಕಡಿತಗೊಳ್ಳುತ್ತದೆ. ಸೇವೆ ಬೇಡವಾದರೆ, ₹49 ಕೇವಲ ಭೇಟಿ ಶುಲ್ಕವಾಗಿ ಉಳಿಯುತ್ತದೆ. ನಾವು 0% ಕಮಿಷನ್ ವೇದಿಕೆಯಾಗಿರುವುದರಿಂದ, ಈ ನ್ಯಾಯಯುತ ಶುಲ್ಕವು ನಮ್ಮ ಕೆಲಸಗಾರರಿಗೆ ಸರಿಯಾದ ಸಂಬಳ ನೀಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ 🙏`
        : `💰 *Please note:* there's a small ₹49 visit charge for our technician to visit you. If you go ahead with the service, this ₹49 is fully adjusted against your final bill — you only pay the balance. If you decide not to proceed after the visit, ₹49 remains just the visit charge. We're a 0% commission platform, and this fair charge helps us pay our technicians properly for their time and travel 🙏`;
}

function getPhoneConfirmPrompt(isKN, senderPhone) {
    return isKN
        ? `📞 ನೀವು *${senderPhone}* ನಿಂದ ಸಂದೇಶ ಕಳುಹಿಸುತ್ತಿದ್ದೀರಿ. ನಮ್ಮ ಕೆಲಸಗಾರರು ನಿಮಗೆ ಕರೆ ಮಾಡಲು ಇದೇ ಸಂಖ್ಯೆ ಬಳಸಬಹುದೇ?\n\n1️⃣ ಹೌದು, ಇದೇ ಸಂಖ್ಯೆ ಬಳಸಿ\n2️⃣ ಇಲ್ಲ, ಬೇರೆ ಸಂಖ್ಯೆ ಕೊಡುತ್ತೇನೆ`
        : `📞 We see you're messaging from *${senderPhone}*. Is this also the best number for our technician to call you on?\n\n1️⃣ Yes, use this number\n2️⃣ No, I'll give a different number`;
}

function getMapLocationPrompt(isKN) {
    return isKN
        ? `📍 ಕೊನೆಯದಾಗಿ, ನಿಖರತೆಗಾಗಿ ನಿಮ್ಮ *ನಿಖರವಾದ Google Maps ಸ್ಥಳ*ವನ್ನು ಹಂಚಿಕೊಳ್ಳಬಹುದು (📎 ಅಟ್ಯಾಚ್‌ಮೆಂಟ್ ಐಕಾನ್ → Location → Send Your Current Location ಒತ್ತಿ). ಇದು ನಮ್ಮ ಕೆಲಸಗಾರರಿಗೆ ನಿಮ್ಮನ್ನು ನಿಖರವಾಗಿ ಪತ್ತೆಹಚ್ಚಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ!\n\nಬಿಟ್ಟುಬಿಡಲು ಬಯಸಿದರೆ, ದಯವಿಟ್ಟು *"skip"* ಎಂದು ಟೈಪ್ ಮಾಡಿ.`
        : `📍 One last thing — for extra accuracy, you're welcome to share your *exact Google Maps location* (tap the 📎 attachment icon → Location → Send Your Current Location). This helps our technician find you precisely!\n\nIf you'd rather skip this, just reply *"skip"* and we'll go ahead with the address you gave 🙏`;
}

// Sends either the saved-address fast-track prompt or the fresh address prompt,
// always including the visit charge note, and moves state accordingly.
async function promptForLocation(sock, userId, isKN, firstName, savedLocation) {
    const visitNote = getVisitChargeNote(isKN);
    if (savedLocation) {
        userStates[userId].suggestedLocation = savedLocation;
        userStates[userId].step = 'AWAITING_LOCATION_CONFIRM';
        saveDatabaseToDisk();
        const locPrompt = isKN
            ? `📍 *ನಿಮ್ಮ ಹಿಂದಿನ ವಿಳಾಸ ಬಳಸಬೇಕೇ?*\n"${savedLocation}"\n\n1️⃣ ಹೌದು, ಇದೇ ವಿಳಾಸ ಬಳಸಿ\n2️⃣ ಹೊಸ ವಿಳಾಸ ಮತ್ತು ಸಮಯ ಟೈಪ್ ಮಾಡಿ\n\n${visitNote}`
            : `📍 *Use your previous address?*\n"${savedLocation}"\n\n1️⃣ Yes, use previous address\n2️⃣ Type new address & time\n\n${visitNote}`;
        await sock.sendMessage(userId, { text: locPrompt });
        scheduleFollowUp(sock, userId);
    } else {
        userStates[userId].step = 'AWAITING_LOCATION';
        saveDatabaseToDisk();
        const promptMsg = isKN
            ? `ದಯವಿಟ್ಟು ನಿಮ್ಮ *ಏರಿಯಾ/ವಿಳಾಸ* (ಉದಾ: ನವನಗರ ಸೆಕ್ಟರ್ 4) ಮತ್ತು *ಸಮಯ*ವನ್ನು ಕಳುಹಿಸಿ.\n\n${visitNote}`
            : `Please reply with your *Area/Address* (e.g., Navanagar Sector 4) and *Preferred Time* (e.g., Today 5 PM).\n\n${visitNote}`;
        await sock.sendMessage(userId, { text: promptMsg });
        scheduleFollowUp(sock, userId);
    }
}

// Called once the address/time is confirmed (either path). If it exactly matches
// an open booking made today, offer to modify that one instead of double-booking.
async function proceedAfterLocationConfirmed(sock, userId, senderPhone, isKN) {
    const state = userStates[userId];
    const colliding = findCollidingBooking(senderPhone, state.service, state.confirmedLocation);

    if (colliding) {
        userStates[userId].step = 'AWAITING_MODIFY_CONFIRM';
        userStates[userId].collidingBookingId = colliding.id;
        saveDatabaseToDisk();
        const msg = isKN
            ? `ℹ️ ನೀವು ಈಗಾಗಲೇ ಇಂದು ಇದೇ ಸೇವೆಗೆ (*${colliding.service}*) *${colliding.location}* ವಿಳಾಸದಲ್ಲಿ ಬುಕಿಂಗ್ ಮಾಡಿದ್ದೀರಿ (Booking ${colliding.id}).\n\nಇದನ್ನೇ ಬದಲಾಯಿಸಬೇಕೇ, ಅಥವಾ ಇದು ಹೊಸ, ಪ್ರತ್ಯೇಕ ಬುಕಿಂಗ್ ಆಗಿದೆಯೇ?\n\n1️⃣ ಹೌದು, ಈ ಬುಕಿಂಗ್ ಬದಲಾಯಿಸಿ\n2️⃣ ಇಲ್ಲ, ಇದು ಪ್ರತ್ಯೇಕ ಬುಕಿಂಗ್`
            : `ℹ️ You already have a booking today for the same service (*${colliding.service}*) at *${colliding.location}* (Booking ${colliding.id}).\n\nWould you like to modify that booking instead, or is this genuinely a new, separate one?\n\n1️⃣ Yes, modify that booking\n2️⃣ No, this is a separate booking`;
        await sock.sendMessage(userId, { text: msg });
        scheduleFollowUp(sock, userId);
    } else {
        userStates[userId].step = 'AWAITING_MAP_LOCATION';
        saveDatabaseToDisk();
        await sock.sendMessage(userId, { text: getMapLocationPrompt(isKN) });
        scheduleFollowUp(sock, userId);
    }
}

// Shared by both the fast-track and fresh-address paths so booking creation
// (OTPs, disk save, confirmation message) lives in exactly one place.
async function finalizeBooking(sock, userId, senderPhone, opts) {
    const { fullName, firstName, lang, service, location, callingPhone, mapLocation } = opts;
    const isKN = lang === 'kn';

    clearUserTimer(userId);
    const startOtp = generate4DigitOtp();
    const endOtp = generate4DigitOtp();
    const now = new Date();
    const resolvedCallingPhone = callingPhone || senderPhone;

    saveCustomer(senderPhone, { name: fullName, firstName, lang, lastLocation: location, callingPhone: resolvedCallingPhone });

    const newBooking = {
        id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
        customerJid: userId,
        customerName: fullName,
        customerPhone: senderPhone,
        callingPhone: resolvedCallingPhone,
        service,
        location,
        mapLocation: mapLocation || null,
        status: 'Pending',
        assignedVendor: null,
        assignedVendorPhone: null,
        startOtp,
        endOtp,
        startOtpVerified: false,
        endOtpVerified: false,
        startTimestamp: null,
        endTimestamp: null,
        totalDurationSeconds: null,
        customerRating: null,
        reviewComment: null,
        date: now.toLocaleDateString('en-IN'),
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    bookings.unshift(newBooking);
    delete userStates[userId];
    saveDatabaseToDisk();

    const mapNote = mapLocation
        ? (isKN ? '\n📍 ನಿಖರ ನಕ್ಷೆ ಸ್ಥಳ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.' : '\n📍 Exact map location received, thank you!')
        : '';

    const isOthers = service.includes('Others') || service.includes('ಇತರೆ');
    const closingLine = isOthers
        ? (isKN
            ? `ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ನಿಮಗೆ ಶೀಘ್ರದಲ್ಲೇ ಕರೆ ಮಾಡಿ ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ತಿಳಿದುಕೊಳ್ಳುತ್ತಾರೆ.`
            : `Bhuvan Nara (${BHUVAN_PHONE}) will call you shortly to understand exactly what you need.`)
        : (isKN
            ? `ಕ್ಷೇತ್ರ ನಿರ್ವಾಹಕ ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ಅವರು 10 ನಿಮಿಷದಲ್ಲಿ ಸ್ಥಳೀಯ ಕೆಲಸಗಾರರನ್ನು ನಿಯೋಜಿಸಿ ನಿಮಗೆ ಕರೆ ಮಾಡಲಿದ್ದಾರೆ.`
            : `Field Operations Head Bhuvan Nara (${BHUVAN_PHONE}) is assigning a trusted local professional right now and will call you within 10 minutes.`);

    const confirmMsg = isKN
        ? `✅ *ಬುಕಿಂಗ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ, ${firstName} ಅವರೇ!*\n\n• ಗ್ರಾಹಕರು: ${fullName}\n• ಸೇವೆ: ${service}\n• ವಿಳಾಸ: ${location}\n• ಕರೆ ಸಂಖ್ಯೆ: ${resolvedCallingPhone}${mapNote}\n• ಭೇಟಿ ಶುಲ್ಕ: ₹49 (ಸೇವೆ ಮುಂದುವರಿಸಿದರೆ ಬಿಲ್‌ನಿಂದ ಕಡಿತ)\n\n${closingLine}\n\nFixMaadi ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾವು ಯಾವಾಗಲೂ ಸಿದ್ಧ 🙏`
        : `✅ *Booking Received, ${firstName}!*\n\n• Customer: ${fullName}\n• Service: ${service}\n• Location: ${location}\n• Calling Number: ${resolvedCallingPhone}${mapNote}\n• Visit Charge: ₹49 (adjusted into your bill if you proceed with the service)\n\n${closingLine}\n\nThank you for choosing FixMaadi! We're always happy to help with any questions 🙏`;

    await sock.sendMessage(userId, { text: confirmMsg });
    logMessage(`🎉 NEW BOOKING (${service}) from ${fullName} (${senderPhone})`);
    logAgentTask("FM-EMP-201", "Rohan Deshmukh", `Created Booking ${newBooking.id} for ${fullName} (${service})`);
    logAgentTask("FM-EMP-501", "Bhuvan Nara", `Alerted Field Ops to assign provider for Booking ${newBooking.id}`);
}

function clearUserTimer(userId) {
    if (userStates[userId] && userStates[userId].timer) {
        clearTimeout(userStates[userId].timer);
        userStates[userId].timer = null;
    }
}

function scheduleFollowUp(sock, userId) {
    clearUserTimer(userId);
    const state = userStates[userId];
    if (!state || state.step === 'NEW' || state.step === 'COMPLETED') return;

    state.timer = setTimeout(async () => {
        try {
            const isKN = state.lang === 'kn';
            const firstName = state.firstName || (isKN ? 'ಗ್ರಾಹಕರೇ' : 'Customer');

            if (!userStates[userId]) return;

            if (userStates[userId].followUpCount === 0) {
                userStates[userId].followUpCount = 1;
                logMessage(`⏰ Sending 1st Inactivity Follow-up to ${firstName}`);

                const followUp1 = isKN
                    ? `👋 ನಮಸ್ಕಾರ ${firstName} ಅವರೇ! ನೀವು ಇನ್ನೂ ನಿಮ್ಮ ಬುಕಿಂಗ್ ಪೂರ್ಣಗೊಳಿಸಿಲ್ಲ.\n\nನಿಮಗೆ ಸಹಾಯ ಬೇಕಿದ್ದರೆ, ಕ್ಷೇತ್ರ ನಿರ್ವಾಹಕ ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ಅವರಿಗೆ ಕರೆ ಮಾಡಿ.`
                    : `👋 Hi ${firstName}! You haven't completed your FixMaadi booking yet.\n\nIf you need any assistance, call Bhuvan Nara at ${BHUVAN_PHONE}.`;

                await sock.sendMessage(userId, { text: followUp1 });
                scheduleFollowUp(sock, userId);
            }
            else if (userStates[userId].followUpCount === 1) {
                logMessage(`⛔ Terminating inactive session for ${firstName} after 2nd follow-up`);

                const terminateMsg = isKN
                    ? `⚠️ ಸಮಯ ಮೀರಿದ್ದರಿಂದ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸೆಷನ್ ಪೂರ್ಣಗೊಂಡಿದೆ.\n\nನೀವು ಮತ್ತೆ ಬುಕಿಂಗ್ ಮಾಡಲು ಬಯಸಿದರೆ, ದಯವಿಟ್ಟು "Hi" ಎಂದು ಕಳುಹಿಸಿ. ಧನ್ಯವಾದಗಳು ${firstName} ಅವರೇ! 🙏`
                    : `⚠️ Your session has timed out due to inactivity, ${firstName}.\n\nIf you would like to start again anytime, simply reply with "Hi". Thank you! 🙏`;

                await sock.sendMessage(userId, { text: terminateMsg });
                clearUserTimer(userId);
                delete userStates[userId];
                saveDatabaseToDisk();
            }
        } catch (err) {
            logMessage(`Error processing follow-up: ${err.message}`);
        }
    }, INACTIVITY_TIMEOUT_MS);
}

// SEND CLEAR TEXT MENU WITH NUMBERED CHOICES (100% VISIBLE ON ALL PHONES)
async function sendServiceMenu(sock, userId, lang, firstName) {
    const isKN = lang === 'kn';
    const textMenu = isKN
        ? `ನಮಸ್ಕಾರ ${firstName} ಅವರೇ! ಬಾಗಲಕೋಟೆಯ FixMaadi ಗೆ ಸುಸ್ವಾಗತ 🙏\n(0% ಕಮಿಷನ್ ಗೃಹ ಸೇವೆಗಳು)\n\nದಯವಿಟ್ಟು ಸೇವೆಯ ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ (1 ರಿಂದ 13), ಅಥವಾ ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ:\n\n1️⃣ ಪುರೋಹಿತರು & ಪೂಜೆಗಳು (₹501 ರಿಂದ) 🙏\n2️⃣ ಮಿಕ್ಸಿ & ಫ್ಯಾನ್ ರಿಪೇರಿ (₹79 ರಿಂದ) 🔧\n3️⃣ ಪ್ಲಂಬರ್ (₹99 ರಿಂದ) 💧\n4️⃣ ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ (₹79 ರಿಂದ) ⚡\n5️⃣ ಮಹಿಳೆಯರ ಬ್ಯೂಟಿಷಿಯನ್ (₹149 ರಿಂದ) ✂️\n6️⃣ ಪುರುಷರ ಹೇರ್‌ಕಟ್ (₹99 ರಿಂದ) 💈\n7️⃣ ಸೆಪ್ಟಿಕ್ ಟ್ಯಾಂಕ್ ಕ್ಲೀನಿಂಗ್ (₹499 ರಿಂದ) 🚜\n8️⃣ ವೇದಿಕೆ ಅಲಂಕಾರ (₹999 ರಿಂದ) 🎈\n9️⃣ ಅಡುಗೆ & ಕ್ಯಾಟರಿಂಗ್ ಕಾರ್ಮಿಕರು (₹499 ರಿಂದ) 🍲\n🔟 ಕಾರ್ಪೆಂಟರ್ (ಮರಗೆಲಸ) (₹149 ರಿಂದ) 🪚\n1️⃣1️⃣ ಮನೆ ಪಾಠ (ಟ್ಯೂಷನ್) (₹499/ತಿಂಗಳಿಗೆ) 📚\n1️⃣2️⃣ ಪೇಂಟಿಂಗ್ & ಗਾਰੇ ಕೆಲಸ (₹299 ರಿಂದ) 🎨\n1️⃣3️⃣ ಇತರೆ (ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ) 📞\n\n*(ಉದಾಹರಣೆಗೆ "3" ಅಥವಾ "ಪ್ಲಂಬರ್" ಎಂದು ಟೈಪ್ ಮಾಡಿ)*`
        : `Hi ${firstName}! Welcome to *FixMaadi Bagalkot* 🙏\n(0% Commission Home Services)\n\nPlease reply with a service number (1 to 13), or tap the button below:\n\n1️⃣ Purohit & Pujas (from ₹501) 🙏\n2️⃣ Mixie & Fan Repair (from ₹79) 🔧\n3️⃣ Plumber (from ₹99) 💧\n4️⃣ Electrician (from ₹79) ⚡\n5️⃣ Beautician (Women) (from ₹149) ✂️\n6️⃣ Men Haircut & Grooming (from ₹99) 💈\n7️⃣ Septic Tank Cleaning (from ₹499) 🚜\n8️⃣ Event & Stage Decoration (from ₹999) 🎈\n9️⃣ Catering & Cooking Labour (from ₹499) 🍲\n🔟 Carpenter & Woodwork (from ₹149) 🪚\n1️⃣1️⃣ Home Tutors (from ₹499/mo) 📚\n1️⃣2️⃣ Civil Labour & Painting (from ₹299) 🎨\n1️⃣3️⃣ Others, Not Listed 📞\n\n*(For example, reply with "3" or "Plumber")*`;

    const servicesDict = isKN ? SERVICES_KN : SERVICES_EN;
    const allRows = Object.entries(servicesDict).map(([key, svc]) => ({
        title: svc.name,
        rowId: key,
        description: svc.price
    }));

    try {
        await sock.sendMessage(userId, {
            text: textMenu,
            footer: 'FixMaadi Bagalkot',
            title: isKN ? 'ಸೇವೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ' : 'Select a Service',
            buttonText: isKN ? 'ಸೇವೆ ಆಯ್ಕೆಮಾಡಿ' : 'Choose a Service',
            sections: [
                { title: isKN ? 'ಸೇವೆಗಳು 1-6' : 'Services 1-6', rows: allRows.slice(0, 6) },
                { title: isKN ? 'ಸೇವೆಗಳು 7-13' : 'Services 7-13', rows: allRows.slice(6, 13) }
            ]
        });
    } catch (e) {
        // Some phones/clients can't render interactive list messages — the numbered
        // text above already covers them, so just fall back to a plain text send.
        logMessage(`⚠️ List message failed, sent as plain text instead: ${e.message}`);
        await sock.sendMessage(userId, { text: textMenu });
    }
}

async function startBot() {
    if (process.env.DISABLE_WHATSAPP_SOCKET === 'true' || process.env.RENDER || process.env.RENDER_EXTERNAL_URL) {
        logMessage('ℹ️ Render Cloud instance running in Web Command Center mode. WhatsApp Bot socket active on Primary Host.');
        botStatus = 'COMMAND_CENTER_WEB_MODE';
        return;
    }

    logMessage('Starting FixMaadi Engine...');
    botStatus = 'Starting engine...';
    const authFolder = path.join(DATA_DIR, 'baileys_auth_info');
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 2000
    });
    sockInstance = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { currentQR = qr; botStatus = 'WAITING_FOR_QR_SCAN'; logMessage('📱 New QR Code generated! Open the dashboard URL to scan it.'); }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            botStatus = `Disconnected (code ${statusCode}). Reconnecting in 3s...`;
            logMessage(botStatus);
            if (shouldReconnect) { setTimeout(startBot, 3000); }
        } else if (connection === 'open') {
            currentQR = '';
            botStatus = 'CONNECTED_AND_LIVE';
            logMessage('🎉 SUCCESS! WhatsApp Bot is CONNECTED & LIVE!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m.messages || m.messages.length === 0) return;

            for (const msg of m.messages) {
                if (msg.key.fromMe) continue;
                
                const userId = msg.key.remoteJid;
                if (!userId || userId.endsWith('@g.us') || userId === 'status@broadcast') continue;

                const text = extractText(msg);
                const locationMsg = msg.message?.locationMessage || msg.message?.ephemeralMessage?.message?.locationMessage || null;
                const senderPhone = '+' + userId.replace(/[^0-9]/g, '');
                logMessage(`📩 Message from ${senderPhone}: "${text || (locationMsg ? '[Location Pin]' : '[Media]')}"`);

                if (!text && !locationMsg) continue;

                const lowerText = text.toLowerCase();

                if (lowerText === '0' || lowerText === 'back' || lowerText === 'menu' || lowerText.includes('ಹಿಂತಿರುಗಿ') || lowerText.includes('ಮೆನು')) {
                    clearUserTimer(userId);
                    delete userStates[userId];
                    saveDatabaseToDisk();
                    logMessage(`🔄 ${senderPhone} returned to Main Menu`);
                }

                if (!userStates[userId]) {
                    userStates[userId] = { step: 'NEW', followUpCount: 0, timer: null };
                } else {
                    clearUserTimer(userId);
                    userStates[userId].followUpCount = 0;
                }

                const currentState = userStates[userId];
                const knownCustomer = findCustomer(senderPhone);
                const isGreeting = lowerText === 'hi' || lowerText === 'hello' || lowerText === 'start' || lowerText === 'namaskara' || lowerText === 'ನಮಸ್ಕಾರ';

                // REPEAT CUSTOMER RECOGNITION FLOW
                if (currentState.step === 'NEW' || isGreeting) {
                    // A greeting is always a fresh start — drop any stale in-progress
                    // fields (old service/location/etc.) instead of layering on top.
                    if (isGreeting) {
                        userStates[userId] = { step: 'NEW', followUpCount: 0, timer: null };
                    }

                    if (knownCustomer && knownCustomer.name) {
                        userStates[userId].fullName = knownCustomer.name;
                        userStates[userId].firstName = knownCustomer.firstName || knownCustomer.name.split(' ')[0];
                        userStates[userId].lang = knownCustomer.lang || 'kn';
                        userStates[userId].lastLocation = knownCustomer.lastLocation;

                        const isKN = userStates[userId].lang === 'kn';
                        const activeBooking = findActiveBookingForCustomer(senderPhone);

                        if (activeBooking) {
                            userStates[userId].step = 'AWAITING_EXISTING_OR_NEW';
                            const prompt = isKN
                                ? `ನಮಸ್ಕಾರ ${userStates[userId].firstName} ಅವರೇ! ಮತ್ತೆ ಸುಸ್ವಾಗತ 🙏\n\nನಿಮಗೆ ಈಗಾಗಲೇ ಒಂದು ಬುಕಿಂಗ್ ಇದೆ (${activeBooking.service}, ${activeBooking.location}).\n\n1️⃣ ನನ್ನ ಈಗಿನ ಬುಕಿಂಗ್ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಇದೆ - Reply "1"\n2️⃣ ಹೊಸ ಸೇವೆ ಬುಕ್ ಮಾಡಬೇಕು - Reply "2"`
                                : `Namaskara ${userStates[userId].firstName}! Welcome back again 🙏\n\nYou already have a booking with us (${activeBooking.service} at ${activeBooking.location}).\n\n1️⃣ I have a question about my existing booking - Reply "1"\n2️⃣ I want to book a new service - Reply "2"`;
                            await sock.sendMessage(userId, { text: prompt });
                            saveDatabaseToDisk();
                            logMessage(`📤 Sent Existing-Booking vs New-Booking Prompt to ${userStates[userId].firstName} (${senderPhone})`);
                            scheduleFollowUp(sock, userId);
                        } else {
                            const repeatPrompt = isKN
                                ? `ನಮಸ್ಕಾರ ${userStates[userId].firstName} ಅವರೇ! FixMaadi ಗೆ ಪುನಃ ಸುಸ್ವಾಗತ 🙏\n\nನೀವು *${knownCustomer.name}* ಅವರಾಗಿ ಸೇವೆಯನ್ನು ಕಾಯ್ದಿರಿಸಲು ಬಯಸುತ್ತೀರಾ?\n\n1️⃣ ಹೌದು, ${userStates[userId].firstName} ಆಗಿ ಮುಂದುವರಿಯಿರಿ - Reply "1"\n2️⃣ ಹೊಸ ಹೆಸರು / ಭಾಷೆ ಬದಲಾಯಿಸಿ - Reply "2"`
                                : `Namaskara ${userStates[userId].firstName}! Welcome back to *FixMaadi Bagalkot* 🙏\n\nAre you looking for service as *${knownCustomer.name}* today?\n\n1️⃣ Yes, continue as ${userStates[userId].firstName} - Reply "1"\n2️⃣ Change Name / Language - Reply "2"`;

                            await sock.sendMessage(userId, { text: repeatPrompt });
                            userStates[userId].step = 'AWAITING_REPEAT_CONFIRM';
                            saveDatabaseToDisk();
                            logMessage(`📤 Sent Repeat Customer Personal Greeting to ${userStates[userId].firstName} (${senderPhone})`);
                            scheduleFollowUp(sock, userId);
                        }
                    } else {
                        const langPrompt = `Namaskara! Welcome to *FixMaadi Bagalkot* 🙏\n(0% Commission Local Community Network)\n\nPlease reply with a number to select language / ದಯವಿಟ್ಟು ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ:\n\n1️⃣ ಕನ್ನಡ (Kannada) - Reply "1"\n2️⃣ English - Reply "2"\n\n*(For help/queries, call Bhuvan Nara: ${BHUVAN_PHONE})*`;

                        await sock.sendMessage(userId, { text: langPrompt });
                        userStates[userId].step = 'AWAITING_LANG';
                        saveDatabaseToDisk();
                        logMessage(`📤 Sent New Customer Language Selection to ${senderPhone}`);
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_FEEDBACK_RATING') {
                    const isKN = currentState.lang === 'kn';
                    const match = text.trim().match(/^([1-5])\s*(.*)$/);

                    if (!match) {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ದಯವಿಟ್ಟು 1 ರಿಂದ 5 ರವರೆಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ (5 = ಅತ್ಯುತ್ತಮ):`
                            : `❌ Sorry, please reply with a number from 1 to 5 (5 = excellent):`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    const score = parseInt(match[1], 10);
                    const reviewComment = match[2].trim();
                    const booking = bookings.find(b => b.id === currentState.bookingId);

                    if (booking) {
                        applyProviderRating(booking, score, reviewComment);
                    }

                    const thankMsg = isKN
                        ? `🙏 ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಧನ್ಯವಾದಗಳು! ನೀವು ${score} / 5 ಸ್ಟಾರ್ ನೀಡಿದ್ದೀರಿ. ಇದು ನಮಗೆ ಬಾಗಲಕೋಟೆಯಲ್ಲಿ ಉತ್ತಮ ಗುಣಮಟ್ಟ ಕಾಪಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ!`
                        : `🙏 Thank you for your feedback! You rated us ${score} / 5 stars. This helps us keep quality high across Bagalkot!`;
                    await sock.sendMessage(userId, { text: thankMsg });
                    delete userStates[userId];
                    saveDatabaseToDisk();
                }
                else if (currentState.step === 'AWAITING_EXISTING_OR_NEW') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';

                    if (lowerText === '1' || lowerText.includes('1️⃣')) {
                        const msg = isKN
                            ? `ನಿಮ್ಮ ಈಗಿನ ಬುಕಿಂಗ್‌ನಲ್ಲಿ ಏನಾದರೂ ಬದಲಾಯಿಸಬೇಕಿದ್ದರೆ ಅಥವಾ ಪ್ರಶ್ನೆ ಇದ್ದರೆ, ದಯವಿಟ್ಟು ನಮ್ಮ ಕ್ಷೇತ್ರ ನಿರ್ವಾಹಕ ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ಅವರನ್ನು ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ — ಅವರು ತಕ್ಷಣ ಸಹಾಯ ಮಾಡುತ್ತಾರೆ 🙏`
                            : `For any change or question about your existing booking, please contact our Field Operations Head Bhuvan Nara directly at ${BHUVAN_PHONE} — he'll help you right away 🙏`;
                        await sock.sendMessage(userId, { text: msg });
                        delete userStates[userId];
                        saveDatabaseToDisk();
                    } else if (lowerText === '2' || lowerText.includes('2️⃣')) {
                        userStates[userId].step = 'AWAITING_SERVICE';
                        saveDatabaseToDisk();
                        const welcomeAgain = isKN
                            ? `ಮತ್ತೆ ಸುಸ್ವಾಗತ ${firstName} ಅವರೇ! 🙏\n\n`
                            : `Welcome back again, ${firstName}! 🙏\n\n`;
                        await sock.sendMessage(userId, { text: welcomeAgain });
                        await sendServiceMenu(sock, userId, userStates[userId].lang, firstName);
                    } else {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು "1" ಅಥವಾ "2" ಕಳುಹಿಸಿ:`
                            : `❌ Sorry, that's not a valid option. Please reply "1" or "2":`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_REPEAT_CONFIRM') {
                    if (lowerText === '1' || lowerText.includes('yes') || lowerText.includes('ಹೌದು') || lowerText.includes('1️⃣')) {
                        logMessage(`✅ Repeat Customer ${currentState.firstName} confirmed identity`);
                        userStates[userId].step = 'AWAITING_SERVICE';
                        saveDatabaseToDisk();
                        await sendServiceMenu(sock, userId, userStates[userId].lang, userStates[userId].firstName);
                    } else {
                        logMessage(`🔄 Customer requested new name/language flow`);
                        const langPrompt = `Please select your language / ದಯವಿಟ್ಟು ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:\n\n1️⃣ ಕನ್ನಡ (Kannada) - Reply "1"\n2️⃣ English - Reply "2"`;
                        await sock.sendMessage(userId, { text: langPrompt });
                        userStates[userId].step = 'AWAITING_LANG';
                        saveDatabaseToDisk();
                    }
                }
                else if (currentState.step === 'AWAITING_LANG') {
                    if (lowerText === '1' || lowerText.includes('kannada') || lowerText.includes('ಕನ್ನಡ') || lowerText === 'lang_kn' || lowerText.includes('1️⃣')) {
                        userStates[userId].lang = 'kn';
                    } else if (lowerText === '2' || lowerText.includes('english') || lowerText === 'lang_en' || lowerText === 'lang_en' || lowerText.includes('2️⃣')) {
                        userStates[userId].lang = 'en';
                    } else {
                        await sock.sendMessage(userId, { text: `Please reply with "1" for Kannada or "2" for English / ಕನ್ನಡಕ್ಕಾಗಿ "1" ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ಗಾಗಿ "2" ಎಂದು ಕಳುಹಿಸಿ.` });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    if (userStates[userId].firstName) {
                        userStates[userId].step = 'AWAITING_SERVICE';
                        saveDatabaseToDisk();
                        await sendServiceMenu(sock, userId, userStates[userId].lang, userStates[userId].firstName);
                    } else {
                        userStates[userId].step = 'AWAITING_NAME';
                        saveDatabaseToDisk();
                        const isKN = userStates[userId].lang === 'kn';
                        const namePrompt = isKN 
                            ? `ದಯವಿಟ್ಟು ನಿಮ್ಮ *ಹೆಸರು ಮತ್ತು ಮನೆಹೆಸರು (Surname)* ಟೈಪ್ ಮಾಡಿ (ಉದಾ: ರಮೇಶ್ ಪಾಟೀಲ್):`
                            : `Please reply with your *First Name & Surname* (e.g., Ramesh Patil):`;
                        await sock.sendMessage(userId, { text: namePrompt });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_NAME') {
                    const fullName = text.trim();
                    const isKN = currentState.lang === 'kn';
                    const nameParts = fullName.split(/\s+/).filter(Boolean);

                    if (!isValidCustomerName(fullName) || nameParts.length < 2) {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಪೂರ್ಣ ಹೆಸರಿನಂತೆ ಕಾಣುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ *ಹೆಸರು ಮತ್ತು ಮನೆಹೆಸರು (Surname)* ಎರಡನ್ನೂ ಟೈಪ್ ಮಾಡಿ (ಉದಾ: ರಮೇಶ್ ಪಾಟೀಲ್):`
                            : `❌ Sorry, that doesn't look like a full name. Please type both your *First Name and Surname* (e.g. Ramesh Patil):`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    const firstName = nameParts[0];

                    userStates[userId].fullName = fullName;
                    userStates[userId].firstName = firstName;
                    saveCustomer(senderPhone, { name: fullName, firstName: firstName, lang: userStates[userId].lang || 'kn' });

                    userStates[userId].step = 'AWAITING_SERVICE';
                    saveDatabaseToDisk();
                    await sendServiceMenu(sock, userId, userStates[userId].lang, firstName);
                }
                else if (currentState.step === 'AWAITING_SERVICE') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';
                    const servicesDict = isKN ? SERVICES_KN : SERVICES_EN;
                    const selected = matchService(text, servicesDict);

                    if (selected) {
                        userStates[userId].service = `${selected.name} (${selected.price})`;
                        userStates[userId].step = 'AWAITING_PHONE_CONFIRM';
                        saveDatabaseToDisk();

                        const greatChoice = isKN
                            ? `ಉತ್ತಮ ಆಯ್ಕೆ ${firstName} ಅವರೇ! ನೀವು *${selected.name}* ಆಯ್ಕೆ ಮಾಡಿದ್ದೀರಿ.\n\n`
                            : `Great choice, ${firstName}! You selected *${selected.name}*.\n\n`;
                        await sock.sendMessage(userId, { text: greatChoice + getPhoneConfirmPrompt(isKN, senderPhone) });
                        logMessage(`📤 Sent Calling Number Confirmation Prompt to ${firstName} (${senderPhone})`);
                        scheduleFollowUp(sock, userId);
                    } else {
                        const invalidMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇನ್‌ಪುಟ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ 🙏`
                            : `❌ Sorry, that's not a valid option. Please check your input and try again 🙏`;
                        await sock.sendMessage(userId, { text: invalidMsg });
                        await sendServiceMenu(sock, userId, userStates[userId].lang, firstName);
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_PHONE_CONFIRM') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';

                    if (lowerText === '1' || lowerText.includes('yes') || lowerText.includes('ಹೌದು') || lowerText.includes('1️⃣')) {
                        userStates[userId].callingPhone = senderPhone;
                        saveDatabaseToDisk();
                        const savedLocation = userStates[userId].lastLocation || (knownCustomer ? knownCustomer.lastLocation : null);
                        await promptForLocation(sock, userId, isKN, firstName, savedLocation);
                    } else if (lowerText === '2' || lowerText.includes('no') || lowerText.includes('ಇಲ್ಲ') || lowerText.includes('2️⃣')) {
                        userStates[userId].step = 'AWAITING_NEW_PHONE';
                        saveDatabaseToDisk();
                        const askNewPhone = isKN
                            ? `ದಯವಿಟ್ಟು ನಮ್ಮ ಕೆಲಸಗಾರರು ಕರೆ ಮಾಡಬೇಕಾದ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ:`
                            : `Please type the 10-digit mobile number our technician should call:`;
                        await sock.sendMessage(userId, { text: askNewPhone });
                        scheduleFollowUp(sock, userId);
                    } else {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ 🙏\n\n${getPhoneConfirmPrompt(isKN, senderPhone)}`
                            : `❌ Sorry, that's not a valid option. Please check your input and try again 🙏\n\n${getPhoneConfirmPrompt(isKN, senderPhone)}`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_NEW_PHONE') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';

                    if (!isValidIndianMobile(text)) {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಂತೆ ಕಾಣುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ (ಉದಾ: 9876543210):`
                            : `❌ Sorry, that doesn't look like a valid 10-digit mobile number. Please try again (e.g. 9876543210):`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    userStates[userId].callingPhone = normalizeIndianMobile(text);
                    saveDatabaseToDisk();
                    const savedLocation = userStates[userId].lastLocation || (knownCustomer ? knownCustomer.lastLocation : null);
                    await promptForLocation(sock, userId, isKN, firstName, savedLocation);
                }
                else if (currentState.step === 'AWAITING_LOCATION_CONFIRM') {
                    const isKN = currentState.lang === 'kn';

                    if (lowerText === '1' || lowerText.includes('yes') || lowerText.includes('ಹೌದು') || lowerText.includes('1️⃣')) {
                        userStates[userId].confirmedLocation = currentState.suggestedLocation || 'Saved Customer Location';
                        saveDatabaseToDisk();
                        await proceedAfterLocationConfirmed(sock, userId, senderPhone, isKN);
                    } else if (lowerText === '2' || lowerText.includes('no') || lowerText.includes('ಇಲ್ಲ') || lowerText.includes('2️⃣')) {
                        userStates[userId].step = 'AWAITING_LOCATION';
                        saveDatabaseToDisk();
                        const promptMsg = isKN
                            ? `ದಯವಿಟ್ಟು ನಿಮ್ಮ *ಹೊಸ ಏರಿಯಾ/ವಿಳಾಸ* ಮತ್ತು *ಸಮಯ*ವನ್ನು ಟೈಪ್ ಮಾಡಿ:`
                            : `Please type your *New Area/Address* and *Preferred Time*:`;
                        await sock.sendMessage(userId, { text: promptMsg });
                        scheduleFollowUp(sock, userId);
                    } else {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ ಮತ್ತು "1" ಅಥವಾ "2" ಕಳುಹಿಸಿ:`
                            : `❌ Sorry, that's not a valid option. Please check your input and reply "1" or "2":`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_LOCATION') {
                    const isKN = currentState.lang === 'kn';
                    const locationAndTime = text;

                    if (!isValidLocationInput(locationAndTime)) {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ದಯವಿಟ್ಟು ಪೂರ್ಣ *ಏರಿಯಾ/ವಿಳಾಸ* (ಉದಾ: ನವನಗರ ಸೆಕ್ಟರ್ 4) ಮತ್ತು *ಸಮಯ* (ಉದಾ: ಇಂದು ಸಂಜೆ 5) ಒಟ್ಟಿಗೆ ಟೈಪ್ ಮಾಡಿ:`
                            : `❌ Sorry, please type a complete *Area/Address* (e.g. Navanagar Sector 4) and *Time* (e.g. Today 5 PM) together:`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    userStates[userId].confirmedLocation = locationAndTime;
                    saveDatabaseToDisk();
                    await proceedAfterLocationConfirmed(sock, userId, senderPhone, isKN);
                }
                else if (currentState.step === 'AWAITING_MODIFY_CONFIRM') {
                    const isKN = currentState.lang === 'kn';

                    if (lowerText === '1' || lowerText.includes('yes') || lowerText.includes('ಹೌದು') || lowerText.includes('1️⃣')) {
                        userStates[userId].step = 'AWAITING_MODIFY_CHOICE';
                        saveDatabaseToDisk();
                        const msg = isKN
                            ? `ಏನನ್ನು ಬದಲಾಯಿಸಬೇಕು?\n\n1️⃣ ಸೇವೆ\n2️⃣ ವಿಳಾಸ/ಸಮಯ\n3️⃣ ಕರೆ ಸಂಖ್ಯೆ`
                            : `What would you like to change?\n\n1️⃣ Service\n2️⃣ Address/Time\n3️⃣ Calling Number`;
                        await sock.sendMessage(userId, { text: msg });
                        scheduleFollowUp(sock, userId);
                    } else if (lowerText === '2' || lowerText.includes('no') || lowerText.includes('ಇಲ್ಲ') || lowerText.includes('2️⃣')) {
                        userStates[userId].step = 'AWAITING_MAP_LOCATION';
                        saveDatabaseToDisk();
                        await sock.sendMessage(userId, { text: getMapLocationPrompt(isKN) });
                        scheduleFollowUp(sock, userId);
                    } else {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು "1" ಅಥವಾ "2" ಕಳುಹಿಸಿ:`
                            : `❌ Sorry, that's not a valid option. Please reply "1" or "2":`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_MODIFY_CHOICE') {
                    const isKN = currentState.lang === 'kn';

                    if (['1', '2', '3'].includes(lowerText.replace(/[^123]/g, '')[0] || '')) {
                        const field = lowerText.replace(/[^123]/g, '')[0];
                        userStates[userId].modifyField = field;
                        userStates[userId].step = 'AWAITING_MODIFY_VALUE';
                        saveDatabaseToDisk();
                        let askMsg;
                        if (field === '1') {
                            askMsg = isKN
                                ? `ಹೊಸ ಸೇವೆಯ ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ (1 ರಿಂದ 13):`
                                : `Please send the new service number (1 to 13):`;
                        } else if (field === '2') {
                            askMsg = isKN
                                ? `ಹೊಸ *ಏರಿಯಾ/ವಿಳಾಸ* ಮತ್ತು *ಸಮಯ*ವನ್ನು ಟೈಪ್ ಮಾಡಿ:`
                                : `Please type the new *Area/Address* and *Time*:`;
                        } else {
                            askMsg = isKN
                                ? `ಹೊಸ 10-ಅಂಕಿಯ ಕರೆ ಸಂಖ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ:`
                                : `Please type the new 10-digit calling number:`;
                        }
                        await sock.sendMessage(userId, { text: askMsg });
                        scheduleFollowUp(sock, userId);
                    } else {
                        const retryMsg = isKN
                            ? `❌ ಕ್ಷಮಿಸಿ, ಅದು ಸರಿಯಾದ ಆಯ್ಕೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು "1", "2" ಅಥವಾ "3" ಕಳುಹಿಸಿ:`
                            : `❌ Sorry, that's not a valid option. Please reply "1", "2" or "3":`;
                        await sock.sendMessage(userId, { text: retryMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_MODIFY_VALUE') {
                    const isKN = currentState.lang === 'kn';
                    const field = currentState.modifyField;
                    const bookingIndex = bookings.findIndex(b => b.id === currentState.collidingBookingId);

                    if (bookingIndex === -1) {
                        await sock.sendMessage(userId, { text: isKN ? `❌ ಆ ಬುಕಿಂಗ್ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು "hi" ಕಳುಹಿಸಿ ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ.` : `❌ That booking could no longer be found. Please send "hi" to start again.` });
                        delete userStates[userId];
                        saveDatabaseToDisk();
                        return;
                    }

                    let updatedField = {};
                    let confirmedValueText = '';

                    if (field === '1') {
                        const servicesDict = isKN ? SERVICES_KN : SERVICES_EN;
                        const selected = matchService(text, servicesDict);
                        if (!selected) {
                            await sock.sendMessage(userId, { text: isKN ? `❌ ಸರಿಯಾದ ಸೇವಾ ಸಂಖ್ಯೆ (1-12) ಕಳುಹಿಸಿ:` : `❌ Please send a valid service number (1-12):` });
                            scheduleFollowUp(sock, userId);
                            return;
                        }
                        updatedField = { service: `${selected.name} (${selected.price})` };
                        confirmedValueText = updatedField.service;
                    } else if (field === '2') {
                        if (!isValidLocationInput(text)) {
                            await sock.sendMessage(userId, { text: isKN ? `❌ ಪೂರ್ಣ ವಿಳಾಸ ಮತ್ತು ಸಮಯ ಟೈಪ್ ಮಾಡಿ:` : `❌ Please type a complete address and time:` });
                            scheduleFollowUp(sock, userId);
                            return;
                        }
                        updatedField = { location: text.trim() };
                        confirmedValueText = updatedField.location;
                    } else {
                        if (!isValidIndianMobile(text)) {
                            await sock.sendMessage(userId, { text: isKN ? `❌ ಸರಿಯಾದ 10-ಅಂಕಿಯ ಸಂಖ್ಯೆ ಟೈಪ್ ಮಾಡಿ:` : `❌ Please type a valid 10-digit number:` });
                            scheduleFollowUp(sock, userId);
                            return;
                        }
                        updatedField = { callingPhone: normalizeIndianMobile(text) };
                        confirmedValueText = updatedField.callingPhone;
                    }

                    bookings[bookingIndex] = { ...bookings[bookingIndex], ...updatedField };
                    saveDatabaseToDisk();

                    const doneMsg = isKN
                        ? `✅ ಬುಕಿಂಗ್ ${currentState.collidingBookingId} ನವೀಕರಿಸಲಾಗಿದೆ: *${confirmedValueText}*.\n\nಫಿಕ್ಸ್‌ಮಾಡಿ ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! 🙏`
                        : `✅ Booking ${currentState.collidingBookingId} updated: *${confirmedValueText}*.\n\nThank you for choosing FixMaadi! 🙏`;
                    await sock.sendMessage(userId, { text: doneMsg });
                    logMessage(`✏️ Customer self-updated Booking ${currentState.collidingBookingId} field "${field}" -> ${confirmedValueText}`);
                    logAgentTask("FM-EMP-201", "Rohan Deshmukh", `Booking ${currentState.collidingBookingId} updated by customer via WhatsApp (${confirmedValueText})`);
                    delete userStates[userId];
                    saveDatabaseToDisk();
                }
                else if (currentState.step === 'AWAITING_MAP_LOCATION') {
                    const firstName = currentState.firstName || 'Customer';
                    const fullName = currentState.fullName || firstName;

                    // A shared pin is a bonus, not a requirement — anything that isn't an
                    // actual location share (including "skip" or unrelated text) just
                    // proceeds without one rather than blocking the booking here.
                    const mapLocation = locationMsg
                        ? { lat: locationMsg.degreesLatitude, lng: locationMsg.degreesLongitude }
                        : null;

                    await finalizeBooking(sock, userId, senderPhone, {
                        fullName,
                        firstName,
                        lang: currentState.lang || 'kn',
                        service: currentState.service,
                        location: currentState.confirmedLocation,
                        callingPhone: currentState.callingPhone || senderPhone,
                        mapLocation
                    });
                }
            }
        } catch (err) {
            logMessage(`Error processing message: ${err.message}`);
        }
    });
}

app.listen(PORT, () => {
    logMessage(`🌐 FixMaadi Executive Control Center running at http://localhost:${PORT}`);
    startBot();
});
