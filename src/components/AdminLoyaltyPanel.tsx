import React, { useState, useEffect } from "react";

interface Reward {
  id: string;
  reward_name: string;
  category: string;
  points_cost: number;
}

export default function AdminLoyaltyPanel() {
  const [activeTab, setActiveTab] = useState("rewards");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const response = await fetch("/api/admin/loyalty/rewards");
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setRewards(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("rewards")}
          className="px-4 py-2 font-medium border-b-2"
        >
          Rewards
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {activeTab === "rewards" && (
        <div className="space-y-4">
          {rewards.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Category</th>
                  <th className="text-right px-4 py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id}>
                    <td className="px-4 py-2">{reward.reward_name}</td>
                    <td className="px-4 py-2">{reward.category}</td>
                    <td className="text-right px-4 py-2">{reward.points_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600 text-sm">No rewards found</p>
          )}
        </div>
      )}
    </div>
  );
}
