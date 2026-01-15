# Firebase Heatmap Implementation

## Overview
This implementation integrates Firebase Firestore with React Leaflet to create a comprehensive garbage detection heatmap dashboard. The system fetches real-time data from the `model_results` collection and displays it as colored geodesic areas on an interactive map. **All data is fetched dynamically from Firestore with no hardcoded values.**

## Features Implemented

### 1. Firebase Integration (No Hardcoded Data)
- **Configuration**: Firebase initialized with provided credentials in `src/lib/firebase.ts`
- **Service Layer**: `FirebaseService` class in `src/services/firebaseService.ts` for data fetching
- **Data Types**: Extended type definitions in `src/types/garbage-detection.ts`
- **Dynamic Map Center**: Map center calculated from actual data points, no hardcoded coordinates

### 2. Geodesic Areas Visualization
- **Component**: `GeodesicAreasLayer` in `src/components/GeodesicAreasLayer.tsx`
- **Features**:
  - Colored circles based on confidence score
  - Radius based on GPS accuracy (100-200m range)
  - Interactive tooltips with confidence, accuracy, and address
  - Detailed popups with full information
  - Color scale: Red (high) → Orange → Amber → Lime → Green (low)

### 3. Dashboard Metrics (Live Updates)
- **Total Data Points**: Count of all documents in `model_results` collection
- **Average Intensity**: Mean of all `confidence_scores` arrays across all detections (rounded to 2 decimals)
- **Max Intensity**: Highest intensity score in the dataset
- **Auto-refresh**: Data updates every 30 seconds to stay live

### 4. Interactive Map Features
- **Map Types**: Terrain, Satellite, and Hybrid views
- **Responsive Design**: Mobile-friendly interface
- **Live Updates**: Auto-refresh every 30 seconds + manual refresh button
- **Error Handling**: Comprehensive error states and user feedback

## File Structure

```
src/
├── lib/
│   └── firebase.ts                 # Firebase configuration
├── services/
│   └── firebaseService.ts          # Firebase data fetching service
├── components/
│   ├── GeodesicAreasLayer.tsx      # Map visualization component
│   └── FirebaseTest.tsx            # Connection testing component
├── types/
│   └── garbage-detection.ts        # Extended type definitions
├── styles/
│   └── leaflet.css                 # Custom map styling
└── app/dashboard/heatmap/
    └── page.tsx                    # Main heatmap page
```

## Data Structure

### ModelResult Interface
```typescript
interface ModelResult {
  id: string;
  latitude: number;
  longitude: number;
  confidence_score: number;  // 0-1 scale
  accuracy: number;          // GPS accuracy in meters
  address: string;
  timestamp: string;
  model_version?: string;
  image_url?: string;
}
```

### Color Mapping
- **Red (80-100%)**: High confidence detections
- **Orange (60-80%)**: Medium-high confidence
- **Amber (40-60%)**: Medium confidence
- **Lime (20-40%)**: Low confidence
- **Green (0-20%)**: Very low confidence

## Usage

1. **Access the Heatmap**: Navigate to `/dashboard/heatmap`
2. **View Data**: The map automatically loads data from Firebase
3. **Interact**: Hover over circles for tooltips, click for detailed popups
4. **Refresh**: Use the refresh button to get latest data
5. **Switch Views**: Toggle between terrain, satellite, and hybrid map types

## Firebase Collection Structure

The system expects a `model_results` collection with documents containing:
- `location` (object): Contains location-specific data
  - `latitude`: GPS latitude coordinate
  - `longitude`: GPS longitude coordinate
  - `accuracy`: GPS accuracy (number or string like "±78 meters")
  - `address`: Human-readable address
- `confidence_scores`: Array of confidence scores (0-1)
- `createdAt`: ISO timestamp string
- `model_version`: Optional model version
- `image_url`: Optional image URL

**Fallback Support**: The system also supports documents with direct fields (not nested in location object) for backward compatibility.

## Error Handling

- **Connection Errors**: Displays user-friendly error messages
- **Data Validation**: Skips invalid coordinates (0,0 or null)
- **Loading States**: Shows loading indicators during data fetch
- **Fallback Values**: Provides default values for missing data

## Performance Considerations

- **Dynamic Imports**: Map components loaded only when needed
- **Efficient Rendering**: Only renders valid data points
- **Memory Management**: Proper cleanup of map layers
- **Responsive Design**: Optimized for various screen sizes

## Testing

The implementation includes a `FirebaseTest` component that:
- Tests Firebase connection on page load
- Displays connection status and data count
- Shows average confidence score
- Provides error feedback if connection fails

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Filtering**: Date range and confidence level filters
3. **Clustering**: Group nearby detections for better performance
4. **Export**: PDF/CSV export functionality
5. **Analytics**: Trend analysis and reporting features
