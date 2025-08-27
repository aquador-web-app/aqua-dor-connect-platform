import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParentChildManager } from "@/components/dashboard/ParentChildManager";
import { IntelligentCalendar } from "@/components/dashboard/IntelligentCalendar";
import { EnhancedPaymentSystem } from "@/components/dashboard/EnhancedPaymentSystem";

export default function ParentPortal() {
  const [tab, setTab] = useState("children");
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Portail Parent</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="children">Enfants</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="children" className="mt-6">
            <ParentChildManager />
          </TabsContent>

          <TabsContent value="planning" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendrier familial</CardTitle>
              </CardHeader>
              <CardContent>
                <IntelligentCalendar />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Paiements Familiaux</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedPaymentSystem isAdmin={false} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
