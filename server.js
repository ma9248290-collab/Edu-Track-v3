const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors()); // السماح للسيستم بتاعك إنه يكلم السيرفر
app.use(express.json());

let receivedMessages = []; // خزانة مؤقتة للرسائل اللي بتوصل

// إعداد متصفح الواتساب المخفي
const client = new Client({
    authStrategy: new LocalAuth(), // عشان يحفظ الباركود وميطلبوش كل شوية
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// 1. توليد الباركود
client.on('qr', (qr) => {
    console.log('📱 امسك الموبايل واعمل سكان للـ QR Code ده:');
    qrcode.generate(qr, { small: true });
});

// 2. تم الربط بنجاح
client.on('ready', () => {
    console.log('🚀 سيرفر الواتساب جاهز ومربوط برقمك بنجاح!');
});

// 3. استقبال الرسائل الجديدة
client.on('message', async msg => {
    // نتأكد إنها رسالة نصية ومش من جروب ومش مبعوتة منك
    if (!msg.fromMe && !msg.isGroupMsg && msg.type === 'chat') {
        receivedMessages.push({
            id: msg.id._serialized,
            from: msg.from,
            body: msg.body
        });
        console.log(`📩 رسالة جديدة من ${msg.from}: ${msg.body}`);
    }
});

client.initialize();

// ==========================================
// 🌐 نقط اتصال السيرفر بالسيستم بتاعك (API)
// ==========================================

// نقطة الإرسال (السيستم بيكلمها عشان يبعت تقارير أو ردود البوت)
app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    try {
        const chatId = phone + "@c.us";
        await client.sendMessage(chatId, message);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('خطأ في الإرسال:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// نقطة الاستقبال (السيستم بيكلمها عشان يسحب الرسايل ويخلي البوت يرد عليها)
app.get('/messages', (req, res) => {
    res.status(200).json({ messages: receivedMessages });
    receivedMessages = []; // تفريغ الخزانة بعد ما السيستم يسحبهم
});

app.listen(3000, () => {
    console.log('🌐 السيرفر المحلي شغال ومستعد على بورت 3000...');
});
