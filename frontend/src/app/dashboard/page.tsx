export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-gray-500 mt-2">Manage your SMS gateway status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards - Render Style */}
        <div className="flat-card p-6 rounded">
          <div className="text-sm text-gray-500 font-medium mb-1">Total Devices</div>
          <div className="text-3xl font-bold">2</div>
        </div>
        <div className="flat-card p-6 rounded">
          <div className="text-sm text-gray-500 font-medium mb-1">Messages Sent</div>
          <div className="text-3xl font-bold">1,240</div>
        </div>
        <div className="flat-card p-6 rounded">
          <div className="text-sm text-gray-500 font-medium mb-1">Success Rate</div>
          <div className="text-3xl font-bold text-green-600">98.5%</div>
        </div>
      </div>
      
       <div className="flat-card p-0 rounded overflow-hidden">
          <div className="p-6 border-b border-border">
              <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="p-6 text-sm text-gray-500 text-center py-12">
              No recent activity found.
          </div>
       </div>
    </div>
  );
}
