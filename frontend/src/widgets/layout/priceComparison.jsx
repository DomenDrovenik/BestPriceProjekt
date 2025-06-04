// src/components/PriceComparison.jsx
import React, { useState, useEffect } from "react";
import { Card, CardBody, Typography } from "@material-tailwind/react";
import { Link as RouterLink } from "react-router-dom";

export function PriceComparison({ productName }) {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // your backend endpoint should return something like:
        // [ { store: "Tuš", price: 3.99 }, { store: "Mercator", price: 4.10 }, … ]
        const res = await fetch(
          `https://bestpriceprojekt-production.up.railway.app/api/compare-prices?name=${encodeURIComponent(productName)}`,
            { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setComparisons(data);
      } catch (err) {
        console.error("Error fetching comparisons:", err);
        setError("Ne morem dobiti primerjave cen.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productName]);

  if (loading) {
    return <Typography className="text-center py-4">Nalagam primerjavo cen…</Typography>;
  }
  if (error) {
    return <Typography color="red" className="text-center py-4">{error}</Typography>;
  }
  if (comparisons.length === 0) {
    return <Typography className="text-center py-4">Ni podatkov o drugih trgovinah.</Typography>;
  }

  return (
    <Card className="max-w-lg mx-auto mb-12">
      <CardBody>
        <Typography variant="h4" className="font-semibold mb-4 text-center">
          Primerjava cen v drugih trgovinah
        </Typography>
        <ul className="space-y-4">
          {comparisons.map(({ id,store, price, image, name }, i) => (
            
            <li
            onClick={()=>{}}
              key={i}
              className="flex items-center gap-4 p-2 bg-gray-50 rounded shadow-sm"
            >
              <RouterLink to={`/products/${id}`} className="flex items-center gap-4 w-full">
              <img
                src={store === "Hofer" ? "/img/HOFER.png" : image}
                alt={name}
                className="h-12 w-12 object-contain rounded"
              />
              <div className="flex-1">
                <Typography className="font-medium">{store}</Typography>
                <Typography variant="small" color="gray">
                  {name}
                </Typography>
              </div>
              <Typography className="font-bold">{price} €</Typography>
              </RouterLink>
            </li>
            
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export default PriceComparison;