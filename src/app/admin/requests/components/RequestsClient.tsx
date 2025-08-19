"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MessageSquare, Building2, Mail, Phone, MapPin, Calendar, User, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipovi za zahtjeve
interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  status: string;
}

interface B2BRequest {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  businessType: string;
  description: string;
  createdAt: string;
  status: string;
}

export default function RequestsClient() {
  const [activeTab, setActiveTab] = useState("contact");
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [b2bRequests, setB2BRequests] = useState<B2BRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Dohvati podatke
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Dohvati kontakt zahtjeve
        const contactResponse = await fetch("/api/contact");
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          setContactRequests(contactData);
        }

        // Dohvati B2B zahtjeve
        const b2bResponse = await fetch("/api/b2b");
        if (b2bResponse.ok) {
          const b2bData = await b2bResponse.json();
          setB2BRequests(b2bData);
        }
      } catch (error) {
        console.error("Greška pri dohvaćanju podataka:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const markAsRead = (id: string, type: string) => {
    if (type === "contact") {
      setContactRequests(prev => 
        prev.map(req => req.id === id ? { ...req, status: "read" } : req)
      );
    } else {
      setB2BRequests(prev => 
        prev.map(req => req.id === id ? { ...req, status: "read" } : req)
      );
    }
  };

  const approveB2B = (id: string) => {
    setB2BRequests(prev => 
      prev.map(req => req.id === id ? { ...req, status: "approved" } : req)
    );
  };

  const rejectB2B = (id: string) => {
    setB2BRequests(prev => 
      prev.map(req => req.id === id ? { ...req, status: "rejected" } : req)
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Novo</Badge>;
      case "read":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Pročitano</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Odobreno</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Odbijeno</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    switch (type) {
      case "autoservis":
        return "Autoservis";
      case "trgovina":
        return "Trgovina auto dijelovima";
      case "distribucija":
        return "Distribucija";
      case "proizvodnja":
        return "Proizvodnja";
      case "ostalo":
        return "Ostalo";
      default:
        return type;
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
            <MessageSquare className="w-6 h-6 text-amber" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
              Zahtjevi
            </h1>
            <p className="text-gray-600 mt-1">Pregled kontakt zahtjeva i B2B aplikacija</p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber mx-auto mb-4"></div>
            <p className="text-gray-600">Učitavanje zahtjeva...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 rounded-xl p-1">
            <TabsTrigger 
              value="contact" 
              className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Kontakt zahtjevi ({contactRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="b2b" 
              className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              B2B aplikacije ({b2bRequests.length})
            </TabsTrigger>
          </TabsList>

        <TabsContent value="contact" className="space-y-6">
          {contactRequests.length === 0 ? (
            <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
              <CardContent className="pt-6 text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema kontakt zahtjeva</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {contactRequests.map((request) => (
                <Card key={request.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 rounded-lg">
                          <Mail className="w-5 h-5 text-amber" />
                        </div>
                        <div>
                          <CardTitle className="text-gray-900">{request.subject}</CardTitle>
                          <p className="text-sm text-gray-600">od {request.name}</p>
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Ime:</span>
                          <span className="text-sm font-medium text-gray-900">{request.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="text-sm font-medium text-gray-900">{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Telefon:</span>
                          <span className="text-sm font-medium text-gray-900">{request.phone}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Poruka:</h4>
                        <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3 border border-amber/10">
                          {request.message}
                        </p>
                      </div>
                    </div>
                    {request.status === "new" && (
                      <div className="mt-4 pt-4 border-t border-amber/20">
                        <Button
                          onClick={() => markAsRead(request.id, "contact")}
                          className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          Označi kao pročitano
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="b2b" className="space-y-6">
          {b2bRequests.length === 0 ? (
            <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
              <CardContent className="pt-6 text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema B2B aplikacija</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {b2bRequests.map((request) => (
                <Card key={request.id} className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 rounded-lg">
                          <Building2 className="w-5 h-5 text-amber" />
                        </div>
                        <div>
                          <CardTitle className="text-gray-900">{request.companyName}</CardTitle>
                          <p className="text-sm text-gray-600">Kontakt: {request.contactPerson}</p>
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Tvrtka:</span>
                          <span className="text-sm font-medium text-gray-900">{request.companyName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Kontakt:</span>
                          <span className="text-sm font-medium text-gray-900">{request.contactPerson}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="text-sm font-medium text-gray-900">{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Telefon:</span>
                          <span className="text-sm font-medium text-gray-900">{request.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-amber" />
                          <span className="text-sm text-gray-600">Adresa:</span>
                          <span className="text-sm font-medium text-gray-900">{request.address}, {request.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Tip poslovanja:</span>
                          <span className="text-sm font-medium text-gray-900">{getBusinessTypeLabel(request.businessType)}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Opis poslovanja:</h4>
                        <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3 border border-amber/10">
                          {request.description}
                        </p>
                      </div>
                    </div>
                    {request.status === "new" && (
                      <div className="mt-4 pt-4 border-t border-amber/20 flex gap-3">
                        <Button
                          onClick={() => approveB2B(request.id)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Odobri
                        </Button>
                        <Button
                          onClick={() => rejectB2B(request.id)}
                          variant="outline"
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-red-600 hover:from-red-50 hover:to-red-100 border-red-300 hover:border-red-400 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Odbij
                        </Button>
                        <Button
                          onClick={() => markAsRead(request.id, "b2b")}
                          variant="outline"
                          className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-gray-50 hover:to-gray-100 border-gray-300 hover:border-gray-400 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                        >
                          Označi kao pročitano
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}
    </>
  );
}
