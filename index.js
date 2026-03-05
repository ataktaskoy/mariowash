const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');
const express = require('express');

// Render'ın uykuya dalmaması için basit bir web sunucusu
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Çalışıyor!'));
app.listen(port, () => console.log(`Sunucu ${port} portunda aktif.`));

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
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ] 
    } 
});

client.on('qr', qr => qrcode.generate(qr, {small: true}));

client.on('ready', () => {
    console.log('WhatsApp Bot Hazır ve Dinlemede!');
    const startTime = Date.now(); 

    db.ref('transactions').on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const entryTime = new Date(data.date).getTime();
        if (entryTime < startTime || !data.waNotify || !data.phone) return;

        let cleanPhone = data.phone.replace(/\D/g, ""); 
        if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1); 
        if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;
        
        const phoneId = cleanPhone + "@c.us";
        const msg = `Sayın ${data.name},\n${data.plate} plakalı aracınızı *yıkama ve temizlik* işlemlerinde bizi tercih ettiğiniz için teşekkür ederiz.\n\nMemnuniyetiniz bizim için önceliklidir. Aracınızı her zaman aynı özen ve kaliteyle ağırlamaktan memnuniyet duyarız.\n\nTekrar görüşmek dileğiyle.\n*MarioWash*`;

        setTimeout(() => {
            client.sendMessage(phoneId, msg)
                .then(() => console.log(`Mesaj Gönderildi: ${data.plate}`))
                .catch(err => console.error("Gönderim Hatası:", err));
        }, 3000);
    });
});

client.initialize();
