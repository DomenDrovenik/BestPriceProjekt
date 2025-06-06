// src/views/TopDeals.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardBody,
  Typography,
  Button,
  IconButton,
} from "@material-tailwind/react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { dealsData } from "@/data/dealsData";
import { Link as RouterLink } from "react-router-dom"; // v naslednjem koraku definiraj to


async function fetchTopDiscountedProducts() {
  try {
    const response = await axios.get('https://bestpriceprojekt-production.up.railway.app/api/discountedProducts');
    const products = response.data;

    console.log("Top 5 izdelkov z največjim popustom:", products);
    return products;
  } catch (error) {
    console.error("Napaka pri pridobivanju izdelkov z popustom:", error);
    return [];
  }
}



export function TopDeals() {

  const [discountedProducts, setDiscountedProducts] = useState([]);
  
  useEffect(()=>{

    async function loadData() {
    const data = await fetchTopDiscountedProducts();
    setDiscountedProducts(data);
  }
  loadData();

},[])


  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 text-center">
        <Typography variant="h4" className="mb-6 font-semibold">
          Top 5 izdelkov ta teden z največjimi znižanji
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {discountedProducts.map((item) => {
            const percent = Math.round(
              ((item.price - item.actionPrice) / item.price) * 100
            );
            const TrendIcon =
              percent > 0 ? ArrowTrendingDownIcon : ArrowTrendingUpIcon;
            const trendColor = percent > 0 ? "text-green-500" : "text-red-500";

            return (
              <Card key={item._id} className="shadow-lg hover:shadow-xl rounded-xl overflow-hidden">
  <RouterLink
    to={`/products/${item._id}`}
    className="block p-4 hover:no-underline"
  >
    <CardBody className="flex flex-col items-center">
      <img
        src={item.image}
        alt={item.name}
        className="h-24 w-24 object-cover rounded-md mb-3"
      />
      <Typography variant="h6" className="font-medium mb-1 text-center">
        {item.name}
      </Typography>
      <div className="flex items-baseline gap-2 mb-2">
        <Typography variant="small" className="line-through text-gray-400">
          {item.price} €
        </Typography>
        <Typography variant="h6" className="font-semibold">
          {item.actionPrice} €
        </Typography>
      </div>
      <div className="flex items-center gap-1 mb-3">
        <TrendIcon className={`h-5 w-5 ${trendColor}`} />
        <Typography variant="small" className={trendColor}>
          {percent}%
        </Typography>
      </div>
      <div className="w-full h-16 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={item.trend}>
            <Tooltip cursor={false} />
            <Line
              type="monotone"
              dataKey="pv"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardBody>
  </RouterLink>
</Card>


            );
          })}
        </div>
        <RouterLink
        to={`/products?onlyDiscounted=true`}
        className="min-w-1/4 flex-1 mx-2 overflow-hidden">
        <Button
          variant="gradient"
          size="md"
          className="mt-8"
          component="a"
          href="/deals"
        >
          Oglej si več akcij
        </Button>
        </RouterLink>
      </div>
    </section>
  );
}

export default TopDeals;