import React from 'react';
import MobileLayout from '../components/MobileLayout';

export default function TempRegistration() {
  return (
    <MobileLayout title="Registrazioni">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Pagina Registrazioni</h1>
        <p className="mb-4">Questa è la pagina temporanea per le registrazioni delle attività.</p>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-sm text-yellow-700">
            Questa è una versione temporanea della pagina di registrazione.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Riparazione impianto elettrico</h3>
            <p className="text-sm text-gray-500">Cliente: Famiglia Bianchi</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Installazione condizionatore</h3>
            <p className="text-sm text-gray-500">Cliente: Ufficio Rossi</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Sostituzione infissi</h3>
            <p className="text-sm text-gray-500">Cliente: Condominio Via Roma</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottone di aggiunta fisso */}
        <button className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
          <span className="text-2xl">+</span>
        </button>
      </div>
    </MobileLayout>
  );
}