const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'settings.json'), 'utf-8'));

// Tracks users currently waiting on an approval reply: jid -> { timer, resolved }
const pendingApprovals = new Map();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('[cobra-bot] Connected successfully.');
      const ownJid = sock.user.id;
      askForApproval(sock, ownJid);
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[cobra-bot] Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const textBody =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    const pending = pendingApprovals.get(sender);
    if (!pending) return; // not waiting on this user

    const reply = textBody.trim().toLowerCase();

    if (reply === 'yes') {
      pending.resolved = true;
      clearTimeout(pending.timer);
      pendingApprovals.delete(sender);
      await applyProfilePicture(sock, sender);
    } else if (reply === 'no') {
      pending.resolved = true;
      clearTimeout(pending.timer);
      pendingApprovals.delete(sender);
      await sock.sendMessage(sender, { text: settings.declinedMessage });
    }
    // any other reply is ignored, user can still reply yes/no until timeout
  });
}

async function askForApproval(sock, jid) {
  await sock.sendMessage(jid, { text: settings.promptMessage });

  const timer = setTimeout(async () => {
    const pending = pendingApprovals.get(jid);
    if (pending && !pending.resolved) {
      pendingApprovals.delete(jid);
      await sock.sendMessage(jid, { text: settings.timeoutMessage });
    }
  }, settings.approveTimeoutSeconds * 1000);

  pendingApprovals.set(jid, { timer, resolved: false });
}

async function applyProfilePicture(sock, jid) {
  const imagePath = path.join(__dirname, settings.pfpImage);

  if (!fs.existsSync(imagePath)) {
    console.log('[cobra-bot] Image not found at', imagePath);
    await sock.sendMessage(jid, { text: 'Something went wrong — image not found.' });
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);

  try {
    await sock.updateProfilePicture(jid, imageBuffer);
    await sock.sendMessage(jid, { text: settings.approvedMessage });
    console.log('[cobra-bot] Profile picture updated for', jid);
  } catch (err) {
    console.log('[cobra-bot] Failed to update picture:', err.message);
    await sock.sendMessage(jid, { text: 'Failed to update profile picture. Please try again later.' });
  }
}

startBot();