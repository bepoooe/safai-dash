# Model-to-Dashboard Integration Guide

## Overview
This guide shows how to connect your **Safai Saathi Model** (Flask YOLOv8 app) to your **Safai Sathi Dashboard** (Next.js + Firebase) for real-time garbage detection feeds.

## 🎯 What This Enables

- **Real-time Detection**: Model detections automatically appear on the dashboard heatmap
- **Live Updates**: Dashboard refreshes every 30 seconds with latest detections
- **GPS Tracking**: Location data from mobile/GPS is preserved
- **Automatic Storage**: All detections stored in Firebase Firestore
- **No Manual Upload**: Completely automated pipeline from detection to visualization

## 📁 Files Created

### Dashboard Side (This Project)
1. **`src/services/modelUploadService.ts`** - Service to validate and store detections
2. **`src/app/api/model/upload/route.ts`** - API endpoint to receive detections
3. **`src/scripts/flask_firebase_integration.py`** - Python code for Flask app

### Model Side (Your Flask App)
You'll need to modify your existing Flask app with the code from `flask_firebase_integration.py`

## 🚀 Setup Instructions

### Step 1: Start Your Dashboard

```bash
cd safaiSathi-dashboard
npm run dev
```

Dashboard will run at: `http://localhost:3000`

### Step 2: Test the API Endpoint

Open browser or use curl:
```bash
curl http://localhost:3000/api/model/upload
```

You should see API documentation in JSON format.

### Step 3: Integrate with Flask Model

1. **Open your Flask app** (`app.py` from Safai-Saathi-Model repo)

2. **Add the configuration** at the top of your file:
```python
import requests
import json
from datetime import datetime

# Dashboard configuration
DASHBOARD_URL = "http://localhost:3000"
UPLOAD_ENDPOINT = f"{DASHBOARD_URL}/api/model/upload"
```

3. **Add the upload function**:
```python
def upload_detection_to_firebase(detection_count, confidence_scores, location_data):
    try:
        payload = {
            "detection_count": detection_count,
            "confidence_scores": confidence_scores,
            "location": {
                "source": location_data.get('source', 'IP'),
                "latitude": location_data.get('latitude', 0),
                "longitude": location_data.get('longitude', 0),
                "accuracy": location_data.get('accuracy', 'Unknown'),
                "address": location_data.get('address', 'Unknown'),
                "timestamp": location_data.get('timestamp', datetime.now().isoformat())
            },
            "timestamp": datetime.now().isoformat(),
            "model_version": "YOLOv8"
        }
        
        # Add optional location fields
        if location_data.get('city'):
            payload['location']['city'] = location_data['city']
        if location_data.get('region'):
            payload['location']['region'] = location_data['region']
        if location_data.get('country'):
            payload['location']['country'] = location_data['country']
        
        response = requests.post(
            UPLOAD_ENDPOINT,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Uploaded to Firebase: {response.json().get('documentId')}")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Firebase upload error: {e}")
        return False
```

4. **Update your `log_detection_with_location` function**:

Find this function in your Flask app and add the upload call:

```python
def log_detection_with_location(detection_count, confidence_scores):
    # ... your existing code ...
    
    if location_data:
        log_entry = {
            'detection_count': detection_count,
            'confidence_scores': confidence_scores,
            'location': location_data,
            'timestamp': datetime.now().isoformat()
        }
        detection_logs.append(log_entry)
        
        # 🔥 ADD THIS LINE - Upload to Firebase
        upload_detection_to_firebase(detection_count, confidence_scores, location_data)
        
        # ... rest of your code ...
```

5. **Install required package** (if not already installed):
```bash
pip install requests
```

### Step 4: Test End-to-End

1. **Start Dashboard** (if not running):
```bash
npm run dev
```

2. **Start Flask Model**:
```bash
python app.py
```

3. **Run Detection**:
   - Upload a video, or
   - Use camera, or
   - Use mobile CCTV via ngrok

4. **Watch the Magic**:
   - Flask console: See "✅ Uploaded to Firebase" messages
   - Dashboard: Open `http://localhost:3000/dashboard/heatmap`
   - Detections appear in real-time on the map!

## 📊 Data Flow

```
┌─────────────────────┐
│  Safai Saathi Model │
│   (Flask + YOLOv8)  │
│                     │
│  1. Detects garbage │
│  2. Gets GPS/IP loc │
│  3. Calculates conf │
└──────────┬──────────┘
           │
           │ HTTP POST
           │ /api/model/upload
           ▼
┌─────────────────────┐
│      Dashboard      │
│   (Next.js + API)   │
│                     │
│  1. Validates data  │
│  2. Stores in FB    │
└──────────┬──────────┘
           │
           │ Firestore
           ▼
┌─────────────────────┐
│      Firebase       │
│  model_results col  │
│                     │
│  Stores detection   │
└──────────┬──────────┘
           │
           │ Real-time read
           ▼
┌─────────────────────┐
│   Heatmap Display   │
│  (Every 30 seconds) │
│                     │
│  Shows on map       │
└─────────────────────┘
```

## 🧪 Testing & Debugging

### Check API Connection
```bash
# From Flask app directory
curl -X GET http://localhost:3000/api/model/upload
```

