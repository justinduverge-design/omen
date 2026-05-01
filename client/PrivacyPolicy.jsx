import React from 'react';

// This matches the dataInventory defined in your backend ssffmvp_gdpr.js
const dataInventory = [
  { category: "Identity", items: ["Email", "Username"], purpose: "Authentication & personalized advice" },
  { category: "Gaming Data", items: ["Fantasy Team Roster", "League ID"], purpose: "VORP calculations & move optimization" },
  { category: "Security", items: ["Encrypted Tokens"], purpose: "Secure Supabase Vault storage" }
];

const PrivacyPolicy = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy & Data Transparency</h1>
      <p className="mb-4 text-gray-700">
        At Slops Saloon, we believe in <strong>Compliance-as-Code</strong>. Below is a real-time 
        inventory of the data we process to provide your fantasy football recommendations.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 underline">Data Inventory</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Data Points</th>
              <th className="p-2 border">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {dataInventory.map((info, index) => (
              <tr key={index}>
                <td className="p-2 border font-medium">{info.category}</td>
                <td className="p-2 border">{info.items.join(", ")}</td>
                <td className="p-2 border text-sm text-gray-600">{info.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Right to Erasure (GDPR)</h2>
        <p className="text-gray-600">
          You can delete your account at any time. This triggers our <code>vault_delete_secret</code> 
          protocol, physically removing your encrypted tokens from the Supabase Vault.
        </p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
