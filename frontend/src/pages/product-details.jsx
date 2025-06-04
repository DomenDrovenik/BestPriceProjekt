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
  import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
  } from "@material-tailwind/react";
import { PageTitle, PriceComparison } from "@/widgets/layout";
import { PriceAlertButton } from "@/widgets/cards";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { firestore } from "../firebase";
import { UserIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";


export function ProductDetails() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [graphHistory,setGraphHistory] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [newRating, setNewRating] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [hasRated, setHasRated] = useState(false);
    const [editing, setEditing] = useState(null); // userId, ki ga urejamo
    const [editCommentText, setEditCommentText] = useState("");
    const [editRating, setEditRating] = useState(0);
    const [open, setOpen] = useState(false);

    const toggleOpen = () =>{
      setOpen(!open);
    }

    useEffect(() => {
      if (currentUser && comments.length > 0) {
        const alreadyRated = comments.some(c => c.userId === currentUser.uid);
        setHasRated(alreadyRated);
      }
    }, [currentUser, comments]);
    

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setCurrentUser(user); 

      try {
        const ref = doc(firestore, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
           const data = snap.data();
          // console.log("Uporabniški podatki iz Firestore:", data);
          setCurrentUserData(data); 
        }
        console.log(currentUserData);
      } catch (error) {
        console.error("Napaka pri branju podatkov uporabnika:", error);
      }
    }
  });

  return unsubscribe;
}, []);

  
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        try {
          // 1) Fetch product, which now includes previousPrices array
          const resP = await fetch(`https://bestpriceprojekt-production.up.railway.app/api/products/${id}`);
          // const resP = await fetch(`http://localhost:3000/api/products/${id}`);

          const dataP = await resP.json();
          setProduct({
               ...dataP,
               id: dataP._id?.toString?.() || id,
           });
  
          const prev = dataP.previousPrices || [];
          const formatted = prev.map(({ date, price }) => ({
            date: new Date(date).toLocaleDateString("sl-SI"),
            price: parseFloat(price),
          }));
          setHistory(formatted);

          let graphData = [...formatted];
          if (graphData.length === 1) {
            const original = graphData[0];
            const today = new Date();
            graphData.push({
              date: today.toLocaleDateString("sl-SI"),
              price: original.price,
            });
          }

          setGraphHistory(graphData);
  
          // 3) Comments remain fetched separately
          const resC = await fetch(`https://bestpriceprojekt-production.up.railway.app/api/products/${id}/comments`);
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
    if (!currentUser || !currentUserData) {
      toast.error("Za dodajanje komentarjev se moraš prijaviti.");
      return;
    }

    if (newRating === 0) {
      toast("Izberi oceno zvezdic.", { icon: "⭐" });
      return;
    }

    if (hasRated) {
      toast.error("Že si ocenil ta izdelek.");
      return;
    }

    const comment = {
      userId: currentUser.uid,
      user: {
        name: currentUserData?.name || "Neznan uporabnik",
        surname: currentUserData?.surname || "",
        avatar: currentUser?.photoURL || "",
      },
      rating: newRating,
      text: newComment.trim(),
      date: new Date().toISOString(),
    };

    try {
      const res = await fetch(`https://bestpriceprojekt-production.up.railway.app/api/products/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comment),
      });

      if (res.status === 409) {
        toast.error("Že si ocenil ta izdelek.");
        return;
      }

      setComments([...comments, comment]);
      setNewComment("");
      setNewRating(0);
      setHasRated(true);
      toast.success("Komentar uspešno dodan!");
    } catch (err) {
      console.error("Napaka pri pošiljanju komentarja:", err);
      toast.error("Napaka pri dodajanju komentarja.");
    }
  };

  const handleEditSubmit = async (userId) => {
    try {
      const res = await fetch(`https://bestpriceprojekt-production.up.railway.app/api/products/${id}/comments/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          text: editCommentText,
        }),
      });

      if (res.ok) {
        const updated = comments.map(c =>
          c.userId === userId
            ? { ...c, rating: editRating, text: editCommentText, date: new Date().toISOString() }
            : c
        );
        setComments(updated);
        setEditing(null);
        toast.success("Komentar uspešno posodobljen.");
      } else {
        toast.error("Napaka pri posodabljanju komentarja.");
      }
    } catch (err) {
      console.error("Napaka pri urejanju komentarja:", err);
      toast.error("Prišlo je do napake pri povezavi s strežnikom.");
    }
  };

  const handleDeleteComment = async (userId) => {
    toggleOpen();

    try {
      const res = await fetch(`https://bestpriceprojekt-production.up.railway.app/api/products/${id}/comments/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments(comments.filter(c => c.userId !== userId));
        setHasRated(false);
        toast.success("Komentar je bil izbrisan.");
      } else {
        toast.error("Napaka: komentarja ni bilo mogoče izbrisati.");
      }
    } catch (err) {
      console.error("Napaka pri brisanju komentarja:", err);
      toast.error("Napaka pri povezavi s strežnikom.");
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
          {(product.actionPrice != null && product.price != product.actionPrice) && (<span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md font-semibold z-10">
                          -{Math.round(100 - (product.actionPrice / product.price) * 100)}%
                        </span>)}
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
                                  {(product.actionPrice != null && product.actionPrice != product.price )? (
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
          {product.comments && product.comments.length > 0 && (
            <Typography
              variant="small"
              color="gray"
              className="mb-4 flex justify-center items-center gap-1 "
            >
              Povprečna ocena: 
              <span className="font-bold flex items-center gap-1 ml-1">
                {(product.comments.reduce((sum, c) => sum + (c.rating || 0), 0) / product.comments.length).toFixed(1)}
                <StarIcon className="h-5 w-5 text-yellow-400" />
              </span>
            </Typography>
          )}
          
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
            <LineChart data={graphHistory}>
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

      <div className="mt-4 flex justify-center">
        <PriceAlertButton product={product} />
      </div>

      <div>
        <br />
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
    {comments.map((comment) => {
  const isUser = currentUser?.uid === comment.userId;

  return (
    <Card key={comment.userId} className="p-4">
      
      <div className="flex items-center mb-2">
        {comment.user.avatar ? (
          <Avatar src={comment.user.avatar} className="mr-3 h-10 w-10" />
        ) : (
          <UserIcon className="w-10 h-10 text-black mr-3" />
        )}
        <div>
          <Typography variant="h6">{comment.user.name} {comment.user.surname}</Typography>
          <Typography variant="small" className="text-gray-500">
            {new Date(comment.date).toLocaleDateString("sl-SI")}
          </Typography>
        </div>
      </div>

      {/* Ocena */}
      <div className="flex items-center mb-2">
        {[...Array(5)].map((_, i) => (
          <StarIcon
            key={i}
            className={`h-5 w-5 ${i < comment.rating ? "text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>

      
      {editing === comment.userId ? (
        <>
          <textarea
            className="border rounded-md p-2 w-full resize-none mb-2"
            rows={3}
            value={editCommentText}
            onChange={(e) => setEditCommentText(e.target.value)}
          />
          <div className="flex gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                onClick={() => setEditRating(i + 1)}
                className={`h-6 w-6 cursor-pointer ${i < editRating ? "text-yellow-400" : "text-gray-300"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleEditSubmit(comment.userId)}>Shrani</Button>
            <Button size="sm" variant="outlined" onClick={() => setEditing(null)}>Prekliči</Button>
          </div>
        </>
      ) : (
        <Typography>{comment.text || <i>Brez komentarja</i>}</Typography>
      )}

      
      {isUser && editing !== comment.userId && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => {
            setEditing(comment.userId);
            setEditCommentText(comment.text || "");
            setEditRating(comment.rating);
          }}>
            Uredi
          </Button>
          <Button size="sm" variant="outlined" color="red"  onClick={toggleOpen}>
            Zbriši
          </Button>
          <Dialog open={open} handler={toggleOpen}>
            <DialogBody divider className="space-y-4">
              <Typography>Ste prepričani, da želite zbrisati komentar?</Typography>
            </DialogBody>
            <DialogFooter className="space-x-2">
              <Button
                variant="text"
                onClick={toggleOpen}
              >
                Prekliči
              </Button>
              <Button onClick={() => handleDeleteComment(comment.userId)}>
                Zbriši
              </Button>
            </DialogFooter>
          </Dialog>
        </div>
      )}
    </Card>
  );
})}
  </div>

  
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
          !currentUser || !currentUserData || newRating === 0 || hasRated
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        onClick={handleCommentSubmit}
        disabled={!currentUser || !currentUserData || newRating === 0 || hasRated}
      >
        {hasRated ? "Že si ocenil" : "Objavi oceno"}
      </button>
    </div>
  </div>
</div>

    </>
  );
}

export default ProductDetails;