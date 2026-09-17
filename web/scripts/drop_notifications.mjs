import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('./.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line.trim() !== '' && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    acc[key.trim()] = valueParts.join('=').trim().replace(/(^"|"$)/g, ''); // simple parser
    return acc;
  }, {});

const firebaseConfig = {
  apiKey: envConfig['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: envConfig['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: envConfig['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: envConfig['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: envConfig['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: envConfig['NEXT_PUBLIC_FIREBASE_APP_ID'],
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dropNotifications() {
  console.log('Fetching notifications...');
  const notifRef = collection(db, 'notifications');
  const snapshot = await getDocs(notifRef);
  
  if (snapshot.empty) {
    console.log('No notifications found. Collection is already empty.');
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} notifications. Deleting...`);
  
  let count = 0;
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, 'notifications', document.id));
    count++;
    if (count % 10 === 0) console.log(`Deleted ${count} notifications...`);
  }
  
  console.log(`Successfully deleted all ${count} notifications. Collection dropped!`);
  process.exit(0);
}

dropNotifications().catch(err => {
  console.error('Error dropping notifications:', err);
  process.exit(1);
});
