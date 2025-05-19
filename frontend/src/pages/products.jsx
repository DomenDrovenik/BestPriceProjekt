import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  Input,
  Checkbox,
} from "@material-tailwind/react";
import { PageTitle } from "@/widgets/layout";
import { Link as RouterLink } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { categories } from "@/data/categories";

export function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStores, setSelectedStores] = useState([]);
  const itemsPerPage = 24;

  const storeMap = {
    merkator: "Mercator",
    jager: "Jager",
    tus: "Tuš"
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initialCat = searchParams.get("category");
    if (initialCat) {
      setSelectedCats([decodeURIComponent(initialCat)]);
    }
  }, [searchParams]);


  // Ob zagonu - naloži vse izdelke
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/all-products");
        const data = await res.json();
        // heuristika: iz slike ugotovi trgovino
        const enriched = data.map((p) => {
          const source = p.image?.toLowerCase() || "";
          const store = Object.entries(storeMap).find(([key]) =>
            source.includes(key)
          )?.[1] || "Trgovina";
          return { ...p, store };
        });
        setProducts(enriched);
      } catch (error) {
        console.error("Napaka pri pridobivanju podatkov:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Ob spremembi trgovcev - pošlji nove API klice
  useEffect(() => {
    const fetchSelectedStores = async () => {
      if (selectedStores.length === 0) {
        // če ni izbranih, naloži all-products
        setLoading(true);
        try {
          const res = await fetch("http://localhost:3000/api/all-products");
          const data = await res.json();
          const enriched = data.map((p) => {
            const source = p.image?.toLowerCase() || "";
            const store = Object.entries(storeMap).find(([key]) =>
              source.includes(key)
            )?.[1] || "Trgovina";
            return { ...p, store };
          });
          setProducts(enriched);
        } catch (error) {
          console.error("Napaka pri pridobivanju vseh izdelkov:", error);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const allData = await Promise.all(
          selectedStores.map(async (storeKey) => {
            const res = await fetch(`http://localhost:3000/${storeKey}`);
            const data = await res.json();
            return data.map((p) => ({ ...p, store: storeMap[storeKey] }));
          })
        );
        setProducts(allData.flat());
      } catch (error) {
        console.error("Napaka pri pridobivanju trgovskih izdelkov:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedStores();
  }, [selectedStores]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCats, priceRange]);

  const toggleStore = (storeKey) => {
    setSelectedStores((prev) =>
      prev.includes(storeKey)
        ? prev.filter((s) => s !== storeKey)
        : [...prev, storeKey]
    );
  };

  const toggleCat = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const normalizeCategory = (category, subcategory) => {
    const cat = (category || "").toLowerCase();
    const sub = (subcategory || "").toLowerCase();
    if (cat.includes("sadje") || sub.includes("zelenjava")) return "Sadje in zelenjava";
    if (cat.includes("mleko") || sub.includes("sir")) return "Mlečni izdelki";
    if (cat.includes("jajca") || sub.includes("jajca")) return "Mlečni izdelki";
    if (cat.includes("meso") || sub.includes("ribe")) return "Meso in ribe";
    if (cat.includes("kruh") || sub.includes("toast")) return "Pekovski izdelki";
    if (cat.includes("zamrznjena") || sub.includes("sladoled")) return "Zamrznjena hrana";
    if (cat.includes("konzervirana") || sub.includes("konzerve")) return "Konzervirana živila";
    if (cat.includes("olje") || sub.includes("sol")) return "Olja in maščobe";
    if (cat.includes("testenine") || sub.includes("juhe")) return "Testenine, žita, juhe";
    if (cat.includes("sladki") || cat.includes("sladkor")  || sub.includes("čokolada") ) return "Sladkor, sladkarije in prigrizki";
    if (cat.includes("pijače") || sub.includes("sokovi")) return "Pijače";
    if (cat.includes("bio") || sub.includes("zdrava")) return "Bio izdelki";
    if (cat.includes("delikatesni") || sub.includes("pripravljene")) return "Pripravljene jedi";
     if (sub.includes("zajtrk") || sub.includes("kosmiči") || sub.includes("marmelada") ||
      sub.includes("namazi") || sub.includes("čaj") || sub.includes("kava") ||
      sub.includes("maslo") || sub.includes("med") || sub.includes("nutella") ||
      sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi") ||
      sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") ||
      sub.includes("sladki namazi")) return "Vse za zajtrk";
    if (sub.includes("vse za peko")) return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";

    return "Drugo";
  };

  const categorize = (product) => normalizeCategory(product.category, product.subcategory);

  const filtered = products
    .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => {
      const cat = categorize(p);
      return selectedCats.length === 0 || selectedCats.includes(cat);
    })
    .filter((p) => {
      const cena = parseFloat(p.price?.toString().replace(",", "."));
      return cena >= priceRange[0] && cena <= priceRange[1];
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-1 mt-10 flex-wrap">
        <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === 1 ? "opacity-30" : "hover:bg-gray-100"}`}>
          &#8249;
        </button>
        {pages.map((p, idx) => (
          <button key={idx} disabled={p === "..."} onClick={() => typeof p === "number" && setCurrentPage(p)}
            className={`w-9 h-9 rounded-full border ${currentPage === p ? "border-red-500 text-red-500 font-bold" : "text-gray-700 hover:bg-gray-100"} ${p === "..." ? "cursor-default text-gray-400 border-none" : ""}`}>
            {p}
          </button>
        ))}
        <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}
          className={`w-9 h-9 rounded-full border text-gray-500 ${currentPage === totalPages ? "opacity-30" : "hover:bg-gray-100"}`}>
          &#8250;
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="relative flex h-[50vh] content-center items-center justify-center pt-16 pb-16">
        <div className="absolute top-0 h-full w-full bg-[url('/img/hrana.jpg')] bg-cover bg-center" />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
          <div className="flex flex-wrap items-center">
            <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
              <Typography variant="h1" color="white" className="mb-6 font-black">
                Raziskuj cene v trgovinah
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <PageTitle heading="Seznam izdelkov" />
      <br />

      <div className="container mx-auto flex flex-col-reverse gap-6 px-4 md:flex-row">
        <aside className="w-full shrink-0 md:w-1/4">
          <Card className="mb-6">
            <CardHeader className="bg-blue-gray-50 rounded-t-lg">
              <Typography variant="h5" color="blue-gray" className="font-semibold">Filtri</Typography>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <Typography variant="small" className="block mb-2 font-medium">Išči izdelek</Typography>
                <Input variant="outlined" size="md" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vnesi ime..." />
              </div>

              <div>
                <Typography variant="small" className="block mb-2 font-medium">Kategorije</Typography>
                <div className="flex flex-col gap-1.5">
                  {categories.map(({ name }) => (
                    <Checkbox key={name} label={name} checked={selectedCats.includes(name)} onChange={() => toggleCat(name)} />
                  ))}
                </div>
              </div>

              <div>
                <Typography variant="small" className="block mb-2 font-medium">Trgovci</Typography>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(storeMap).map(([key, label]) => (
                    <Checkbox key={key} label={label} checked={selectedStores.includes(key)} onChange={() => toggleStore(key)} />
                  ))}
                </div>
              </div>

              <div>
                <Typography variant="small" className="block mb-2 font-medium">Razpon cen (€)</Typography>
                <div className="flex items-center gap-2">
                  <Input type="number" value={priceRange[0]} onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])} />
                  <span>–</span>
                  <Input type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} />
                </div>
              </div>

              <Button variant="outlined" fullWidth onClick={() => {
                setSearch("");
                setSelectedCats([]);
                setPriceRange([0, 100]);
                setSelectedStores([]);
              }}>Počisti filtre</Button>
            </CardBody>
          </Card>
        </aside>

        <section className="flex-1">
          {loading ? (
            <Typography className="text-center text-gray-500">Nalagam izdelke...</Typography>
          ) : paginated.length === 0 ? (
            <Typography className="text-center text-gray-500">Ni najdenih izdelkov.</Typography>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((p, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader floated={false} className="h-36 flex items-center justify-center bg-white">
                      <img src={p.image?.startsWith("http") ? p.image : "/img/no-image.png"} alt={p.name} className="max-h-28 w-auto object-contain" />
                    </CardHeader>
                    <CardBody className="pb-4">
                      <Typography variant="h5" className="mb-2 font-bold">{p.name}</Typography>
                      <Typography variant="paragraph" className="mb-2 text-blue-gray-600">
                        {categorize(p)} – {p.store || "Neznana trgovina"}
                      </Typography>
                      <Typography variant="h6" className="mb-2 font-semibold">
                        {(parseFloat(p.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                      </Typography>
                      <Button component={RouterLink} to={`/products/${p._id}`} size="sm">Več</Button>
                      <br /><br />
                      <Typography variant="paragraph" className="mb-4 text-blue-gray-600">
                        Posodobljeno: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('sl-SI') : "ni podatka"}
                      </Typography>
                    </CardBody>
                  </Card>
                ))}
              </div>
              {renderPagination()}
              <div className="h-20" />
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default Products;
