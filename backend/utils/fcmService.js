const admin = require('firebase-admin');

let initialized = false;

function getMessaging() {
  if (!initialized) {
    try {
      const serviceAccount = require('../firebase-service-account.json');
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      initialized = true;
    } catch (e) {
      console.warn('[FCM] firebase-service-account.json not found — push notifications disabled');
      return null;
    }
  }
  return admin.messaging();
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;
  const messaging = getMessaging();
  if (!messaging) return;
  // FCM data values must all be strings
  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: stringData,
      android: { priority: 'high' },
    });
  } catch (err) {
    console.warn('[FCM] Send failed:', err.message);
  }
};

module.exports = { sendPushNotification };
