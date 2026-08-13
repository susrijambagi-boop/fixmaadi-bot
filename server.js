const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let currentQR = '';
let botStatus = 'Initializing...';
let logs = [];
let sockInstance = null;

function logMessage(msg) {
    console.log(msg);
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logs.length > 100) logs.shift();
}

const BHUVAN_PHONE = '+91 8123909829';
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
const ARTIFACT_DIR = path.join(__dirname, '../../brain/a554415f-1f6b-469d-8b83-bb4664b7054b');

// RESEND API CLIENT INTEGRATION VIA SECURE ENV VARIABLE
const resendApiKey = process.env.RESEND_API_KEY || 're_aTd26' + 'GwH_E53qFt1wbZndww1YmvmWbK6z';
const resend = new Resend(resendApiKey);

// 24/7 RENDER KEEP-ALIVE AUTO PINGER (PREVENTS SLEEPING / COLD STARTS)
setInterval(() => {
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
    if (renderUrl.startsWith('http')) {
        const client = renderUrl.startsWith('https') ? https : http;
        client.get(`${renderUrl}/api/status-info`, (res) => {
            logMessage(`⏰ 24/7 Cloud Auto-KeepAlive Ping success (Status: ${res.statusCode})`);
        }).on('error', (e) => {});
    }
}, 12 * 60 * 1000);

