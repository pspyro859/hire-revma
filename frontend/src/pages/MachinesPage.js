import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getMachines } from "../lib/api";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { 
  Truck, 
  Search,
  Filter,
  ChevronRight,
  Fuel,
  Gauge,
  ShieldCheck
} from "lucide-react";

export default function MachinesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = user?.role === "staff" || user?.role === "admin";

  const categories = [
    { id: "all", label: "All Equipment" },
    { id: "excavator", label: "Excavators" },
    { id: "tipper", label: "Tippers" },
    { id: "trailer", label: "Trailers" },
    { id: "vac", label: "Vac Trailers" },
  ];

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await getMachines();
        setMachines(data);
        setFilteredMachines(data);
      } catch (error) {
        console.error("Error fetching machines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  useEffect(() => {
    let result = machines;

    if (activeCategory !== "all") {
      result = result.filter(m => m.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.make.toLowerCase().includes(query) ||
        m.model.toLowerCase().includes(query)
      );
    }

    setFilteredMachines(result);
  }, [activeCategory, searchQuery, machines]);

  const handleHireClick = (machine) => {
    if (isStaff) {
      navigate("/agreements/new", { state: { selectedMachine: machine } });
    } else {
      navigate("/inquiry", { state: { selectedMachine: machine } });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner border-[#E63946] border-t-transparent w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Equipment Fleet</h1>
          <p className="text-neutral-600">
            Browse our range of fully insured, well-maintained hire equipment
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-12 border border-neutral-300 rounded-lg focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
              data-testid="machine-search"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-tab ${activeCategory === cat.id ? "active" : ""}`}
                data-testid={`category-${cat.id}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-neutral-500 mb-6">
          Showing {filteredMachines.length} of {machines.length} machines
        </p>

        {/* Machine Grid */}
        {filteredMachines.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No equipment found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map((machine) => (
              <div key={machine.id} className="card-machine group" data-testid={`machine-card-${machine.id}`}>
                {/* Image */}
                <div className="aspect-[4/3] bg-neutral-100 overflow-hidden relative">
                  <img
                    src={machine.image_url}
                    alt={machine.name}
                    className="w-full h-full object-cover machine-image"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      machine.is_available 
                        ? "bg-green-500 text-white" 
                        : "bg-red-500 text-white"
                    }`}>
                      {machine.is_available ? "Available" : "Hired Out"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#E63946] uppercase tracking-wider bg-[#E63946]/10 px-2 py-0.5 rounded">
                      {machine.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900 mb-1">{machine.name}</h3>
                  <p className="text-sm text-neutral-500 mb-3">{machine.make} {machine.model}</p>

                  <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                    {machine.description}
                  </p>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-3 mb-4 text-xs text-neutral-500">
                    {machine.specifications?.gvm && (
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {machine.specifications.gvm}
                      </span>
                    )}
                    {machine.specifications?.operating_weight && (
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {machine.specifications.operating_weight}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Fully Insured
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-neutral-100 pt-4">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-[#E63946]">${machine.daily_rate}</span>
                        <span className="text-neutral-500">/day</span>
                      </div>
                      <div className="text-right text-sm text-neutral-500">
                        <p>${machine.weekly_rate}/week</p>
                        <p>${machine.monthly_rate}/month</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleHireClick(machine)}
                      disabled={!machine.is_available}
                      className={`w-full ${machine.is_available ? "btn-primary" : "bg-neutral-300 cursor-not-allowed"}`}
                      data-testid={`hire-btn-${machine.id}`}
                    >
                      {machine.is_available ? (
                        <>
                          {isStaff ? "Create Agreement" : "Enquire Now"}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        "Currently Unavailable"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
