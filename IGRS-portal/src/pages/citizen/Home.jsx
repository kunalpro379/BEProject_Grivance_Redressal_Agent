import React from "react";
import { Button } from "../../components/ui/button";

const CitizenHome = ({ userAuth, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-green-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center font-bold">C</div>
            <span className="font-semibold text-gray-900">Citizen Portal</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">Hi, {userAuth?.name || "Citizen"}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-600">Submit and track grievances, view updates, and provide feedback.</p>
            <div className="mt-6 flex gap-3">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">Submit Grievance</Button>
              <Button variant="outline">Track Status</Button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Stats</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Total submitted: 3</li>
              <li>In progress: 1</li>
              <li>Resolved: 2</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CitizenHome;


