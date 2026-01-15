# Quick Start Guide - Assign Cleaner Script

## 🚀 What You Got

I've created a complete TypeScript solution for automatically assigning cleaners to garbage detection results based on location matching. Here's what was built:

### Files Created:
- `src/scripts/assign-cleaner.ts` - Main assignment logic
- `src/scripts/example-usage.ts` - Usage examples
- `src/scripts/test-assignment.ts` - Test script
- `src/scripts/README.md` - Detailed documentation
- `src/scripts/QUICK_START.md` - This quick start guide

### Dependencies Added:
- `firebase-admin` - For server-side Firestore operations
- `tsx` - For running TypeScript files directly

## 🔧 Setup (Required)

### 1. Firebase Admin SDK Configuration

**For Development (Quick Start):**
The script is already configured to work with your project ID (`safai-saathi`). It will use the default credentials if you're running from a Firebase project environment.

**For Production:**
You need to set up proper Firebase Admin SDK credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Settings → Service Accounts
2. Click "Generate new private key" 
3. Download the JSON file
4. Update `src/scripts/assign-cleaner.ts`:

```typescript
// Replace the initializeFirebaseAdmin function with:
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(require('../path/to/your-service-account-key.json')),
      projectId: 'safai-saathi',
    });
  }
  return getFirestore();
};
```

## 🎯 How It Works

1. **Fetches Detection**: Gets a detection document from `model_results` collection
2. **Extracts Address**: Converts `location.address` to lowercase
3. **Fetches Staff**: Gets all staff members from `staff` collection  
4. **Matches Locations**: For each staff member:
   - Splits `working_area` into words (e.g., "Sodepur Barrackpore" → ["sodepur", "barrackpore"])
   - Checks if ALL words are contained in the detection address
5. **Updates Document**: If match found, adds:
   ```json
   {
     "staffId": "staff-document-id",
     "working_area": "Sodepur Barrackpore"
   }
   ```

## 🚀 Usage

### Test the Script
```bash
npm run test-assignment
```

### Assign Cleaners to All Unassigned Detections
```bash
npm run assign-cleaners
```

### Use in Your Code
```typescript
import { assignCleaner, assignCleanersToUnassigned } from './src/scripts/assign-cleaner';

// Assign to specific detection
const success = await assignCleaner('detection-id-here');

// Assign to all unassigned detections
const result = await assignCleanersToUnassigned();
console.log(`${result.successful} successful, ${result.failed} failed`);
```

## 📋 Example Matching

| Staff Working Area | Detection Address | Match |
|-------------------|-------------------|-------|
| "Sodepur Barrackpore" | "Nilgunj Road, Sodepur, Barrackpore, West Bengal, India" | ✅ |
| "Park Street Area" | "Park Street, Kolkata, West Bengal, India" | ✅ |
| "Salt Lake Sector 1" | "Sector 1, Salt Lake, Kolkata, India" | ✅ |
| "Howrah Station" | "Park Street, Kolkata, India" | ❌ |

## 🛠️ Available Functions

- `assignCleaner(detectionId: string)` - Assign cleaner to specific detection
- `batchAssignCleaners(detectionIds: string[])` - Assign to multiple detections
- `assignCleanersToUnassigned()` - Assign to all unassigned detections
- `getUnassignedDetections()` - Get list of unassigned detection IDs

## 🔍 Error Handling

The script handles:
- ✅ Detection document not found
- ✅ Missing `location.address`
- ✅ Staff without `working_area`
- ✅ No matching staff found
- ✅ Network/Firestore errors

## 🎉 Next Steps

1. **Test it**: Run `npm run test-assignment` to see it in action
2. **Configure credentials**: Set up Firebase Admin SDK for production
3. **Integrate**: Use the functions in your application
4. **Monitor**: Check the console logs for assignment results

## 📞 Need Help?

- Check `src/scripts/README.md` for detailed documentation
- Look at `src/scripts/example-usage.ts` for code examples
- Run `npm run test-assignment` to test the functionality

The script is ready to use! 🎊
