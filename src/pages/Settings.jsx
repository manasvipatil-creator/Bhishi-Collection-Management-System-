import React, { useState } from "react";
import { ref, set } from "firebase/database";
import { db } from "../firebase";

export default function Settings() {
  const [settings, setSettings] = useState({ interest: 1200, membershipFee: 100, cuttingRate: 5 });

  const handleChange = (e) => setSettings({ ...settings, [e.target.name]: e.target.value });

  const saveSettings = async () => {
    await set(ref(db, "settings"), settings);
    alert("Settings Saved!");
  };

  return (
    <div className="container">
      <h4>Settings</h4>
      <input className="form-control mb-2" name="interest" value={settings.interest} onChange={handleChange} placeholder="Interest" />
      <input className="form-control mb-2" name="membershipFee" value={settings.membershipFee} onChange={handleChange} placeholder="Membership Fee" />
      <input className="form-control mb-2" name="cuttingRate" value={settings.cuttingRate} onChange={handleChange} placeholder="Cutting Rate" />
      <button className="btn btn-primary" onClick={saveSettings}>Save</button>
    </div>
  );
}
