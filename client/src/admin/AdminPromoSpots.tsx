import React from "react";
import AdminLayout from "./components/AdminLayout";
import PromoSpotPage from "./promo-spots/PromoSpotPage";

export default function AdminPromoSpots() {
  return (
    <AdminLayout>
      <PromoSpotPage />
    </AdminLayout>
  );
}