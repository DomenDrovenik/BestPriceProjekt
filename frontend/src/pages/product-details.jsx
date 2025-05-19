// src/pages/ProductDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Typography,
  Button,
  Card,
  CardBody,
  CardHeader,
  Avatar,
} from "@material-tailwind/react";
import {
  StarIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import { PageTitle } from "@/widgets/layout";

export function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1) osnovni izdelek  
        const resP = await fetch(`http://localhost:3000/api/products/${id}`);
        const dataP = await resP.json();
        setProduct(dataP);

        // 2) zgodovina cen (array of { date, price })
        const resH = await fetch(`http://localhost:3000/api/products/${id}/history`);
        setHistory(await resH.json());

        // 3) komentarji (array of { id, user, rating, text, date })
        const resC = await fetch(`http://localhost:3000/api/products/${id}/comments`);
        setComments(await resC.json());
      } catch (err) {
        console.error("Napaka pri nalaganju podrobnosti:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Typography>Nalaganje…</Typography>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Typography>Izdelek ni najden.</Typography>
        <RouterLink to="/products">
          <Button variant="text" className="ml-4">
            Nazaj na seznam
          </Button>
        </RouterLink>
      </div>
    );
  }

  return (
    <>
    <div className="relative flex h-32 items-center justify-center pt-8 pb-8">
        <div className="absolute top-0 h-full w-full bg-[url('/img/hrana.jpg')] bg-cover bg-center" />
        <div className="absolute top-0 h-full w-full bg-black/60 bg-cover bg-center" />
        <div className="max-w-8xl container relative mx-auto">
        </div>
      </div>
      <PageTitle heading="Podrobnosti izdelka" />

      <RouterLink to="/products">
          <Button variant="text" className="ml-4">
            <ArrowLeftIcon className="w-5 h-5" /> Nazaj
          </Button>
        </RouterLink>
    
        <Card className="mb-6 max-w-lg mx-auto">
        <CardHeader
          floated={false}
          className="h-64 bg-white flex items-center justify-center overflow-hidden"
        >
          <img
            src={product.image || "/img/no-image.png"}
            alt={product.name}
            className="h-full object-contain"
          />
        </CardHeader>
        <CardBody className="text-center">
          <Typography variant="h4" className="font-bold mb-1">
            {product.name}
          </Typography>
          <Typography variant="h5" color="blue-gray" className="mb-4">
            {(parseFloat(product.price) || 0).toFixed(2)} €
          </Typography>
          <Typography variant="small" color="gray" className="mb-4">
            Kategorija: <strong>{product.category}</strong>
          </Typography>
        </CardBody>
      </Card>

      {/* Zgodovina cen */}
      <div className="px-4 mb-12">
      <Typography variant="h3" className="font-semibold mb-4">
        Zgodovina cen
      </Typography>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2 border-b">Datum</th>
              <th className="p-2 border-b">Cena (€)</th>
            </tr>
          </thead>
          <tbody>
                <td className="p-2 border-b">{new Date(product.updatedAt).toLocaleDateString("sl-SI")}</td>
                <td className="p-2 border-b">{parseFloat(product.price).toFixed(2)}</td>
          </tbody>
        </table>
      </div>
      </div>

      {/* Komentarji */}
      <div className="px-4 mb-12">
      <Typography variant="h3" className="font-semibold mb-4">
        Komentarji in ocene
      </Typography>
      <div className="space-y-6">
        {comments.length === 0 && (
          <Typography className="text-gray-500">Ni komentarjev.</Typography>
        )}
        {comments.map(({ id: cid, user, rating, text, date }) => (
          <Card key={cid} className="p-4">
            <div className="flex items-center mb-2">
              <Avatar
                src={user.avatar}
                alt={user.name}
                variant="circular"
                className="mr-3 h-10 w-10"
              />
              <div>
                <Typography variant="h6">{user.name}</Typography>
                <Typography variant="small" className="text-gray-500">
                  {new Date(date).toLocaleDateString("sl-SI")}
                </Typography>
              </div>
            </div>
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-5 w-5 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
            <Typography>{text}</Typography>
          </Card>
        ))}
      </div>
      </div>
    </>
  );
}

export default ProductDetails;