"use client";
export function PrintTrigger({ label }: { label: string }) { return <button type="button" className="btn btn-primary" onClick={() => window.print()}>{label}</button>; }
