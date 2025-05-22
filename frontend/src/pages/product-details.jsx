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
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
  } from "recharts";
import { PageTitle, PriceComparison } from "@/widgets/layout";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export function ProductDetails() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [newRating, setNewRating] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);

    

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
  });

  return () => unsubscribe(); // odjava listenerja ko se komponenta uniči
}, []);
  
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        try {
          // 1) Fetch product, which now includes previousPrices array
          const resP = await fetch(`http://localhost:3000/api/products/${id}`);
          const dataP = await resP.json();
          setProduct(dataP);
  
          // 2) Use product.previousPrices directly
          const prev = dataP.previousPrices || [];
          const formatted = prev.map(({ date, price }) => ({
            date: new Date(date).toLocaleDateString("sl-SI"),
            price: parseFloat(price),
          }));
          setHistory(formatted);
  
          // 3) Comments remain fetched separately
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
  const handleCommentSubmit = async () => {
  if (!currentUser || newRating === 0 || !newComment.trim()) return;

  const comment = {
    userId: currentUser.uid,
    user: {
      name: currentUser.name || "Neznan uporabnik",
      surname: currentUser.surname || "",
      avatar: currentUser.photoURL || "",
    },
    rating: newRating,
    text: newComment,
    date: new Date().toISOString(),
  };

  try {
    await fetch(`http://localhost:3000/api/products/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
    });

    
    setNewComment("");
    setNewRating(0);
    setComments([...comments, comment]);
  } catch (err) {
    console.error("Napaka pri pošiljanju komentarja:", err);
  }
};

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
          <Typography variant="h6" className="mb-2 font-semibold flex items-center gap-2">
                                  {product.actionPrice != null ? (
                                    <>
                                      <span className="line-through text-gray-500">
                                        {(parseFloat(product.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                                      </span>
                                      <span className="text-red-600 font-bold">
                                        {(parseFloat(product.actionPrice?.toString().replace(",", ".")) || 0).toFixed(2)} €
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {(parseFloat(product.price?.toString().replace(",", ".")) || 0).toFixed(2)} €
                                    </>
                                  )}
                                </Typography>
          <Typography variant="small" color="gray" className="mb-4">
            Kategorija: <strong>{product.category}</strong>
          </Typography>
        </CardBody>
      </Card>

      {/* Zgodovina cen */}
      <div className="px-4 mb-12 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Typography variant="h5" className="font-semibold mb-4">
            Zgodovina cen
          </Typography>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2 border-b">Datum</th>
                  <th className="p-2 border-b">Cena (€)</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ date, price }, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-b">{date}</td>
                    <td className="p-2 border-b">{price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Typography variant="h5" className="font-semibold mb-4 text-center">
            Trend cen
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history}>
              <XAxis dataKey="date" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#8884d8"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PriceComparison productName={product.name} />


      {/* Komentarji */}
      <div className="px-4 mb-12 max-w-2xl mx-auto">
  <Typography variant="h3" className="font-semibold mb-6 text-center">
    Komentarji in ocene
  </Typography>

  <div className="space-y-6">
    {comments.length === 0 && (
      <Typography className="text-gray-500 text-center">Ni komentarjev.</Typography>
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

  {/* Vnos novega komentarja */}
  <div className="mt-8">
    <Typography variant="h5" className="mb-3 text-center">
      Dodaj komentar
    </Typography>

    <div className="flex flex-col gap-4">
      <textarea
        className="border rounded-md p-2 w-full resize-none"
        rows={4}
        placeholder="Tvoj komentar..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
      />

      <div className="flex justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <StarIcon
            key={i}
            onClick={() => setNewRating(i + 1)}
            className={`h-6 w-6 cursor-pointer ${
              i < newRating ? "text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>

      <button
        className={`px-4 py-2 rounded-md text-white font-semibold transition ${
          currentUser
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        onClick={handleCommentSubmit}
        disabled={!currentUser || newRating === 0 || newComment.trim() === ""}
      >
        Objavi komentar
      </button>
    </div>
  </div>
</div>

    </>
  );
}

export default ProductDetails;