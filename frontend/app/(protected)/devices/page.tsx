"use client";

import { Smartphone, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DevicesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appareils</h1>
          <p className="text-muted-foreground">Vos téléphones Android connectés comme passerelles.</p>
        </div>
        <Button className="shrink-0 gap-2">
          <Plus className="size-4" />
          Ajouter un Appareil
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 px-1.5 py-0">
                <div className="size-1 bg-emerald-500 rounded-full" />
                En ligne
              </Badge>
              <Smartphone className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg mt-2">Pixel 7 Pro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Détails</p>
              <p className="text-sm font-medium">Batterie: 85%</p>
              <p className="text-sm font-medium">Opérateur: Orange FR</p>
            </div>
            <div className="pt-2 border-t flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs">Logs</Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs">Paramètres</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
