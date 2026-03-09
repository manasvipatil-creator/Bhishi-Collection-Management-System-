const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

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

async function inspect() {
  try {
    const agentRef = ref(db, 'agents/7249438550/agentInfo/routes');
    const snapshot = await get(agentRef);
    if (snapshot.exists()) {
      console.log(JSON.stringify(snapshot.val(), null, 2));
    } else {
      console.log("No routes found for 7249438550");
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

inspect();
