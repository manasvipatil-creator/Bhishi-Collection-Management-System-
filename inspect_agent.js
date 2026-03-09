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
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    if (snapshot.exists()) {
      const agents = snapshot.val();
      const agent = agents['7249438550'];
      if (agent && agent.agentInfo) {
        process.stdout.write(JSON.stringify(agent.agentInfo.routes, null, 2));
      } else {
        process.stdout.write("Agent 7249438550 not found or agentInfo missing\n");
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

inspect();
