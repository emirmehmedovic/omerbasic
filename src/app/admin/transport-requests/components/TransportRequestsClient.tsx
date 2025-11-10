"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Truck,
  Mail,
  Phone,
  MapPin,
  Package,
  User,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-hot-toast";

// Tipovi za zahtjeve
interface TransportRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  vehicleType: string;
  cargo: string;
  origin: string;
  destination: string;
  notes?: string;
  createdAt: string;
  status: string;
}

export default function TransportRequestsClient() {
  const [transportRequests, setTransportRequests] = useState<TransportRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Dohvati podatke
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Dohvati transport zahtjeve
        const transportResponse = await fetch("/api/transport");
        if (transportResponse.ok) {
          const transportData = await transportResponse.json();
          setTransportRequests(transportData);
        }
      } catch (error) {
        console.error("Greška pri dohvaćanju podataka:", error);
        toast.error("Greška pri dohvaćanju zahtjeva");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const markAsViewed = async (id: string) => {
    try {
      // Za sada samo lokalno ažuriramo - trebalo bi API endpoint za update
      setTransportRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: "VIEWED" } : req))
      );
      toast.success("Zahtjev označen kao viđen");
    } catch (error) {
      console.error("Greška pri ažuriranju statusa:", error);
      toast.error("Greška pri ažuriranju");
    }
  };

  const markAsContacted = async (id: string) => {
    try {
      setTransportRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "CONTACTED" } : req
        )
      );
      toast.success("Zahtjev označen kao kontaktiran");
    } catch (error) {
      console.error("Greška pri ažuriranju statusa:", error);
      toast.error("Greška pri ažuriranju");
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "TRUCK":
        return "Kamion";
      case "TRAILER":
        return "Prikolica";
      case "SPECIALIZED":
        return "Specijalizirano vozilo";
      case "OTHER":
        return "Ostalo";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Novo
          </Badge>
        );
      case "VIEWED":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Viđeno
          </Badge>
        );
      case "CONTACTED":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Kontaktirano
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Završeno
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            Odbijeno
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  const getNewRequestsCount = () =>
    transportRequests.filter((r) => r.status === "NEW").length;
  const getContactedCount = () =>
    transportRequests.filter((r) => r.status === "CONTACTED").length;

  return (
    <>
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-orange-50/60 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/20 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-orange-300/30">
            <Truck className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-orange-600 to-orange-700 bg-clip-text text-transparent">
              Transport zahtjevi
            </h1>
            <p className="text-gray-600 mt-1">Pregled i upravljanje zahtjevima za transport</p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-orange-200/20 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Učitavanje zahtjeva...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-red-50/95 to-red-100/95 backdrop-blur-sm border border-red-200/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Novi zahtjevi</p>
                    <p className="text-2xl font-bold text-red-900">{getNewRequestsCount()}</p>
                  </div>
                  <div className="p-3 bg-red-200/50 rounded-lg">
                    <Truck className="w-6 h-6 text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50/95 to-purple-100/95 backdrop-blur-sm border border-purple-200/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Kontaktirani</p>
                    <p className="text-2xl font-bold text-purple-900">{getContactedCount()}</p>
                  </div>
                  <div className="p-3 bg-purple-200/50 rounded-lg">
                    <Phone className="w-6 h-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50/95 to-orange-100/95 backdrop-blur-sm border border-orange-200/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Ukupno zahtjeva</p>
                    <p className="text-2xl font-bold text-orange-900">{transportRequests.length}</p>
                  </div>
                  <div className="p-3 bg-orange-200/50 rounded-lg">
                    <Package className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zahtjevi lista */}
          {transportRequests.length === 0 ? (
            <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-orange-200/20 shadow-sm">
              <CardContent className="pt-6 text-center py-12">
                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema transport zahtjeva</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {transportRequests.map((request) => (
                <Card
                  key={request.id}
                  className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-orange-200/20 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <CardHeader className="bg-gradient-to-r from-orange-50/50 to-orange-100/50 border-b border-orange-200/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-orange-200/30 to-orange-300/30 border border-orange-200/50 rounded-lg">
                          <Truck className="w-5 h-5 text-orange-700" />
                        </div>
                        <div>
                          <CardTitle className="text-gray-900">
                            {request.cargo}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            od {request.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <span className="text-sm text-gray-500">
                          {format(new Date(request.createdAt), "dd.MM.yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Lijeva kolona */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Ime:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {request.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Email:</span>
                          <a
                            href={`mailto:${request.email}`}
                            className="text-sm font-medium text-orange-600 hover:underline"
                          >
                            {request.email}
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Telefon:</span>
                          <a
                            href={`tel:${request.phone}`}
                            className="text-sm font-medium text-orange-600 hover:underline"
                          >
                            {request.phone}
                          </a>
                        </div>

                        {request.companyName && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-gray-600">Firma:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {request.companyName}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Vozilo:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {getVehicleTypeLabel(request.vehicleType)}
                          </span>
                        </div>
                      </div>

                      {/* Desna kolona */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Odavde:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {request.origin}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Tamo:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {request.destination}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Poslano:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {format(
                              new Date(request.createdAt),
                              "dd.MM.yyyy HH:mm"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opis tovara */}
                    <div className="mt-4 pt-4 border-t border-orange-200/30">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Opis tovara:
                      </h4>
                      <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3 border border-orange-200/20">
                        {request.cargo}
                      </p>
                    </div>

                    {/* Dodatne napomene */}
                    {request.notes && (
                      <div className="mt-4 pt-4 border-t border-orange-200/30">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Dodatne napomene:
                        </h4>
                        <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3 border border-orange-200/20">
                          {request.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {request.status === "NEW" && (
                      <div className="mt-4 pt-4 border-t border-orange-200/30 flex gap-3">
                        <Button
                          onClick={() => markAsViewed(request.id)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Označi kao viđeno
                        </Button>
                        <Button
                          onClick={() => markAsContacted(request.id)}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Kontaktirano
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
