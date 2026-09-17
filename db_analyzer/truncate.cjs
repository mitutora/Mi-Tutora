const admin = require('firebase-admin');
const serviceAccount = require('./tutor-app-1e394-firebase-adminsdk-fbsvc-229cb7c69a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'tutor-app-1e394.firebasestorage.app'
});

const db = admin.firestore();

async function truncateCollection(collectionName) {
    const colRef = db.collection(collectionName);
    const snapshot = await colRef.get();
    
    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is already empty.`);
        return;
    }
    
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
        // If applications, also delete subcollections (like privateData)
        if (collectionName === 'applications') {
            try {
                const subCols = await doc.ref.listCollections();
                for (const subCol of subCols) {
                    const subSnapshot = await subCol.get();
                    for (const subDoc of subSnapshot.docs) {
                        batch.delete(subDoc.ref);
                        count++;
                        if (count % 500 === 0) {
                            await batch.commit();
                            batch = db.batch();
                        }
                    }
                }
            } catch (err) {
                console.warn(`Could not list subcollections for ${doc.id}:`, err.message);
            }
        }

        batch.delete(doc.ref);
        count++;
        // Commit batches of 500
        if (count % 500 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    
    // Commit the remainder
    if (count % 500 !== 0) {
        await batch.commit();
    }
    
    console.log(`Deleted ${count} documents from ${collectionName}.`);
}

async function truncateAuth() {
    console.log("Starting Firebase Authentication truncation...");
    try {
        let nextPageToken;
        let count = 0;
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            const uids = listUsersResult.users.map(userRecord => userRecord.uid);
            if (uids.length > 0) {
                const deleteResult = await admin.auth().deleteUsers(uids);
                count += deleteResult.successCount;
                if (deleteResult.failureCount > 0) {
                    console.log(`Failed to delete ${deleteResult.failureCount} auth users.`);
                }
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        console.log(`Deleted ${count} users from Firebase Authentication.`);
    } catch (error) {
        console.error("Error deleting auth users:", error);
    }
}

async function truncateStorage() {
    console.log("Starting Firebase Storage truncation...");
    try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles();
        
        if (!files || files.length === 0) {
            console.log("Firebase Storage is already empty.");
            return;
        }
        
        console.log(`Found ${files.length} files in Firebase Storage (${bucket.name}). Deleting...`);
        await bucket.deleteFiles({ force: true });
        console.log(`Deleted all ${files.length} files from Firebase Storage.`);
    } catch (error) {
        console.error("Error deleting storage files:", error);
    }
}

async function runTruncation() {
    console.log("Starting full database & storage truncation...");
    const collections = [
        'users',
        'tutors',
        'parents',
        'students',
        'tuition_requests',
        'applications',
        'groups',
        'referrals',
        'notifications',
        'payments',
        'pending_tuition_fees',
        'reviews',
        'tutor_payouts',
        'admin_activity'
    ];
    
    for (const col of collections) {
        await truncateCollection(col);
    }
    
    await truncateAuth();
    await truncateStorage();
    
    console.log("Truncation complete! All specified collections, auth users, and Firebase Storage files are now completely empty.");
}

runTruncation().catch(console.error);