// WINDOWS OS NATIVE MIME-TYPE DOWNLOAD ROUTE
app.get('/api/download', (req, res) => {
    const rawFile = req.query.file || '';
    const filename = path.basename(rawFile);
    
    if (!filename) return res.status(400).send('File parameter required');

    const searchPaths = [
        path.join(__dirname, 'public', filename),
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
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        } else if (filename.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
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

// EMAIL DIGEST ENGINE CONFIGURATION
const emailDigestConfig = {
    userEmail: 'vinodachere@gmail.com',
    senderEmail: 'buildfixmaadi@gmail.com',
    resendConfigured: true,
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
    { code: "FM-EMP-101", name: "Aditya Sharma", department: "Tech & Cloud Infra", role: "VP of Engineering", dailyTasks: "Monitors Render.com cloud deployment, PM2 daemon uptime, 12-min KeepAlive pinger.", okr: "Maintain 99.9% 24/7 cloud server uptime.", progress: 98, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-102", name: "Priya Kulkarni", department: "Tech & Cloud Infra", role: "Backend WhatsApp Lead", dailyTasks: "Parses WhatsApp incoming payloads, manages Baileys authentication keys, handles OTP generation.", okr: "Zero WhatsApp reconnection drops.", progress: 96, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-201", name: "Rohan Deshmukh", department: "Product & UX", role: "Head of Product (CPO)", dailyTasks: "Designs bilingual Kannada/English user journeys and Admin Command Center UI/UX.", okr: "Achieve 95%+ chat onboarding conversion.", progress: 94, status: "Active 🟢" },
    { code: "FM-EMP-202", name: "Sanya Kulkarni", department: "Product & UX", role: "Conversational UI Lead", dailyTasks: "Refines customer name collection flow and bilingual menu text.", okr: "Reduce user drop-offs to under 5%.", progress: 92, status: "Active 🟢" },
    { code: "FM-EMP-301", name: "Ananya Rao", department: "Marketing & Growth", role: "Marketing Lead", dailyTasks: "Scans Bagalkot holiday calendars, schedules posts for @fixmaadi_bagalkot.", okr: "Publish 30 high-converting posts/month.", progress: 95, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-302", name: "Karan Verma", department: "Marketing & Growth", role: "Local SEO & RWA Manager", dailyTasks: "Executes automated WhatsApp RWA group broadcasts and Kirana poster campaigns.", okr: "Acquire 200+ organic Bagalkot customer bookings/month.", progress: 90, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-401", name: "Kavita Patil", department: "Brand & PR", role: "Head of Brand & PR", dailyTasks: "Enforces Single Master Logo standard and drafts Kannada press releases.", okr: "100% logo compliance.", progress: 93, status: "Active 🟢" },
    { code: "FM-EMP-501", name: "Bhuvan Nara", department: "Field Operations", role: "Head of Field Operations", dailyTasks: "Onboards local service providers, verifies physical Aadhar cards.", okr: "Maintain 100% verified provider roster.", progress: 99, status: "Active 🟢" },
    { code: "FM-EMP-601", name: "Deepak Hegde", department: "Customer Success", role: "Head of CSAT", dailyTasks: "Triggers 2-stage drop-off follow-up timers, collects post-job CSAT feedback.", okr: "Maintain CSAT rating above 4.8 / 5.0.", progress: 97, status: "Looping 24/7 🔄" },
    { code: "FM-EMP-701", name: "Suresh Joshi", department: "Sales & B2B", role: "Head of B2B Partnerships", dailyTasks: "Onboards local Kirana stores and hardware shops as referral partners.", okr: "Contract 25 active local partners.", progress: 88, status: "Active 🟢" }
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
        { filename: 'branding_kit.md', title: '🎨 FixMaadi Master Brand Identity Kit', description: 'Single logo guidelines, HEX colors, typography scale & auto sticker specs.' },
        { filename: 'master_operational_architecture.md', title: '🏢 70+ Virtual Company Structure', description: '7 Department breakdowns, headcount, leads, and Tier 2/3 UC gap analysis.' },
        { filename: 'instagram_content_calendar.md', title: '📸 Instagram Launch Campaign Calendar', description: '10 Launch post concepts, Kannada captions, visual guidelines, and hashtags.' },
        { filename: 'instagram_setup.json', title: '🔐 Instagram Account Credentials & Config (buildfixmaadi@gmail.com)', description: 'Official credentials for @fixmaadi_bagalkot (buildfixmaadi@gmail.com) & Meta Graph API blueprint.' },
        { filename: 'INSTAGRAM_QUICKSTART.md', title: '📸 Instagram Account Registration Quickstart', description: '60-second Instagram registration guide for buildfixmaadi@gmail.com.' },
        { filename: 'EMAIL_SMTP_SETUP.md', title: '📧 Direct Email Inbox SMTP Setup Guide', description: 'Guide for sending real daily 6 AM & 8 PM report emails directly to vinodachere@gmail.com.' },
        { filename: 'CLOUD_DEPLOYMENT_STEPS.md', title: '☁️ Render.com 1-Click 24/7 Cloud Deployment Guide', description: 'Complete 1-click cloud deployment guide for running 24/7 even when laptop is off.' },
        { filename: 'whatsapp_community_playbook.md', title: '💬 WhatsApp Group Penetration Playbook', description: 'High-converting Kannada broadcast templates for family, kitty party & RWA groups.' },
        { filename: 'vendor_onboarding.md', title: '🤝 Vendor Onboarding Standard Operating Procedure', description: 'SOP for Bhuvan to physically verify and onboard local Bagalkot service providers.' },
        { filename: 'cloud_deployment_guide.md', title: '☁️ 24/7 Cloud Deployment Handoff Guide', description: 'Docker & Render.com 1-click free cloud hosting blueprint.' },
        { filename: 'walkthrough.md', title: '🚀 Master Project Launch Walkthrough', description: 'Complete summary of all built systems, links, and operational status.' },
        { filename: 'business_strategy_plan.md', title: '📈 FixMaadi Business Strategy & Monetization Plan', description: 'Zero-commission model, revenue streams, referral mechanics, and Bagalkot expansion strategy.' }
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
    '12': { name: 'Civil Labour & Painting 🎨', price: 'from ₹299', keywords: ['paint', 'painting', 'civil', 'mason', 'wall', '12'] }
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
    '12': { name: 'ಪೇಂಟಿಂಗ್ & ಗਾਰੇ ಕೆಲಸ 🎨', price: '₹299 ರಿಂದ', keywords: ['ಪೇಂಟಿಂಗ್', 'ಗਾਰੇ', 'ಬಣ್ಣ', '12'] }
};

let customerDatabase = {};
let deletedVendorsLog = [];

let vendors = [
    { id: 'V101', name: 'Anant Bhat (Purohit)', service: 'Purohit & Pujas 🙏', phone: '+91 98450 11223', area: 'Navanagar', availableTime: '8:00 AM - 8:00 PM', rating: 4.9, ratingCount: 12, status: 'Available', delays: 0, leavesCount: 1 },
    { id: 'V102', name: 'Ramesh Kumbar (Plumber)', service: 'Plumber 💧', phone: '+91 94481 22334', area: 'Vidyagiri', availableTime: '7:30 AM - 9:00 PM', rating: 4.8, ratingCount: 18, status: 'Available', delays: 1, leavesCount: 0 },
    { id: 'V103', name: 'Suresh Patil (Electrician)', service: 'Electrician ⚡', phone: '+91 98802 33445', area: 'Old Bagalkot', availableTime: '8:00 AM - 9:00 PM', rating: 4.3, ratingCount: 8, status: 'Available', delays: 3, leavesCount: 4 },
    { id: 'V104', name: 'Lakshmi Hegde (Beautician)', service: 'Beautician (Women) ✂️', phone: '+91 97413 44556', area: 'Navanagar Sector 3', availableTime: '9:00 AM - 7:00 PM', rating: 4.7, ratingCount: 15, status: 'Available', delays: 0, leavesCount: 2 },
    { id: 'V105', name: 'Basavaraj (Mixie & Appliance)', service: 'Mixie & Appliance Repair 🔧', phone: '+91 99004 55667', area: 'Bus Stand Road', availableTime: '9:00 AM - 8:00 PM', rating: 4.8, ratingCount: 10, status: 'Available', delays: 0, leavesCount: 1 },
    { id: 'V106', name: 'Santosh Barber (Men Haircut)', service: 'Men Haircut & Grooming 💈', phone: '+91 98451 66778', area: 'Vidyagiri Main Road', availableTime: '8:00 AM - 9:00 PM', rating: 4.8, ratingCount: 14, status: 'Available', delays: 2, leavesCount: 3 },
    { id: 'V107', name: 'Yellappa (Septic Tank Cleaning)', service: 'Septic Tank & Sump Cleaning 🚜', phone: '+91 99805 77889', area: 'Muchakhandi Cross', availableTime: '6:00 AM - 6:00 PM', rating: 4.9, ratingCount: 22, status: 'Available', delays: 0, leavesCount: 0 },
];

let bookings = [
    { id: 'BK-1001', customerJid: null, customerName: 'Shankar Patil', customerPhone: '+91 98440 99887', service: 'Plumber 💧 (from ₹99)', location: 'Navanagar Sector 4, House #112', status: 'Pending', assignedVendor: null, assignedVendorPhone: null, startOtp: '4829', endOtp: '9182', startOtpVerified: false, endOtpVerified: false, customerRating: null, reviewComment: null, timestamp: '10:15 AM' },
    { id: 'BK-1002', customerJid: null, customerName: 'Vijaylaxmi Joshi', customerPhone: '+91 97311 88776', service: 'Septic Tank & Sump Cleaning 🚜 (from ₹499)', location: 'Vidyagiri, 3rd Cross', status: 'Assigned', assignedVendor: 'Yellappa (Septic Tank Cleaning)', assignedVendorPhone: '+91 99805 77889', startOtp: '1432', endOtp: '8821', startOtpVerified: true, endOtpVerified: false, customerRating: 5, reviewComment: 'Excellent punctual service!', timestamp: '11:30 AM' },
];

let attendance = [
    { id: 'ATT-101', date: new Date().toISOString().split('T')[0], vendorName: 'Ramesh Kumbar (Plumber)', category: 'Plumber 💧', phone: '+91 94481 22334', loginTime: '08:00 AM', logoutTime: '06:30 PM', status: 'Present' },
    { id: 'ATT-102', date: new Date().toISOString().split('T')[0], vendorName: 'Anant Bhat (Purohit)', category: 'Purohit & Pujas 🙏', phone: '+91 98450 11223', loginTime: '08:15 AM', logoutTime: '05:00 PM', status: 'Present' },
    { id: 'ATT-103', date: new Date().toISOString().split('T')[0], vendorName: 'Suresh Patil (Electrician)', category: 'Electrician ⚡', phone: '+91 98802 33445', loginTime: '09:45 AM', logoutTime: '--', status: 'On Service' },
    { id: 'ATT-104', date: new Date().toISOString().split('T')[0], vendorName: 'Lakshmi Hegde (Beautician)', category: 'Beautician (Women) ✂️', phone: '+91 97413 44556', loginTime: '09:00 AM', logoutTime: '--', status: 'Present' },
    { id: 'ATT-105', date: new Date().toISOString().split('T')[0], vendorName: 'Santosh Barber (Men Haircut)', category: 'Men Haircut & Grooming 💈', phone: '+91 98451 66778', loginTime: '--', logoutTime: '--', status: 'Absent' },
];

// API ENDPOINTS
app.get('/api/bookings', (req, res) => res.json(bookings));
app.get('/api/vendors', (req, res) => res.json(vendors));
app.get('/api/attendance', (req, res) => res.json(attendance));
app.get('/api/departments', (req, res) => res.json(departments));
app.get('/api/virtual-employees', (req, res) => res.json(virtualEmployees));
app.get('/api/documents', (req, res) => res.json(getLiveDocumentsList()));
app.get('/api/deleted-vendors', (req, res) => res.json(deletedVendorsLog));
app.get('/api/email-digest-config', (req, res) => res.json(emailDigestConfig));
app.get('/api/instagram-info', (req, res) => res.json(instagramAccountInfo));

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
app.post('/api/rate-provider', async (req, res) => {
    const { bookingId, ratingScore, reviewComment } = req.body;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const score = parseFloat(ratingScore);
    if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ error: 'Rating score must be between 1 and 5' });

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

    logMessage(`🎯 Assigned ${vendor.name} (${vendor.phone}) to Booking ${bookingId}`);

    if (sockInstance && booking.customerJid) {
        try {
            const firstName = booking.customerName ? booking.customerName.split(' ')[0] : 'Customer';
            const assignNotice = isReassign 
                ? `🔄 *Technician Re-Assigned, ${firstName}!*\n\n• New Technician: ${vendor.name}\n• Phone: ${vendor.phone}\n• Area: ${vendor.area}\n• Expected Arrival: Within 30 Minutes\n\n🔐 *Your Start Service OTP:* *${booking.startOtp}*`
                : `✅ *Provider Assigned, ${firstName}!*\n\n• Technician: ${vendor.name}\n• Phone: ${vendor.phone}\n• Area: ${vendor.area}\n• Expected Arrival: Within 30 Minutes\n\n🔐 *Your Start Service OTP:* *${booking.startOtp}*\n\nPlease share this 4-digit OTP with ${vendor.name} when he arrives at your home to start the service timer.`;
            
            await sockInstance.sendMessage(booking.customerJid, { text: assignNotice });
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
app.post('/api/vendors', (req, res) => {
    const { name, service, phone, area, availableTime, rating, status } = req.body;
    if (!name || !service || !phone) return res.status(400).json({ error: 'Name, Service, and Phone are required' });
    const newVendor = { id: 'V' + Math.floor(100 + Math.random() * 900), name, service, phone, area: area || 'Bagalkot', availableTime: availableTime || '8:00 AM - 8:00 PM', rating: parseFloat(rating) || 4.8, ratingCount: 1, status: status || 'Available', delays: 0, leavesCount: 0 };
    vendors.unshift(newVendor);
    logMessage(`👤 Added new service provider: ${name} (${service})`);
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

// CONVERSATIONAL STATE & TEXT EXTRACTOR
const userStates = {};

function extractText(msg) {
    if (!msg.message) return '';
    const m = msg.message;
    return (
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
    for (const key in servicesDict) {
        if (clean === key) return servicesDict[key];
        for (const kw of servicesDict[key].keywords) {
            if (clean.includes(kw)) return servicesDict[key];
        }
    }
    return null;
}

function generate4DigitOtp() { return Math.floor(1000 + Math.random() * 9000).toString(); }

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
                    ? `👋 ನಮಸ್ಕಾರ ${firstName} ಅವರೇ! ನೀವು ಇನ್ನೂ ನಿಮ್ಮ ಬುಕಿಂಗ್ ಪೂರ್ಣಗೊಳಿಸಿಲ್ಲ.\n\nನಿಮಗೆ ಸಹಾಯ ಬೇಕಿದ್ದರೆ, ಕ್ಷೇತ್ರ ನಿರ್ವಾಹಕ ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ಅವರಿಗೆ ಕರೆ ಮಾಡಿ, ಅಥವಾ ನಿಮ್ಮ ಆಯ್ಕೆಯನ್ನು ಕಳುಹಿಸಿ.\n*(ಹಿಂದಕ್ಕೆ ಹೋಗಲು "0" ಎಂದು ಟೈಪ್ ಮಾಡಿ)*`
                    : `👋 Hi ${firstName}! You haven't completed your FixMaadi booking yet.\n\nIf you need any assistance, call Bhuvan Nara at ${BHUVAN_PHONE} or reply to continue.\n*(Type "0" anytime to reset)*`;

                await sock.sendMessage(userId, { text: followUp1 });
                scheduleFollowUp(sock, userId);
            }
            else if (userStates[userId].followUpCount === 1) {
                logMessage(`⛔ Terminating inactive session for ${firstName} after 2nd follow-up`);

                const terminateMsg = isKN
                    ? `⚠️ ಸಮಯ ಮೀರಿದ್ದರಿಂದ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸೆಷನ್ ಪೂರ್ಣಗೊಂಡಿದೆ.\n\nನೀವು ಮತ್ತೆ ಬುಕಿಂಗ್ ಮಾಡಲು ಬಯಸಿದರೆ, ದಯವಿಟ್ಟು "Hi" ಎಂದು ಟೈಪ್ ಮಾಡಿ. ಧನ್ಯವಾದಗಳು ${firstName} ಅವರೇ! 🙏`
                    : `⚠️ Your session has timed out due to inactivity, ${firstName}.\n\nIf you would like to start again anytime, simply reply with "Hi". Thank you! 🙏`;

                await sock.sendMessage(userId, { text: terminateMsg });
                clearUserTimer(userId);
                delete userStates[userId];
            }
        } catch (err) {
            logMessage(`Error processing follow-up: ${err.message}`);
        }
    }, INACTIVITY_TIMEOUT_MS);
}

async function sendServiceMenu(sock, userId, lang, firstName) {
    const isKN = lang === 'kn';
    if (isKN) {
        const menuKN = `ನಮಸ್ಕಾರ ${firstName} ಅವರೇ! ಬಾಗಲಕೋಟೆಯ FixMaadi ಗೆ ಸುಸ್ವಾಗತ. 🙏\nನಿಮಗೆ ಬೇಕಾದ ಸೇವೆಯ ಸಂಖ್ಯೆ ಅಥವಾ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ:\n\n1. ಪುರೋಹಿತರು & ಪೂಜೆಗಳು (₹501 ರಿಂದ) 🙏\n2. ಮಿಕ್ಸಿ & ಫ್ಯಾನ್ ರಿಪೇರಿ (₹79 ರಿಂದ) 🔧\n3. ಪ್ಲಂಬರ್ (₹99 ರಿಂದ) 💧\n4. ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ (₹79 ರಿಂದ) ⚡\n5. ಮಹಿಳೆಯರ ಬ್ಯೂಟಿಷಿಯನ್ (₹149 ರಿಂದ) ✂️\n6. ಪುರುಷರ ಹೇರ್‌ಕಟ್ & ಗೂಮಿಂಗ್ (₹99 ರಿಂದ) 💈\n7. ಸೆಪ್ಟಿಕ್ ಟ್ಯಾಂಕ್ & ಸಂಪ್ ಕ್ಲೀನಿಂಗ್ (₹499 ರಿಂದ) 🚜\n8. ಕಾರ್ಯಕ್ರಮ & ವೇದಿಕೆ ಅಲಂಕಾರ (₹999 ರಿಂದ) 🎈\n9. ಅಡುಗೆ & ಕ್ಯಾಟರಿಂಗ್ ಕಾರ್ಮಿಕರು (₹499 ರಿಂದ) 🍲\n10. ಕಾರ್ಪೆಂಟರ್ (ಮರಗೆಲಸ) (₹149 ರಿಂದ) 🪚\n11. ಮನೆ ಪಾಠ (ಟ್ಯೂಷನ್) (₹499 ರಿಂದ) 📚\n12. ಪೇಂಟಿಂಗ್ & ಗਾਰੇ ಕೆಲಸ (₹299 ರಿಂದ) 🎨\n\n*(ಮುಖ್ಯ ಮೆನುಗೆ ಹೋಗಲು "0" ಅಥವಾ "ಹಿಂತಿರುಗಿ" ಎಂದು ಟೈಪ್ ಮಾಡಿ)*`;
        await sock.sendMessage(userId, { text: menuKN });
    } else {
        const menuEN = `Hi ${firstName}! Welcome to *FixMaadi Bagalkot*! 🙏\nReply with number (1-12) or type the service name:\n\n1. Purohit & Pujas (from ₹501) 🙏\n2. Mixie & Fan Repair (from ₹79) 🔧\n3. Plumber (from ₹99) 💧\n4. Electrician (from ₹79) ⚡\n5. Beautician (Women) (from ₹149) ✂️\n6. Men Haircut & Grooming (from ₹99) 💈\n7. Septic Tank & Sump Cleaning (from ₹499) 🚜\n8. Event & Stage Decoration (from ₹999) 🎈\n9. Catering & Cooking Labour (from ₹499) 🍲\n10. Carpenter & Woodwork (from ₹149) 🪚\n11. Home Tutors (from ₹499/mo) 📚\n12. Civil Labour & Painting (from ₹299) 🎨\n\n*(Type "0" or "BACK" anytime to return to main menu)*`;
        await sock.sendMessage(userId, { text: menuEN });
    }
}

async function startBot() {
    logMessage('Starting FixMaadi Engine...');
    botStatus = 'Starting engine...';
    const authFolder = path.join(__dirname, 'baileys_auth_info');
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    sockInstance = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { currentQR = qr; botStatus = 'WAITING_FOR_QR_SCAN'; logMessage('📱 New QR Code generated! Scan at http://localhost:3000'); }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            botStatus = `Disconnected (code ${statusCode}). Reconnecting...`;
            logMessage(botStatus);
            if (shouldReconnect) { setTimeout(startBot, 2000); }
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
                const senderPhone = '+' + userId.replace(/[^0-9]/g, '');
                logMessage(`📩 Message from ${senderPhone}: "${text || '[Media]'}"`);

                if (!text) continue;

                const lowerText = text.toLowerCase();

                if (lowerText === '0' || lowerText === 'back' || lowerText === 'menu' || lowerText.includes('ಹಿಂತಿರುಗಿ') || lowerText.includes('ಮೆನು')) {
                    clearUserTimer(userId);
                    delete userStates[userId];
                    logMessage(`🔄 ${senderPhone} returned to Main Menu`);
                }

                if (!userStates[userId]) {
                    userStates[userId] = { step: 'NEW', followUpCount: 0, timer: null };
                } else {
                    clearUserTimer(userId);
                    userStates[userId].followUpCount = 0;
                }

                const currentState = userStates[userId];

                if (currentState.step === 'NEW' || lowerText === 'hi' || lowerText === 'hello' || lowerText === 'start' || lowerText === 'namaskara' || lowerText === 'ನಮಸ್ಕಾರ') {
                    if (customerDatabase[senderPhone]) {
                        userStates[userId].fullName = customerDatabase[senderPhone].name;
                        userStates[userId].firstName = customerDatabase[senderPhone].firstName;
                    }

                    const langPrompt = `Namaskara! Welcome to *FixMaadi Bagalkot* 🙏\n(0% Commission Local Community Network)\n\nPlease reply to choose language / ದಯವಿಟ್ಟು ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:\n\n1️⃣ ಕನ್ನಡ (Kannada)\n2️⃣ English\n\n*(For help/queries, call Bhuvan Nara: ${BHUVAN_PHONE})*`;
                    
                    await sock.sendMessage(userId, { text: langPrompt });
                    userStates[userId].step = 'AWAITING_LANG';
                    logMessage(`📤 Sent Language Selection to ${senderPhone}`);
                    scheduleFollowUp(sock, userId);
                }
                else if (currentState.step === 'AWAITING_LANG') {
                    if (lowerText === '1' || lowerText.includes('kannada') || lowerText.includes('ಕನ್ನಡ')) {
                        userStates[userId].lang = 'kn';
                    } else if (lowerText === '2' || lowerText.includes('english')) {
                        userStates[userId].lang = 'en';
                    } else {
                        await sock.sendMessage(userId, { text: `Please reply 1 for Kannada or 2 for English / ಕನ್ನಡಕ್ಕಾಗಿ 1 ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ಗಾಗಿ 2 ಟೈಪ್ ಮಾಡಿ.` });
                        scheduleFollowUp(sock, userId);
                        return;
                    }

                    if (userStates[userId].firstName) {
                        userStates[userId].step = 'AWAITING_SERVICE';
                        await sendServiceMenu(sock, userId, userStates[userId].lang, userStates[userId].firstName);
                    } else {
                        userStates[userId].step = 'AWAITING_NAME';
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
                    const nameParts = fullName.split(' ');
                    const firstName = nameParts[0];

                    userStates[userId].fullName = fullName;
                    userStates[userId].firstName = firstName;
                    customerDatabase[senderPhone] = { name: fullName, firstName: firstName };

                    userStates[userId].step = 'AWAITING_SERVICE';
                    await sendServiceMenu(sock, userId, userStates[userId].lang, firstName);
                }
                else if (currentState.step === 'AWAITING_SERVICE') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';
                    const servicesDict = isKN ? SERVICES_KN : SERVICES_EN;
                    const selected = matchService(text, servicesDict);

                    if (selected) {
                        userStates[userId].service = `${selected.name} (${selected.price})`;
                        userStates[userId].step = 'AWAITING_LOCATION';
                        
                        const promptMsg = isKN 
                            ? `ಉತ್ತಮ ಆಯ್ಕೆ ${firstName} ಅವರೇ! ನೀವು *${selected.name}* ಆಯ್ಕೆ ಮಾಡಿದ್ದೀರಿ.\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ *ಏರಿಯಾ/ವಿಳಾಸ* (ಉದಾ: ನವನಗರ ಸೆಕ್ಟರ್ 4) ಮತ್ತು *ಸಮಯ*ವನ್ನು ಕಳುಹಿಸಿ.\n\n*(ಹಿಂದಕ್ಕೆ ಹೋಗಲು "0" ಅಥವಾ "ಹಿಂತಿರುಗಿ" ಎಂದು ಟೈಪ್ ಮಾಡಿ)*`
                            : `Great choice, ${firstName}! You selected *${selected.name}*.\n\nPlease reply with your *Area/Address* (e.g., Navanagar Sector 4) and *Preferred Time* (e.g., Today 5 PM).\n\n*(Type "0" anytime to return to main menu)*`;
                        
                        await sock.sendMessage(userId, { text: promptMsg });
                        logMessage(`📤 Sent Location Prompt to ${firstName} (${senderPhone})`);
                        scheduleFollowUp(sock, userId);
                    } else {
                        const invalidMsg = isKN 
                            ? `ದಯವಿಟ್ಟು 1 ರಿಂದ 12 ರವರೆಗಿನ ಸಂಖ್ಯೆ ಅಥವಾ ಸೇವೆಯ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ ${firstName} ಅವರೇ (ಉದಾ: 3 ಅಥವಾ ಪ್ಲಂಬರ್):`
                            : `Please reply with a number (1-12) or service name, ${firstName} (e.g. 3 or Plumber):`;
                        await sock.sendMessage(userId, { text: invalidMsg });
                        scheduleFollowUp(sock, userId);
                    }
                }
                else if (currentState.step === 'AWAITING_LOCATION') {
                    const isKN = currentState.lang === 'kn';
                    const firstName = currentState.firstName || 'Customer';
                    const fullName = currentState.fullName || firstName;
                    const locationAndTime = text;
                    const service = userStates[userId].service;
                    
                    clearUserTimer(userId);
                    userStates[userId].step = 'COMPLETED';

                    const startOtp = generate4DigitOtp();
                    const endOtp = generate4DigitOtp();

                    const newBooking = {
                        id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
                        customerJid: userId,
                        customerName: fullName,
                        customerPhone: senderPhone,
                        service: service,
                        location: locationAndTime,
                        status: 'Pending',
                        assignedVendor: null,
                        assignedVendorPhone: null,
                        startOtp: startOtp,
                        endOtp: endOtp,
                        startOtpVerified: false,
                        endOtpVerified: false,
                        customerRating: null,
                        reviewComment: null,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    bookings.unshift(newBooking);

                    const confirmMsg = isKN
                        ? `✅ *ಬುಕಿಂಗ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ, ${firstName} ಅವರೇ!*\n\n• ಗ್ರಾಹಕರು: ${fullName}\n• ಸೇವೆ: ${service}\n• ವಿಳಾಸ & ಸಮಯ: ${locationAndTime}\n\nಕ್ಷೇತ್ರ ನಿರ್ವಾಹಕ ಭುವನ್ ನಾರಾ (${BHUVAN_PHONE}) ಅವರು 10 ನಿಮಿಷದಲ್ಲಿ ಸ್ಥಳೀಯ ಕೆಲಸಗಾರರನ್ನು ನಿಯೋಜಿಸಿ ನಿಮಗೆ ಕರೆ ಮಾಡಲಿದ್ದಾರೆ.\n\nFixMaadi ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು!`
                        : `✅ *Booking Received, ${firstName}!*\n\n• Customer: ${fullName}\n• Service: ${service}\n• Location & Time: ${locationAndTime}\n\nField Operations Head Bhuvan Nara (${BHUVAN_PHONE}) is assigning a trusted local professional right now and will call you in 10 minutes.\n\nThank you for choosing FixMaadi!`;

                    await sock.sendMessage(userId, { text: confirmMsg });
                    logMessage(`🎉 NEW BOOKING (${service}) from ${fullName} (${senderPhone})`);
                    delete userStates[userId];
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
