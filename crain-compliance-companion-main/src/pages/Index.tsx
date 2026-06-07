import { Scale, DollarSign, FileText, MessageSquare, MapPin, Globe, Linkedin, Phone, Mail, GraduationCap, FlaskConical, Shield, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import joshProfile from "@/assets/josh-profile.jpg";

const quickActions = [
  {
    title: "Regulatory Lookup",
    description: "Search CA, Federal & EU environmental laws from official .gov, .ca.gov, and .eu sources.",
    icon: Scale,
    route: "/regulations",
  },
  {
    title: "Funding Finder",
    description: "Discover official grants & EPA/CalEPA funding opportunities.",
    icon: DollarSign,
    route: "/funding",
  },
  {
    title: "Report Writer",
    description: "AI-assisted reports & lab result analysis based on NIOSH and EPA standards.",
    icon: FileText,
    route: "/reports",
  },
  {
    title: "Data Analyzer",
    description: "Upload emissions, lab results, or observation data for instant AI-powered analysis against screening levels.",
    icon: BarChart3,
    route: "/data-analyzer",
  },
  {
    title: "Hygiene & Remediation",
    description: "Get abatement plans and remediation strategies sourced from official government guidance.",
    icon: Shield,
    route: "/hygiene-planner",
  },
  {
    title: "AI Assistant",
    description: "Your consulting buddy. Ask anything, get answers sourced ONLY from official government data.",
    icon: MessageSquare,
    route: "/assistant",
  },
];

const qualifications = [
  {
    icon: GraduationCap,
    title: "Academic Foundation",
    desc: "M.S. Environmental Studies (CSU Fullerton) and B.S. Biology (UC Irvine).",
  },
  {
    icon: FlaskConical,
    title: "Emissions Measurement",
    desc: "Technical monitoring for SO2, NH3, NOx, CO, and CO2 with Excel-based deviation analyses.",
  },
  {
    icon: Shield,
    title: "Industrial Hygiene",
    desc: "Expert pollutant monitoring, Asbestos/Lead investigations (XRF scanning), and PCB remediation.",
  },
  {
    icon: Award,
    title: "Certifications",
    desc: "CSST (Site Surveillance), Lead Sample Technician, Asbestos Inspector, HAZWOPER 40-hr.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto">
      {/* Hero */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to the EHS Toolkit
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your personal environmental compliance hub. Search regulations, find funding, and write reports — <strong className="text-foreground">powered exclusively by verified government data</strong> (.gov, .ca.gov, .eu).
        </p>
      </div>

      {/* Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Roots & Expertise</p>
              <p className="text-xs text-muted-foreground">Southern California, USA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Current Base</p>
              <p className="text-xs text-muted-foreground">Germany · Global Consulting</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="glass-panel group cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-md"
            onClick={() => navigate(action.route)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
                <action.icon className="h-5 w-5" />
                {action.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* About the Consultant */}
      <Card className="glass-panel overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left: Bio */}
          <div className="p-6 lg:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={joshProfile}
                alt="Joshua Fickenscher"
                className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
              />
              <div>
                <h2 className="text-xl font-bold">About the Consultant</h2>
                <p className="text-sm font-semibold text-primary">Joshua Fickenscher</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                I was born and raised in Southern California, where I worked the majority of my career as an environmental professional.
              </p>
              <p>
                I am an environmental consultant with deep expertise in emissions measurement, industrial hygiene, and environmental science.
              </p>
              <p>
                I provide remote subcontract support to environmental consulting firms globally, including specialized data analysis, technical report drafting, and regulatory documentation support.
              </p>
              <p>
                Now based in Germany, I work with both US and EU clients and am a native English speaker.
              </p>
            </div>
          </div>

          {/* Right: Qualifications */}
          <div className="p-6 lg:p-8 bg-primary/5 border-t lg:border-t-0 lg:border-l border-border/50">
            <h3 className="text-base font-bold mb-4">Qualifications & Expertise</h3>
            <div className="space-y-4">
              {qualifications.map((q) => (
                <div key={q.title} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <q.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{q.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{q.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Contact Footer */}
      <Card className="glass-panel">
        <CardContent className="p-6">
          <h3 className="text-base font-bold text-center mb-4">Get in Touch</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://www.linkedin.com/in/joshua-fickenscher", "_blank")}
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://wa.me/4915159857872", "_blank")}
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("mailto:jfickens@gmail.com")}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
