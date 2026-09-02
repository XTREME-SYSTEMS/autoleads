import React from "react";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";

export default function Splash(){
  return <main className="al-splash" aria-label="AutoLeads loading screen">
    <div className="al-splash-art" aria-hidden="true" />
    <div className="al-splash-brand">
      <AutoLeadsLogo height={112} dark={false}/>
      <div className="al-spinner" role="status" aria-label="Loading AutoLeads" />
      <p>Loading...</p>
    </div>
  </main>;
}
