# Firestore Index Setup Guide

## Required Indexes for Assignment System

To use the full functionality of the assignment system, you need to create the following Firestore indexes:

### 1. Model Results - Staff Assignment Index
**Collection:** `model_results`  
**Fields:**
- `staffId` (Ascending)
- `createdAt` (Descending)

**Purpose:** Allows efficient querying of assigned work for staff members with proper ordering.

### 2. Model Results - Recent Assignments Index
**Collection:** `model_results`  
**Fields:**
- `staffId` (Ascending) 
- `assignedAt` (Descending)

**Purpose:** Allows efficient querying of recent assignments.

## How to Create Indexes

### Option 1: Using Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `safai-saathi`
3. Go to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Add the fields as specified above

### Option 2: Using the Error Link
When you encounter the index error, click the provided link:
```
https://console.firebase.google.com/v1/r/project/safai-saathi/firestore/indexes?create_composite=...
```

### Option 3: Using Firebase CLI
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore indexes
firebase init firestore

# Deploy indexes
firebase deploy --only firestore:indexes
```

## Current Workaround

The system has been updated to work without these indexes by:
- Removing `orderBy` clauses from queries
- Sorting data in memory instead of using Firestore ordering
- Using simpler queries that don't require composite indexes

## Performance Impact

**Without Indexes:**
- ✅ System works without errors
- ✅ All functionality available
- ⚠️ Slightly slower for large datasets (sorting in memory)

**With Indexes:**
- ✅ Optimal performance
- ✅ Efficient database queries
- ✅ Better scalability

## Recommendation

For development and testing, the current workaround is sufficient. For production with large amounts of data, consider creating the indexes for better performance.
