const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyB9X6oU2ZF6fIFkTPQlh-jwksFD64SaMkA",
  authDomain: "bishi-collection-project.firebaseapp.com",
  databaseURL: "https://bishi-collection-project-default-rtdb.firebaseio.com",
  projectId: "bishi-collection-project",
  storageBucket: "bishi-collection-project.firebasestorage.app",
  messagingSenderId: "463154634583",
  appId: "1:463154634583:web:0b534337974a6d5e1ea812",
  measurementId: "G-S4M73KT3JB"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const villages = [
  "Sangarul",
  "kothali",
  "kembli",
  "swaymbhuvadi"
];

// The corrected routes structure expected by the app
const correctedRoutes = [
  {
    name: "Monday",
    villages: villages
  }
];

const agentId = "7249438550";
const targetPath = `agents/${agentId}/agentInfo/routes`;

async function fixRoutes() {
  try {
    console.log(`Updating ${targetPath} with structured route data...`);
    await set(ref(db, targetPath), correctedRoutes);
    console.log("Database updated successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Critical Error updating database:", error);
    process.exit(1);
  }
}

fixRoutes();
