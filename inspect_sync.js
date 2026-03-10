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
    const routesSnap = await get(ref(db, 'routes'));
    const routes = routesSnap.val();
    console.log('--- ALL ROUTES in /routes ---');
    Object.keys(routes).forEach(key => {
        const r = routes[key];
        console.log(`Key: ${key}, Name: ${r.name}, Villages: ${Array.isArray(r.villages) ? r.villages.length : (r.villages ? 'OBJECT' : 'NONE')}`);
        if (r.villages) {
            console.log('  Villages data:', JSON.stringify(r.villages));
        }
    });

    const agentRoutesSnap = await get(ref(db, 'agents/7249438550/agentInfo/routes'));
    console.log('\n--- AGENT ROUTES ---');
    console.log(JSON.stringify(agentRoutesSnap.val(), null, 2));

    process.exit(0);
}
inspect();
