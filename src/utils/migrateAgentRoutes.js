import { ref, get, update } from "firebase/database";
import { db } from "../firebase";

/**
 * Migrate agent routes from string array to object array format
 * Also handles structure migration from /agents/{phone}/agentInfo to /agents/{phone}
 * Old format: ["Mumbai", "Palus", "Pune"]
 * New format: [{name: "Mumbai", villages: []}, {name: "Palus", villages: []}, {name: "Pune", villages: []}]
 */
export const migrateAgentRoutes = async (agentPhone) => {
  try {
    console.log(`Starting migration for agent: ${agentPhone}`);
    
    // Check both possible locations
    const agentRef = ref(db, `agents/${agentPhone}`);
    const agentInfoRef = ref(db, `agents/${agentPhone}/agentInfo`);
    
    const agentSnapshot = await get(agentRef);
    const agentInfoSnapshot = await get(agentInfoRef);
    
    let agentData = null;
    let isNestedStructure = false;
    
    // Determine which structure is being used
    if (agentInfoSnapshot.exists()) {
      agentData = agentInfoSnapshot.val();
      isNestedStructure = true;
      console.log("Found agent data in nested structure (agentInfo)");
    } else if (agentSnapshot.exists()) {
      agentData = agentSnapshot.val();
      // Check if it has agentInfo nested
      if (agentData.agentInfo) {
        agentData = agentData.agentInfo;
        isNestedStructure = true;
        console.log("Found agent data with agentInfo nested");
      } else {
        console.log("Found agent data in flat structure");
      }
    } else {
      console.error("Agent not found");
      return { success: false, message: "Agent not found" };
    }
    
    const routes = agentData.routes || [];
    
    // Check if routes need migration (if they're strings)
    const needsMigration = routes.some(route => typeof route === 'string');
    
    if (!needsMigration && !isNestedStructure) {
      console.log("Routes are already in the correct format and structure is correct");
      return { success: true, message: "Routes are already in the correct format and structure is correct" };
    }
    
    // Get all available routes from Firebase to match villages
    const routesRef = ref(db, 'routes');
    const routesSnapshot = await get(routesRef);
    const availableRoutes = {};
    
    if (routesSnapshot.exists()) {
      const routesData = routesSnapshot.val();
      Object.entries(routesData).forEach(([id, route]) => {
        availableRoutes[route.name] = route.villages || [];
      });
    }
    
    // Convert routes to new format
    const migratedRoutes = routes.map(route => {
      if (typeof route === 'string') {
        return {
          name: route,
          villages: availableRoutes[route] || []
        };
      }
      return route; // Already in correct format
    });
    
    // Prepare the updated agent data with flat structure
    const updatedAgentData = {
      agentId: agentData.agentId,
      agentName: agentData.agentName,
      createdAt: agentData.createdAt,
      mobileNumber: agentData.mobileNumber || agentPhone,
      password: agentData.password,
      routes: migratedRoutes,
      status: agentData.status || "active",
      timestamp: agentData.timestamp || Date.now()
    };
    
    // If there are customers, preserve them
    if (agentData.customers) {
      updatedAgentData.customers = agentData.customers;
    }
    
    // Update the agent with flat structure
    await update(agentRef, updatedAgentData);
    
    // If it was nested, remove the old agentInfo node
    if (isNestedStructure) {
      const agentInfoRefToDelete = ref(db, `agents/${agentPhone}/agentInfo`);
      await update(agentInfoRefToDelete, null);
      console.log("Removed old nested agentInfo structure");
    }
    
    console.log("Migration completed successfully");
    console.log("Old routes:", routes);
    console.log("New routes:", migratedRoutes);
    console.log("Structure:", isNestedStructure ? "Migrated from nested to flat" : "Already flat");
    
    return { 
      success: true, 
      message: "Routes and structure migrated successfully",
      oldRoutes: routes,
      newRoutes: migratedRoutes,
      structureMigrated: isNestedStructure
    };
    
  } catch (error) {
    console.error("Error migrating routes:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Migrate all agents in the database
 */
export const migrateAllAgents = async () => {
  try {
    console.log("Starting migration for all agents...");
    
    const agentsRef = ref(db, 'agents');
    const agentsSnapshot = await get(agentsRef);
    
    if (!agentsSnapshot.exists()) {
      return { success: false, message: "No agents found" };
    }
    
    const agentsData = agentsSnapshot.val();
    const results = [];
    
    for (const [phone, agentData] of Object.entries(agentsData)) {
      // Get agent name from either nested or flat structure
      const agentName = agentData.agentInfo?.agentName || agentData.agentName || 'Unknown';
      
      const result = await migrateAgentRoutes(phone);
      results.push({
        phone,
        agentName,
        ...result
      });
    }
    
    console.log("Migration completed for all agents");
    return { success: true, results };
    
  } catch (error) {
    console.error("Error migrating all agents:", error);
    return { success: false, message: error.message };
  }
};
