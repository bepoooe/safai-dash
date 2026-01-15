import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Sample data for model_results collection
const sampleModelResults = [
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample1.jpg',
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 'high',
      address: 'Connaught Place, New Delhi',
      source: 'GPS',
      timestamp: new Date().toISOString()
    },
    detection_summary: {
      total_detections: 15,
      average_confidence: 0.85,
      max_confidence: 0.95,
      min_confidence: 0.72,
      overflow_score: 0.82,
      detection_frequency: 3.5,
      status: 'HIGH_OVERFLOW'
    },
    createdAt: Timestamp.now(),
    status: 'unassigned',
    area: 'Connaught Place'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample2.jpg',
    location: {
      latitude: 28.5355,
      longitude: 77.3910,
      accuracy: 'high',
      address: 'Noida Sector 18',
      source: 'GPS',
      timestamp: new Date().toISOString()
    },
    detection_summary: {
      total_detections: 8,
      average_confidence: 0.75,
      max_confidence: 0.88,
      min_confidence: 0.65,
      overflow_score: 0.68,
      detection_frequency: 2.1,
      status: 'MEDIUM_OVERFLOW'
    },
    createdAt: Timestamp.now(),
    status: 'unassigned',
    area: 'Noida Sector 18'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample3.jpg',
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      accuracy: 'medium',
      address: 'Rohini Sector 10',
      source: 'GPS',
      timestamp: new Date().toISOString()
    },
    detection_summary: {
      total_detections: 22,
      average_confidence: 0.91,
      max_confidence: 0.97,
      min_confidence: 0.83,
      overflow_score: 0.93,
      detection_frequency: 4.8,
      status: 'CRITICAL_OVERFLOW'
    },
    createdAt: Timestamp.now(),
    status: 'unassigned',
    area: 'Rohini'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample4.jpg',
    location: {
      latitude: 28.5244,
      longitude: 77.1855,
      accuracy: 'high',
      address: 'Saket, New Delhi',
      source: 'GPS',
      timestamp: new Date().toISOString()
    },
    detection_summary: {
      total_detections: 12,
      average_confidence: 0.78,
      max_confidence: 0.89,
      min_confidence: 0.68,
      overflow_score: 0.75,
      detection_frequency: 2.8,
      status: 'MEDIUM_OVERFLOW'
    },
    createdAt: Timestamp.now(),
    status: 'unassigned',
    area: 'Saket'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample5.jpg',
    location: {
      latitude: 28.6692,
      longitude: 77.4538,
      accuracy: 'high',
      address: 'Ghaziabad',
      source: 'GPS',
      timestamp: new Date().toISOString()
    },
    detection_summary: {
      total_detections: 5,
      average_confidence: 0.62,
      max_confidence: 0.71,
      min_confidence: 0.55,
      overflow_score: 0.58,
      detection_frequency: 1.5,
      status: 'LOW_OVERFLOW'
    },
    createdAt: Timestamp.now(),
    status: 'unassigned',
    area: 'Ghaziabad'
  }
];

// Sample data for citizens collection
const sampleCitizens = [
  {
    name: 'Amit Sharma',
    email: 'amit.sharma@email.com',
    phone: '+919876543210',
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10,
      address: 'Connaught Place, New Delhi'
    },
    description: 'Garbage overflow near metro station',
    timestamp: Timestamp.now(),
    status: 'pending',
    area: 'Connaught Place',
    language: 'en',
    notifications: true,
    totalReports: 3,
    verifiedReports: 2,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/citizen1.jpg'
  },
  {
    name: 'Priya Singh',
    email: 'priya.singh@email.com',
    phone: '+919876543211',
    location: {
      latitude: 28.5355,
      longitude: 77.3910,
      accuracy: 15,
      address: 'Noida Sector 18'
    },
    description: 'Overflowing dustbin near market',
    timestamp: Timestamp.now(),
    status: 'in_progress',
    area: 'Noida Sector 18',
    language: 'hi',
    notifications: true,
    totalReports: 5,
    verifiedReports: 4,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/citizen2.jpg'
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    phone: '+919876543212',
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      accuracy: 12,
      address: 'Rohini Sector 10'
    },
    description: 'Street litter accumulation',
    timestamp: Timestamp.now(),
    status: 'resolved',
    area: 'Rohini',
    language: 'en',
    notifications: false,
    totalReports: 2,
    verifiedReports: 2,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/citizen3.jpg'
  },
  {
    name: 'Sneha Patel',
    email: 'sneha.patel@email.com',
    phone: '+919876543213',
    location: {
      latitude: 28.5244,
      longitude: 77.1855,
      accuracy: 8,
      address: 'Saket, New Delhi'
    },
    description: 'Broken dustbin needs replacement',
    timestamp: Timestamp.now(),
    status: 'pending',
    area: 'Saket',
    language: 'en',
    notifications: true,
    totalReports: 1,
    verifiedReports: 0,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/citizen4.jpg'
  },
  {
    name: 'Vikram Verma',
    email: 'vikram.verma@email.com',
    phone: '+919876543214',
    location: {
      latitude: 28.6692,
      longitude: 77.4538,
      accuracy: 20,
      address: 'Ghaziabad'
    },
    description: 'Garbage collection not done for 3 days',
    timestamp: Timestamp.now(),
    status: 'in_progress',
    area: 'Ghaziabad',
    language: 'hi',
    notifications: true,
    totalReports: 4,
    verifiedReports: 3,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/citizen5.jpg'
  }
];

