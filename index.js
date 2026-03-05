const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');
const express = require('express');

// Render için Web Sunucusu (10000 portunu otomatik dinler)
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('MarioWash Botu Aktif!'));
app.listen(port, () => console.log(`Sunucu ${port} portunda aktif.`));

// Firebase Bağlantısı
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mariowash-81032-default-rtdb.firebaseio.com"
});

const db = admin.database();

// WhatsApp İstemcisi ve Docker Ayarları
const client = new Client({ 
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
        ] 
    } 
});

// QR KODU EKRANA BASMA (Okunabilirlik iyileştirildi)
client.on('qr', (qr) => {
    console.log('\n--- LÜTFEN TELEFONUNUZDAN BU KODU OKUTUN ---');
    qrcode.generate(qr, {small: true});
    console.log('--- KODUN SÜRESİ DOLARSA SAYFAYI YENİLEYİN ---\n');
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot Başarıyla Bağlandı ve Hazır!');
    const startTime = Date.now(); 

    db.ref('transactions').on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const entryTime = new Date(data.date).getTime();
        if (entryTime < startTime || !data.waNotify || !data.phone) return;

        // Numara Temizleme
        let cleanPhone = data.phone.replace(/\D/g, ""); 
        if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1); 
        if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;
        
        const phoneId = cleanPhone + "@c.us";
        const msg = `Sayın ${data.name},\n${data.plate} plakalı aracınızı *yıkama ve temizlik* işlemlerinde bizi tercih ettiğiniz için teşekkür ederiz.\n\nMemnuniyetiniz bizim için önceliklidir.\n\nTekrar görüşmek dileğiyle.\n*MarioWash*`;

        setTimeout(() => {
            client.sendMessage(phoneId, msg)
                .then(() => console.log(`Mesaj Gönderildi: ${data.plate}`))
                .catch(err => console.error("Gönderim Hatası:", err));
        }, 3000);
    });
});

client.initialize();
