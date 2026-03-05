const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('MarioWash Botu Aktif!'));
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
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    } 
});

// BURASI KRİTİK: Terminal bozuksa linke tıkla
client.on('qr', (qr) => {
    console.log('\n-----------------------------------------------------');
    console.log('TERMİNALDEKİ KOD OKUNMUYORSA AŞAĞIDAKİ LİNKE TIKLAYIN:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
    console.log('-----------------------------------------------------\n');
    
    // Yine de terminale de çizelim (belki zoom ile düzelir)
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('✅ BAŞARILI: WhatsApp Botu bağlandı!');
    const startTime = Date.now(); 

    db.ref('transactions').on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.phone) return;
        
        const entryTime = new Date(data.date).getTime();
        if (entryTime < startTime || !data.waNotify) return;

        let cleanPhone = data.phone.replace(/\D/g, ""); 
        if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1); 
        if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;
        
        const phoneId = cleanPhone + "@c.us";
        const msg = `Sayın ${data.name},\n${data.plate} plakalı aracınızı *yıkama ve temizlik* işlemlerinde bizi tercih ettiğiniz için teşekkür ederiz.\n\nTekrar görüşmek dileğiyle.\n*MarioWash*`;

        setTimeout(() => {
            client.sendMessage(phoneId, msg)
                .then(() => console.log(`Mesaj Gönderildi: ${data.plate}`))
                .catch(err => console.error("Hata:", err));
        }, 3000);
    });
});

client.initialize();
