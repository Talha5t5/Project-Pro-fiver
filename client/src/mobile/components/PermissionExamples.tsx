import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionGate } from './PermissionGate';
import { PermissionClientDisplay, PermissionJobDisplay, FinancialDataDisplay } from './PermissionDataDisplay';

/**
 * Example: Client List with Permission-based Display
 */
export const ClientListExample: React.FC = () => {
  const { hasPermission } = usePermissions();

  const clients = [
    { id: 1, name: 'Famiglia Bianchi', email: 'bianchi@email.com', phone: '+39 123 456 789', address: 'Via Roma 123', financialInfo: { creditLimit: 5000, paymentTerms: '30 days' } },
    { id: 2, name: 'Ufficio Rossi', email: 'rossi@email.com', phone: '+39 987 654 321', address: 'Via Milano 456', financialInfo: { creditLimit: 10000, paymentTerms: '15 days' } }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clienti</h2>
        
        <PermissionGate permission="canCreateClients">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Nuovo Cliente
          </button>
        </PermissionGate>
      </div>

      {clients.map(client => (
        <PermissionClientDisplay key={client.id} client={client}>
          {(filteredClient) => (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{filteredClient.name}</h3>
                
                <div className="flex space-x-2">
                  <PermissionGate permission="canEditClients">
                    <button className="text-blue-600 hover:text-blue-800">
                      Modifica
                    </button>
                  </PermissionGate>
                  
                  <PermissionGate permission="canDeleteClients">
                    <button className="text-red-600 hover:text-red-800">
                      Elimina
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {/* Basic info - always visible */}
              <p className="text-gray-600">{filteredClient.email}</p>

              {/* Sensitive info - only with permission */}
              <PermissionGate permission="canViewClientSensitiveData">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{filteredClient.phone}</p>
                  <p className="text-sm text-gray-500">{filteredClient.address}</p>
                  {filteredClient.financialInfo && (
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">
                        Credito: €{filteredClient.financialInfo.creditLimit}
                      </p>
                      <p className="text-xs text-gray-600">
                        Pagamento: {filteredClient.financialInfo.paymentTerms}
                      </p>
                    </div>
                  )}
                </div>
              </PermissionGate>
            </div>
          )}
        </PermissionClientDisplay>
      ))}
    </div>
  );
};

/**
 * Example: Job Details with Permission-based Actions
 */
export const JobDetailsExample: React.FC = () => {
  const { hasPermission } = usePermissions();

  const job = {
    id: 1,
    title: 'Riparazione impianto elettrico',
    description: 'Sostituzione cavi e interruttori difettosi',
    status: 'in_progress',
    price: 450.00,
    cost: 120.00,
    profit: 330.00,
    materialsCost: 80.00,
    laborCost: 40.00,
    notes: 'Cliente ha richiesto materiali di qualità premium',
    photos: ['photo1.jpg', 'photo2.jpg']
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Dettagli Lavoro</h2>

      <PermissionJobDisplay job={job}>
        {(filteredJob) => (
          <div className="space-y-4">
            {/* Basic job info */}
            <div>
              <h3 className="font-semibold text-lg">{filteredJob.title}</h3>
              <p className="text-gray-600">{filteredJob.description}</p>
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mt-2">
                {filteredJob.status}
              </span>
            </div>

            {/* Financial info - only with permission */}
            <PermissionGate permission="canViewJobFinancials">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Informazioni Finanziarie</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Prezzo</p>
                    <FinancialDataDisplay amount={filteredJob.price} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Costo</p>
                    <FinancialDataDisplay amount={filteredJob.cost} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profitto</p>
                    <FinancialDataDisplay amount={filteredJob.profit} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Costo Materiali</p>
                    <FinancialDataDisplay amount={filteredJob.materialsCost} />
                  </div>
                </div>
              </div>
            </PermissionGate>

            {/* Job notes - only with permission */}
            <PermissionGate permission="canViewJobDetails">
              {filteredJob.notes && (
                <div>
                  <h4 className="font-medium">Note</h4>
                  <p className="text-gray-600 bg-yellow-50 p-3 rounded">{filteredJob.notes}</p>
                </div>
              )}
            </PermissionGate>

            {/* Action buttons based on permissions */}
            <div className="flex space-x-3">
              <PermissionGate permission="canUpdateJobStatus">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                  Aggiorna Stato
                </button>
              </PermissionGate>

              <PermissionGate permission="canAddJobNotes">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                  Aggiungi Note
                </button>
              </PermissionGate>

              <PermissionGate permission="canUploadJobPhotos">
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
                  Carica Foto
                </button>
              </PermissionGate>
            </div>
          </div>
        )}
      </PermissionJobDisplay>
    </div>
  );
};

/**
 * Example: Dashboard with Permission-based Widgets
 */
export const DashboardExample: React.FC = () => {
  const { hasPermission } = usePermissions();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Clients Widget */}
        <PermissionGate permission="canViewClients">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Clienti</h3>
            <p className="text-2xl font-bold text-blue-600">24</p>
            <p className="text-sm text-gray-500">+3 questo mese</p>
          </div>
        </PermissionGate>

        {/* Jobs Widget */}
        <PermissionGate permission="canViewJobs">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Lavori Attivi</h3>
            <p className="text-2xl font-bold text-green-600">12</p>
            <p className="text-sm text-gray-500">5 in corso</p>
          </div>
        </PermissionGate>

        {/* Reports Widget */}
        <PermissionGate permission="canViewReports">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Report</h3>
            <p className="text-2xl font-bold text-purple-600">8</p>
            <p className="text-sm text-gray-500">3 questo mese</p>
          </div>
        </PermissionGate>

        {/* Financial Widget - only with financial permissions */}
        <PermissionGate permission="canViewFinancialReports">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Fatturato</h3>
            <FinancialDataDisplay amount={15420.50} />
            <p className="text-sm text-gray-500">+12% vs mese scorso</p>
          </div>
        </PermissionGate>

        {/* Performance Widget - only with performance permissions */}
        <PermissionGate permission="canViewPerformanceMetrics">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Efficienza</h3>
            <p className="text-2xl font-bold text-orange-600">87%</p>
            <p className="text-sm text-gray-500">+5% vs mese scorso</p>
          </div>
        </PermissionGate>

        {/* Invoices Widget */}
        <PermissionGate permission="canViewInvoices">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="font-semibold text-gray-800">Fatture</h3>
            <p className="text-2xl font-bold text-red-600">18</p>
            <p className="text-sm text-gray-500">5 in attesa</p>
          </div>
        </PermissionGate>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="font-semibold text-gray-800 mb-3">Azioni Rapide</h3>
        <div className="flex flex-wrap gap-3">
          <PermissionGate permission="canCreateJobs">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Nuovo Lavoro
            </button>
          </PermissionGate>

          <PermissionGate permission="canCreateClients">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
              Nuovo Cliente
            </button>
          </PermissionGate>

          <PermissionGate permission="canCreateInvoices">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
              Nuova Fattura
            </button>
          </PermissionGate>

          <PermissionGate permission="canTrackTime">
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg">
              Traccia Tempo
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
};

export default {
  ClientListExample,
  JobDetailsExample,
  DashboardExample
}; 