// Sample data for cloudinary_analysis collection
const sampleCloudinaryAnalysis = [
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/analysis1.jpg',
    public_id: 'analysis1',
    analysis: {
      garbage_detected: true,
      confidence: 0.89,
      severity: 'high',
      categories: ['plastic', 'organic'],
      timestamp: new Date().toISOString()
    },
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      address: 'Connaught Place, New Delhi'
    },
    createdAt: Timestamp.now(),
    processedAt: Timestamp.now(),
    status: 'completed'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/analysis2.jpg',
    public_id: 'analysis2',
    analysis: {
      garbage_detected: true,
      confidence: 0.76,
      severity: 'medium',
      categories: ['paper', 'plastic'],
      timestamp: new Date().toISOString()
    },
    location: {
      latitude: 28.5355,
      longitude: 77.3910,
      address: 'Noida Sector 18'
    },
    createdAt: Timestamp.now(),
    processedAt: Timestamp.now(),
    status: 'completed'
  },
  {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/analysis3.jpg',
    public_id: 'analysis3',
    analysis: {
      garbage_detected: true,
      confidence: 0.94,
      severity: 'critical',
      categories: ['plastic', 'metal', 'organic'],
      timestamp: new Date().toISOString()
    },
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: 'Rohini Sector 10'
    },
    createdAt: Timestamp.now(),
    processedAt: Timestamp.now(),
    status: 'completed'
  }
];

async function setupAllCollections() {
  try {
    console.log('🚀 Starting Firestore collections setup...\n');

    // Check and setup model_results
    console.log('📊 Setting up model_results collection...');
    const modelResultsRef = collection(db, 'model_results');
    const modelResultsSnapshot = await getDocs(modelResultsRef);
    
    if (modelResultsSnapshot.empty) {
      for (const result of sampleModelResults) {
        await addDoc(modelResultsRef, result);
      }
      console.log('✅ Added', sampleModelResults.length, 'sample model results\n');
    } else {
      console.log('⏭️  model_results already has data, skipping...\n');
    }

    // Check and setup citizens
    console.log('👥 Setting up citizens collection...');
    const citizensRef = collection(db, 'citizens');
    const citizensSnapshot = await getDocs(citizensRef);
    
    if (citizensSnapshot.empty) {
      for (const citizen of sampleCitizens) {
        await addDoc(citizensRef, citizen);
      }
      console.log('✅ Added', sampleCitizens.length, 'sample citizens\n');
    } else {
      console.log('⏭️  citizens already has data, skipping...\n');
    }

    // Check and setup cloudinary_analysis
    console.log('🔍 Setting up cloudinary_analysis collection...');
    const cloudinaryRef = collection(db, 'cloudinary_analysis');
    const cloudinarySnapshot = await getDocs(cloudinaryRef);
    
    if (cloudinarySnapshot.empty) {
      for (const analysis of sampleCloudinaryAnalysis) {
        await addDoc(cloudinaryRef, analysis);
      }
      console.log('✅ Added', sampleCloudinaryAnalysis.length, 'sample cloudinary analysis records\n');
    } else {
      console.log('⏭️  cloudinary_analysis already has data, skipping...\n');
    }

    console.log('🎉 All collections setup complete!');
    console.log('\n📋 Summary:');
    console.log('   - model_results: Garbage detection data');
    console.log('   - citizens: Citizen reports');
    console.log('   - cloudinary_analysis: Image analysis results');
    console.log('\n✨ Your Firestore database is ready to use!');

  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    process.exit(1);
  }
}

setupAllCollections();
