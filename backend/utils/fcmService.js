const sendPushNotification = async (fcmToken, title, body) => {
  if (!process.env.FCM_SERVER_KEY || !fcmToken) return;
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: { title, body },
        android: { priority: 'high' },
        priority: 'high',
      }),
    });
    const data = await res.json();
    if (!data.success) console.warn('[FCM] Send failed:', JSON.stringify(data.results?.[0]));
  } catch (err) {
    console.warn('[FCM] Error:', err.message);
  }
};

module.exports = { sendPushNotification };
