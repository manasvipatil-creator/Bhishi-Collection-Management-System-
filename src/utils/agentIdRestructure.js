import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";

/**
 * Utility to manage agents in Firebase using
 * mobile number as the main key and custom agent IDs.
 *
 * Final Firebase Structure:
 * agents/
 *   └── 8373647849
 *         └── agentInfo
 *               ├── agentId: "AGTMAN7849"
 *               ├── agentName: "manasvi patil"
 *               ├── mobileNumber: "8373647849"
 *               ├── route: "islampur"
 *               ├── password: "707070"
 *               ├── status: "active"
 *               ├── createdAt: "2025-10-14T07:20:44.097Z"
 *               └── timestamp: 1760426444097
 */

// ✅ Generate Agent ID (AGT + first 3 letters of name + last 4 digits of mobile)
export const generateAgentId = (agentName = "", mobileNumber = "") => {
  const namePrefix = String(agentName).replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const mobileSuffix = String(mobileNumber).slice(-4);
  return `AGT${namePrefix}${mobileSuffix}`;
};

// ✅ Check if agent with given mobile already exists
export const checkAgentExists = async (mobileNumber) => {
  try {
    const agentRef = ref(db, `agents/${mobileNumber}`);
    const snapshot = await get(agentRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking agent:", error);
    return false;
  }
};

// ✅ Check agentId across database (useful for uniqueness)
export const checkAgentIdExists = async (agentId) => {
  try {
    const agentsRef = ref(db, "agents");
    const snapshot = await get(agentsRef);
    if (snapshot.exists()) {
      const agents = snapshot.val();
      return Object.values(agents).some(
        (agent) => agent.agentInfo && agent.agentInfo.agentId === agentId
      );
    }
    return false;
  } catch (error) {
    console.error("Error checking agent ID:", error);
    return false;
  }
};

// ✅ Generate unique agent ID (appends counter only if ID collides)
export const generateUniqueAgentId = async (agentName, mobileNumber) => {
  let baseId = generateAgentId(agentName, mobileNumber);
  let counter = 1;
  let agentId = baseId;

  while (await checkAgentIdExists(agentId)) {
    agentId = `${baseId}${counter}`;
    counter++;
  }
  return agentId;
};

// ✅ Add new agent (mobile number as main node, agentInfo subnode)
export const addAgentWithId = async (agentData) => {
  try {
    const { agentName = "", mobileNumber = "" } = agentData;

    if (!mobileNumber || !/^\d{10}$/.test(String(mobileNumber))) {
      throw new Error("Valid 10-digit mobile number is required.");
    }

    const agentId = await generateUniqueAgentId(agentName, mobileNumber);

    const exists = await checkAgentExists(mobileNumber);
    if (exists) {
      throw new Error("Agent with this mobile number already exists!");
    }

    // Data to store in agentInfo subnode
    const newAgentData = {
      agentInfo: {
        agentId,
        agentName,
        mobileNumber,
        password: agentData.password || "",
        routes: agentData.routes || [], // Changed to array for multiple routes
        status: agentData.status || "active",
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      },
      customers: {},
      weeklyCollections: {},
      transactions: {},
      stats: {
        totalCustomers: 0,
        totalCollections: 0,
        totalCommission: 0,
        activeCustomers: 0,
        pendingCollections: 0,
        lastUpdated: Date.now()
      }
    };

    const agentRef = ref(db, `agents/${mobileNumber}`);
    await set(agentRef, newAgentData);

    console.log("✅ Agent added successfully:", agentId);
    return { success: true, agentId };
  } catch (error) {
    console.error("❌ Error adding agent:", error);
    return { success: false, message: error.message };
  }
};

// ✅ Get all agents
export const getAllAgentsWithIds = async () => {
  try {
    const agentsRef = ref(db, "agents");
    const snapshot = await get(agentsRef);

    if (snapshot.exists()) {
      const agents = snapshot.val();
      return Object.entries(agents).map(([mobile, data]) => ({
        mobile,
        ...data.agentInfo,
        customers: data.customers || {},
        stats: data.stats || {}
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

// ✅ Restructure old data -> mobile number keys with agentInfo subnode
export const restructureAgentsToMobileKeys = async () => {
  try {
    console.log("Starting agent restructuring...");

    const agentsRef = ref(db, "agents");
    const snapshot = await get(agentsRef);

    if (!snapshot.exists()) {
      console.log("No agents found.");
      return { success: true, message: "No agents found." };
    }

    const oldAgents = snapshot.val();
    const newAgents = {};

    for (const [key, value] of Object.entries(oldAgents)) {
      const info = value.agentInfo || value;
      const mobile = info.mobileNumber || key;
      const safeMobile = mobile.replace(/\./g, "").trim();
      const agentId = info.agentId || generateAgentId(info.agentName || "UNK", safeMobile);

      newAgents[safeMobile] = {
        agentInfo: {
          agentId,
          agentName: info.agentName || "",
          mobileNumber: safeMobile,
          password: info.password || "",
          routes: info.routes || (info.route ? [info.route] : []), // Convert old route to array
          status: info.status || "active",
          createdAt: info.createdAt || new Date().toISOString(),
          timestamp: info.timestamp || Date.now()
        },
        customers: value.customers || {},
        weeklyCollections: value.weeklyCollections || {},
        transactions: value.transactions || {},
        stats: value.stats || {
          totalCustomers: 0,
          totalCollections: 0,
          totalCommission: 0,
          activeCustomers: 0,
          pendingCollections: 0,
          lastUpdated: Date.now()
        }
      };
    }

    // Backup old data
    const backupRef = ref(db, `agents_backup_${Date.now()}`);
    await set(backupRef, oldAgents);

    // Replace with new structure
    await remove(agentsRef);
    await set(agentsRef, newAgents);

    console.log("✅ Restructuring complete.");
    return { success: true, message: "Agents restructured successfully." };
  } catch (error) {
    console.error("Error restructuring agents:", error);
    return { success: false, message: error.message };
  }
};

// ------- Backwards-compatible alias -------
export const restructureAgentsWithIds = restructureAgentsToMobileKeys;

// ------- Default export (ESLint-friendly) -------
const agentUtils = {
  generateAgentId,
  generateUniqueAgentId,
  addAgentWithId,
  checkAgentExists,
  checkAgentIdExists,
  getAllAgentsWithIds,
  restructureAgentsToMobileKeys,
  restructureAgentsWithIds
};

export default agentUtils;
