# Assign Cleaner Script

This script connects to Firestore and automatically assigns cleaners to garbage detection results based on location matching.

## Setup

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Firebase Admin SDK Configuration

For production use, you'll need to set up Firebase Admin SDK credentials:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" to download the service account key
3. Save the key file securely (e.g., `serviceAccountKey.json`)
4. Update the `initializeFirebaseAdmin()` function in `assign-cleaner.ts`:

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '../path/to/serviceAccountKey.json';

const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: 'safai-saathi',
    });
  }
  return getFirestore();
};
```

### 3. Environment Variables (Recommended)

For better security, use environment variables:

```bash
# .env.local
FIREBASE_PROJECT_ID=safai-saathi
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@safai-saathi.iam.gserviceaccount.com
```

Then update the initialization:

```typescript
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return getFirestore();
};
```

## Usage

### Basic Usage

```typescript
import { assignCleaner } from './assign-cleaner';

// Assign a cleaner to a specific detection
const success = await assignCleaner('detection-id-here');
console.log('Assignment successful:', success);
```

### Batch Assignment

```typescript
import { batchAssignCleaners, assignCleanersToUnassigned } from './assign-cleaner';

// Assign cleaners to multiple specific detections
const detectionIds = ['id1', 'id2', 'id3'];
const result = await batchAssignCleaners(detectionIds);

// Assign cleaners to all unassigned detections
const batchResult = await assignCleanersToUnassigned();
```

## How It Works

1. **Fetches Detection**: Gets the detection document from `model_results` collection
2. **Extracts Address**: Converts the location address to lowercase
3. **Fetches Staff**: Gets all staff members from `staff` collection
4. **Matches Locations**: For each staff member:
   - Splits their `working_area` into words
   - Checks if ALL words are contained in the detection address
5. **Updates Document**: If a match is found, updates the detection with:
   ```json
   {
     "staffId": "staff-document-id",
     "working_area": "Sodepur Barrackpore"
   }
   ```

## Example Matching

- **Staff working_area**: "Sodepur Barrackpore"
- **Detection address**: "Nilgunj Road, Sodepur, Barrackpore, West Bengal, India"
- **Match**: ✅ Both "sodepur" and "barrackpore" are found in the address

## Error Handling

The script handles these edge cases:
- Detection document not found
- Detection without `location.address`
- Staff members without `working_area`
- No matching staff found
- Network/Firestore errors

## Security Notes

- Never commit service account keys to version control
- Use environment variables for production
- Consider using Firebase Functions for server-side execution
- Implement proper authentication for API endpoints