### Test Upload Manually
```bash
curl -X POST http://localhost:3000/api/model/upload \
  -H "Content-Type: application/json" \
  -d '{
    "detection_count": 3,
    "confidence_scores": [0.85, 0.92, 0.78],
    "location": {
      "source": "GPS",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": "±50 meters",
      "address": "Connaught Place, New Delhi, India",
      "city": "New Delhi",
      "country": "India",
      "timestamp": "2026-01-15T10:30:00Z"
    },
    "timestamp": "2026-01-15T10:30:00Z",
    "model_version": "YOLOv8"
  }'
```

### Check Flask Logs
Look for:
- ✅ `Uploaded to Firebase: <document-id>` - Success!
- ❌ `Upload failed: <error>` - Check dashboard is running
- ❌ `Firebase upload error: <error>` - Network/connection issue

### Check Dashboard
1. Open: `http://localhost:3000/dashboard/heatmap`
2. Look for new detection points on map
3. Check stats: "Active Points" should increase
4. Console log should show: "✅ Detection stored in Firebase"

### Check Firebase
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `model_results` collection
4. New documents should appear with detection data

## 🌐 Production Deployment

### When Deploying Dashboard

1. **Update Flask App Configuration**:
```python
# Replace localhost with your deployed URL
DASHBOARD_URL = "https://your-dashboard.vercel.app"
UPLOAD_ENDPOINT = f"{DASHBOARD_URL}/api/model/upload"
```

2. **Add API Key Security** (Recommended):

In Flask app:
```python
API_KEY = "your-secret-api-key"
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_KEY}'
}
```

In Dashboard (`src/app/api/model/upload/route.ts`):
```typescript
// Add authentication check
const authHeader = request.headers.get('authorization');
if (!authHeader || authHeader !== 'Bearer your-secret-api-key') {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

3. **Set Environment Variables**:
```bash
# Dashboard (.env.local)
NEXT_PUBLIC_API_KEY=your-secret-api-key

# Flask app (.env)
DASHBOARD_URL=https://your-dashboard.vercel.app
API_KEY=your-secret-api-key
```

## 🔧 Advanced Features

### Batch Upload
If you want to upload multiple detections at once:

```python
# In Flask app
batch_payload = [
    {
        "detection_count": 3,
        "confidence_scores": [0.85, 0.92, 0.78],
        "location": {...},
        "timestamp": "2026-01-15T10:30:00Z"
    },
    {
        "detection_count": 5,
        "confidence_scores": [0.88, 0.91, 0.76, 0.89, 0.94],
        "location": {...},
        "timestamp": "2026-01-15T10:31:00Z"
    }
]

response = requests.post(UPLOAD_ENDPOINT, json=batch_payload)
```

### Add Image URLs
Include detection images:

```python
payload = {
    "detection_count": detection_count,
    "confidence_scores": confidence_scores,
    "location": location_data,
    "timestamp": datetime.now().isoformat(),
    "model_version": "YOLOv8",
    "image_url": "https://your-storage.com/detection-image.jpg"
}
```

### Sync Existing Logs
Add this route to Flask to sync all existing logs:

```python
@app.route('/sync_to_firebase', methods=['POST'])
def sync_to_firebase():
    for log in detection_logs:
        upload_detection_to_firebase(
            log['detection_count'],
            log['confidence_scores'],
            log['location']
        )
    return jsonify({'success': True, 'synced': len(detection_logs)})
```

## 🐛 Troubleshooting

### "Connection refused" error
- ✅ Ensure dashboard is running (`npm run dev`)
- ✅ Check `DASHBOARD_URL` is correct
- ✅ Try accessing dashboard in browser first

### Detections not appearing on map
- ✅ Refresh heatmap page
- ✅ Check Firebase Console for new documents
- ✅ Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- ✅ Check browser console for errors

### "Validation failed" error
- ✅ Ensure all required fields are present
- ✅ Check confidence_scores is an array
- ✅ Verify latitude/longitude are numbers
- ✅ See API documentation: `http://localhost:3000/api/model/upload`

### Upload succeeds but no map points
- ✅ Check if confidence scores are > 0
- ✅ Zero-confidence detections are hidden by design
- ✅ Look for "Active Points" count in dashboard stats

## 📱 Mobile/Remote Access

### Using ngrok for Remote Flask Access
If your Flask model runs on mobile/remote device:

1. Install ngrok: `https://ngrok.com/`
2. Start Flask: `python app.py`
3. Create tunnel: `ngrok http 5000`
4. Update Flask config:
```python
# Use your local machine's ngrok URL for dashboard
DASHBOARD_URL = "http://your-machine-ngrok-url.ngrok.app"
```

## ✅ Success Checklist

- [ ] Dashboard running at `http://localhost:3000`
- [ ] API endpoint returns documentation
- [ ] Flask app has upload function added
- [ ] `log_detection_with_location` calls upload
- [ ] `requests` package installed in Flask
- [ ] Test detection shows "✅ Uploaded to Firebase"
- [ ] Heatmap shows new detection points
- [ ] Firebase Console shows new documents

## 📚 Full Code Reference

Complete integration code is available in:
- `src/scripts/flask_firebase_integration.py`

Copy relevant sections to your Flask `app.py` file.

## 🎉 You're Done!

Your model now dynamically feeds detections to the dashboard! Every garbage detection will automatically:
1. Be validated and stored in Firebase
2. Appear on the heatmap within 30 seconds
3. Be available for staff assignment
4. Show in analytics and reports

Happy detecting! 🗑️✨
