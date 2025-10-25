import MobileLayout from "../components/MobileLayout";

export default function TestRegistration() {
  return (
    <MobileLayout title="Test Registrazione">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Pagina Test Registrazione</h1>
        <p className="text-gray-600 mb-6">Questa è una pagina di test semplificata.</p>
        
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            Se vedi questo messaggio, la pagina di registrazione funziona!
          </p>
        </div>
        
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <p>Contenuto di test</p>
        </div>
      </div>
    </MobileLayout>
  );
}