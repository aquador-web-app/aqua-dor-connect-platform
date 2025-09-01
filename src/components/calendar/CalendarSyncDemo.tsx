import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Users, Clock, CheckCircle, Settings } from "lucide-react";
import { SamsungCalendar } from "./SamsungCalendar";
import AdminCalendar from "../dashboard/AdminCalendar";
import { useAuth } from "@/hooks/useAuth";

/**
 * Comprehensive Calendar Sync Demo Component
 * Demonstrates real-time synchronization across all calendar instances
 */
export function CalendarSyncDemo() {
  const { isAdmin, isStudent, isParent } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  const features = [
    {
      icon: <CalendarIcon className="h-5 w-5" />,
      title: "Real-time Synchronization",
      description: "All calendar changes instantly sync across Home, Admin, and Student views"
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      title: "Student Attendance Marking",
      description: "Students can mark attendance directly in calendar before admin confirmation"
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Admin Edit/Delete",
      description: "Admins can edit and delete events with intuitive modals"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Cross-User Updates",
      description: "Changes made by admins appear instantly for all students and vice versa"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <span>Calendar System Features</span>
          </CardTitle>
          <CardDescription>
            Complete real-time calendar synchronization with instant updates across all user interfaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="text-primary mt-1">{feature.icon}</div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Interfaces Demo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="home">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Home Calendar
          </TabsTrigger>
          <TabsTrigger value="student" disabled={!isStudent() && !isParent()}>
            <Users className="h-4 w-4 mr-2" />
            Student View
          </TabsTrigger>
          <TabsTrigger value="admin" disabled={!isAdmin()}>
            <Settings className="h-4 w-4 mr-2" />
            Admin Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Home Page Calendar</CardTitle>
              <CardDescription>
                Public view with booking capabilities for authenticated students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-card border rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4 text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span>Scheduled Classes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-destructive rounded-full"></div>
                    <span>Personal Reservations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span>Special Events</span>
                  </div>
                </div>
              </div>
              <SamsungCalendar 
                mode="public" 
                initialViewMode="agenda"
                showBookingActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Dashboard Calendar</CardTitle>
              <CardDescription>
                Personal calendar with attendance marking and booking management
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Attendance Marking Enabled
                </Badge>
                <Badge variant="outline" className="text-blue-600">
                  <Clock className="h-3 w-3 mr-1" />
                  Real-time Updates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SamsungCalendar 
                mode="student" 
                initialViewMode="week"
                showBookingActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Dashboard Calendar</CardTitle>
              <CardDescription>
                Complete calendar management with create, edit, and delete capabilities
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-red-600">
                  <Settings className="h-3 w-3 mr-1" />
                  Full Edit Access
                </Badge>
                <Badge variant="outline" className="text-purple-600">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Recurring Events
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AdminCalendar />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Real-time Sync Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800 font-medium">
              Real-time synchronization active - All calendar changes sync instantly across the platform
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}