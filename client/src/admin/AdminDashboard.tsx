import React from "react";
import AdminLayout from "./components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Dati di esempio per il dashboard
const data = [
  { name: "Gennaio", spot: 4, accessi: 400 },
  { name: "Febbraio", spot: 6, accessi: 600 },
  { name: "Marzo", spot: 8, accessi: 800 },
  { name: "Aprile", spot: 10, accessi: 1000 },
  { name: "Maggio", spot: 12, accessi: 1200 },
  { name: "Giugno", spot: 14, accessi: 1400 },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard Amministrazione</h1>
        <p className="text-gray-500">
          Benvenuto nel pannello di amministrazione. Qui puoi gestire le risorse della tua applicazione.
        </p>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spot totali</CardTitle>
              <CardDescription>Tutte le promozioni create</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-gray-500">+2 rispetto al mese scorso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spot attivi</CardTitle>
              <CardDescription>Promozioni attualmente visibili</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-gray-500">+1 rispetto al mese scorso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Accessi utenti</CardTitle>
              <CardDescription>Utenti che hanno visto spot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-gray-500">+10% rispetto al mese scorso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversioni</CardTitle>
              <CardDescription>Interazioni con spot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">243</div>
              <p className="text-xs text-gray-500">+5% rispetto al mese scorso</p>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Statistiche spot promozionali</CardTitle>
            <CardDescription>
              Numero di spot promozionali e accessi utente negli ultimi 6 mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="spot" fill="#8884d8" name="Spot promozionali" />
                  <Bar yAxisId="right" dataKey="accessi" fill="#82ca9d" name="Accessi utente" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}