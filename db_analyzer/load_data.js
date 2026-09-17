import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccountPath = './tutor-app-1e394-firebase-adminsdk-fbsvc-229cb7c69a.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`ERROR: Service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function loadData() {
  console.log('Connecting to Firestore to dump data...');
  
  try {
    const collections = await db.listCollections();
    
    let mdReport = '# Firestore Data Dump\n\n';
    mdReport += `Generated on: ${new Date().toISOString()}\n\n`;
    mdReport += `This file contains the raw data from all documents in the database to help trace foreign keys and logic.\n\n`;
    
    for (const collection of collections) {
      console.log(`Loading collection: [${collection.id}]...`);
      mdReport += `## Collection: \`${collection.id}\`\n\n`;
      
      const snapshot = await collection.get();
      
      if (snapshot.empty) {
        mdReport += `*(Empty collection)*\n\n`;
      } else {
        snapshot.forEach(doc => {
          mdReport += `### Document: \`${doc.id}\`\n`;
          mdReport += '```json\n';
          mdReport += JSON.stringify(doc.data(), null, 2) + '\n';
          mdReport += '```\n\n';
        });
      }
      
      mdReport += '---\n\n';
    }
    
    fs.writeFileSync('./data_analysis.md', mdReport);
    console.log('✅ Data loaded successfully to data_analysis.md');
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

loadData();
