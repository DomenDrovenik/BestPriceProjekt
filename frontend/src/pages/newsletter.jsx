import { useEffect, useState } from "react";


export default function Newsletter() {
  const [htmlResponse, setHtmlResponse] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email");
    const action = urlParams.get("action");
    const token = urlParams.get("token");

    if (!email || !action || !token) {
      setHtmlResponse(`
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-2">Napaka</h1>
          <p class="text-gray-700">Manjkajo podatki v URL-ju.</p>
        </div>
      `);
      return;
    }

    const fetchAction = async () => {
      try {
        const res = await fetch(
          `https://bestpriceprojekt-production.up.railway.app/newsletter/action?email=${encodeURIComponent(email)}&action=${action}&token=${token}`
        );
        const html = await res.text();
        setHtmlResponse(html);
      } catch (error) {
        console.error("Napaka pri potrditvi/odjavi:", error);
        setHtmlResponse(`
          <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-2">Napaka</h1>
            <p class="text-gray-700">Prišlo je do napake pri komunikaciji s strežnikom.</p>
          </div>
        `);
      }
    };

    setHtmlResponse(`
      <div class="text-center animate-pulse text-gray-600">
        <p class="text-lg">Nalagam podatke...</p>
      </div>
    `);
    fetchAction();
  }, []);

  return (
   <div className="relative flex h-[100vh] content-center items-center justify-center pt-16 pb-16 bg-white">
  <div className="absolute inset-0 bg-[url('/img/background.jpg')] bg-cover bg-center" />
  <div className="absolute inset-0 bg-black/60" />

  <div className="max-w-8xl container relative mx-auto">
    <div className="flex flex-wrap items-center">
      <div className="ml-auto mr-auto w-full px-4 text-center lg:w-8/12">
        <div 
          className="bg-white p-8 rounded-lg shadow-lg inline-block" 
          dangerouslySetInnerHTML={{ __html: htmlResponse }} 
        />
      </div>
    </div>
  </div>
</div>
  );
}
