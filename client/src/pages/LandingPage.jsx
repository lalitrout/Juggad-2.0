import React from "react";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import Header from "../components/Header";
import {
  ArrowRight,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  Users,
  Zap,
  Shield,
  HandHeart
} from "lucide-react";

const benefits = [
  {
    icon: MapPin,
    title: "Hyperlocal Tasks",
    description: "Find help in your immediate neighborhood for quick and convenient service.",
  },
  {
    icon: Clock,
    title: "Quick Turnaround",
    description: "Get tasks done fast with our network of local service providers.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "OTP-verified completion ensures secure and trustworthy transactions.",
  },
  {
    icon: Star,
    title: "Rated Community",
    description: "Both task posters and providers are rated for quality assurance.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Post Your Task",
    description: "Describe what you need done, set your budget and deadline.",
  },
  {
    step: "02",
    title: "Get Applications",
    description: "Local service providers apply to complete your task.",
  },
  {
    step: "03",
    title: "Choose & Chat",
    description: "Select the best applicant and coordinate through our chat.",
  },
  {
    step: "04",
    title: "Complete & Rate",
    description: "Verify completion with OTP and rate each other.",
  },
];

const LandingPage = ({ navigateTo, isAuthenticated, theme, toggleTheme, logout }) => {
  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-gradient-to-br from-emerald-50 via-white to-blue-50" : "bg-gray-900"}`}>
      <Header
        navigateTo={navigateTo}
        currentPage="landing"
        isAuthenticated={isAuthenticated}
        theme={theme}
        toggleTheme={toggleTheme}
        logout={logout}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 lg:py-22">
        <div className="max-w-7xl mx-auto px-7 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-16 lg:mb-0">
              <div className={`inline-flex items-center gap-2 ${theme === "light" ? "bg-emerald-100 text-emerald-800" : "bg-emerald-900 text-emerald-200"} px-4 py-2 rounded-full text-sm font-medium mb-6`}>
                <Zap className="w-4 h-4" />
                Hyperlocal Micro-Tasks
              </div>

              <h1 className={`text-4xl lg:text-6xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} leading-tight mb-6`}>
                Get Things Done
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  {" "}Locally
                </span>
              </h1>

              <p className={`text-xl ${theme === "light" ? "text-gray-600" : "text-gray-300"} mb-8 leading-relaxed`}>
                Connect with your neighbors to post micro-tasks or earn money by helping others. 
                From quick deliveries to tech support - Jugaad makes local help accessible.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                      : "bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                  } text-white font-semibold px-8 py-4 text-lg w-full sm:w-auto`}
                  onClick={() => navigateTo('auth')}
                >
                  Start Helping
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={`font-semibold px-8 py-4 text-lg border-2 ${theme === "light" ? "border-gray-300 text-gray-700" : "border-gray-600 text-gray-300"} w-full sm:w-auto`}
                  onClick={() => navigateTo('auth')}
                >
                  Learn More
                </Button>
              </div>

              <div className={`flex items-center gap-8 mt-12 pt-8 ${theme === "light" ? "border-t border-gray-200" : "border-t border-gray-700"}`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>10K+</div>
                  <div className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Tasks Completed</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>5K+</div>
                  <div className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Active Users</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>4.9★</div>
                  <div className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Average Rating</div>
                </div>
              </div>
            </div>
<div className="relative">
  <div className="relative z-10">
    <div className="grid grid-cols-2 gap-4">
      {/** Card 1 */}
      <Card className={`animate-float shadow-xl border-0 ${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className={`w-12 h-12 ${theme === "light" ? "bg-emerald-100" : "bg-emerald-900"} rounded-xl flex items-center justify-center mb-4`}>
            <MapPin className={`w-6 h-6 ${theme === "light" ? "text-emerald-600" : "text-emerald-400"}`} />
          </div>
          <h3 className={`font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-2`}>Local Tasks</h3>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Find help in your neighborhood</p>
        </CardContent>
      </Card>

      {/** Card 2 */}
      <Card className={`animate-float shadow-xl border-0 ${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className={`w-12 h-12 ${theme === "light" ? "bg-blue-100" : "bg-blue-900"} rounded-xl flex items-center justify-center mb-4`}>
            <Users className={`w-6 h-6 ${theme === "light" ? "text-blue-600" : "text-blue-400"}`} />
          </div>
          <h3 className={`font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-2`}>Dual Roles</h3>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Post tasks or provide services</p>
        </CardContent>
      </Card>

      {/** Card 3 */}
      <Card className={`animate-float shadow-xl border-0 ${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className={`w-12 h-12 ${theme === "light" ? "bg-purple-100" : "bg-purple-900"} rounded-xl flex items-center justify-center mb-4`}>
            <Shield className={`w-6 h-6 ${theme === "light" ? "text-purple-600" : "text-purple-400"}`} />
          </div>
          <h3 className={`font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-2`}>Secure</h3>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>OTP verification system</p>
        </CardContent>
      </Card>

      {/** Card 4 */}
      <Card className={`animate-float shadow-xl border-0 ${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className={`w-12 h-12 ${theme === "light" ? "bg-yellow-100" : "bg-yellow-900"} rounded-xl flex items-center justify-center mb-4`}>
            <Star className={`w-6 h-6 ${theme === "light" ? "text-yellow-600" : "text-yellow-400"}`} />
          </div>
          <h3 className={`font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-2`}>Rated</h3>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>Community-driven ratings</p>
        </CardContent>
      </Card>
    </div>
  </div>

  <div className={`absolute inset-0 ${theme === "light" ? "bg-gradient-to-r from-emerald-400/20 to-blue-400/20" : "bg-gradient-to-r from-emerald-800/20 to-blue-800/20"} rounded-3xl transform rotate-3 scale-105 -z-10`}></div>
</div>

          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={`py-20 ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
        <div className="max-w-7xl mx-auto px-7 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl lg:text-4xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mb-4`}>
              Why Choose Jugaad?
            </h2>
            <p className={`text-xl ${theme === "light" ? "text-gray-600" : "text-gray-300"} max-w-3xl mx-auto`}>
              Built for the modern neighborhood, designed for trust and efficiency.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className={`text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 group ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
                <CardContent className="p-8">
                  <div className={`w-16 h-16 ${theme === "light" ? "bg-gradient-to-r from-emerald-100 to-blue-100" : "bg-gradient-to-r from-emerald-900 to-blue-900"} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className={`w-8 h-8 ${theme === "light" ? "text-emerald-600" : "text-emerald-400"}`} />
                  </div>
                  <h3 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-3`}>{benefit.title}</h3>
                  <p className={`leading-relaxed ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={`py-20 ${theme === "light" ? "bg-gradient-to-br from-gray-50 to-emerald-50" : "bg-gradient-to-br from-gray-900 to-gray-800"}`}>
        <div className="max-w-7xl mx-auto px-7 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl lg:text-4xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mb-4`}>
              How It Works
            </h2>
            <p className={`text-xl ${theme === "light" ? "text-gray-600" : "text-gray-300"} max-w-3xl mx-auto`}>
              Simple, secure, and efficient process for both task posters and service providers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
                  <CardContent className="p-8 text-center">
                    <div className={`text-6xl font-bold ${theme === "light" ? "text-emerald-100" : "text-emerald-900"} mb-4`}>{step.step}</div>
                    <div className={`w-12 h-12 ${theme === "light" ? "bg-gradient-to-r from-emerald-500 to-blue-500" : "bg-gradient-to-r from-emerald-600 to-blue-600"} rounded-xl flex items-center justify-center mx-auto mb-6`}>
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-3`}>{step.title}</h3>
                    <p className={`leading-relaxed ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{step.description}</p>
                  </CardContent>
                </Card>
                {index < howItWorks.length - 1 && (
                  <div className={`hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 ${theme === "light" ? "bg-gradient-to-r from-emerald-300 to-blue-300" : "bg-gradient-to-r from-emerald-700 to-blue-700"} transform -translate-y-1/2`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${theme === "light" ? "bg-gradient-to-r from-emerald-600 to-blue-600" : "bg-gradient-to-r from-emerald-700 to-blue-700"}`}>
        <div className="max-w-7xl mx-auto px-7 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
            Join our community to post tasks or help your neighbors today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className={`${
                theme === "light" ? "bg-white text-emerald-600 hover:bg-gray-50" : "bg-gray-800 text-emerald-400 hover:bg-gray-700"
              } font-semibold px-8 py-4 text-lg w-full sm:w-auto`}
              onClick={() => navigateTo('auth')}
            >
              Post a Task
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`${
                theme === "light" ? "border-white text-white hover:bg-white hover:text-emerald-600" : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-emerald-400"
              } font-semibold px-8 py-4 text-lg w-full sm:w-auto`}
              onClick={() => navigateTo('auth')}
            >
              Start Helping
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${theme === "light" ? "bg-gray-900" : "bg-gray-800"} text-white`}>
        <div className="max-w-7xl mx-auto px-7 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <HandHeart className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Jugaad</span>
              </div>
              <p className="text-gray-400 text-sm">
                Connecting neighbors for micro-tasks and community help.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => navigateTo('auth')}
                    className="hover:text-white transition-colors"
                  >
                    Get Started
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo('terms')}
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo('privacy')}
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Email: support@Jugaad.app</li>
                <li>Phone: (555) 123-4567</li>
                <li>Address: 123 Community St, Portland, OR</li>
              </ul>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t ${theme === "light" ? "border-gray-800" : "border-gray-700"} text-center text-sm text-gray-400`}>
            &copy; {new Date().getFullYear()} Jugaad. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;