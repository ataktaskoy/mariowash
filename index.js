const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('MarioWash Aktif!'));
app.listen(port, () => console.log(`Sunucu aktif.`));

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mariowash-81032-default-rtdb.firebaseio.com"
});
const db = admin.database();

const client = new Client({ 
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--no-first-run',
            '--js-flags="--max-old-space-size=400"' // RAM'i zorla sınırla
        ] 
    } 
});

client.on('qr', (qr) => {
    console.log(`\nLINK: https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300\n`);
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('✅ BOT HAZIR!');
    const startTime = Date.now(); 

    db.ref('transactions').on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.phone || !data.waNotify) return;
        
        const entryTime = new Date(data.date).getTime();
        if (entryTime < startTime) return;

        let cleanPhone = data.phone.replace(/\D/g, ""); 
        if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1); 
        if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;
        
        const phoneId = cleanPhone + "@c.us";
        const msg = `Sayın ${data.name},\n${data.plate} plakalı aracınızı tercih ettiğiniz için teşekkür ederiz.\n*MarioWash*`;

        client.sendMessage(phoneId, msg)
            .then(() => console.log(`Mesaj Gitti: ${data.plate}`))
            .catch(err => console.log("Hata"));
    });
});

client.initialize();
